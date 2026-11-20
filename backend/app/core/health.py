"""Health check: answers 200 only when the database can be reached."""

import logging

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/health")
async def health(session: AsyncSession = Depends(get_session)) -> JSONResponse:
    try:
        await session.execute(text("SELECT 1"))
    except Exception:
        # Log the cause to stdout, but never send it (or a stack trace) to the client.
        logger.exception("Health check failed: database unavailable")
        return JSONResponse(
            status_code=503,
            content={"error": {"code": "DATABASE_UNAVAILABLE", "details": {}}},
        )
    return JSONResponse(status_code=200, content={"status": "ok"})
