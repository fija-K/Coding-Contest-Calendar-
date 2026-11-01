import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
import httpx

from app.collectors.base import BaseCollector
from app.collectors.codeforces import CodeforcesCollector
from app.collectors.codechef import CodeChefCollector
from app.collectors.leetcode import LeetCodeCollector
from app.collectors.gfg import GFGCollector


def make_mock_response(status_code: int = 200, json_data: dict = None):
    mock = MagicMock()
    mock.status_code = status_code
    mock.json.return_value = json_data or {}
    mock.raise_for_status.return_value = None
    return mock


class TestBaseCollector:
    def test_parse_datetime_unix_seconds(self):
        dt = BaseCollector.parse_datetime(1700000000)
        assert dt.tzinfo == timezone.utc
        assert dt.year == 2023

    def test_parse_datetime_unix_milliseconds(self):
        dt = BaseCollector.parse_datetime(1700000000000)
        assert dt.tzinfo == timezone.utc
        assert dt.year == 2023

    def test_parse_datetime_iso_string_with_tz(self):
        dt = BaseCollector.parse_datetime("2026-11-04T20:00:00+05:30")
        assert dt.tzinfo == timezone.utc
        # 20:00 +05:30 is 14:30 UTC
        assert dt.hour == 14
        assert dt.minute == 30

    def test_determine_status(self):
        now = datetime(2026, 11, 1, 12, 0, 0, tzinfo=timezone.utc)
        
        # Future
        future = now + timedelta(hours=2)
        assert BaseCollector.determine_status(future, 7200, now) == "upcoming"

        # Ongoing
        past_start = now - timedelta(hours=1)
        assert BaseCollector.determine_status(past_start, 7200, now) == "ongoing"

        # Completed
        long_ago = now - timedelta(hours=5)
        assert BaseCollector.determine_status(long_ago, 7200, now) == "completed"


class TestCodeforcesCollector:
    @pytest.mark.asyncio
    async def test_fetch_and_normalize_valid(self):
        collector = CodeforcesCollector()
        mock_response_data = {
            "status": "OK",
            "result": [
                {
                    "id": 2001,
                    "name": "Codeforces Round 2001 (Div. 2)",
                    "type": "CF",
                    "phase": "BEFORE",
                    "frozen": False,
                    "durationSeconds": 7200,
                    "startTimeSeconds": 1795000000,
                },
                {
                    "id": 1999,
                    "name": "Finished Contest",
                    "type": "CF",
                    "phase": "FINISHED",
                    "durationSeconds": 7200,
                    "startTimeSeconds": 1600000000,
                }
            ]
        }

        mock_resp = make_mock_response(200, mock_response_data)
        with patch.object(httpx.AsyncClient, "get", return_value=mock_resp):
            result = await collector.fetch_and_normalize()

            assert result.success is True
            assert len(result.contests) == 1
            contest = result.contests[0]
            assert contest.platform == "codeforces"
            assert contest.external_id == "2001"
            assert contest.name == "Codeforces Round 2001 (Div. 2)"
            assert contest.duration_seconds == 7200
            assert contest.contest_url == "https://codeforces.com/contest/2001"

    @pytest.mark.asyncio
    async def test_handle_malformed_response(self):
        collector = CodeforcesCollector()
        mock_resp = make_mock_response(200, {"status": "FAILED", "comment": "Internal server error"})
        with patch.object(httpx.AsyncClient, "get", return_value=mock_resp):
            result = await collector.fetch_and_normalize()
            assert result.success is False
            assert "Internal server error" in result.error_message

    @pytest.mark.asyncio
    async def test_handle_timeout(self):
        collector = CodeforcesCollector()
        with patch.object(httpx.AsyncClient, "get", side_effect=httpx.TimeoutException("Connection timed out")):
            result = await collector.fetch_and_normalize()
            assert result.success is False
            assert "timed out" in result.error_message


class TestCodeChefCollector:
    @pytest.mark.asyncio
    async def test_fetch_and_normalize_valid(self):
        collector = CodeChefCollector()
        mock_data = {
            "status": "success",
            "future_contests": [
                {
                    "contest_code": "START250",
                    "contest_name": "Starters 250",
                    "contest_start_date_iso": "2026-11-05T20:00:00+05:30",
                    "contest_duration": "120"
                }
            ],
            "present_contests": []
        }

        mock_resp = make_mock_response(200, mock_data)
        with patch.object(httpx.AsyncClient, "get", return_value=mock_resp):
            result = await collector.fetch_and_normalize()
            assert result.success is True
            assert len(result.contests) == 1
            contest = result.contests[0]
            assert contest.platform == "codechef"
            assert contest.external_id == "START250"
            assert contest.name == "Starters 250"
            assert contest.duration_seconds == 7200  # 120 minutes * 60
            assert contest.contest_url == "https://www.codechef.com/START250"

    @pytest.mark.asyncio
    async def test_missing_optional_fields(self):
        collector = CodeChefCollector()
        mock_data = {
            "status": "success",
            "future_contests": [
                {
                    "contest_code": "MISSING_DUR",
                    "contest_name": "Contest without duration",
                    "contest_start_date_iso": "2026-11-05T20:00:00+05:30"
                }
            ],
            "present_contests": []
        }

        mock_resp = make_mock_response(200, mock_data)
        with patch.object(httpx.AsyncClient, "get", return_value=mock_resp):
            result = await collector.fetch_and_normalize()
            assert result.success is True
            assert len(result.contests) == 1
            assert result.contests[0].duration_seconds == 7200  # Default fallback


class TestLeetCodeCollector:
    @pytest.mark.asyncio
    async def test_fetch_and_normalize_valid(self):
        collector = LeetCodeCollector()
        mock_data = {
            "data": {
                "topTwoContests": [
                    {
                        "title": "Weekly Contest 450",
                        "titleSlug": "weekly-contest-450",
                        "startTime": 1795000000,
                        "duration": 5400
                    }
                ],
                "allContests": [
                    {
                        "title": "Virtual Weekly Contest",
                        "titleSlug": "virtual-contest",
                        "startTime": 1795000000,
                        "duration": 5400,
                        "isVirtual": True
                    }
                ]
            }
        }

        mock_resp = make_mock_response(200, mock_data)
        with patch.object(httpx.AsyncClient, "post", return_value=mock_resp):
            result = await collector.fetch_and_normalize()
            assert result.success is True
            # Virtual contest should be excluded!
            assert len(result.contests) == 1
            contest = result.contests[0]
            assert contest.platform == "leetcode"
            assert contest.external_id == "weekly-contest-450"
            assert contest.duration_seconds == 5400
            assert contest.contest_url == "https://leetcode.com/contest/weekly-contest-450"


class TestGFGCollector:
    @pytest.mark.asyncio
    async def test_fetch_and_normalize_valid(self):
        collector = GFGCollector()
        mock_data = {
            "results": {
                "upcoming": [
                    {
                        "name": "Geeks Coding Challenge 150",
                        "slug": "geeks-coding-challenge-150",
                        "start_time": "2026-11-15T19:00:00",
                        "end_time": "2026-11-15T21:30:00",
                        "type": 3,
                    },
                    {
                        "name": "AI Webinar with Experts",
                        "slug": "ai-webinar",
                        "start_time": "2026-11-16T18:00:00",
                        "end_time": "2026-11-16T19:30:00",
                        "type": 1,  # Non-contest webinar should be excluded!
                    }
                ],
                "past": []
            }
        }

        mock_resp = make_mock_response(200, mock_data)
        with patch.object(httpx.AsyncClient, "get", return_value=mock_resp):
            result = await collector.fetch_and_normalize()

            assert result.success is True
            # The webinar (type 1) must be excluded, leaving only 1 contest
            assert len(result.contests) == 1
            contest = result.contests[0]
            assert contest.platform == "gfg"
            assert contest.external_id == "geeks-coding-challenge-150"
            assert contest.name == "Geeks Coding Challenge 150"
            # 19:00 to 21:30 is 2.5 hours = 9000 seconds
            assert contest.duration_seconds == 9000
            assert contest.contest_url == "https://practice.geeksforgeeks.org/contest/geeks-coding-challenge-150"
            # IST (19:00 +05:30) converted to UTC is 13:30Z
            assert contest.start_time.hour == 13
            assert contest.start_time.minute == 30
            assert contest.start_time.tzinfo == timezone.utc

    @pytest.mark.asyncio
    async def test_missing_optional_fields(self):
        collector = GFGCollector()
        mock_data = {
            "results": {
                "upcoming": [
                    {
                        "name": "GFG Speed Run",
                        "slug": "gfg-speed-run",
                        "start_time": "2026-11-20T20:00:00",
                        # end_time missing
                        "type": 3,
                    }
                ]
            }
        }

        mock_resp = make_mock_response(200, mock_data)
        with patch.object(httpx.AsyncClient, "get", return_value=mock_resp):
            result = await collector.fetch_and_normalize()
            assert result.success is True
            assert len(result.contests) == 1
            # Missing end_time defaults to 7200 seconds
            assert result.contests[0].duration_seconds == 7200

    @pytest.mark.asyncio
    async def test_handle_malformed_response(self):
        collector = GFGCollector()
        mock_resp = make_mock_response(200, {"error": "Invalid API Key"})
        with patch.object(httpx.AsyncClient, "get", return_value=mock_resp):
            result = await collector.fetch_and_normalize()
            assert result.success is False
            assert "unexpected response structure" in result.error_message

    @pytest.mark.asyncio
    async def test_handle_timeout(self):
        collector = GFGCollector()
        with patch.object(httpx.AsyncClient, "get", side_effect=httpx.TimeoutException("Connection timed out")):
            result = await collector.fetch_and_normalize()
            assert result.success is False
            assert "timed out" in result.error_message

