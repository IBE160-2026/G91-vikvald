"""Shared test fixtures: in-memory SQLite (aiosqlite + StaticPool) instead of Postgres."""

from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.core.db import get_session, make_engine
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite://"


@pytest.fixture
async def engine() -> AsyncIterator[AsyncEngine]:
    test_engine = make_engine(TEST_DATABASE_URL)
    yield test_engine
    await test_engine.dispose()


@pytest.fixture
async def session(engine: AsyncEngine) -> AsyncIterator[AsyncSession]:
    async with async_sessionmaker(engine, expire_on_commit=False)() as test_session:
        yield test_session


@pytest.fixture
async def client(engine: AsyncEngine) -> AsyncIterator[AsyncClient]:
    test_sessionmaker = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_session() -> AsyncIterator[AsyncSession]:
        async with test_sessionmaker() as test_session:
            yield test_session

    app.dependency_overrides[get_session] = override_get_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as test_client:
        yield test_client
    app.dependency_overrides.clear()
