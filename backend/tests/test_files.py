"""Files: POST/GET /api/lectures/{id}/files and GET /api/subjects/{id}/file-counts
(FR-8, FR-9, FR-10, FR-39, FR-4, NFR-16, AR-8).

The test PDFs are made here with PyMuPDF; no real notes are used.
"""

import uuid
from collections.abc import AsyncIterator
from pathlib import Path

import pymupdf
import pytest
from httpx import AsyncClient, Response
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.core.errors import AppError, ErrorCode
from app.modules.files import pdf as pdf_module
from app.modules.files.models import File, FilePage
from app.modules.files.service import clean_original_name
from app.modules.subjects.models import Lecture
from tests.test_lectures import _create_lecture, _new_subject
from tests.test_subjects import NOT_FOUND, _code
from tests.test_subjects import _log_in_new_user as _log_in_without_terms

LECTURES = "/api/lectures"
SUBJECTS = "/api/subjects"
MIB = 1024 * 1024


def make_pdf(texts: list[str]) -> bytes:
    """A PDF with one page per text (an empty text gives an empty page)."""
    document = pymupdf.open()
    for text in texts:
        page = document.new_page()
        if text:
            page.insert_text((72, 72), text)
    data = document.tobytes()
    document.close()
    return data


def make_locked_pdf() -> bytes:
    document = pymupdf.open()
    document.new_page().insert_text((72, 72), "Hemmelig")
    data = document.tobytes(encryption=pymupdf.PDF_ENCRYPT_AES_256, user_pw="a", owner_pw="b")
    document.close()
    return data


# The start of a .docx file (a zip archive), enough to not be a PDF.
DOCX_BYTES = b"PK\x03\x04\x14\x00\x06\x00" + b"word/document.xml" + b"\x00" * 200


async def _log_in_new_user(client: AsyncClient, email: str = "klara@eksempel.no") -> str:
    """A new, logged-in user who has accepted the terms (FR-11), so uploads are
    allowed. Returns the user id."""
    user_id = await _log_in_without_terms(client, email)
    assert (await client.post("/api/identity/terms")).status_code == 200
    return user_id


async def _new_lecture(client: AsyncClient) -> str:
    subject_id = await _new_subject(client)
    return (await _create_lecture(client, subject_id)).json()["id"]


async def _upload(
    client: AsyncClient, lecture_id: str, data: bytes, name: str = "notater.pdf"
) -> Response:
    files = {"file": (name, data, "application/pdf")}
    return await client.post(f"{LECTURES}/{lecture_id}/files", files=files)


async def _counts(engine: AsyncEngine) -> tuple[int, int]:
    async with async_sessionmaker(engine)() as session:
        files = await session.scalar(select(func.count()).select_from(File)) or 0
        pages = await session.scalar(select(func.count()).select_from(FilePage)) or 0
        return files, pages


def _stored_pdfs(upload_dir: Path) -> list[Path]:
    return sorted(upload_dir.rglob("*")) if upload_dir.exists() else []


async def _assert_nothing_stored(engine: AsyncEngine, upload_dir: Path) -> None:
    assert await _counts(engine) == (0, 0)
    assert [path for path in _stored_pdfs(upload_dir) if path.is_file()] == []


async def test_fr39_tre_sider_lagres_med_tekst_per_side_og_fil_paa_disk(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path
) -> None:
    user_id = await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)

    response = await _upload(client, lecture_id, make_pdf(["Side én", "Side to", "Side tre"]))

    assert response.status_code == 201
    body = response.json()
    assert set(body) == {"id", "lecture_id", "original_name", "page_count", "uploaded_at"}
    assert body["lecture_id"] == lecture_id
    assert body["original_name"] == "notater.pdf"
    assert body["page_count"] == 3
    assert body["uploaded_at"].endswith(("Z", "+00:00"))
    async with async_sessionmaker(engine)() as session:
        pages = list(
            await session.scalars(
                select(FilePage).where(FilePage.file_id == uuid.UUID(body["id"])).order_by(FilePage.page_no)
            )
        )
    assert [page.page_no for page in pages] == [1, 2, 3]
    assert [page.text.strip() for page in pages] == ["Side én", "Side to", "Side tre"]
    assert all(page.needs_image is False for page in pages)
    stored = upload_dir / user_id / f"{body['id']}.pdf"
    assert stored.read_bytes()[:5] == b"%PDF-"
    # The original filename is never part of a path on disk.
    assert not any("notater" in str(path) for path in _stored_pdfs(upload_dir))


@pytest.mark.parametrize("name", ["notater.docx", "x.pdf"])
async def test_fr39_word_fil_avvises_som_not_pdf_uansett_filendelse(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path, name: str
) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    response = await _upload(client, lecture_id, DOCX_BYTES, name)
    assert response.status_code == 422
    assert _code(response) == "NOT_PDF"
    await _assert_nothing_stored(engine, upload_dir)


@pytest.mark.parametrize("texts", [["", ""], ["   ", "\n\t "]])
async def test_fr39_pdf_uten_tekst_gir_no_readable_text(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path, texts: list[str]
) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    response = await _upload(client, lecture_id, make_pdf(texts))
    assert response.status_code == 422
    assert _code(response) == "NO_READABLE_TEXT"
    await _assert_nothing_stored(engine, upload_dir)


async def test_fr39_51_sider_avvises_og_50_godtas(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path
) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)

    rejected = await _upload(client, lecture_id, make_pdf([f"Side {n}" for n in range(1, 52)]))
    assert rejected.status_code == 422
    assert rejected.json()["error"] == {"code": "TOO_MANY_PAGES", "details": {"page_count": 51}}
    await _assert_nothing_stored(engine, upload_dir)

    accepted = await _upload(client, lecture_id, make_pdf([f"Side {n}" for n in range(1, 51)]))
    assert accepted.status_code == 201
    assert accepted.json()["page_count"] == 50
    assert await _counts(engine) == (1, 50)


@pytest.mark.parametrize(
    "data", [make_locked_pdf(), b"%PDF-1.7\n" + b"dette er ikke en pdf " * 50], ids=["passord", "skadet"]
)
async def test_fr39_laast_eller_skadet_pdf_gir_pdf_unreadable(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path, data: bytes
) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    response = await _upload(client, lecture_id, data)
    assert response.status_code == 422
    assert _code(response) == "PDF_UNREADABLE"
    await _assert_nothing_stored(engine, upload_dir)


async def test_nfr16_for_stor_fil_aapnes_aldri_og_lesingen_stopper(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("MAX_UPLOAD_MB", "1")
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)

    def must_not_run(_data: bytes) -> list[str]:
        raise AssertionError("PyMuPDF must not open a file that is too large")

    monkeypatch.setattr(pdf_module, "read_pages", must_not_run)

    # A streamed body without Content-Length: 64 chunks of 64 KiB = 4 MiB in all.
    chunk = b"x" * (64 * 1024)
    sent = 0
    boundary = "grense"
    head = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"stor.pdf\"\r\n"
        "Content-Type: application/pdf\r\n\r\n%PDF-1.7\n"
    ).encode()

    async def body() -> AsyncIterator[bytes]:
        nonlocal sent
        sent += 1
        yield head
        for _ in range(64):
            sent += 1
            yield chunk
        sent += 1
        yield f"\r\n--{boundary}--\r\n".encode()

    response = await client.post(
        f"{LECTURES}/{lecture_id}/files",
        content=body(),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "FILE_TOO_LARGE"
    assert error["details"]["limit_mb"] == 1
    assert error["details"]["size_mb"] > error["details"]["limit_mb"]
    # 1 MiB + slack is about 17 chunks; the rest of the 66 were never read.
    assert sent < 30
    await _assert_nothing_stored(engine, upload_dir)


async def test_nfr16_for_stor_fil_med_content_length_gir_size_mb_rundet_opp(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("MAX_UPLOAD_MB", "1")
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    monkeypatch.setattr(pdf_module, "read_pages", lambda _data: pytest.fail("PyMuPDF called"))

    response = await _upload(client, lecture_id, b"%PDF-1.7\n" + b"x" * (int(2.2 * MIB)))

    assert response.status_code == 422
    assert response.json()["error"] == {
        "code": "FILE_TOO_LARGE",
        "details": {"size_mb": 3, "limit_mb": 1},
    }
    await _assert_nothing_stored(engine, upload_dir)


async def test_nfr16_fil_like_over_grensen_avvises_med_size_mb_over_grensen(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Inside the slack for multipart headers, so the whole body is read and the
    # file's own size decides.
    monkeypatch.setenv("MAX_UPLOAD_MB", "1")
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    monkeypatch.setattr(pdf_module, "read_pages", lambda _data: pytest.fail("PyMuPDF called"))

    response = await _upload(client, lecture_id, b"%PDF-1.7\n" + b"x" * MIB)

    assert response.status_code == 422
    assert response.json()["error"]["details"] == {"size_mb": 2, "limit_mb": 1}
    await _assert_nothing_stored(engine, upload_dir)


async def test_nfr16_fil_paa_naktig_grensen_godtas(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("MAX_UPLOAD_MB", "1")
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    data = make_pdf(["Side én"])
    # Pad with a PDF comment after %%EOF up to exactly 1 MiB (PyMuPDF ignores it).
    data += b"%" + b"x" * (MIB - len(data) - 1)
    assert len(data) == MIB

    response = await _upload(client, lecture_id, data)

    assert response.status_code == 201, response.json()


async def test_fr8_samme_filnavn_to_ganger_gir_to_filer_i_opplastingsrekkefolge(
    client: AsyncClient,
) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    first = (await _upload(client, lecture_id, make_pdf(["En"]), "a.pdf")).json()
    second = (await _upload(client, lecture_id, make_pdf(["To", "Tre"]), "a.pdf")).json()
    assert first["id"] != second["id"]

    listed = await client.get(f"{LECTURES}/{lecture_id}/files")
    assert listed.status_code == 200
    assert [(f["id"], f["original_name"], f["page_count"]) for f in listed.json()] == [
        (first["id"], "a.pdf", 1),
        (second["id"], "a.pdf", 2),
    ]


@pytest.mark.parametrize(
    ("sent_name", "stored_name"),
    [
        ("  notater.pdf  ", "notater.pdf"),
        ("C:\\Users\\klara\\notater.pdf", "notater.pdf"),
        ("mappe/under/notater.pdf", "notater.pdf"),
        ("a" * 300 + ".pdf", "a" * 255),
    ],
)
async def test_fr8_original_name_er_bare_filnavnet_trimmet_og_kuttet(
    client: AsyncClient, sent_name: str, stored_name: str
) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    response = await _upload(client, lecture_id, make_pdf(["Tekst"]), sent_name)
    assert response.status_code == 201
    assert response.json()["original_name"] == stored_name


async def test_fr8_mangler_fil_gir_validation_error(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path
) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    url = f"{LECTURES}/{lecture_id}/files"

    responses = [
        await client.post(url, files={"annet": ("a.pdf", make_pdf(["x"]), "application/pdf")}),
        await client.post(url, data={"file": "ikke en fil"}, files={"x": ("x.txt", b"x")}),
        await client.post(url, files={"file": ("   ", make_pdf(["x"]), "application/pdf")}),
        await client.post(url, json={"file": "a.pdf"}),
        await client.post(url),
    ]
    for response in responses:
        assert response.status_code == 422
        assert response.json()["error"] == {
            "code": "VALIDATION_ERROR",
            "details": {"fields": {"file": "missing"}},
        }
    await _assert_nothing_stored(engine, upload_dir)


async def test_fr4_andres_ukjent_og_ugyldig_forelesning_gir_lik_404(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path
) -> None:
    await _log_in_new_user(client, "ola@eksempel.no")
    olas_subject = await _new_subject(client)
    olas_lecture = (await _create_lecture(client, olas_subject)).json()["id"]
    await _upload(client, olas_lecture, make_pdf(["Olas notat"]))
    before = await _counts(engine)

    await _log_in_new_user(client, "klara@eksempel.no")
    for lecture_id in [olas_lecture, str(uuid.uuid4()), "ikke-en-id"]:
        posted = await _upload(client, lecture_id, make_pdf(["Klaras notat"]))
        assert (posted.status_code, posted.json()) == (404, NOT_FOUND)
        listed = await client.get(f"{LECTURES}/{lecture_id}/files")
        assert (listed.status_code, listed.json()) == (404, NOT_FOUND)
    for subject_id in [olas_subject, str(uuid.uuid4()), "ikke-en-id"]:
        counted = await client.get(f"{SUBJECTS}/{subject_id}/file-counts")
        assert (counted.status_code, counted.json()) == (404, NOT_FOUND)
    assert await _counts(engine) == before


async def test_fr4_404_kommer_foer_kroppen_leses(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    await _log_in_new_user(client)
    read = False

    async def body() -> AsyncIterator[bytes]:
        nonlocal read
        read = True
        yield b"x"

    response = await client.post(
        f"{LECTURES}/{uuid.uuid4()}/files",
        content=body(),
        headers={"Content-Type": "multipart/form-data; boundary=x"},
    )
    assert response.status_code == 404
    assert read is False


async def test_fr8_tellinger_per_forelesning_i_emnet(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    with_files = (await _create_lecture(client, subject_id, "Med filer")).json()["id"]
    await _create_lecture(client, subject_id, "Uten filer")
    await _upload(client, with_files, make_pdf(["1"]))
    await _upload(client, with_files, make_pdf(["1", "2"]))
    await _upload(client, with_files, make_pdf(["1", "2", "3"]))
    # A file in another subject is not counted.
    other_lecture = await _new_lecture(client)
    await _upload(client, other_lecture, make_pdf(["annet"]))

    response = await client.get(f"{SUBJECTS}/{subject_id}/file-counts")

    assert response.status_code == 200
    assert response.json() == {
        "file_count": 3,
        "lectures": [{"lecture_id": with_files, "file_count": 3, "page_count": 6}],
    }


async def test_fr8_tellinger_for_emne_uten_filer(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    response = await client.get(f"{SUBJECTS}/{subject_id}/file-counts")
    assert response.json() == {"file_count": 0, "lectures": []}


async def test_fr8_slettet_forelesning_sletter_filer_og_sider(
    client: AsyncClient, engine: AsyncEngine
) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    await _upload(client, lecture_id, make_pdf(["En", "To"]))
    assert await _counts(engine) == (1, 2)

    async with async_sessionmaker(engine)() as session:
        await session.execute(delete(Lecture).where(Lecture.id == uuid.UUID(lecture_id)))
        await session.commit()

    assert await _counts(engine) == (0, 0)


async def test_fr8_feilet_commit_fjerner_fila_fra_disken(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)

    async def failing_commit(_self: AsyncSession) -> None:
        raise RuntimeError("commit failed")

    monkeypatch.setattr(AsyncSession, "commit", failing_commit)
    with pytest.raises(RuntimeError):
        await _upload(client, lecture_id, make_pdf(["Tekst"]))
    monkeypatch.undo()

    await _assert_nothing_stored(engine, upload_dir)


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("POST", "/api/lectures/{id}/files"),
        ("GET", "/api/lectures/{id}/files"),
        ("GET", "/api/subjects/{id}/file-counts"),
    ],
)
async def test_fr4_nye_ruter_krever_innlogging(client: AsyncClient, method: str, path: str) -> None:
    client.cookies.clear()
    response = await client.request(method, path.format(id=uuid.uuid4()))
    assert response.status_code == 401
    assert _code(response) == "UNAUTHENTICATED"


def test_fr39_pdf_leseren_ser_paa_innholdet_ikke_navnet() -> None:
    # The marker may come after a few junk bytes, but must be in the first 1024.
    assert pdf_module.looks_like_pdf(b"\xef\xbb\xbf%PDF-1.4")
    assert not pdf_module.looks_like_pdf(b"hei" * 400 + b"%PDF-")
    with pytest.raises(AppError) as not_pdf:
        pdf_module.read_pages(b"hei" * 400 + b"%PDF-")
    assert not_pdf.value.code == ErrorCode.NOT_PDF
    assert pdf_module.read_pages(make_pdf(["Side én", "Side to"])) == ["Side én\n", "Side to\n"]


def test_fr39_nul_tegn_fjernes_fra_sideteksten(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(pymupdf.Page, "get_text", lambda _self, *args, **kwargs: "a\x00b")
    assert pdf_module.read_pages(make_pdf(["x"])) == ["ab"]


def test_fr8_kontrolltegn_fjernes_fra_filnavnet() -> None:
    assert clean_original_name("note\x00r\n.pdf") == "noter.pdf"
    assert clean_original_name("\x00\n\t") == ""


async def test_fr8_filnavn_med_nul_tegn_lagres_uten_dem(client: AsyncClient) -> None:
    # httpx percent-encodes odd filenames, so the multipart body is written by hand
    # with a raw NUL and a tab in the filename.
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    boundary = "grense"
    body = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; ".encode()
        + b'filename="note\x00r\t.pdf"\r\nContent-Type: application/pdf\r\n\r\n'
        + make_pdf(["Tekst"])
        + f"\r\n--{boundary}--\r\n".encode()
    )
    response = await client.post(
        f"{LECTURES}/{lecture_id}/files",
        content=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    assert response.status_code == 201
    assert response.json()["original_name"] == "noter.pdf"
