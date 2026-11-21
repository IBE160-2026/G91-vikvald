"""Terms: users.terms_accepted_at, POST /api/identity/terms and the
TERMS_NOT_ACCEPTED check on upload (FR-11, AR-6)."""

import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from pathlib import Path

from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.modules.identity.models import User
from app.modules.identity.service import accept_terms
from tests.test_files import LECTURES, _assert_nothing_stored, _new_lecture, _upload, make_pdf
from tests.test_lectures import _create_lecture, _new_subject
from tests.test_subjects import NOT_FOUND, _code
from tests.test_subjects import _log_in_new_user as _log_in_without_terms

ME = "/api/identity/me"
TERMS = "/api/identity/terms"


def _parse(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


async def test_fr11_ny_bruker_har_ikke_godtatt_vilkaarene(client: AsyncClient) -> None:
    await _log_in_without_terms(client)
    response = await client.get(ME)
    assert response.status_code == 200
    assert response.json()["terms_accepted_at"] is None


async def test_fr11_godta_setter_tidspunktet_til_naa_i_utc(client: AsyncClient) -> None:
    user_id = await _log_in_without_terms(client)
    before = datetime.now(UTC)

    response = await client.post(TERMS)

    after = datetime.now(UTC)
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"id", "email", "terms_accepted_at"}
    assert body["id"] == user_id
    assert body["terms_accepted_at"].endswith(("Z", "+00:00"))
    accepted = _parse(body["terms_accepted_at"])
    assert before - timedelta(seconds=1) <= accepted <= after + timedelta(seconds=1)
    me = await client.get(ME)
    assert me.json()["terms_accepted_at"] == body["terms_accepted_at"]


async def test_fr11_godta_igjen_beholder_det_foerste_tidspunktet(
    client: AsyncClient, engine: AsyncEngine
) -> None:
    user_id = await _log_in_without_terms(client)
    await client.post(TERMS)
    # Move the stored time back, as if the first acceptance was long ago.
    long_ago = datetime(2026, 9, 1, 8, 30, tzinfo=UTC)
    async with async_sessionmaker(engine)() as session:
        await session.execute(
            update(User).where(User.id == uuid.UUID(user_id)).values(terms_accepted_at=long_ago)
        )
        await session.commit()

    again = await client.post(TERMS)

    assert again.status_code == 200
    assert _parse(again.json()["terms_accepted_at"]) == long_ago
    assert _parse((await client.get(ME)).json()["terms_accepted_at"]) == long_ago


async def test_fr11_godta_med_utdatert_bruker_overskriver_ikke(
    client: AsyncClient, engine: AsyncEngine
) -> None:
    # Two calls at the same time: both loaded the user while the field was empty.
    # The conditional UPDATE lets only the first one write.
    user_id = uuid.UUID(await _log_in_without_terms(client))
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as first_session, maker() as second_session:
        first = await first_session.get(User, user_id)
        second = await second_session.get(User, user_id)
        assert first is not None and second is not None
        assert first.terms_accepted_at is None and second.terms_accepted_at is None

        winner = await accept_terms(first_session, first)
        loser = await accept_terms(second_session, second)

    assert winner.terms_accepted_at is not None
    assert loser.terms_accepted_at == winner.terms_accepted_at


async def test_fr11_godta_krever_innlogging(client: AsyncClient) -> None:
    client.cookies.clear()
    response = await client.post(TERMS)
    assert response.status_code == 401
    assert _code(response) == "UNAUTHENTICATED"


async def test_ar6_opplasting_uten_vilkaar_avvises_og_ingenting_lagres(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path
) -> None:
    await _log_in_without_terms(client)
    lecture_id = await _new_lecture(client)

    response = await _upload(client, lecture_id, make_pdf(["Side én"]))

    assert response.status_code == 403
    assert response.json() == {"error": {"code": "TERMS_NOT_ACCEPTED", "details": {}}}
    await _assert_nothing_stored(engine, upload_dir)
    listed = await client.get(f"{LECTURES}/{lecture_id}/files")
    assert listed.json() == []


async def test_ar6_vilkaarene_sjekkes_foer_kroppen_leses(client: AsyncClient) -> None:
    await _log_in_without_terms(client)
    lecture_id = await _new_lecture(client)
    read = False

    async def body() -> AsyncIterator[bytes]:
        nonlocal read
        read = True
        yield b"x"

    response = await client.post(
        f"{LECTURES}/{lecture_id}/files",
        content=body(),
        headers={"Content-Type": "multipart/form-data; boundary=x"},
    )
    assert response.status_code == 403
    assert _code(response) == "TERMS_NOT_ACCEPTED"
    assert read is False


async def test_ar6_opplasting_etter_vilkaar_godtas(client: AsyncClient) -> None:
    await _log_in_without_terms(client)
    lecture_id = await _new_lecture(client)
    assert (await _upload(client, lecture_id, make_pdf(["Side én"]))).status_code == 403

    await client.post(TERMS)
    response = await _upload(client, lecture_id, make_pdf(["Side én"]))

    assert response.status_code == 201
    assert response.json()["page_count"] == 1


async def test_ar6_andres_forelesning_gir_404_foer_vilkaarsjekken(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path
) -> None:
    await _log_in_without_terms(client, "ola@eksempel.no")
    olas_lecture = (await _create_lecture(client, await _new_subject(client))).json()["id"]

    await _log_in_without_terms(client, "klara@eksempel.no")
    for lecture_id in [olas_lecture, str(uuid.uuid4())]:
        response = await _upload(client, lecture_id, make_pdf(["Klaras notat"]))
        assert (response.status_code, response.json()) == (404, NOT_FOUND)
    await _assert_nothing_stored(engine, upload_dir)
