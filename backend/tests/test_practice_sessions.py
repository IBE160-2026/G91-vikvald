"""Saving a practice session: POST /api/practice-sessions (FR-26, FR-56, AR-9, SK-20)."""

import json
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from httpx import AsyncClient, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.modules.practice.models import PracticeSession
from app.modules.practice.schemas import MAX_COUNT, MAX_DURATION_SECONDS
from app.modules.content.models import Flashcard
from app.modules.subjects.models import Lecture
from tests.test_files import _log_in_new_user as _log_in_with_terms
from tests.test_files import _upload
from tests.test_jobs import FIXTURE, _finish_jobs, _start
from tests.test_lectures import _create_lecture, _new_subject
from tests.test_subjects import NOT_FOUND, _log_in_new_user

SESSIONS = "/api/practice-sessions"


def _body(subject_id: str, lecture_id: str | None, **changes: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "session_id": str(uuid.uuid4()),
        "subject_id": subject_id,
        "lecture_id": lecture_id,
        "kind": "flashcards",
        "aborted": False,
        "shown": 3,
        "answered": 3,
        "correct": 2,
        "wrong": 1,
        "duration_seconds": 120,
    }
    body.update(changes)
    return body


async def _subject_and_lecture(client: AsyncClient) -> tuple[str, str]:
    subject_id = await _new_subject(client)
    lecture_id = (await _create_lecture(client, subject_id)).json()["id"]
    return subject_id, lecture_id


async def _rows(engine: AsyncEngine) -> list[PracticeSession]:
    async with async_sessionmaker(engine)() as session:
        return list(await session.scalars(select(PracticeSession)))


async def _count(engine: AsyncEngine) -> int:
    async with async_sessionmaker(engine)() as session:
        return await session.scalar(select(func.count()).select_from(PracticeSession)) or 0


def _utc(value: datetime) -> datetime:
    # SQLite gives the time back without a time zone; it was stored as UTC.
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def _code(response: Response) -> str:
    return response.json()["error"]["code"]


async def test_fr26_ferdig_okt_lagres_som_json_med_204(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    subject_id, lecture_id = await _subject_and_lecture(client)
    body = _body(subject_id, lecture_id)

    response = await client.post(SESSIONS, json=body)

    assert response.status_code == 204
    assert response.content == b""
    [row] = await _rows(engine)
    assert str(row.session_id) == body["session_id"]
    assert str(row.subject_id) == subject_id
    assert str(row.lecture_id) == lecture_id
    assert (row.kind, row.aborted) == ("flashcards", False)
    assert (row.shown, row.answered, row.correct, row.partial, row.wrong) == (3, 3, 2, 0, 1)


async def test_fr56_avbrutt_okt_sendt_som_text_plain_lagres(client: AsyncClient, engine: AsyncEngine) -> None:
    # navigator.sendBeacon sends text/plain (no CORS preflight); the body is still JSON.
    await _log_in_new_user(client)
    subject_id, lecture_id = await _subject_and_lecture(client)
    body = _body(subject_id, lecture_id, aborted=True, answered=1, correct=0, wrong=1, shown=2)

    response = await client.post(
        SESSIONS, content=json.dumps(body), headers={"Content-Type": "text/plain;charset=UTF-8"}
    )

    assert response.status_code == 204
    [row] = await _rows(engine)
    assert row.aborted is True
    assert (row.shown, row.answered, row.correct, row.wrong) == (2, 1, 0, 1)


async def test_fr56_okt_uten_forelesning_lagres_for_hele_emnet(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    assert (await client.post(SESSIONS, json=_body(subject_id, None))).status_code == 204
    [row] = await _rows(engine)
    assert row.lecture_id is None


async def test_sk20_samme_session_id_to_ganger_gir_en_rad(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    subject_id, lecture_id = await _subject_and_lecture(client)
    body = _body(subject_id, lecture_id)

    first = await client.post(SESSIONS, json=body)
    # The beacon may come after the fetch (or the other way round).
    second = await client.post(SESSIONS, content=json.dumps({**body, "aborted": True}), headers={"Content-Type": "text/plain"})

    assert first.status_code == second.status_code == 204
    [row] = await _rows(engine)
    assert row.aborted is False


async def test_ar9_andres_emne_gir_404(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client, "ola@eksempel.no")
    olas_subject, olas_lecture = await _subject_and_lecture(client)
    await _log_in_new_user(client)
    mine, my_lecture = await _subject_and_lecture(client)

    for body in (
        _body(olas_subject, olas_lecture),
        _body(olas_subject, None),
        # Her own subject with someone else's lecture.
        _body(mine, olas_lecture),
        # Someone else's subject with her own lecture.
        _body(olas_subject, my_lecture),
    ):
        response = await client.post(SESSIONS, json=body)
        assert response.status_code == 404
        assert response.json() == NOT_FOUND
    assert await _count(engine) == 0


async def test_ar9_ukjent_eller_ugyldig_id_gir_404(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    subject_id, _ = await _subject_and_lecture(client)
    for body in (
        _body(str(uuid.uuid4()), None),
        _body("ikke-en-id", None),
        _body(subject_id, str(uuid.uuid4())),
        _body(subject_id, "ikke-en-id"),
    ):
        response = await client.post(SESSIONS, json=body)
        assert response.status_code == 404
        assert response.json() == NOT_FOUND
    assert await _count(engine) == 0


async def test_ar9_forelesning_i_et_annet_av_hennes_emner_gir_404(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    _, other_lecture = await _subject_and_lecture(client)
    response = await client.post(SESSIONS, json=_body(subject_id, other_lecture))
    assert response.status_code == 404
    assert response.json() == NOT_FOUND
    assert await _count(engine) == 0


async def test_ar9_uten_innlogging_gir_401(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    subject_id, lecture_id = await _subject_and_lecture(client)
    client.cookies.clear()
    response = await client.post(SESSIONS, json=_body(subject_id, lecture_id))
    assert response.status_code == 401
    assert _code(response) == "UNAUTHENTICATED"
    assert await _count(engine) == 0


@pytest.mark.parametrize(
    "changes",
    [
        {"answered": 0, "correct": 0, "wrong": 0},
        {"correct": 3, "wrong": 1},
        {"shown": 2},
        {"correct": -1, "wrong": 4},
        {"duration_seconds": -1},
        {"duration_seconds": MAX_DURATION_SECONDS + 1},
        {"kind": "summary"},
        {"session_id": "ikke-en-id"},
        {"aborted": None},
        {"partial": 1},
        # «Delvis» only exists for free text.
        {"partial": 1, "correct": 1},
        {"kind": "quiz", "partial": 1, "correct": 1},
        # Above the upper bound (and the INTEGER column on Postgres).
        {"shown": 2**31, "answered": 2**31, "correct": 2**31 - 1},
        {"shown": MAX_COUNT + 1},
    ],
)
async def test_fr56_ugyldige_tall_gir_422(client: AsyncClient, engine: AsyncEngine, changes: dict[str, Any]) -> None:
    await _log_in_new_user(client)
    subject_id, lecture_id = await _subject_and_lecture(client)
    response = await client.post(SESSIONS, json=_body(subject_id, lecture_id, **changes))
    assert response.status_code == 422
    assert _code(response) == "VALIDATION_ERROR"
    assert "fields" in response.json()["error"]["details"]
    assert await _count(engine) == 0


async def test_fr56_delvis_teller_med_i_summen(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    subject_id, lecture_id = await _subject_and_lecture(client)
    body = _body(subject_id, lecture_id, kind="freetext", correct=1, partial=1, wrong=1)
    assert (await client.post(SESSIONS, json=body)).status_code == 204
    [row] = await _rows(engine)
    assert row.partial == 1


@pytest.mark.parametrize("raw", [b"", b"ikke json", b"[]", b'{"session_id": '])
async def test_fr56_ugyldig_json_gir_422(client: AsyncClient, engine: AsyncEngine, raw: bytes) -> None:
    await _log_in_new_user(client)
    response = await client.post(SESSIONS, content=raw, headers={"Content-Type": "text/plain"})
    assert response.status_code == 422
    assert _code(response) == "VALIDATION_ERROR"
    assert await _count(engine) == 0


async def test_ar9_started_at_regnes_ut_med_serverens_klokke(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    subject_id, lecture_id = await _subject_and_lecture(client)
    # The browser's clock is 5 minutes ahead, and it sends a started_at of its own.
    browser_time = datetime.now(UTC) + timedelta(minutes=5)
    body = _body(subject_id, lecture_id, duration_seconds=120, started_at=browser_time.isoformat())

    before = datetime.now(UTC)
    assert (await client.post(SESSIONS, json=body)).status_code == 204
    after = datetime.now(UTC)

    [row] = await _rows(engine)
    started_at = _utc(row.started_at)
    assert before - timedelta(seconds=120) <= started_at <= after - timedelta(seconds=120)


async def test_ar9_started_at_er_ikke_for_forelesningen_ble_laget(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    subject_id, lecture_id = await _subject_and_lecture(client)
    assert (await client.post(SESSIONS, json=_body(subject_id, lecture_id, duration_seconds=0))).status_code == 204
    async with async_sessionmaker(engine)() as session:
        lecture = await session.get(Lecture, uuid.UUID(lecture_id))
        assert lecture is not None
        created_at = _utc(lecture.created_at)
    [row] = await _rows(engine)
    assert _utc(row.started_at) >= created_at


async def test_ar9_sletting_av_forelesning_sletter_oktene(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    subject_id, lecture_id = await _subject_and_lecture(client)
    assert (await client.post(SESSIONS, json=_body(subject_id, lecture_id))).status_code == 204
    assert (await client.post(SESSIONS, json=_body(subject_id, None))).status_code == 204

    assert (await client.delete(f"/api/lectures/{lecture_id}")).status_code == 204

    [row] = await _rows(engine)
    assert row.lecture_id is None


async def test_ar9_sletting_av_emne_sletter_oktene(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    subject_id, lecture_id = await _subject_and_lecture(client)
    kept_subject, kept_lecture = await _subject_and_lecture(client)
    assert (await client.post(SESSIONS, json=_body(subject_id, lecture_id))).status_code == 204
    assert (await client.post(SESSIONS, json=_body(subject_id, None))).status_code == 204
    assert (await client.post(SESSIONS, json=_body(kept_subject, kept_lecture))).status_code == 204

    assert (await client.delete(f"/api/subjects/{subject_id}")).status_code == 204

    [row] = await _rows(engine)
    assert str(row.subject_id) == kept_subject


async def test_ar9_emneokt_starter_etter_kort_laget_rett_for_selv_med_klokke_fem_minutter_etter(
    client: AsyncClient, engine: AsyncEngine
) -> None:
    # Cards made just before a subject session (lecture_id null); the browser's
    # clock is five minutes behind and it sends a started_at of its own.
    await _log_in_with_terms(client)
    subject_id, lecture_id = await _subject_and_lecture(client)
    assert (await _upload(client, lecture_id, FIXTURE.read_bytes())).status_code == 201
    assert (await _start(client, lecture_id)).status_code == 202
    await _finish_jobs()
    async with async_sessionmaker(engine)() as session:
        card_times = list(await session.scalars(select(Flashcard.created_at)))
    assert card_times
    newest_card = max(_utc(value) for value in card_times)

    browser_time = datetime.now(UTC) - timedelta(minutes=5)
    body = _body(subject_id, None, duration_seconds=0, started_at=browser_time.isoformat())
    assert (await client.post(SESSIONS, json=body)).status_code == 204

    [row] = await _rows(engine)
    assert row.lecture_id is None
    assert _utc(row.started_at) >= newest_card
