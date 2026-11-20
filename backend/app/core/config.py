"""Application settings, read from the environment (and an optional .env file)."""

import logging
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# The repo-root .env (as README describes), then a .env in the working directory.
REPO_ROOT_ENV = Path(__file__).resolve().parents[3] / ".env"

# Providers that only use built-in fake answers (no key, works offline).
DEMO_PROVIDERS = ("mock", "mock-invalid")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT_ENV, ".env"), env_file_encoding="utf-8", extra="ignore"
    )

    # "local" means demo/development mode on the developer's own machine.
    APP_ENV: str = "local"
    # Default points at the database container published on localhost in dev mode.
    # docker-compose.yml overrides it to reach the "db" service inside Docker.
    DATABASE_URL: str = "postgresql+asyncpg://studiekamerat:studiekamerat@localhost:5432/studiekamerat"
    # Which model provider to use. "mock" and "mock-invalid" are demo mode.
    LLM_PROVIDER: Literal["mock", "mock-invalid", "vertex"] = "mock"
    # Switches for the should-have features. Off means their routes answer 404 FEATURE_DISABLED.
    FEATURE_MNEMONICS: bool = True
    FEATURE_FREETEXT: bool = True
    FEATURE_SUMMARY: bool = True

    @property
    def demo_mode(self) -> bool:
        return self.LLM_PROVIDER in DEMO_PROVIDERS


@lru_cache
def get_settings() -> Settings:
    try:
        return Settings()
    except ValidationError as exc:
        # get_settings() runs at import time (core/db.py, Alembic), so an invalid
        # setting stops the process here. Log the setting's name and what is
        # allowed, never the value itself: later settings may be secret.
        for error in exc.errors(include_input=False):
            name = ".".join(str(part) for part in error["loc"])
            logger.critical("Invalid setting %s: %s", name, error["msg"])
        raise SystemExit(1) from None
