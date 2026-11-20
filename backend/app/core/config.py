"""Application settings, read from the environment (and an optional .env file)."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


# The repo-root .env (as README describes), then a .env in the working directory.
REPO_ROOT_ENV = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT_ENV, ".env"), env_file_encoding="utf-8", extra="ignore"
    )

    # "local" means demo/development mode on the developer's own machine.
    APP_ENV: str = "local"
    # Default points at the database container published on localhost in dev mode.
    # docker-compose.yml overrides it to reach the "db" service inside Docker.
    DATABASE_URL: str = "postgresql+asyncpg://studiekamerat:studiekamerat@localhost:5432/studiekamerat"


@lru_cache
def get_settings() -> Settings:
    return Settings()
