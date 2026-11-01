# Coding Contest Calendar

A unified, developer-centric competitive programming contest aggregator and calendar. It tracks upcoming, ongoing, and completed contests across **LeetCode**, **CodeChef**, **Codeforces**, and **GeeksforGeeks**, normalizes schedules into standard UTC timestamps, and serves them through a high-performance REST API and a responsive React web interface.

Built as an independent standalone system designed for seamless future integration into an institutional **Career Development Cell (CDC) Portal**.

---

## Features

- **Live Aggregation**: Live collection from Codeforces, CodeChef, LeetCode, and GeeksforGeeks upstream APIs.
- **Personal Contest Completion Tracking**: LocalStorage-backed "Mark as Completed" tracking with zero account requirement. Includes dedicated `All`, `Upcoming`, and `Completed` status filtering, real-time completion progress tracking (`Completed: X of Y contests`), and two-way list and calendar synchronization.
- **Accurate Timezone Display**: Automatic conversion to the user's chosen timezone (defaults to **Asia/Kolkata / IST**; supports UTC, EST, PST, CET, JST, etc.).
- **Live Countdowns**: Real-time ticker with automatic re-synchronization when returning from browser tab suspension or backgrounding.
- **Black + Purple + Emerald Green Developer Tool Aesthetic**: Near-black background (`#0B0B0F`), charcoal surfaces (`#15151C`, `#1D1B25`), restrained violet accents (`#A970FF`, `#BB91FF`, `rgba(169, 112, 255, 0.12)`), emerald-green success indicators (`#50D6A0`), subtle borders (`#302B3A`, `#24212C`), and warm light theme (`#F8F7FA`), typography-driven hierarchy with tabular monospace numerals for all countdowns and timestamps.
- **Dual Visual Modes**:
  - **Table-Feed List View**: Streamlined table-style feed replacing floating cards, featuring 5 aligned columns (completion toggle, platform badge, title & schedule metadata, live countdown, and direct contest link) with hairline dividers and smooth row highlights.
  - **Interactive Month Calendar View**: Clean month grid with color-coded contest pills mapped accurately to the selected timezone and synchronized completion states.
- **Robust Background Sync**: Lightweight automated sync via APScheduler every 30 minutes with concurrency lock protection.
- **Fault-Tolerant Cache**: Upstream failure on one platform does not affect others or delete existing cached records.
- **Integration-Ready API**: Clean OpenAPI 3.0 documented REST API (`/api/v1`) with server-side filtering, sorting, and pagination.
- **Zero Fabricated Data**: Exposes real, live contest data from verified sources with clear empty and degraded states.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Modern CSS tokens, Lucide React |
| **Backend** | Python 3.10+, FastAPI, Pydantic v2, HTTPX, SQLAlchemy 2.0, APScheduler |
| **Storage** | SQLite (Thread-safe, connection-pooled, modular for PostgreSQL) |
| **Testing** | Pytest, Pytest-Asyncio, Vitest, React Testing Library |

---

## Project Structure

```
coding-contest-calendar/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers and endpoint handlers
│   │   ├── collectors/   # Codeforces, CodeChef, LeetCode, GFG collectors
│   │   ├── core/         # Pydantic configuration and settings
│   │   ├── db/           # SQLAlchemy session, engine, declarative base
│   │   ├── models/       # Database ORM models (Contest, PlatformHealth)
│   │   ├── schemas/      # Pydantic validation and response schemas
│   │   ├── services/     # Sync service, background APScheduler
│   │   └── main.py       # FastAPI application entrypoint and lifespan
│   ├── tests/            # Pytest test suite (collectors, models, API)
│   ├── .env.example      # Example backend environment variables
│   ├── pytest.ini        # Pytest configuration
│   └── requirements.txt  # Python package dependencies
├── frontend/
│   ├── src/
│   │   ├── components/   # Header, FreshnessBanner, Hero, FilterBar, ContestCard, ContestCalendar
│   │   ├── hooks/        # useCountdown, useTimezone, useTheme
│   │   ├── services/     # Typed API client
│   │   ├── styles/       # CSS variables (Dark/Light themes), responsive layout
│   │   ├── test/         # Vitest unit and component tests
│   │   ├── types/        # TypeScript interfaces
│   │   ├── utils/        # Date formatting and countdown math
│   │   ├── App.tsx       # Root React component
│   │   └── main.tsx      # React DOM entrypoint
│   ├── index.html        # HTML template
│   ├── package.json      # Node.js dependencies
│   ├── tsconfig.json     # TypeScript configuration
│   └── vite.config.ts    # Vite bundler and test configuration
├── docs/
│   ├── API.md            # Comprehensive REST API contracts
│   ├── DATA_SOURCES.md   # Upstream platform API analysis and limitations
│   └── ARCHITECTURE.md   # Data flow, storage, and CDC integration guide
├── PROJECT_SPEC.md       # Product and technical specifications
├── IMPLEMENTATION_PLAN.md# Engineering execution phases
├── TASKS.md              # Task tracking and definition of done
└── README.md             # Master documentation
```

---

## Getting Started

### Prerequisites
- **Python**: Version 3.10 or higher (Tested with Python 3.14)
- **Node.js**: Version 18 or higher (Tested with Node.js v24 & npm 11)

---

### Backend Setup

#### 1. Navigate to backend and create virtual environment:
**Windows (PowerShell):**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**macOS / Linux:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### 2. Configure Environment:
```powershell
Copy-Item .env.example .env
```
*(On macOS/Linux: `cp .env.example .env`)*

#### 3. Run Backend Server:
```powershell
# From backend/ directory with venv activated:
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend initializes the SQLite database (`contests.db`), starts the background scheduler, and performs an initial upstream sync.

- **API Base**: `http://localhost:8000/api/v1`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **Redoc Docs**: `http://localhost:8000/redoc`

---

### Frontend Setup

#### 1. Navigate to frontend and install dependencies:
```powershell
cd frontend
npm install
```

#### 2. Start Vite Development Server:
```powershell
npm run dev
```
Open your browser to: **`http://localhost:5173`**

*(API calls are automatically proxied from Vite to `http://127.0.0.1:8000` via `vite.config.ts`)*

#### 3. Production Frontend Build:
```powershell
npm run build
```

---

## Running Automated Tests

### Backend Test Suite (Pytest)
Runs 29 automated unit and integration tests covering response parsing, duration conversion, timezone handling, SQLite deduplication, cache preservation, API query filtering, GFG collector edge cases, and admin authentication:
```powershell
cd backend
.\venv\Scripts\python -m pytest -v
```

### Frontend Test Suite (Vitest)
Runs 19 automated component, utility, hook, and integration tests covering timezone formatting, live countdown calculations, accessible button labeling, GFG badges, completion state tracking, localStorage fault tolerance, and list-calendar synchronization:
```powershell
cd frontend
npm test
```

---

## Data Freshness & Manual Refresh

- **Scheduled Refresh**: By default, APScheduler triggers synchronization every 30 minutes (`REFRESH_INTERVAL_MINUTES=30`).
- **Web UI Refresh**: Click the **"Refresh Sources"** button in the data freshness banner.
- **Admin API Refresh**:
  ```bash
  curl -X POST http://localhost:8000/api/v1/admin/refresh \
       -H "X-Admin-Key: dev-admin-secret-key-change-in-prod"
  ```

---

## Career Development Cell (CDC) Integration

This application was engineered with a modular storage layer and REST interface to enable easy future integration into an institutional CDC portal:
1. **Consume the API directly**: Query `GET /api/v1/contests?status=upcoming` from the CDC portal backend to display coding contest alerts to students.
2. **Next Contest Widget**: Use `GET /api/v1/contests/next` to display a single countdown badge on the student portal home page.
3. **PostgreSQL Migration**: Swap `DATABASE_URL` in `.env` to point to the institutional PostgreSQL cluster without modifying codebase logic.
4. **CORS Flexibility**: Add the CDC portal domain to `CORS_ORIGINS` in `.env`.

See [`docs/ARCHITECTURE.md`](file:///C:/Users/fija/.gemini/antigravity/scratch/coding-contest-calendar/docs/ARCHITECTURE.md) for full architectural blueprints.

---

## License
MIT License. Built for educational and institutional competitive programming tracking.
