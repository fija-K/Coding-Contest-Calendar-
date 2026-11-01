import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header, status as http_status
from sqlalchemy.orm import Session
from sqlalchemy import asc, desc

from app.db.session import get_db
from app.models.contest import Contest
from app.models.platform_health import PlatformHealth
from app.schemas.contest import (
    ContestResponse,
    ContestListResponse,
    PlatformStatusResponse,
    HealthResponse,
)
from app.services.sync_service import sync_service
from app.services.scheduler import scheduler
from app.core.config import settings
from app.db.init_db import seed_database_if_empty

logger = logging.getLogger(__name__)

router = APIRouter()

SUPPORTED_PLATFORMS = {
    "codeforces": "Codeforces",
    "codechef": "CodeChef",
    "leetcode": "LeetCode",
    "gfg": "GeeksforGeeks",
}
VALID_STATUSES = {"upcoming", "ongoing", "completed", "all"}
VALID_SORTS = {"start_time_asc", "start_time_desc", "name_asc", "name_desc"}


@router.get("/health", response_model=HealthResponse, tags=["System"])
def get_health(db: Session = Depends(get_db)):
    """Return health status of API, database connectivity, and background scheduler."""
    db_status = "healthy"
    total_contests = 0
    try:
        total_contests = db.query(Contest).count()
    except Exception as e:
        logger.error(f"Health check database failure: {e}")
        db_status = f"unhealthy: {str(e)}"

    return HealthResponse(
        status="healthy" if db_status == "healthy" else "degraded",
        database=db_status,
        scheduler_running=scheduler.running,
        total_contests=total_contests,
        timestamp=datetime.now(timezone.utc),
    )


@router.get("/contests", response_model=ContestListResponse, tags=["Contests"])
def get_contests(
    platform: Optional[str] = Query(None, description="Filter by platform: codeforces, codechef, leetcode"),
    status: Optional[str] = Query(None, description="Filter by status: upcoming, ongoing, completed"),
    from_time: Optional[datetime] = Query(None, alias="from", description="Contest start time greater than or equal to (ISO 8601 UTC)"),
    to_time: Optional[datetime] = Query(None, alias="to", description="Contest start time less than or equal to (ISO 8601 UTC)"),
    limit: int = Query(50, ge=1, le=200, description="Page limit (1-200)"),
    offset: int = Query(0, ge=0, description="Page offset"),
    sort: str = Query("start_time_asc", description="Sort order: start_time_asc, start_time_desc, name_asc, name_desc"),
    db: Session = Depends(get_db),
):
    """
    Retrieve normalized contests with filtering, sorting, and pagination.
    Dynamic status recalculation is applied to ensure real-time status accuracy.
    """
    # Validation
    if platform and platform.lower() not in SUPPORTED_PLATFORMS:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid platform '{platform}'. Supported platforms: {', '.join(SUPPORTED_PLATFORMS.keys())}"
        )

    if status and status.lower() not in VALID_STATUSES:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{status}'. Valid statuses: {', '.join(VALID_STATUSES)}"
        )

    if sort not in VALID_SORTS:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid sort '{sort}'. Valid sort options: {', '.join(VALID_SORTS)}"
        )

    # Auto-seed if database is completely empty (e.g. serverless cold boot)
    if db.query(Contest).count() == 0:
        seed_database_if_empty()

    # First update status in-place for active contests
    sync_service.update_contest_statuses()

    query = db.query(Contest)

    if platform:
        query = query.filter(Contest.platform == platform.lower())

    if status and status.lower() != "all":
        query = query.filter(Contest.status == status.lower())

    if from_time:
        if from_time.tzinfo is None:
            from_time = from_time.replace(tzinfo=timezone.utc)
        query = query.filter(Contest.start_time >= from_time)

    if to_time:
        if to_time.tzinfo is None:
            to_time = to_time.replace(tzinfo=timezone.utc)
        query = query.filter(Contest.start_time <= to_time)

    total = query.count()

    # Sorting
    if sort == "start_time_asc":
        query = query.order_by(asc(Contest.start_time))
    elif sort == "start_time_desc":
        query = query.order_by(desc(Contest.start_time))
    elif sort == "name_asc":
        query = query.order_by(asc(Contest.name))
    elif sort == "name_desc":
        query = query.order_by(desc(Contest.name))

    items = query.offset(offset).limit(limit).all()

    return ContestListResponse(
        items=[ContestResponse.model_validate(c) for c in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/contests/next", response_model=Optional[ContestResponse], tags=["Contests"])
def get_next_contest(db: Session = Depends(get_db)):
    """Return the immediate next upcoming contest across all platforms."""
    sync_service.update_contest_statuses()
    now_utc = datetime.now(timezone.utc)

    next_contest = (
        db.query(Contest)
        .filter(Contest.status == "upcoming", Contest.start_time >= now_utc)
        .order_by(asc(Contest.start_time))
        .first()
    )

    if not next_contest:
        return None

    return ContestResponse.model_validate(next_contest)


@router.get("/contests/{contest_id}", response_model=ContestResponse, tags=["Contests"])
def get_contest_by_id(contest_id: str, db: Session = Depends(get_db)):
    """Return details for a single contest by its internal identifier."""
    contest = db.query(Contest).filter(Contest.id == contest_id).first()
    if not contest:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Contest with id '{contest_id}' not found"
        )
    return ContestResponse.model_validate(contest)


@router.get("/platforms", response_model=List[PlatformStatusResponse], tags=["Platforms"])
@router.get("/sources/status", response_model=List[PlatformStatusResponse], tags=["Platforms"])
def get_sources_status(db: Session = Depends(get_db)):
    """Return source-specific collection status and data freshness."""
    if db.query(Contest).count() == 0:
        seed_database_if_empty()

    statuses: List[PlatformStatusResponse] = []
    now_utc = datetime.now(timezone.utc)

    for pid, pname in SUPPORTED_PLATFORMS.items():
        rec = db.query(PlatformHealth).filter(PlatformHealth.platform == pid).first()
        contest_count = db.query(Contest).filter(Contest.platform == pid).count()

        if rec:
            # Stale if last successful refresh is older than 2 hours or nonexistent
            is_stale = False
            if rec.last_successful_refresh:
                diff_seconds = (now_utc - rec.last_successful_refresh.replace(tzinfo=timezone.utc)).total_seconds()
                is_stale = diff_seconds > 7200
            else:
                is_stale = True

            statuses.append(
                PlatformStatusResponse(
                    platform=pid,
                    name=pname,
                    health=rec.health,
                    last_successful_refresh=rec.last_successful_refresh,
                    last_attempted_refresh=rec.last_attempted_refresh,
                    latest_error=rec.latest_error,
                    contest_count=contest_count,
                    is_stale=is_stale,
                )
            )
        else:
            statuses.append(
                PlatformStatusResponse(
                    platform=pid,
                    name=pname,
                    health="unknown",
                    last_successful_refresh=None,
                    last_attempted_refresh=None,
                    latest_error="No refresh performed yet",
                    contest_count=contest_count,
                    is_stale=True,
                )
            )

    return statuses


@router.post("/admin/refresh", tags=["Admin"])
async def trigger_admin_refresh(
    platform: Optional[str] = Query(None, description="Optional single platform to refresh"),
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key", description="Admin API Key"),
):
    """
    Trigger manual upstream synchronization for all or specific platforms.
    Protected with X-Admin-Key header.
    """
    if not x_admin_key or x_admin_key != settings.ADMIN_API_KEY:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Invalid or missing X-Admin-Key header"
        )

    if platform and platform.lower() not in SUPPORTED_PLATFORMS:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid platform '{platform}'. Supported platforms: {', '.join(SUPPORTED_PLATFORMS.keys())}"
        )

    if sync_service.is_syncing:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="A refresh operation is already in progress. Please wait."
        )

    # Execute sync
    result = await sync_service.sync_all(target_platform=platform)
    return result
