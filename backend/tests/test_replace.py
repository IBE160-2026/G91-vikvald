"""Replace a file with a new version: POST /api/files/{id}/replace
(FR-13, FR-9, FR-10, FR-4, AR-7, AR-8).

The test PDFs are made with PyMuPDF in test_files.py; no real notes are used.
"""

import logging
import uuid
from collections.abc import AsyncIterator
from pathlib import Path

import pytest
from httpx import AsyncClient, Response
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.core import storage
from app.modules.files import pdf as pdf_module
from app.modules.files import router as files_router_module
from app.modules.files.models import File, FilePage
from app.modules.files.service import store_file
from app.modules.identity.models import User
from tests.test_delete import _pdf_path, _row_counts
from tests.test_files import (
    DOCX_BYTES,
    MIB,
    _log_in_new_user,
    _new_lecture,
    _upload,
    make_locked_pdf,
    make_pdf,
)
from tests.test_subjects import NOT_FOUND, _code

FILES = "/api/files"
LECTURES = "/api/lectures"


async def _replace(
    client: AsyncClient, file_id: str, data: bytes, name: str = "ny.pdf"
) -> Response:
    files = {"file": (name, data, "application/pdf")}
    return await client.post(f"{FILES}/{file_id}/replace", files=files)


async def _old_file(client: AsyncClient, lecture_id: str) -> str:
    response = await _upload(client, lecture_id, make_pdf(["Gammel én", "Gammel to"]), "merkevare.pdf")
    assert response.status_code == 201
    return response.json()["id"]


def _pdfs_on_disk(upload_dir: Path) -> list[Path]:
    return sorted(path for path in upload_dir.rglob("*.pdf")) if upload_dir.exists() else []


async def _page_texts(engine: AsyncEngine, file_id: str) -> list[str]:
    async with async_sessionmaker(engine)() as session:
        statement = (
            select(FilePage.text)
            .where(FilePage.file_id == uuid.UUID(file_id))
            .order_by(FilePage.page_no)
        )
        # PyMuPDF ends each page's text with a newline.
        return [text.strip() for text in await session.scalars(statement)]


async def test_fr13_godtatt_erstatning_gir_ny_fil_og_fjerner_den_gamle(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path
) -> None:
    user_id = await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    old_id = await _old_file(client, lecture_id)
    assert _pdf_path(upload_dir, user_id, old_id).exists()

    response = await _replace(client, old_id, make_pdf(["Ny én", "Ny to", "Ny tre"]))

    assert response.status_code == 201
    body = response.json()
    assert set(body) == {"id", "lecture_id", "original_name", "page_count", "uploaded_at"}
    assert body["id"] != old_id
    assert body["lecture_id"] == lecture_id
    assert body["original_name"] == "ny.pdf"
    assert body["page_count"] == 3
    # The old row, its pages and its PDF are gone; the new ones are there.
    assert await _row_counts(engine) == {"subjects": 1, "lectures": 1, "files": 1, "file_pages": 3}
    assert await _page_texts(engine, old_id) == []
    assert await _page_texts(engine, body["id"]) == ["Ny én", "Ny to", "Ny tre"]
    assert not _pdf_path(upload_dir, user_id, old_id).exists()
    assert _pdf_path(upload_dir, user_id, body["id"]).exists()
    listed = (await client.get(f"{LECTURES}/{lecture_id}/files")).json()
    assert [file["id"] for file in listed] == [body["id"]]


async def test_fr13_ny_fil_kommer_sist_med_nytt_tidspunkt(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    old_id = await _old_file(client, lecture_id)
    other = (await _upload(client, lecture_id, make_pdf(["Annen"]), "annen.pdf")).json()
    old_uploaded = (await client.get(f"{LECTURES}/{lecture_id}/files")).json()[0]["uploaded_at"]

    new = (await _replace(client, old_id, make_pdf(["Ny"]))).json()

    listed = (await client.get(f"{LECTURES}/{lecture_id}/files")).json()
    assert [file["id"] for file in listed] == [other["id"], new["id"]]
    assert new["uploaded_at"] > old_uploaded


@pytest.mark.parametrize(
    ("data", "code"),
    [
        (DOCX_BYTES, "NOT_PDF"),
        (make_pdf(["", ""]), "NO_READABLE_TEXT"),
        (make_pdf([f"Side {n}" for n in range(1, 52)]), "TOO_MANY_PAGES"),
        (make_locked_pdf(), "PDF_UNREADABLE"),
    ],
    ids=["not_pdf", "no_text", "51_pages", "locked"],
)
async def test_fr13_avvist_fil_lar_den_gamle_staa_urort(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path, data: bytes, code: str
) -> None:
    user_id = await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    old_id = await _old_file(client, lecture_id)
    before = await _row_counts(engine)
    pdfs_before = _pdfs_on_disk(upload_dir)

    response = await _replace(client, old_id, data)
    # The same code and details as the same file uploaded fresh.
    uploaded = await _upload(client, await _new_lecture(client), data)

    assert response.status_code == 422
    assert _code(response) == code
    assert response.json() == uploaded.json()
    assert uploaded.status_code == 422
    assert await _page_texts(engine, old_id) == ["Gammel én", "Gammel to"]
    after = await _row_counts(engine)
    assert {key: after[key] for key in ("files", "file_pages")} == {
        key: before[key] for key in ("files", "file_pages")
    }
    assert _pdfs_on_disk(upload_dir) == pdfs_before
    assert _pdf_path(upload_dir, user_id, old_id).exists()


async def test_fr13_for_stor_fil_avvises_for_pymupdf_og_den_gamle_staar(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("MAX_UPLOAD_MB", "1")
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    old_id = await _old_file(client, lecture_id)
    before = await _row_counts(engine)
    pdfs_before = _pdfs_on_disk(upload_dir)
    monkeypatch.setattr(pdf_module, "read_pages", lambda _data: pytest.fail("PyMuPDF called"))

    response = await _replace(client, old_id, b"%PDF-1.7\n" + b"x" * int(2.2 * MIB))

    assert response.status_code == 422
    assert response.json()["error"] == {
        "code": "FILE_TOO_LARGE",
        "details": {"size_mb": 3, "limit_mb": 1},
    }
    assert await _row_counts(engine) == before
    assert _pdfs_on_disk(upload_dir) == pdfs_before


async def test_fr13_mangler_fil_gir_validation_error(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path
) -> None:
    await _log_in_new_user(client)
    old_id = await _old_file(client, await _new_lecture(client))
    before = await _row_counts(engine)
    pdfs_before = _pdfs_on_disk(upload_dir)
    url = f"{FILES}/{old_id}/replace"

    responses = [
        await client.post(url, files={"annet": ("a.pdf", make_pdf(["x"]), "application/pdf")}),
        await client.post(url),
    ]
    for response in responses:
        assert response.status_code == 422
        assert response.json()["error"] == {
            "code": "VALIDATION_ERROR",
            "details": {"fields": {"file": "missing"}},
        }
    assert await _row_counts(engine) == before
    assert _pdfs_on_disk(upload_dir) == pdfs_before


async def test_fr13_uten_vilkaar_gir_terms_not_accepted_og_ingenting_endres(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path
) -> None:
    user_id = await _log_in_new_user(client)
    old_id = await _old_file(client, await _new_lecture(client))
    async with async_sessionmaker(engine)() as session:
        await session.execute(
            update(User).where(User.id == uuid.UUID(user_id)).values(terms_accepted_at=None)
        )
        await session.commit()
    before = await _row_counts(engine)
    pdfs_before = _pdfs_on_disk(upload_dir)

    response = await _replace(client, old_id, make_pdf(["Ny"]))

    assert response.status_code == 403
    assert _code(response) == "TERMS_NOT_ACCEPTED"
    assert await _row_counts(engine) == before
    assert _pdfs_on_disk(upload_dir) == pdfs_before


async def test_fr4_andres_ukjent_og_ugyldig_fil_gir_lik_404(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path
) -> None:
    await _log_in_new_user(client, "ola@eksempel.no")
    olas_file = await _old_file(client, await _new_lecture(client))
    before = await _row_counts(engine)
    pdfs_before = _pdfs_on_disk(upload_dir)

    await _log_in_new_user(client, "klara@eksempel.no")
    for file_id in [olas_file, str(uuid.uuid4()), "ikke-en-id"]:
        response = await _replace(client, file_id, make_pdf(["Klaras notat"]))
        assert (response.status_code, response.json()) == (404, NOT_FOUND)
    assert await _row_counts(engine) == before
    assert _pdfs_on_disk(upload_dir) == pdfs_before


async def test_fr4_404_kommer_foer_kroppen_leses(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    read = False

    async def body() -> AsyncIterator[bytes]:
        nonlocal read
        read = True
        yield b"x"

    response = await client.post(
        f"{FILES}/{uuid.uuid4()}/replace",
        content=body(),
        headers={"Content-Type": "multipart/form-data; boundary=x"},
    )
    assert response.status_code == 404
    assert read is False


async def test_fr4_erstatning_krever_innlogging(client: AsyncClient) -> None:
    client.cookies.clear()
    response = await _replace(client, str(uuid.uuid4()), make_pdf(["x"]))
    assert response.status_code == 401
    assert _code(response) == "UNAUTHENTICATED"


async def test_fr13_gammel_rad_borte_foer_lagring_gir_404_uten_ny_fil(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    user_id = await _log_in_new_user(client)
    old_id = await _old_file(client, await _new_lecture(client))

    async def deleted_meanwhile(session: AsyncSession, *args: object, **kwargs: object) -> File:
        # As if another tab deleted the file between the lookup and the store.
        await session.execute(File.__table__.delete().where(File.id == uuid.UUID(old_id)))
        await session.commit()
        return await store_file(session, *args, **kwargs)  # type: ignore[arg-type]

    monkeypatch.setattr(files_router_module, "store_file", deleted_meanwhile)
    response = await _replace(client, old_id, make_pdf(["Ny"]))

    assert (response.status_code, response.json()) == (404, NOT_FOUND)
    assert await _row_counts(engine) == {"subjects": 1, "lectures": 1, "files": 0, "file_pages": 0}
    # No new PDF was written; the old one is left (nobody removed it).
    assert _pdfs_on_disk(upload_dir) == [_pdf_path(upload_dir, user_id, old_id)]


async def test_ar8_diskfeil_paa_gammel_pdf_logges_og_svaret_er_201(
    client: AsyncClient,
    engine: AsyncEngine,
    upload_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    user_id = await _log_in_new_user(client)
    old_id = await _old_file(client, await _new_lecture(client))

    def failing_delete(_owner: uuid.UUID, _file_id: uuid.UUID) -> None:
        raise OSError("disk full")

    monkeypatch.setattr(storage, "delete_pdf", failing_delete)
    with caplog.at_level(logging.ERROR):
        response = await _replace(client, old_id, make_pdf(["Ny"]), "hemmelig-navn.pdf")

    assert response.status_code == 201
    new_id = response.json()["id"]
    assert await _row_counts(engine) == {"subjects": 1, "lectures": 1, "files": 1, "file_pages": 1}
    assert _pdf_path(upload_dir, user_id, new_id).exists()
    errors = [record for record in caplog.records if record.levelno >= logging.ERROR]
    assert len(errors) == 1
    assert old_id in caplog.text
    assert "hemmelig-navn" not in caplog.text
    assert "merkevare" not in caplog.text


async def test_ar8_gammel_pdf_slettes_ikke_foer_commit(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    user_id = await _log_in_new_user(client)
    old_id = await _old_file(client, await _new_lecture(client))

    async def failing_commit(_self: AsyncSession) -> None:
        raise RuntimeError("commit failed")

    with monkeypatch.context() as patch, pytest.raises(RuntimeError):
        patch.setattr(AsyncSession, "commit", failing_commit)
        await _replace(client, old_id, make_pdf(["Ny"]))

    # The old file is intact, and the new PDF was removed again.
    assert _pdfs_on_disk(upload_dir) == [_pdf_path(upload_dir, user_id, old_id)]
    assert await _page_texts(engine, old_id) == ["Gammel én", "Gammel to"]
