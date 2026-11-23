"""Quiz questions as a content type (story 4.1): the mock rule (NFR-2a), the
invalid mock (SK-4), validate_item, the shuffle when saved, the instructions
with the difficulty (FR-31), the job over HTTP with scope and difficulty (FR-28, FR-29,
FR-30, FR-33, FR-38), the counts and delete preview (AR-7, FR-12), the delete
guard, the cascade and the migration (AR-13)."""

import asyncio
import sqlite3
import typing
import uuid
from pathlib import Path
from typing import Any

import pytest
from alembic import command
from alembic.config import Config
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.core.config import get_settings
from app.main import app
from app.modules.content import registry as content_registry
from app.modules.content.models import QuizQuestion
from app.modules.content.service import shuffle_options
from app.modules.generation import quiz, schemas
from app.modules.generation.mock import InvalidMockGenerator, MockGenerator
from app.modules.generation.port import GenerationOptions, Page
from app.modules.generation.providers import get_generator
from app.modules.generation.registry import get_content_type
from app.modules.generation.vertex import instructions_for
from tests.test_files import _log_in_new_user, _new_lecture, _upload
from tests.test_generation import FILE_ID, fixture_pages
from tests.test_jobs import (
    FIXTURE,
    _finish_jobs,
    _latest,
    definitions,
    no_jobs_left,
    pdf_with_pages,
)
from tests.test_lectures import _create_lecture, _new_subject
from tests.test_subjects import NOT_FOUND, _code

# Fixture used by the tests below (imported so pytest finds it here).
__all__ = ["no_jobs_left"]

BACKEND_DIR = Path(__file__).resolve().parents[1]
LECTURES = "/api/lectures"
FILES = "/api/files"
QUIZ = {"kind": "quiz", "params": {"requested": 20, "difficulty": "medium"}}


def options(existing: set[str] | None = None, difficulty: str | None = "medium") -> GenerationOptions:
    return GenerationOptions(requested=20, existing_keys=frozenset(existing or set()), difficulty=difficulty)


def distinct_definitions(terms: list[str]) -> str:
    """Definition sentences with a different answer for each term (the helper
    in test_jobs gives every term the same answer, which a quiz question
    cannot use as its options)."""
    return " ".join(f"{term} er begrepet som heter {term.lower()} i faget." for term in terms)


async def _start_quiz(client: AsyncClient, lecture_id: str, body: dict[str, Any] | None = None) -> Any:
    return await client.post(f"{LECTURES}/{lecture_id}/jobs", json=body or QUIZ)


async def _questions(engine: AsyncEngine) -> list[QuizQuestion]:
    async with async_sessionmaker(engine)() as session:
        statement = select(QuizQuestion).order_by(QuizQuestion.created_at, QuizQuestion.page_no)
        return list(await session.scalars(statement))


async def _question_count(engine: AsyncEngine) -> int:
    async with async_sessionmaker(engine)() as session:
        return await session.scalar(select(func.count()).select_from(QuizQuestion)) or 0


async def _counts(client: AsyncClient, lecture_id: str) -> dict[str, int]:
    response = await client.get(f"{LECTURES}/{lecture_id}/content-counts")
    assert response.status_code == 200
    return response.json()


@pytest.fixture
async def lecture(client: AsyncClient) -> str:
    """A lecture belonging to a logged-in student, with the fixed test file."""
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    assert (await _upload(client, lecture_id, FIXTURE.read_bytes(), "definisjoner.pdf")).status_code == 201
    return lecture_id


# --- The mock rule (NFR-2a) --------------------------------------------------


async def test_nfr2a_mock_gir_ett_sporsmal_per_definisjon_i_leserekkefolge() -> None:
    questions = await MockGenerator().generate("quiz", fixture_pages(), options())
    assert [(q["question"], q["page_no"]) for q in questions] == [
        ("Hva er Merkevare?", 1),
        ("Hva er Segmentering?", 1),
        ("Hva er Posisjonering?", 1),
        ("Hva er A brand?", 2),
        ("Hva er The marketing mix?", 2),
    ]
    first = questions[0]
    assert first["options"] == [
        "et navn, et symbol eller en design som skiller et produkt fra andre.",
        "å dele markedet i grupper med like behov.",
        "plassen produktet har i kundens bevissthet.",
        "a promise to the customer.",
    ]
    assert first["correct_index"] == 0
    assert first["explanation"] == (
        "Merkevare er et navn, et symbol eller en design som skiller et produkt fra andre."
    )
    assert first["file_id"] == FILE_ID
    # The last one starts over from the beginning for its wrong answers.
    assert questions[4]["options"][1:] == [
        "et navn, et symbol eller en design som skiller et produkt fra andre.",
        "å dele markedet i grupper med like behov.",
        "plassen produktet har i kundens bevissthet.",
    ]


async def test_nfr2a_mock_gir_samme_sporsmal_for_samme_fil_og_alle_vanskelighetsgrader() -> None:
    first = await MockGenerator().generate("quiz", fixture_pages(), options(difficulty="easy"))
    for difficulty in ("medium", "hard", None):
        assert await MockGenerator().generate("quiz", fixture_pages(), options(difficulty=difficulty)) == first


async def test_nfr2a_faerre_enn_fire_definisjoner_gir_ingenting() -> None:
    pages = [Page(FILE_ID, 1, definitions(["En", "To", "Tre"]))]
    assert await MockGenerator().generate("quiz", pages, options()) == []


async def test_nfr2a_samme_begrep_to_ganger_teller_en_gang() -> None:
    pages = [Page(FILE_ID, 1, definitions(["En", "To", "en", "Tre", "Fire"]))]
    questions = await MockGenerator().generate("quiz", pages, options())
    assert [q["question"] for q in questions] == ["Hva er En?", "Hva er To?", "Hva er Tre?", "Hva er Fire?"]


async def test_fr33_kjente_sporsmal_hoppes_over_uten_forskjell_paa_store_og_smaa() -> None:
    questions = await MockGenerator().generate("quiz", fixture_pages(), options({"hva er merkevare?"}))
    assert [q["question"] for q in questions][0] == "Hva er Segmentering?"
    assert len(questions) == 4


async def test_sk4_ugyldig_mock_odelegger_tre_av_fire_quizsporsmal() -> None:
    items = await InvalidMockGenerator().generate("quiz", fixture_pages(), options())
    assert len(items) == 5
    pages = fixture_pages()
    valid = [item for item in items if quiz.validate_item(item, pages) is not None]
    assert [item["question"] for item in valid] == ["Hva er Merkevare?", "Hva er The marketing mix?"]


# --- validate_item -----------------------------------------------------------


def _question(**changes: object) -> dict[str, object]:
    item: dict[str, object] = {
        "question": "Hva er en merkevare?",
        "options": ["Et navn eller symbol", "En pris", "En kanal", "Et segment"],
        "correct_index": 0,
        "explanation": "Merkevare er et navn eller symbol.",
        "file_id": FILE_ID,
        "page_no": 1,
    }
    item.update(changes)
    return item


@pytest.mark.parametrize(
    "item",
    [
        _question(options=["A", "B", "C"]),
        _question(options=["A", "B", "C", "D", "E"]),
        _question(options=["A", "", "C", "D"]),
        _question(options=["A", "   ", "C", "D"]),
        _question(options=["En pris", "B", "en  PRIS ", "D"]),
        _question(options=["A", "B", "C", 4]),
        _question(options="A, B, C, D"),
        _question(options=None),
        _question(correct_index=4),
        _question(correct_index=-1),
        _question(correct_index=1.5),
        _question(correct_index="1"),
        _question(correct_index=True),
        _question(correct_index=None),
        _question(question=""),
        _question(question="  "),
        _question(explanation=""),
        _question(explanation=None),
        _question(page_no=3),
        _question(file_id=uuid.uuid4()),
        _question(page_no=True),
        _question(page_no="1"),
        "ikke et objekt",
        None,
        {},
    ],
)
def test_fr30_validate_item_forkaster_ugyldige(item: object) -> None:
    assert quiz.validate_item(item, fixture_pages()) is None


def test_fr30_validate_item_godtar_gyldig_sporsmal() -> None:
    pages = fixture_pages()
    assert quiz.validate_item(_question(), pages) is not None
    assert quiz.validate_item(_question(correct_index=3, page_no=2, file_id=str(FILE_ID)), pages) is not None


# --- The shuffle -------------------------------------------------------------


def test_fr30_blandingen_er_fast_og_riktig_svar_folger_med() -> None:
    options_in = ("riktig", "feil 1", "feil 2", "feil 3")
    shuffled, correct = shuffle_options("Hva er X?", options_in, 0)
    assert sorted(shuffled) == sorted(options_in)
    assert shuffled[correct] == "riktig"
    assert shuffle_options("Hva er X?", options_in, 0) == (shuffled, correct)


async def test_fr30_riktig_svar_staar_ikke_paa_samme_plass_i_alle(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    assert (await _start_quiz(client, lecture)).status_code == 202
    await _finish_jobs()
    questions = await _questions(engine)
    assert len(questions) == 5
    assert len({q.correct_index for q in questions}) > 1
    for question in questions:
        # The correct answer is the rest of the definition sentence.
        assert question.explanation.endswith(question.options[question.correct_index])
        assert len(question.options) == 4


# --- The instructions (FR-31) ---------------------------------------------------


@pytest.mark.parametrize(
    ("difficulty", "description"),
    [
        ("easy", "Lett: kjenne igjen en definisjon"),
        ("medium", "Middels: forstå sammenhenger"),
        ("hard", "Vanskelig: bruke stoffet på et eksempel"),
    ],
)
def test_fr31_instruksen_har_beskrivelsen_av_valgt_vanskelighetsgrad(difficulty: str, description: str) -> None:
    prompt = instructions_for("quiz", GenerationOptions(requested=10, difficulty=difficulty))
    assert description in prompt
    assert "{difficulty}" not in prompt
    others = set(quiz.DIFFICULTIES.values()) - {description}
    assert not any(other in prompt for other in others)


def test_fr29_vanskelighetsgradene_i_instruksen_og_api_et_er_de_samme() -> None:
    assert set(quiz.DIFFICULTIES) == set(typing.get_args(schemas.Difficulty))


def test_fr31_instruksen_har_reglene() -> None:
    prompt = get_content_type("quiz").instructions_file.read_text(encoding="utf-8")
    for rule in ("bare stoff", "bokmål", "(brand)", "fire svaralternativer", "nøyaktig ett", "forklaring", "page_no", "like lange", "høyst"):
        assert rule in prompt, rule


def test_ar5_quiz_er_registrert_med_vanskelighetsgrad() -> None:
    content_type = get_content_type("quiz")
    assert content_type.uses_difficulty is True
    assert content_type.loose_model is quiz.LooseQuizQuestion
    assert get_content_type("flashcards").uses_difficulty is False


# --- The job over HTTP -------------------------------------------------------


async def test_fr28_quizjobb_gir_202_og_lager_fem_sporsmal(client: AsyncClient, lecture: str) -> None:
    response = await _start_quiz(client, lecture)
    assert response.status_code == 202
    body = response.json()
    assert (body["kind"], body["status"], body["requested"]) == ("quiz", "running", 20)
    assert body["params"] == {"requested": 20, "difficulty": "medium"}
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["created"], job["discarded"]) == ("done", 5, 0)
    assert job["params"] == {"requested": 20, "difficulty": "medium"}
    assert await _counts(client, lecture) == {"flashcards": 0, "quiz_questions": 5, "model_cards": 0}


async def test_fr29_uten_vanskelighetsgrad_brukes_middels(client: AsyncClient, lecture: str) -> None:
    for body in ({"kind": "quiz"}, {"kind": "quiz", "params": {"requested": 10}}):
        response = await _start_quiz(client, lecture, body)
        assert response.status_code == 202
        assert response.json()["params"]["difficulty"] == "medium"
        await _finish_jobs()


async def test_fr29_vanskelighetsgraden_lagres_og_gis_til_porten(client: AsyncClient, lecture: str) -> None:
    seen: list[str | None] = []

    class RecordingGenerator:
        async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
            seen.append(options.difficulty)
            return []

    app.dependency_overrides[get_generator] = RecordingGenerator
    response = await _start_quiz(client, lecture, {"kind": "quiz", "params": {"requested": 30, "difficulty": "hard"}})
    assert response.json()["params"] == {"requested": 30, "difficulty": "hard"}
    await _finish_jobs()
    await client.post(f"{LECTURES}/{lecture}/jobs", json={"kind": "flashcards"})
    await _finish_jobs()
    assert seen == ["hard", None]


async def test_fr17_flashcards_lagrer_params_uten_tomme_felt(client: AsyncClient, lecture: str) -> None:
    response = await client.post(f"{LECTURES}/{lecture}/jobs", json={"kind": "flashcards"})
    assert response.json()["params"] == {"requested": 20}


@pytest.mark.parametrize(
    "body",
    [
        {"kind": "quiz", "params": {"difficulty": "lett"}},
        {"kind": "quiz", "params": {"requested": 15}},
        {"kind": "quiz", "params": {"difficulty": 2}},
        {"kind": "flashcards", "params": {"difficulty": "easy"}},
        {"kind": "flashcards", "params": {"requested": 20, "difficulty": "medium"}},
    ],
)
async def test_fr29_ugyldig_omfang_eller_vanskelighetsgrad_gir_422(
    client: AsyncClient, lecture: str, body: dict[str, Any]
) -> None:
    response = await _start_quiz(client, lecture, body)
    assert response.status_code == 422
    assert _code(response) == "VALIDATION_ERROR"
    assert await _latest(client, lecture) == []


async def test_fr30_faerre_enn_fire_definisjoner_gir_done_med_null(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    assert (await _upload(client, lecture_id, pdf_with_pages([definitions(["En", "To", "Tre"])]))).status_code == 201
    await _start_quiz(client, lecture_id)
    await _finish_jobs()
    [job] = await _latest(client, lecture_id)
    assert (job["status"], job["created"], job["discarded"]) == ("done", 0, 0)
    assert await _question_count(engine) == 0


async def test_fr33_lag_flere_med_samme_fil_lagrer_ingenting_og_beholder_de_gamle(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    await _start_quiz(client, lecture)
    await _finish_jobs()
    before = [(q.id, q.options, q.correct_index) for q in await _questions(engine)]
    await _start_quiz(client, lecture, {"kind": "quiz", "params": {"requested": 30, "difficulty": "hard"}})
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["created"]) == ("done", 0)
    assert [(q.id, q.options, q.correct_index) for q in await _questions(engine)] == before


async def test_fr33_nye_sporsmal_legges_til_de_gamle(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    assert (await _upload(client, lecture_id, pdf_with_pages([distinct_definitions(["En", "To", "Tre", "Fire"])]))).status_code == 201
    await _start_quiz(client, lecture_id)
    await _finish_jobs()
    assert (await _latest(client, lecture_id))[0]["created"] == 4
    assert (await _upload(client, lecture_id, pdf_with_pages([distinct_definitions(["Fem", "Seks", "Sju", "Åtte"])]))).status_code == 201
    await _start_quiz(client, lecture_id)
    await _finish_jobs()
    [job] = await _latest(client, lecture_id)
    assert job["created"] == 4
    assert await _counts(client, lecture_id) == {"flashcards": 0, "quiz_questions": 8, "model_cards": 0}


async def test_sk4_mock_invalid_forkaster_quizsporsmal_og_gir_faerre(
    client: AsyncClient, lecture: str, monkeypatch: pytest.MonkeyPatch, engine: AsyncEngine
) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "mock-invalid")
    get_settings.cache_clear()
    await _start_quiz(client, lecture)
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["created"], job["discarded"]) == ("done", 2, 3)
    assert [q.question for q in await _questions(engine)] == ["Hva er Merkevare?", "Hva er The marketing mix?"]


async def test_fr21_port_som_feiler_gir_failed_og_ingen_sporsmal(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    class BrokenGenerator:
        async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
            raise RuntimeError("modellen svarte ikke")

    app.dependency_overrides[get_generator] = BrokenGenerator
    await _start_quiz(client, lecture, {"kind": "quiz", "params": {"requested": 10, "difficulty": "easy"}})
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["error_code"]) == ("failed", "GENERATION_FAILED")
    # «Prøv igjen» can start with the same choices.
    assert job["params"] == {"requested": 10, "difficulty": "easy"}
    assert await _question_count(engine) == 0


async def test_sk21_quiz_mens_flashcards_kjorer_gir_409(client: AsyncClient, lecture: str) -> None:
    release = asyncio.Event()

    class WaitingGenerator:
        async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
            await release.wait()
            return []

    app.dependency_overrides[get_generator] = WaitingGenerator
    assert (await client.post(f"{LECTURES}/{lecture}/jobs", json={"kind": "flashcards"})).status_code == 202
    response = await _start_quiz(client, lecture)
    release.set()
    await _finish_jobs()
    assert response.status_code == 409
    assert _code(response) == "JOB_ALREADY_RUNNING"


async def test_fr4_quizjobb_i_andres_forelesning_gir_404(client: AsyncClient, lecture: str) -> None:
    await _log_in_new_user(client, "ola@eksempel.no")
    response = await _start_quiz(client, lecture)
    assert response.status_code == 404
    assert response.json() == NOT_FOUND


# --- Counts, delete preview, guard and cascade (AR-7, FR-12) -----------------


def test_ar7_quizsporsmal_er_innmeldt_etter_flashcards() -> None:
    assert content_registry.registered_kinds()[:2] == ["flashcards", "quiz_questions"]


async def test_fr12_forhandsvisningen_teller_quizsporsmal(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    lecture_id = (await _create_lecture(client, subject_id, "Uke 37")).json()["id"]
    upload = await _upload(client, lecture_id, FIXTURE.read_bytes(), "definisjoner.pdf")
    file_id = upload.json()["id"]
    await client.post(f"{LECTURES}/{lecture_id}/jobs", json={"kind": "flashcards"})
    await _finish_jobs()
    await _start_quiz(client, lecture_id)
    await _finish_jobs()

    preview = await client.get(f"{FILES}/{file_id}/delete-preview")
    assert preview.json()["counts"] == [
        {"kind": "flashcards", "count": 5},
        {"kind": "quiz_questions", "count": 5},
    ]
    account = await client.get("/api/identity/me/delete-preview")
    assert {"kind": "quiz_questions", "count": 5} in account.json()["counts"]


async def test_ar7_quizjobb_som_pagar_stopper_sletting_av_fila(client: AsyncClient, lecture: str) -> None:
    files = await client.get(f"{LECTURES}/{lecture}/files")
    file_id = files.json()[0]["id"]

    release = asyncio.Event()

    class WaitingGenerator:
        async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
            await release.wait()
            return []

    # A quiz job that runs until the delete has been tried.
    app.dependency_overrides[get_generator] = WaitingGenerator
    assert (await _start_quiz(client, lecture)).status_code == 202
    response = await client.delete(f"{FILES}/{file_id}")
    release.set()
    await _finish_jobs()
    assert response.status_code == 409
    assert _code(response) == "JOB_ALREADY_RUNNING"
    assert len((await client.get(f"{LECTURES}/{lecture}/files")).json()) == 1


async def test_fr12_slett_fil_tar_quizsporsmalene_med(client: AsyncClient, lecture: str, engine: AsyncEngine) -> None:
    await _start_quiz(client, lecture)
    await _finish_jobs()
    assert await _question_count(engine) == 5
    file_id = (await client.get(f"{LECTURES}/{lecture}/files")).json()[0]["id"]
    assert (await client.delete(f"{FILES}/{file_id}")).status_code == 204
    assert await _question_count(engine) == 0


# --- Migration (AR-13) -------------------------------------------------------


def test_ar13_upgrade_head_lager_quiz_questions_med_cascade_indeks_og_sjekk(tmp_path: Path) -> None:
    db_file = tmp_path / "m.db"
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_file}")
    command.upgrade(cfg, "head")

    with sqlite3.connect(db_file) as connection:
        columns = {row[1]: row for row in connection.execute("PRAGMA table_info(quiz_questions)")}
        assert set(columns) == {
            "id", "file_id", "page_no", "formula_flag", "question", "options",
            "correct_index", "explanation", "created_at", "position",
        }
        assert all(row[3] == 1 for row in columns.values())
        keys = list(connection.execute("PRAGMA foreign_key_list(quiz_questions)"))
        assert [(fk[2], fk[3], fk[4], fk[6]) for fk in keys] == [("files", "file_id", "id", "CASCADE")]
        indexed = [
            [info[2] for info in connection.execute(f"PRAGMA index_info('{row[1]}')")]
            for row in connection.execute("PRAGMA index_list(quiz_questions)")
        ]
        assert ["file_id"] in indexed
        table_sql = connection.execute(
            "SELECT sql FROM sqlite_master WHERE name = 'quiz_questions'"
        ).fetchone()[0]
        assert "correct_index >= 0 AND correct_index <= 3" in table_sql

    command.downgrade(cfg, "0007_create_practice_sessions")
    with sqlite3.connect(db_file) as connection:
        tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master")}
    assert "quiz_questions" not in tables
    assert "practice_sessions" in tables
