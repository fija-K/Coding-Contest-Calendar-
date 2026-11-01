import logging
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import httpx
from app.collectors.base import BaseCollector, CollectorResult
from app.schemas.contest import ContestCreate
from app.core.config import settings

logger = logging.getLogger(__name__)

# GeeksforGeeks naive timestamps represent Indian Standard Time (IST, UTC+05:30)
IST = timezone(timedelta(hours=5, minutes=30))


class GFGCollector(BaseCollector):
    platform_id = "gfg"
    platform_name = "GeeksforGeeks"

    def __init__(self, api_url: Optional[str] = None):
        self.api_url = api_url or settings.GFG_API_URL

    async def fetch_and_normalize(self) -> CollectorResult:
        logger.info(f"Fetching GeeksforGeeks contests from {self.api_url}...")
        headers = {
            "User-Agent": settings.USER_AGENT,
            "Accept": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT_SECONDS, follow_redirects=True) as client:
                response = await client.get(self.api_url, headers=headers)
                response.raise_for_status()
                data = response.json()

            if not isinstance(data, dict) or "results" not in data:
                error_msg = f"GeeksforGeeks API unexpected response structure: {str(data)[:200]}"
                logger.error(error_msg)
                return CollectorResult(platform=self.platform_id, success=False, error_message=error_msg)

            results = data.get("results")
            if not isinstance(results, dict):
                error_msg = f"GeeksforGeeks API 'results' field is not a dict: {type(results)}"
                logger.error(error_msg)
                return CollectorResult(platform=self.platform_id, success=False, error_message=error_msg)

            upcoming_list = results.get("upcoming", []) or []
            past_list = results.get("past", []) or []

            # Only inspect upcoming and active present contests
            raw_contests = []
            if isinstance(upcoming_list, list):
                raw_contests.extend(upcoming_list)

            now_utc = datetime.now(timezone.utc)

            # Check if any contests in past list are actually ongoing or very recently completed
            if isinstance(past_list, list):
                for item in past_list:
                    end_str = item.get("end_time")
                    if end_str:
                        try:
                            end_time = self.parse_datetime(end_str, default_tz=IST)
                            if end_time >= now_utc:
                                raw_contests.append(item)
                        except Exception:
                            pass

            normalized: List[ContestCreate] = []

            for item in raw_contests:
                # Contest Validation: In GFG, type 3 denotes a Contest (type 1 is webinar, 2 is course/workshop)
                item_type = item.get("type")
                if item_type is not None and item_type != 3:
                    logger.debug(f"Skipping non-contest GFG event '{item.get('name')}' (type: {item_type})")
                    continue

                slug = item.get("slug")
                if not slug:
                    logger.warning(f"Skipping GFG contest without slug: {item}")
                    continue

                slug = str(slug).strip()
                name = item.get("name") or item.get("title") or f"GeeksforGeeks Contest {slug}"
                name = str(name).strip()

                start_str = item.get("start_time")
                if not start_str:
                    logger.warning(f"Skipping GFG contest {slug} with missing start_time")
                    continue

                try:
                    start_time = self.parse_datetime(start_str, default_tz=IST)
                except Exception as e:
                    logger.warning(f"Failed to parse GFG start_time '{start_str}' for contest {slug}: {e}")
                    continue

                # Calculate duration in seconds
                duration_seconds = 7200  # Default 2 hours
                end_str = item.get("end_time")
                if end_str:
                    try:
                        end_time = self.parse_datetime(end_str, default_tz=IST)
                        diff = int((end_time - start_time).total_seconds())
                        if diff > 0:
                            duration_seconds = diff
                    except Exception as e:
                        logger.warning(f"Could not parse end_time '{end_str}' for GFG contest {slug}: {e}")

                status = self.determine_status(start_time, duration_seconds, now_utc)

                contest = ContestCreate(
                    id=self.generate_id(self.platform_id, slug),
                    platform=self.platform_id,
                    external_id=slug,
                    name=name,
                    start_time=start_time,
                    duration_seconds=duration_seconds,
                    contest_url=f"https://practice.geeksforgeeks.org/contest/{slug}",
                    status=status,
                    source_updated_at=now_utc,
                )
                normalized.append(contest)

            logger.info(f"GeeksforGeeks: successfully collected {len(normalized)} contests (from {len(raw_contests)} verified)")
            return CollectorResult(
                platform=self.platform_id,
                success=True,
                contests=normalized,
                raw_count=len(raw_contests),
            )

        except httpx.TimeoutException as e:
            err = f"GeeksforGeeks request timed out: {str(e)}"
            logger.error(err)
            return CollectorResult(platform=self.platform_id, success=False, error_message=err)
        except httpx.HTTPStatusError as e:
            err = f"GeeksforGeeks HTTP error {e.response.status_code}: {e.response.text[:200]}"
            logger.error(err)
            return CollectorResult(platform=self.platform_id, success=False, error_message=err)
        except Exception as e:
            err = f"Unexpected error collecting from GeeksforGeeks: {str(e)}"
            logger.error(err, exc_info=True)
            return CollectorResult(platform=self.platform_id, success=False, error_message=err)
