import logging
import re
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import httpx
from app.collectors.base import BaseCollector, CollectorResult
from app.schemas.contest import ContestCreate
from app.core.config import settings

logger = logging.getLogger(__name__)

LEETCODE_QUERY = """
query {
    topTwoContests {
        title
        titleSlug
        startTime
        duration
        originStartTime
        isVirtual
    }
    allContests {
        title
        titleSlug
        startTime
        duration
        originStartTime
        isVirtual
    }
}
"""


def _extract_slug(item: Dict[str, Any]) -> Optional[str]:
    """Extract or derive a URL-safe slug for the contest."""
    for key in ("titleSlug", "slug", "title_slug"):
        val = item.get(key)
        if val and str(val).strip():
            return str(val).strip()

    title = item.get("title") or item.get("name")
    if title:
        derived = re.sub(r"[^a-zA-Z0-9]+", "-", str(title)).strip("-").lower()
        if derived:
            return derived
    return None


def _extract_start_time(item: Dict[str, Any]) -> Optional[Any]:
    """Extract start timestamp in seconds or ISO string."""
    return item.get("startTime") or item.get("start_time") or item.get("originStartTime")


def _extract_duration(item: Dict[str, Any]) -> int:
    """Extract contest duration in seconds, defaulting to 5400 (1.5 hours)."""
    dur = item.get("duration") or item.get("duration_seconds")
    if dur is not None:
        try:
            return int(dur)
        except (ValueError, TypeError):
            pass
    return 5400


class LeetCodeCollector(BaseCollector):
    platform_id = "leetcode"
    platform_name = "LeetCode"

    def __init__(self, api_url: Optional[str] = None):
        self.api_url = api_url or settings.LEETCODE_GRAPHQL_URL

    async def fetch_and_normalize(self) -> CollectorResult:
        logger.info(f"Fetching LeetCode contests from {self.api_url}...")
        headers = {
            "User-Agent": settings.USER_AGENT,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Referer": "https://leetcode.com/contest/",
        }
        payload = {"query": LEETCODE_QUERY}

        try:
            async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT_SECONDS, follow_redirects=True) as client:
                response = await client.post(self.api_url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()

            # Handle GraphQL errors and partial responses
            if "errors" in data:
                logger.warning(f"LeetCode GraphQL returned errors: {data.get('errors')}")
                data_obj = data.get("data")
                # Fatal if no data object, or if both topTwoContests and allContests failed to resolve to a list
                if not data_obj or (
                    not isinstance(data_obj.get("topTwoContests"), list)
                    and not isinstance(data_obj.get("allContests"), list)
                ):
                    error_msg = f"LeetCode GraphQL fatal error: {data['errors']}"
                    logger.error(error_msg)
                    return CollectorResult(platform=self.platform_id, success=False, error_message=error_msg)

            data_obj = data.get("data", {})
            top_two = data_obj.get("topTwoContests") if isinstance(data_obj.get("topTwoContests"), list) else []
            all_contests = data_obj.get("allContests") if isinstance(data_obj.get("allContests"), list) else []

            # Deduplicate by slug
            contests_by_slug: Dict[str, Dict[str, Any]] = {}

            # 1. Process topTwoContests (the upcoming weekly and biweekly contests)
            for c in top_two:
                if c.get("isVirtual", False) or c.get("is_virtual", False):
                    continue

                slug = _extract_slug(c)
                if not slug:
                    continue

                start_val = _extract_start_time(c)
                if not start_val:
                    continue

                contests_by_slug[slug] = c

            # 2. Process allContests (upcoming and recent past contests)
            now_utc = datetime.now(timezone.utc)
            one_week_ago = now_utc - timedelta(days=7)

            for c in all_contests:
                if c.get("isVirtual", False) or c.get("is_virtual", False):
                    continue

                slug = _extract_slug(c)
                if not slug:
                    continue

                start_val = _extract_start_time(c)
                if not start_val:
                    continue

                start_dt = self.parse_datetime(start_val)
                # Keep if it is upcoming, ongoing, or occurred in the last 7 days
                if start_dt >= one_week_ago or slug in contests_by_slug:
                    if slug in contests_by_slug:
                        # Merge fields with preference for explicit top_two data
                        contests_by_slug[slug] = {**c, **contests_by_slug[slug]}
                    else:
                        contests_by_slug[slug] = c

            normalized: List[ContestCreate] = []
            for slug, item in contests_by_slug.items():
                title = (item.get("title") or item.get("name") or f"LeetCode Contest {slug}").strip()
                start_val = _extract_start_time(item)
                duration_sec = _extract_duration(item)

                start_time = self.parse_datetime(start_val)
                status = self.determine_status(start_time, duration_sec, now_utc)

                contest = ContestCreate(
                    id=self.generate_id(self.platform_id, slug),
                    platform=self.platform_id,
                    external_id=slug,
                    name=title,
                    start_time=start_time,
                    duration_seconds=duration_sec,
                    contest_url=f"https://leetcode.com/contest/{slug}",
                    status=status,
                    source_updated_at=now_utc
                )
                normalized.append(contest)

            logger.info(f"LeetCode: successfully collected {len(normalized)} contests")
            return CollectorResult(
                platform=self.platform_id,
                success=True,
                contests=normalized,
                raw_count=len(contests_by_slug)
            )

        except httpx.TimeoutException as e:
            err = f"LeetCode request timed out: {str(e)}"
            logger.error(err)
            return CollectorResult(platform=self.platform_id, success=False, error_message=err)
        except httpx.HTTPStatusError as e:
            err = f"LeetCode HTTP error {e.response.status_code}: {e.response.text[:200]}"
            logger.error(err)
            return CollectorResult(platform=self.platform_id, success=False, error_message=err)
        except Exception as e:
            err = f"Unexpected error collecting from LeetCode: {str(e)}"
            logger.error(err, exc_info=True)
            return CollectorResult(platform=self.platform_id, success=False, error_message=err)
