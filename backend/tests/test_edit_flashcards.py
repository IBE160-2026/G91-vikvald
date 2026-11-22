"""Edit and delete one flashcard: PATCH and DELETE /api/flashcards/{id}
(FR-27, FR-4, SK-6, AR-4).

The cards are made by the mock pipeline from the fixed test file, as in
test_flashcards.py.
"""

import dataclasses
import uuid
from typing import Any

import pytest
from httpx import AsyncClient, Response
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.modules.content.models import Flashcard
from app.modules.generation import registry as generation_registry
from tests.test_files import _log_in_new_user
from tests.test_flashcards import _flashcards
from tests.test_jobs import _finish_jobs, _start, lecture, no_jobs_left
from tests.test_subjects import NOT_FOUND, _code

# Fixtures used by the tests below (imported so pytest finds them here).
__all__ = ["lecture", "no_jobs_left"]

FLASHCARDS = "/api/flashcards"


async def _cards_in(client: AsyncClient, lecture_id: str) -> list[dict[str, Any]]:
    """Make the lecture's cards with the mock pipeline and return them."""
    assert (await _start(client, lecture_id)).status_code == 202
    await _finish_jobs()
    cards = await _flashcards(client, lecture_id)
    assert len(cards) == 5
    return cards


async def _stored(engine: AsyncEngine, card_id: str) -> Flashcard | None:
    async with async_sessionmaker(engine)() as session:
        return await session.get(Flashcard, uuid.UUID(card_id))


async def _patch(client: AsyncClient, card_id: str, body: dict[str, Any]) -> Response:
    return await client.patch(f"{FLASHCARDS}/{card_id}", json=body)


# --- Edit --------------------------------------------------------------------


async def test_fr27_rett_kort_lagres_trimmet_og_gir_kortet_tilbake(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    card = (await _cards_in(client, lecture))[0]

    response = await _patch(client, card["id"], {"front": "  Ny  ", "back": "Svar\nmed to linjer \n"})

    assert response.status_code == 200
    body = response.json()
    assert body == {**card, "front": "Ny", "back": "Svar\nmed to linjer"}
    stored = await _stored(engine, card["id"])
    assert stored is not None
    assert (stored.front, stored.back) == ("Ny", "Svar\nmed to linjer")
    # The lecture's list shows the new text in the same place.
    assert (await _flashcards(client, lecture))[0]["front"] == "Ny"


async def test_fr27_bare_ett_felt_endrer_bare_det(client: AsyncClient, lecture: str) -> None:
    card = (await _cards_in(client, lecture))[1]
    response = await _patch(client, card["id"], {"back": "Bare svaret er nytt."})
    assert response.status_code == 200
    assert (response.json()["front"], response.json()["back"]) == (card["front"], "Bare svaret er nytt.")


@pytest.mark.parametrize(
    ("body", "code"),
    [
        ({"front": "   ", "back": "Svar"}, "FLASHCARD_FRONT_REQUIRED"),
        ({"front": "", "back": ""}, "FLASHCARD_FRONT_REQUIRED"),
        ({"front": "Spørsmål", "back": " \n "}, "FLASHCARD_BACK_REQUIRED"),
        ({"back": ""}, "FLASHCARD_BACK_REQUIRED"),
    ],
)
async def test_sk6_tomt_felt_gir_422_og_ingenting_lagres(
    client: AsyncClient, lecture: str, engine: AsyncEngine, body: dict[str, str], code: str
) -> None:
    card = (await _cards_in(client, lecture))[0]
    response = await _patch(client, card["id"], body)
    assert response.status_code == 422
    assert response.json() == {"error": {"code": code, "details": {}}}
    stored = await _stored(engine, card["id"])
    assert stored is not None
    assert (stored.front, stored.back) == (card["front"], card["back"])


async def test_ar4_studentens_tekst_sjekkes_ikke_med_validate_item(
    client: AsyncClient, lecture: str, engine: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> None:
    card = (await _cards_in(client, lecture))[2]
    content_type = generation_registry.get_content_type("flashcards")

    def never(*_args: object) -> None:
        raise AssertionError("validate_item must not be called on a student edit")

    monkeypatch.setitem(
        generation_registry._types,
        "flashcards",
        dataclasses.replace(content_type, validate_item=never),
    )
    # Free text that is on no page of the file is accepted as it is.
    response = await _patch(client, card["id"], {"front": "Hva er 2 + 2?", "back": "Fire, ikke fra notatene."})

    assert response.status_code == 200
    stored = await _stored(engine, card["id"])
    assert stored is not None
    # The source (file and page) and the kind never change.
    assert (str(stored.file_id), stored.page_no, stored.kind) == (
        card["source"]["file_id"],
        card["source"]["page_no"],
        card["kind"],
    )
    assert response.json()["source"] == card["source"]


# --- Delete ------------------------------------------------------------------


async def test_fr27_slett_kort_gir_204_og_kortet_er_borte(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    cards = await _cards_in(client, lecture)

    response = await client.delete(f"{FLASHCARDS}/{cards[0]['id']}")

    assert response.status_code == 204
    assert response.content == b""
    assert await _stored(engine, cards[0]["id"]) is None
    assert [card["id"] for card in await _flashcards(client, lecture)] == [card["id"] for card in cards[1:]]
    # Deleting it again: it is gone, so 404 (the frontend takes it out as well).
    again = await client.delete(f"{FLASHCARDS}/{cards[0]['id']}")
    assert again.status_code == 404
    assert again.json() == NOT_FOUND


async def test_fr27_kort_kan_rettes_og_slettes_mens_en_jobb_pagar(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    from app.modules.generation.models import Job

    cards = await _cards_in(client, lecture)
    async with async_sessionmaker(engine)() as session:
        session.add(Job(lecture_id=uuid.UUID(lecture), kind="flashcards", params={}, status="running", requested=20))
        await session.commit()
    assert (await _patch(client, cards[0]["id"], {"front": "Nytt"})).status_code == 200
    assert (await client.delete(f"{FLASHCARDS}/{cards[1]['id']}")).status_code == 204


# --- Ownership and login -----------------------------------------------------


@pytest.mark.parametrize("method", ["PATCH", "DELETE"])
async def test_fr4_andres_ukjent_og_ugyldig_kort_gir_lik_404(
    client: AsyncClient, lecture: str, engine: AsyncEngine, method: str
) -> None:
    card = (await _cards_in(client, lecture))[0]
    await _log_in_new_user(client, "ola@eksempel.no")

    responses = [
        await client.request(method, f"{FLASHCARDS}/{card_id}", json={"front": "Olas tekst"})
        for card_id in (card["id"], str(uuid.uuid4()), "ikke-en-id")
    ]

    for response in responses:
        assert response.status_code == 404
        assert response.json() == NOT_FOUND
    assert responses[0].content == responses[1].content
    stored = await _stored(engine, card["id"])
    assert stored is not None
    assert stored.front == card["front"]


async def test_fr4_modellkort_kan_ikke_rettes_her(client: AsyncClient, lecture: str, engine: AsyncEngine) -> None:
    card = (await _cards_in(client, lecture))[0]
    model_id = uuid.uuid4()
    async with async_sessionmaker(engine)() as session:
        session.add(
            Flashcard(
                id=model_id, file_id=uuid.UUID(card["source"]["file_id"]), kind="model", front="AIDA", back=None, page_no=1
            )
        )
        await session.commit()
    assert (await _patch(client, model_id, {"front": "Ny"})).status_code == 404
    assert (await client.delete(f"{FLASHCARDS}/{model_id}")).status_code == 404


@pytest.mark.parametrize("method", ["PATCH", "DELETE"])
async def test_fr4_kortrutene_krever_innlogging(client: AsyncClient, method: str) -> None:
    client.cookies.clear()
    response = await client.request(method, f"{FLASHCARDS}/{uuid.uuid4()}", json={"front": "x"})
    assert response.status_code == 401
    assert _code(response) == "UNAUTHENTICATED"
