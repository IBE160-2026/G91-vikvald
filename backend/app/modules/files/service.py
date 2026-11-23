"""Business logic for files: store an accepted PDF, list files, count them,
look one up for its owner, and delete files."""

import asyncio
import logging
import uuid
from collections.abc import Iterable

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import storage
from app.core.errors import AppError, ErrorCode
from app.modules.files.models import ORIGINAL_NAME_MAX_LENGTH, File, FilePage
from app.modules.subjects.models import Lecture, Subject

logger = logging.getLogger(__name__)


def clean_original_name(filename: str) -> str:
    """Only the filename (no folder, from either kind of slash), trimmed and cut
    to the column width. Empty means the name is missing."""
    name = filename.replace("\\", "/").rsplit("/", 1)[-1]
    # Control characters (NUL, newlines, ...) cannot be shown, and Postgres
    # refuses NUL in a text column.
    name = "".join(char for char in name if char.isprintable())
    return name.strip()[:ORIGINAL_NAME_MAX_LENGTH].strip()


async def store_file(
    session: AsyncSession,
    user_id: uuid.UUID,
    lecture_id: uuid.UUID,
    original_name: str,
    data: bytes,
    pages: list[str],
    replaces: uuid.UUID | None = None,
) -> File:
    """Save an accepted PDF: one row in files, one row per page in file_pages
    (one transaction), and the PDF on disk. If the commit fails, the PDF is
    removed from the disk again.

    With `replaces`, that file's row is deleted first in the same transaction
    (its pages go with ON DELETE CASCADE). If the row is already gone (deleted
    in another tab, or a replace running at the same time), nothing is stored
    and the answer is 404 NOT_FOUND. The caller removes the old PDF after this
    returns, that is after the commit."""
    if replaces is not None:
        result = await session.execute(
            delete(File).where(File.id == replaces, File.lecture_id == lecture_id)
        )
        if result.rowcount == 0:
            await session.rollback()
            raise AppError(ErrorCode.NOT_FOUND)
    file = File(
        id=uuid.uuid4(), lecture_id=lecture_id, original_name=original_name, page_count=len(pages)
    )
    session.add(file)
    session.add_all(
        FilePage(file_id=file.id, page_no=number, text=text, needs_image=False)
        for number, text in enumerate(pages, start=1)
    )
    try:
        # Writing up to MAX_UPLOAD_MB with fsync; keep it off the event loop.
        await asyncio.to_thread(storage.save_pdf, user_id, file.id, data)
    except BaseException:
        await session.rollback()
        raise
    try:
        await session.commit()
    except BaseException:
        await session.rollback()
        try:
            await asyncio.to_thread(storage.delete_pdf, user_id, file.id)
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


async def get_file(session: AsyncSession, user_id: uuid.UUID, file_id: str) -> File:
    """Her file with this id. A file has no user_id of its own, so it is looked
    up together with its lecture and subject, and the subject must be hers.
    Someone else's, a missing and a malformed id all give the same 404 NOT_FOUND."""
    try:
        parsed = uuid.UUID(file_id)
    except ValueError:
        raise AppError(ErrorCode.NOT_FOUND) from None
    statement = (
        select(File)
        .join(Lecture, File.lecture_id == Lecture.id)
        .join(Subject, Lecture.subject_id == Subject.id)
        .where(File.id == parsed, Subject.user_id == user_id)
    )
    file = (await session.execute(statement)).scalar_one_or_none()
    if file is None:
        raise AppError(ErrorCode.NOT_FOUND)
    return file


async def file_ids_for_lectures(
    session: AsyncSession, lecture_ids: Iterable[uuid.UUID]
) -> list[uuid.UUID]:
    """The ids of all files in these lectures (collected before they are deleted,
    so their PDFs can be removed from the disk afterwards)."""
    ids = list(lecture_ids)
    if not ids:
        return []
    statement = select(File.id).where(File.lecture_id.in_(ids)).order_by(File.id)
    return list(await session.scalars(statement))


async def file_ids_by_lecture(
    session: AsyncSession, lecture_ids: Iterable[uuid.UUID]
) -> dict[uuid.UUID, list[uuid.UUID]]:
    """The ids of the files in each of these lectures, in one query. A lecture
    without files is missing from the result."""
    ids = list(lecture_ids)
    if not ids:
        return {}
    statement = (
        select(File.lecture_id, File.id).where(File.lecture_id.in_(ids)).order_by(File.lecture_id, File.id)
    )
    grouped: dict[uuid.UUID, list[uuid.UUID]] = {}
    for lecture_id, file_id in (await session.execute(statement)).all():
        grouped.setdefault(lecture_id, []).append(file_id)
    return grouped


async def delete_file(session: AsyncSession, file_id: uuid.UUID) -> None:
    """Delete the file row in one statement; its pages go with ON DELETE CASCADE.
    The caller commits and removes the PDF afterwards."""
    await session.execute(delete(File).where(File.id == file_id))


async def delete_pdfs(user_id: uuid.UUID, file_ids: Iterable[uuid.UUID]) -> None:
    """Remove the PDFs after the commit. A disk error for one file is logged
    (with the id only, never the content or the filename), and the others are
    still removed."""
    for file_id in file_ids:
        try:
            await asyncio.to_thread(storage.delete_pdf, user_id, file_id)
        except OSError:
            logger.exception("Could not remove PDF %s after it was deleted", file_id)


async def pages_for_lecture(
    session: AsyncSession, lecture_id: uuid.UUID
) -> list[tuple[uuid.UUID, int, str, str]]:
    """(file_id, page_no, text, original_name) for every page of the lecture's
    files: files in upload order (then by id), each file's pages from page 1.
    Always the same order."""
    statement = (
        select(FilePage.file_id, FilePage.page_no, FilePage.text, File.original_name)
        .join(File, FilePage.file_id == File.id)
        .where(File.lecture_id == lecture_id)
        .order_by(File.uploaded_at, File.id, FilePage.page_no)
    )
    return [
        (file_id, page_no, text, original_name)
        for file_id, page_no, text, original_name in (await session.execute(statement)).all()
    ]
