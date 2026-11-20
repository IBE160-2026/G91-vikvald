"""FastAPI application entry point."""

import logging
import sys

from fastapi import FastAPI

from app.core.health import router as health_router

# When started by Uvicorn, app/core/logging.json configures logging. This fallback
# makes sure app logs also reach stdout in other setups (e.g. `uvicorn --reload`).
if not logging.getLogger().handlers:
    logging.basicConfig(
        stream=sys.stdout,
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

app = FastAPI(title="Studiekamerat API")

app.include_router(health_router)
