"""The generation pipeline (AR-4) and its jobs.

A job runs as an asyncio task with its own database sessions, after the
request that started it has answered 202. The pipeline: the lecture's pages ->
the keys of existing content -> the port -> validate_item per item (invalid
items are thrown away and counted) -> the valid items in a fixed order (file,
page) -> at most `requested` of them -> saved together with the finished job in
one commit. If anything fails, nothing is stored and the job becomes failed.
The model call has a time limit (GENERATION_TIMEOUT_SECONDS); when it runs
out, the job becomes failed with GENERATION_TIMEOUT.

Pages marked needs_image (FR-40) are sent to the port with a PNG picture,
made from the stored PDF before the model call and kept in memory only. Every
valid item gets formula_flag here, in one place for all content types (FR-41).
"""

import asyncio
import logging
import uuid
from collections.abc import Coroutine
from dataclasses import replace
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.errors import AppError, ErrorCode
from app.modules.content.registry import register_delete_guard
from app.modules.files.service import page_images, pages_for_lecture
from app.modules.generation.models import JOB_DONE, JOB_FAILED, JOB_RUNNING, Job
from app.modules.generation.port import GenerationOptions, Generator, Page
from app.modules.generation.registry import ValidItem, get_content_type
from app.modules.subjects.models import Lecture, Subject

logger = logging.getLogger(__name__)

# The running job tasks. asyncio keeps only weak references to tasks, so they
# are held here until they finish.
JOB_TASKS: set[asyncio.Task[None]] = set()

# The longest a model call may take (3 minutes). Read when the call is made, so
# tests can lower it with monkeypatch.
GENERATION_TIMEOUT_SECONDS: float = 180

# The most page images sent in one request. A 150 dpi PNG of a text page is
# about 100-400 kB, so 20 keep the request well inside the limits for inline
# data. Pages past it are sent as text only, but their content is still flagged.
MAX_PAGE_IMAGES = 20
# The most page-image bytes in one request (15 MB). Photo-heavy pages can be
# several MB each as PNG, and a request past Gemini's limit for inline data
# would fail the whole job. Images are attached in page order while the total
# stays within this; later pages are sent as text only, still flagged.
MAX_PAGE_IMAGE_BYTES = 15 * 1024 * 1024


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
        logger.error("Generation job %s failed: %s", job_id, ErrorCode.GENERATION_TIMEOUT.value)
        await _mark_failed(job_id, sessionmaker, ErrorCode.GENERATION_TIMEOUT)
    except Exception as exc:
        # Only ids and the kind of error: never page text or generated content.
        logger.error(
            "Generation job %s failed: %s (%s)", job_id, ErrorCode.GENERATION_FAILED.value, type(exc).__name__
        )
        await _mark_failed(job_id, sessionmaker, ErrorCode.GENERATION_FAILED)


async def _generate_and_save(session: AsyncSession, job_id: uuid.UUID, generator: Generator) -> None:
    job = await session.get(Job, job_id)
    if job is None or job.status != JOB_RUNNING:
        return
    content_type = get_content_type(job.kind)
    pages = [
        Page(file_id, page_no, text, file_name, needs_image)
        for file_id, page_no, text, file_name, needs_image in await pages_for_lecture(session, job.lecture_id)
    ]
    owner_id = await session.scalar(
        select(Subject.user_id).join(Lecture, Lecture.subject_id == Subject.id).where(Lecture.id == job.lecture_id)
    )
    options = GenerationOptions(
        requested=job.requested,
        existing_keys=await content_type.existing_keys(session, job.lecture_id),
        difficulty=(job.params or {}).get("difficulty"),
    )
    # End the read transaction before the (possibly slow) page images and model call.
    await session.commit()
    if owner_id is not None:
        pages = await _with_page_images(owner_id, pages)

    # Only the model call has the time limit.
    try:
        items = await asyncio.wait_for(
            generator.generate(job.kind, pages, options), timeout=GENERATION_TIMEOUT_SECONDS
        )
    except TimeoutError:
        raise GenerationTimeoutError from None

    order = {(page.file_id, page.page_no): position for position, page in enumerate(pages)}
    needs_image = {(page.file_id, page.page_no): page.needs_image for page in pages}
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
    kept = [
        ValidItem(checked, formula_flag(needs_image[(checked.file_id, checked.page_no)], checked))
        for checked in valid[: job.requested]
    ]

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


def formula_flag(page_needs_image: bool, item: Any) -> bool:
    """FR-41, the one place for every content type and every model: the page
    needed an image, or the model reported that something was missing."""
    return page_needs_image or getattr(item, "formula_missing", None) is True


async def _with_page_images(owner_id: uuid.UUID, pages: list[Page]) -> list[Page]:
    """The pages with a PNG picture on the first MAX_PAGE_IMAGES needs_image
    pages (in the pages' fixed order), while the images' total stays within
    MAX_PAGE_IMAGE_BYTES. The rest keep needs_image without an image; how
    many is logged as a count only, never text."""
    wanted = [(page.file_id, page.page_no) for page in pages if page.needs_image]
    if len(wanted) > MAX_PAGE_IMAGES:
        logger.warning(
            "Too many pages need an image: sending %d, left out %d", MAX_PAGE_IMAGES, len(wanted) - MAX_PAGE_IMAGES
        )
        wanted = wanted[:MAX_PAGE_IMAGES]
    images = await page_images(owner_id, wanted)
    budget = MAX_PAGE_IMAGE_BYTES
    attached: dict[tuple[uuid.UUID, int], bytes] = {}
    for key in wanted:
        image = images.get(key)
        if image is None:
            continue
        if len(image) > budget:
            break
        attached[key] = image
        budget -= len(image)
    if len(attached) < len(images):
        logger.warning(
            "Page images over the size limit: sending %d, left out %d", len(attached), len(images) - len(attached)
        )
    images = attached
    return [
        replace(page, image=images[(page.file_id, page.page_no)]) if (page.file_id, page.page_no) in images else page
        for page in pages
    ]


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
