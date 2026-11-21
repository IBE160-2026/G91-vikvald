"""Shared test fixtures: in-memory SQLite (aiosqlite + StaticPool) instead of Postgres."""

import os

# Tests must never reach a real model provider. Set before the app (and its
# settings) is imported, so a value from the shell or a .env file cannot win.
os.environ["LLM_PROVIDER"] = "mock"

from collections.abc import AsyncIterator, Iterator  # noqa: E402

import pytest  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.core.db import Base, get_session, make_engine  # noqa: E402
from app.main import app  # noqa: E402
from app.modules.identity import models as _identity_models  # noqa: E402, F401  (registers users)
from app.modules.subjects import models as _subjects_models  # noqa: E402, F401  (registers subjects)

TEST_DATABASE_URL = "sqlite+aiosqlite://"


@pytest.fixture(autouse=True)
def fresh_settings() -> Iterator[None]:
    """Settings are cached. Clear the cache around every test, so a test that
    changes the environment with monkeypatch gets (and leaves) fresh settings."""
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
async def engine() -> AsyncIterator[AsyncEngine]:
    test_engine = make_engine(TEST_DATABASE_URL)
    # Tables straight from the models (the migrations have their own test).
    async with test_engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
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
