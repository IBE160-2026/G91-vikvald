import logging
from collections.abc import AsyncIterator

import pytest

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.main import app


async def test_nfr1_health_svarer_ok(client: AsyncClient) -> None:
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


class _BrokenSession:
    async def execute(self, *_args: object, **_kwargs: object) -> None:
        raise ConnectionRefusedError("database is down")


async def test_nfr1_health_gir_503_naar_databasen_er_nede(
    client: AsyncClient, caplog: pytest.LogCaptureFixture
) -> None:
    async def broken_session() -> AsyncIterator[AsyncSession]:
        yield _BrokenSession()  # type: ignore[misc]

    app.dependency_overrides[get_session] = broken_session
    response = await client.get("/api/health")
    assert response.status_code == 503
    assert response.json() == {"error": {"code": "DATABASE_UNAVAILABLE", "details": {}}}
    assert "database is down" not in response.text
    errors = [
        record
        for record in caplog.records
        if record.name == "app.core.health" and record.levelno == logging.ERROR
    ]
    assert errors and errors[0].exc_info is not None
