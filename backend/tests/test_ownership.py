"""get_owned: a student only reaches her own rows (FR-4, AR-2)."""

import uuid
from collections.abc import AsyncIterator
from typing import Annotated

import pytest
from fastapi import APIRouter, Depends
from httpx import ASGITransport, AsyncClient
from sqlalchemy import Uuid
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.db import get_session
from app.core.errors import AppError, ErrorCode
from app.core.ownership import get_owned
from app.main import create_app


class OwnedTestBase(DeclarativeBase):
    """Separate from app.core.db.Base, so the migration test does not see this table."""


class Thing(OwnedTestBase):
    __tablename__ = "test_owned_things"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)


KLARA = uuid.uuid4()
OLA = uuid.uuid4()
NOT_FOUND = {"error": {"code": "NOT_FOUND", "details": {}}}


@pytest.fixture
async def things(engine: AsyncEngine) -> dict[str, uuid.UUID]:
    async with engine.begin() as connection:
        await connection.run_sync(OwnedTestBase.metadata.create_all)
    klara_thing = Thing(user_id=KLARA)
    ola_thing = Thing(user_id=OLA)
    async with async_sessionmaker(engine, expire_on_commit=False)() as session:
        session.add_all([klara_thing, ola_thing])
        await session.commit()
    return {"klara": klara_thing.id, "ola": ola_thing.id}


async def test_fr4_egen_rad_hentes(session: AsyncSession, things: dict[str, uuid.UUID]) -> None:
    row = await get_owned(session, Thing, things["klara"], KLARA)
    assert row.id == things["klara"]
    assert row.user_id == KLARA


@pytest.mark.parametrize("case", ["andres-rad", "ukjent-id"])
async def test_fr4_andres_rad_og_ukjent_id_gir_not_found(
    session: AsyncSession, things: dict[str, uuid.UUID], case: str
) -> None:
    row_id = things["ola"] if case == "andres-rad" else uuid.uuid4()
    with pytest.raises(AppError) as raised:
        await get_owned(session, Thing, row_id, KLARA)
    assert raised.value.code == ErrorCode.NOT_FOUND
    assert raised.value.status_code == 404
    assert raised.value.details == {}


@pytest.fixture
async def thing_client(engine: AsyncEngine) -> AsyncIterator[AsyncClient]:
    """An app with one test route that reads a Thing as Klara."""
    test_app = create_app()
    router = APIRouter()

    @router.get("/api/test-things/{thing_id}")
    async def read_thing(
        thing_id: uuid.UUID, session: Annotated[AsyncSession, Depends(get_session)]
    ) -> dict[str, str]:
        thing = await get_owned(session, Thing, thing_id, KLARA)
        return {"id": str(thing.id)}

    test_app.include_router(router)
    test_sessionmaker = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_session() -> AsyncIterator[AsyncSession]:
        async with test_sessionmaker() as test_session:
            yield test_session

    test_app.dependency_overrides[get_session] = override_get_session
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as client:
        yield client


async def test_fr4_andres_rad_gir_404(thing_client: AsyncClient, things: dict[str, uuid.UUID]) -> None:
    own = await thing_client.get(f"/api/test-things/{things['klara']}")
    assert own.status_code == 200
    assert own.json() == {"id": str(things["klara"])}

    others = await thing_client.get(f"/api/test-things/{things['ola']}")
    unknown = await thing_client.get(f"/api/test-things/{uuid.uuid4()}")
    assert others.status_code == unknown.status_code == 404
    assert others.json() == unknown.json() == NOT_FOUND
    # Byte for byte the same, headers included: nothing tells the two apart.
    assert others.content == unknown.content
    assert dict(others.headers) == dict(unknown.headers)
