"""«Øvd» regnet ut ett sted, og GET /api/overview (story 5.1: FR-56, AR-2, AR-9, AR-15, AR-16).

Most tests insert rows with fixed times straight into the tables, so the
borders (content made exactly at T, one second after) can be tested exactly.
"""

import re
import uuid
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.modules.content.models import Flashcard, QuizQuestion
from app.modules.content import registry as content_registry
from app.modules.content.registry import first_content_times, register_first_content, unregister_first_content
from app.modules.files.models import File
from app.modules.practice.models import PracticeSession
from app.modules.practice.service import practiced_lectures
from tests.test_files import _log_in_new_user as _log_in_with_terms
from tests.test_files import _upload
from tests.test_jobs import FIXTURE, _finish_jobs, _start
from tests.test_lectures import _create_lecture, _new_subject
from tests.test_practice_sessions import SESSIONS, _body
from tests.test_subjects import _log_in_new_user

OVERVIEW = "/api/overview"
T = datetime(2026, 11, 10, 12, 0, 0, tzinfo=UTC)


async def _subject_with_lectures(client: AsyncClient, name: str = "Markedsføring") -> tuple[str, str, str]:
    subject_id = await _new_subject(client, name)
    first = (await _create_lecture(client, subject_id, "Uke 37: Merkevare", "2026-09-11")).json()["id"]
    second = (await _create_lecture(client, subject_id, "Uke 38: Pris", "2026-09-18")).json()["id"]
    return subject_id, first, second


async def _add_file(engine: AsyncEngine, lecture_id: str) -> uuid.UUID:
    file_id = uuid.uuid4()
    async with async_sessionmaker(engine)() as session:
        session.add(File(id=file_id, lecture_id=uuid.UUID(lecture_id), original_name="notater.pdf", page_count=3))
        await session.commit()
    return file_id


async def _add_card(engine: AsyncEngine, lecture_id: str, created_at: datetime, kind: str = "qa") -> None:
    file_id = await _add_file(engine, lecture_id)
    async with async_sessionmaker(engine)() as session:
        session.add(
            Flashcard(file_id=file_id, kind=kind, front="Hva er en merkevare?", back="Et navn.", page_no=1, created_at=created_at)
        )
        await session.commit()


async def _add_quiz_question(engine: AsyncEngine, lecture_id: str, created_at: datetime) -> None:
    file_id = await _add_file(engine, lecture_id)
    async with async_sessionmaker(engine)() as session:
        session.add(
            QuizQuestion(
                file_id=file_id,
                page_no=1,
                question="Hva er en merkevare?",
                options=["A", "B", "C", "D"],
                correct_index=0,
                explanation="Fordi.",
                created_at=created_at,
            )
        )
        await session.commit()


async def _add_session(
    engine: AsyncEngine,
    subject_id: str,
    lecture_id: str | None,
    started_at: datetime,
    kind: str = "flashcards",
    aborted: bool = False,
    **counts: int,
) -> None:
    numbers = {"shown": 3, "answered": 3, "correct": 2, "partial": 0, "wrong": 1, **counts}
    async with async_sessionmaker(engine)() as session:
        session.add(
            PracticeSession(
                session_id=uuid.uuid4(),
                subject_id=uuid.UUID(subject_id),
                lecture_id=uuid.UUID(lecture_id) if lecture_id else None,
                kind=kind,
                aborted=aborted,
                started_at=started_at,
                **numbers,
            )
        )
        await session.commit()


async def _lectures(client: AsyncClient, subject_id: str) -> dict[str, dict[str, Any]]:
    response = await client.get(OVERVIEW)
    assert response.status_code == 200
    [subject] = [item for item in response.json()["subjects"] if item["id"] == subject_id]
    return {lecture["id"]: lecture for lecture in subject["lectures"]}


def _parse(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


# The rule (the I/O matrix in the spec).


async def test_fr56_avbrutt_forelesningsokt_gjor_forelesningen_ovd(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    subject_id, first, second = await _subject_with_lectures(client)
    await _add_session(engine, subject_id, first, T, aborted=True)

    lectures = await _lectures(client, subject_id)

    assert lectures[first]["practiced"] is True
    assert _parse(lectures[first]["last_practiced_at"]) == T
    assert lectures[second]["practiced"] is False
    assert lectures[second]["last_practiced_at"] is None


async def test_fr56_emneokt_teller_for_forelesninger_med_innhold_for_start(
    client: AsyncClient, engine: AsyncEngine
) -> None:
    await _log_in_new_user(client)
    subject_id, first, second = await _subject_with_lectures(client)
    await _add_card(engine, first, T - timedelta(hours=1))
    await _add_session(engine, subject_id, None, T)

    lectures = await _lectures(client, subject_id)

    assert lectures[first]["practiced"] is True
    assert _parse(lectures[first]["last_practiced_at"]) == T
    assert lectures[second]["practiced"] is False


async def test_fr56_innhold_laget_etter_start_teller_ikke(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    subject_id, first, _ = await _subject_with_lectures(client)
    await _add_card(engine, first, T + timedelta(seconds=1))
    await _add_session(engine, subject_id, None, T)

    assert (await _lectures(client, subject_id))[first]["practiced"] is False


async def test_fr56_innhold_laget_noyaktig_ved_start_teller(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    subject_id, first, _ = await _subject_with_lectures(client)
    await _add_card(engine, first, T)
    await _add_session(engine, subject_id, None, T)

    assert (await _lectures(client, subject_id))[first]["practiced"] is True


async def test_fr56_quiz_emneokt_teller_ikke_for_forelesning_med_bare_kort(
    client: AsyncClient, engine: AsyncEngine
) -> None:
    await _log_in_new_user(client)
    subject_id, first, second = await _subject_with_lectures(client)
    await _add_card(engine, first, T - timedelta(hours=1))
    await _add_quiz_question(engine, second, T - timedelta(hours=1))
    await _add_session(engine, subject_id, None, T, kind="quiz", shown=1, answered=1, correct=1, wrong=0)

    lectures = await _lectures(client, subject_id)

    assert lectures[first]["practiced"] is False
    assert lectures[second]["practiced"] is True


async def test_fr56_siste_ovd_er_den_nyeste_okten_som_teller(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    subject_id, first, _ = await _subject_with_lectures(client)
    t2 = T + timedelta(days=2)
    await _add_card(engine, first, T - timedelta(hours=1))
    await _add_session(engine, subject_id, first, T)
    await _add_session(engine, subject_id, None, t2)

    assert _parse((await _lectures(client, subject_id))[first]["last_practiced_at"]) == t2


async def test_fr56_eldre_emneokt_flytter_ikke_siste_ovd_bakover(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    subject_id, first, _ = await _subject_with_lectures(client)
    await _add_card(engine, first, T - timedelta(days=5))
    await _add_session(engine, subject_id, None, T - timedelta(days=1))
    await _add_session(engine, subject_id, first, T)

    assert _parse((await _lectures(client, subject_id))[first]["last_practiced_at"]) == T


async def test_ar9_emneokt_med_nettleserklokke_fem_minutter_bak_gjor_forelesningen_ovd(
    client: AsyncClient, engine: AsyncEngine
) -> None:
    # Real cards from the pipeline, then a subject session whose browser sends
    # a started_at five minutes behind: the server's own time is used.
    await _log_in_with_terms(client)
    subject_id = await _new_subject(client)
    lecture_id = (await _create_lecture(client, subject_id)).json()["id"]
    assert (await _upload(client, lecture_id, FIXTURE.read_bytes())).status_code == 201
    assert (await _start(client, lecture_id)).status_code == 202
    await _finish_jobs()

    browser_time = datetime.now(UTC) - timedelta(minutes=5)
    body = _body(subject_id, None, duration_seconds=0, started_at=browser_time.isoformat())
    assert (await client.post(SESSIONS, json=body)).status_code == 204

    assert (await _lectures(client, subject_id))[lecture_id]["practiced"] is True


async def test_fr56_practiced_lectures_gir_regelen_per_forelesning(client: AsyncClient, engine: AsyncEngine) -> None:
    user_id = await _log_in_new_user(client)
    subject_id, first, second = await _subject_with_lectures(client)
    await _add_session(engine, subject_id, first, T)

    async with async_sessionmaker(engine)() as session:
        result = await practiced_lectures(session, uuid.UUID(user_id), subject_id)

    assert result[uuid.UUID(first)].practiced is True
    assert result[uuid.UUID(first)].last_practiced_at == T
    assert result[uuid.UUID(second)].practiced is False
    assert result[uuid.UUID(second)].last_practiced_at is None


# The API.


async def test_ar15_oversikten_har_feltene_rekkefolgen_og_siste_okt(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    other_subject, _, _ = await _subject_with_lectures(client, "Samfunnsøkonomi")
    subject_id = await _new_subject(client, "Organisasjon")
    # Created out of date order: the overview orders lectures by date, as the lecture route.
    later = (await _create_lecture(client, subject_id, "Uke 40: Ledelse", "2026-10-02")).json()["id"]
    earlier = (await _create_lecture(client, subject_id, "Uke 36: Intro", "2026-09-04")).json()["id"]
    await _add_session(engine, subject_id, earlier, T - timedelta(days=1))
    await _add_session(
        engine, subject_id, None, T, kind="quiz", aborted=True, shown=8, answered=2, correct=1, wrong=1
    )

    response = await client.get(OVERVIEW)

    assert response.status_code == 200
    subjects = response.json()["subjects"]
    listed = (await client.get("/api/subjects")).json()
    assert [item["id"] for item in subjects] == [item["id"] for item in listed]
    assert subjects[0]["id"] == other_subject
    assert subjects[0]["last_session"] is None
    subject = subjects[1]
    assert set(subject) == {"id", "name", "color_index", "exam_date", "lectures", "last_session"}
    assert (subject["name"], subject["exam_date"], subject["color_index"]) == ("Organisasjon", "2026-12-04", 1)
    lecture_order = (await client.get(f"/api/subjects/{subject_id}/lectures")).json()
    assert [item["id"] for item in subject["lectures"]] == [item["id"] for item in lecture_order] == [earlier, later]
    assert set(subject["lectures"][0]) == {"id", "name", "date", "practiced", "last_practiced_at"}
    assert subject["lectures"][0]["date"] == "2026-09-04"
    # ISO 8601 with a time zone.
    assert _parse(subject["lectures"][0]["last_practiced_at"]).utcoffset() == timedelta(0)
    assert subject["last_session"] == {
        "kind": "quiz",
        "lecture_id": None,
        "started_at": subject["last_session"]["started_at"],
        "aborted": True,
        "shown": 8,
        "answered": 2,
        "correct": 1,
        "partial": 0,
        "wrong": 1,
    }
    assert _parse(subject["last_session"]["started_at"]) == T


async def test_ar15_siste_okt_er_den_som_startet_sist(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    subject_id, first, second = await _subject_with_lectures(client)
    # Stored out of order.
    await _add_session(engine, subject_id, second, T + timedelta(hours=1))
    await _add_session(engine, subject_id, first, T)

    [subject] = (await client.get(OVERVIEW)).json()["subjects"]

    assert subject["last_session"]["lecture_id"] == second


async def test_ar2_oversikten_krever_innlogging(client: AsyncClient) -> None:
    client.cookies.clear()
    response = await client.get(OVERVIEW)
    assert response.status_code == 401
    assert response.json() == {"error": {"code": "UNAUTHENTICATED", "details": {}}}


async def test_ar9_oversikten_viser_bare_egne_emner(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client, "klara@eksempel.no")
    klara_subject, klara_lecture, _ = await _subject_with_lectures(client)
    await _add_session(engine, klara_subject, klara_lecture, T)

    await _log_in_new_user(client, "ola@eksempel.no")
    ola_subject = await _new_subject(client, "Statistikk")

    subjects = (await client.get(OVERVIEW)).json()["subjects"]
    assert [item["id"] for item in subjects] == [ola_subject]
    assert subjects[0]["last_session"] is None


async def test_fr56_emne_uten_okter_har_ingen_ovde_forelesninger(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id, first, second = await _subject_with_lectures(client)

    lectures = await _lectures(client, subject_id)

    assert [lectures[item]["practiced"] for item in (first, second)] == [False, False]


async def test_fr56_emneokt_i_ett_emne_merker_ikke_forelesninger_i_et_annet(
    client: AsyncClient, engine: AsyncEngine
) -> None:
    await _log_in_new_user(client)
    subject_a, a_first, a_second = await _subject_with_lectures(client, "Markedsføring")
    subject_b, b_first, b_second = await _subject_with_lectures(client, "Statistikk")
    # Cards in every lecture before T; only subject A has a whole-subject session.
    for lecture_id in (a_first, a_second, b_first, b_second):
        await _add_card(engine, lecture_id, T - timedelta(hours=1))
    await _add_session(engine, subject_a, None, T)
    await _add_session(engine, subject_b, b_second, T - timedelta(days=1))

    a = await _lectures(client, subject_a)
    b = await _lectures(client, subject_b)

    assert [a[item]["practiced"] for item in (a_first, a_second)] == [True, True]
    assert [b[item]["practiced"] for item in (b_first, b_second)] == [False, True]
    assert _parse(b[b_second]["last_practiced_at"]) == T - timedelta(days=1)
    subjects = {item["id"]: item for item in (await client.get(OVERVIEW)).json()["subjects"]}
    assert subjects[subject_a]["last_session"]["lecture_id"] is None
    assert subjects[subject_b]["last_session"]["lecture_id"] == b_second


# The content side (AR-16).


@pytest.fixture
def freetext_registered() -> Iterator[dict[uuid.UUID, datetime]]:
    """A "freetext" kind registered later, in place of the built-in one from
    story 8.1 (restored afterwards). The test fills in the first times it
    answers with."""
    answers: dict[uuid.UUID, datetime] = {}

    async def first_freetext_times(_session: Any, lecture_ids: tuple[uuid.UUID, ...]) -> dict[uuid.UUID, datetime]:
        return {lecture_id: moment for lecture_id, moment in answers.items() if lecture_id in lecture_ids}

    content_registry._ensure_builtin_first_content()
    builtin = content_registry._first_content["freetext"]
    unregister_first_content("freetext")
    register_first_content("freetext", first_freetext_times)
    try:
        yield answers
    finally:
        unregister_first_content("freetext")
        register_first_content("freetext", builtin)


async def test_ar16_type_registrert_senere_brukes_av_regelen(
    client: AsyncClient, engine: AsyncEngine, freetext_registered: dict[uuid.UUID, datetime]
) -> None:
    await _log_in_new_user(client)
    subject_id, first, second = await _subject_with_lectures(client)
    freetext_registered[uuid.UUID(first)] = T - timedelta(hours=1)
    freetext_registered[uuid.UUID(second)] = T + timedelta(hours=1)
    await _add_session(engine, subject_id, None, T, kind="freetext")

    lectures = await _lectures(client, subject_id)

    assert lectures[first]["practiced"] is True
    assert lectures[second]["practiced"] is False


def test_ar16_samme_type_to_ganger_er_en_feil(freetext_registered: dict[uuid.UUID, datetime]) -> None:
    async def other(_session: Any, _lecture_ids: tuple[uuid.UUID, ...]) -> dict[uuid.UUID, datetime]:
        return {}

    with pytest.raises(ValueError):
        register_first_content("freetext", other)
    with pytest.raises(ValueError):
        register_first_content("flashcards", other)


async def test_fr56_first_content_times_teller_modellkort(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    _, first, second = await _subject_with_lectures(client)
    await _add_card(engine, first, T, kind="model")
    await _add_card(engine, second, T + timedelta(hours=2), kind="concept")
    await _add_card(engine, second, T + timedelta(hours=1), kind="qa")

    async with async_sessionmaker(engine)() as session:
        found = await first_content_times(session, (uuid.UUID(first), uuid.UUID(second)), "flashcards")

    assert found == {uuid.UUID(first): T, uuid.UUID(second): T + timedelta(hours=1)}


async def test_ar16_first_content_times_for_quiz_og_ukjent_type(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    _, first, second = await _subject_with_lectures(client)
    await _add_quiz_question(engine, first, T)
    lecture_ids = (uuid.UUID(first), uuid.UUID(second))

    async with async_sessionmaker(engine)() as session:
        assert await first_content_times(session, lecture_ids, "quiz") == {uuid.UUID(first): T}
        assert await first_content_times(session, lecture_ids, "freetext") == {}
        assert await first_content_times(session, lecture_ids, "summary") == {}
        assert await first_content_times(session, (), "quiz") == {}


# The module boundary (AR-9).


# The model and the table. The request body PracticeSessionIn is the practice
# module's public input to save_session, which the seed (story 6.4) uses too.
_PRACTICE_TABLE = re.compile(r"\bPracticeSession(?!In\b)\w*|practice_sessions")


def test_ar9_bare_practice_nevner_practice_sessions() -> None:
    app_dir = Path(__file__).resolve().parent.parent / "app"
    practice_dir = app_dir / "modules" / "practice"
    offenders = [
        str(path.relative_to(app_dir))
        for path in app_dir.rglob("*.py")
        if practice_dir not in path.parents
        and _PRACTICE_TABLE.search(path.read_text(encoding="utf-8"))
    ]
    assert offenders == []
