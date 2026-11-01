# SYSTEM ARCHITECTURE & INTEGRATION GUIDE

This document details the software architecture, persistence layer, background collection pipeline, and the integration blueprint for embedding this service into an institutional **Career Development Cell (CDC) Portal**.

---

## 1. System Topology & Data Pipeline

```
+----------------------------------------------------------------------------------------+
|                                  UPSTREAM PLATFORMS                                    |
|   Codeforces REST API             CodeChef JSON API             LeetCode GraphQL API   |
+-------------------+-----------------------+-----------------------------+--------------+
                    |                       |                             |
                    +-----------------------+-----------------------------+
                                            | HTTPX (Async, Non-blocking, 15s timeout)
                                            v
+----------------------------------------------------------------------------------------+
|                                    BACKEND ENGINE                                      |
|                                                                                        |
|   +--------------------------------------------------------------------------------+   |
|   | Collectors Layer (BaseCollector Abstract Interface)                            |   |
|   |  - CodeforcesCollector  - CodeChefCollector  - LeetCodeCollector               |   |
|   +---------------------------------------+----------------------------------------+   |
|                                           |                                            |
|                                           v                                            |
|   +--------------------------------------------------------------------------------+   |
|   | Sync & Refresh Service (app.services.sync_service)                             |   |
|   |  - Async Concurrency Lock: asyncio.Lock()                                      |   |
|   |  - Platform Isolation: Per-collector try/catch prevents cascading failures   |   |
|   |  - Fault-tolerant Cache Preservation: Failures never delete existing records   |   |
|   |  - Dynamic Status Recalculator: upcoming -> ongoing -> completed               |   |
|   +-------------------+-----------------------------------+------------------------+   |
|                       |                                   |                            |
|                       v                                   v                            |
|       +-------------------------------+   +------------------------------------+       |
|       | Background APScheduler        |   | SQLite Persistence (SQLAlchemy 2)  |       |
|       | - 30-min interval             |   | - Table: contests                  |       |
|       | - Post-startup initial sync   |   | - Table: platform_health           |       |
|       +-------------------------------+   +-----------------+------------------+       |
|                                                             |                          |
|                                                             v                          |
|                                           +------------------------------------+       |
|                                           | REST API Router (/api/v1/...)       |       |
|                                           | - /health        - /contests       |       |
|                                           | - /contests/next - /sources/status |       |
|                                           | - /admin/refresh                   |       |
|                                           +-----------------+------------------+       |
+-------------------------------------------------------------+--------------------------+
                                                              | JSON (UTC ISO 8601)
                                                              v
+----------------------------------------------------------------------------------------+
|                              FRONTEND (REACT + VITE + TS)                              |
|                                                                                        |
|  - Real-time ticking countdown with document visibility auto-resync (tab sleep safe)   |
|  - Full Timezone conversions via Intl.DateTimeFormat (Default: Asia/Kolkata / IST)     |
|  - Multi-platform filtering (All, LeetCode, CodeChef, Codeforces)                      |
|  - Dual Layout: Chronological List & Lightweight Monthly Calendar                     |
|  - System & Manual Theme Switching (Dark Mode Default / Light Mode)                    |
+----------------------------------------------------------------------------------------+
```

---

## 2. Storage & Database Design

### Database Engine
The initial implementation uses **SQLite** through **SQLAlchemy 2.0 ORM** with thread-safe connection pooling.

### Schema Specifications

#### Table: `contests`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | Primary Key, Index | Deterministic string ID: `{platform}_{external_id}` |
| `platform` | String | Not Null, Index | `codeforces` \| `codechef` \| `leetcode` |
| `external_id` | String | Not Null, Index | Upstream contest code or slug |
| `name` | String | Not Null | Official contest title |
| `start_time` | DateTime(timezone=True) | Not Null, Index | UTC start timestamp |
| `duration_seconds` | Integer | Not Null | Contest duration in seconds |
| `contest_url` | String | Not Null | Official contest registration / landing page |
| `status` | String | Not Null, Index | `upcoming` \| `ongoing` \| `completed` |
| `source_updated_at` | DateTime(timezone=True) | Nullable | Upstream last sync timestamp |
| `created_at` | DateTime(timezone=True) | Not Null | Record insertion timestamp |
| `updated_at` | DateTime(timezone=True) | Not Null | Record last modification timestamp |

**Indexes & Constraints**:
- Unique constraint: `UNIQUE("platform", "external_id")` ensures deduplication across repetitive refreshes.
- Composite Index: `INDEX("platform", "status", "start_time")` ensures `< 5ms` query response times for filtered calendar listings.

#### Table: `platform_health`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `platform` | String | Primary Key | `codeforces` \| `codechef` \| `leetcode` |
| `last_successful_refresh` | DateTime(timezone=True) | Nullable | Last timestamp where upstream fetch succeeded |
| `last_attempted_refresh` | DateTime(timezone=True) | Nullable | Timestamp of most recent attempt |
| `health` | String | Not Null | `healthy` \| `degraded` \| `error` \| `unknown` |
| `latest_error` | String | Nullable | Error diagnostic message on failure |
| `contest_count` | Integer | Not Null, Default 0 | Active stored contest volume |
| `updated_at` | DateTime(timezone=True) | Not Null | Record modification timestamp |

### Migration Path to PostgreSQL
The persistence layer is completely decoupled:
1. No raw vendor-specific SQL is used anywhere; all queries use SQLAlchemy 2.0 core primitives.
2. Migrating to PostgreSQL simply requires changing the `DATABASE_URL` environment variable:
   ```env
   DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/cdc_calendar
   ```
3. SQLite connection arguments (`check_same_thread=False`) are applied conditionally only when the database URL begins with `sqlite`.

---

## 3. Scheduled Refresh & Concurrency Control

### Concurrency Lock
To prevent race conditions and duplicate database transactions, `SyncService` maintains an asynchronous lock (`asyncio.Lock()`). If a manual refresh is triggered via `POST /api/v1/admin/refresh` while a scheduled refresh is already executing, the API immediately returns `HTTP 409 Conflict` with a clean error message.

### Fault Isolation & Cache Retention
1. **Per-Platform Failure Isolation**: Each collector is executed inside an isolated `try/except` block. A network failure or rate limit in Codeforces will never prevent CodeChef or LeetCode from completing their synchronization.
2. **Non-destructive Updates**: When a collector encounters an error, the database records for that platform are **never deleted or overwritten with empty sets**. The existing cached records remain valid and are marked with a `degraded` status.

---

## 4. Career Development Cell (CDC) Portal Integration Blueprint

When integrating this calendar service into a university or college CDC portal, the portal should interact with this service strictly through its clean, versioned REST API.

### Integration Patterns

#### Pattern A: Direct API Ingestion (Backend-to-Backend)
The CDC Portal backend can consume the calendar API periodically or on-demand:
1. **Daily Upcoming Contest Feed**:
   ```http
   GET http://contest-calendar:8000/api/v1/contests?status=upcoming&limit=10
   ```
2. **Student Dashboard Widget**:
   Query the next upcoming contest for instant hero display:
   ```http
   GET http://contest-calendar:8000/api/v1/contests/next
   ```

#### Pattern B: Frontend Iframe / Micro-Frontend Embedding
1. Configure `CORS_ORIGINS` in `backend/.env` to include the CDC portal domain:
   ```env
   CORS_ORIGINS=["https://cdc.university.edu", "http://localhost:3000"]
   ```
2. The CDC Portal frontend can embed the standalone React UI directly as an `<iframe>` or mount the built bundle as a web component.

#### Pattern C: Webhook / Notification Triggering
When extending the CDC portal to send Discord, Slack, or email reminders:
1. Query `GET /api/v1/contests?status=upcoming&from={now}&to={now_plus_24h}`.
2. Check student contest registration or broadcast reminders 24 hours and 1 hour before contest start time.
