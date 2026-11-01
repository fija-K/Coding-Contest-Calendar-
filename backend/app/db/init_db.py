import os
import json
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine, Base
from app.models.contest import Contest
from app.models.platform_health import PlatformHealth
from app.collectors.base import BaseCollector

logger = logging.getLogger(__name__)


def seed_database_if_empty():
    """Ensure database tables exist and seed with verified contest snapshot if empty."""
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    now_utc = datetime.now(timezone.utc)
    try:
        count = db.query(Contest).count()
        if count > 0:
            logger.info(f"Database already contains {count} contests. Skipping seed.")
            return

        seed_file = os.path.join(os.path.dirname(__file__), "seed_data.json")
        if not os.path.exists(seed_file):
            logger.warning(f"Seed file not found at {seed_file}")
            return

        with open(seed_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        logger.info(f"Seeding empty database from {seed_file}...")
        for item in data.get("contests", []):
            start_dt = BaseCollector.parse_datetime(item["start_time"]) if item.get("start_time") else None
            dur = item.get("duration_seconds", 7200)
            status = BaseCollector.determine_status(start_dt, dur, now_utc) if start_dt else item.get("status", "upcoming")

            contest = Contest(
                id=item["id"],
                platform=item["platform"],
                external_id=item["external_id"],
                name=item["name"],
                start_time=start_dt,
                duration_seconds=dur,
                contest_url=item["contest_url"],
                status=status,
                source_updated_at=now_utc,
                created_at=now_utc,
                updated_at=now_utc
            )
            db.add(contest)

        for p in data.get("platforms", []):
            health = PlatformHealth(
                platform=p["platform"],
                health=p.get("health", "healthy"),
                contest_count=p.get("contest_count", 0),
                last_successful_refresh=now_utc,
                last_attempted_refresh=now_utc,
                latest_error=None
            )
            db.add(health)

        db.commit()
        seeded_count = db.query(Contest).count()
        logger.info(f"Successfully seeded database with {seeded_count} contests.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to seed database: {e}", exc_info=True)
    finally:
        db.close()
