"""HTTP routes for the files module.

POST/GET /api/lectures/{id}/files and GET /api/subjects/{id}/file-counts. The
files module may call the subjects module (for ownership), never the other way
round, so the counts for the subject page come from a route here.
"""

import asyncio
import math
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.datastructures import UploadFile
from starlette.formparsers import MultiPartException, MultiPartParser

from app.core.config import get_settings
from app.core.db import get_session
from app.core.errors import AppError, ErrorCode
from app.modules.files import pdf
from app.modules.files.models import File
from app.modules.files.schemas import FileOut, LectureFileCount, SubjectFileCounts
from app.modules.files.service import clean_original_name, file_counts, list_files, store_file
from app.modules.identity.dependencies import current_user
from app.modules.identity.models import User
from app.modules.subjects.service import get_lecture, get_subject

lectures_router = APIRouter(prefix="/api/lectures")
subjects_router = APIRouter(prefix="/api/subjects")

CurrentUser = Annotated[User, Depends(current_user)]
Session = Annotated[AsyncSession, Depends(get_session)]

MIB = 1024 * 1024
# Room for the multipart boundaries and part headers around the file itself, so
# a file of exactly MAX_UPLOAD_MB is still accepted.
MULTIPART_SLACK = 64 * 1024


def _as_utc(moment: datetime) -> datetime:
    # SQLite (tests) gives back the stored UTC time without its time zone.
    return moment.replace(tzinfo=UTC) if moment.tzinfo is None else moment


def _file_out(file: File) -> FileOut:
    return FileOut(
        id=file.id,
        lecture_id=file.lecture_id,
        original_name=file.original_name,
        page_count=file.page_count,
        uploaded_at=_as_utc(file.uploaded_at),
    )


def _too_large(size_bytes: int, limit_mb: int) -> AppError:
    # Rounded up and always above the limit, so the message can never say
    # «Fila er på 20 MB. Grensen er 20 MB.».
    size_mb = max(math.ceil(size_bytes / MIB), limit_mb + 1)
    return AppError(ErrorCode.FILE_TOO_LARGE, {"size_mb": size_mb, "limit_mb": limit_mb})


def _missing_file() -> AppError:
    return AppError(ErrorCode.VALIDATION_ERROR, {"fields": {"file": "missing"}})


def _declared_length(request: Request) -> int | None:
    try:
        return int(request.headers["content-length"])
    except (KeyError, ValueError):
        return None


class _BodyTooLarge(Exception):
    pass


async def _limited_stream(request: Request, max_bytes: int) -> AsyncIterator[bytes]:
    """The request body in chunks. Stops reading (raises) as soon as more than
    max_bytes have arrived, so a huge upload is never read to the end."""
    received = 0
    async for chunk in request.stream():
        received += len(chunk)
        if received > max_bytes:
            raise _BodyTooLarge
        yield chunk


async def _read_upload(request: Request) -> tuple[str, bytes]:
    """The original filename and the bytes of the field `file`, or AppError
    (FILE_TOO_LARGE before anything else, then VALIDATION_ERROR)."""
    limit_mb = get_settings().MAX_UPLOAD_MB
    limit_bytes = limit_mb * MIB
    max_body = limit_bytes + MULTIPART_SLACK
    declared = _declared_length(request)
    if declared is not None and declared > max_body:
        raise _too_large(declared, limit_mb)

    content_type = request.headers.get("content-type", "")
    if not content_type.lower().startswith("multipart/form-data"):
        raise _missing_file()
    try:
        parser = MultiPartParser(
            request.headers,
            _limited_stream(request, max_body),
            max_files=1,
            max_fields=10,
        )
        form = await parser.parse()
    except _BodyTooLarge:
        raise _too_large(declared or max_body + 1, limit_mb) from None
    except MultiPartException:
        raise _missing_file() from None

    try:
        upload = form.get("file")
        if not isinstance(upload, UploadFile) or upload.filename is None:
            raise _missing_file()
        name = clean_original_name(upload.filename)
        if not name:
            raise _missing_file()
        data = await upload.read()
    finally:
        await form.close()
    if len(data) > limit_bytes:
        raise _too_large(len(data), limit_mb)
    return name, data


@lectures_router.post("/{lecture_id}/files", status_code=201)
async def upload_file(
    lecture_id: str, request: Request, user: CurrentUser, session: Session
) -> FileOut:
    # Ownership first: someone else's or an unknown lecture gives 404 before the
    # body is read. The route takes the raw Request (not UploadFile), because
    # FastAPI would otherwise read the whole body before this code runs.
    lecture = await get_lecture(session, user.id, lecture_id)
    name, data = await _read_upload(request)
    # PyMuPDF is slow on big files; keep it off the event loop.
    pages = await asyncio.to_thread(pdf.read_pages, data)
    return _file_out(await store_file(session, user.id, lecture.id, name, data, pages))


# Sorted by upload time, then id. The frontend never sorts again.
@lectures_router.get("/{lecture_id}/files")
async def list_lecture_files(lecture_id: str, user: CurrentUser, session: Session) -> list[FileOut]:
    lecture = await get_lecture(session, user.id, lecture_id)
    return [_file_out(file) for file in await list_files(session, lecture.id)]


@subjects_router.get("/{subject_id}/file-counts")
async def subject_file_counts(
    subject_id: str, user: CurrentUser, session: Session
) -> SubjectFileCounts:
    subject = await get_subject(session, user.id, subject_id)
    rows = await file_counts(session, subject.id)
    return SubjectFileCounts(
        file_count=sum(count for _, count, _ in rows),
        lectures=[
            LectureFileCount(lecture_id=lecture_id, file_count=count, page_count=pages)
            for lecture_id, count, pages in rows
        ],
    )
