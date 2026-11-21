"""Business logic for subjects."""

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError, ErrorCode
from app.core.ownership import get_owned
from app.modules.subjects.models import NAME_MAX_LENGTH, SUBJECT_COLOR_COUNT, Subject


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
