import logging
from typing import List, Optional
from datetime import datetime, timezone
import httpx
from app.collectors.base import BaseCollector, CollectorResult
from app.schemas.contest import ContestCreate
from app.core.config import settings

logger = logging.getLogger(__name__)


class CodeforcesCollector(BaseCollector):
    platform_id = "codeforces"
    platform_name = "Codeforces"

    def __init__(self, api_url: Optional[str] = None):
        self.api_url = api_url or settings.CODEFORCES_API_URL

    async def fetch_and_normalize(self) -> CollectorResult:
        logger.info(f"Fetching Codeforces contests from {self.api_url}...")
        headers = {
            "User-Agent": settings.USER_AGENT,
            "Accept": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT_SECONDS, follow_redirects=True) as client:
                response = await client.get(self.api_url, headers=headers)
                response.raise_for_status()
                data = response.json()

            if data.get("status") != "OK":
                error_msg = data.get("comment", "Codeforces API did not return OK status")
                logger.error(f"Codeforces API error: {error_msg}")
                return CollectorResult(
                    platform=self.platform_id,
                    success=False,
                    error_message=error_msg
                )

            raw_contests = data.get("result", [])
            normalized: List[ContestCreate] = []
            now_utc = datetime.now(timezone.utc)

            for item in raw_contests:
                # We prioritize BEFORE and CODING phases, but also capture recent or scheduled contests
                phase = item.get("phase", "")
                if phase not in ["BEFORE", "CODING"]:
                    # Skip historical finished contests to avoid syncing thousands of past contests on every run
                    continue

                ext_id = str(item.get("id"))
                name = item.get("name", f"Codeforces Contest {ext_id}").strip()
                start_sec = item.get("startTimeSeconds")
                duration_sec = item.get("durationSeconds", 7200)

                if start_sec is None:
                    logger.warning(f"Skipping Codeforces contest {ext_id} due to missing startTimeSeconds")
                    continue

                start_time = self.parse_datetime(start_sec)
                status = self.determine_status(start_time, duration_sec, now_utc)

                contest = ContestCreate(
                    id=self.generate_id(self.platform_id, ext_id),
                    platform=self.platform_id,
                    external_id=ext_id,
                    name=name,
                    start_time=start_time,
                    duration_seconds=duration_sec,
                    contest_url=f"https://codeforces.com/contest/{ext_id}",
                    status=status,
                    source_updated_at=now_utc
                )
                normalized.append(contest)

            logger.info(f"Codeforces: successfully collected {len(normalized)} contests (from {len(raw_contests)} total)")
            return CollectorResult(
                platform=self.platform_id,
                success=True,
                contests=normalized,
                raw_count=len(raw_contests)
            )

        except httpx.TimeoutException as e:
            err = f"Codeforces request timed out: {str(e)}"
            logger.error(err)
            return CollectorResult(platform=self.platform_id, success=False, error_message=err)
        except httpx.HTTPStatusError as e:
            err = f"Codeforces HTTP error {e.response.status_code}: {e.response.text[:200]}"
            logger.error(err)
            return CollectorResult(platform=self.platform_id, success=False, error_message=err)
        except Exception as e:
            err = f"Unexpected error collecting from Codeforces: {str(e)}"
            logger.error(err, exc_info=True)
            return CollectorResult(platform=self.platform_id, success=False, error_message=err)
