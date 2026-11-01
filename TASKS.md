# TASKS TRACKER: CODING CONTEST CALENDAR

## Legend
- `[ ]` Pending
- `[/]` In Progress
- `[x]` Completed

---

## 1. Environment & Setup
- [x] Inspect environment and verify prerequisites (Python 3.14, Node.js v24, npm 11)
- [x] Test live connections to Codeforces, CodeChef, and LeetCode
- [x] Author PROJECT_SPEC.md
- [x] Author IMPLEMENTATION_PLAN.md
- [x] Author TASKS.md
- [x] Create directory structure (`backend`, `frontend`, `docs`)
- [x] Initialize Python backend virtual environment and install dependencies
- [x] Initialize Vite React TypeScript frontend and install dependencies

## 2. Backend Storage & Collectors
- [x] Define SQLAlchemy database models (`Contest`, `PlatformHealth`)
- [x] Implement database session management and SQLite schema generation
- [x] Implement `BaseCollector` interface and schema validation
- [x] Implement `CodeforcesCollector` with live and mock support
- [x] Implement `CodeChefCollector` with live and mock support
- [x] Implement `LeetCodeCollector` with live and mock support
- [x] Implement `SyncService` with concurrency locking, retry backoff, and error isolation
- [x] Implement APScheduler background job integration

## 3. REST API Development
- [x] Define Pydantic request and response schemas with timezone validation
- [x] Implement `GET /api/v1/health`
- [x] Implement `GET /api/v1/contests` with filters, sorting, and pagination
- [x] Implement `GET /api/v1/contests/next`
- [x] Implement `GET /api/v1/contests/{contest_id}`
- [x] Implement `GET /api/v1/platforms`
- [x] Implement `GET /api/v1/sources/status`
- [x] Implement `POST /api/v1/admin/refresh` with API key security
- [x] Configure CORS, logging, and FastAPI exception handlers

## 4. Frontend Application
- [x] Establish design system tokens (Dark / Light themes, typography, layout)
- [x] Build API service client with TypeScript interfaces
- [x] Create Timezone context and selector (default: Asia/Kolkata)
- [x] Create live Countdown component (tab-suspension proof, zero drift)
- [x] Build Header with platform filters, theme toggle, and timezone selector
- [x] Build FreshnessBanner with sync indicator and manual refresh
- [x] Build Next Contest highlight banner
- [x] Build ContestCard and ContestList view
- [x] Build Interactive ContestCalendar monthly view
- [x] Build Error and Empty states with per-platform degradation alerts
- [x] Ensure mobile responsiveness and accessibility (WCAG AA, ARIA)

## 5. Testing & Verification
- [x] Write backend unit & integration tests (`pytest`):
  - [x] Collector response parsing
  - [x] Database upsert and deduplication
  - [x] Status calculation (upcoming / ongoing / completed)
  - [x] API endpoint filtering, sorting, pagination
  - [x] Admin auth and refresh locking
  - [x] Error isolation when a platform fails
- [x] Write frontend unit tests (`vitest`):
  - [x] ContestCard and Countdown rendering
  - [x] Filter and timezone interaction
- [x] Execute production frontend build (`npm run build`)
- [x] Run backend tests and verify 100% pass (24/24 passed)
- [x] Run frontend tests and verify 100% pass (8/8 passed)
- [x] Perform live end-to-end integration test with actual upstream data

## 6. Documentation & Packaging
- [x] Author `README.md` with complete installation and running guides
- [x] Author `docs/API.md` with endpoint documentation and examples
- [x] Author `docs/DATA_SOURCES.md` detailing upstream API specs and caveats
- [x] Author `docs/ARCHITECTURE.md` documenting CDC portal integration
- [x] Create `.env.example` with documented configuration options
- [x] Final project review against requirements

## 7. GeeksforGeeks (GFG) Platform Integration
- [x] Investigate GFG contest listings and live Practice events API (`practiceapi.geeksforgeeks.org/api/vr/events/`)
- [x] Implement `GFGCollector` adhering to `BaseCollector`:
  - [x] Filter strictly for `type == 3` (timed coding contests, excluding webinars & courses)
  - [x] Handle naive IST datetime strings and normalize to UTC
  - [x] Parse duration (`end_time - start_time`) and slug-based contest URLs
  - [x] Handle timeouts, network exceptions, and malformed JSON
  - [x] Preserve cached records on failure
  - [x] Prevent schedule fabrication (show 0 when 0 upcoming contests exist)
- [x] Register GFG in `SyncService` and `SUPPORTED_PLATFORMS` (`platform="gfg"`, label "GeeksforGeeks")
- [x] Frontend integration:
  - [x] Add `gfg` to `PlatformId` TypeScript union and update filter counts
  - [x] Add GeeksforGeeks segmented button and count badge in `FilterBar`
  - [x] Add CSS styling tokens for GFG badge (emerald/green `#34D399` / `#065F46`)
  - [x] Verify search, status filters, list view, calendar view, countdowns, timezone selection
- [x] Tests & Verification:
  - [x] Pytest collector unit tests (valid, malformed, timeout, missing fields)
  - [x] Pytest API filter and platform health tests
  - [x] Pytest platform failure isolation test
  - [x] Vitest FilterBar and ContestCard component tests
  - [x] Run pytest suite (29/29 tests passed)
  - [x] Run vitest suite (9/9 tests passed)
  - [x] Run frontend production build (`tsc && vite build` succeeded)
  - [x] Live end-to-end verification and visual screenshot capture
- [x] Documentation updates (`docs/DATA_SOURCES.md`, `docs/API.md`, `README.md`)

## 8. Mark as Completed Feature
- [x] Implement `useCompletedContests` hook:
  - [x] Persistent localStorage tracking with key `ccc_completed_contests`
  - [x] Stable contest identifier keys (`contest.id`)
  - [x] Safe JSON parsing with fallback for corrupted, missing, or non-array data
  - [x] Multi-tab state synchronization via `storage` event listener
  - [x] Preserve records if upstream contests disappear from live feed
- [x] Completion Checkbox & Interaction:
  - [x] Add clean check-circle toggle button to every contest card
  - [x] Unchecked: "Mark completed" (with accessible aria-label and title)
  - [x] Checked: "Completed" (with accessible aria-label and title)
  - [x] `stopPropagation()` preventing accidental navigation to official page
- [x] Status Filtering:
  - [x] Segmented status control: `All`, `Upcoming`, `Completed`
  - [x] Hide completed contests from the `Upcoming` view
  - [x] Show user-completed contests and ended contests in `Completed` view
  - [x] Unchecking in `Completed` view restores original upcoming status
  - [x] Dynamic filter count reflecting completed contests
- [x] Visual Design:
  - [x] Subtle emerald left border and status tag for completed cards
  - [x] Unique contest completion counter: `Completed: X of Y contests`
  - [x] Reset completions action button
  - [x] Calendar chip completion synchronization with checkmark toggle
- [x] Testing & Verification:
  - [x] Unit tests for `useCompletedContests` hook and storage fallback
  - [x] Unit tests for `ContestCard` completion toggle and accessibility
  - [x] Unit tests for `FilterBar` status filtering
  - [x] End-to-end integration tests for `App` (toggle, filter, reload persistence)
  - [x] Run Vitest suite: 19/19 tests passed
  - [x] Run Pytest suite: 29/29 tests passed
  - [x] Run frontend production build: `tsc && vite build` passed (0 errors)
  - [x] Visual verification via Puppeteer screenshot captures

## 9. Editorial Developer Tool Visual Redesign
- [x] Restrained Color System Overhaul:
  - [x] Background: `#0C1017`, Primary surface: `#141B26`, Elevated surface: `#1B2533`
  - [x] Primary text: `#F1F0EC`, Secondary text: `#929DAD`
  - [x] Coral accent: `#FF6B4A`, Borders: `#273140`, Success: `#65C9A5`
  - [x] Warm light theme: `#F6F5F0` background, `#FFFFFF` surfaces, `#12161F` charcoal text, `#DAD5C7` borders
- [x] Typography Hierarchy:
  - [x] Clean sans-serif system stack for headings and body
  - [x] Tabular monospace numbers (`JetBrains Mono`, `Fira Code`) for countdowns, durations, and timestamps
  - [x] Restrained weights (450–600) eliminating excessive uppercase and oversized hero text
- [x] Header Navigation:
  - [x] Compact 50px bar with refined `CC` monogram and `PRO` pill
  - [x] Streamlined timezone selector and clean icon theme toggle
  - [x] Subtle hairline border separator (`--border-subtle: #1C2432`)
- [x] Introduction & Schedule Summary:
  - [x] Confident, concise title (`Contest Schedule`) and understated supporting subtext
  - [x] Integrated active schedule summary statement
- [x] Compact Data Freshness Bar:
  - [x] Replaced card block with single-line horizontal status bar
  - [x] Live sync indicator, platform health dots (CF, CC, LC, GFG), and sync trigger
- [x] Next Contest Focal Hero:
  - [x] Coral left border accent on elevated `#141B26` surface
  - [x] Tabular monospace countdown ticker with muted labels
  - [x] High-contrast coral `"View contest"` link button with `ArrowUpRight` icon
- [x] Filter Toolbar:
  - [x] Compact platform tabs with subtle active pills
  - [x] Restrained segmented control for `All`, `Upcoming`, `Completed`
  - [x] Clean search input with embedded search icon
  - [x] List / Calendar view switchers
- [x] Completion Progress Track:
  - [x] Slim 3px progress track with emerald fill (`#65C9A5`)
  - [x] Restrained `Completed: X of Y contests` counter
- [x] Table-Like Contest Feed:
  - [x] Converted floating cards to unified `.contest-table-feed`
  - [x] 5 aligned columns: Checkbox, Platform Badge, Title & Timing Meta, Countdown, Direct Link
  - [x] 1px row separators with smooth hover highlight
- [x] Calendar View Alignment:
  - [x] Unified styling matching table feed
  - [x] Monospace weekday headers, hairline grid lines, and checkmark-synced contest pills
- [x] Verification & Documentation:
  - [x] Full Vitest suite: 19/19 tests passed
  - [x] Full Pytest suite: 29/29 tests passed
  - [x] Production build: 0 errors
  - [x] Verified screenshots: dark desktop, light desktop, calendar, mobile, completed view

## 10. Black + Purple + Emerald Green System Redesign
- [x] Color System Implementation:
  - [x] Near-black background: `--background: #0B0B0F`
  - [x] Charcoal surfaces: `--surface: #15151C`, `--surface-elevated: #1D1B25`, `--surface-hover: #24212E`
  - [x] Warm off-white typography: `--foreground: #F2F0F5`, `--muted-foreground: #9B97A8`
  - [x] Restrained violet accents: `--primary: #A970FF`, `--primary-hover: #BB91FF`, `--primary-soft: rgba(169, 112, 255, 0.12)`, `--secondary-accent: #C5A5FF`
  - [x] Emerald-green success states: `--success: #50D6A0`, `--success-soft: rgba(80, 214, 160, 0.10)`
  - [x] Thin subtle borders: `--border: #302B3A`, `--border-subtle: #24212C`
  - [x] Purge old orange and blue accent tokens across the application
- [x] Background & Atmosphere:
  - [x] Near-black background with subtle violet radial gradient (`rgba(169, 112, 255, 0.06)`) at the top viewport
- [x] Header:
  - [x] 50px compact bar with violet monogram logo `CC` and `ContestCal` wordmark
  - [x] Removed unnecessary `PRO` badge
  - [x] Preserved timezone select and theme toggle
- [x] Page Introduction & Platform Freshness:
  - [x] Concise heading and supporting sentence
  - [x] Emerald green dots (`#50D6A0`) for healthy platform indicators
- [x] Next Contest Focal Hero:
  - [x] Charcoal surface with thin violet left border (`#A970FF`)
  - [x] Restrained emerald green indicator dot (`#50D6A0`)
  - [x] Prominent tabular monospace countdown
  - [x] Violet primary action button (`#A970FF`) with hover state (`#BB91FF`)
- [x] Filters & Toolbar:
  - [x] Subtle purple background (`rgba(169, 112, 255, 0.12)`) and violet text for selected platform and status filters
  - [x] Monochromatic neutral platform badges free of neon orange/blue
  - [x] Focus states with visible violet outline (`0 0 0 2px rgba(169, 112, 255, 0.35)`)
- [x] Contest List & Rows:
  - [x] Linear-inspired rows with subtle separators (`#24212C`) and restrained hover (`#24212E`)
  - [x] Long contest names wrap gracefully without clipping
  - [x] Subtle circular check control with emerald green checked state
  - [x] Restrained emerald green left border for completed rows
- [x] Countdowns & Calendar:
  - [x] Monospace tabular numerals for countdowns in off-white/violet
  - [x] Calendar grid with near-black surface, violet current day, and green completed checkmarks
- [x] Light Theme:
  - [x] Warm off-white background (`#F8F7FA`), white surfaces (`#FFFFFF`), charcoal text (`#181520`), muted lavender accents (`#8645E8`), emerald green success (`#0DA56E`)
- [x] Testing & Verification:
  - [x] Vitest suite: 19/19 tests passed
  - [x] Pytest suite: 29/29 tests passed
  - [x] Production build: 0 errors
  - [x] Captured Puppeteer screenshots for dark desktop, light desktop, calendar, mobile, and completed filters
