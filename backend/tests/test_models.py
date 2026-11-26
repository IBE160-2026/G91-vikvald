"""Model cards as a content type (story 7.1): the mock rule (NFR-2a), the
mnemonic rule (FR-43, FR-44), validate_item (FR-45), the invalid mock (SK-4),
the job over HTTP with the feature switch (FR-42, FR-47, FR-21, AR-11), the
counts, delete preview and cascade (FR-12, AR-7), the migration (AR-13), and
the instructions and loose schema for the real model (AR-3)."""

import asyncio
import sqlite3
import uuid
from pathlib import Path
from typing import Any

import pytest
from alembic import command
from alembic.config import Config
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.core.config import get_settings
from app.main import app
from app.modules.content import registry as content_registry
from app.modules.content.models import Flashcard
from app.modules.generation import model_cards, service
from app.modules.generation.mock import InvalidMockGenerator, MockGenerator
from app.modules.generation.port import GenerationOptions, Page
from app.modules.generation.providers import get_generator
from app.modules.generation.registry import enabled_content_types, get_content_type
from app.modules.generation.vertex import output_wrapper
from tests.test_files import _log_in_new_user, _new_lecture, _upload
from tests.test_jobs import _finish_jobs, _latest, no_jobs_left, pdf_with_pages
from tests.test_subjects import _code

# Fixture used by the tests below (imported so pytest finds it here).
__all__ = ["no_jobs_left"]

BACKEND_DIR = Path(__file__).resolve().parents[1]
LECTURES = "/api/lectures"
FILES = "/api/files"
MODELS = {"kind": "models", "params": {"requested": 30}}
FILE_ID = uuid.UUID("00000000-0000-0000-0000-000000000007")

AIDA_PAGE = "\n".join(
    [
        "AIDA-modellen",
        "Deler av modellen",
        "• Attention, oppmerksomhet",
        "• Interest, interesse",
        "• Desire, begjær",
        "• Action, handling",
        "Modellen brukes i reklame.",
    ]
)
P_PAGE = "\n".join(["De fire P-ene:", "• Produkt", "• Pris", "• Plass", "• Påvirkning"])


def options(existing: set[str] | None = None) -> GenerationOptions:
    return GenerationOptions(requested=30, existing_keys=frozenset(existing or set()))


def page(text: str, page_no: int = 1) -> Page:
    return Page(FILE_ID, page_no, text)


def mock(pages: list[Page], existing: set[str] | None = None) -> list[dict[str, Any]]:
    return model_cards.mock_rule(pages, options(existing))


def list_pdf(texts: list[str]) -> bytes:
    """A PDF with one page per text. The PDF's built-in font has no «•», so the
    bullets become «-» (also a bullet for the mock rule)."""
    return pdf_with_pages([text.replace("•", "-") for text in texts])


def list_page(heading: str, points: list[str]) -> str:
    return "\n".join([heading, *(f"• {point}" for point in points)])


# --- The mock rule (NFR-2a) --------------------------------------------------


def test_nfr2a_mock_lager_ett_modellkort_per_liste() -> None:
    [card] = mock([page(AIDA_PAGE)])
    assert card == {
        "front": "Forklar Deler av modellen.",
        "points": ["Attention, oppmerksomhet", "Interest, interesse", "Desire, begjær", "Action, handling"],
        "mnemonic": "AIDA",
        "file_id": FILE_ID,
        "page_no": 1,
    }


@pytest.mark.parametrize(
    "above",
    [
        "Rekkefølgen gir navnet til modellen.",
        "Rekkefølgen gir navnet til modellen:",
        "Rekkefølgen gir navnet til modellen?",
        "Rekkefølgen gir navnet til modellen!",
    ],
)
def test_nfr2a_linja_over_som_slutter_med_tegn_gir_ett_punktum(above: str) -> None:
    [card] = mock([page(list_page(above, ["Attention", "Interest", "Desire", "Action"]))])
    assert card["front"] == "Forklar Rekkefølgen gir navnet til modellen."


def test_nfr2a_linja_over_med_bare_tegn_gir_ingen_kort() -> None:
    assert mock([page(list_page("...", ["Attention", "Interest", "Desire", "Action"]))]) == []


def test_nfr2a_for_kort_liste_gir_ingen_kort() -> None:
    assert mock([page(list_page("To ting", ["En", "To"]))]) == []


def test_nfr2a_liste_overst_paa_siden_gir_ingen_kort() -> None:
    assert mock([page("• Attention\n• Interest\n• Desire\n• Action")]) == []


def test_nfr2a_nummerert_liste_gir_punkter_uten_nummer() -> None:
    [card] = mock([page("Prosessen\n1. Analyse\n2) Beslutning\n3. Gjennomføring")])
    assert card["points"] == ["Analyse", "Beslutning", "Gjennomføring"]
    assert card["mnemonic"] == "ABG"


def test_nfr2a_flere_lister_paa_flere_sider_i_rekkefolge() -> None:
    cards = mock([page(AIDA_PAGE), page(P_PAGE, 2)])
    assert [(card["front"], card["page_no"]) for card in cards] == [
        ("Forklar Deler av modellen.", 1),
        ("Forklar De fire P-ene.", 2),
    ]


def test_nfr2a_samme_fil_gir_samme_kort_hver_gang() -> None:
    pages = [page(AIDA_PAGE), page(P_PAGE, 2)]
    assert mock(pages) == mock(pages)


def test_fr22_kjent_forside_hoppes_over_uten_hensyn_til_store_og_smaa() -> None:
    cards = mock([page(AIDA_PAGE), page(P_PAGE, 2)], {"forklar deler av modellen."})
    assert [card["front"] for card in cards] == ["Forklar De fire P-ene."]


def test_nfr2a_samme_forside_to_ganger_i_en_kjoring_gir_ett_kort() -> None:
    assert len(mock([page(AIDA_PAGE), page(AIDA_PAGE, 2)])) == 1


# --- The mnemonic (FR-43, FR-44) ---------------------------------------------


def test_fr43_huskeregelen_er_forbokstavene_med_store_bokstaver() -> None:
    assert model_cards.mnemonic_for(["attention", "Interest", "desire", "Action"]) == "AIDA"
    # The first letter, also after a number or a sign; æ, ø and å count.
    assert model_cards.mnemonic_for(["1 år", "«Ølet»", "æren"]) == "ÅØÆ"


def test_fr44_samme_forbokstav_gir_ingen_huskeregel() -> None:
    assert model_cards.mnemonic_for(["Produkt", "pris", "Plass", "Påvirkning"]) is None
    [card] = mock([page(P_PAGE)])
    assert card["mnemonic"] is None


# --- validate_item (FR-45) ---------------------------------------------------


def _card(**changes: object) -> dict[str, object]:
    item: dict[str, object] = {
        "front": "Forklar AIDA-modellen.",
        "points": ["Attention", "Interest", "Desire", "Action"],
        "mnemonic": "AIDA",
        "file_id": FILE_ID,
        "page_no": 1,
    }
    item.update(changes)
    return item


PAGES = [page(AIDA_PAGE)]


@pytest.mark.parametrize(
    "item",
    [
        _card(mnemonic="AIDE"),
        _card(mnemonic="AID"),
        _card(mnemonic="ADIA"),
        _card(mnemonic=None),
        _card(mnemonic=""),
        _card(front=""),
        _card(front="   "),
        _card(front=None),
        _card(points=["Attention", "Interest"], mnemonic="AI"),
        _card(points=["Attention", "", "Desire"], mnemonic="AD"),
        _card(points=["Attention", "  ", "Desire"], mnemonic="AD"),
        _card(points=["Attention", "123", "Desire"], mnemonic="AD"),
        _card(points="Attention, Interest, Desire"),
        _card(points=["Attention", "Interest", 3]),
        _card(points=None),
        _card(page_no=2),
        _card(file_id=uuid.uuid4()),
        _card(page_no="1"),
        _card(mnemonic=4),
        "ikke et objekt",
        None,
        {},
    ],
)
def test_fr45_validate_item_forkaster_ugyldige(item: object) -> None:
    assert model_cards.validate_item(item, PAGES) is None


@pytest.mark.parametrize("mnemonic", ["AIDA", "aida", "A-I-D-A", " A.I.D.A "])
def test_fr45_huskeregel_med_tegn_eller_smaa_bokstaver_godtas(mnemonic: str) -> None:
    assert model_cards.validate_item(_card(mnemonic=mnemonic), PAGES) is not None


@pytest.mark.parametrize("mnemonic", [None, "PPPP", "4P"])
def test_fr44_samme_forbokstav_godtas_med_og_uten_huskeregel(mnemonic: str | None) -> None:
    item = _card(points=["Produkt", "Pris", "Plass", "Påvirkning"], mnemonic=mnemonic)
    assert model_cards.validate_item(item, PAGES) is not None


async def test_sk4_ugyldig_mock_odelegger_tre_av_fire_modellkort() -> None:
    texts = [list_page(f"Modell {n}", [f"{letter}{n}" for letter in "ABC"]) for n in range(1, 5)]
    pages = [page(text, n) for n, text in enumerate(texts, start=1)]
    assert await MockGenerator().generate("models", pages, options()) == mock(pages)
    items = await InvalidMockGenerator().generate("models", pages, options())
    assert len(items) == 4
    valid = [item for item in items if model_cards.validate_item(item, pages) is not None]
    assert [item["front"] for item in valid] == ["Forklar Modell 1."]


# --- The registry, instructions and loose schema (AR-3, AR-5, AR-11) ----------


def test_ar11_modellkort_er_registrert_bak_mnemonics() -> None:
    content_type = get_content_type("models")
    assert content_type.feature == "mnemonics"
    assert content_type.loose_model is model_cards.LooseModelCard
    assert content_type.uses_difficulty is False
    assert content_type.instructions_file.is_file()
    assert content_type.instructions_file.name == "models.md"


def test_ar11_bryteren_styrer_om_typen_er_med() -> None:
    from app.core.config import Settings

    on = [ct.kind for ct in enabled_content_types(Settings(FEATURE_MNEMONICS=True))]
    off = [ct.kind for ct in enabled_content_types(Settings(FEATURE_MNEMONICS=False))]
    assert "models" in on
    assert "models" not in off
    assert on[:2] == ["flashcards", "quiz"]


def test_ar3_loose_skjema_for_modellkort_har_feltene() -> None:
    schema = output_wrapper("models").model_json_schema()
    item = schema["properties"]["items"]["items"]
    assert {"front", "points", "mnemonic", "file_id", "page_no", "formula_missing"} <= set(item["properties"])


# --- The job over HTTP -------------------------------------------------------


@pytest.fixture
async def lecture(client: AsyncClient) -> str:
    """A lecture belonging to a logged-in student, with a file that has the AIDA
    list on page 1 and the four P's on page 2."""
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    data = list_pdf([AIDA_PAGE, P_PAGE])
    assert (await _upload(client, lecture_id, data, "modeller.pdf")).status_code == 201
    return lecture_id


async def _start(client: AsyncClient, lecture_id: str, body: dict[str, Any] | None = None) -> Any:
    return await client.post(f"{LECTURES}/{lecture_id}/jobs", json=body or MODELS)


async def _model_cards(engine: AsyncEngine) -> list[Flashcard]:
    async with async_sessionmaker(engine)() as session:
        statement = select(Flashcard).where(Flashcard.kind == "model").order_by(Flashcard.page_no)
        return list(await session.scalars(statement))


async def _counts(client: AsyncClient, lecture_id: str) -> dict[str, int]:
    response = await client.get(f"{LECTURES}/{lecture_id}/content-counts")
    assert response.status_code == 200
    return response.json()


async def test_fr42_jobben_gir_202_og_lagrer_modellkortene(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    response = await _start(client, lecture)
    assert response.status_code == 202
    body = response.json()
    assert (body["kind"], body["status"], body["requested"]) == ("models", "running", 30)
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["created"], job["discarded"]) == ("done", 2, 0)

    aida, four_p = await _model_cards(engine)
    assert (aida.front, aida.back, aida.mnemonic, aida.page_no) == ("Forklar Deler av modellen.", None, "AIDA", 1)
    assert aida.points == ["Attention, oppmerksomhet", "Interest, interesse", "Desire, begjær", "Action, handling"]
    assert aida.formula_flag is False
    assert (four_p.front, four_p.mnemonic, four_p.points) == (
        "Forklar De fire P-ene.",
        None,
        ["Produkt", "Pris", "Plass", "Påvirkning"],
    )
    # Counted apart from the other flashcards.
    assert await _counts(client, lecture) == {"flashcards": 0, "quiz_questions": 0, "model_cards": 2, "freetext_questions": 0, "summary_points": 0}


async def test_fr22_lag_modellkort_igjen_lagrer_ingenting_nytt(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    before = [card.id for card in await _model_cards(engine)]
    await _start(client, lecture)
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["created"]) == ("done", 0)
    assert [card.id for card in await _model_cards(engine)] == before


async def test_fr45_huskeregelen_lagres_slik_modellen_ga_den(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    class Model:
        async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
            first = pages[0]
            card = {"front": "Forklar AIDA.", "file_id": str(first.file_id), "page_no": 1}
            return [
                {**card, "points": ["Attention", "Interest", "Desire", "Action"], "mnemonic": "A-I-D-A"},
                {**card, "points": ["Attention", "Interest", "Desire", "Action"], "mnemonic": "AIDE"},
                {**card, "points": ["Produkt", "Pris", "Plass"], "mnemonic": "PPP", "formula_missing": True},
            ]

    app.dependency_overrides[get_generator] = Model
    await _start(client, lecture)
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["created"], job["discarded"]) == (2, 1)
    cards = await _model_cards(engine)
    assert sorted((card.mnemonic or "", card.formula_flag) for card in cards) == [("", True), ("A-I-D-A", False)]


async def test_fr47_ingen_lister_gir_done_med_null(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    assert (await _upload(client, lecture_id, pdf_with_pages(["Bare vanlig tekst uten lister."]))).status_code == 201
    await _start(client, lecture_id)
    await _finish_jobs()
    [job] = await _latest(client, lecture_id)
    assert (job["status"], job["created"], job["discarded"], job["error_code"]) == ("done", 0, 0, None)
    assert await _model_cards(engine) == []


async def test_sk4_mock_invalid_forkaster_modellkort(
    client: AsyncClient, engine: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "mock-invalid")
    get_settings.cache_clear()
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    texts = [list_page(f"Modell {n}", [f"{letter}{n}" for letter in "ABC"]) for n in range(1, 5)]
    assert (await _upload(client, lecture_id, list_pdf(texts))).status_code == 201
    await _start(client, lecture_id)
    await _finish_jobs()
    [job] = await _latest(client, lecture_id)
    assert (job["status"], job["created"], job["discarded"]) == ("done", 1, 3)
    assert [card.front for card in await _model_cards(engine)] == ["Forklar Modell 1."]


async def test_fr21_port_som_feiler_gir_failed_og_ingen_modellkort(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    class BrokenGenerator:
        async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
            raise RuntimeError("modellen svarte ikke")

    app.dependency_overrides[get_generator] = BrokenGenerator
    await _start(client, lecture)
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["error_code"]) == ("failed", "GENERATION_FAILED")
    assert job["params"] == {"requested": 30}
    assert await _model_cards(engine) == []


async def test_fr21_tidsgrensen_gir_failed_og_ingen_modellkort(
    client: AsyncClient, lecture: str, engine: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(service, "GENERATION_TIMEOUT_SECONDS", 0.05)

    class SlowGenerator:
        async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
            await asyncio.sleep(5)
            return model_cards.mock_rule(pages, options)

    app.dependency_overrides[get_generator] = SlowGenerator
    await _start(client, lecture)
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["error_code"]) == ("failed", "GENERATION_TIMEOUT")
    assert await _model_cards(engine) == []


async def test_sk21_modellkort_mens_en_annen_jobb_kjorer_gir_409(client: AsyncClient, lecture: str) -> None:
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
    monkeypatch.setenv("FEATURE_MNEMONICS", "false")
    get_settings.cache_clear()
    response = await _start(client, lecture)
    assert response.status_code == 404
    assert _code(response) == "FEATURE_DISABLED"
    # Checked before the lecture is looked up.
    other = await _start(client, str(uuid.uuid4()))
    assert _code(other) == "FEATURE_DISABLED"
    assert await _latest(client, lecture) == []
    # The other types still work.
    assert (await client.post(f"{LECTURES}/{lecture}/jobs", json={"kind": "flashcards"})).status_code == 202


async def test_fr42_bryteren_paa_er_standard(client: AsyncClient, lecture: str) -> None:
    assert get_settings().FEATURE_MNEMONICS is True
    assert (await _start(client, lecture)).status_code == 202


async def test_fr42_omfang_kan_ikke_ha_vanskelighetsgrad(client: AsyncClient, lecture: str) -> None:
    response = await _start(client, lecture, {"kind": "models", "params": {"requested": 30, "difficulty": "easy"}})
    assert response.status_code == 422


# --- Counts, delete preview and cascade (FR-12, AR-7) ------------------------


def test_ar7_modellkort_er_innmeldt_etter_quizsporsmal() -> None:
    assert content_registry.registered_kinds()[:3] == ["flashcards", "quiz_questions", "model_cards"]


async def test_fr12_forhandsvisningen_teller_modellkort_for_seg(client: AsyncClient, lecture: str) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    file_id = (await client.get(f"{LECTURES}/{lecture}/files")).json()[0]["id"]
    preview = await client.get(f"{FILES}/{file_id}/delete-preview")
    assert preview.json()["counts"] == [{"kind": "model_cards", "count": 2}]


async def test_fr12_slett_fil_tar_modellkortene_med(client: AsyncClient, lecture: str, engine: AsyncEngine) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    assert len(await _model_cards(engine)) == 2
    file_id = (await client.get(f"{LECTURES}/{lecture}/files")).json()[0]["id"]
    assert (await client.delete(f"{FILES}/{file_id}")).status_code == 204
    assert await _model_cards(engine) == []


async def test_fr56_modellkort_listes_med_flashcards_som_kind_model(client: AsyncClient, lecture: str) -> None:
    # Story 7.2: model cards are practised as flashcards, listed with kind "model".
    await _start(client, lecture)
    await _finish_jobs()
    cards = (await client.get(f"{LECTURES}/{lecture}/flashcards")).json()
    assert cards
    assert all(card["kind"] == "model" and card["back"] is None and card["points"] for card in cards)


async def test_fr22_modellkortenes_forsider_er_ikke_kjente_flashcards(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    # The flashcards job is told only about flashcard fronts, not model-card fronts.
    await _start(client, lecture)
    await _finish_jobs()
    async with async_sessionmaker(engine)() as session:
        flashcard_keys = await get_content_type("flashcards").existing_keys(session, uuid.UUID(lecture))
        model_keys = await get_content_type("models").existing_keys(session, uuid.UUID(lecture))
    assert model_keys
    assert not model_keys & flashcard_keys


# --- Migration (AR-13) -------------------------------------------------------


def test_ar13_migreringen_legger_til_points_og_mnemonic(tmp_path: Path) -> None:
    db_file = tmp_path / "m.db"
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_file}")
    command.upgrade(cfg, "head")
    with sqlite3.connect(db_file) as connection:
        columns = {row[1]: row for row in connection.execute("PRAGMA table_info(flashcards)")}
    assert columns["points"][3] == 0 and columns["mnemonic"][3] == 0
    assert columns["points"][2].upper() == "JSON"
    assert columns["mnemonic"][2].upper() == "TEXT"

    command.downgrade(cfg, "0009_add_content_position")
    with sqlite3.connect(db_file) as connection:
        columns = {row[1]: row for row in connection.execute("PRAGMA table_info(flashcards)")}
    assert "points" not in columns and "mnemonic" not in columns
    assert "position" in columns
