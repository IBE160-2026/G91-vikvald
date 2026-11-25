"""Free-text questions as a content type (story 8.1): the mock rule (NFR-2a),
validate_item, the invalid mock (SK-4), the job over HTTP with question type,
scope and feature switch (FR-48, FR-49, FR-21, AR-11, AR-12), the counts,
delete preview and cascade (FR-12, AR-7), the first-content time for «øvd»
(#236), the migration (AR-13), and the instructions and loose schema for the
real model (AR-3)."""

import asyncio
import re
import sqlite3
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from alembic import command
from alembic.config import Config
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.core.config import Settings, get_settings
from app.main import app
from app.modules.content import registry as content_registry
from app.modules.content.models import FreetextQuestion
from app.modules.content.registry import first_content_times
from app.modules.generation import freetext, service
from app.modules.generation.mock import InvalidMockGenerator, MockGenerator
from app.modules.generation.port import GenerationOptions, Page
from app.modules.generation.providers import get_generator
from app.modules.generation.registry import enabled_content_types, get_content_type
from app.modules.generation.vertex import instructions_for, output_wrapper
from tests.test_files import _log_in_new_user, _new_lecture, _upload
from tests.test_jobs import _finish_jobs, _latest, no_jobs_left, pdf_with_pages
from tests.test_overview import T, _add_file, _add_session, _lectures, _subject_with_lectures
from tests.test_subjects import _code
from tests.test_subjects import _log_in_new_user as _log_in_without_terms

# Fixture used by the tests below (imported so pytest finds it here).
__all__ = ["no_jobs_left"]

BACKEND_DIR = Path(__file__).resolve().parents[1]
LECTURES = "/api/lectures"
FILES = "/api/files"
FREETEXT = {"kind": "freetext", "params": {"requested": 10, "question_kind": "short"}}
FILE_ID = uuid.UUID("00000000-0000-0000-0000-000000000008")
PAGE_TEXT = "Merkevare er et navn. Pris er det kunden betaler."


def options(existing: set[str] | None = None, requested: int = 10) -> GenerationOptions:
    return GenerationOptions(requested=requested, existing_keys=frozenset(existing or set()))


def page(text: str, page_no: int = 1) -> Page:
    return Page(FILE_ID, page_no, text)


def mock(pages: list[Page], existing: set[str] | None = None) -> list[dict[str, Any]]:
    return freetext.mock_rule(pages, options(existing))


def definitions(terms: list[str]) -> str:
    return " ".join(f"{term} er et begrep i faget." for term in terms)


# --- The mock rule (NFR-2a) --------------------------------------------------


def test_nfr2a_fr48_mock_lager_forklar_sporsmal_per_definisjon() -> None:
    assert mock([page(PAGE_TEXT)]) == [
        {"question": "Forklar Merkevare.", "model_answer": "Merkevare er et navn.", "file_id": FILE_ID, "page_no": 1},
        {
            "question": "Forklar Pris.",
            "model_answer": "Pris er det kunden betaler.",
            "file_id": FILE_ID,
            "page_no": 1,
        },
    ]


def test_nfr2a_mock_ett_sporsmal_per_begrep_i_fil_og_siderekkefolge() -> None:
    pages = [page("Pris er verdi. Merkevare er et navn.", 1), page("Merkevare er noe annet. Segment er en gruppe.", 2)]
    assert [(item["question"], item["page_no"]) for item in mock(pages)] == [
        ("Forklar Pris.", 1),
        ("Forklar Merkevare.", 1),
        ("Forklar Segment.", 2),
    ]


def test_nfr2a_samme_fil_gir_samme_sporsmal_hver_gang() -> None:
    pages = [page(PAGE_TEXT), page(definitions(["Segment", "Målgruppe"]), 2)]
    assert mock(pages) == mock(pages)


def test_fr48_kjent_sporsmal_hoppes_over_uten_hensyn_til_store_og_smaa() -> None:
    assert [item["question"] for item in mock([page(PAGE_TEXT)], {"forklar merkevare."})] == ["Forklar Pris."]


@pytest.mark.parametrize("question_kind", ["short", "long"])
def test_fr48_mock_er_lik_for_kortsvar_og_langsvar(question_kind: str) -> None:
    chosen = GenerationOptions(requested=10, question_kind=question_kind)
    assert freetext.mock_rule([page(PAGE_TEXT)], chosen) == mock([page(PAGE_TEXT)])


# --- validate_item -----------------------------------------------------------


def _question(**changes: object) -> dict[str, object]:
    item: dict[str, object] = {
        "question": "Forklar Merkevare.",
        "model_answer": "Merkevare er et navn.",
        "file_id": FILE_ID,
        "page_no": 1,
    }
    item.update(changes)
    return item


PAGES = [page(PAGE_TEXT)]


@pytest.mark.parametrize(
    "item",
    [
        _question(question=""),
        _question(question="   "),
        _question(question=None),
        _question(model_answer=""),
        _question(model_answer="  "),
        _question(model_answer=None),
        _question(page_no=2),
        _question(file_id=uuid.uuid4()),
        _question(page_no="1"),
        _question(question=4),
        _question(model_answer=["Et navn."]),
        "ikke et objekt",
        None,
        {},
    ],
)
def test_fr49_validate_item_forkaster_ugyldige(item: object) -> None:
    assert freetext.validate_item(item, PAGES) is None


def test_fr48_validate_item_godtar_gyldig_og_ignorerer_kind_fra_modellen() -> None:
    checked = freetext.validate_item(_question(kind="long", formula_missing=True), PAGES)
    assert checked is not None
    assert (checked.question, checked.formula_missing) == ("Forklar Merkevare.", True)
    assert not hasattr(checked, "kind")


async def test_sk4_ugyldig_mock_odelegger_tre_av_fire_sporsmal() -> None:
    pages = [page(definitions([f"Begrep{n}" for n in range(1, 9)]))]
    assert await MockGenerator().generate("freetext", pages, options()) == mock(pages)
    items = await InvalidMockGenerator().generate("freetext", pages, options())
    assert len(items) == 8
    valid = [item for item in items if freetext.validate_item(item, pages) is not None]
    assert [item["question"] for item in valid] == ["Forklar Begrep1.", "Forklar Begrep5."]


# --- The registry, instructions and loose schema (AR-3, AR-5, AR-11) ----------


def test_ar11_fritekst_er_registrert_bak_freetext() -> None:
    content_type = get_content_type("freetext")
    assert content_type.feature == "freetext"
    assert content_type.loose_model is freetext.LooseFreetextQuestion
    assert (content_type.uses_difficulty, content_type.uses_question_kind) == (False, True)
    assert (content_type.scopes, content_type.default_requested) == ((5, 10, 15), 10)
    assert content_type.instructions_file == BACKEND_DIR / "app" / "modules" / "generation" / "instructions" / "freetext.md"


def test_ar12_de_andre_typene_beholder_10_20_30() -> None:
    for kind in ("flashcards", "quiz", "models"):
        content_type = get_content_type(kind)
        assert (content_type.scopes, content_type.default_requested, content_type.uses_question_kind) == (
            (10, 20, 30),
            20,
            False,
        )


def test_ar11_bryteren_styrer_om_fritekst_er_med() -> None:
    on = [ct.kind for ct in enabled_content_types(Settings(FEATURE_FREETEXT=True))]
    off = [ct.kind for ct in enabled_content_types(Settings(FEATURE_FREETEXT=False))]
    assert on == ["flashcards", "quiz", "models", "freetext"]
    assert "freetext" not in off


def test_ar3_loose_skjema_for_fritekst_har_feltene_uten_kind() -> None:
    schema = output_wrapper("freetext").model_json_schema()
    item = schema["properties"]["items"]["items"]
    assert set(item["properties"]) == {"question", "model_answer", "file_id", "page_no", "formula_missing"}


@pytest.mark.parametrize("question_kind", ["short", "long"])
def test_fr48_instruksen_far_valgt_sporsmalstype(question_kind: str) -> None:
    text = instructions_for("freetext", GenerationOptions(requested=10, question_kind=question_kind))
    assert f"Valgt spørsmålstype: {freetext.QUESTION_KINDS[question_kind]}." in text
    assert "{question_kind}" not in text


def test_fr48_fr49_instruksen_har_punktene_i_akseptkriteriet() -> None:
    text = " ".join(get_content_type("freetext").instructions_file.read_text(encoding="utf-8").split()).lower()
    assert "bruk bare stoff som står på sidene" in text
    assert "høyst så mange spørsmål som det blir bedt om" in text
    assert "valgt spørsmålstype: {question_kind}." in text
    assert "kortsvar" in text and "langsvar" in text
    assert "ikke lag spørsmål som bare ber studenten ramse opp punktene i en modell eller en liste" in text
    assert "modellsvaret (`model_answer`)" in text and "ikke inneholde noe som ikke står i notatene" in text
    assert "`page_no` som pdf-ens eget sidetall fra 1" in text
    assert "norsk bokmål" in text and "det engelske i parentes" in text
    assert "`formula_missing`" in text


def test_ar3_instruksen_nevner_hvert_felt_i_den_loese_modellen() -> None:
    text = get_content_type("freetext").instructions_file.read_text(encoding="utf-8")
    for field in freetext.LooseFreetextQuestion.model_fields:
        assert f"`{field}`" in text, field


# --- The job over HTTP -------------------------------------------------------


@pytest.fixture
async def lecture(client: AsyncClient) -> str:
    """A lecture belonging to a logged-in student, with a file whose page 1 has
    two definitions and page 2 five more (seven in all)."""
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    data = pdf_with_pages([PAGE_TEXT, definitions(["Segment", "Målgruppe", "Posisjon", "Kanal", "Budskap"])])
    assert (await _upload(client, lecture_id, data, "fritekst.pdf")).status_code == 201
    return lecture_id


async def _start(client: AsyncClient, lecture_id: str, body: dict[str, Any] | None = None) -> Any:
    return await client.post(f"{LECTURES}/{lecture_id}/jobs", json=body or FREETEXT)


async def _questions(engine: AsyncEngine) -> list[FreetextQuestion]:
    async with async_sessionmaker(engine)() as session:
        statement = select(FreetextQuestion).order_by(
            FreetextQuestion.created_at, FreetextQuestion.position, FreetextQuestion.id
        )
        return list(await session.scalars(statement))


async def _counts(client: AsyncClient, lecture_id: str) -> dict[str, int]:
    response = await client.get(f"{LECTURES}/{lecture_id}/content-counts")
    assert response.status_code == 200
    return response.json()


async def test_fr48_fr49_jobben_gir_202_og_lagrer_kortsvar_med_modellsvar_og_kilde(client: AsyncClient, lecture: str, engine: AsyncEngine) -> None:
    response = await _start(client, lecture)
    assert response.status_code == 202
    body = response.json()
    assert (body["kind"], body["status"], body["requested"]) == ("freetext", "running", 10)
    assert body["params"] == {"requested": 10, "question_kind": "short"}
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["created"], job["discarded"]) == ("done", 7, 0)

    questions = await _questions(engine)
    assert [question.question for question in questions] == [
        "Forklar Merkevare.",
        "Forklar Pris.",
        "Forklar Segment.",
        "Forklar Målgruppe.",
        "Forklar Posisjon.",
        "Forklar Kanal.",
        "Forklar Budskap.",
    ]
    first = questions[0]
    assert (first.kind, first.model_answer, first.page_no, first.formula_flag) == (
        "short",
        "Merkevare er et navn.",
        1,
        False,
    )
    assert await _counts(client, lecture) == {
        "flashcards": 0,
        "quiz_questions": 0,
        "model_cards": 0,
        "freetext_questions": 7,
    }


async def test_fr48_langsvar_rask_gir_requested_5_og_lagres_som_long(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    response = await _start(client, lecture, {"kind": "freetext", "params": {"requested": 5, "question_kind": "long"}})
    assert response.status_code == 202
    assert (response.json()["requested"], response.json()["params"]) == (5, {"requested": 5, "question_kind": "long"})
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["created"]) == ("done", 5)
    questions = await _questions(engine)
    # The first five in file and page order.
    assert [question.question for question in questions] == [
        "Forklar Merkevare.",
        "Forklar Pris.",
        "Forklar Segment.",
        "Forklar Målgruppe.",
        "Forklar Posisjon.",
    ]
    assert {question.kind for question in questions} == {"long"}


async def test_fr48_uten_params_gir_vanlig_og_kortsvar(client: AsyncClient, lecture: str) -> None:
    response = await _start(client, lecture, {"kind": "freetext"})
    assert response.status_code == 202
    assert (response.json()["requested"], response.json()["params"]) == (10, {"requested": 10, "question_kind": "short"})
    await _finish_jobs()


async def test_fr48_bare_requested_gir_kortsvar(client: AsyncClient, lecture: str) -> None:
    response = await _start(client, lecture, {"kind": "freetext", "params": {"requested": 5}})
    assert response.status_code == 202
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["requested"], job["params"]["question_kind"]) == (5, "short")


async def test_fr22_fr48_nye_sporsmal_legges_til_de_gamle(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    body = {"kind": "freetext", "params": {"requested": 5, "question_kind": "short"}}
    await _start(client, lecture, body)
    await _finish_jobs()
    first = [question.id for question in await _questions(engine)]
    assert len(first) == 5
    await _start(client, lecture, body)
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["created"]) == ("done", 2)
    questions = await _questions(engine)
    assert len(questions) == 7
    assert [question.id for question in questions[:5]] == first
    assert (await _counts(client, lecture))["freetext_questions"] == 7


async def test_fr48_kjente_sporsmal_og_tellingen_gjelder_bare_egen_forelesning(
    client: AsyncClient, lecture: str
) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    other = await _new_lecture(client)
    data = pdf_with_pages([PAGE_TEXT, definitions(["Segment", "Målgruppe", "Posisjon", "Kanal", "Budskap"])])
    assert (await _upload(client, other, data, "fritekst.pdf")).status_code == 201
    await _start(client, other, {"kind": "freetext", "params": {"requested": 5, "question_kind": "short"}})
    await _finish_jobs()
    [job] = await _latest(client, other)
    assert (job["status"], job["created"]) == ("done", 5)
    assert (await _counts(client, other))["freetext_questions"] == 5
    assert (await _counts(client, lecture))["freetext_questions"] == 7


async def test_fr48_typen_som_lagres_er_den_studenten_valgte(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    class Model:
        async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
            first = pages[0]
            item = {"file_id": str(first.file_id), "page_no": 1, "model_answer": "Et svar."}
            return [
                {**item, "question": "Drøft merkevare.", "kind": "short"},
                {**item, "question": "Drøft pris.", "formula_missing": True},
                {**item, "question": ""},
            ]

    app.dependency_overrides[get_generator] = Model
    await _start(client, lecture, {"kind": "freetext", "params": {"requested": 10, "question_kind": "long"}})
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["created"], job["discarded"]) == (2, 1)
    questions = await _questions(engine)
    assert sorted((question.question, question.kind, question.formula_flag) for question in questions) == [
        ("Drøft merkevare.", "long", False),
        ("Drøft pris.", "long", True),
    ]


async def test_fr48_lag_flere_hopper_over_kjente_og_gir_null(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    before = [question.id for question in await _questions(engine)]
    # Another type does not matter: the same text counts as known.
    await _start(client, lecture, {"kind": "freetext", "params": {"requested": 10, "question_kind": "long"}})
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["created"], job["discarded"]) == ("done", 0, 0)
    assert [question.id for question in await _questions(engine)] == before


async def test_fr48_faerre_enn_valgt_gir_done_med_det_som_fantes(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    assert (await _upload(client, lecture_id, pdf_with_pages([PAGE_TEXT]))).status_code == 201
    await _start(client, lecture_id, {"kind": "freetext", "params": {"requested": 15, "question_kind": "short"}})
    await _finish_jobs()
    [job] = await _latest(client, lecture_id)
    assert (job["status"], job["requested"], job["created"]) == ("done", 15, 2)
    assert len(await _questions(engine)) == 2


async def test_sk4_mock_invalid_forkaster_fritekstsporsmal(
    client: AsyncClient, engine: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "mock-invalid")
    get_settings.cache_clear()
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    data = pdf_with_pages([definitions([f"Begrep{n}" for n in range(1, 9)])])
    assert (await _upload(client, lecture_id, data)).status_code == 201
    await _start(client, lecture_id)
    await _finish_jobs()
    [job] = await _latest(client, lecture_id)
    assert (job["status"], job["created"], job["discarded"]) == ("done", 2, 6)
    assert [question.question for question in await _questions(engine)] == ["Forklar Begrep1.", "Forklar Begrep5."]


@pytest.mark.parametrize(
    "body",
    [
        {"kind": "freetext", "params": {"requested": 20}},
        {"kind": "freetext", "params": {"requested": 30}},
        {"kind": "freetext", "params": {"requested": 0}},
        {"kind": "freetext", "params": {"requested": "5"}},
        {"kind": "freetext", "params": {"requested": 10, "question_kind": "medium"}},
        {"kind": "freetext", "params": {"requested": 10, "difficulty": "easy"}},
        {"kind": "flashcards", "params": {"requested": 20, "question_kind": "short"}},
        {"kind": "quiz", "params": {"requested": 20, "question_kind": "long"}},
        {"kind": "models", "params": {"requested": 30, "question_kind": "short"}},
        {"kind": "flashcards", "params": {"requested": 5}},
        {"kind": "quiz", "params": {"requested": 15}},
    ],
)
async def test_ar12_fr48_ugyldige_parametre_gir_422(client: AsyncClient, lecture: str, body: dict[str, Any]) -> None:
    response = await _start(client, lecture, body)
    assert response.status_code == 422
    assert _code(response) == "VALIDATION_ERROR"
    assert await _latest(client, lecture) == []


async def test_fr21_port_som_feiler_gir_failed_og_ingen_sporsmal(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    class BrokenGenerator:
        async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
            raise RuntimeError("modellen svarte ikke")

    app.dependency_overrides[get_generator] = BrokenGenerator
    await _start(client, lecture, {"kind": "freetext", "params": {"requested": 15, "question_kind": "long"}})
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["error_code"]) == ("failed", "GENERATION_FAILED")
    # «Prøv igjen» starts a job with the same choices.
    assert job["params"] == {"requested": 15, "question_kind": "long"}
    assert await _questions(engine) == []
    assert (await _counts(client, lecture))["freetext_questions"] == 0


async def test_fr21_tidsgrensen_gir_failed_og_ingen_sporsmal(
    client: AsyncClient, lecture: str, engine: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(service, "GENERATION_TIMEOUT_SECONDS", 0.05)

    class SlowGenerator:
        async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
            await asyncio.sleep(5)
            return freetext.mock_rule(pages, options)

    app.dependency_overrides[get_generator] = SlowGenerator
    await _start(client, lecture)
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["error_code"]) == ("failed", "GENERATION_TIMEOUT")
    assert await _questions(engine) == []


async def test_sk21_fritekst_mens_en_annen_jobb_kjorer_gir_409(client: AsyncClient, lecture: str) -> None:
    release = asyncio.Event()

    class WaitingGenerator:
        async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
            await release.wait()
            return []

    app.dependency_overrides[get_generator] = WaitingGenerator
    assert (await client.post(f"{LECTURES}/{lecture}/jobs", json={"kind": "flashcards"})).status_code == 202
    response = await _start(client, lecture)
    release.set()
    await _finish_jobs()
    assert response.status_code == 409
    assert _code(response) == "JOB_ALREADY_RUNNING"


async def test_ar11_bryteren_av_gir_404_feature_disabled(
    client: AsyncClient, lecture: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("FEATURE_FREETEXT", "false")
    get_settings.cache_clear()
    response = await _start(client, lecture)
    assert response.status_code == 404
    assert _code(response) == "FEATURE_DISABLED"
    # Checked before the lecture is looked up.
    assert _code(await _start(client, lecture_id=str(uuid.uuid4()))) == "FEATURE_DISABLED"
    assert await _latest(client, lecture) == []
    # The other types still work.
    assert (await client.post(f"{LECTURES}/{lecture}/jobs", json={"kind": "flashcards"})).status_code == 202


async def test_fr48_bryteren_paa_er_standard(client: AsyncClient, lecture: str) -> None:
    assert get_settings().FEATURE_FREETEXT is True
    assert (await _start(client, lecture)).status_code == 202


# --- Counts, delete preview and cascade (FR-12, AR-7) ------------------------


def test_ar7_fritekstsporsmal_er_innmeldt_etter_modellkort() -> None:
    assert content_registry.registered_kinds()[:4] == ["flashcards", "quiz_questions", "model_cards", "freetext_questions"]


async def test_fr12_forhandsvisningen_teller_fritekstsporsmal(client: AsyncClient, lecture: str) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    file_id = (await client.get(f"{LECTURES}/{lecture}/files")).json()[0]["id"]
    preview = await client.get(f"{FILES}/{file_id}/delete-preview")
    assert preview.json()["counts"] == [{"kind": "freetext_questions", "count": 7}]


async def test_fr12_slett_fil_tar_fritekstsporsmalene_med(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    assert len(await _questions(engine)) == 7
    file_id = (await client.get(f"{LECTURES}/{lecture}/files")).json()[0]["id"]
    assert (await client.delete(f"{FILES}/{file_id}")).status_code == 204
    assert await _questions(engine) == []


async def test_fr12_telleren_er_med_ogsa_naar_bryteren_er_av(
    client: AsyncClient, lecture: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    monkeypatch.setenv("FEATURE_FREETEXT", "false")
    get_settings.cache_clear()
    file_id = (await client.get(f"{LECTURES}/{lecture}/files")).json()[0]["id"]
    preview = await client.get(f"{FILES}/{file_id}/delete-preview")
    assert preview.json()["counts"] == [{"kind": "freetext_questions", "count": 7}]


# --- «Øvd» for a whole-subject free-text session (#236) ----------------------


async def _add_freetext_question(engine: AsyncEngine, lecture_id: str, created_at: datetime) -> None:
    file_id = await _add_file(engine, lecture_id)
    async with async_sessionmaker(engine)() as session:
        session.add(
            FreetextQuestion(
                file_id=file_id,
                kind="short",
                question="Forklar merkevare.",
                model_answer="Et navn.",
                page_no=1,
                created_at=created_at,
            )
        )
        await session.commit()


async def test_fr48_first_content_times_for_fritekst(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_without_terms(client)
    _, first, second = await _subject_with_lectures(client)
    await _add_freetext_question(engine, first, T)
    await _add_freetext_question(engine, first, T - timedelta(hours=1))

    async with async_sessionmaker(engine)() as session:
        found = await first_content_times(session, (uuid.UUID(first), uuid.UUID(second)), "freetext")

    assert found == {uuid.UUID(first): T - timedelta(hours=1)}


async def test_fr48_emneokt_med_fritekst_teller_for_forelesninger_som_hadde_sporsmal(
    client: AsyncClient, engine: AsyncEngine
) -> None:
    await _log_in_without_terms(client)
    subject_id, first, second = await _subject_with_lectures(client)
    await _add_freetext_question(engine, first, T - timedelta(hours=1))
    # Made after the session started: does not count.
    await _add_freetext_question(engine, second, T + timedelta(hours=1))
    await _add_session(engine, subject_id, None, T, kind="freetext", partial=1, correct=1)

    lectures = await _lectures(client, subject_id)

    assert lectures[first]["practiced"] is True
    assert lectures[second]["practiced"] is False


# --- Migration (AR-13) -------------------------------------------------------


def test_ar13_migreringen_lager_freetext_questions(tmp_path: Path) -> None:
    db_file = tmp_path / "m.db"
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_file}")
    command.upgrade(cfg, "head")
    with sqlite3.connect(db_file) as connection:
        columns = {row[1]: row for row in connection.execute("PRAGMA table_info(freetext_questions)")}
        foreign_keys = list(connection.execute("PRAGMA foreign_key_list(freetext_questions)"))
        indexes = {row[1] for row in connection.execute("PRAGMA index_list(freetext_questions)")}
        sql = connection.execute(
            "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'freetext_questions'"
        ).fetchone()[0]
    assert set(columns) == {
        "id",
        "file_id",
        "kind",
        "question",
        "model_answer",
        "page_no",
        "formula_flag",
        "created_at",
        "position",
    }
    # Every column is NOT NULL; position defaults to 0.
    assert all(column[3] == 1 for name, column in columns.items() if name != "id")
    assert columns["position"][4] == "'0'"
    # file_id -> files.id with ON DELETE CASCADE, and indexed.
    assert [(row[2], row[3], row[4], row[6]) for row in foreign_keys] == [("files", "file_id", "id", "CASCADE")]
    assert "ix_freetext_questions_file_id" in indexes
    assert "ck_freetext_questions_kind" in sql

    with sqlite3.connect(db_file) as connection:
        connection.execute("PRAGMA foreign_keys = OFF")
        with pytest.raises(sqlite3.IntegrityError):
            connection.execute(
                "INSERT INTO freetext_questions (id, file_id, kind, question, model_answer, page_no, created_at) "
                "VALUES ('a', 'b', 'medium', 'q', 'a', 1, '2026-11-25')"
            )

    command.downgrade(cfg, "0010_add_model_card_fields")
    with sqlite3.connect(db_file) as connection:
        tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
    assert "freetext_questions" not in tables
    assert "flashcards" in tables


def test_ar16_bare_content_skriver_freetext_questions() -> None:
    # The generation module saves through content.service, never the model itself.
    source = (BACKEND_DIR / "app" / "modules" / "generation" / "freetext.py").read_text(encoding="utf-8")
    assert re.search(r"(?<![A-Za-z])FreetextQuestion\(", source) is None
    assert "add_freetext_questions" in source

