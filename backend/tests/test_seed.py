"""The seeded test user and sample subject (story 6.4: NFR-3, AR-14), and the
sample notes it uploads."""

import logging
import subprocess
import uuid
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import pytest
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.core.config import Settings
from app.modules.content.models import Flashcard, QuizQuestion
from app.modules.files.models import File
from app.modules.generation import flashcards
from app.modules.generation.flashcards import definition_term, normalise, sentences
from app.modules.generation.mock import MockGenerator
from app.modules.generation.models import JOB_DONE, Job
from app.modules.generation.registry import (
    ContentType,
    ValidItem,
    enabled_content_types,
    register_content_type,
    unregister_content_type,
)
from app.modules.identity.models import User
from app.modules.identity.service import authenticate, register_user
from app.modules.practice.models import PracticeSession
from app.modules.practice.service import overview
from app.modules.subjects.models import Lecture, Subject
from app.seed import __main__ as seed_main
from app.seed import service as seed_service
from app.seed.build_notes import NOTES_DIR, build_pdf, is_note, note_sources, plain_text
from app.seed.service import LECTURES, SUBJECT_NAME, TEST_EMAIL, TEST_PASSWORD, seed_if_empty

BACKEND = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND.parent
PLACEHOLDER = "PLASSHOLDER – skrives av Silje"
OPENSTAX_URL = "https://openstax.org/details/books/principles-marketing"
NOTE_NAMES = ("markedsmiksen", "segmentering", "aida")
# The definitions in each note, in order: the fronts of the mock model's cards.
EXPECTED_FRONTS = {
    "Markedsmiksen": ["Markedsmiksen", "Et produkt", "Prisen", "Distribusjon", "Markedskommunikasjon"],
    "Segmentering og målgrupper": ["Segmentering", "Et segment", "En målgruppe", "Posisjonering", "Differensiering"],
    "AIDA-modellen": ["AIDA-modellen", "Oppmerksomhet", "Interesse", "Begjær", "Handling"],
}
EXTRA_KIND = "test-summary"


def _settings(**values: Any) -> Settings:
    defaults: dict[str, Any] = {"APP_ENV": "local", "LLM_PROVIDER": "mock"}
    defaults.update(values)
    return Settings(**defaults)


@pytest.fixture
def sessionmaker(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False)


async def _count(sessionmaker: async_sessionmaker[AsyncSession], model: Any) -> int:
    async with sessionmaker() as session:
        return int(await session.scalar(select(func.count()).select_from(model)) or 0)


async def _all_counts(sessionmaker: async_sessionmaker[AsyncSession]) -> dict[str, int]:
    models = (User, Subject, Lecture, File, Job, Flashcard, QuizQuestion, PracticeSession)
    return {model.__tablename__: await _count(sessionmaker, model) for model in models}


async def _lectures(sessionmaker: async_sessionmaker[AsyncSession]) -> list[Lecture]:
    async with sessionmaker() as session:
        return list(await session.scalars(select(Lecture).order_by(Lecture.date)))


# --- The seed --------------------------------------------------------------


async def test_nfr3_seed_creates_test_user_and_subject(
    sessionmaker: async_sessionmaker[AsyncSession], upload_dir: Path
) -> None:
    assert await seed_if_empty(sessionmaker, _settings()) is True
    today = date.today()

    async with sessionmaker() as session:
        user = await authenticate(session, TEST_EMAIL, TEST_PASSWORD)
        assert user.terms_accepted_at is not None
        subjects = list(await session.scalars(select(Subject)))
    assert [(subject.name, subject.exam_date) for subject in subjects] == [(SUBJECT_NAME, today + timedelta(days=21))]

    lectures = await _lectures(sessionmaker)
    assert [(lecture.name, lecture.date) for lecture in lectures] == [
        ("Markedsmiksen", today - timedelta(days=21)),
        ("Segmentering og målgrupper", today - timedelta(days=14)),
        ("AIDA-modellen", today - timedelta(days=7)),
    ]
    async with sessionmaker() as session:
        for lecture in lectures:
            files = list(await session.scalars(select(File).where(File.lecture_id == lecture.id)))
            sample = next(sample for sample in LECTURES if sample.name == lecture.name)
            assert [file.original_name for file in files] == [sample.file_name]
            # The PDF is stored on the disk like an upload.
            assert (upload_dir / str(user.id) / f"{files[0].id}.pdf").read_bytes() == (NOTES_DIR / sample.file_name).read_bytes()
            fronts = list(
                await session.scalars(select(Flashcard.front).where(Flashcard.file_id == files[0].id).order_by(Flashcard.id))
            )
            assert sorted(fronts) == sorted(EXPECTED_FRONTS[lecture.name])
            questions = await session.scalar(
                select(func.count()).select_from(QuizQuestion).where(QuizQuestion.file_id == files[0].id)
            )
            assert questions == len(EXPECTED_FRONTS[lecture.name])
            kinds = sorted(await session.scalars(select(Job.kind).where(Job.lecture_id == lecture.id)))
            assert kinds == ["flashcards", "quiz"]
    assert await _count(sessionmaker, PracticeSession) == 2


async def test_ar14_seed_jobs_all_done_none_failed(sessionmaker: async_sessionmaker[AsyncSession]) -> None:
    await seed_if_empty(sessionmaker, _settings())
    async with sessionmaker() as session:
        jobs = list(await session.scalars(select(Job)))
    assert len(jobs) == len(LECTURES) * len(enabled_content_types(_settings()))
    assert {job.status for job in jobs} == {JOB_DONE}
    assert all(job.error_code is None and job.discarded == 0 for job in jobs)
    # Made the same way as POST /api/lectures/{id}/jobs: quiz gets the default difficulty.
    assert {job.kind: job.params for job in jobs} == {
        "flashcards": {"requested": 20},
        "quiz": {"requested": 20, "difficulty": "medium"},
    }


async def test_ar14_seed_only_when_empty_and_local(
    sessionmaker: async_sessionmaker[AsyncSession], caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.INFO, logger="app.seed.service")

    # Not local: nothing.
    assert await seed_if_empty(sessionmaker, _settings(APP_ENV="production", JWT_SECRET="x" * 40)) is False
    assert await _count(sessionmaker, User) == 0
    assert "Seed skipped: APP_ENV is not local" in caplog.text

    # Local and empty: seeded. A second start: nothing more.
    assert await seed_if_empty(sessionmaker, _settings()) is True
    before = await _all_counts(sessionmaker)
    caplog.clear()
    assert await seed_if_empty(sessionmaker, _settings()) is False
    assert await _all_counts(sessionmaker) == before
    assert "Seed skipped: the database already has accounts" in caplog.text
    async with sessionmaker() as session:
        assert await session.scalar(select(func.count()).select_from(User).where(User.email == TEST_EMAIL)) == 1
        assert await session.scalar(select(func.count()).select_from(Subject).where(Subject.name == SUBJECT_NAME)) == 1


async def test_ar14_seed_does_nothing_when_another_account_exists(
    sessionmaker: async_sessionmaker[AsyncSession],
) -> None:
    async with sessionmaker() as session:
        await register_user(session, "klara@eksempel.no", "hemmelig1")
    assert await seed_if_empty(sessionmaker, _settings()) is False
    counts = await _all_counts(sessionmaker)
    assert counts.pop("users") == 1
    assert set(counts.values()) == {0}


async def test_ar14_seed_uses_mock_model_even_with_vertex(
    sessionmaker: async_sessionmaker[AsyncSession], monkeypatch: pytest.MonkeyPatch
) -> None:
    def no_vertex(*_args: Any) -> Any:
        raise AssertionError("the seed must not build the Vertex generator")

    monkeypatch.setattr("app.modules.generation.providers._vertex_generator", no_vertex)
    settings = _settings(LLM_PROVIDER="vertex", GOOGLE_CLOUD_PROJECT="et-prosjekt", VERTEX_MODEL="gemini-3.5-flash")
    assert await seed_if_empty(sessionmaker, settings) is True
    async with sessionmaker() as session:
        assert set(await session.scalars(select(Job.status))) == {JOB_DONE}
    assert await _count(sessionmaker, Flashcard) == sum(len(fronts) for fronts in EXPECTED_FRONTS.values())


async def test_ar14_seed_failure_deletes_test_user_and_logs_error_type(
    sessionmaker: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
    upload_dir: Path,
) -> None:
    async def broken_save_session(*_args: Any) -> None:
        raise RuntimeError("Markedsmiksen er settet av verktøy")

    monkeypatch.setattr(seed_service, "save_session", broken_save_session)
    caplog.set_level(logging.INFO)
    assert await seed_if_empty(sessionmaker, _settings()) is False

    assert set((await _all_counts(sessionmaker)).values()) == {0}
    # Her folder on the disk is gone too.
    assert not upload_dir.exists() or list(upload_dir.iterdir()) == []
    errors = [record for record in caplog.records if record.levelno == logging.ERROR and record.name == "app.seed.service"]
    assert [record.getMessage() for record in errors] == ["Seed failed: RuntimeError"]
    # Only the kind of error: never the message, note text or the password.
    assert "Markedsmiksen er" not in caplog.text
    assert TEST_PASSWORD not in caplog.text

    # The next start tries again and succeeds.
    monkeypatch.undo()
    assert await seed_if_empty(sessionmaker, _settings()) is True


async def test_ar14_seed_failed_job_counts_as_failure(
    sessionmaker: async_sessionmaker[AsyncSession], monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    original = MockGenerator.generate

    async def failing_quiz(self: MockGenerator, kind: str, *args: Any) -> Any:
        if kind == "quiz":
            raise RuntimeError("model down")
        return await original(self, kind, *args)

    monkeypatch.setattr(MockGenerator, "generate", failing_quiz)
    assert await seed_if_empty(sessionmaker, _settings()) is False
    assert set((await _all_counts(sessionmaker)).values()) == {0}
    assert "Seed failed: SeedError" in caplog.text


class _Summary(BaseModel):
    file_id: uuid.UUID
    page_no: int


@pytest.fixture
def extra_type() -> Any:
    """A content type behind FEATURE_SUMMARY, saving its items in a list."""
    saved: list[ValidItem] = []

    async def no_keys(_session: AsyncSession, _lecture_id: uuid.UUID) -> frozenset[str]:
        return frozenset()

    async def save(_session: AsyncSession, items: list[ValidItem]) -> None:
        saved.extend(items)

    register_content_type(
        ContentType(
            kind=EXTRA_KIND,
            mock_rule=flashcards.mock_rule,
            loose_model=_Summary,
            validate_item=lambda item, _pages: _Summary.model_validate(item),
            existing_keys=no_keys,
            save=save,
            instructions_file=flashcards.INSTRUCTIONS_FILE,
            break_item=flashcards.break_item,
            feature="summary",
        )
    )
    yield saved
    unregister_content_type(EXTRA_KIND)


async def test_ar14_seed_includes_enabled_extra_type(
    sessionmaker: async_sessionmaker[AsyncSession], extra_type: list[ValidItem]
) -> None:
    assert await seed_if_empty(sessionmaker, _settings(FEATURE_SUMMARY=True)) is True
    async with sessionmaker() as session:
        statuses = list(await session.scalars(select(Job.status).where(Job.kind == EXTRA_KIND)))
    assert statuses == [JOB_DONE] * len(LECTURES)
    assert len(extra_type) == sum(len(fronts) for fronts in EXPECTED_FRONTS.values())


async def test_ar14_seed_skips_disabled_extra_type(
    sessionmaker: async_sessionmaker[AsyncSession], extra_type: list[ValidItem]
) -> None:
    assert await seed_if_empty(sessionmaker, _settings(FEATURE_SUMMARY=False)) is True
    async with sessionmaker() as session:
        assert list(await session.scalars(select(Job).where(Job.kind == EXTRA_KIND))) == []
    assert extra_type == []
    assert [content_type.kind for content_type in enabled_content_types(_settings(FEATURE_SUMMARY=False))] == [
        "flashcards",
        "quiz",
    ]


async def test_nfr3_overview_shows_practised_and_not_practised(sessionmaker: async_sessionmaker[AsyncSession]) -> None:
    await seed_if_empty(sessionmaker, _settings())
    async with sessionmaker() as session:
        user = await authenticate(session, TEST_EMAIL, TEST_PASSWORD)
        result = await overview(session, user.id)
    [subject] = result.subjects
    assert [(lecture.name, lecture.practiced) for lecture in subject.lectures] == [
        ("Markedsmiksen", True),
        ("Segmentering og målgrupper", False),
        ("AIDA-modellen", False),
    ]
    assert subject.last_session is not None


def test_ar14_start_sh_runs_alembic_then_seed_then_uvicorn() -> None:
    script = (BACKEND / "start.sh").read_text(encoding="utf-8")
    alembic = script.index("\nalembic upgrade head")
    seed = script.index("\npython -m app.seed")
    uvicorn = script.index("\nexec uvicorn")
    assert alembic < seed < uvicorn
    # A failing seed never stops the start (the script uses set -e).
    assert "python -m app.seed ||" in script


class _KeptEngine:
    """Stands in for the app's engine: main() disposes it at the end, which
    would drop the in-memory test database."""

    async def dispose(self) -> None:
        pass


@pytest.fixture
def main_on_test_db(sessionmaker: async_sessionmaker[AsyncSession], monkeypatch: pytest.MonkeyPatch) -> None:
    """python -m app.seed against the test database, without touching the app's
    engine or the global logging setup."""
    monkeypatch.setattr("app.core.db.SessionLocal", sessionmaker)
    monkeypatch.setattr("app.core.db.engine", _KeptEngine())
    monkeypatch.setattr(logging, "basicConfig", lambda **_kwargs: None)


@pytest.mark.usefixtures("main_on_test_db")
def test_ar14_seed_main_seeds_the_database(sessionmaker: async_sessionmaker[AsyncSession]) -> None:
    import asyncio

    assert seed_main.main() == 0

    async def check() -> None:
        async with sessionmaker() as session:
            await authenticate(session, TEST_EMAIL, TEST_PASSWORD)

    asyncio.run(check())


@pytest.mark.usefixtures("main_on_test_db")
def test_ar14_seed_main_always_exits_with_zero(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[bool] = []

    async def broken(*_args: Any) -> bool:
        calls.append(True)
        raise RuntimeError("database down")

    monkeypatch.setattr(seed_service, "seed_if_empty", broken)
    assert seed_main.main() == 0
    assert calls == [True]


# --- The sample notes --------------------------------------------------------


def _notes() -> list[Path]:
    return [path for path in note_sources() if is_note(path)]


def test_nfr3_three_notes_with_pdfs() -> None:
    assert sorted(path.stem for path in _notes()) == sorted(NOTE_NAMES)
    for sample in LECTURES:
        assert (NOTES_DIR / sample.file_name).with_suffix(".md").exists()


@pytest.mark.parametrize("name", NOTE_NAMES)
def test_nfr3_note_is_marked_placeholder(name: str) -> None:
    lines = (NOTES_DIR / f"{name}.md").read_text(encoding="utf-8").splitlines()
    assert lines[0] == PLACEHOLDER


@pytest.mark.parametrize("name", NOTE_NAMES)
def test_nfr3_note_has_definitions_and_a_bullet_list(name: str) -> None:
    source = (NOTES_DIR / f"{name}.md").read_text(encoding="utf-8")
    text = plain_text(source)
    definitions = [sentence for sentence in sentences(text) if definition_term(sentence) is not None]
    assert len(definitions) >= 4
    assert all(" er " in sentence for sentence in definitions)
    # «er» only in the definitions, so no other sentence becomes a card.
    assert [sentence for sentence in sentences(text) if " er " in f" {sentence} "] == definitions
    bullets = [line for line in source.splitlines() if line.startswith("• ")]
    assert len(bullets) >= 3


@pytest.mark.parametrize("name", NOTE_NAMES)
def test_nfr3_note_credits_openstax_at_the_bottom(name: str) -> None:
    lines = (NOTES_DIR / f"{name}.md").read_text(encoding="utf-8").strip().splitlines()
    bottom = " ".join(lines[-2:])
    assert lines[-2] == "# Kilde"
    for part in ("OpenStax", "Principles of Marketing", OPENSTAX_URL, "endret", "CC BY-NC-SA 4.0"):
        assert part in bottom


@pytest.mark.parametrize("name", NOTE_NAMES)
def test_nfr3_note_pdf_text_matches_source(name: str) -> None:
    from app.modules.files.pdf import read_pages

    source = (NOTES_DIR / f"{name}.md").read_text(encoding="utf-8")
    data = (NOTES_DIR / f"{name}.pdf").read_bytes()
    pages = read_pages(data)
    assert normalise(" ".join(page.text for page in pages)) == normalise(plain_text(source))
    # The PDF is up to date: `python -m app.seed.build_notes` gives the same bytes.
    assert build_pdf(source) == data


def test_nfr3_notes_licence_file() -> None:
    licence = (NOTES_DIR / "LISENS.md").read_text(encoding="utf-8")
    for part in ("CC BY-NC-SA 4.0", "OpenStax", "Principles of Marketing", OPENSTAX_URL, "PLASSHOLDER", "#13"):
        assert part in licence


def test_nfr3_no_other_pdfs_in_repo() -> None:
    """No OpenStax PDF (or any other) is checked in: only the three notes and
    the fixed test file."""
    try:
        listed = subprocess.run(
            ["git", "ls-files", "-co", "--exclude-standard", "*.pdf"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=True,
        ).stdout.split()
    except (OSError, subprocess.CalledProcessError):
        pytest.skip("git is not available")
    allowed = {f"backend/app/seed/notater/{name}.pdf" for name in NOTE_NAMES} | {"backend/tests/fixtures/definisjoner.pdf"}
    assert set(listed) <= allowed
