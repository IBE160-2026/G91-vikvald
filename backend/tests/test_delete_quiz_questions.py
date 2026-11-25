"""Delete one quiz question: DELETE /api/quiz-questions/{id} (FR-37, SK-6, AR-2).

The questions are made by the mock pipeline from the fixed test file, as in
test_quiz_questions.py.
"""

import uuid
from typing import Any

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.modules.content.models import QuizQuestion
from tests.test_files import _log_in_new_user
from tests.test_jobs import _finish_jobs, no_jobs_left
from tests.test_quiz import _start_quiz, lecture
from tests.test_quiz_questions import _quiz_questions
from tests.test_subjects import NOT_FOUND, _code

# Fixtures used by the tests below (imported so pytest finds them here).
__all__ = ["lecture", "no_jobs_left"]

QUIZ_QUESTIONS = "/api/quiz-questions"


async def _questions_in(client: AsyncClient, lecture_id: str) -> list[dict[str, Any]]:
    """Make the lecture's quiz questions with the mock pipeline and return them."""
    assert (await _start_quiz(client, lecture_id)).status_code == 202
    await _finish_jobs()
    questions = await _quiz_questions(client, lecture_id)
    assert len(questions) == 5
    return questions


async def _stored(engine: AsyncEngine, question_id: str) -> QuizQuestion | None:
    async with async_sessionmaker(engine)() as session:
        return await session.get(QuizQuestion, uuid.UUID(question_id))


async def _subject_question_ids(client: AsyncClient, lecture_id: str) -> list[str]:
    subject_id = (await client.get(f"/api/lectures/{lecture_id}")).json()["subject_id"]
    response = await client.get(f"/api/subjects/{subject_id}/quiz-questions")
    assert response.status_code == 200
    return [item["id"] for item in response.json()]


async def test_fr37_slett_quizspormaal(client: AsyncClient, lecture: str, engine: AsyncEngine) -> None:
    questions = await _questions_in(client, lecture)
    ids = [item["id"] for item in questions]
    assert await _subject_question_ids(client, lecture) == ids

    response = await client.delete(f"{QUIZ_QUESTIONS}/{ids[0]}")

    assert response.status_code == 204
    assert response.content == b""
    assert await _stored(engine, ids[0]) is None
    # Gone from the lecture's list, the subject's list and the counts.
    assert [item["id"] for item in await _quiz_questions(client, lecture)] == ids[1:]
    assert await _subject_question_ids(client, lecture) == ids[1:]
    counts = (await client.get(f"/api/lectures/{lecture}/content-counts")).json()
    assert counts == {"flashcards": 0, "quiz_questions": 4, "model_cards": 0, "freetext_questions": 0}
    # Deleting it again: it is gone, so 404 (the frontend takes it out as well).
    again = await client.delete(f"{QUIZ_QUESTIONS}/{ids[0]}")
    assert again.status_code == 404
    assert again.json() == NOT_FOUND


async def test_fr37_quizspormaal_kan_slettes_mens_en_jobb_pagar(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    from app.modules.generation.models import Job

    questions = await _questions_in(client, lecture)
    async with async_sessionmaker(engine)() as session:
        session.add(
            Job(
                lecture_id=uuid.UUID(lecture),
                kind="quiz",
                params={"requested": 20, "difficulty": "medium"},
                status="running",
                requested=20,
            )
        )
        await session.commit()

    assert (await client.delete(f"{QUIZ_QUESTIONS}/{questions[0]['id']}")).status_code == 204
    assert await _stored(engine, questions[0]["id"]) is None


async def test_sk6_andres_ukjent_og_ugyldig_quizspormaal_gir_lik_404(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    question = (await _questions_in(client, lecture))[0]
    await _log_in_new_user(client, "ola@eksempel.no")

    responses = [
        await client.delete(f"{QUIZ_QUESTIONS}/{question_id}")
        for question_id in (question["id"], str(uuid.uuid4()), "ikke-en-id")
    ]

    for response in responses:
        assert response.status_code == 404
        assert response.json() == NOT_FOUND
    assert responses[0].content == responses[1].content == responses[2].content
    assert await _stored(engine, question["id"]) is not None


async def test_ar2_sletting_av_quizspormaal_krever_innlogging(client: AsyncClient) -> None:
    client.cookies.clear()
    response = await client.delete(f"{QUIZ_QUESTIONS}/{uuid.uuid4()}")
    assert response.status_code == 401
    assert _code(response) == "UNAUTHENTICATED"
