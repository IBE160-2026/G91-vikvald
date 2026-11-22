"""Business logic for practice sessions, and the one place that decides which
lectures are practised («øvd», FR-56, AR-9)."""

import uuid
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError, ErrorCode
from app.modules.content.registry import first_content_times
from app.modules.practice.models import PracticeSession
from app.modules.practice.schemas import (
    LastSessionOut,
    OverviewLecture,
    OverviewOut,
    OverviewSubject,
    PracticeSessionIn,
)
from app.modules.subjects.service import get_lecture, get_subject, list_lectures, list_subjects


async def save_session(session: AsyncSession, user_id: uuid.UUID, data: PracticeSessionIn) -> None:
    """Store the result once. Someone else's or a missing subject, or a lecture
    that is not in this subject, gives 404 NOT_FOUND. The same session_id sent
    again stores nothing (ON CONFLICT DO NOTHING) and is not an error."""
    subject = await get_subject(session, user_id, data.subject_id)
    lecture_id: uuid.UUID | None = None
    if data.lecture_id is not None:
        lecture = await get_lecture(session, user_id, data.lecture_id)
        if lecture.subject_id != subject.id:
            raise AppError(ErrorCode.NOT_FOUND)
        lecture_id = lecture.id

    # The server's own clock, never the browser's (AR-9).
    started_at = datetime.now(UTC) - timedelta(seconds=data.duration_seconds)
    values = {
        "id": uuid.uuid4(),
        "session_id": data.session_id,
        "subject_id": subject.id,
        "lecture_id": lecture_id,
        "kind": data.kind,
        "aborted": data.aborted,
        "shown": data.shown,
        "answered": data.answered,
        "correct": data.correct,
        "partial": data.partial,
        "wrong": data.wrong,
        "started_at": started_at,
    }
    dialect = session.get_bind().dialect.name
    insert = postgresql_insert if dialect == "postgresql" else sqlite_insert
    statement = insert(PracticeSession).values(**values).on_conflict_do_nothing(index_elements=["session_id"])
    await session.execute(statement)
    await session.commit()


def _as_utc(moment: datetime) -> datetime:
    # SQLite (tests) gives back the stored UTC time without its time zone.
    return moment.replace(tzinfo=UTC) if moment.tzinfo is None else moment


@dataclass(frozen=True)
class LecturePractice:
    """Whether a lecture is practised, and when it was last practised."""

    practiced: bool
    last_practiced_at: datetime | None


async def _sessions(session: AsyncSession, subject_ids: Sequence[uuid.UUID]) -> list[PracticeSession]:
    """The sessions in the subjects, oldest first (started_at, then id)."""
    if not subject_ids:
        return []
    statement = (
        select(PracticeSession)
        .where(PracticeSession.subject_id.in_(subject_ids))
        .order_by(PracticeSession.started_at, PracticeSession.id)
    )
    return list(await session.scalars(statement))


async def _practiced(
    session: AsyncSession, lecture_ids: Sequence[uuid.UUID], sessions: Sequence[PracticeSession]
) -> dict[uuid.UUID, LecturePractice]:
    """The rule, for one subject's lectures and sessions.

    A session with a lecture counts for that lecture, also when aborted. A
    whole-subject session started at T counts for every lecture whose first
    content of the session's kind was made at or before T. The content module
    answers when that first content came (one query per kind)."""
    ids = tuple(lecture_ids)
    subject_kinds = {item.kind for item in sessions if item.lecture_id is None}
    first: dict[str, dict[uuid.UUID, datetime]] = {
        kind: await first_content_times(session, ids, kind) for kind in sorted(subject_kinds)
    }
    last: dict[uuid.UUID, datetime] = {}

    def count(lecture_id: uuid.UUID, started_at: datetime) -> None:
        if lecture_id not in last or started_at > last[lecture_id]:
            last[lecture_id] = started_at

    for item in sessions:
        started_at = _as_utc(item.started_at)
        if item.lecture_id is not None:
            if item.lecture_id in ids:
                count(item.lecture_id, started_at)
            continue
        for lecture_id, first_at in first[item.kind].items():
            if first_at <= started_at:
                count(lecture_id, started_at)

    return {
        lecture_id: LecturePractice(practiced=lecture_id in last, last_practiced_at=last.get(lecture_id))
        for lecture_id in ids
    }


async def practiced_lectures(
    session: AsyncSession, user_id: uuid.UUID, subject_id: uuid.UUID | str
) -> dict[uuid.UUID, LecturePractice]:
    """«Øvd» and last practised for every lecture in her subject. The only
    function that decides «øvd»; every view gets it from here (through
    GET /api/overview). Someone else's or a missing subject gives 404."""
    subject = await get_subject(session, user_id, str(subject_id))
    lectures = await list_lectures(session, user_id, str(subject.id))
    return await _practiced(session, [lecture.id for lecture in lectures], await _sessions(session, [subject.id]))


def _last_session_out(item: PracticeSession) -> LastSessionOut:
    return LastSessionOut(
        kind=item.kind,  # type: ignore[arg-type]  (checked by PracticeSessionIn when saved)
        lecture_id=item.lecture_id,
        started_at=_as_utc(item.started_at),
        aborted=item.aborted,
        shown=item.shown,
        answered=item.answered,
        correct=item.correct,
        partial=item.partial,
        wrong=item.wrong,
    )


async def overview(session: AsyncSession, user_id: uuid.UUID) -> OverviewOut:
    """Her subjects (in the order of GET /api/subjects), each with its lectures
    (in the order of GET /api/subjects/{id}/lectures), whether each lecture is
    practised (from practiced_lectures, per subject), and the subject's newest
    session."""
    subjects = await list_subjects(session, user_id)
    all_sessions = await _sessions(session, [subject.id for subject in subjects])
    by_subject: dict[uuid.UUID, list[PracticeSession]] = {}
    for item in all_sessions:
        by_subject.setdefault(item.subject_id, []).append(item)

    result: list[OverviewSubject] = []
    for subject in subjects:
        lectures = await list_lectures(session, user_id, str(subject.id))
        sessions = by_subject.get(subject.id, [])
        practice = await practiced_lectures(session, user_id, subject.id)
        # Oldest first, so the newest (started_at, then id) is the last one.
        last_session = _last_session_out(sessions[-1]) if sessions else None
        result.append(
            OverviewSubject(
                id=subject.id,
                name=subject.name,
                color_index=subject.color_index,
                exam_date=subject.exam_date,
                lectures=[
                    OverviewLecture(
                        id=lecture.id,
                        name=lecture.name,
                        date=lecture.date,
                        practiced=practice[lecture.id].practiced,
                        last_practiced_at=practice[lecture.id].last_practiced_at,
                    )
                    for lecture in lectures
                ],
                last_session=last_session,
            )
        )
    return OverviewOut(subjects=result)
