"""FastAPI application factory and configuration."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import upload, jobs, events, export


def create_app() -> FastAPI:
    app = FastAPI(
        title="Syllascribe API",
        description="Upload syllabi, extract key dates, review, and export .ics files.",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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
