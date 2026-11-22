"""The lecture's quiz questions over HTTP: GET /api/lectures/{id}/quiz-questions
(FR-32, AR-15, FR-4)."""

import uuid

from httpx import AsyncClient

from tests.test_files import _log_in_new_user, _new_lecture, _upload
from tests.test_jobs import FIXTURE, _finish_jobs, no_jobs_left, pdf_with_pages
from tests.test_quiz import _start_quiz, distinct_definitions, lecture
from tests.test_subjects import NOT_FOUND

# Fixtures used by the tests below (imported so pytest finds them here).
__all__ = ["lecture", "no_jobs_left"]

LECTURES = "/api/lectures"
QUESTION_FIELDS = {"id", "question", "options", "correct_index", "explanation", "source", "lecture"}


async def _quiz_questions(client: AsyncClient, lecture_id: str) -> list[dict]:
    response = await client.get(f"{LECTURES}/{lecture_id}/quiz-questions")
    assert response.status_code == 200
    return response.json()


async def test_fr32_sporsmalene_har_alle_feltene_og_fasit(client: AsyncClient, lecture: str) -> None:
    assert (await _start_quiz(client, lecture)).status_code == 202
    await _finish_jobs()

    questions = await _quiz_questions(client, lecture)

    assert len(questions) == 5
    lecture_name = (await client.get(f"{LECTURES}/{lecture}")).json()["name"]
    for item in questions:
        assert set(item) == QUESTION_FIELDS
        assert len(item["options"]) == 4
        assert item["source"]["file_name"] == "definisjoner.pdf"
        assert item["lecture"] == {"id": lecture, "name": lecture_name}
    first = next(item for item in questions if item["question"] == "Hva er Merkevare?")
    # The answer key is sent (AR-15): options[correct_index] is the correct answer.
    assert first["options"][first["correct_index"]] == (
        "et navn, et symbol eller en design som skiller et produkt fra andre."
    )
    assert first["explanation"] == (
        "Merkevare er et navn, et symbol eller en design som skiller et produkt fra andre."
    )
    assert first["source"]["page_no"] == 1


async def test_fr32_sporsmalene_kommer_i_fil_og_siderekkefolge(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    first = pdf_with_pages(
        [distinct_definitions(["Alfa", "Beta"]), distinct_definitions(["Gamma"])]
    )
    second = pdf_with_pages([distinct_definitions(["Delta"])])
    first_upload = await _upload(client, lecture_id, first, "a-notater.pdf")
    second_upload = await _upload(client, lecture_id, second, "b-notater.pdf")
    assert first_upload.status_code == second_upload.status_code == 201

    assert (await _start_quiz(client, lecture_id)).status_code == 202
    await _finish_jobs()

    questions = await _quiz_questions(client, lecture_id)
    assert [(q["question"], q["source"]["file_name"], q["source"]["page_no"]) for q in questions] == [
        ("Hva er Alfa?", "a-notater.pdf", 1),
        ("Hva er Beta?", "a-notater.pdf", 1),
        ("Hva er Gamma?", "a-notater.pdf", 2),
        ("Hva er Delta?", "b-notater.pdf", 1),
    ]
    assert questions[0]["source"]["file_id"] == first_upload.json()["id"]
    assert questions[3]["source"]["file_id"] == second_upload.json()["id"]


async def test_fr32_ny_forelesning_gir_tom_liste(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    assert await _quiz_questions(client, lecture_id) == []


async def test_fr32_sporsmalene_fra_en_annen_forelesning_kommer_ikke_med(client: AsyncClient, lecture: str) -> None:
    other = await _new_lecture(client)
    assert (await _upload(client, other, FIXTURE.read_bytes())).status_code == 201
    assert (await _start_quiz(client, other)).status_code == 202
    await _finish_jobs()
    assert await _quiz_questions(client, lecture) == []
    assert len(await _quiz_questions(client, other)) == 5


async def test_fr4_andres_ukjent_eller_ugyldig_forelesning_gir_404(client: AsyncClient, lecture: str) -> None:
    await _log_in_new_user(client, "ola@eksempel.no")
    for lecture_id in (lecture, str(uuid.uuid4()), "ikke-en-id"):
        response = await client.get(f"{LECTURES}/{lecture_id}/quiz-questions")
        assert response.status_code == 404
        assert response.json() == NOT_FOUND


async def test_fr4_quizsporsmalene_krever_innlogging(client: AsyncClient, lecture: str) -> None:
    client.cookies.clear()
    assert (await client.get(f"{LECTURES}/{lecture}/quiz-questions")).status_code == 401
