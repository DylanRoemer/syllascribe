"""FastAPI application factory and configuration."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routes import upload, jobs, events, export
from .database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup (handles SQLite dev mode)."""
    # Import models so Base.metadata knows about them
    from . import models  # noqa: F401
    await init_db()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Syllascribe API",
        description="Upload syllabi, extract key dates, review, and export .ics files.",
        version="0.1.0",
        lifespan=lifespan,
    )

    origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(upload.router)
    app.include_router(jobs.router)
    app.include_router(events.router)
    app.include_router(export.router)

    @app.get("/api/health")
    async def health():
        return {"status": "ok"}

    return app


app = create_app()
