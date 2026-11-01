import logging
from typing import List, Optional
from datetime import datetime, timezone
import httpx
from app.collectors.base import BaseCollector, CollectorResult
from app.schemas.contest import ContestCreate
from app.core.config import settings

logger = logging.getLogger(__name__)


class CodeChefCollector(BaseCollector):
    platform_id = "codechef"
    platform_name = "CodeChef"

    def __init__(self, api_url: Optional[str] = None):
        self.api_url = api_url or settings.CODECHEF_API_URL

    async def fetch_and_normalize(self) -> CollectorResult:
        logger.info(f"Fetching CodeChef contests from {self.api_url}...")
        headers = {
            "User-Agent": settings.USER_AGENT,
            "Accept": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT_SECONDS, follow_redirects=True) as client:
                response = await client.get(self.api_url, headers=headers)
                response.raise_for_status()
                data = response.json()

            status_str = data.get("status", "")
            if status_str != "success" and "future_contests" not in data:
                error_msg = f"CodeChef response missing success status: {status_str}"
                logger.error(error_msg)
                return CollectorResult(
                    platform=self.platform_id,
                    success=False,
                    error_message=error_msg
                )

            future_contests = data.get("future_contests", [])
            present_contests = data.get("present_contests", [])
            raw_contests = future_contests + present_contests

            normalized: List[ContestCreate] = []
            now_utc = datetime.now(timezone.utc)

            for item in raw_contests:
                code = item.get("contest_code") or item.get("code")
                if not code:
                    logger.warning(f"Skipping CodeChef contest without contest_code: {item}")
                    continue

                code = str(code).strip()
                name = item.get("contest_name") or item.get("name", f"CodeChef Contest {code}")
                name = str(name).strip()

                # Parse start date (prefer ISO string, fallback to standard date string)
                date_str = item.get("contest_start_date_iso") or item.get("contest_start_date")
                if not date_str:
                    logger.warning(f"Skipping CodeChef contest {code} without start date")
                    continue

                start_time = self.parse_datetime(date_str)

                # Duration is usually provided in minutes in CodeChef API (e.g. "120" or "180")
                duration_val = item.get("contest_duration") or item.get("duration", 120)
                try:
                    duration_minutes = int(float(duration_val))
                    duration_seconds = duration_minutes * 60
                except (ValueError, TypeError):
                    duration_seconds = 7200  # Default 2 hours

                status = self.determine_status(start_time, duration_seconds, now_utc)

                contest = ContestCreate(
                    id=self.generate_id(self.platform_id, code),
                    platform=self.platform_id,
                    external_id=code,
                    name=name,
                    start_time=start_time,
                    duration_seconds=duration_seconds,
                    contest_url=f"https://www.codechef.com/{code}",
                    status=status,
                    source_updated_at=now_utc
                )
                normalized.append(contest)

            logger.info(f"CodeChef: successfully collected {len(normalized)} contests")
            return CollectorResult(
                platform=self.platform_id,
                success=True,
                contests=normalized,
                raw_count=len(raw_contests)
            )

        except httpx.TimeoutException as e:
            err = f"CodeChef request timed out: {str(e)}"
            logger.error(err)
            return CollectorResult(platform=self.platform_id, success=False, error_message=err)
        except httpx.HTTPStatusError as e:
            err = f"CodeChef HTTP error {e.response.status_code}: {e.response.text[:200]}"
            logger.error(err)
            return CollectorResult(platform=self.platform_id, success=False, error_message=err)
        except Exception as e:
            err = f"Unexpected error collecting from CodeChef: {str(e)}"
            logger.error(err, exc_info=True)
            return CollectorResult(platform=self.platform_id, success=False, error_message=err)
