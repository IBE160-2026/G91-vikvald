"""Business logic for subjects and lectures."""

import uuid
from datetime import date

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError, ErrorCode
from app.core.ownership import get_owned
from app.modules.subjects.models import NAME_MAX_LENGTH, SUBJECT_COLOR_COUNT, Lecture, Subject


def clean_name(name: str) -> str:
    """The name trimmed, or NAME_REQUIRED (empty) / VALIDATION_ERROR (too long)."""
    name = name.strip()
    if not name:
        raise AppError(ErrorCode.NAME_REQUIRED)
    if len(name) > NAME_MAX_LENGTH:
        raise AppError(ErrorCode.VALIDATION_ERROR, {"fields": {"name": "string_too_long"}})
    return name


def next_color_index(used: list[int]) -> int:
    """The first of the six colours none of her subjects uses. When all six are
    in use, the number of subjects modulo six (so the colours repeat in order)."""
    free = [index for index in range(SUBJECT_COLOR_COUNT) if index not in used]
    return free[0] if free else len(used) % SUBJECT_COLOR_COUNT


async def create_subject(
    session: AsyncSession, user_id: uuid.UUID, name: str, exam_date: date
) -> Subject:
    name = clean_name(name)
    used = list(await session.scalars(select(Subject.color_index).where(Subject.user_id == user_id)))
    subject = Subject(
        user_id=user_id, name=name, exam_date=exam_date, color_index=next_color_index(used)
    )
    session.add(subject)
    await session.commit()
    return subject


async def list_subjects(session: AsyncSession, user_id: uuid.UUID) -> list[Subject]:
    """Her own subjects in the order they were created."""
    statement = (
        select(Subject)
        .where(Subject.user_id == user_id)
        .order_by(Subject.created_at, Subject.id)
    )
    return list(await session.scalars(statement))


async def get_subject(session: AsyncSession, user_id: uuid.UUID, subject_id: str) -> Subject:
    """Her subject with this id. Someone else's, a missing and a malformed id all
    give the same 404 NOT_FOUND."""
    try:
        parsed = uuid.UUID(subject_id)
    except ValueError:
        raise AppError(ErrorCode.NOT_FOUND) from None
    return await get_owned(session, Subject, parsed, user_id)


async def update_subject(
    session: AsyncSession,
    user_id: uuid.UUID,
    subject_id: str,
    name: str | None,
    exam_date: date | None,
) -> Subject:
    """Change the name and/or the exam date. The colour never changes."""
    subject = await get_subject(session, user_id, subject_id)
    if name is not None:
        subject.name = clean_name(name)
    if exam_date is not None:
        subject.exam_date = exam_date
    await session.commit()
    return subject


async def lecture_counts(session: AsyncSession, subject_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
    """The number of lectures per subject, in one query (GROUP BY). A subject
    without lectures is missing from the result (read it as 0)."""
    if not subject_ids:
        return {}
    statement = (
        select(Lecture.subject_id, func.count())
        .where(Lecture.subject_id.in_(subject_ids))
        .group_by(Lecture.subject_id)
    )
    return {subject_id: count for subject_id, count in (await session.execute(statement)).all()}


async def create_lecture(
    session: AsyncSession, user_id: uuid.UUID, subject_id: str, name: str, lecture_date: date
) -> Lecture:
    """A new lecture in her subject. Someone else's or a missing subject gives 404."""
    subject = await get_subject(session, user_id, subject_id)
    lecture = Lecture(subject_id=subject.id, name=clean_name(name), date=lecture_date)
    session.add(lecture)
    await session.commit()
    return lecture


async def list_lectures(session: AsyncSession, user_id: uuid.UUID, subject_id: str) -> list[Lecture]:
    """The lectures in her subject, sorted by date, then by when they were
    created (and by id, so the order is always the same)."""
    subject = await get_subject(session, user_id, subject_id)
    statement = (
        select(Lecture)
        .where(Lecture.subject_id == subject.id)
        .order_by(Lecture.date, Lecture.created_at, Lecture.id)
    )
    return list(await session.scalars(statement))


async def get_lecture(session: AsyncSession, user_id: uuid.UUID, lecture_id: str) -> Lecture:
    """Her lecture with this id. A lecture has no user_id of its own, so it is
    looked up together with its subject, and the subject must be hers.
    Someone else's, a missing and a malformed id all give the same 404 NOT_FOUND."""
    try:
        parsed = uuid.UUID(lecture_id)
    except ValueError:
        raise AppError(ErrorCode.NOT_FOUND) from None
    statement = (
        select(Lecture)
        .join(Subject, Lecture.subject_id == Subject.id)
        .where(Lecture.id == parsed, Subject.user_id == user_id)
    )
    lecture = (await session.execute(statement)).scalar_one_or_none()
    if lecture is None:
        raise AppError(ErrorCode.NOT_FOUND)
    return lecture


async def update_lecture(
    session: AsyncSession,
    user_id: uuid.UUID,
    lecture_id: str,
    name: str | None,
    lecture_date: date | None,
) -> Lecture:
    """Change the name and/or the date."""
    lecture = await get_lecture(session, user_id, lecture_id)
    if name is not None:
        lecture.name = clean_name(name)
    if lecture_date is not None:
        lecture.date = lecture_date
    await session.commit()
    return lecture


async def lecture_ids(session: AsyncSession, subject_id: uuid.UUID) -> list[uuid.UUID]:
    """The ids of all lectures in the subject."""
    statement = select(Lecture.id).where(Lecture.subject_id == subject_id).order_by(Lecture.id)
    return list(await session.scalars(statement))


async def delete_lecture(session: AsyncSession, lecture_id: uuid.UUID) -> None:
    """Delete the lecture row in one statement; everything under it goes with
    ON DELETE CASCADE. The caller checks ownership first and commits."""
    await session.execute(delete(Lecture).where(Lecture.id == lecture_id))


async def delete_subject(session: AsyncSession, subject_id: uuid.UUID) -> None:
    """Delete the subject row in one statement; its lectures and everything
    under them go with ON DELETE CASCADE. The caller checks ownership first and commits."""
    await session.execute(delete(Subject).where(Subject.id == subject_id))
