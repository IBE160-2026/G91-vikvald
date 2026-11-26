"""The summary as a content type (story 9.1): the mock rule (NFR-2a),
validate_item (FR-38, FR-53), the invalid mock (SK-4), the job over HTTP with
the smallest and largest number of points, replacing the old summary (FR-55),
the feature switch (AR-11), reading it (story 9.2: FR-54, FR-56), the counts, delete preview, deleting and replacing
a file and the cascade (FR-12, FR-13, FR-14, AR-7, E15), the migration
(AR-13), and the instructions and loose schema for the real model (AR-3)."""

import asyncio
import re
import sqlite3
import uuid
from pathlib import Path
from typing import Any

import pytest
from alembic import command
from alembic.config import Config
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.core.config import Settings, get_settings
from app.core.errors import ERROR_STATUS, ErrorCode
from app.main import app
from app.modules.content import registry as content_registry
from app.modules.content.models import Summary, SummaryPoint
from app.modules.practice.models import PracticeSession
from app.modules.generation import service, summary
from app.modules.generation.mock import InvalidMockGenerator, MockGenerator
from app.modules.generation.port import GenerationOptions, Page
from app.modules.generation.providers import get_generator
from app.modules.generation.registry import enabled_content_types, get_content_type
from app.modules.generation.vertex import instructions_for, output_wrapper
from tests.test_delete import _new_lecture_in
from tests.test_files import _log_in_new_user, _new_lecture, _upload
from tests.test_jobs import _finish_jobs, _latest, no_jobs_left, pdf_with_pages
from tests.test_lectures import _new_subject
from tests.test_replace import _replace
from tests.test_subjects import _code

# Fixture used by the tests below (imported so pytest finds it here).
__all__ = ["no_jobs_left"]

BACKEND_DIR = Path(__file__).resolve().parents[1]
LECTURES = "/api/lectures"
FILES = "/api/files"
SUBJECTS = "/api/subjects"
OVERVIEW = "/api/overview"
SUMMARY = {"kind": "summary"}
FILE_ID = uuid.UUID("00000000-0000-0000-0000-000000000009")
OTHER_FILE_ID = uuid.UUID("00000000-0000-0000-0000-00000000000a")


def options() -> GenerationOptions:
    return GenerationOptions(requested=15)


def page(text: str, page_no: int = 1, file_id: uuid.UUID = FILE_ID, file_name: str = "a.pdf") -> Page:
    return Page(file_id, page_no, text, file_name)


def page_texts(count: int, start: int = 1) -> list[str]:
    return [f"Poeng {n} står på side {n}. Mer tekst på siden." for n in range(start, start + count)]


# --- The mock rule (NFR-2a) --------------------------------------------------


def test_nfr2a_fr53_mock_lager_ett_punkt_per_side_med_filnavnet_som_tema() -> None:
    pages = [page(text, number) for number, text in enumerate(page_texts(6), start=1)]
    assert summary.mock_rule(pages, options()) == [
        {"theme": "a.pdf", "text": f"Poeng {n} står på side {n}.", "file_id": FILE_ID, "page_no": n}
        for n in range(1, 7)
    ]


def test_nfr2a_mock_hopper_over_side_uten_setning_og_folger_fil_og_side() -> None:
    pages = [
        page("Første side.", 1),
        page("   ", 2),
        page("Tredje side. Mer.", 3),
        page("Annen fil.", 1, OTHER_FILE_ID, "b.pdf"),
    ]
    assert [(item["theme"], item["text"], item["page_no"]) for item in summary.mock_rule(pages, options())] == [
        ("a.pdf", "Første side.", 1),
        ("a.pdf", "Tredje side.", 3),
        ("b.pdf", "Annen fil.", 1),
    ]


def test_nfr2_samme_filer_gir_samme_sammendrag() -> None:
    pages = [page(text, number) for number, text in enumerate(page_texts(6), start=1)]
    assert summary.mock_rule(pages, options()) == summary.mock_rule(pages, options())


async def test_fr55_sammendraget_har_ingen_kjente_nokler() -> None:
    assert await summary.existing_keys(None, uuid.uuid4()) == frozenset()  # type: ignore[arg-type]


# --- validate_item (FR-38, FR-53) --------------------------------------------


def _point(**changes: object) -> dict[str, object]:
    item: dict[str, object] = {"theme": "Merkevare", "text": "Merkevare er et navn.", "file_id": FILE_ID, "page_no": 1}
    item.update(changes)
    return item


PAGES = [page("Merkevare er et navn.")]


@pytest.mark.parametrize(
    "item",
    [
        _point(theme=""),
        _point(theme="   "),
        _point(theme=None),
        _point(text=""),
        _point(text="  "),
        _point(text=None),
        _point(text=" ".join(["ord"] * 51)),
        _point(page_no=9999),
        _point(file_id=uuid.uuid4()),
        _point(page_no="1"),
        _point(theme=4),
        "ikke et objekt",
        None,
        {},
    ],
)
def test_fr53_validate_item_forkaster_ugyldige(item: object) -> None:
    assert summary.validate_item(item, PAGES) is None


def test_fr53_validate_item_godtar_50_ord_og_formelmerke() -> None:
    checked = summary.validate_item(_point(text=" ".join(["ord"] * 50), formula_missing=True), PAGES)
    assert checked is not None
    assert (checked.theme, checked.formula_missing) == ("Merkevare", True)


async def test_sk4_ugyldig_mock_odelegger_tre_av_fire_punkter() -> None:
    pages = [page(text, number) for number, text in enumerate(page_texts(8), start=1)]
    assert await MockGenerator().generate("summary", pages, options()) == summary.mock_rule(pages, options())
    items = await InvalidMockGenerator().generate("summary", pages, options())
    assert len(items) == 8
    valid = [item for item in items if summary.validate_item(item, pages) is not None]
    assert [item["page_no"] for item in valid] == [1, 5]


# --- The registry, instructions and loose schema (AR-3, AR-5, AR-11) ----------


def test_ar11_sammendrag_er_registrert_bak_summary() -> None:
    content_type = get_content_type("summary")
    assert content_type.feature == "summary"
    assert content_type.loose_model is summary.LooseSummaryPoint
    assert (content_type.scopes, content_type.default_requested) == ((15,), 15)
    assert (content_type.min_items, content_type.too_few_error, content_type.surplus_discarded) == (
        5,
        ErrorCode.TOO_FEW_SUMMARY_POINTS,
        True,
    )
    assert (content_type.uses_difficulty, content_type.uses_question_kind) == (False, False)
    assert content_type.instructions_file == BACKEND_DIR / "app" / "modules" / "generation" / "instructions" / "summary.md"


def test_ar5_de_andre_typene_har_ingen_minste_antall() -> None:
    for kind in ("flashcards", "quiz", "models", "freetext"):
        content_type = get_content_type(kind)
        assert (content_type.min_items, content_type.too_few_error, content_type.surplus_discarded) == (0, None, False)


def test_ar11_bryteren_styrer_om_sammendrag_er_med() -> None:
    on = [ct.kind for ct in enabled_content_types(Settings(FEATURE_SUMMARY=True))]
    off = [ct.kind for ct in enabled_content_types(Settings(FEATURE_SUMMARY=False))]
    assert on == ["flashcards", "quiz", "models", "freetext", "summary"]
    assert "summary" not in off


def test_ar12_too_few_summary_points_er_422() -> None:
    assert ERROR_STATUS[ErrorCode.TOO_FEW_SUMMARY_POINTS] == 422


def test_ar3_loose_skjema_for_sammendrag_har_feltene() -> None:
    schema = output_wrapper("summary").model_json_schema()
    item = schema["properties"]["items"]["items"]
    assert set(item["properties"]) == {"theme", "text", "file_id", "page_no", "formula_missing"}


def test_fr2_fr39_fr53_fr54_instruksen_har_punktene_i_akseptkriteriet() -> None:
    text = " ".join(get_content_type("summary").instructions_file.read_text(encoding="utf-8").split()).lower()
    assert "bruk bare stoff som står på sidene" in text
    assert "lag 5 til 15 hovedpunkter" in text
    assert "ordne punktene etter tema" in text and "kort tematittel (`theme`)" in text
    assert "høyst 50 ord" in text
    assert "`file_id` nøyaktig som i sidemerket" in text
    assert "`page_no` som pdf-ens eget sidetall fra 1" in text
    assert "norsk bokmål" in text and "behold norske fagbegreper" in text and "det engelske i parentes" in text
    assert "`formula_missing`" in text


def test_ar3_instruksen_nevner_hvert_felt_i_den_loese_modellen() -> None:
    text = get_content_type("summary").instructions_file.read_text(encoding="utf-8")
    for field in summary.LooseSummaryPoint.model_fields:
        assert f"`{field}`" in text, field


def test_ar3_instruksen_har_ingen_plassholdere() -> None:
    text = instructions_for("summary", options())
    assert "{" not in text


# --- The job over HTTP -------------------------------------------------------


@pytest.fixture
async def lecture(client: AsyncClient) -> str:
    """A lecture belonging to a logged-in student, with one file of 6 pages."""
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    assert (await _upload(client, lecture_id, pdf_with_pages(page_texts(6)), "a.pdf")).status_code == 201
    return lecture_id


async def _start(client: AsyncClient, lecture_id: str, body: dict[str, Any] | None = None) -> Any:
    return await client.post(f"{LECTURES}/{lecture_id}/jobs", json=body or SUMMARY)


async def _points(engine: AsyncEngine) -> list[SummaryPoint]:
    async with async_sessionmaker(engine)() as session:
        statement = select(SummaryPoint).join(Summary).order_by(Summary.created_at, SummaryPoint.position)
        return list(await session.scalars(statement))


async def _summaries(engine: AsyncEngine) -> list[Summary]:
    async with async_sessionmaker(engine)() as session:
        return list(await session.scalars(select(Summary)))


async def _point_rows(engine: AsyncEngine) -> int:
    async with async_sessionmaker(engine)() as session:
        return int(await session.scalar(select(func.count()).select_from(SummaryPoint)) or 0)


async def _counts(client: AsyncClient, lecture_id: str) -> dict[str, int]:
    response = await client.get(f"{LECTURES}/{lecture_id}/content-counts")
    assert response.status_code == 200
    return response.json()


def _model(items: list[dict[str, Any]]) -> type:
    """A generator that answers with these items, with the first page's file id filled in."""

    class Model:
        async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
            return [{"file_id": str(pages[0].file_id), **item} for item in items]

    return Model


async def test_fr53_fr54_jobben_gir_202_og_lager_6_punkter_med_kilde(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    response = await _start(client, lecture)
    assert response.status_code == 202
    body = response.json()
    assert (body["kind"], body["status"], body["requested"], body["params"]) == (
        "summary",
        "running",
        15,
        {"requested": 15},
    )
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["created"], job["discarded"]) == ("done", 6, 0)

    points = await _points(engine)
    assert [(point.position, point.theme, point.text, point.page_no) for point in points] == [
        (n - 1, "a.pdf", f"Poeng {n} står på side {n}.", n) for n in range(1, 7)
    ]
    assert {point.formula_flag for point in points} == {False}
    [stored] = await _summaries(engine)
    assert str(stored.lecture_id) == lecture
    assert await _counts(client, lecture) == {
        "flashcards": 0,
        "quiz_questions": 0,
        "model_cards": 0,
        "freetext_questions": 0,
        "summary_points": 6,
    }


@pytest.mark.parametrize(
    "params",
    [
        {"requested": 10},
        {"requested": 20},
        {"requested": 15, "difficulty": "easy"},
        {"requested": 15, "question_kind": "short"},
    ],
)
async def test_ar12_ugyldige_parametre_gir_422(client: AsyncClient, lecture: str, params: dict[str, Any]) -> None:
    response = await _start(client, lecture, {"kind": "summary", "params": params})
    assert response.status_code == 422
    assert _code(response) == "VALIDATION_ERROR"
    assert await _latest(client, lecture) == []


async def test_fr53_over_15_gyldige_lagrer_de_15_forste_og_teller_resten(
    client: AsyncClient, engine: AsyncEngine
) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    assert (await _upload(client, lecture_id, pdf_with_pages(page_texts(18)))).status_code == 201
    await _start(client, lecture_id)
    await _finish_jobs()
    [job] = await _latest(client, lecture_id)
    assert (job["status"], job["created"], job["discarded"]) == ("done", 15, 3)
    assert [point.page_no for point in await _points(engine)] == list(range(1, 16))


async def test_fr53_under_5_gir_too_few_og_ingenting_lagres(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    assert (await _upload(client, lecture_id, pdf_with_pages(page_texts(3)))).status_code == 201
    await _start(client, lecture_id)
    await _finish_jobs()
    [job] = await _latest(client, lecture_id)
    assert (job["status"], job["error_code"], job["created"]) == ("failed", "TOO_FEW_SUMMARY_POINTS", None)
    assert await _summaries(engine) == []
    assert (await _counts(client, lecture_id))["summary_points"] == 0


async def test_fr53_ugyldige_punkter_forkastes_og_telles(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    good = [{"theme": "Tema", "text": f"Punkt {n}.", "page_no": n} for n in range(1, 6)]
    bad = [
        {"theme": "", "text": "Tomt tema.", "page_no": 1},
        {"theme": "Tema", "text": "", "page_no": 1},
        {"theme": "Tema", "text": " ".join(["ord"] * 51), "page_no": 1},
        {"theme": "Tema", "text": "Finnes ikke.", "page_no": 9999},
    ]
    app.dependency_overrides[get_generator] = _model([*bad, *good, {**good[0], "formula_missing": True}])
    await _start(client, lecture)
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["created"], job["discarded"]) == ("done", 6, 4)
    points = await _points(engine)
    # In file and page order; points from the same page keep the model's order.
    assert [(point.text, point.formula_flag) for point in points] == [
        ("Punkt 1.", False),
        ("Punkt 1.", True),
        ("Punkt 2.", False),
        ("Punkt 3.", False),
        ("Punkt 4.", False),
        ("Punkt 5.", False),
    ]


async def test_fr53_punktene_lagres_samlet_etter_tema(client: AsyncClient, lecture: str, engine: AsyncEngine) -> None:
    themes = ["A", "B", "A", "B", "A"]
    app.dependency_overrides[get_generator] = _model(
        [{"theme": theme, "text": f"Punkt {n}.", "page_no": n} for n, theme in enumerate(themes, start=1)]
    )
    await _start(client, lecture)
    await _finish_jobs()
    points = await _points(engine)
    assert [(point.position, point.theme, point.page_no) for point in points] == [
        (0, "A", 1),
        (1, "A", 3),
        (2, "A", 5),
        (3, "B", 2),
        (4, "B", 4),
    ]


async def test_fr55_nytt_sammendrag_erstatter_det_gamle(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    [old] = await _summaries(engine)

    app.dependency_overrides[get_generator] = _model(
        [{"theme": "Nytt", "text": f"Nytt punkt {n}.", "page_no": n} for n in range(1, 6)]
    )
    await _start(client, lecture)
    await _finish_jobs()
    [new] = await _summaries(engine)
    assert new.id != old.id
    assert [point.text for point in await _points(engine)] == [f"Nytt punkt {n}." for n in range(1, 6)]
    # The old points are gone with the old summary.
    assert await _point_rows(engine) == 5
    assert (await _counts(client, lecture))["summary_points"] == 5


async def test_fr53_too_few_beholder_det_gamle_sammendraget(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    before = [point.id for point in await _points(engine)]

    app.dependency_overrides[get_generator] = _model(
        [{"theme": "Nytt", "text": f"Nytt punkt {n}.", "page_no": n} for n in range(1, 5)]
    )
    await _start(client, lecture)
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["error_code"]) == ("failed", "TOO_FEW_SUMMARY_POINTS")
    assert [point.id for point in await _points(engine)] == before


async def test_fr21_port_som_feiler_beholder_det_gamle(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    before = [point.id for point in await _points(engine)]

    class BrokenGenerator:
        async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
            raise RuntimeError("modellen svarte ikke")

    app.dependency_overrides[get_generator] = BrokenGenerator
    await _start(client, lecture)
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["error_code"]) == ("failed", "GENERATION_FAILED")
    assert [point.id for point in await _points(engine)] == before


async def test_fr21_tidsgrensen_gir_failed_og_beholder_det_gamle(
    client: AsyncClient, lecture: str, engine: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    before = [point.id for point in await _points(engine)]
    monkeypatch.setattr(service, "GENERATION_TIMEOUT_SECONDS", 0.05)

    class SlowGenerator:
        async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
            await asyncio.sleep(5)
            return summary.mock_rule(pages, options)

    app.dependency_overrides[get_generator] = SlowGenerator
    await _start(client, lecture)
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["error_code"]) == ("failed", "GENERATION_TIMEOUT")
    assert [point.id for point in await _points(engine)] == before


async def test_sk21_sammendrag_mens_en_annen_jobb_kjorer_gir_409(client: AsyncClient, lecture: str) -> None:
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
    monkeypatch.setenv("FEATURE_SUMMARY", "false")
    get_settings.cache_clear()
    response = await _start(client, lecture)
    assert response.status_code == 404
    assert _code(response) == "FEATURE_DISABLED"
    # Checked before the lecture is looked up.
    assert _code(await _start(client, str(uuid.uuid4()))) == "FEATURE_DISABLED"
    assert await _latest(client, lecture) == []
    # The other types still work.
    assert (await client.post(f"{LECTURES}/{lecture}/jobs", json={"kind": "flashcards"})).status_code == 202


# --- Reading the summary (story 9.2: FR-54, FR-55, FR-56, AR-11) ------------


async def _read(client: AsyncClient, lecture_id: str) -> Any:
    return await client.get(f"{LECTURES}/{lecture_id}/summary")


async def test_fr54_les_gir_temaer_punkter_kilde_og_filer(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    first = await _upload(client, lecture_id, pdf_with_pages(page_texts(3)), "a.pdf")
    second = await _upload(client, lecture_id, pdf_with_pages(page_texts(4, 4)), "b.pdf")
    first_id, second_id = first.json()["id"], second.json()["id"]

    class Model:
        async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
            # 7 points in 3 themes from 2 files; theme "B" shows up first.
            rows = [
                (first_id, 1, "B"),
                (first_id, 2, "A"),
                (first_id, 3, "B"),
                (second_id, 1, "C"),
                (second_id, 2, "A"),
                (second_id, 3, "C"),
                (second_id, 4, "B"),
            ]
            return [
                {"file_id": file_id, "page_no": page_no, "theme": theme, "text": f"{theme} {file_id[:4]} {page_no}."}
                for file_id, page_no, theme in rows
            ]

    app.dependency_overrides[get_generator] = Model
    await _start(client, lecture_id)
    await _finish_jobs()

    response = await _read(client, lecture_id)
    assert response.status_code == 200
    body = response.json()
    assert body["point_count"] == 7
    assert body["created_at"].endswith(("Z", "+00:00"))
    assert [theme["title"] for theme in body["themes"]] == ["B", "A", "C"]
    assert [
        [(point["source"]["file_name"], point["source"]["page_no"]) for point in theme["points"]]
        for theme in body["themes"]
    ] == [
        [("a.pdf", 1), ("a.pdf", 3), ("b.pdf", 4)],
        [("a.pdf", 2), ("b.pdf", 2)],
        [("b.pdf", 1), ("b.pdf", 3)],
    ]
    point = body["themes"][0]["points"][0]
    assert set(point) == {"id", "text", "formula_flag", "source"}
    assert point["text"] == f"B {first_id[:4]} 1."
    assert point["formula_flag"] is False
    assert point["source"] == {"file_id": first_id, "file_name": "a.pdf", "page_no": 1}
    assert body["files"] == [
        {"file_id": first_id, "file_name": "a.pdf", "page_count": 3},
        {"file_id": second_id, "file_name": "b.pdf", "page_count": 4},
    ]


async def test_fr54_filer_er_bare_de_punktene_kommer_fra(client: AsyncClient, lecture: str) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    # A file uploaded after the summary is not one of its sources.
    assert (await _upload(client, lecture, pdf_with_pages(page_texts(2)), "ny.pdf")).status_code == 201
    body = (await _read(client, lecture)).json()
    assert [file["file_name"] for file in body["files"]] == ["a.pdf"]
    assert body["point_count"] == 6
    assert [theme["title"] for theme in body["themes"]] == ["a.pdf"]


async def test_fr54_uten_sammendrag_gir_404_not_found(client: AsyncClient, lecture: str) -> None:
    response = await _read(client, lecture)
    assert response.status_code == 404
    assert _code(response) == "NOT_FOUND"


async def test_fr54_annens_og_ukjent_forelesning_gir_404_not_found(client: AsyncClient, lecture: str) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    assert (await _read(client, lecture)).status_code == 200
    await _log_in_new_user(client, "annen@eksempel.no")
    for lecture_id in (lecture, str(uuid.uuid4()), "ikke-en-id"):
        response = await _read(client, lecture_id)
        assert response.status_code == 404
        assert _code(response) == "NOT_FOUND"


async def test_ar11_les_med_bryteren_av_gir_feature_disabled_for_oppslag(
    client: AsyncClient, lecture: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    monkeypatch.setenv("FEATURE_SUMMARY", "false")
    get_settings.cache_clear()
    for lecture_id in (lecture, str(uuid.uuid4())):
        response = await _read(client, lecture_id)
        assert response.status_code == 404
        assert _code(response) == "FEATURE_DISABLED"


async def test_fr55_nytt_sammendrag_gir_nytt_svar(client: AsyncClient, lecture: str) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    old = (await _read(client, lecture)).json()

    app.dependency_overrides[get_generator] = _model(
        [{"theme": "Nytt", "text": f"Nytt punkt {n}.", "page_no": n} for n in range(1, 6)]
    )
    await _start(client, lecture)
    await _finish_jobs()
    new = (await _read(client, lecture)).json()
    assert new["point_count"] == 5
    assert [theme["title"] for theme in new["themes"]] == ["Nytt"]
    assert [point["text"] for point in new["themes"][0]["points"]] == [f"Nytt punkt {n}." for n in range(1, 6)]
    old_ids = {point["id"] for theme in old["themes"] for point in theme["points"]}
    assert old_ids.isdisjoint(point["id"] for point in new["themes"][0]["points"])


async def test_fr56_summary_not_session_lesing_lagrer_ingen_okt_og_gjor_ikke_ovd(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    assert (await _read(client, lecture)).status_code == 200
    assert (await _read(client, lecture)).status_code == 200

    async with async_sessionmaker(engine)() as session:
        assert int(await session.scalar(select(func.count()).select_from(PracticeSession)) or 0) == 0
    subject_id = (await client.get(f"{LECTURES}/{lecture}")).json()["subject_id"]
    overview = (await client.get(OVERVIEW)).json()
    [subject] = [item for item in overview["subjects"] if item["id"] == subject_id]
    [item] = subject["lectures"]
    assert item["practiced"] is False
    assert item["last_practiced_at"] is None
    assert subject["last_session"] is None


# --- Counts, delete preview, delete and replace (FR-12, FR-13, FR-14, AR-7, E15)


def test_ar7_summary_sammendrag_er_innmeldt_etter_fritekst() -> None:
    assert content_registry.registered_kinds()[:5] == [
        "flashcards",
        "quiz_questions",
        "model_cards",
        "freetext_questions",
        "summaries",
    ]


async def _two_files_with_summary(client: AsyncClient, lecture_id: str) -> tuple[str, str]:
    """A lecture with two files (3 pages each) and a summary with points from both."""
    first = await _upload(client, lecture_id, pdf_with_pages(page_texts(3)), "a.pdf")
    second = await _upload(client, lecture_id, pdf_with_pages(page_texts(3, 4)), "b.pdf")
    assert first.status_code == second.status_code == 201
    await _start(client, lecture_id)
    await _finish_jobs()
    [job] = await _latest(client, lecture_id)
    assert (job["status"], job["created"]) == ("done", 6)
    return first.json()["id"], second.json()["id"]


async def test_ar7_summary_forhandsvisning_for_fil_teller_sammendraget(client: AsyncClient, lecture: str) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    file_id = (await client.get(f"{LECTURES}/{lecture}/files")).json()[0]["id"]
    preview = await client.get(f"{FILES}/{file_id}/delete-preview")
    assert preview.json()["counts"] == [{"kind": "summaries", "count": 1}]
    preview = await client.get(f"{LECTURES}/{lecture}/delete-preview")
    assert preview.json()["counts"] == [{"kind": "files", "count": 1}, {"kind": "summaries", "count": 1}]


async def test_ar7_summary_forhandsvisning_for_emne_teller_hvert_sammendrag(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    lectures = [await _new_lecture_in(client, subject_id, name) for name in ("Uke 37", "Uke 38", "Uke 39")]
    for lecture_id in lectures[:2]:
        assert (await _upload(client, lecture_id, pdf_with_pages(page_texts(5)))).status_code == 201
        await _start(client, lecture_id)
        await _finish_jobs()
    preview = await client.get(f"{SUBJECTS}/{subject_id}/delete-preview")
    assert preview.json()["counts"] == [
        {"kind": "lectures", "count": 3},
        {"kind": "files", "count": 2},
        {"kind": "summaries", "count": 2},
    ]


async def test_ar7_summary_telleren_er_med_ogsa_naar_bryteren_er_av(
    client: AsyncClient, lecture: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    monkeypatch.setenv("FEATURE_SUMMARY", "false")
    get_settings.cache_clear()
    file_id = (await client.get(f"{LECTURES}/{lecture}/files")).json()[0]["id"]
    preview = await client.get(f"{FILES}/{file_id}/delete-preview")
    assert preview.json()["counts"] == [{"kind": "summaries", "count": 1}]


async def test_ar7_summary_slett_fil_sletter_hele_sammendraget(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    first, second = await _two_files_with_summary(client, lecture_id)
    assert {point.file_id for point in await _points(engine)} == {uuid.UUID(first), uuid.UUID(second)}

    assert (await client.delete(f"{FILES}/{first}")).status_code == 204
    # Not half a summary: the points from the other file are gone too.
    assert await _summaries(engine) == []
    assert await _point_rows(engine) == 0
    assert [file["id"] for file in (await client.get(f"{LECTURES}/{lecture_id}/files")).json()] == [second]
    assert (await _counts(client, lecture_id))["summary_points"] == 0


async def test_ar7_summary_erstatt_fil_sletter_hele_sammendraget(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    first, second = await _two_files_with_summary(client, lecture_id)

    response = await _replace(client, second, pdf_with_pages(page_texts(2)))
    assert response.status_code == 201
    assert await _summaries(engine) == []
    assert await _point_rows(engine) == 0
    files = [file["id"] for file in (await client.get(f"{LECTURES}/{lecture_id}/files")).json()]
    assert first in files and second not in files


async def test_ar7_summary_feilet_erstatting_beholder_sammendraget(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    _first, second = await _two_files_with_summary(client, lecture_id)
    assert (await client.delete(f"{FILES}/{second}")).status_code == 204
    # Made again from the one file left (3 pages are too few), so use a model.
    app.dependency_overrides[get_generator] = _model(
        [{"theme": "Tema", "text": f"Punkt {n}.", "page_no": 1} for n in range(1, 6)]
    )
    await _start(client, lecture_id)
    await _finish_jobs()
    assert len(await _summaries(engine)) == 1
    # Replacing a file that is gone stores nothing and deletes nothing.
    response = await _replace(client, second, pdf_with_pages(page_texts(2)))
    assert response.status_code == 404
    assert len(await _summaries(engine)) == 1
    assert await _point_rows(engine) == 5


async def test_ar7_summary_slett_fil_i_en_annen_forelesning_lar_sammendraget_sta(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    other = await _new_lecture(client)
    response = await _upload(client, other, pdf_with_pages(page_texts(1)))
    assert (await client.delete(f"{FILES}/{response.json()['id']}")).status_code == 204
    assert len(await _summaries(engine)) == 1
    assert await _point_rows(engine) == 6


async def test_fr14_ar7_summary_slett_forelesning_sletter_sammendraget(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    assert (await client.delete(f"{LECTURES}/{lecture}")).status_code == 204
    assert await _summaries(engine) == []
    assert await _point_rows(engine) == 0


async def test_fr14_ar7_summary_slett_emne_sletter_sammendraget(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    lecture_id = await _new_lecture_in(client, subject_id)
    assert (await _upload(client, lecture_id, pdf_with_pages(page_texts(5)))).status_code == 201
    await _start(client, lecture_id)
    await _finish_jobs()
    assert len(await _summaries(engine)) == 1
    assert (await client.delete(f"{SUBJECTS}/{subject_id}")).status_code == 204
    assert await _summaries(engine) == []
    assert await _point_rows(engine) == 0


async def test_fr5_ar7_summary_slett_konto_sletter_sammendraget(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    assert (await client.delete("/api/identity/me")).status_code == 204
    assert await _summaries(engine) == []
    assert await _point_rows(engine) == 0


# --- Migration (AR-13) -------------------------------------------------------


def test_ar13_migreringen_lager_summaries_og_summary_points(tmp_path: Path) -> None:
    db_file = tmp_path / "m.db"
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_file}")
    command.upgrade(cfg, "head")
    with sqlite3.connect(db_file) as connection:
        summary_columns = {row[1]: row for row in connection.execute("PRAGMA table_info(summaries)")}
        point_columns = {row[1]: row for row in connection.execute("PRAGMA table_info(summary_points)")}
        summary_keys = list(connection.execute("PRAGMA foreign_key_list(summaries)"))
        point_keys = list(connection.execute("PRAGMA foreign_key_list(summary_points)"))
        summary_indexes = {row[1]: row[2] for row in connection.execute("PRAGMA index_list(summaries)")}
        point_indexes = {row[1] for row in connection.execute("PRAGMA index_list(summary_points)")}
    assert set(summary_columns) == {"id", "lecture_id", "created_at"}
    assert set(point_columns) == {"id", "summary_id", "theme", "position", "text", "file_id", "page_no", "formula_flag"}
    assert all(column[3] == 1 for name, column in point_columns.items() if name != "id")
    assert all(column[3] == 1 for name, column in summary_columns.items() if name != "id")
    assert [(row[2], row[3], row[4], row[6]) for row in summary_keys] == [("lectures", "lecture_id", "id", "CASCADE")]
    assert sorted((row[2], row[3], row[4], row[6]) for row in point_keys) == [
        ("files", "file_id", "id", "CASCADE"),
        ("summaries", "summary_id", "id", "CASCADE"),
    ]
    # At most one summary per lecture.
    assert summary_indexes["ix_summaries_lecture_id"] == 1
    assert {"ix_summary_points_summary_id", "ix_summary_points_file_id"} <= point_indexes

    command.downgrade(cfg, "0011_create_freetext_questions")
    with sqlite3.connect(db_file) as connection:
        tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
    assert "summaries" not in tables and "summary_points" not in tables
    assert "freetext_questions" in tables


def test_ar16_bare_content_skriver_summaries() -> None:
    # The generation module saves through content.service, never the models themselves.
    source = (BACKEND_DIR / "app" / "modules" / "generation" / "summary.py").read_text(encoding="utf-8")
    assert re.search(r"(?<![A-Za-z])Summary(Point)?\(", source) is None
    assert "replace_summary" in source
    files_source = (BACKEND_DIR / "app" / "modules" / "files" / "service.py").read_text(encoding="utf-8")
    assert "delete_summaries_for_files" in files_source
    assert re.search(r"(?<![A-Za-z])Summary(Point)?\b", files_source) is None
