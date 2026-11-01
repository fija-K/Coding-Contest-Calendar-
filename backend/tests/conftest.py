import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.db.session import Base, get_db
from app.main import app
from app.models.contest import Contest
from app.models.platform_health import PlatformHealth
from app.services.sync_service import sync_service

# In-memory test SQLite engine with StaticPool so all connections share the same memory DB
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Fresh in-memory database for each test function."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session, monkeypatch):
    """FastAPI TestClient overriding the get_db dependency and database engine."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr("app.services.sync_service.SessionLocal", lambda: db_session)
    monkeypatch.setattr("app.api.endpoints.SessionLocal", lambda: db_session, raising=False)
    sync_service._is_syncing = False

    # Prevent background sync on startup during tests
    with patch("app.main.start_scheduler"), patch("app.main.sync_service.sync_all", new_callable=AsyncMock):
        with TestClient(app) as test_client:
            yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_contests(db_session):
    """Pre-populate the test DB with sample contests across platforms and statuses."""
    now = datetime.now(timezone.utc)

    contests = [
        Contest(
            id="codeforces_1001",
            platform="codeforces",
            external_id="1001",
            name="Codeforces Round 1001",
            start_time=now + timedelta(days=2),
            duration_seconds=7200,
            contest_url="https://codeforces.com/contest/1001",
            status="upcoming",
            created_at=now,
            updated_at=now,
        ),
        Contest(
            id="codeforces_1000",
            platform="codeforces",
            external_id="1000",
            name="Codeforces Round 1000",
            start_time=now - timedelta(hours=1),
            duration_seconds=7200,
            contest_url="https://codeforces.com/contest/1000",
            status="ongoing",
            created_at=now,
            updated_at=now,
        ),
        Contest(
            id="codechef_START200",
            platform="codechef",
            external_id="START200",
            name="Starters 200",
            start_time=now + timedelta(days=3),
            duration_seconds=7200,
            contest_url="https://www.codechef.com/START200",
            status="upcoming",
            created_at=now,
            updated_at=now,
        ),
        Contest(
            id="leetcode_weekly-400",
            platform="leetcode",
            external_id="weekly-400",
            name="Weekly Contest 400",
            start_time=now + timedelta(days=1),
            duration_seconds=5400,
            contest_url="https://leetcode.com/contest/weekly-400",
            status="upcoming",
            created_at=now,
            updated_at=now,
        ),
        Contest(
            id="leetcode_weekly-399",
            platform="leetcode",
            external_id="weekly-399",
            name="Weekly Contest 399",
            start_time=now - timedelta(days=7),
            duration_seconds=5400,
            contest_url="https://leetcode.com/contest/weekly-399",
            status="completed",
            created_at=now,
            updated_at=now,
        ),
        Contest(
            id="gfg_weekly-coding-100",
            platform="gfg",
            external_id="weekly-coding-100",
            name="GeeksforGeeks Weekly 100",
            start_time=now + timedelta(days=4),
            duration_seconds=5400,
            contest_url="https://practice.geeksforgeeks.org/contest/weekly-coding-100",
            status="upcoming",
            created_at=now,
            updated_at=now,
        ),
    ]

    for c in contests:
        db_session.add(c)

    health_records = [
        PlatformHealth(platform="codeforces", health="healthy", contest_count=2, last_successful_refresh=now),
        PlatformHealth(platform="codechef", health="healthy", contest_count=1, last_successful_refresh=now),
        PlatformHealth(platform="leetcode", health="healthy", contest_count=2, last_successful_refresh=now),
        PlatformHealth(platform="gfg", health="healthy", contest_count=1, last_successful_refresh=now),
    ]
    for h in health_records:
        db_session.add(h)

    db_session.commit()
    return contests
