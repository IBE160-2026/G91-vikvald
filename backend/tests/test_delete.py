"""Delete preview and delete for files, lectures and subjects
(FR-6, FR-7, FR-12, FR-14, FR-4, AR-7, AR-8).

GET /api/files|lectures|subjects/{id}/delete-preview and DELETE on the same ids.
The test PDFs are made with PyMuPDF in test_files.py; no real notes are used.
"""

import logging
import re
import uuid
from collections.abc import Iterator
from pathlib import Path

import pytest
from httpx import AsyncClient, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.core import storage
from app.modules.content import registry
from app.modules.content.registry import DeleteScope, content_counts, register_counter, unregister_counter
from app.modules.files.models import File, FilePage
from app.modules.subjects.models import Lecture, Subject
from tests.test_files import _log_in_new_user, _upload, make_pdf
from tests.test_lectures import _create_lecture, _new_subject
from tests.test_subjects import NOT_FOUND, _code

FILES = "/api/files"
LECTURES = "/api/lectures"
SUBJECTS = "/api/subjects"
TEST_KIND = "test_cards"
MESSAGES_FILE = Path(__file__).resolve().parents[2] / "frontend" / "lib" / "messages.ts"


async def _new_lecture_in(client: AsyncClient, subject_id: str, name: str = "Uke 37: Merkevare") -> str:
    return (await _create_lecture(client, subject_id, name)).json()["id"]


async def _upload_file(client: AsyncClient, lecture_id: str, name: str = "notater.pdf") -> str:
    response = await _upload(client, lecture_id, make_pdf(["Side én", "Side to"]), name)
    assert response.status_code == 201
    return response.json()["id"]


def _pdf_path(upload_dir: Path, user_id: str, file_id: str) -> Path:
    return upload_dir / user_id / f"{file_id}.pdf"


async def _row_counts(engine: AsyncEngine) -> dict[str, int]:
    async with async_sessionmaker(engine)() as session:
        return {
            "subjects": await session.scalar(select(func.count()).select_from(Subject)) or 0,
            "lectures": await session.scalar(select(func.count()).select_from(Lecture)) or 0,
            "files": await session.scalar(select(func.count()).select_from(File)) or 0,
            "file_pages": await session.scalar(select(func.count()).select_from(FilePage)) or 0,
        }


def _counts(response: Response) -> list[dict[str, object]]:
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"counts"}
    return body["counts"]


@pytest.fixture
def test_kind() -> Iterator[dict[str, int]]:
    """A registered content type that counts one per file and two per lecture in
    the scope (or what the test sets in `fixed`). Removed after the test."""
    fixed: dict[str, int] = {}

    async def count(_session: AsyncSession, scope: DeleteScope) -> int:
        if "value" in fixed:
            return fixed["value"]
        return len(scope.file_ids) + 2 * len(scope.lecture_ids)

    register_counter(TEST_KIND, count)
    yield fixed
    unregister_counter(TEST_KIND)


# --- The registry ------------------------------------------------------------


def test_ar7_flashcards_og_quizsporsmal_er_innmeldt_som_forste_typer() -> None:
    assert registry.registered_kinds() == ["flashcards", "quiz_questions", "model_cards", "freetext_questions"]


def test_ar7_samme_type_to_ganger_gir_value_error(test_kind: dict[str, int]) -> None:
    async def count(_session: AsyncSession, _scope: DeleteScope) -> int:
        return 1

    with pytest.raises(ValueError):
        register_counter(TEST_KIND, count)


async def test_fr12_registeret_gir_tellinger_i_innmeldingsrekkefolge_uten_null(
    session: AsyncSession,
) -> None:
    async def three(_session: AsyncSession, _scope: DeleteScope) -> int:
        return 3

    async def zero(_session: AsyncSession, _scope: DeleteScope) -> int:
        return 0

    async def one(_session: AsyncSession, _scope: DeleteScope) -> int:
        return 1

    register_counter("b_kind", three)
    register_counter("zero_kind", zero)
    register_counter("a_kind", one)
    try:
        counts = await content_counts(session, DeleteScope(file_ids=(), lecture_ids=()))
    finally:
        for kind in ("b_kind", "zero_kind", "a_kind"):
            unregister_counter(kind)
    assert counts == [("b_kind", 3), ("a_kind", 1)]


# --- Preview -----------------------------------------------------------------


async def test_fr12_emne_med_innhold_viser_forelesninger_og_filer(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    first = await _new_lecture_in(client, subject_id, "Uke 37")
    second = await _new_lecture_in(client, subject_id, "Uke 38")
    await _upload_file(client, first)
    await _upload_file(client, first)
    await _upload_file(client, second)

    counts = _counts(await client.get(f"{SUBJECTS}/{subject_id}/delete-preview"))
    assert counts == [{"kind": "lectures", "count": 2}, {"kind": "files", "count": 3}]


async def test_fr12_forelesning_med_filer_viser_filene(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture_in(client, await _new_subject(client))
    await _upload_file(client, lecture_id)
    await _upload_file(client, lecture_id)

    counts = _counts(await client.get(f"{LECTURES}/{lecture_id}/delete-preview"))
    assert counts == [{"kind": "files", "count": 2}]


async def test_fr12_tomt_emne_tom_forelesning_og_fil_gir_tom_liste(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    empty_subject = await _new_subject(client, "Tomt")
    subject_id = await _new_subject(client)
    empty_lecture = await _new_lecture_in(client, subject_id)
    file_id = await _upload_file(client, await _new_lecture_in(client, subject_id, "Med fil"))

    assert _counts(await client.get(f"{SUBJECTS}/{empty_subject}/delete-preview")) == []
    assert _counts(await client.get(f"{LECTURES}/{empty_lecture}/delete-preview")) == []
    assert _counts(await client.get(f"{FILES}/{file_id}/delete-preview")) == []


async def test_fr12_emne_med_tomme_forelesninger_utelater_filer(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    await _new_lecture_in(client, subject_id)
    counts = _counts(await client.get(f"{SUBJECTS}/{subject_id}/delete-preview"))
    assert counts == [{"kind": "lectures", "count": 1}]


async def test_fr12_registrert_type_kommer_sist_i_alle_tre(
    client: AsyncClient, test_kind: dict[str, int]
) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    lecture_id = await _new_lecture_in(client, subject_id)
    file_id = await _upload_file(client, lecture_id)
    await _upload_file(client, lecture_id)

    # File: scope = ([the file], []) -> 1.
    assert _counts(await client.get(f"{FILES}/{file_id}/delete-preview")) == [
        {"kind": TEST_KIND, "count": 1}
    ]
    # Lecture: scope = (2 files, [the lecture]) -> 2 + 2.
    assert _counts(await client.get(f"{LECTURES}/{lecture_id}/delete-preview")) == [
        {"kind": "files", "count": 2},
        {"kind": TEST_KIND, "count": 4},
    ]
    # Subject: scope = (2 files, 1 lecture) -> 2 + 2.
    assert _counts(await client.get(f"{SUBJECTS}/{subject_id}/delete-preview")) == [
        {"kind": "lectures", "count": 1},
        {"kind": "files", "count": 2},
        {"kind": TEST_KIND, "count": 4},
    ]


async def test_fr12_registrert_type_med_null_utelates(
    client: AsyncClient, test_kind: dict[str, int]
) -> None:
    test_kind["value"] = 0
    await _log_in_new_user(client)
    lecture_id = await _new_lecture_in(client, await _new_subject(client))
    file_id = await _upload_file(client, lecture_id)
    assert _counts(await client.get(f"{FILES}/{file_id}/delete-preview")) == []
    assert _counts(await client.get(f"{LECTURES}/{lecture_id}/delete-preview")) == [
        {"kind": "files", "count": 1}
    ]


# --- Ownership ---------------------------------------------------------------


async def _olas_items(client: AsyncClient) -> dict[str, str]:
    """Ola's subject, lecture and file; then Klara is logged in (with her own)."""
    await _log_in_new_user(client, "ola@eksempel.no")
    subject_id = await _new_subject(client, "Olas emne")
    lecture_id = await _new_lecture_in(client, subject_id, "Olas forelesning")
    file_id = await _upload_file(client, lecture_id)
    await _log_in_new_user(client, "klara@eksempel.no")
    klara_lecture = await _new_lecture_in(client, await _new_subject(client), "Klaras")
    await _upload_file(client, klara_lecture)
    return {"subject": subject_id, "lecture": lecture_id, "file": file_id}


@pytest.mark.parametrize("kind", ["subject", "lecture", "file"])
@pytest.mark.parametrize("method", ["GET", "DELETE"])
async def test_fr4_andres_ukjent_og_ugyldig_id_gir_lik_404(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path, kind: str, method: str
) -> None:
    olas = await _olas_items(client)
    before = await _row_counts(engine)
    pdfs_before = sorted(upload_dir.rglob("*.pdf"))
    base = {"subject": SUBJECTS, "lecture": LECTURES, "file": FILES}[kind]
    suffix = "/delete-preview" if method == "GET" else ""

    others = await client.request(method, f"{base}/{olas[kind]}{suffix}")
    unknown = await client.request(method, f"{base}/{uuid.uuid4()}{suffix}")
    malformed = await client.request(method, f"{base}/ikke-en-id{suffix}")
    for response in (others, unknown, malformed):
        assert response.status_code == 404
        assert response.json() == NOT_FOUND
    assert others.content == unknown.content
    assert await _row_counts(engine) == before
    assert sorted(upload_dir.rglob("*.pdf")) == pdfs_before


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", f"{FILES}/{{id}}/delete-preview"),
        ("DELETE", f"{FILES}/{{id}}"),
        ("GET", f"{LECTURES}/{{id}}/delete-preview"),
        ("DELETE", f"{LECTURES}/{{id}}"),
        ("GET", f"{SUBJECTS}/{{id}}/delete-preview"),
        ("DELETE", f"{SUBJECTS}/{{id}}"),
    ],
)
async def test_fr4_sletteruter_krever_innlogging(client: AsyncClient, method: str, path: str) -> None:
    client.cookies.clear()
    response = await client.request(method, path.format(id=uuid.uuid4()))
    assert response.status_code == 401
    assert _code(response) == "UNAUTHENTICATED"


# --- Delete ------------------------------------------------------------------


async def test_fr6_slett_emne_fjerner_alt_under_og_pdf_ene_men_ikke_andres(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path
) -> None:
    # Ola has his own subject with a file; it must survive.
    ola_id = await _log_in_new_user(client, "ola@eksempel.no")
    ola_file = await _upload_file(client, await _new_lecture_in(client, await _new_subject(client, "Olas")))

    user_id = await _log_in_new_user(client, "klara@eksempel.no")
    kept_subject = await _new_subject(client, "Beholdes")
    kept_file = await _upload_file(client, await _new_lecture_in(client, kept_subject, "Igjen"))
    subject_id = await _new_subject(client, "Slettes")
    first = await _new_lecture_in(client, subject_id, "Uke 37")
    second = await _new_lecture_in(client, subject_id, "Uke 38")
    doomed = [await _upload_file(client, first), await _upload_file(client, first), await _upload_file(client, second)]
    assert all(_pdf_path(upload_dir, user_id, file_id).exists() for file_id in doomed)

    response = await client.delete(f"{SUBJECTS}/{subject_id}")

    assert response.status_code == 204
    assert response.content == b""
    async with async_sessionmaker(engine)() as session:
        assert await session.get(Subject, uuid.UUID(subject_id)) is None
        lectures = await session.scalar(
            select(func.count()).select_from(Lecture).where(Lecture.subject_id == uuid.UUID(subject_id))
        )
        assert lectures == 0
        doomed_ids = [uuid.UUID(file_id) for file_id in doomed]
        assert await session.scalar(select(func.count()).select_from(File).where(File.id.in_(doomed_ids))) == 0
        assert (
            await session.scalar(select(func.count()).select_from(FilePage).where(FilePage.file_id.in_(doomed_ids)))
            == 0
        )
    assert not any(_pdf_path(upload_dir, user_id, file_id).exists() for file_id in doomed)
    # Her other subject and Ola's data are untouched.
    assert _pdf_path(upload_dir, user_id, kept_file).exists()
    assert _pdf_path(upload_dir, ola_id, ola_file).exists()
    assert await _row_counts(engine) == {"subjects": 2, "lectures": 2, "files": 2, "file_pages": 4}
    assert (await client.get(f"{SUBJECTS}/{subject_id}")).status_code == 404


async def test_fr7_slett_forelesning_fjerner_filene_sidene_og_pdf_ene(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path
) -> None:
    user_id = await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    lecture_id = await _new_lecture_in(client, subject_id, "Slettes")
    other_lecture = await _new_lecture_in(client, subject_id, "Beholdes")
    doomed = [await _upload_file(client, lecture_id), await _upload_file(client, lecture_id)]
    kept = await _upload_file(client, other_lecture)

    response = await client.delete(f"{LECTURES}/{lecture_id}")

    assert response.status_code == 204
    assert response.content == b""
    assert (await client.get(f"{LECTURES}/{lecture_id}")).status_code == 404
    assert (await client.get(f"{LECTURES}/{other_lecture}")).status_code == 200
    assert await _row_counts(engine) == {"subjects": 1, "lectures": 1, "files": 1, "file_pages": 2}
    assert not any(_pdf_path(upload_dir, user_id, file_id).exists() for file_id in doomed)
    assert _pdf_path(upload_dir, user_id, kept).exists()


async def test_fr14_slett_en_av_to_filer_fjerner_bare_den(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path
) -> None:
    user_id = await _log_in_new_user(client)
    lecture_id = await _new_lecture_in(client, await _new_subject(client))
    doomed = await _upload_file(client, lecture_id, "en.pdf")
    kept = await _upload_file(client, lecture_id, "to.pdf")

    response = await client.delete(f"{FILES}/{doomed}")

    assert response.status_code == 204
    assert response.content == b""
    remaining = (await client.get(f"{LECTURES}/{lecture_id}/files")).json()
    assert [file["id"] for file in remaining] == [kept]
    assert await _row_counts(engine) == {"subjects": 1, "lectures": 1, "files": 1, "file_pages": 2}
    assert not _pdf_path(upload_dir, user_id, doomed).exists()
    assert _pdf_path(upload_dir, user_id, kept).exists()
    # Deleting it again: it is gone, so 404.
    second = await client.delete(f"{FILES}/{doomed}")
    assert second.status_code == 404
    assert second.json() == NOT_FOUND


async def test_ar8_diskfeil_logges_med_fil_id_og_svaret_er_204(
    client: AsyncClient,
    engine: AsyncEngine,
    upload_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    user_id = await _log_in_new_user(client)
    lecture_id = await _new_lecture_in(client, await _new_subject(client))
    failing = await _upload_file(client, lecture_id, "hemmelig-navn.pdf")
    other = await _upload_file(client, lecture_id, "annen.pdf")
    real_delete = storage.delete_pdf

    def flaky_delete(owner: uuid.UUID, file_id: uuid.UUID) -> None:
        if str(file_id) == failing:
            raise OSError("disk full")
        real_delete(owner, file_id)

    monkeypatch.setattr(storage, "delete_pdf", flaky_delete)
    with caplog.at_level(logging.ERROR):
        response = await client.delete(f"{LECTURES}/{lecture_id}")

    assert response.status_code == 204
    assert await _row_counts(engine) == {"subjects": 1, "lectures": 0, "files": 0, "file_pages": 0}
    # The other PDF is still removed; the failing one is left on the disk.
    assert not _pdf_path(upload_dir, user_id, other).exists()
    assert _pdf_path(upload_dir, user_id, failing).exists()
    errors = [record for record in caplog.records if record.levelno >= logging.ERROR]
    assert len(errors) == 1
    logged = caplog.text
    assert failing in logged
    assert "hemmelig-navn" not in logged
    assert "Side én" not in logged


@pytest.mark.parametrize("kind", ["file", "lecture", "subject"])
async def test_ar8_pdf_slettes_ikke_foer_commit(
    client: AsyncClient, upload_dir: Path, monkeypatch: pytest.MonkeyPatch, kind: str
) -> None:
    user_id = await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    lecture_id = await _new_lecture_in(client, subject_id)
    file_ids = [await _upload_file(client, lecture_id), await _upload_file(client, lecture_id)]
    path = {
        "file": f"{FILES}/{file_ids[0]}",
        "lecture": f"{LECTURES}/{lecture_id}",
        "subject": f"{SUBJECTS}/{subject_id}",
    }[kind]

    async def failing_commit(_self: AsyncSession) -> None:
        raise RuntimeError("commit failed")

    with monkeypatch.context() as patch, pytest.raises(RuntimeError):
        patch.setattr(AsyncSession, "commit", failing_commit)
        await client.delete(path)

    assert all(_pdf_path(upload_dir, user_id, file_id).exists() for file_id in file_ids)
    assert (await client.get(f"{path}/delete-preview")).status_code == 200


def test_fr12_hver_registrert_type_har_navn_i_meldingsfila() -> None:
    text = MESSAGES_FILE.read_text(encoding="utf-8")
    block = text[text.index("export const countNouns") :]
    block = block[: block.index("};") + 2]
    nouns = set(re.findall(r"^\s*([a-z][a-z0-9_]*)\s*:", block, flags=re.MULTILINE))
    assert {"lectures", "files"} <= nouns
    # Flashcards since story 3.7; guards the content types later epics register.
    missing = sorted(set(registry.registered_kinds()) - nouns)
    assert not missing, f"Missing in countNouns in frontend/lib/messages.ts: {', '.join(missing)}"


@pytest.mark.parametrize("kind", ["lectures", "files"])
def test_ar7_reserverte_typer_kan_ikke_registreres(kind: str) -> None:
    async def count(_session: AsyncSession, _scope: DeleteScope) -> int:
        return 1

    with pytest.raises(ValueError):
        register_counter(kind, count)
    assert kind not in registry._counters
