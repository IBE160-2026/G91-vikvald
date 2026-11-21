"""FastAPI application entry point."""

import logging
import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import get_settings
from app.core.db import get_sessionmaker
from app.core.errors import install_error_handlers
from app.core.health import router as health_router
from app.core.public_config import router as public_config_router
from app.modules.content.router import lectures_router as content_lectures_router
from app.modules.files.router import account_router, files_router
from app.modules.files.router import lectures_router as files_lectures_router
from app.modules.files.router import subjects_router as files_subjects_router
from app.modules.generation.providers import UnsupportedProviderError, select_generator
from app.modules.generation.router import lectures_router as generation_lectures_router
from app.modules.generation.service import fail_interrupted_jobs
from app.modules.identity.router import router as identity_router
from app.modules.subjects.router import lectures_router
from app.modules.subjects.router import router as subjects_router

# When started by Uvicorn, app/core/logging.json configures logging. This fallback
# makes sure app logs also reach stdout in other setups (e.g. `uvicorn --reload`).
if not logging.getLogger().handlers:
    logging.basicConfig(
        stream=sys.stdout,
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Runs in the Uvicorn process before the first request (AR-14: migrations
    and seed run before this in start.sh; then this; then requests).

    1. The model provider must be one that exists; otherwise the startup stops.
    2. Jobs left running by a restart become failed (JOB_INTERRUPTED).
    """
    try:
        select_generator(get_settings().LLM_PROVIDER)
    except UnsupportedProviderError as exc:
        logger.critical("%s", exc)
        raise
    # Tests give the app their own database through dependency_overrides.
    sessionmaker = app.dependency_overrides.get(get_sessionmaker, get_sessionmaker)()
    await fail_interrupted_jobs(sessionmaker)
    yield


def create_app() -> FastAPI:
    """Build the app. Tests use this to make an app with extra test-only routes."""
    app = FastAPI(title="Studiekamerat API", lifespan=lifespan)
    install_error_handlers(app)
    app.include_router(health_router)
    app.include_router(public_config_router)
    app.include_router(identity_router)
    app.include_router(subjects_router)
    app.include_router(lectures_router)
    app.include_router(files_lectures_router)
    app.include_router(files_subjects_router)
    app.include_router(files_router)
    app.include_router(account_router)
    app.include_router(generation_lectures_router)
    app.include_router(content_lectures_router)
    return app


app = create_app()
