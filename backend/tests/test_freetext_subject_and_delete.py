"""Free-text for the whole subject and deleting a bad question (story 8.3):
GET /api/subjects/{id}/freetext-questions and DELETE /api/freetext-questions/{id}
behind FEATURE_FREETEXT, and a subject session counted as «øvd»
(FR-50, FR-52, FR-56, FR-4, SK-6, AR-2, AR-11).

The questions are made by the mock pipeline, as in test_freetext_practice.py.
"""

import uuid
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.core.config import get_settings
from app.modules.content.models import FreetextQuestion
from tests.test_files import _log_in_new_user, _upload
from tests.test_freetext import definitions, lecture
from tests.test_freetext_practice import (
    QUESTION_FIELDS,
    _freetext_questions,
    _made,
    _overview_subject,
    _session_body,
    _subject_of,
)
from tests.test_jobs import no_jobs_left, pdf_with_pages
from tests.test_lectures import _create_lecture, _new_subject
from tests.test_subjects import NOT_FOUND, _code

# Fixtures used by the tests below (imported so pytest finds them here).
__all__ = ["lecture", "no_jobs_left"]

SUBJECTS = "/api/subjects"
FREETEXT_QUESTIONS = "/api/freetext-questions"
SESSIONS = "/api/practice-sessions"


async def _subject_freetext_questions(client: AsyncClient, subject_id: str) -> list[dict[str, Any]]:
    response = await client.get(f"{SUBJECTS}/{subject_id}/freetext-questions")
    assert response.status_code == 200
    return response.json()


async def _lecture_with_questions(
    client: AsyncClient, subject_id: str, name: str, lecture_date: str, pages: list[list[str]], file_name: str
) -> str:
    lecture_id = (await _create_lecture(client, subject_id, name, lecture_date)).json()["id"]
    data = pdf_with_pages([definitions(terms) for terms in pages])
    assert (await _upload(client, lecture_id, data, file_name)).status_code == 201
    await _made(client, lecture_id)
    return lecture_id


async def _stored(engine: AsyncEngine, question_id: str) -> FreetextQuestion | None:
    async with async_sessionmaker(engine)() as session:
        return await session.get(FreetextQuestion, uuid.UUID(question_id))


def _switch_off(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FEATURE_FREETEXT", "false")
    get_settings.cache_clear()


# --- The subject's list (FR-50) ---------------------------------------------


async def test_fr50_subject_sporsmal_fra_alle_forelesningene_med_kilde_og_forelesning(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    # Created first, but its date is later, so its questions come last.
    later = await _lecture_with_questions(client, subject_id, "Uke 38: Pris", "2026-09-18", [["Pris"], ["Rabatt"]], "pris.pdf")
    earlier = await _lecture_with_questions(
        client, subject_id, "Uke 37: Merkevare", "2026-09-11", [["Alfa", "Beta"], ["Gamma"]], "merkevare.pdf"
    )
    # A lecture without files adds nothing.
    await _create_lecture(client, subject_id, "Uke 39: Tom", "2026-09-25")

    questions = await _subject_freetext_questions(client, subject_id)

    assert all(set(item) == QUESTION_FIELDS for item in questions)
    assert [
        (item["question"], item["source"]["file_name"], item["source"]["page_no"], item["lecture"]["name"])
        for item in questions
    ] == [
        ("Forklar Alfa.", "merkevare.pdf", 1, "Uke 37: Merkevare"),
        ("Forklar Beta.", "merkevare.pdf", 1, "Uke 37: Merkevare"),
        ("Forklar Gamma.", "merkevare.pdf", 2, "Uke 37: Merkevare"),
        ("Forklar Pris.", "pris.pdf", 1, "Uke 38: Pris"),
        ("Forklar Rabatt.", "pris.pdf", 2, "Uke 38: Pris"),
    ]
    assert {item["lecture"]["id"] for item in questions[:3]} == {earlier}
    assert {item["lecture"]["id"] for item in questions[3:]} == {later}
    first = questions[0]
    # The model answer is sent with the question (AR-15).
    assert (first["kind"], first["model_answer"], first["formula_flag"]) == (
        "short",
        "Alfa er et begrep i faget.",
        False,
    )


async def test_fr50_subject_sporsmalene_i_en_forelesning_kommer_i_fil_og_siderekkefolge(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    lecture_id = (await _create_lecture(client, subject_id, "Uke 37", "2026-09-11")).json()["id"]
    first = pdf_with_pages([definitions(["Alfa", "Beta"]), definitions(["Gamma"])])
    second = pdf_with_pages([definitions(["Delta"])])
    first_upload = await _upload(client, lecture_id, first, "a-notater.pdf")
    second_upload = await _upload(client, lecture_id, second, "b-notater.pdf")
    assert first_upload.status_code == second_upload.status_code == 201
    await _made(client, lecture_id)

    questions = await _subject_freetext_questions(client, subject_id)

    assert [(q["question"], q["source"]["file_id"], q["source"]["page_no"]) for q in questions] == [
        ("Forklar Alfa.", first_upload.json()["id"], 1),
        ("Forklar Beta.", first_upload.json()["id"], 1),
        ("Forklar Gamma.", first_upload.json()["id"], 2),
        ("Forklar Delta.", second_upload.json()["id"], 1),
    ]


async def test_fr50_subject_samme_dato_ordnes_etter_naar_forelesningen_ble_laget(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    await _lecture_with_questions(client, subject_id, "Først", "2026-09-11", [["Alfa", "Beta"]], "a.pdf")
    await _lecture_with_questions(client, subject_id, "Sist", "2026-09-11", [["Pris", "Rabatt"]], "b.pdf")
    questions = await _subject_freetext_questions(client, subject_id)
    assert [item["lecture"]["name"] for item in questions] == ["Først"] * 2 + ["Sist"] * 2


async def test_fr50_subject_emne_uten_sporsmal_gir_tom_liste(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    assert await _subject_freetext_questions(client, subject_id) == []
    await _create_lecture(client, subject_id)
    assert await _subject_freetext_questions(client, subject_id) == []


async def test_fr50_subject_sporsmal_fra_et_annet_emne_kommer_ikke_med(client: AsyncClient, lecture: str) -> None:
    await _made(client, lecture)
    other_subject = await _new_subject(client, "Statistikk")
    assert await _subject_freetext_questions(client, other_subject) == []
    assert len(await _subject_freetext_questions(client, await _subject_of(client, lecture))) == 7


async def test_fr4_subject_andres_ukjent_eller_ugyldig_emne_gir_404(client: AsyncClient, lecture: str) -> None:
    await _made(client, lecture)
    subject_id = await _subject_of(client, lecture)
    await _log_in_new_user(client, "ola@eksempel.no")
    for candidate in (subject_id, str(uuid.uuid4()), "ikke-en-id"):
        response = await client.get(f"{SUBJECTS}/{candidate}/freetext-questions")
        assert response.status_code == 404
        assert response.json() == NOT_FOUND


async def test_ar2_emnets_fritekstsporsmal_krever_innlogging(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    client.cookies.clear()
    assert (await client.get(f"{SUBJECTS}/{subject_id}/freetext-questions")).status_code == 401


async def test_ar11_subject_bryteren_av_gir_404_feature_disabled_for_oppslag(
    client: AsyncClient, lecture: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    await _made(client, lecture)
    subject_id = await _subject_of(client, lecture)
    _switch_off(monkeypatch)
    response = await client.get(f"{SUBJECTS}/{subject_id}/freetext-questions")
    assert response.status_code == 404
    assert _code(response) == "FEATURE_DISABLED"
    # Checked before the subject is looked up: an unknown subject says the same.
    assert _code(await client.get(f"{SUBJECTS}/{uuid.uuid4()}/freetext-questions")) == "FEATURE_DISABLED"


# --- Deleting a question (FR-52) --------------------------------------------


async def test_fr52_slett_fritekstsporsmal(client: AsyncClient, lecture: str, engine: AsyncEngine) -> None:
    await _made(client, lecture)
    subject_id = await _subject_of(client, lecture)
    ids = [item["id"] for item in await _freetext_questions(client, lecture)]
    assert [item["id"] for item in await _subject_freetext_questions(client, subject_id)] == ids

    response = await client.delete(f"{FREETEXT_QUESTIONS}/{ids[0]}")

    assert response.status_code == 204
    assert response.content == b""
    assert await _stored(engine, ids[0]) is None
    # Gone from the lecture's list, the subject's list and the counts.
    assert [item["id"] for item in await _freetext_questions(client, lecture)] == ids[1:]
    assert [item["id"] for item in await _subject_freetext_questions(client, subject_id)] == ids[1:]
    counts = (await client.get(f"/api/lectures/{lecture}/content-counts")).json()
    assert counts == {"flashcards": 0, "quiz_questions": 0, "model_cards": 0, "freetext_questions": 6, "summary_points": 0}
    # Deleting it again: it is gone, so 404 (the frontend takes it out as well).
    again = await client.delete(f"{FREETEXT_QUESTIONS}/{ids[0]}")
    assert again.status_code == 404
    assert again.json() == NOT_FOUND


async def test_fr52_fritekstsporsmal_kan_slettes_mens_en_jobb_pagar(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    from app.modules.generation.models import Job

    await _made(client, lecture)
    question_id = (await _freetext_questions(client, lecture))[0]["id"]
    async with async_sessionmaker(engine)() as session:
        session.add(
            Job(
                lecture_id=uuid.UUID(lecture),
                kind="freetext",
                params={"requested": 10, "question_kind": "short"},
                status="running",
                requested=10,
            )
        )
        await session.commit()

    assert (await client.delete(f"{FREETEXT_QUESTIONS}/{question_id}")).status_code == 204
    assert await _stored(engine, question_id) is None


async def test_fr52_sk6_andres_ukjent_og_ugyldig_fritekstsporsmal_gir_lik_404(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    await _made(client, lecture)
    question_id = (await _freetext_questions(client, lecture))[0]["id"]
    await _log_in_new_user(client, "ola@eksempel.no")

    responses = [
        await client.delete(f"{FREETEXT_QUESTIONS}/{candidate}")
        for candidate in (question_id, str(uuid.uuid4()), "ikke-en-id")
    ]

    for response in responses:
        assert response.status_code == 404
        assert response.json() == NOT_FOUND
    assert responses[0].content == responses[1].content == responses[2].content
    assert await _stored(engine, question_id) is not None


async def test_fr52_ar2_sletting_av_fritekstsporsmal_krever_innlogging(client: AsyncClient) -> None:
    client.cookies.clear()
    response = await client.delete(f"{FREETEXT_QUESTIONS}/{uuid.uuid4()}")
    assert response.status_code == 401
    assert _code(response) == "UNAUTHENTICATED"


async def test_fr52_ar11_bryteren_av_gir_404_feature_disabled_for_oppslag(
    client: AsyncClient, lecture: str, engine: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> None:
    await _made(client, lecture)
    question_id = (await _freetext_questions(client, lecture))[0]["id"]
    _switch_off(monkeypatch)

    for candidate in (question_id, str(uuid.uuid4())):
        response = await client.delete(f"{FREETEXT_QUESTIONS}/{candidate}")
        assert response.status_code == 404
        assert _code(response) == "FEATURE_DISABLED"
    assert await _stored(engine, question_id) is not None


# --- A subject session counts as «øvd» (FR-56) ------------------------------


async def test_fr56_freetext_emneokt_teller_for_forelesninger_med_sporsmal(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    with_questions = await _lecture_with_questions(client, subject_id, "Uke 37", "2026-09-11", [["Alfa"]], "a.pdf")
    without = (await _create_lecture(client, subject_id, "Uke 38", "2026-09-18")).json()["id"]
    # Free-text questions made after the session started do not count.
    later = await _new_lecture_in(client, subject_id)

    body = _session_body(subject_id, None, shown=1, answered=1, correct=1, partial=0, wrong=0, duration_seconds=0)
    assert (await client.post(SESSIONS, json=body)).status_code == 204
    await _made(client, later)

    lectures = {item["id"]: item for item in (await _overview_subject(client, subject_id))["lectures"]}
    assert lectures[with_questions]["practiced"] is True
    assert lectures[without]["practiced"] is False
    assert lectures[later]["practiced"] is False
    last = (await _overview_subject(client, subject_id))["last_session"]
    assert (last["kind"], last["lecture_id"]) == ("freetext", None)


async def _new_lecture_in(client: AsyncClient, subject_id: str) -> str:
    lecture_id = (await _create_lecture(client, subject_id, "Uke 39", "2026-09-25")).json()["id"]
    data = pdf_with_pages([definitions(["Gamma"])])
    assert (await _upload(client, lecture_id, data, "c.pdf")).status_code == 201
    return lecture_id


async def test_fr56_freetext_emneokt_startet_for_sporsmalene_teller_ikke(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    lecture_id = await _lecture_with_questions(client, subject_id, "Uke 37", "2026-09-11", [["Alfa"]], "a.pdf")

    # Started an hour ago, before the lecture had free-text questions.
    body = _session_body(subject_id, None, shown=1, answered=1, correct=1, partial=0, wrong=0, duration_seconds=3600)
    assert (await client.post(SESSIONS, json=body)).status_code == 204

    [only] = (await _overview_subject(client, subject_id))["lectures"]
    assert only["id"] == lecture_id
    assert only["practiced"] is False

