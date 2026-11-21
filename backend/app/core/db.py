"""Database engine and session handling shared by all modules."""

from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings


class Base(DeclarativeBase):
    """Base class for all ORM models. Alembic reads its metadata."""


def _enable_sqlite_foreign_keys(dbapi_connection: Any, _connection_record: Any) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def make_engine(url: str) -> AsyncEngine:
    """Create an async engine. SQLite (used in tests) gets one shared in-memory
    connection and foreign keys switched on for every connection."""
    if url.startswith("sqlite"):
        engine = create_async_engine(
            url,
            poolclass=StaticPool,
            connect_args={"check_same_thread": False},
        )
        event.listen(engine.sync_engine, "connect", _enable_sqlite_foreign_keys)
        return engine
    return create_async_engine(url, pool_pre_ping=True)


engine = make_engine(get_settings().DATABASE_URL)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency that yields one session per request."""
    async with SessionLocal() as session:
        yield session


def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    """FastAPI dependency for work that outlives the request (a generation job
    opens its own sessions with it). Tests override it with their own database."""
    return SessionLocal
