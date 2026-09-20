from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """App configuration loaded from environment variables / .env file."""

    DATABASE_URL: str = "sqlite:///./tickets.db"
    SEED_DEMO: bool = False
    CORS_ORIGINS: str = ""  # comma-separated origins, e.g. "http://localhost:5173"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def cors_origin_list(self) -> list[str]:
        if not self.CORS_ORIGINS:
            return []
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
