"""The subject's flashcards over HTTP: GET /api/subjects/{id}/flashcards (FR-23, FR-4)."""

import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.modules.content.models import Flashcard
from tests.test_files import _log_in_new_user, _new_lecture, _upload
from tests.test_jobs import _finish_jobs, _start, definitions, no_jobs_left, pdf_with_pages
from tests.test_lectures import _create_lecture, _new_subject
from tests.test_subjects import NOT_FOUND

# Fixture used by the tests below (imported so pytest finds it here).
__all__ = ["no_jobs_left"]

SUBJECTS = "/api/subjects"
CARD_FIELDS = {"id", "kind", "front", "back", "source", "lecture"}


async def _subject_flashcards(client: AsyncClient, subject_id: str) -> list[dict]:
    response = await client.get(f"{SUBJECTS}/{subject_id}/flashcards")
    assert response.status_code == 200
    return response.json()


async def _lecture_with_cards(
    client: AsyncClient, subject_id: str, name: str, lecture_date: str, pages: list[list[str]], file_name: str
) -> str:
    lecture_id = (await _create_lecture(client, subject_id, name, lecture_date)).json()["id"]
    upload = await _upload(client, lecture_id, pdf_with_pages([definitions(terms) for terms in pages]), file_name)
    assert upload.status_code == 201
    assert (await _start(client, lecture_id)).status_code == 202
    await _finish_jobs()
    return lecture_id


async def test_fr23_kort_fra_alle_forelesningene_med_kilde_og_forelesning(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    # Created first, but its date is later, so its cards come last.
    later = await _lecture_with_cards(
        client, subject_id, "Uke 38: Pris", "2026-09-18", [["Pris"], ["Rabatt"]], "pris.pdf"
    )
    earlier = await _lecture_with_cards(
        client, subject_id, "Uke 37: Merkevare", "2026-09-11", [["Alfa"], ["Beta"], ["Gamma"]], "merkevare.pdf"
    )
    # A lecture without files adds nothing.
    await _create_lecture(client, subject_id, "Uke 39: Tom", "2026-09-25")

    cards = await _subject_flashcards(client, subject_id)

    assert all(set(card) == CARD_FIELDS for card in cards)
    assert [
        (card["front"], card["source"]["file_name"], card["source"]["page_no"], card["lecture"]["name"])
        for card in cards
    ] == [
        ("Alfa", "merkevare.pdf", 1, "Uke 37: Merkevare"),
        ("Beta", "merkevare.pdf", 2, "Uke 37: Merkevare"),
        ("Gamma", "merkevare.pdf", 3, "Uke 37: Merkevare"),
        ("Pris", "pris.pdf", 1, "Uke 38: Pris"),
        ("Rabatt", "pris.pdf", 2, "Uke 38: Pris"),
    ]
    assert {card["lecture"]["id"] for card in cards[:3]} == {earlier}
    assert {card["lecture"]["id"] for card in cards[3:]} == {later}
    assert cards[0]["kind"] == "concept"
    assert cards[0]["back"] == "Alfa er et begrep i faget."


async def test_fr23_samme_dato_ordnes_etter_naar_forelesningen_ble_laget(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    await _lecture_with_cards(client, subject_id, "Først", "2026-09-11", [["Alfa"]], "a.pdf")
    await _lecture_with_cards(client, subject_id, "Sist", "2026-09-11", [["Beta"]], "b.pdf")
    cards = await _subject_flashcards(client, subject_id)
    assert [card["lecture"]["name"] for card in cards] == ["Først", "Sist"]


async def test_fr23_emne_uten_kort_gir_tom_liste(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    empty = await _new_subject(client)
    assert await _subject_flashcards(client, empty) == []
    await _create_lecture(client, empty)
    assert await _subject_flashcards(client, empty) == []


async def test_fr23_kort_fra_et_annet_emne_kommer_ikke_med(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    other = await _new_lecture(client)
    assert (await _upload(client, other, pdf_with_pages([definitions(["Alfa"])]))).status_code == 201
    await _start(client, other)
    await _finish_jobs()
    assert await _subject_flashcards(client, subject_id) == []


async def test_fr23_modellkort_kommer_ikke_med(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    await _lecture_with_cards(client, subject_id, "Uke 37", "2026-09-11", [["Alfa"]], "a.pdf")
    cards = await _subject_flashcards(client, subject_id)
    async with async_sessionmaker(engine)() as session:
        session.add(
            Flashcard(
                file_id=uuid.UUID(cards[0]["source"]["file_id"]),
                kind="model",
                front="AIDA",
                back=None,
                page_no=1,
            )
        )
        await session.commit()
    assert [card["front"] for card in await _subject_flashcards(client, subject_id)] == ["Alfa"]


async def test_fr4_andres_ukjent_eller_ugyldig_emne_gir_404(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    await _log_in_new_user(client, "ola@eksempel.no")
    for candidate in (subject_id, str(uuid.uuid4()), "ikke-en-id"):
        response = await client.get(f"{SUBJECTS}/{candidate}/flashcards")
        assert response.status_code == 404
        assert response.json() == NOT_FOUND


async def test_fr4_emnets_kort_krever_innlogging(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    client.cookies.clear()
    assert (await client.get(f"{SUBJECTS}/{subject_id}/flashcards")).status_code == 401
