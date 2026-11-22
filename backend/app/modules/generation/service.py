"""The generation pipeline (AR-4) and its jobs.

A job runs as an asyncio task with its own database sessions, after the
request that started it has answered 202. The pipeline: the lecture's pages ->
the keys of existing content -> the port -> validate_item per item (invalid
items are thrown away and counted) -> the valid items in a fixed order (file,
page) -> at most `requested` of them -> saved together with the finished job in
one commit. If anything fails, nothing is stored and the job becomes failed.
The model call has a time limit (GENERATION_TIMEOUT_SECONDS); when it runs
out, the job becomes failed with GENERATION_TIMEOUT.
"""

import asyncio
import logging
import uuid
from collections.abc import Coroutine
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.errors import AppError, ErrorCode
from app.modules.content.registry import register_delete_guard
from app.modules.files.service import pages_for_lecture
from app.modules.generation.models import JOB_DONE, JOB_FAILED, JOB_RUNNING, Job
from app.modules.generation.port import GenerationOptions, Generator, Page
from app.modules.generation.registry import get_content_type
from app.modules.subjects.models import Lecture, Subject

logger = logging.getLogger(__name__)

# The running job tasks. asyncio keeps only weak references to tasks, so they
# are held here until they finish.
JOB_TASKS: set[asyncio.Task[None]] = set()

# The longest a model call may take (3 minutes). Read when the call is made, so
# tests can lower it with monkeypatch.
GENERATION_TIMEOUT_SECONDS: float = 180


class GenerationTimeoutError(Exception):
    """The model call ran past GENERATION_TIMEOUT_SECONDS. Only this gives
    GENERATION_TIMEOUT; any other TimeoutError (e.g. from the database) is an
    ordinary failure."""


def _now() -> datetime:
    return datetime.now(UTC)


def start_task(job: Coroutine[Any, Any, None]) -> asyncio.Task[None]:
    task = asyncio.create_task(job)
    JOB_TASKS.add(task)
    task.add_done_callback(JOB_TASKS.discard)
    return task


async def lecture_has_running_job(session: AsyncSession, lecture_id: uuid.UUID) -> bool:
    statement = select(Job.id).where(Job.lecture_id == lecture_id, Job.status == JOB_RUNNING)
    return (await session.execute(statement.limit(1))).first() is not None


async def no_running_jobs(session: AsyncSession, lecture_ids: tuple[uuid.UUID, ...]) -> None:
    """The delete guard (AR-7): AppError(JOB_ALREADY_RUNNING) if any of the
    lectures has a running job, so a file, lecture, subject or account is never
    deleted (or a file replaced) under a job that reads it."""
    statement = select(Job.id).where(Job.lecture_id.in_(lecture_ids), Job.status == JOB_RUNNING)
    if (await session.execute(statement.limit(1))).first() is not None:
        raise AppError(ErrorCode.JOB_ALREADY_RUNNING)


# Registered when this module is imported (the app imports it at startup), so
# the delete routes in `files` ask it without importing `generation`.
register_delete_guard(no_running_jobs)


async def create_job(
    session: AsyncSession, lecture_id: uuid.UUID, kind: str, params: dict[str, Any], requested: int
) -> Job:
    """Store a running job, or AppError(JOB_ALREADY_RUNNING) if the lecture
    already has one. Checked first; the unique index catches two requests that
    pass the check at the same moment."""
    if await lecture_has_running_job(session, lecture_id):
        raise AppError(ErrorCode.JOB_ALREADY_RUNNING)
    job = Job(
        id=uuid.uuid4(),
        lecture_id=lecture_id,
        kind=kind,
        params=params,
        status=JOB_RUNNING,
        requested=requested,
        started_at=_now(),
    )
    session.add(job)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise AppError(ErrorCode.JOB_ALREADY_RUNNING) from None
    return job


async def latest_jobs(session: AsyncSession, lecture_id: uuid.UUID) -> list[Job]:
    """The newest job (by started_at) of each kind in the lecture, sorted by kind."""
    statement = (
        select(Job)
        .where(Job.lecture_id == lecture_id)
        .order_by(Job.kind, Job.started_at.desc(), Job.id.desc())
    )
    newest: dict[str, Job] = {}
    for job in await session.scalars(statement):
        newest.setdefault(job.kind, job)
    return list(newest.values())


async def active_jobs(session: AsyncSession, user_id: uuid.UUID) -> list[tuple[Job, str]]:
    """The user's running jobs with their lecture's name, oldest first. A job
    has no user_id of its own: it belongs to her through lecture and subject."""
    statement = (
        select(Job, Lecture.name)
        .join(Lecture, Job.lecture_id == Lecture.id)
        .join(Subject, Lecture.subject_id == Subject.id)
        .where(Subject.user_id == user_id, Job.status == JOB_RUNNING)
        .order_by(Job.started_at, Job.id)
    )
    return [(job, name) for job, name in (await session.execute(statement)).all()]


async def get_job_for_user(session: AsyncSession, user_id: uuid.UUID, job_id: str) -> tuple[Job, str]:
    """Her job with this id, with its lecture's name. Someone else's, a missing
    and a malformed id all give the same 404 NOT_FOUND."""
    try:
        parsed = uuid.UUID(job_id)
    except ValueError:
        raise AppError(ErrorCode.NOT_FOUND) from None
    statement = (
        select(Job, Lecture.name)
        .join(Lecture, Job.lecture_id == Lecture.id)
        .join(Subject, Lecture.subject_id == Subject.id)
        .where(Job.id == parsed, Subject.user_id == user_id)
    )
    row = (await session.execute(statement)).first()
    if row is None:
        raise AppError(ErrorCode.NOT_FOUND)
    return row[0], row[1]


async def run_job(
    job_id: uuid.UUID, generator: Generator, sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    """Run one job to the end. Never raises: a failure is stored on the job."""
    try:
        async with sessionmaker() as session:
            await _generate_and_save(session, job_id, generator)
    except GenerationTimeoutError:
        logger.error("Generation job %s timed out", job_id)
        await _mark_failed(job_id, sessionmaker, ErrorCode.GENERATION_TIMEOUT)
    except Exception as exc:
        # Only ids and the kind of error: never page text or generated content.
        logger.error("Generation job %s failed (%s)", job_id, type(exc).__name__)
        await _mark_failed(job_id, sessionmaker, ErrorCode.GENERATION_FAILED)


async def _generate_and_save(session: AsyncSession, job_id: uuid.UUID, generator: Generator) -> None:
    job = await session.get(Job, job_id)
    if job is None or job.status != JOB_RUNNING:
        return
    content_type = get_content_type(job.kind)
    pages = [Page(file_id, page_no, text) for file_id, page_no, text in await pages_for_lecture(session, job.lecture_id)]
    options = GenerationOptions(
        requested=job.requested,
        existing_keys=await content_type.existing_keys(session, job.lecture_id),
        difficulty=(job.params or {}).get("difficulty"),
    )
    # End the read transaction before the (possibly slow) model call.
    await session.commit()

    # Only the model call has the time limit.
    try:
        items = await asyncio.wait_for(
            generator.generate(job.kind, pages, options), timeout=GENERATION_TIMEOUT_SECONDS
        )
    except TimeoutError:
        raise GenerationTimeoutError from None

    order = {(page.file_id, page.page_no): position for position, page in enumerate(pages)}
    valid: list[Any] = []
    discarded = 0
    for item in items:
        checked = content_type.validate_item(item, pages)
        if checked is None:
            discarded += 1
        else:
            valid.append(checked)
    # Stable sort: items from the same page keep the order the model gave.
    valid.sort(key=lambda checked: order[(checked.file_id, checked.page_no)])
    kept = valid[: job.requested]

    try:
        await content_type.save(session, kept)
        result = await session.execute(
            update(Job)
            .where(Job.id == job_id, Job.status == JOB_RUNNING)
            .values(status=JOB_DONE, created=len(kept), discarded=discarded, finished_at=_now())
        )
        if result.rowcount == 0:
            # The job is gone (its lecture was deleted) or already failed: store nothing.
            await session.rollback()
            return
        await session.commit()
    except BaseException:
        await session.rollback()
        raise


async def _mark_failed(
    job_id: uuid.UUID, sessionmaker: async_sessionmaker[AsyncSession], code: ErrorCode
) -> None:
    try:
        async with sessionmaker() as session:
            await session.execute(
                update(Job)
                .where(Job.id == job_id, Job.status == JOB_RUNNING)
                .values(status=JOB_FAILED, error_code=code.value, finished_at=_now())
            )
            await session.commit()
    except Exception as exc:
        logger.error("Could not mark generation job %s as failed (%s)", job_id, type(exc).__name__)


async def fail_interrupted_jobs(sessionmaker: async_sessionmaker[AsyncSession]) -> int:
    """At startup, before any request: every job still running was cut off by a
    restart and becomes failed with JOB_INTERRUPTED. Returns how many."""
    async with sessionmaker() as session:
        result = await session.execute(
            update(Job)
            .where(Job.status == JOB_RUNNING)
            .values(status=JOB_FAILED, error_code=ErrorCode.JOB_INTERRUPTED.value, finished_at=_now())
        )
        await session.commit()
    count = result.rowcount or 0
    if count:
        logger.warning("Marked %d interrupted generation job(s) as failed", count)
    return count
