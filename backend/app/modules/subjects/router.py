"""HTTP routes for the subjects module (/api/subjects/* and /api/lectures/*)."""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.modules.identity.dependencies import current_user
from app.modules.identity.models import User
from app.modules.subjects.models import Lecture, Subject
from app.modules.subjects.schemas import (
    LectureCreate,
    LectureOut,
    LectureUpdate,
    SubjectCreate,
    SubjectOut,
    SubjectUpdate,
)
from app.modules.subjects.service import (
    create_lecture,
    create_subject,
    get_lecture,
    get_subject,
    lecture_counts,
    list_lectures,
    list_subjects,
    update_lecture,
    update_subject,
)

router = APIRouter(prefix="/api/subjects")
# A lecture has its own flat address (/api/lectures/{id}), like the page /forelesninger/{id}.
lectures_router = APIRouter(prefix="/api/lectures")

CurrentUser = Annotated[User, Depends(current_user)]
Session = Annotated[AsyncSession, Depends(get_session)]


def _as_utc(moment: datetime) -> datetime:
    # SQLite (tests) gives back the stored UTC time without its time zone.
    return moment.replace(tzinfo=UTC) if moment.tzinfo is None else moment


def _out(subject: Subject, lecture_count: int) -> SubjectOut:
    return SubjectOut(
        id=subject.id,
        name=subject.name,
        exam_date=subject.exam_date,
        color_index=subject.color_index,
        lecture_count=lecture_count,
        created_at=_as_utc(subject.created_at),
    )


async def _out_one(session: AsyncSession, subject: Subject) -> SubjectOut:
    counts = await lecture_counts(session, [subject.id])
    return _out(subject, counts.get(subject.id, 0))


def _lecture_out(lecture: Lecture) -> LectureOut:
    return LectureOut(
        id=lecture.id,
        subject_id=lecture.subject_id,
        name=lecture.name,
        date=lecture.date,
        created_at=_as_utc(lecture.created_at),
    )


@router.post("", status_code=201)
async def create(body: SubjectCreate, user: CurrentUser, session: Session) -> SubjectOut:
    return await _out_one(session, await create_subject(session, user.id, body.name, body.exam_date))


@router.get("")
async def list_all(user: CurrentUser, session: Session) -> list[SubjectOut]:
    subjects = await list_subjects(session, user.id)
    # One query for all the counts, not one per subject.
    counts = await lecture_counts(session, [subject.id for subject in subjects])
    return [_out(subject, counts.get(subject.id, 0)) for subject in subjects]


# The id is a plain string, so a malformed id gives 404 like an unknown one
# (not 422), and the frontend shows «Fant ikke siden».
@router.get("/{subject_id}")
async def get_one(subject_id: str, user: CurrentUser, session: Session) -> SubjectOut:
    return await _out_one(session, await get_subject(session, user.id, subject_id))


@router.patch("/{subject_id}")
async def update(
    subject_id: str, body: SubjectUpdate, user: CurrentUser, session: Session
) -> SubjectOut:
    subject = await update_subject(session, user.id, subject_id, body.name, body.exam_date)
    return await _out_one(session, subject)


@router.post("/{subject_id}/lectures", status_code=201)
async def create_one_lecture(
    subject_id: str, body: LectureCreate, user: CurrentUser, session: Session
) -> LectureOut:
    return _lecture_out(await create_lecture(session, user.id, subject_id, body.name, body.date))


# Sorted by date, then created_at, then id. The frontend never sorts again.
@router.get("/{subject_id}/lectures")
async def list_subject_lectures(
    subject_id: str, user: CurrentUser, session: Session
) -> list[LectureOut]:
    return [_lecture_out(lecture) for lecture in await list_lectures(session, user.id, subject_id)]


@lectures_router.get("/{lecture_id}")
async def get_one_lecture(lecture_id: str, user: CurrentUser, session: Session) -> LectureOut:
    return _lecture_out(await get_lecture(session, user.id, lecture_id))


@lectures_router.patch("/{lecture_id}")
async def update_one_lecture(
    lecture_id: str, body: LectureUpdate, user: CurrentUser, session: Session
) -> LectureOut:
    lecture = await update_lecture(session, user.id, lecture_id, body.name, body.date)
    return _lecture_out(lecture)
