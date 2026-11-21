"""HTTP routes for the files module.

POST/GET /api/lectures/{id}/files, POST /api/files/{id}/replace,
GET /api/subjects/{id}/file-counts, and the delete preview and DELETE for files,
lectures and subjects, and GET /api/identity/me/delete-preview and
DELETE /api/identity/me for the whole account. The files module may call the
subjects, content and identity modules, never the other way round. Deleting a
lecture, a subject or the account must know its files (to count them and to
remove the PDFs), so those routes live here too.
"""

import asyncio
import logging
import math
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.datastructures import UploadFile
from starlette.formparsers import MultiPartException, MultiPartParser

from app.core import storage
from app.core.config import get_settings
from app.core.db import get_session
from app.core.errors import AppError, ErrorCode
from app.core.security import clear_session_cookie
from app.modules.files import pdf
from app.modules.files.models import File
from app.modules.content.registry import DeleteScope, content_counts, registered_kinds
from app.modules.files.schemas import (
    AccountDeletePreview,
    DeleteCount,
    DeletePreview,
    FileOut,
    LectureFileCount,
    SubjectFileCounts,
)
from app.modules.files.service import (
    clean_original_name,
    delete_file,
    delete_pdfs,
    file_counts,
    file_ids_for_lectures,
    get_file,
    list_files,
    store_file,
)
from app.modules.identity.dependencies import current_user
from app.modules.identity.models import User
from app.modules.identity.service import delete_user
from app.modules.subjects.service import (
    delete_lecture,
    delete_subject,
    get_lecture,
    get_subject,
    lecture_ids,
    lecture_ids_for_subjects,
    lock_lecture,
    subject_ids_for_user,
)

files_router = APIRouter(prefix="/api/files")
lectures_router = APIRouter(prefix="/api/lectures")
subjects_router = APIRouter(prefix="/api/subjects")
# The account routes count subjects and files, which identity cannot reach.
account_router = APIRouter(prefix="/api/identity")

logger = logging.getLogger(__name__)

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
    # Then the terms (FR-11): without them nothing is read or stored.
    if user.terms_accepted_at is None:
        raise AppError(ErrorCode.TERMS_NOT_ACCEPTED)
    name, data = await _read_upload(request)
    # PyMuPDF is slow on big files; keep it off the event loop.
    pages = await asyncio.to_thread(pdf.read_pages, data)
    return _file_out(await store_file(session, user.id, lecture.id, name, data, pages))


@files_router.post("/{file_id}/replace", status_code=201)
async def replace_file(file_id: str, request: Request, user: CurrentUser, session: Session) -> FileOut:
    """Replace a file with a new version (FR-13). The new file passes every
    upload check before anything is deleted; then the old row goes and the new
    one is stored in one transaction, with a new id in the same lecture. The old
    PDF is removed from the disk only after the commit (AR-8)."""
    # Same order as upload: ownership (404 before the body is read), terms, then
    # the body and the PDF checks.
    old = await get_file(session, user.id, file_id)
    if user.terms_accepted_at is None:
        raise AppError(ErrorCode.TERMS_NOT_ACCEPTED)
    name, data = await _read_upload(request)
    pages = await asyncio.to_thread(pdf.read_pages, data)
    old_id, lecture_id, owner_id = old.id, old.lecture_id, user.id
    new = await store_file(session, owner_id, lecture_id, name, data, pages, replaces=old_id)
    await delete_pdfs(owner_id, [old_id])
    return _file_out(new)


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


# --- Delete preview and delete (FR-6, FR-7, FR-12, FR-14, AR-7, AR-8) ---------


async def _preview(
    session: AsyncSession, scope: DeleteScope, *, lectures: bool, files: bool
) -> DeletePreview:
    """lectures, files, then the registry's counts, without the counts that are 0."""
    counts: list[tuple[str, int]] = []
    if lectures:
        counts.append(("lectures", len(scope.lecture_ids)))
    if files:
        counts.append(("files", len(scope.file_ids)))
    counts.extend(await content_counts(session, scope))
    return DeletePreview(
        counts=[DeleteCount(kind=kind, count=count) for kind, count in counts if count > 0]
    )


@files_router.get("/{file_id}/delete-preview")
async def file_delete_preview(file_id: str, user: CurrentUser, session: Session) -> DeletePreview:
    file = await get_file(session, user.id, file_id)
    scope = DeleteScope(file_ids=(file.id,), lecture_ids=())
    return await _preview(session, scope, lectures=False, files=False)


@files_router.delete("/{file_id}", status_code=204)
async def delete_one_file(file_id: str, user: CurrentUser, session: Session) -> Response:
    file = await get_file(session, user.id, file_id)
    file_id_to_remove = file.id
    await delete_file(session, file_id_to_remove)
    owner_id = user.id
    await session.commit()
    # The PDF goes only after the commit, so a failed commit never loses it.
    await delete_pdfs(owner_id, [file_id_to_remove])
    return Response(status_code=204)


@lectures_router.get("/{lecture_id}/delete-preview")
async def lecture_delete_preview(
    lecture_id: str, user: CurrentUser, session: Session
) -> DeletePreview:
    lecture = await get_lecture(session, user.id, lecture_id)
    file_ids = await file_ids_for_lectures(session, [lecture.id])
    scope = DeleteScope(file_ids=tuple(file_ids), lecture_ids=(lecture.id,))
    return await _preview(session, scope, lectures=False, files=True)


@lectures_router.delete("/{lecture_id}", status_code=204)
async def delete_one_lecture(lecture_id: str, user: CurrentUser, session: Session) -> Response:
    lecture = await get_lecture(session, user.id, lecture_id)
    lecture_id_to_remove = lecture.id
    await lock_lecture(session, lecture_id_to_remove)
    # Collected before the delete: afterwards the rows are gone.
    file_ids = await file_ids_for_lectures(session, [lecture_id_to_remove])
    await delete_lecture(session, lecture_id_to_remove)
    owner_id = user.id
    await session.commit()
    await delete_pdfs(owner_id, file_ids)
    return Response(status_code=204)


@subjects_router.get("/{subject_id}/delete-preview")
async def subject_delete_preview(
    subject_id: str, user: CurrentUser, session: Session
) -> DeletePreview:
    subject = await get_subject(session, user.id, subject_id)
    lectures = await lecture_ids(session, subject.id)
    file_ids = await file_ids_for_lectures(session, lectures)
    scope = DeleteScope(file_ids=tuple(file_ids), lecture_ids=tuple(lectures))
    return await _preview(session, scope, lectures=True, files=True)


@subjects_router.delete("/{subject_id}", status_code=204)
async def delete_one_subject(subject_id: str, user: CurrentUser, session: Session) -> Response:
    subject = await get_subject(session, user.id, subject_id)
    subject_id_to_remove = subject.id
    file_ids = await file_ids_for_lectures(session, await lecture_ids(session, subject_id_to_remove))
    await delete_subject(session, subject_id_to_remove)
    owner_id = user.id
    await session.commit()
    await delete_pdfs(owner_id, file_ids)
    return Response(status_code=204)


@account_router.get("/me/delete-preview")
async def account_delete_preview(user: CurrentUser, session: Session) -> AccountDeletePreview:
    """subjects, lectures, files, then the registry's counts (0 left out), and
    every registered content type for the confirmation text (FR-5)."""
    subjects = await subject_ids_for_user(session, user.id)
    lectures = await lecture_ids_for_subjects(session, subjects)
    file_ids = await file_ids_for_lectures(session, lectures)
    scope = DeleteScope(file_ids=tuple(file_ids), lecture_ids=tuple(lectures))
    counts: list[tuple[str, int]] = [
        ("subjects", len(subjects)),
        ("lectures", len(lectures)),
        ("files", len(file_ids)),
    ]
    counts.extend(await content_counts(session, scope))
    return AccountDeletePreview(
        counts=[DeleteCount(kind=kind, count=count) for kind, count in counts if count > 0],
        content_kinds=registered_kinds(),
    )


@account_router.delete("/me", status_code=204)
async def delete_account(user: CurrentUser, session: Session) -> Response:
    """Delete the account (FR-5): one DELETE of the user row, everything under
    it goes with ON DELETE CASCADE. Her folder on the disk is removed only after
    the commit (AR-8); a disk error is logged with her id and the answer is
    still 204. The session cookie is removed."""
    owner_id = user.id
    await delete_user(session, owner_id)
    await session.commit()
    try:
        await asyncio.to_thread(storage.delete_user_dir, owner_id)
    except OSError:
        # The id only, never the e-mail, file names or content.
        logger.exception("Could not remove the upload folder of deleted user %s", owner_id)
    response = Response(status_code=204)
    clear_session_cookie(response)
    return response
