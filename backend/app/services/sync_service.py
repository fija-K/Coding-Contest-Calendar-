import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.contest import Contest
from app.models.platform_health import PlatformHealth
from app.collectors.base import BaseCollector, CollectorResult
from app.collectors.codeforces import CodeforcesCollector
from app.collectors.codechef import CodeChefCollector
from app.collectors.leetcode import LeetCodeCollector

logger = logging.getLogger(__name__)


class SyncService:
    _lock = asyncio.Lock()
    _is_syncing = False

    def __init__(self, collectors: Optional[List[BaseCollector]] = None):
        self.collectors: List[BaseCollector] = collectors or [
            CodeforcesCollector(),
            CodeChefCollector(),
            LeetCodeCollector(),
        ]

    @property
    def is_syncing(self) -> bool:
        return self._is_syncing

    async def sync_all(self, target_platform: Optional[str] = None) -> Dict[str, Any]:
        """
        Synchronize contests across all platforms or a specific platform.
        Protected by an async lock against concurrent executions.
        """
        if self._lock.locked():
            logger.warning("Sync operation rejected: sync is already in progress.")
            return {
                "success": False,
                "message": "A sync operation is already in progress.",
                "in_progress": True,
                "results": {}
            }

        async with self._lock:
            self._is_syncing = True
            logger.info("Starting concurrent contest synchronization...")
            results = {}

            async def _run_collector(collector: BaseCollector):
                try:
                    res = await collector.fetch_and_normalize()
                    await self._persist_collector_result(res)
                    return collector.platform_id, {
                        "success": res.success,
                        "count": len(res.contests),
                        "error": res.error_message
                    }
                except Exception as e:
                    logger.error(f"Fatal error running collector {collector.platform_id}: {e}", exc_info=True)
                    self._record_platform_failure(collector.platform_id, str(e))
                    return collector.platform_id, {
                        "success": False,
                        "count": 0,
                        "error": str(e)
                    }

            try:
                active = [
                    c for c in self.collectors
                    if not target_platform or c.platform_id == target_platform.lower()
                ]
                gathered = await asyncio.gather(*[_run_collector(c) for c in active])
                for pid, res in gathered:
                    results[pid] = res

                # Update statuses for all existing contests in DB based on current time
                self.update_contest_statuses()

                return {
                    "success": True,
                    "message": "Synchronization completed.",
                    "in_progress": False,
                    "results": results
                }

            finally:
                self._is_syncing = False

    async def _persist_collector_result(self, result: CollectorResult):
        """Persist normalized contests and update platform health."""
        db: Session = SessionLocal()
        now_utc = datetime.now(timezone.utc)

        try:
            # 1. Update or create PlatformHealth record
            health_rec = db.query(PlatformHealth).filter(PlatformHealth.platform == result.platform).first()
            if not health_rec:
                health_rec = PlatformHealth(platform=result.platform)
                db.add(health_rec)

            health_rec.last_attempted_refresh = now_utc

            if result.success:
                health_rec.health = "healthy"
                health_rec.latest_error = None
                health_rec.last_successful_refresh = now_utc

                # Upsert contests
                for item in result.contests:
                    existing = db.query(Contest).filter(
                        Contest.platform == item.platform,
                        Contest.external_id == item.external_id
                    ).first()

                    if existing:
                        existing.name = item.name
                        existing.start_time = item.start_time
                        existing.duration_seconds = item.duration_seconds
                        existing.contest_url = item.contest_url
                        existing.status = item.status
                        existing.source_updated_at = item.source_updated_at
                        existing.updated_at = now_utc
                    else:
                        new_contest = Contest(
                            id=item.id,
                            platform=item.platform,
                            external_id=item.external_id,
                            name=item.name,
                            start_time=item.start_time,
                            duration_seconds=item.duration_seconds,
                            contest_url=item.contest_url,
                            status=item.status,
                            source_updated_at=item.source_updated_at,
                            created_at=now_utc,
                            updated_at=now_utc
                        )
                        db.add(new_contest)

                db.commit()

                # Update stored contest count
                total_for_platform = db.query(Contest).filter(Contest.platform == result.platform).count()
                health_rec.contest_count = total_for_platform
                db.commit()
                logger.info(f"Persisted {len(result.contests)} contests for {result.platform}. Total in DB: {total_for_platform}")

            else:
                health_rec.health = "error" if health_rec.contest_count == 0 else "degraded"
                health_rec.latest_error = result.error_message
                db.commit()
                logger.warning(f"Refresh failed for {result.platform}: {result.error_message}. Cached data preserved.")

        except Exception as e:
            db.rollback()
            logger.error(f"Database error during persistence for {result.platform}: {e}", exc_info=True)
            raise e
        finally:
            db.close()

    def _record_platform_failure(self, platform: str, error_msg: str):
        db: Session = SessionLocal()
        now_utc = datetime.now(timezone.utc)
        try:
            health_rec = db.query(PlatformHealth).filter(PlatformHealth.platform == platform).first()
            if not health_rec:
                health_rec = PlatformHealth(platform=platform)
                db.add(health_rec)
            health_rec.last_attempted_refresh = now_utc
            health_rec.health = "error" if health_rec.contest_count == 0 else "degraded"
            health_rec.latest_error = error_msg
            db.commit()
        finally:
            db.close()

    def update_contest_statuses(self):
        """Update upcoming/ongoing/completed status of all contests in DB based on current time."""
        db: Session = SessionLocal()
        now_utc = datetime.now(timezone.utc)
        try:
            contests = db.query(Contest).all()
            for c in contests:
                new_status = BaseCollector.determine_status(c.start_time, c.duration_seconds, now_utc)
                if c.status != new_status:
                    c.status = new_status
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to update contest statuses: {e}")
        finally:
            db.close()


sync_service = SyncService()
