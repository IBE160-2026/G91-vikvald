"""Business logic for practice sessions."""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError, ErrorCode
from app.modules.practice.models import PracticeSession
from app.modules.practice.schemas import PracticeSessionIn
from app.modules.subjects.service import get_lecture, get_subject


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
