"""The lecture's flashcards over HTTP: GET /api/lectures/{id}/flashcards (FR-20, FR-4)."""

import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.modules.content.models import Flashcard
from tests.test_files import _log_in_new_user, _new_lecture, _upload
from tests.test_jobs import FIXTURE, _finish_jobs, _start, definitions, lecture, no_jobs_left, pdf_with_pages
from tests.test_subjects import NOT_FOUND

# Fixtures used by the tests below (imported so pytest finds them here).
__all__ = ["lecture", "no_jobs_left"]

LECTURES = "/api/lectures"
CARD_FIELDS = {"id", "kind", "front", "back", "points", "mnemonic", "formula_flag", "source"}


async def _flashcards(client: AsyncClient, lecture_id: str) -> list[dict]:
    response = await client.get(f"{LECTURES}/{lecture_id}/flashcards")
    assert response.status_code == 200
    return response.json()


async def test_fr20_kortene_har_kilde_og_kommer_i_fil_og_siderekkefolge(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    first = pdf_with_pages([definitions(["Alfa"]), definitions(["Beta"])])
    second = pdf_with_pages([definitions(["Gamma"])])
    first_upload = await _upload(client, lecture_id, first, "a-notater.pdf")
    second_upload = await _upload(client, lecture_id, second, "b-notater.pdf")
    assert first_upload.status_code == second_upload.status_code == 201

    assert await _flashcards(client, lecture_id) == []
    assert (await _start(client, lecture_id)).status_code == 202
    await _finish_jobs()

    cards = await _flashcards(client, lecture_id)
    assert all(set(card) == CARD_FIELDS for card in cards)
    assert [(card["front"], card["source"]["file_name"], card["source"]["page_no"]) for card in cards] == [
        ("Alfa", "a-notater.pdf", 1),
        ("Beta", "a-notater.pdf", 2),
        ("Gamma", "b-notater.pdf", 1),
    ]
    assert cards[0]["source"]["file_id"] == first_upload.json()["id"]
    assert cards[2]["source"]["file_id"] == second_upload.json()["id"]
    assert cards[0]["kind"] == "concept"
    assert cards[0]["back"] == "Alfa er et begrep i faget."


async def test_fr19_fr56_modellkort_kommer_med_blant_sporsmals_og_begrepskortene(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    cards = await _flashcards(client, lecture)
    assert len(cards) == 5
    async with async_sessionmaker(engine)() as session:
        session.add(
            Flashcard(
                file_id=uuid.UUID(cards[0]["source"]["file_id"]),
                kind="model",
                front="AIDA",
                back=None,
                points=["Attention", "Interest", "Desire", "Action"],
                mnemonic="AIDA",
                page_no=1,
            )
        )
        await session.commit()
    after = await _flashcards(client, lecture)
    assert len(after) == 6
    model = next(card for card in after if card["kind"] == "model")
    assert (model["front"], model["back"], model["points"], model["mnemonic"]) == (
        "AIDA",
        None,
        ["Attention", "Interest", "Desire", "Action"],
        "AIDA",
    )
    assert all(card["points"] is None and card["mnemonic"] is None for card in after if card["kind"] != "model")


async def test_fr20_kortene_fra_en_annen_forelesning_kommer_ikke_med(client: AsyncClient, lecture: str) -> None:
    other = await _new_lecture(client)
    assert (await _upload(client, other, FIXTURE.read_bytes())).status_code == 201
    await _start(client, other)
    await _finish_jobs()
    assert await _flashcards(client, lecture) == []
    assert len(await _flashcards(client, other)) == 5


async def test_fr4_andres_ukjent_eller_ugyldig_forelesning_gir_404(client: AsyncClient, lecture: str) -> None:
    await _log_in_new_user(client, "ola@eksempel.no")
    for lecture_id in (lecture, str(uuid.uuid4()), "ikke-en-id"):
        response = await client.get(f"{LECTURES}/{lecture_id}/flashcards")
        assert response.status_code == 404
        assert response.json() == NOT_FOUND


async def test_fr4_kortene_krever_innlogging(client: AsyncClient, lecture: str) -> None:
    client.cookies.clear()
    assert (await client.get(f"{LECTURES}/{lecture}/flashcards")).status_code == 401
