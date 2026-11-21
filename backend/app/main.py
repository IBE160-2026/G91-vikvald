"""FastAPI application entry point."""

import logging
import sys

from fastapi import FastAPI

from app.core.errors import install_error_handlers
from app.core.health import router as health_router
from app.core.public_config import router as public_config_router
from app.modules.files.router import lectures_router as files_lectures_router
from app.modules.files.router import subjects_router as files_subjects_router
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


def create_app() -> FastAPI:
    """Build the app. Tests use this to make an app with extra test-only routes."""
    app = FastAPI(title="Studiekamerat API")
    install_error_handlers(app)
    app.include_router(health_router)
    app.include_router(public_config_router)
    app.include_router(identity_router)
    app.include_router(subjects_router)
    app.include_router(lectures_router)
    app.include_router(files_lectures_router)
    app.include_router(files_subjects_router)
    return app


app = create_app()
