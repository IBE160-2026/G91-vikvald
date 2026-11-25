"""Practise model cards and change the mnemonic (story 7.2): model cards in the
flashcard lists, PATCH /api/flashcards/{id} with points and mnemonic, delete,
and the practised rule for a subject session (FR-42, FR-46, FR-56, AR-4, AR-11).
"""

import uuid
from datetime import timedelta
from typing import Any

import pytest
from httpx import AsyncClient, Response
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.core.config import get_settings
from app.modules.content.models import Flashcard
from tests.test_edit_flashcards import _stored
from tests.test_files import _log_in_new_user, _new_lecture, _upload
from tests.test_flashcards import _flashcards
from tests.test_jobs import FIXTURE, _finish_jobs, _start, lecture, no_jobs_left
from tests.test_overview import T, _add_session, _lectures, _subject_with_lectures
from tests.test_subjects import NOT_FOUND, _code

# Fixtures used by the tests below (imported so pytest finds them here).
__all__ = ["lecture", "no_jobs_left"]

FLASHCARDS = "/api/flashcards"
POINTS = ["Attention (oppmerksomhet)", "Interest (interesse)", "Desire (ønske)", "Action (handling)"]


async def _plain_card(client: AsyncClient, lecture_id: str) -> dict[str, Any]:
    assert (await _start(client, lecture_id)).status_code == 202
    await _finish_jobs()
    return (await _flashcards(client, lecture_id))[0]


async def _add_model_card(
    engine: AsyncEngine, file_id: str, mnemonic: str | None = "AIDA", **extra: Any
) -> str:
    card_id = uuid.uuid4()
    async with async_sessionmaker(engine)() as session:
        session.add(
            Flashcard(
                id=card_id,
                file_id=uuid.UUID(file_id),
                kind="model",
                front="Forklar AIDA-modellen.",
                back=None,
                points=list(POINTS),
                mnemonic=mnemonic,
                page_no=1,
                **extra,
            )
        )
        await session.commit()
    return str(card_id)


@pytest.fixture
async def model_card(client: AsyncClient, lecture: str, engine: AsyncEngine) -> tuple[str, dict[str, Any]]:
    """A model card next to the concept cards the mock makes; returns its id and one of those plain cards."""
    plain = await _plain_card(client, lecture)
    return await _add_model_card(engine, plain["source"]["file_id"]), plain


async def _patch(client: AsyncClient, card_id: str, body: dict[str, Any]) -> Response:
    return await client.patch(f"{FLASHCARDS}/{card_id}", json=body)


# --- Lists -------------------------------------------------------------------


async def test_fr56_forelesningens_liste_har_modellkortet_med_de_andre(
    client: AsyncClient, lecture: str, model_card: tuple[str, dict[str, Any]]
) -> None:
    card_id, _plain = model_card
    cards = await _flashcards(client, lecture)
    # The mock makes concept cards; the model card is listed with them.
    assert {card["kind"] for card in cards} == {"concept", "model"}
    [model] = [card for card in cards if card["id"] == card_id]
    assert model["back"] is None
    assert model["points"] == POINTS
    assert model["mnemonic"] == "AIDA"
    assert model["source"]["file_name"] == "definisjoner.pdf"


async def test_fr42_modellkort_uten_huskeregel_har_mnemonic_null(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    plain = await _plain_card(client, lecture)
    card_id = await _add_model_card(engine, plain["source"]["file_id"], mnemonic=None)
    [model] = [card for card in await _flashcards(client, lecture) if card["id"] == card_id]
    assert model["mnemonic"] is None


async def test_fr42_modellkort_uten_punkter_i_databasen_gir_tom_liste(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    plain = await _plain_card(client, lecture)
    card_id = await _add_model_card(engine, plain["source"]["file_id"])
    async with async_sessionmaker(engine)() as session:
        stored = await session.get(Flashcard, uuid.UUID(card_id))
        assert stored is not None
        stored.points = None
        await session.commit()
    [model] = [card for card in await _flashcards(client, lecture) if card["id"] == card_id]
    assert model["points"] == []
    assert all(card["points"] is None for card in await _flashcards(client, lecture) if card["kind"] != "model")


# --- Mnemonic ----------------------------------------------------------------


async def test_fr46_ny_huskeregel_lagres_trimmet(
    client: AsyncClient, model_card: tuple[str, dict[str, Any]], engine: AsyncEngine
) -> None:
    card_id, _plain = model_card
    response = await _patch(client, card_id, {"mnemonic": "  Alle I Dag Allerede  "})
    assert response.status_code == 200
    body = response.json()
    assert body["mnemonic"] == "Alle I Dag Allerede"
    # Never checked against or recomputed from the points (AR-4).
    assert body["points"] == POINTS
    stored = await _stored(engine, card_id)
    assert stored is not None
    assert stored.mnemonic == "Alle I Dag Allerede"


async def test_fr46_huskeregel_kan_legges_til_paa_kort_uten(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    plain = await _plain_card(client, lecture)
    card_id = await _add_model_card(engine, plain["source"]["file_id"], mnemonic=None)
    response = await _patch(client, card_id, {"mnemonic": "Pris, Produkt, Plass, Påvirkning"})
    assert response.status_code == 200
    assert response.json()["mnemonic"] == "Pris, Produkt, Plass, Påvirkning"


@pytest.mark.parametrize("mnemonic", ["", "   ", " \n ", None])
async def test_fr46_tom_huskeregel_avvises(
    client: AsyncClient, model_card: tuple[str, dict[str, Any]], engine: AsyncEngine, mnemonic: str | None
) -> None:
    card_id, _plain = model_card
    response = await _patch(client, card_id, {"mnemonic": mnemonic})
    assert response.status_code == 422
    assert _code(response) == "FLASHCARD_BACK_REQUIRED"
    stored = await _stored(engine, card_id)
    assert stored is not None
    assert stored.mnemonic == "AIDA"


async def test_fr46_bryteren_av_gir_404_feature_disabled(
    client: AsyncClient, model_card: tuple[str, dict[str, Any]], engine: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> None:
    card_id, _plain = model_card
    monkeypatch.setenv("FEATURE_MNEMONICS", "false")
    get_settings.cache_clear()
    response = await _patch(client, card_id, {"mnemonic": "X"})
    assert response.status_code == 404
    assert _code(response) == "FEATURE_DISABLED"
    # Checked before the card is looked up.
    assert _code(await _patch(client, str(uuid.uuid4()), {"mnemonic": "X"})) == "FEATURE_DISABLED"
    stored = await _stored(engine, card_id)
    assert stored is not None
    assert stored.mnemonic == "AIDA"
    # Front and points can still be fixed, and the card is still listed with its mnemonic.
    fixed = await _patch(client, card_id, {"front": "Forklar AIDA.", "points": ["A", "B"]})
    assert fixed.status_code == 200
    assert fixed.json()["mnemonic"] == "AIDA"


# --- Front and points ---------------------------------------------------------


async def test_fr42_punktene_rettes_trimmet_uten_tomme_linjer(
    client: AsyncClient, model_card: tuple[str, dict[str, Any]], engine: AsyncEngine
) -> None:
    card_id, _plain = model_card
    response = await _patch(client, card_id, {"front": "  Forklar AIDA.  ", "points": [" A ", "", "B"]})
    assert response.status_code == 200
    body = response.json()
    assert (body["front"], body["points"], body["mnemonic"], body["back"]) == ("Forklar AIDA.", ["A", "B"], "AIDA", None)
    stored = await _stored(engine, card_id)
    assert stored is not None
    assert (stored.points, stored.mnemonic) == (["A", "B"], "AIDA")


@pytest.mark.parametrize("points", [["", "  "], [], None])
async def test_fr42_tomme_punkter_avvises(
    client: AsyncClient, model_card: tuple[str, dict[str, Any]], engine: AsyncEngine, points: list[str] | None
) -> None:
    card_id, _plain = model_card
    response = await _patch(client, card_id, {"front": "Ny", "points": points})
    assert response.status_code == 422
    assert _code(response) == "FLASHCARD_BACK_REQUIRED"
    stored = await _stored(engine, card_id)
    assert stored is not None
    assert (stored.front, stored.points) == ("Forklar AIDA-modellen.", POINTS)


async def test_fr42_tom_forside_paa_modellkort_avvises(
    client: AsyncClient, model_card: tuple[str, dict[str, Any]]
) -> None:
    card_id, _plain = model_card
    response = await _patch(client, card_id, {"front": "  ", "points": ["A"]})
    assert _code(response) == "FLASHCARD_FRONT_REQUIRED"


@pytest.mark.parametrize(
    ("target", "body"),
    [
        ("model", {"back": "Et svar"}),
        ("plain", {"points": ["A"]}),
        ("plain", {"mnemonic": "A"}),
    ],
)
async def test_fr42_feil_felt_for_typen_gir_validation_error(
    client: AsyncClient,
    model_card: tuple[str, dict[str, Any]],
    engine: AsyncEngine,
    target: str,
    body: dict[str, Any],
) -> None:
    card_id, plain = model_card
    chosen = card_id if target == "model" else plain["id"]
    response = await _patch(client, chosen, body)
    assert response.status_code == 422
    assert _code(response) == "VALIDATION_ERROR"
    stored = await _stored(engine, chosen)
    assert stored is not None
    assert stored.back == (None if target == "model" else plain["back"])
    assert stored.points == (POINTS if target == "model" else None)


async def test_fr46_andres_modellkort_gir_404(
    client: AsyncClient, model_card: tuple[str, dict[str, Any]], engine: AsyncEngine
) -> None:
    card_id, _plain = model_card
    await _log_in_new_user(client, "ola@eksempel.no")
    response = await _patch(client, card_id, {"mnemonic": "Olas regel"})
    assert response.status_code == 404
    assert response.json() == NOT_FOUND
    assert (await client.delete(f"{FLASHCARDS}/{card_id}")).status_code == 404
    stored = await _stored(engine, card_id)
    assert stored is not None
    assert stored.mnemonic == "AIDA"


# --- Delete ------------------------------------------------------------------


async def test_fr56_modellkort_slettes_som_andre_kort(
    client: AsyncClient, lecture: str, model_card: tuple[str, dict[str, Any]], engine: AsyncEngine
) -> None:
    card_id, _plain = model_card
    assert (await client.delete(f"{FLASHCARDS}/{card_id}")).status_code == 204
    assert await _stored(engine, card_id) is None
    assert all(card["kind"] != "model" for card in await _flashcards(client, lecture))


# --- Practised rule ----------------------------------------------------------


async def test_fr56_emneokt_gjor_forelesning_med_bare_modellkort_ovd(
    client: AsyncClient, engine: AsyncEngine
) -> None:
    await _log_in_new_user(client)
    subject_id, first, second = await _subject_with_lectures(client)
    file_id = (await _upload(client, first, FIXTURE.read_bytes())).json()["id"]
    await _add_model_card(engine, file_id, created_at=T - timedelta(hours=1))
    await _add_session(engine, subject_id, None, T)

    lectures = await _lectures(client, subject_id)

    assert lectures[first]["practiced"] is True
    assert lectures[second]["practiced"] is False


async def test_fr56_modellkort_fra_en_annen_forelesning_kommer_ikke_med(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    other = await _new_lecture(client)
    file_id = (await _upload(client, other, FIXTURE.read_bytes())).json()["id"]
    await _add_model_card(engine, file_id)
    assert await _flashcards(client, lecture) == []
    assert [card["kind"] for card in await _flashcards(client, other)] == ["model"]
