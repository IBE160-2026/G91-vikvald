"""Practise free-text questions (story 8.2): GET /api/lectures/{id}/freetext-questions
behind FEATURE_FREETEXT, and a free-text session with «delvis riktig» saved and
counted as «øvd» (FR-50, FR-51, FR-56, FR-4, AR-2, AR-11, AR-15)."""

import uuid
from typing import Any

import pytest
from httpx import AsyncClient

from app.core.config import get_settings
from app.main import app
from app.modules.generation.port import GenerationOptions, Page
from app.modules.generation.providers import get_generator
from tests.test_files import _log_in_new_user, _new_lecture, _upload
from tests.test_freetext import PAGE_TEXT, _start, definitions, lecture
from tests.test_jobs import _finish_jobs, no_jobs_left, pdf_with_pages
from tests.test_subjects import NOT_FOUND, _code

# Fixtures used by the tests below (imported so pytest finds them here).
__all__ = ["lecture", "no_jobs_left"]

LECTURES = "/api/lectures"
SESSIONS = "/api/practice-sessions"
OVERVIEW = "/api/overview"
QUESTION_FIELDS = {"id", "kind", "question", "model_answer", "formula_flag", "source", "lecture"}


async def _freetext_questions(client: AsyncClient, lecture_id: str) -> list[dict[str, Any]]:
    response = await client.get(f"{LECTURES}/{lecture_id}/freetext-questions")
    assert response.status_code == 200
    return response.json()


async def _made(client: AsyncClient, lecture_id: str, body: dict[str, Any] | None = None) -> None:
    assert (await _start(client, lecture_id, body)).status_code == 202
    await _finish_jobs()


async def test_fr49_fr50_sporsmalene_har_alle_feltene_med_modellsvar_og_kilde(client: AsyncClient, lecture: str) -> None:
    await _made(client, lecture)

    questions = await _freetext_questions(client, lecture)

    assert len(questions) == 7
    lecture_name = (await client.get(f"{LECTURES}/{lecture}")).json()["name"]
    for item in questions:
        assert set(item) == QUESTION_FIELDS
        assert set(item["source"]) == {"file_id", "file_name", "page_no"}
        assert item["source"]["file_name"] == "fritekst.pdf"
        assert item["lecture"] == {"id": lecture, "name": lecture_name}
        assert item["kind"] == "short"
        assert item["formula_flag"] is False
    first = questions[0]
    # The model answer is sent with the question (AR-15).
    assert (first["question"], first["model_answer"], first["source"]["page_no"]) == (
        "Forklar Merkevare.",
        "Merkevare er et navn.",
        1,
    )


async def test_fr41_fr49_formelmerket_folger_med_sporsmalet(client: AsyncClient, lecture: str) -> None:
    class Model:
        async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
            item = {"file_id": str(pages[0].file_id), "page_no": 1, "model_answer": "Et svar."}
            return [
                {**item, "question": "Drøft merkevare."},
                {**item, "question": "Drøft pris.", "formula_missing": True},
            ]

    app.dependency_overrides[get_generator] = Model
    await _made(client, lecture)

    flags = {item["question"]: item["formula_flag"] for item in await _freetext_questions(client, lecture)}

    assert flags == {"Drøft merkevare.": False, "Drøft pris.": True}


async def test_fr50_langsvar_har_kind_long(client: AsyncClient, lecture: str) -> None:
    await _made(client, lecture, {"kind": "freetext", "params": {"requested": 5, "question_kind": "long"}})
    assert {item["kind"] for item in await _freetext_questions(client, lecture)} == {"long"}


async def test_fr50_sporsmalene_kommer_i_fil_og_siderekkefolge(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    first = pdf_with_pages([definitions(["Alfa", "Beta"]), definitions(["Gamma"])])
    second = pdf_with_pages([definitions(["Delta"])])
    first_upload = await _upload(client, lecture_id, first, "a-notater.pdf")
    second_upload = await _upload(client, lecture_id, second, "b-notater.pdf")
    assert first_upload.status_code == second_upload.status_code == 201
    await _made(client, lecture_id)

    questions = await _freetext_questions(client, lecture_id)

    assert [(q["question"], q["source"]["file_name"], q["source"]["page_no"]) for q in questions] == [
        ("Forklar Alfa.", "a-notater.pdf", 1),
        ("Forklar Beta.", "a-notater.pdf", 1),
        ("Forklar Gamma.", "a-notater.pdf", 2),
        ("Forklar Delta.", "b-notater.pdf", 1),
    ]
    assert questions[0]["source"]["file_id"] == first_upload.json()["id"]
    assert questions[3]["source"]["file_id"] == second_upload.json()["id"]


async def test_fr50_ny_forelesning_gir_tom_liste(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    assert await _freetext_questions(client, lecture_id) == []


async def test_fr50_sporsmalene_fra_en_annen_forelesning_kommer_ikke_med(client: AsyncClient, lecture: str) -> None:
    other = await _new_lecture(client)
    assert (await _upload(client, other, pdf_with_pages([PAGE_TEXT]))).status_code == 201
    await _made(client, other)
    assert await _freetext_questions(client, lecture) == []
    assert len(await _freetext_questions(client, other)) == 2


async def test_fr4_andres_ukjent_eller_ugyldig_forelesning_gir_404(client: AsyncClient, lecture: str) -> None:
    await _made(client, lecture)
    await _log_in_new_user(client, "ola@eksempel.no")
    for lecture_id in (lecture, str(uuid.uuid4()), "ikke-en-id"):
        response = await client.get(f"{LECTURES}/{lecture_id}/freetext-questions")
        assert response.status_code == 404
        assert response.json() == NOT_FOUND


async def test_ar2_fritekstsporsmalene_krever_innlogging(client: AsyncClient, lecture: str) -> None:
    client.cookies.clear()
    assert (await client.get(f"{LECTURES}/{lecture}/freetext-questions")).status_code == 401


async def test_ar11_bryteren_av_gir_404_feature_disabled_for_oppslag(
    client: AsyncClient, lecture: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    await _made(client, lecture)
    monkeypatch.setenv("FEATURE_FREETEXT", "false")
    get_settings.cache_clear()
    response = await client.get(f"{LECTURES}/{lecture}/freetext-questions")
    assert response.status_code == 404
    assert _code(response) == "FEATURE_DISABLED"
    # Checked before the lecture is looked up: an unknown lecture says the same.
    unknown = await client.get(f"{LECTURES}/{uuid.uuid4()}/freetext-questions")
    assert _code(unknown) == "FEATURE_DISABLED"


# --- The saved session (FR-51, FR-56) ----------------------------------------


async def _subject_of(client: AsyncClient, lecture_id: str) -> str:
    return (await client.get(f"{LECTURES}/{lecture_id}")).json()["subject_id"]


def _session_body(subject_id: str, lecture_id: str, **changes: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "session_id": str(uuid.uuid4()),
        "subject_id": subject_id,
        "lecture_id": lecture_id,
        "kind": "freetext",
        "aborted": False,
        "shown": 3,
        "answered": 3,
        "correct": 1,
        "partial": 1,
        "wrong": 1,
        "duration_seconds": 90,
    }
    body.update(changes)
    return body


async def _overview_subject(client: AsyncClient, subject_id: str) -> dict[str, Any]:
    response = await client.get(OVERVIEW)
    assert response.status_code == 200
    [subject] = [item for item in response.json()["subjects"] if item["id"] == subject_id]
    return subject


async def test_fr56_freetext_fr51_okt_med_delvis_riktig_lagres_og_vises_som_siste_okt(
    client: AsyncClient, lecture: str
) -> None:
    await _made(client, lecture)
    subject_id = await _subject_of(client, lecture)

    response = await client.post(SESSIONS, json=_session_body(subject_id, lecture))

    assert response.status_code == 204
    subject = await _overview_subject(client, subject_id)
    last = subject["last_session"]
    assert {key: last[key] for key in ("kind", "lecture_id", "aborted", "shown", "answered")} == {
        "kind": "freetext",
        "lecture_id": lecture,
        "aborted": False,
        "shown": 3,
        "answered": 3,
    }
    assert (last["correct"], last["partial"], last["wrong"]) == (1, 1, 1)


async def test_fr56_freetext_forelesningsokt_teller_som_ovd(client: AsyncClient, lecture: str) -> None:
    await _made(client, lecture)
    subject_id = await _subject_of(client, lecture)
    [before] = (await _overview_subject(client, subject_id))["lectures"]
    assert before["practiced"] is False

    # Aborted after one assessment still counts.
    body = _session_body(subject_id, lecture, aborted=True, shown=7, answered=1, correct=0, partial=1, wrong=0)
    assert (await client.post(SESSIONS, json=body)).status_code == 204

    [after] = (await _overview_subject(client, subject_id))["lectures"]
    assert after["practiced"] is True
    assert after["last_practiced_at"] is not None
