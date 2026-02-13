"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://syllascribe:syllascribe@localhost:5432/syllascribe"
    DATABASE_URL_SYNC: str = "postgresql://syllascribe:syllascribe@localhost:5432/syllascribe"
    REDIS_URL: str = "redis://localhost:6379/0"
    UPLOAD_DIR: str = "../../data/uploads"
    USE_LLM_CLASSIFIER: bool = False
    LLM_PROVIDER: str = "openai"
    LLM_API_KEY: str = ""
    UPLOAD_RETENTION_HOURS: int = 168

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
