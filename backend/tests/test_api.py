import pytest
import urllib.parse
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock
from app.core.config import settings
from app.services.sync_service import sync_service


def test_health_endpoint(client, sample_contests):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["total_contests"] == len(sample_contests)


def test_get_contests_all(client, sample_contests):
    response = client.get("/api/v1/contests")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] == len(sample_contests)


def test_get_contests_filter_platform(client, sample_contests):
    # Test LeetCode filter
    response = client.get("/api/v1/contests?platform=leetcode")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    for item in data["items"]:
        assert item["platform"] == "leetcode"

    # Test Codeforces filter
    response_cf = client.get("/api/v1/contests?platform=codeforces")
    assert response_cf.status_code == 200
    data_cf = response_cf.json()
    assert data_cf["total"] == 2
    for item in data_cf["items"]:
        assert item["platform"] == "codeforces"

    # Invalid platform returns 400
    response_invalid = client.get("/api/v1/contests?platform=gfg")
    assert response_invalid.status_code == 400


def test_get_contests_filter_status(client, sample_contests):
    response = client.get("/api/v1/contests?status=upcoming")
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["status"] == "upcoming"


def test_get_contests_filter_date_range(client, sample_contests):
    now = datetime.now(timezone.utc)
    # Use standard Z suffix so URL encoding issues with '+' are avoided
    from_iso = (now + timedelta(days=1, hours=12)).strftime("%Y-%m-%dT%H:%M:%SZ")
    response = client.get(f"/api/v1/contests?from={urllib.parse.quote(from_iso)}")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) >= 1


def test_get_contests_pagination(client, sample_contests):
    response = client.get("/api/v1/contests?limit=2&offset=1")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["limit"] == 2
    assert data["offset"] == 1


def test_get_contests_invalid_params(client):
    # Invalid platform
    resp = client.get("/api/v1/contests?platform=hackerrank")
    assert resp.status_code == 400
    assert "Invalid platform" in resp.json()["detail"]

    # Invalid status
    resp = client.get("/api/v1/contests?status=in_progress")
    assert resp.status_code == 400
    assert "Invalid status" in resp.json()["detail"]

    # Invalid sort
    resp = client.get("/api/v1/contests?sort=random_sort")
    assert resp.status_code == 400
    assert "Invalid sort" in resp.json()["detail"]


def test_get_next_contest(client, sample_contests):
    response = client.get("/api/v1/contests/next")
    assert response.status_code == 200
    data = response.json()
    assert data is not None
    assert data["status"] == "upcoming"
    assert data["id"] == "leetcode_weekly-400"  # Starts in 1 day (earliest upcoming)


def test_get_contest_by_id(client, sample_contests):
    # Found
    resp = client.get("/api/v1/contests/codeforces_1001")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Codeforces Round 1001"

    # Not found
    resp = client.get("/api/v1/contests/nonexistent_id")
    assert resp.status_code == 404


def test_get_platforms_status(client, sample_contests):
    response = client.get("/api/v1/sources/status")
    assert response.status_code == 200
    data = response.json()
    platforms = {item["platform"]: item for item in data}
    assert "codeforces" in platforms
    assert "codechef" in platforms
    assert "leetcode" in platforms
    assert "gfg" not in platforms
    assert platforms["codeforces"]["health"] == "healthy"


def test_admin_refresh_authorization(client):
    # Without admin key
    resp = client.post("/api/v1/admin/refresh")
    assert resp.status_code == 401

    # With invalid key
    resp = client.post("/api/v1/admin/refresh", headers={"X-Admin-Key": "wrong-key"})
    assert resp.status_code == 401

    # With valid key
    sync_service._is_syncing = False
    with patch("app.services.sync_service.sync_service.sync_all", new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = {"success": True, "message": "Synced", "results": {}}
        resp = client.post(
            "/api/v1/admin/refresh",
            headers={"X-Admin-Key": settings.ADMIN_API_KEY}
        )
        assert resp.status_code == 200
        assert resp.json()["success"] is True


def test_admin_refresh_concurrency_lock(client, monkeypatch):
    monkeypatch.setattr(sync_service, "_is_syncing", True)
    resp = client.post(
        "/api/v1/admin/refresh",
        headers={"X-Admin-Key": settings.ADMIN_API_KEY}
    )
    assert resp.status_code == 409
    assert "already in progress" in resp.json()["detail"]
    monkeypatch.setattr(sync_service, "_is_syncing", False)
