import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.exc import IntegrityError
from app.models.contest import Contest
from app.models.platform_health import PlatformHealth
from app.schemas.contest import ContestCreate
from app.collectors.base import CollectorResult
from app.services.sync_service import SyncService


def test_unique_constraint(db_session):
    now = datetime.now(timezone.utc)
    c1 = Contest(
        id="cf_100",
        platform="codeforces",
        external_id="100",
        name="Contest 1",
        start_time=now,
        duration_seconds=7200,
        contest_url="https://codeforces.com/contest/100",
        status="upcoming",
    )
    db_session.add(c1)
    db_session.commit()

    # Attempting to add another contest with identical (platform, external_id)
    c2 = Contest(
        id="cf_100_diff",
        platform="codeforces",
        external_id="100",
        name="Duplicate Contest",
        start_time=now,
        duration_seconds=7200,
        contest_url="https://codeforces.com/contest/100",
        status="upcoming",
    )
    db_session.add(c2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


@pytest.mark.asyncio
async def test_sync_upsert_and_cache_preservation(monkeypatch, db_session):
    now = datetime.now(timezone.utc)
    sync = SyncService(collectors=[])

    # 1. Initial success sync
    item = ContestCreate(
        id="codeforces_200",
        platform="codeforces",
        external_id="200",
        name="Original Title",
        start_time=now + timedelta(days=1),
        duration_seconds=7200,
        contest_url="https://codeforces.com/contest/200",
        status="upcoming",
    )
    res_success = CollectorResult(
        platform="codeforces",
        success=True,
        contests=[item],
        raw_count=1,
    )

    # Patch SessionLocal to use our test db_session
    monkeypatch.setattr("app.services.sync_service.SessionLocal", lambda: db_session)

    await sync._persist_collector_result(res_success)

    saved = db_session.query(Contest).filter(Contest.id == "codeforces_200").first()
    assert saved is not None
    assert saved.name == "Original Title"

    health = db_session.query(PlatformHealth).filter(PlatformHealth.platform == "codeforces").first()
    assert health.health == "healthy"
    assert health.contest_count == 1

    # 2. Update existing contest
    item_updated = ContestCreate(
        id="codeforces_200",
        platform="codeforces",
        external_id="200",
        name="Updated Title",
        start_time=now + timedelta(days=1),
        duration_seconds=7200,
        contest_url="https://codeforces.com/contest/200",
        status="upcoming",
    )
    res_update = CollectorResult(
        platform="codeforces",
        success=True,
        contests=[item_updated],
        raw_count=1,
    )
    await sync._persist_collector_result(res_update)

    updated = db_session.query(Contest).filter(Contest.id == "codeforces_200").first()
    assert updated.name == "Updated Title"

    # 3. Simulate failure in next refresh: existing cached records must NOT be deleted
    res_failure = CollectorResult(
        platform="codeforces",
        success=False,
        contests=[],
        error_message="503 Service Unavailable",
    )
    await sync._persist_collector_result(res_failure)

    retained = db_session.query(Contest).filter(Contest.id == "codeforces_200").first()
    assert retained is not None
    assert retained.name == "Updated Title"

    health_after_fail = db_session.query(PlatformHealth).filter(PlatformHealth.platform == "codeforces").first()
    assert health_after_fail.health == "degraded"
    assert "503 Service Unavailable" in health_after_fail.latest_error


@pytest.mark.asyncio
async def test_gfg_failure_isolation(monkeypatch, db_session):
    now = datetime.now(timezone.utc)
    sync = SyncService(collectors=[])
    monkeypatch.setattr("app.services.sync_service.SessionLocal", lambda: db_session)

    # Pre-existing GFG contest in DB
    gfg_item = ContestCreate(
        id="gfg_contest_1",
        platform="gfg",
        external_id="contest_1",
        name="GFG Cached Contest",
        start_time=now + timedelta(days=2),
        duration_seconds=7200,
        contest_url="https://practice.geeksforgeeks.org/contest/contest_1",
        status="upcoming",
    )
    res_gfg_initial = CollectorResult(platform="gfg", success=True, contests=[gfg_item], raw_count=1)
    await sync._persist_collector_result(res_gfg_initial)

    # GFG refresh fails with 500 error
    res_gfg_fail = CollectorResult(platform="gfg", success=False, contests=[], error_message="500 Internal Server Error")
    await sync._persist_collector_result(res_gfg_fail)

    # Codeforces refresh succeeds in the same cycle
    cf_item = ContestCreate(
        id="codeforces_cf_2",
        platform="codeforces",
        external_id="cf_2",
        name="CF Round 999",
        start_time=now + timedelta(days=1),
        duration_seconds=7200,
        contest_url="https://codeforces.com/contest/999",
        status="upcoming",
    )
    res_cf_success = CollectorResult(platform="codeforces", success=True, contests=[cf_item], raw_count=1)
    await sync._persist_collector_result(res_cf_success)

    # Verify GFG cached contest was preserved
    retained_gfg = db_session.query(Contest).filter(Contest.id == "gfg_contest_1").first()
    assert retained_gfg is not None
    assert retained_gfg.name == "GFG Cached Contest"

    # Verify CF contest was saved
    saved_cf = db_session.query(Contest).filter(Contest.id == "codeforces_cf_2").first()
    assert saved_cf is not None

    # Verify health states
    gfg_health = db_session.query(PlatformHealth).filter(PlatformHealth.platform == "gfg").first()
    assert gfg_health.health == "degraded"
    assert "500 Internal Server Error" in gfg_health.latest_error

    cf_health = db_session.query(PlatformHealth).filter(PlatformHealth.platform == "codeforces").first()
    assert cf_health.health == "healthy"

