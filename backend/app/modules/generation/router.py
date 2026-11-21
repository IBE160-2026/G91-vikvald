"""HTTP routes for generation jobs (AR-4):
POST /api/lectures/{id}/jobs, GET /api/lectures/{id}/jobs/latest,
GET /api/jobs/active and GET /api/jobs/{id}.

A job always runs in the background, so no request waits for a model (no
HTTP request may last over 30 s). The answer to POST is 202 with the running job.
"""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.db import get_session, get_sessionmaker
from app.core.errors import AppError, ErrorCode
from app.modules.files.service import list_files
from app.modules.generation.models import Job
from app.modules.generation.port import Generator
from app.modules.generation.providers import get_generator
from app.modules.generation.schemas import JobCreate, JobOut, JobParams, TrackedJobOut
from app.modules.generation.service import (
    active_jobs,
    create_job,
    get_job_for_user,
    latest_jobs,
    run_job,
    start_task,
)
from app.modules.identity.dependencies import current_user
from app.modules.identity.models import User
from app.modules.subjects.service import get_lecture

lectures_router = APIRouter(prefix="/api/lectures")
# The job watcher in the (app) layout follows the student's jobs through these.
jobs_router = APIRouter(prefix="/api/jobs")

CurrentUser = Annotated[User, Depends(current_user)]
Session = Annotated[AsyncSession, Depends(get_session)]
JobGenerator = Annotated[Generator, Depends(get_generator)]
Sessionmaker = Annotated[async_sessionmaker[AsyncSession], Depends(get_sessionmaker)]


def _as_utc(moment: datetime | None) -> datetime | None:
    # SQLite (tests) gives back the stored UTC time without its time zone.
    if moment is None:
        return None
    return moment.replace(tzinfo=UTC) if moment.tzinfo is None else moment


def _job_out(job: Job) -> JobOut:
    return JobOut(
        id=job.id,
        lecture_id=job.lecture_id,
        kind=job.kind,
        status=job.status,  # type: ignore[arg-type]
        requested=job.requested,
        created=job.created,
        discarded=job.discarded,
        error_code=job.error_code,
        started_at=_as_utc(job.started_at),  # type: ignore[arg-type]
        finished_at=_as_utc(job.finished_at),
    )


@lectures_router.post("/{lecture_id}/jobs", status_code=202)
async def start_job(
    lecture_id: str,
    body: JobCreate,
    user: CurrentUser,
    session: Session,
    generator: JobGenerator,
    sessionmaker: Sessionmaker,
) -> JobOut:
    lecture = await get_lecture(session, user.id, lecture_id)
    if not await list_files(session, lecture.id):
        raise AppError(ErrorCode.LECTURE_HAS_NO_FILES)
    params = body.params or JobParams()
    job = await create_job(
        session, lecture.id, body.kind, params.model_dump(), params.requested
    )
    answer = _job_out(job)
    start_task(run_job(job.id, generator, sessionmaker))
    return answer


@lectures_router.get("/{lecture_id}/jobs/latest")
async def latest_lecture_jobs(lecture_id: str, user: CurrentUser, session: Session) -> list[JobOut]:
    lecture = await get_lecture(session, user.id, lecture_id)
    return [_job_out(job) for job in await latest_jobs(session, lecture.id)]


def _tracked_job_out(job: Job, lecture_name: str) -> TrackedJobOut:
    return TrackedJobOut(**_job_out(job).model_dump(), lecture_name=lecture_name)


@jobs_router.get("/active")
async def active_user_jobs(user: CurrentUser, session: Session) -> list[TrackedJobOut]:
    return [_tracked_job_out(job, name) for job, name in await active_jobs(session, user.id)]


@jobs_router.get("/{job_id}")
async def get_user_job(job_id: str, user: CurrentUser, session: Session) -> TrackedJobOut:
    job, name = await get_job_for_user(session, user.id, job_id)
    return _tracked_job_out(job, name)
