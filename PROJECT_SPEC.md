# PROJECT SPECIFICATION: CODING CONTEST CALENDAR

## 1. Executive Summary & Vision
The **Coding Contest Calendar** is a high-performance, developer-focused, unified contest tracker. It continuously aggregates competitive programming contests from **LeetCode**, **CodeChef**, and **Codeforces**, normalizing schedules into a unified time standard (UTC) and exposing them via:
1. A fast, clean, responsive React + TypeScript frontend web application.
2. A production-ready, well-documented RESTful API engineered for standalone use and seamless future integration into an institutional Career Development Cell (CDC) portal.

**Core Value Proposition**: Answer *"When is the next coding contest, regardless of platform?"* within 1 second of loading, with zero ambiguity, zero fabricated data, and complete timezone clarity.

---

## 2. Architecture Overview

### High-Level Topology
```
+--------------------------------------------------------------------------+
|                            EXTERNAL PLATFORMS                            |
|    Codeforces API        CodeChef REST API         LeetCode GraphQL      |
+-------------+--------------------+-------------------------+-------------+
              |                    |                         |
              +--------------------+-------------------------+
                                   | HTTPX (Async, Resilient)
                                   v
+--------------------------------------------------------------------------+
|                             BACKEND (FASTAPI)                            |
|                                                                          |
|  +--------------------------------------------------------------------+  |
|  | Collectors (BaseCollector)                                         |  |
|  | - CodeforcesCollector  - CodeChefCollector  - LeetCodeCollector    |  |
|  +---------------------------------+----------------------------------+  |
|                                    |                                     |
|                                    v                                     |
|  +---------------------------------+----------------------------------+  |
|  | Refresh & Sync Engine (APScheduler, Concurrency Lock, Retry Logic) |  |
|  +---------------------------------+----------------------------------+  |
|                                    |                                     |
|                                    v                                     |
|  +---------------------------------+----------------------------------+  |
|  | Storage Layer: SQLite (SQLAlchemy 2.0 ORM, Migrations/Init)         |  |
|  | Models: Contest, PlatformStatus, RefreshLog                        |  |
|  +---------------------------------+----------------------------------+  |
|                                    |                                     |
|                                    v                                     |
|  +---------------------------------+----------------------------------+  |
|  | API Router (/api/v1/...)                                           |  |
|  | - /health        - /contests     - /contests/next  - /platforms     |  |
|  | - /sources/status - /admin/refresh                                 |  |
|  +---------------------------------+----------------------------------+  |
+------------------------------------+-------------------------------------+
                                     | JSON (ISO 8601, UTC)
                                     v
+--------------------------------------------------------------------------+
|                       FRONTEND (REACT + VITE + TS)                       |
|                                                                          |
|  - Modern developer design tokens (Dark/Light mode)                      |
|  - Real-time countdowns (tab-suspension safe, accurate)                 |
|  - Dual Views: Chronological List & Lightweight Monthly Calendar         |
|  - Timezone selector (Defaults to Asia/Kolkata / IST, supports all IANA) |
|  - Platform & Status filtering, pagination, search                       |
|  - Freshness indicator & manual refresh trigger                          |
+--------------------------------------------------------------------------+
```

---

## 3. Data Collection & Normalization

### 3.1 Collector Contract
Every collector inherits from `BaseCollector`:
- `platform_id: str`
- `fetch_and_normalize() -> Tuple[List[NormalizedContest], CollectorStatus]`
- Per-platform fault isolation: Failures in Codeforces or LeetCode do not corrupt or interrupt CodeChef sync.
- Request timeout: 10s default with exponential backoff on transient HTTP errors (5xx/network errors), no infinite retries.

### 3.2 Data Models & Schema
**Normalized Contest**:
- `id`: `str` (UUID or deterministic sha256 of `platform:external_id`)
- `platform`: `str` (`codeforces` | `codechef` | `leetcode`)
- `external_id`: `str` (Native platform contest identifier)
- `name`: `str` (Official title)
- `start_time`: `datetime` (UTC ISO 8601)
- `duration_seconds`: `int` (Duration in seconds)
- `end_time`: `datetime` (UTC ISO 8601, derived: `start_time + duration`)
- `contest_url`: `str` (Direct link to official contest page)
- `status`: `str` (`upcoming` | `ongoing` | `completed`)
- `source_updated_at`: `datetime` (UTC ISO 8601)
- `created_at`: `datetime` (UTC ISO 8601)
- `updated_at`: `datetime` (UTC ISO 8601)

**Platform Health Status**:
- `platform`: `str`
- `last_successful_refresh`: `datetime` (nullable)
- `last_attempted_refresh`: `datetime`
- `health`: `str` (`healthy` | `degraded` | `unreachable`)
- `latest_error`: `str` (nullable)
- `contest_count`: `int`
- `is_stale`: `bool` (flagged if last success > 2 hours ago)

---

## 4. API Endpoints Specification

| Method | Path | Description | Query / Body Params | Auth |
|---|---|---|---|---|
| `GET` | `/api/v1/health` | Service & DB readiness check | None | Public |
| `GET` | `/api/v1/contests` | Filterable contest listings | `platform`, `status`, `from_time`, `to_time`, `limit`, `offset`, `sort` | Public |
| `GET` | `/api/v1/contests/next` | Earliest upcoming contest | None | Public |
| `GET` | `/api/v1/contests/{contest_id}` | Detail for single contest | None | Public |
| `GET` | `/api/v1/platforms` | Platform list with status | None | Public |
| `GET` | `/api/v1/sources/status` | Comprehensive sync health | None | Public |
| `POST` | `/api/v1/admin/refresh` | Force sync from upstream | Optional `platform` query | `X-Admin-Key` header |

---

## 5. Frontend UI/UX Design

### 5.1 Design Principles
- Developer-first aesthetic: JetBrains Mono / Inter typography, monospace metrics, clean borders (`1px solid var(--border)`), subtle card elevation.
- Dark theme as default (`#0d1117` base / `#161b22` surfaces), elegant high-contrast Light mode (`#ffffff` / `#f6f8fa`).
- Distinct visual badges for platforms with accessible SVG icons and text labels (no color-only reliance).
- Responsive grid / flex layout: Desktop multi-column, tablet compact card, mobile single-column list with horizontal scroll prevention.

### 5.2 Core Components
- **Header**: Brand title, Theme Switcher, Timezone Selector (with search / quick presets like IST, UTC, EST, PST, GMT, JST), Platform Filter Bar.
- **Data Freshness Bar**: Last synced timestamp, source status pills, manual sync button with loading indicator.
- **Hero / Next Contest Card**: Highlight the immediate next upcoming contest with large live countdown.
- **Contest List View**: Cards or rows with platform badge, name, start date/time (in user timezone), duration, countdown, and direct contest URL button.
- **Contest Calendar View**: Interactive monthly grid showing contest markers, clicking a day filters or displays that day's contests.
- **State Handling**: Skeleton loaders during network fetch, clear empty states ("No contests found for selected filter"), degraded platform warning banner.

---

## 6. Testing & Quality Assurance
- **Backend**: Pytest suite covering all collector response parsers, edge-case handlers, database CRUD, deduplication, timezone conversions, status calculations, API routes, pagination, admin auth, and concurrency locking.
- **Frontend**: Vitest and React Testing Library tests for component rendering, countdown accuracy, timezone conversion, filtering, and error states.
- **Production Build**: Full TypeScript compilation (`tsc`) and Vite build verification.
- **Live Verification**: Actual live request verification against upstream APIs.
