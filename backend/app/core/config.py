"""Application settings, read from the environment (and an optional .env file)."""

import logging
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, ValidationError, ValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# The repo-root .env (as README describes), then a .env in the working directory.
REPO_ROOT_ENV = Path(__file__).resolve().parents[3] / ".env"

# Providers that only use built-in fake answers (no key, works offline).
DEMO_PROVIDERS = ("mock", "mock-invalid")

# Signing key for login cookies when APP_ENV=local (demo and development on your own
# machine). Public on purpose, so it is refused in every other environment.
LOCAL_JWT_SECRET = "local-only-jwt-secret-do-not-use-in-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT_ENV, ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        # An empty value (e.g. "FEATURE_SUMMARY=") means the default, as in Docker Compose.
        env_ignore_empty=True,
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
    # Key that signs the login cookie (HS256). Has a default only when APP_ENV=local.
    JWT_SECRET: str = Field(default=None, validate_default=True)

    @field_validator("JWT_SECRET", mode="before")
    @classmethod
    def _jwt_secret_for_environment(cls, value: object, info: ValidationInfo) -> object:
        # The messages never contain the value: get_settings() logs them on failure.
        if info.data.get("APP_ENV") == "local":
            return LOCAL_JWT_SECRET if value is None else value
        if value is None:
            raise ValueError("must be set when APP_ENV is not 'local'")
        if value == LOCAL_JWT_SECRET:
            raise ValueError("must not be the local default when APP_ENV is not 'local'")
        return value

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
