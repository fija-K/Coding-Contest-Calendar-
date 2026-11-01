# REST API Documentation: Coding Contest Calendar

The **Coding Contest Calendar API** exposes a clean, standardized, normalized interface for querying upcoming, ongoing, and completed competitive programming contests across **LeetCode**, **CodeChef**, **Codeforces**, and **GeeksforGeeks**.

All timestamps are represented in ISO 8601 format with explicit UTC timezone markers (e.g., `2026-11-04T14:30:00Z`).

---

## Base URL
- Local Development: `http://localhost:8000/api/v1`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`
- Redoc Documentation: `http://localhost:8000/redoc`

---

## 1. System Health & Readiness

### `GET /api/v1/health`
Checks application health, SQLite database connectivity, background APScheduler status, and cached contest volume.

#### Response `200 OK`
```json
{
  "status": "healthy",
  "database": "healthy",
  "scheduler_running": true,
  "total_contests": 14,
  "timestamp": "2026-11-01T17:28:42.123456Z"
}
```

---

## 2. Contest Listings

### `GET /api/v1/contests`
Retrieve normalized contests with server-side filtering, sorting, and pagination.

#### Query Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `platform` | string | No | Filter by platform: `codeforces`, `codechef`, `leetcode`, `gfg` | `codeforces` |
| `status` | string | No | Filter by status: `upcoming`, `ongoing`, `completed`, `all` (default: all) | `upcoming` |
| `from` | string | No | Minimum start time in ISO 8601 UTC format | `2026-11-01T00:00:00Z` |
| `to` | string | No | Maximum start time in ISO 8601 UTC format | `2026-11-30T23:59:59Z` |
| `limit` | integer | No | Max records to return (1-200, default: `50`) | `20` |
| `offset` | integer | No | Number of records to skip (default: `0`) | `0` |
| `sort` | string | No | Sort order: `start_time_asc`, `start_time_desc`, `name_asc`, `name_desc` (default: `start_time_asc`) | `start_time_asc` |

#### Response `200 OK`
```json
{
  "items": [
    {
      "id": "codechef_DSAMONDAY027",
      "platform": "codechef",
      "external_id": "DSAMONDAY027",
      "name": "Monday Munch - DSA Challenge 027 (Rated)",
      "start_time": "2026-11-02T13:30:00Z",
      "end_time": "2026-11-02T16:30:00Z",
      "duration_seconds": 10800,
      "contest_url": "https://www.codechef.com/DSAMONDAY027",
      "status": "upcoming",
      "source_updated_at": "2026-11-01T17:27:32.528050Z",
      "created_at": "2026-11-01T17:27:32.529530Z",
      "updated_at": "2026-11-01T17:27:32.529530Z"
    }
  ],
  "total": 14,
  "limit": 50,
  "offset": 0
}
```

---

## 3. Next Upcoming Contest

### `GET /api/v1/contests/next`
Returns the single immediate next upcoming contest across all platforms in constant time. Returns `null` if no upcoming contest is currently scheduled.

#### Response `200 OK`
```json
{
  "id": "codechef_DSAMONDAY027",
  "platform": "codechef",
  "external_id": "DSAMONDAY027",
  "name": "Monday Munch - DSA Challenge 027 (Rated)",
  "start_time": "2026-11-02T13:30:00Z",
  "end_time": "2026-11-02T16:30:00Z",
  "duration_seconds": 10800,
  "contest_url": "https://www.codechef.com/DSAMONDAY027",
  "status": "upcoming",
  "source_updated_at": "2026-11-01T17:27:32.528050Z",
  "created_at": "2026-11-01T17:27:32.529530Z",
  "updated_at": "2026-11-01T17:27:32.529530Z"
}
```

---

## 4. Single Contest Detail

### `GET /api/v1/contests/{contest_id}`
Retrieve a specific contest by its internal identifier (e.g. `codeforces_2283`).

#### Response `200 OK`
```json
{
  "id": "codeforces_2283",
  "platform": "codeforces",
  "external_id": "2283",
  "name": "Educational Codeforces Round 196 (Rated for Div. 2)",
  "start_time": "2026-11-04T14:35:00Z",
  "end_time": "2026-11-04T16:35:00Z",
  "duration_seconds": 7200,
  "contest_url": "https://codeforces.com/contest/2283",
  "status": "upcoming",
  "source_updated_at": "2026-11-01T17:27:31.849645Z",
  "created_at": "2026-11-01T17:27:31.849645Z",
  "updated_at": "2026-11-01T17:27:31.849645Z"
}
```

#### Error `404 Not Found`
```json
{
  "detail": "Contest with id 'nonexistent_id' not found"
}
```

---

## 5. Platform Freshness & Source Status

### `GET /api/v1/sources/status` or `GET /api/v1/platforms`
Exposes the sync health, timestamp of last successful refresh, latest error message (if any), and whether cached data is stale (> 2 hours old).

#### Response `200 OK`
```json
[
  {
    "platform": "codeforces",
    "name": "Codeforces",
    "health": "healthy",
    "last_successful_refresh": "2026-11-01T17:27:31.849645Z",
    "last_attempted_refresh": "2026-11-01T17:27:31.849645Z",
    "latest_error": null,
    "contest_count": 7,
    "is_stale": false
  },
  {
    "platform": "codechef",
    "name": "CodeChef",
    "health": "healthy",
    "last_successful_refresh": "2026-11-01T17:27:32.529530Z",
    "last_attempted_refresh": "2026-11-01T17:27:32.529530Z",
    "latest_error": null,
    "contest_count": 4,
    "is_stale": false
  },
  {
    "platform": "leetcode",
    "name": "LeetCode",
    "health": "healthy",
    "last_successful_refresh": "2026-11-01T17:27:33.516232Z",
    "last_attempted_refresh": "2026-11-01T17:27:33.516232Z",
    "latest_error": null,
    "contest_count": 3,
    "is_stale": false
  },
  {
    "platform": "gfg",
    "name": "GeeksforGeeks",
    "health": "healthy",
    "last_successful_refresh": "2026-11-01T18:22:33.762614Z",
    "last_attempted_refresh": "2026-11-01T18:22:33.762614Z",
    "latest_error": null,
    "contest_count": 0,
    "is_stale": false
  }
]
```

---

## 6. Administrative Manual Refresh

### `POST /api/v1/admin/refresh`
Triggers an upstream collection cycle immediately. Protected via the `X-Admin-Key` header.

#### Headers
- `X-Admin-Key`: Secret key matching `ADMIN_API_KEY` in server configuration.

#### Optional Query Parameters
- `platform`: `codeforces` | `codechef` | `leetcode` | `gfg` (omitted refreshes all platforms).

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Synchronization completed.",
  "in_progress": false,
  "results": {
    "codeforces": { "success": true, "count": 7, "error": null },
    "codechef": { "success": true, "count": 4, "error": null },
    "leetcode": { "success": true, "count": 3, "error": null },
    "gfg": { "success": true, "count": 0, "error": null }
  }
}
```

#### Error `401 Unauthorized`
```json
{
  "detail": "Unauthorized: Invalid or missing X-Admin-Key header"
}
```

#### Error `409 Conflict` (Refresh Already Running)
```json
{
  "detail": "A refresh operation is already in progress. Please wait."
}
```
