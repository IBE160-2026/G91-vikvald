"""Delete preview and delete for the whole account (FR-5, FR-4, AR-7, AR-8, AR-17).

GET /api/identity/me/delete-preview and DELETE /api/identity/me. The test PDFs
are made with PyMuPDF in test_files.py; no real notes are used.
"""

import logging
import uuid
from pathlib import Path

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.core import storage
from app.core.security import SESSION_COOKIE
from app.modules.content import registry
from app.modules.content.registry import DeleteScope, register_counter
from app.modules.identity.models import User
from tests.test_delete import TEST_KIND, _new_lecture_in, _pdf_path, _row_counts, _upload_file
from tests.test_delete import test_kind as test_kind  # the fixture, re-exported for pytest
from tests.test_files import _log_in_new_user
from tests.test_lectures import _new_subject
from tests.test_logout import _assert_clears_cookie
from tests.test_subjects import PASSWORD, _code

PREVIEW = "/api/identity/me/delete-preview"
ME = "/api/identity/me"


async def _user_count(engine: AsyncEngine) -> int:
    async with async_sessionmaker(engine)() as session:
        return await session.scalar(select(func.count()).select_from(User)) or 0


async def _fill_account(client: AsyncClient) -> list[str]:
    """2 subjects, 3 lectures and 4 files for the logged-in user. Returns the file ids."""
    first = await _new_subject(client, "Markedsføring")
    second = await _new_subject(client, "Samfunnsøkonomi")
    a = await _new_lecture_in(client, first, "Uke 37")
    b = await _new_lecture_in(client, first, "Uke 38")
    c = await _new_lecture_in(client, second, "Uke 37")
    return [
        await _upload_file(client, a),
        await _upload_file(client, a),
        await _upload_file(client, b),
        await _upload_file(client, c),
    ]


# --- Preview -----------------------------------------------------------------


async def test_fr5_forhandsvisning_teller_emner_forelesninger_og_filer(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    await _fill_account(client)
    response = await client.get(PREVIEW)
    assert response.status_code == 200
    assert response.json() == {
        "counts": [
            {"kind": "subjects", "count": 2},
            {"kind": "lectures", "count": 3},
            {"kind": "files", "count": 4},
        ],
        "content_kinds": ["flashcards"],
    }


async def test_fr5_tom_konto_gir_tom_liste(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    response = await client.get(PREVIEW)
    assert response.status_code == 200
    assert response.json() == {"counts": [], "content_kinds": ["flashcards"]}


async def test_fr5_emne_uten_forelesninger_utelater_nuller(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    await _new_subject(client)
    assert (await client.get(PREVIEW)).json()["counts"] == [{"kind": "subjects", "count": 1}]


async def test_fr5_forhandsvisning_teller_ikke_andres(client: AsyncClient) -> None:
    await _log_in_new_user(client, "ola@eksempel.no")
    await _fill_account(client)
    await _log_in_new_user(client, "klara@eksempel.no")
    await _new_subject(client)
    assert (await client.get(PREVIEW)).json()["counts"] == [{"kind": "subjects", "count": 1}]


@pytest.mark.usefixtures("test_kind")
async def test_ar7_registrert_type_er_med_i_content_kinds_og_tellingene(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    # Before anything is uploaded: the kind is named, but its count of 0 is left out.
    empty = (await client.get(PREVIEW)).json()
    assert empty == {"counts": [], "content_kinds": ["flashcards", TEST_KIND]}

    await _fill_account(client)
    body = (await client.get(PREVIEW)).json()
    # The scope has all 4 files and all 3 lectures: 4 + 2 * 3.
    assert body["counts"][-1] == {"kind": TEST_KIND, "count": 10}
    assert body["content_kinds"] == ["flashcards", TEST_KIND]


def test_ar7_registered_kinds_gir_flashcards() -> None:
    assert registry.registered_kinds() == ["flashcards"]


def test_ar7_subjects_er_reservert() -> None:
    async def count(_session: AsyncSession, _scope: DeleteScope) -> int:
        return 1

    with pytest.raises(ValueError):
        register_counter("subjects", count)
    assert "subjects" not in registry._counters


# --- Delete ------------------------------------------------------------------


async def test_fr5_slett_kontoen_fjerner_alle_rader_og_mappa_men_ikke_andres(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path
) -> None:
    ola_id = await _log_in_new_user(client, "ola@eksempel.no")
    ola_files = await _fill_account(client)

    user_id = await _log_in_new_user(client, "klara@eksempel.no")
    await _fill_account(client)
    assert (upload_dir / user_id).is_dir()

    response = await client.delete(ME)

    assert response.status_code == 204
    assert response.content == b""
    _assert_clears_cookie(response.headers["set-cookie"])
    async with async_sessionmaker(engine)() as session:
        assert await session.get(User, uuid.UUID(user_id)) is None
        assert await session.get(User, uuid.UUID(ola_id)) is not None
    # Only Ola's rows are left: 2 subjects, 3 lectures, 4 files of 2 pages each.
    assert await _row_counts(engine) == {"subjects": 2, "lectures": 3, "files": 4, "file_pages": 8}
    assert await _user_count(engine) == 1
    assert not (upload_dir / user_id).exists()
    assert all(_pdf_path(upload_dir, ola_id, file_id).exists() for file_id in ola_files)


async def test_fr5_etter_sletting_er_kontoen_borte_og_e_posten_ledig(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    await _fill_account(client)
    old_token = client.cookies[SESSION_COOKIE]

    assert (await client.delete(ME)).status_code == 204

    # The old cookie no longer gives access: its user is gone.
    client.cookies.set(SESSION_COOKIE, old_token)
    old = await client.get(ME)
    assert old.status_code == 401
    assert _code(old) == "UNAUTHENTICATED"

    client.cookies.clear()
    login = await client.post(
        "/api/identity/login", json={"email": "klara@eksempel.no", "password": PASSWORD}
    )
    assert login.status_code == 401
    assert _code(login) == "INVALID_CREDENTIALS"

    again = await client.post(
        "/api/identity/register", json={"email": "klara@eksempel.no", "password": PASSWORD}
    )
    assert again.status_code == 201
    # The new account starts empty.
    assert (await client.get(PREVIEW)).json()["counts"] == []


async def test_fr5_konto_uten_opplastinger_gir_204(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path
) -> None:
    user_id = await _log_in_new_user(client)
    await _new_subject(client)
    assert not (upload_dir / user_id).exists()

    response = await client.delete(ME)

    assert response.status_code == 204
    assert await _user_count(engine) == 0
    assert await _row_counts(engine) == {"subjects": 0, "lectures": 0, "files": 0, "file_pages": 0}


async def test_ar8_diskfeil_ved_kontosletting_logges_med_bruker_id_og_svaret_er_204(
    client: AsyncClient,
    engine: AsyncEngine,
    upload_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    user_id = await _log_in_new_user(client, "hemmelig.adresse@eksempel.no")
    lecture_id = await _new_lecture_in(client, await _new_subject(client))
    file_id = await _upload_file(client, lecture_id, "hemmelig-navn.pdf")

    def failing_delete(_owner: uuid.UUID) -> None:
        raise OSError("disk full")

    monkeypatch.setattr(storage, "delete_user_dir", failing_delete)
    with caplog.at_level(logging.ERROR):
        response = await client.delete(ME)

    assert response.status_code == 204
    _assert_clears_cookie(response.headers["set-cookie"])
    assert await _user_count(engine) == 0
    # The rows are gone; the PDF is left on the disk.
    assert _pdf_path(upload_dir, user_id, file_id).exists()
    errors = [record for record in caplog.records if record.levelno >= logging.ERROR]
    assert len(errors) == 1
    logged = caplog.text
    assert user_id in logged
    assert "hemmelig.adresse" not in logged
    assert "hemmelig-navn" not in logged


async def test_ar8_mappa_slettes_ikke_foer_commit(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    user_id = await _log_in_new_user(client)
    file_ids = await _fill_account(client)

    async def failing_commit(_self: AsyncSession) -> None:
        raise RuntimeError("commit failed")

    with monkeypatch.context() as patch, pytest.raises(RuntimeError):
        patch.setattr(AsyncSession, "commit", failing_commit)
        await client.delete(ME)

    assert all(_pdf_path(upload_dir, user_id, file_id).exists() for file_id in file_ids)
    assert await _user_count(engine) == 1
    assert (await client.get(ME)).status_code == 200


@pytest.mark.parametrize(("method", "path"), [("GET", PREVIEW), ("DELETE", ME)])
async def test_fr4_kontoslettingen_krever_innlogging(
    client: AsyncClient, engine: AsyncEngine, method: str, path: str
) -> None:
    await _log_in_new_user(client)
    client.cookies.clear()
    response = await client.request(method, path)
    assert response.status_code == 401
    assert _code(response) == "UNAUTHENTICATED"
    assert await _user_count(engine) == 1
