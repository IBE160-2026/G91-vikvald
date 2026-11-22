"""Flashcards in the delete confirmations, and no delete while a job runs
(FR-12, FR-5, FR-13, AR-7).

The cards are made by the mock pipeline from the fixed test file (5 cards), as
in test_flashcards.py. A running job is a Job row with status="running", as in
test_jobs.py.
"""

import ast
import uuid
from pathlib import Path

import pytest
from httpx import AsyncClient, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.modules.content import registry
from app.modules.content.models import Flashcard
from app.modules.generation.models import Job
from app.modules.generation.service import no_running_jobs
from tests.test_account_delete import _user_count
from tests.test_delete import _pdf_path, _row_counts
from tests.test_files import _log_in_new_user, _upload, make_pdf
from tests.test_jobs import FIXTURE, _finish_jobs, _start, no_jobs_left
from tests.test_lectures import _create_lecture, _new_subject
from tests.test_subjects import _code

# Fixture used by the tests below (imported so pytest finds it here).
__all__ = ["no_jobs_left"]

FILES = "/api/files"
LECTURES = "/api/lectures"
SUBJECTS = "/api/subjects"
ACCOUNT = "/api/identity/me"
FILES_MODULE = Path(__file__).resolve().parents[1] / "app" / "modules" / "files"


async def _lecture_with_cards(client: AsyncClient, subject_id: str, name: str = "Uke 37") -> tuple[str, str]:
    """A lecture with the fixed test file and its 5 cards. Returns (lecture, file)."""
    lecture_id = (await _create_lecture(client, subject_id, name)).json()["id"]
    upload = await _upload(client, lecture_id, FIXTURE.read_bytes(), "definisjoner.pdf")
    assert upload.status_code == 201
    assert (await _start(client, lecture_id)).status_code == 202
    await _finish_jobs()
    return lecture_id, upload.json()["id"]


async def _flashcard_count(engine: AsyncEngine) -> int:
    async with async_sessionmaker(engine)() as session:
        return await session.scalar(select(func.count()).select_from(Flashcard)) or 0


async def _running_job(engine: AsyncEngine, lecture_id: str) -> None:
    async with async_sessionmaker(engine)() as session:
        session.add(
            Job(lecture_id=uuid.UUID(lecture_id), kind="flashcards", params={}, status="running", requested=20)
        )
        await session.commit()


def _counts(response: Response) -> list[dict[str, object]]:
    assert response.status_code == 200
    return response.json()["counts"]


# --- The registry ------------------------------------------------------------


def test_ar7_flashcards_og_quizsporsmal_er_innmeldt_for_typer_som_kommer_senere() -> None:
    async def count(_session: AsyncSession, _scope: registry.DeleteScope) -> int:
        return 1

    registry.register_counter("later_kind", count)
    try:
        assert registry.registered_kinds() == ["flashcards", "quiz_questions", "later_kind"]
    finally:
        registry.unregister_counter("later_kind")


def test_ar7_files_importerer_aldri_generation() -> None:
    for path in FILES_MODULE.rglob("*.py"):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                assert not (node.module or "").startswith("app.modules.generation"), path
            elif isinstance(node, ast.Import):
                assert not any(alias.name.startswith("app.modules.generation") for alias in node.names), path


# --- Preview -----------------------------------------------------------------


async def test_fr12_forhandsvisning_teller_flashcards_for_fil_forelesning_og_emne(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    lecture_id, file_id = await _lecture_with_cards(client, subject_id)
    # A second file without cards in the same lecture.
    assert (await _upload(client, lecture_id, make_pdf(["Ingen definisjoner her"]))).status_code == 201
    await _lecture_with_cards(client, subject_id, "Uke 38")

    # The file (also what the replace dialog shows): only its own cards.
    assert _counts(await client.get(f"{FILES}/{file_id}/delete-preview")) == [{"kind": "flashcards", "count": 5}]
    assert _counts(await client.get(f"{LECTURES}/{lecture_id}/delete-preview")) == [
        {"kind": "files", "count": 2},
        {"kind": "flashcards", "count": 5},
    ]
    assert _counts(await client.get(f"{SUBJECTS}/{subject_id}/delete-preview")) == [
        {"kind": "lectures", "count": 2},
        {"kind": "files", "count": 3},
        {"kind": "flashcards", "count": 10},
    ]


async def test_fr12_modellkort_telles_ikke(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    _, file_id = await _lecture_with_cards(client, await _new_subject(client))
    async with async_sessionmaker(engine)() as session:
        session.add(Flashcard(file_id=uuid.UUID(file_id), kind="model", front="AIDA", back=None, page_no=1))
        await session.commit()
    assert _counts(await client.get(f"{FILES}/{file_id}/delete-preview")) == [{"kind": "flashcards", "count": 5}]


async def test_fr5_kontoens_forhandsvisning_teller_flashcards_og_ikke_andres(client: AsyncClient) -> None:
    await _log_in_new_user(client, "ola@eksempel.no")
    await _lecture_with_cards(client, await _new_subject(client))
    await _log_in_new_user(client, "klara@eksempel.no")
    await _lecture_with_cards(client, await _new_subject(client))

    response = await client.get(f"{ACCOUNT}/delete-preview")

    assert response.status_code == 200
    assert response.json() == {
        "counts": [
            {"kind": "subjects", "count": 1},
            {"kind": "lectures", "count": 1},
            {"kind": "files", "count": 1},
            {"kind": "flashcards", "count": 5},
        ],
        "content_kinds": ["flashcards", "quiz_questions"],
    }


async def test_fr12_slett_fil_tar_kortene_med(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    _, file_id = await _lecture_with_cards(client, await _new_subject(client))
    assert await _flashcard_count(engine) == 5
    assert (await client.delete(f"{FILES}/{file_id}")).status_code == 204
    assert await _flashcard_count(engine) == 0


# --- No delete while a job runs (AR-7) ---------------------------------------


@pytest.mark.parametrize("target", ["file", "replace", "lecture", "subject", "account"])
async def test_ar7_jobb_som_pagar_gir_409_og_ingenting_slettes(
    client: AsyncClient, engine: AsyncEngine, upload_dir: Path, target: str
) -> None:
    user_id = await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    lecture_id, file_id = await _lecture_with_cards(client, subject_id)
    # The job runs on another lecture in the same subject: the subject and the
    # account are still blocked, the file and lecture by their own job below.
    busy_lecture = lecture_id if target in ("file", "replace", "lecture") else (
        (await _create_lecture(client, subject_id, "Uke 38")).json()["id"]
    )
    await _running_job(engine, busy_lecture)
    rows_before = await _row_counts(engine)
    cards_before = await _flashcard_count(engine)

    if target == "file":
        response = await client.delete(f"{FILES}/{file_id}")
    elif target == "replace":
        files = {"file": ("ny.pdf", make_pdf(["Ny side"]), "application/pdf")}
        response = await client.post(f"{FILES}/{file_id}/replace", files=files)
    elif target == "lecture":
        response = await client.delete(f"{LECTURES}/{lecture_id}")
    elif target == "subject":
        response = await client.delete(f"{SUBJECTS}/{subject_id}")
    else:
        response = await client.delete(ACCOUNT)

    assert response.status_code == 409
    assert _code(response) == "JOB_ALREADY_RUNNING"
    assert await _row_counts(engine) == rows_before
    assert await _flashcard_count(engine) == cards_before
    assert await _user_count(engine) == 1
    assert _pdf_path(upload_dir, user_id, file_id).exists()
    assert len(list(upload_dir.rglob("*.pdf"))) == 1
    # Still logged in after a refused account delete.
    assert (await client.get(f"{SUBJECTS}/{subject_id}")).status_code == 200


async def test_ar7_jobb_i_et_annet_emne_stopper_ikke_sletting(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    busy, _ = await _lecture_with_cards(client, await _new_subject(client, "Opptatt"))
    subject_id = await _new_subject(client, "Ledig")
    lecture_id, file_id = await _lecture_with_cards(client, subject_id)
    await _running_job(engine, busy)

    assert (await client.delete(f"{FILES}/{file_id}")).status_code == 204
    assert (await client.delete(f"{LECTURES}/{lecture_id}")).status_code == 204
    assert (await client.delete(f"{SUBJECTS}/{subject_id}")).status_code == 204


async def test_ar7_ferdig_jobb_stopper_ikke_sletting(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    lecture_id, file_id = await _lecture_with_cards(client, await _new_subject(client))
    # The job that made the cards is done.
    assert (await client.delete(f"{FILES}/{file_id}")).status_code == 204
    assert (await client.delete(f"{LECTURES}/{lecture_id}")).status_code == 204


def test_ar7_generation_har_meldt_inn_vakten() -> None:
    assert no_running_jobs in registry._guards
