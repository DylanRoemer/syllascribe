"""Application configuration loaded from environment variables."""

import os
import sys
from pydantic import model_validator
from pydantic_settings import BaseSettings

# Resolve a stable absolute path for the SQLite DB file (next to the api service dir)
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_DEFAULT_SQLITE_PATH = os.path.join(_THIS_DIR, "..", "..", "..", "data", "syllascribe.db")
_DEFAULT_SQLITE_PATH = os.path.abspath(_DEFAULT_SQLITE_PATH)


def _fail_if_placeholder_url(name: str, value: str) -> None:
    """Exit with clear instructions if value looks like a placeholder (e.g. @host:)."""
    if value and "@host:" in value:
        print(
            f"ERROR: {name} looks like a placeholder (hostname 'host'). "
            "On Railway, set it via Add Reference → Postgres (e.g. DATABASE_URL / DATABASE_URL_SYNC).",
            file=sys.stderr,
        )
        sys.exit(1)


class Settings(BaseSettings):
    DATABASE_URL: str = f"sqlite+aiosqlite:///{_DEFAULT_SQLITE_PATH}"
    DATABASE_URL_SYNC: str = f"sqlite:///{_DEFAULT_SQLITE_PATH}"
    REDIS_URL: str = "redis://localhost:6379/0"
    UPLOAD_DIR: str = "../../data/uploads"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    USE_LLM_CLASSIFIER: bool = False
    LLM_PROVIDER: str = "openai"
    LLM_API_KEY: str = ""
    UPLOAD_RETENTION_HOURS: int = 168

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @model_validator(mode="after")
    def ensure_async_database_url(self: "Settings") -> "Settings":
        """Use async driver for Postgres; Railway exposes postgresql:// so convert once."""
        url = self.DATABASE_URL
        if url.startswith("postgresql://") and "asyncpg" not in url:
            return self.model_copy(
                update={"DATABASE_URL": url.replace("postgresql://", "postgresql+asyncpg://", 1)}
            )
        return self

    @model_validator(mode="after")
    def derive_sync_url_from_database_url(self: "Settings") -> "Settings":
        """When only DATABASE_URL is set (e.g. Railway Add Reference → Postgres), use it for sync too."""
        if not self.DATABASE_URL.startswith("postgresql"):
            return self
        # If DATABASE_URL_SYNC is still SQLite default, derive from DATABASE_URL so one Reference fills both
        if self.DATABASE_URL_SYNC.startswith("sqlite://"):
            sync_url = self.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://", 1)
            return self.model_copy(update={"DATABASE_URL_SYNC": sync_url})
        return self


settings = Settings()
_fail_if_placeholder_url("DATABASE_URL", settings.DATABASE_URL)
_fail_if_placeholder_url("DATABASE_URL_SYNC", settings.DATABASE_URL_SYNC)
