"""Health check: answers 200 only when the database can be reached."""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.errors import AppError, ErrorCode

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/health")
async def health(session: AsyncSession = Depends(get_session)) -> dict[str, str]:
    try:
        await session.execute(text("SELECT 1"))
    except Exception:
        # Log the cause to stdout, but never send it (or a stack trace) to the client.
        logger.exception("Health check failed: database unavailable")
        raise AppError(ErrorCode.DATABASE_UNAVAILABLE) from None
    return {"status": "ok"}
