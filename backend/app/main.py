import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.db.session import engine, Base
from app.api.endpoints import router as api_router
from app.services.scheduler import start_scheduler, shutdown_scheduler
from app.services.sync_service import sync_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("contest_calendar")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    # Start background scheduler
    logger.info("Starting background scheduler...")
    start_scheduler()

    # Launch initial sync in background
    asyncio.create_task(sync_service.sync_all())

    yield

    # Shutdown
    logger.info("Shutting down background scheduler...")
    shutdown_scheduler()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Unified API aggregating coding contests from LeetCode, CodeChef, and Codeforces.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", include_in_schema=False)
def root_redirect():
    """Redirect root path to interactive OpenAPI documentation."""
    return RedirectResponse(url="/docs")
