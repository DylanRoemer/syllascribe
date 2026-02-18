"""Application configuration loaded from environment variables."""

import os
from pydantic_settings import BaseSettings

# Resolve a stable absolute path for the SQLite DB file (next to the api service dir)
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_DEFAULT_SQLITE_PATH = os.path.join(_THIS_DIR, "..", "..", "..", "data", "syllascribe.db")
_DEFAULT_SQLITE_PATH = os.path.abspath(_DEFAULT_SQLITE_PATH)


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


settings = Settings()
