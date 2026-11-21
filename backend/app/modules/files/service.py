"""Business logic for files: store an accepted PDF, list files, count them."""

import logging
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import storage
from app.modules.files.models import ORIGINAL_NAME_MAX_LENGTH, File, FilePage
from app.modules.subjects.models import Lecture

logger = logging.getLogger(__name__)


def clean_original_name(filename: str) -> str:
    """Only the filename (no folder, from either kind of slash), trimmed and cut
    to the column width. Empty means the name is missing."""
    name = filename.replace("\\", "/").rsplit("/", 1)[-1]
    return name.strip()[:ORIGINAL_NAME_MAX_LENGTH].strip()


async def store_file(
    session: AsyncSession,
    user_id: uuid.UUID,
    lecture_id: uuid.UUID,
    original_name: str,
    data: bytes,
    pages: list[str],
) -> File:
    """Save an accepted PDF: one row in files, one row per page in file_pages
    (one transaction), and the PDF on disk. If the commit fails, the PDF is
    removed from the disk again."""
    file = File(
        id=uuid.uuid4(), lecture_id=lecture_id, original_name=original_name, page_count=len(pages)
    )
    session.add(file)
    session.add_all(
        FilePage(file_id=file.id, page_no=number, text=text, needs_image=False)
        for number, text in enumerate(pages, start=1)
    )
    try:
        storage.save_pdf(user_id, file.id, data)
    except BaseException:
        await session.rollback()
        raise
    try:
        await session.commit()
    except BaseException:
        await session.rollback()
        try:
            storage.delete_pdf(user_id, file.id)
        except OSError:
            # Never log file content or the filename; the ids are enough to find it.
            logger.exception("Could not remove PDF %s after a failed commit", file.id)
        raise
    return file


async def list_files(session: AsyncSession, lecture_id: uuid.UUID) -> list[File]:
    """The lecture's files in upload order (and by id, so the order is always the same)."""
    statement = (
        select(File).where(File.lecture_id == lecture_id).order_by(File.uploaded_at, File.id)
    )
    return list(await session.scalars(statement))


async def file_counts(
    session: AsyncSession, subject_id: uuid.UUID
) -> list[tuple[uuid.UUID, int, int]]:
    """(lecture_id, file_count, page_count) for each lecture in the subject that
    has files, in one query (GROUP BY). Lectures without files are missing."""
    statement = (
        select(File.lecture_id, func.count(File.id), func.sum(File.page_count))
        .join(Lecture, File.lecture_id == Lecture.id)
        .where(Lecture.subject_id == subject_id)
        .group_by(File.lecture_id)
        .order_by(File.lecture_id)
    )
    return [
        (lecture_id, int(count), int(pages or 0))
        for lecture_id, count, pages in (await session.execute(statement)).all()
    ]
