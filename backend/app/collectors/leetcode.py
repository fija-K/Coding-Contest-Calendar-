import logging
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

            if "errors" in data and not data.get("data"):
                error_msg = f"LeetCode GraphQL error: {data['errors']}"
                logger.error(error_msg)
                return CollectorResult(platform=self.platform_id, success=False, error_message=error_msg)

            data_obj = data.get("data", {})
            top_two = data_obj.get("topTwoContests", []) or []
            all_contests = data_obj.get("allContests", []) or []

            # Deduplicate by titleSlug
            contests_by_slug: Dict[str, Dict[str, Any]] = {}

            # First add topTwo (usually the immediate weekly and biweekly contests)
            for c in top_two:
                slug = c.get("titleSlug")
                if slug:
                    contests_by_slug[slug] = c

            # Then process allContests
            now_utc = datetime.now(timezone.utc)
            one_week_ago = now_utc - timedelta(days=7)

            for c in all_contests:
                if c.get("isVirtual", False):
                    continue

                slug = c.get("titleSlug")
                if not slug:
                    continue

                start_sec = c.get("startTime")
                if not start_sec:
                    continue

                start_dt = self.parse_datetime(start_sec)
                # Keep if it is upcoming, ongoing, or occurred in the last 7 days
                if start_dt >= one_week_ago or slug in contests_by_slug:
                    contests_by_slug[slug] = c

            normalized: List[ContestCreate] = []
            for slug, item in contests_by_slug.items():
                title = item.get("title", f"LeetCode Contest {slug}").strip()
                start_sec = item.get("startTime")
                duration_sec = item.get("duration", 5400)

                start_time = self.parse_datetime(start_sec)
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
