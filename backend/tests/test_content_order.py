"""Fixed order of flashcards and quiz questions saved in the same batch (issue #224).

A batch shares one created_at. Before the fix the last sort key was the random
id, so items on the same page came in a random order. With twelve items on one
page, a random order matches the saved order by chance only once in 12! times."""

import uuid

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.modules.content.models import Flashcard, QuizQuestion
from app.modules.content.service import NewFlashcard, NewQuizQuestion, add_flashcards, add_quiz_questions
from tests.test_files import _log_in_new_user, _upload
from tests.test_jobs import definitions, pdf_with_pages
from tests.test_lectures import _create_lecture, _new_subject

TERMS = [f"Begrep {number:02d}" for number in range(12)]
# Saved in an order that is neither alphabetical nor the order of the terms above.
SAVED_ORDER = [TERMS[index] for index in (7, 2, 11, 0, 5, 9, 3, 10, 1, 8, 4, 6)]


async def _lecture_with_file(client: AsyncClient) -> tuple[str, str, uuid.UUID]:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    lecture_id = (await _create_lecture(client, subject_id, "Uke 37", "2026-09-11")).json()["id"]
    upload = await _upload(client, lecture_id, pdf_with_pages([definitions(["Alfa"])]))
    assert upload.status_code == 201
    return subject_id, lecture_id, uuid.UUID(upload.json()["id"])


async def test_fr23_kort_i_samme_omgang_kommer_i_rekkefolgen_de_ble_laget(
    client: AsyncClient, engine: AsyncEngine
) -> None:
    subject_id, lecture_id, file_id = await _lecture_with_file(client)
    async with async_sessionmaker(engine, expire_on_commit=False)() as session:
        add_flashcards(
            session,
            [NewFlashcard(file_id=file_id, page_no=1, kind="concept", front=term, back="forklaring") for term in SAVED_ORDER],
        )
        await session.commit()
        stamps = set(await session.scalars(select(Flashcard.created_at)))
    # The premise of the test: the whole batch has the same time stamp.
    assert len(stamps) == 1

    for path in (f"/api/lectures/{lecture_id}/flashcards", f"/api/subjects/{subject_id}/flashcards"):
        response = await client.get(path)
        assert response.status_code == 200
        assert [card["front"] for card in response.json()] == SAVED_ORDER, path


async def test_fr34_sporsmal_i_samme_omgang_kommer_i_rekkefolgen_de_ble_laget(
    client: AsyncClient, engine: AsyncEngine
) -> None:
    subject_id, lecture_id, file_id = await _lecture_with_file(client)
    async with async_sessionmaker(engine, expire_on_commit=False)() as session:
        add_quiz_questions(
            session,
            [
                NewQuizQuestion(
                    file_id=file_id,
                    page_no=1,
                    question=f"Hva er {term}?",
                    options=(f"{term} riktig", "feil a", "feil b", "feil c"),
                    correct_index=0,
                    explanation=f"{term} er riktig.",
                )
                for term in SAVED_ORDER
            ],
        )
        await session.commit()
        stamps = set(await session.scalars(select(QuizQuestion.created_at)))
    assert len(stamps) == 1

    expected = [f"Hva er {term}?" for term in SAVED_ORDER]
    for path in (f"/api/lectures/{lecture_id}/quiz-questions", f"/api/subjects/{subject_id}/quiz-questions"):
        response = await client.get(path)
        assert response.status_code == 200
        assert [item["question"] for item in response.json()] == expected, path
