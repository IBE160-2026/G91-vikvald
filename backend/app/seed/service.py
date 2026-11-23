"""The seeded test user and sample subject (NFR-3, AR-14).

`seed_if_empty` runs in start.sh between the migrations and Uvicorn. When
APP_ENV=local and there are no accounts, it makes the test user, the subject
«Markedsføring» with three lectures, one sample PDF in each, content of every
enabled content type made by the mock model, and two practice sessions on the
first lecture (so the overview shows practised and not practised lectures).

It only uses the modules' ordinary services, exactly as the routes do, and
always the mock model, whatever LLM_PROVIDER says. If anything fails, it logs
the kind of error only and deletes the test user it made with the ordinary
account deletion, so the database is empty again and the next start tries
again. It never raises.
"""

import asyncio
import logging
import uuid
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import Settings
from app.modules.files import pdf
from app.modules.files.service import delete_account, store_file
from app.modules.generation.mock import MockGenerator
from app.modules.generation.models import JOB_DONE
from app.modules.generation.registry import enabled_content_types
from app.modules.generation.schemas import JobCreate, JobParams
from app.modules.generation.service import create_job, get_job_for_user, run_job
from app.modules.identity.service import accept_terms, any_user_exists, register_user
from app.modules.practice.schemas import PracticeSessionIn
from app.modules.practice.service import save_session
from app.modules.subjects.service import create_lecture, create_subject

logger = logging.getLogger(__name__)

TEST_EMAIL = "test@studiekamerat.no"
TEST_PASSWORD = "studiekamerat"
SUBJECT_NAME = "Markedsføring"
# The exam is three weeks after the seed day.
EXAM_IN_DAYS = 21
NOTES_DIR = Path(__file__).resolve().parent / "notater"


@dataclass(frozen=True)
class SampleLecture:
    name: str
    # How many days before the seed day the lecture was held.
    days_ago: int
    # The PDF in notater/, uploaded under this name.
    file_name: str


# In date order. The first one gets the two practice sessions.
LECTURES = (
    SampleLecture("Markedsmiksen", 21, "markedsmiksen.pdf"),
    SampleLecture("Segmentering og målgrupper", 14, "segmentering.pdf"),
    SampleLecture("AIDA-modellen", 7, "aida.pdf"),
)
# The practice sessions on the first lecture: kind and how long they took.
SESSIONS = (("flashcards", 6 * 60), ("quiz", 4 * 60))


class SeedError(Exception):
    """Something the seed made did not turn out as it should (e.g. a job failed)."""


async def seed_if_empty(sessionmaker: async_sessionmaker[AsyncSession], settings: Settings) -> bool:
    """Make the test user and the sample subject when APP_ENV=local and there
    are no accounts. Returns True when it seeded. Never raises."""
    if settings.APP_ENV != "local":
        logger.info("Seed skipped: APP_ENV is not local")
        return False
    try:
        async with sessionmaker() as session:
            if await any_user_exists(session):
                logger.info("Seed skipped: the database already has accounts")
                return False
    except Exception as exc:
        logger.error("Seed failed: %s", type(exc).__name__)
        return False

    user_id: uuid.UUID | None = None
    try:
        async with sessionmaker() as session:
            user = await register_user(session, TEST_EMAIL, TEST_PASSWORD)
            user_id = user.id
            await accept_terms(session, user)
        await _fill(sessionmaker, user_id, settings, date.today())
    except Exception as exc:
        # The kind of error only: never note text, the password or content.
        logger.error("Seed failed: %s", type(exc).__name__)
        if user_id is not None:
            await _remove_test_user(sessionmaker, user_id)
        return False
    logger.info("Seed done: test user and sample subject created")
    return True


async def _fill(
    sessionmaker: async_sessionmaker[AsyncSession], user_id: uuid.UUID, settings: Settings, today: date
) -> None:
    async with sessionmaker() as session:
        subject = await create_subject(session, user_id, SUBJECT_NAME, today + timedelta(days=EXAM_IN_DAYS))
        lectures = [
            await create_lecture(session, user_id, str(subject.id), sample.name, today - timedelta(days=sample.days_ago))
            for sample in LECTURES
        ]
        for lecture, sample in zip(lectures, LECTURES, strict=True):
            data = (NOTES_DIR / sample.file_name).read_bytes()
            pages = await asyncio.to_thread(pdf.read_pages, data)
            await store_file(session, user_id, lecture.id, sample.file_name, data, pages)

    created: dict[str, int] = {}
    for lecture in lectures:
        for content_type in enabled_content_types(settings):
            count = await _generate(sessionmaker, user_id, lecture.id, content_type.kind)
            if lecture.id == lectures[0].id:
                created[content_type.kind] = count

    async with sessionmaker() as session:
        for kind, seconds in SESSIONS:
            items = created.get(kind, 0)
            if items < 1:
                raise SeedError(f"No {kind} to practise")
            await save_session(
                session,
                user_id,
                PracticeSessionIn(
                    session_id=uuid.uuid4(),
                    subject_id=str(subject.id),
                    lecture_id=str(lectures[0].id),
                    kind=kind,  # type: ignore[arg-type]  (flashcards and quiz are practice kinds)
                    aborted=False,
                    shown=items,
                    answered=items,
                    correct=items - 1,
                    wrong=1,
                    duration_seconds=seconds,
                ),
            )


async def _generate(
    sessionmaker: async_sessionmaker[AsyncSession], user_id: uuid.UUID, lecture_id: uuid.UUID, kind: str
) -> int:
    """One job as POST /api/lectures/{id}/jobs makes it, but awaited and always
    with the mock model. Returns how many items it made; a job that does not
    end as done is an error."""
    body = JobCreate(kind=kind)
    params = body.params or JobParams()
    async with sessionmaker() as session:
        job = await create_job(session, lecture_id, kind, params.model_dump(exclude_none=True), params.requested)
    await run_job(job.id, MockGenerator(), sessionmaker)
    async with sessionmaker() as session:
        finished, _ = await get_job_for_user(session, user_id, str(job.id))
        if finished.status != JOB_DONE:
            raise SeedError(f"The {kind} job ended as {finished.status}")
        return finished.created or 0


async def _remove_test_user(sessionmaker: async_sessionmaker[AsyncSession], user_id: uuid.UUID) -> None:
    """Delete the test user the seed made (and only her), with the ordinary
    account deletion, so the next start can try again."""
    try:
        async with sessionmaker() as session:
            await delete_account(session, user_id)
    except Exception as exc:
        logger.error("Seed clean-up failed: %s", type(exc).__name__)
