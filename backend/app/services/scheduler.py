import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.sync_service import sync_service
from app.core.config import settings

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def scheduled_sync_job():
    logger.info("Executing scheduled contest sync job...")
    try:
        await sync_service.sync_all()
    except Exception as e:
        logger.error(f"Error during scheduled contest sync: {e}", exc_info=True)


def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(
            scheduled_sync_job,
            "interval",
            minutes=settings.REFRESH_INTERVAL_MINUTES,
            id="sync_contests_interval",
            replace_existing=True,
        )
        scheduler.start()
        logger.info(f"Contest sync scheduler started (interval: {settings.REFRESH_INTERVAL_MINUTES} mins)")


def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Contest sync scheduler shut down.")
