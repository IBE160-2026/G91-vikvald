"""HTTP routes for the subjects module (/api/subjects/*)."""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.modules.identity.dependencies import current_user
from app.modules.identity.models import User
from app.modules.subjects.models import Subject
from app.modules.subjects.schemas import SubjectCreate, SubjectOut, SubjectUpdate
from app.modules.subjects.service import (
    create_subject,
    get_subject,
    list_subjects,
    update_subject,
)

router = APIRouter(prefix="/api/subjects")

CurrentUser = Annotated[User, Depends(current_user)]
Session = Annotated[AsyncSession, Depends(get_session)]


def _as_utc(moment: datetime) -> datetime:
    # SQLite (tests) gives back the stored UTC time without its time zone.
    return moment.replace(tzinfo=UTC) if moment.tzinfo is None else moment


def _out(subject: Subject) -> SubjectOut:
    return SubjectOut(
        id=subject.id,
        name=subject.name,
        exam_date=subject.exam_date,
        color_index=subject.color_index,
        # Lectures arrive in story 2.2.
        lecture_count=0,
        created_at=_as_utc(subject.created_at),
    )


@router.post("", status_code=201)
async def create(body: SubjectCreate, user: CurrentUser, session: Session) -> SubjectOut:
    return _out(await create_subject(session, user.id, body.name, body.exam_date))


@router.get("")
async def list_all(user: CurrentUser, session: Session) -> list[SubjectOut]:
    return [_out(subject) for subject in await list_subjects(session, user.id)]


# The id is a plain string, so a malformed id gives 404 like an unknown one
# (not 422), and the frontend shows «Fant ikke siden».
@router.get("/{subject_id}")
async def get_one(subject_id: str, user: CurrentUser, session: Session) -> SubjectOut:
    return _out(await get_subject(session, user.id, subject_id))


@router.patch("/{subject_id}")
async def update(
    subject_id: str, body: SubjectUpdate, user: CurrentUser, session: Session
) -> SubjectOut:
    return _out(await update_subject(session, user.id, subject_id, body.name, body.exam_date))
