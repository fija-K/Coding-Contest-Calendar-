# IMPLEMENTATION PLAN: CODING CONTEST CALENDAR

## Phase 1: Environment & Project Scaffolding
- [x] Inspect workspace and verify tools (Python 3.14, Node.js 24, npm 11).
- [x] Research and verify live data sources (Codeforces, CodeChef, LeetCode) via probe scripts.
- [ ] Establish repository structure:
  - `backend/` (FastAPI, SQLAlchemy, Pydantic, HTTPX, APScheduler, Pytest)
  - `frontend/` (React, Vite, TypeScript, Lucide React, Vitest)
  - `docs/` (API.md, DATA_SOURCES.md, ARCHITECTURE.md)
- [ ] Initialize Python virtual environment and install backend dependencies.
- [ ] Initialize Vite React TypeScript project and install frontend dependencies.

## Phase 2: Backend Architecture & Core Collectors
- [ ] Define SQLAlchemy database models:
  - `Contest` (table `contests` with indexed fields, unique constraint on `(platform, external_id)`).
  - `PlatformHealth` (table `platform_health` tracking freshness, errors, attempt/success times).
- [ ] Implement database session management and automatic table creation.
- [ ] Implement `BaseCollector` with standard return types, error handling, and timeout policies.
- [ ] Implement `CodeforcesCollector`:
  - Fetch from `https://codeforces.com/api/contest.list?gym=false`.
  - Parse Unix timestamps (`startTimeSeconds`), duration in seconds.
  - Map phase to upcoming/ongoing/completed.
- [ ] Implement `CodeChefCollector`:
  - Fetch from `https://www.codechef.com/api/list/contests/all`.
  - Parse ISO strings (`contest_start_date_iso`), duration in minutes converted to seconds.
  - Handle timezones and format variances.
- [ ] Implement `LeetCodeCollector`:
  - Query `https://leetcode.com/graphql` for upcoming contests (`topTwoContests` and `allContests`).
  - Parse Unix timestamps (`startTime`), duration in seconds.
  - Exclude virtual contests (`isVirtual: true`).
- [ ] Build Sync & Refresh Service (`RefreshService`):
  - Concurrency lock (prevents overlapping sync runs).
  - Platform isolation (error in one platform doesn't block others).
  - Update vs. insert logic (upsert without duplicates).
  - Schedule regular sync using APScheduler.

## Phase 3: REST API Implementation
- [ ] Create Pydantic response and query validation schemas.
- [ ] Implement `GET /api/v1/health`.
- [ ] Implement `GET /api/v1/contests` with:
  - Platform filter (`codeforces`, `codechef`, `leetcode`, `all`).
  - Status filter (`upcoming`, `ongoing`, `completed`, `all`).
  - Date range filters (`from_time`, `to_time`).
  - Sorting (`start_time_asc`, `start_time_desc`, etc.).
  - Pagination (`limit`, `offset`) with total count metadata.
- [ ] Implement `GET /api/v1/contests/next` (earliest upcoming contest).
- [ ] Implement `GET /api/v1/contests/{contest_id}`.
- [ ] Implement `GET /api/v1/platforms` & `GET /api/v1/sources/status`.
- [ ] Implement `POST /api/v1/admin/refresh` protected by `X-Admin-Key` header with immediate async refresh execution.
- [ ] Configure CORS middleware, error handlers, and OpenAPI documentation tags.

## Phase 4: Frontend Development
- [ ] Design System & Styling:
  - CSS variables for Dark and Light themes.
  - Typography, clean borders, badges, button styles, accessible focus rings.
- [ ] State & API layer:
  - Typed API client (`services/api.ts`).
  - Custom hooks for contests, next contest, source status, timezone selection, and countdowns.
- [ ] UI Components:
  - `Header`: Logo, ThemeToggle, TimezoneSelector, RefreshButton.
  - `FreshnessBanner`: Last updated time, platform statuses.
  - `HeroNextContest`: Highlight the next contest with live ticking countdown.
  - `FilterBar`: Platform chips, Status tabs, Search input, View switch (List / Calendar).
  - `ContestList` & `ContestCard`: Visual badges, start time in user timezone, duration, countdown, direct contest link.
  - `ContestCalendar`: Interactive month view with day markers and contest popover/drawer.
  - `EmptyState` & `ErrorBanner`: Clean recovery and per-platform warning alerts.
- [ ] Accessibility & Responsiveness:
  - Semantic HTML, ARIA labels, keyboard navigation, mobile layout optimization without horizontal overflow.

## Phase 5: Verification & Testing
- [ ] Backend Test Suite (`pytest`):
  - Mock fixtures for Codeforces, CodeChef, LeetCode responses.
  - Collector parsing and validation unit tests.
  - Database upsert and deduplication tests.
  - Dynamic status calculation tests (upcoming, ongoing, completed).
  - API endpoint tests (filtering, sorting, pagination, error responses).
  - Admin refresh authorization and concurrency lock tests.
- [ ] Frontend Test Suite (`vitest`):
  - Component unit tests for ContestCard, Countdown, Timezone conversion, and filters.
- [ ] Production Build:
  - Vite production bundle generation (`npm run build`).
- [ ] End-to-End Live Integration:
  - Run backend and trigger live data sync.
  - Verify live contests populated in SQLite.
  - Run frontend connected to live backend.
  - Verify countdowns, timezones, and direct links.

## Phase 6: Documentation & Final Polish
- [ ] Generate comprehensive documentation:
  - `README.md` (quickstart, configuration, deployment, CDC integration).
  - `docs/API.md` (endpoint contracts, sample responses).
  - `docs/DATA_SOURCES.md` (upstream APIs, rate limits, limitations).
  - `docs/ARCHITECTURE.md` (data flow, storage model, extension guide).
  - `.env.example` with clear defaults.
- [ ] Complete Definition of Done checklist and provide final execution summary.
