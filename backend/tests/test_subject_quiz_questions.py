"""The subject's quiz questions over HTTP: GET /api/subjects/{id}/quiz-questions (FR-34, FR-4)."""

import uuid

from httpx import AsyncClient

from tests.test_files import _log_in_new_user, _new_lecture, _upload
from tests.test_jobs import _finish_jobs, no_jobs_left, pdf_with_pages
from tests.test_lectures import _create_lecture, _new_subject
from tests.test_quiz import _start_quiz, distinct_definitions
from tests.test_subjects import NOT_FOUND

# Fixture used by the tests below (imported so pytest finds it here).
__all__ = ["no_jobs_left"]

SUBJECTS = "/api/subjects"
QUESTION_FIELDS = {"id", "question", "options", "correct_index", "explanation", "source", "lecture"}


async def _subject_quiz_questions(client: AsyncClient, subject_id: str) -> list[dict]:
    response = await client.get(f"{SUBJECTS}/{subject_id}/quiz-questions")
    assert response.status_code == 200
    return response.json()


async def _lecture_with_questions(
    client: AsyncClient, subject_id: str, name: str, lecture_date: str, pages: list[list[str]], file_name: str
) -> str:
    lecture_id = (await _create_lecture(client, subject_id, name, lecture_date)).json()["id"]
    upload = await _upload(client, lecture_id, pdf_with_pages([distinct_definitions(terms) for terms in pages]), file_name)
    assert upload.status_code == 201
    assert (await _start_quiz(client, lecture_id)).status_code == 202
    await _finish_jobs()
    return lecture_id


async def test_fr34_sporsmal_fra_alle_forelesningene_med_kilde_og_forelesning(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    # Created first, but its date is later, so its questions come last.
    later = await _lecture_with_questions(
        client, subject_id, "Uke 38: Pris", "2026-09-18", [["Pris", "Rabatt"], ["Kupong", "Avslag"]], "pris.pdf"
    )
    earlier = await _lecture_with_questions(
        client, subject_id, "Uke 37: Merkevare", "2026-09-11", [["Alfa", "Beta"], ["Gamma", "Delta"]], "merkevare.pdf"
    )
    # A lecture without files adds nothing.
    await _create_lecture(client, subject_id, "Uke 39: Tom", "2026-09-25")

    questions = await _subject_quiz_questions(client, subject_id)

    assert all(set(item) == QUESTION_FIELDS for item in questions)
    assert all(len(item["options"]) == 4 for item in questions)
    assert [
        (item["question"], item["source"]["file_name"], item["source"]["page_no"], item["lecture"]["name"])
        for item in questions
    ] == [
        ("Hva er Alfa?", "merkevare.pdf", 1, "Uke 37: Merkevare"),
        ("Hva er Beta?", "merkevare.pdf", 1, "Uke 37: Merkevare"),
        ("Hva er Gamma?", "merkevare.pdf", 2, "Uke 37: Merkevare"),
        ("Hva er Delta?", "merkevare.pdf", 2, "Uke 37: Merkevare"),
        ("Hva er Pris?", "pris.pdf", 1, "Uke 38: Pris"),
        ("Hva er Rabatt?", "pris.pdf", 1, "Uke 38: Pris"),
        ("Hva er Kupong?", "pris.pdf", 2, "Uke 38: Pris"),
        ("Hva er Avslag?", "pris.pdf", 2, "Uke 38: Pris"),
    ]
    assert {item["lecture"]["id"] for item in questions[:4]} == {earlier}
    assert {item["lecture"]["id"] for item in questions[4:]} == {later}
    first = questions[0]
    # The answer key is sent (AR-15): options[correct_index] is the correct answer.
    assert first["options"][first["correct_index"]] == "begrepet som heter alfa i faget."
    assert first["explanation"] == "Alfa er begrepet som heter alfa i faget."


async def test_fr34_sporsmalene_i_en_forelesning_kommer_i_fil_og_siderekkefolge(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    lecture_id = (await _create_lecture(client, subject_id, "Uke 37", "2026-09-11")).json()["id"]
    first = pdf_with_pages([distinct_definitions(["Alfa", "Beta"]), distinct_definitions(["Gamma"])])
    second = pdf_with_pages([distinct_definitions(["Delta"])])
    first_upload = await _upload(client, lecture_id, first, "a-notater.pdf")
    second_upload = await _upload(client, lecture_id, second, "b-notater.pdf")
    assert first_upload.status_code == second_upload.status_code == 201
    assert (await _start_quiz(client, lecture_id)).status_code == 202
    await _finish_jobs()

    questions = await _subject_quiz_questions(client, subject_id)

    assert [(q["question"], q["source"]["file_id"], q["source"]["page_no"]) for q in questions] == [
        ("Hva er Alfa?", first_upload.json()["id"], 1),
        ("Hva er Beta?", first_upload.json()["id"], 1),
        ("Hva er Gamma?", first_upload.json()["id"], 2),
        ("Hva er Delta?", second_upload.json()["id"], 1),
    ]


async def test_fr34_samme_dato_ordnes_etter_naar_forelesningen_ble_laget(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    await _lecture_with_questions(client, subject_id, "Først", "2026-09-11", [["Alfa", "Beta", "Gamma", "Delta"]], "a.pdf")
    await _lecture_with_questions(client, subject_id, "Sist", "2026-09-11", [["Pris", "Rabatt", "Kupong", "Avslag"]], "b.pdf")
    questions = await _subject_quiz_questions(client, subject_id)
    assert [item["lecture"]["name"] for item in questions] == ["Først"] * 4 + ["Sist"] * 4


async def test_fr34_emne_uten_sporsmal_gir_tom_liste(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    empty = await _new_subject(client)
    assert await _subject_quiz_questions(client, empty) == []
    await _create_lecture(client, empty)
    assert await _subject_quiz_questions(client, empty) == []


async def test_fr34_sporsmal_fra_et_annet_emne_kommer_ikke_med(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    other = await _new_lecture(client)
    pdf = pdf_with_pages([distinct_definitions(["Alfa", "Beta", "Gamma", "Delta"])])
    assert (await _upload(client, other, pdf)).status_code == 201
    assert (await _start_quiz(client, other)).status_code == 202
    await _finish_jobs()
    assert await _subject_quiz_questions(client, subject_id) == []


async def test_fr4_andres_ukjent_eller_ugyldig_emne_gir_404(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    await _log_in_new_user(client, "ola@eksempel.no")
    for candidate in (subject_id, str(uuid.uuid4()), "ikke-en-id"):
        response = await client.get(f"{SUBJECTS}/{candidate}/quiz-questions")
        assert response.status_code == 404
        assert response.json() == NOT_FOUND


async def test_fr4_emnets_quizsporsmal_krever_innlogging(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    client.cookies.clear()
    assert (await client.get(f"{SUBJECTS}/{subject_id}/quiz-questions")).status_code == 401
