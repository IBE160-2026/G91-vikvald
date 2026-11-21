"""Response bodies for the file routes."""

import uuid
from datetime import datetime

from pydantic import BaseModel


class FileOut(BaseModel):
    id: uuid.UUID
    lecture_id: uuid.UUID
    original_name: str
    page_count: int
    uploaded_at: datetime


class LectureFileCount(BaseModel):
    lecture_id: uuid.UUID
    file_count: int
    page_count: int


class SubjectFileCounts(BaseModel):
    # All files in the subject.
    file_count: int
    # Only the lectures that have files.
    lectures: list[LectureFileCount]


class DeleteCount(BaseModel):
    # "lectures", "files", or a kind from the content registry.
    kind: str
    count: int


class DeletePreview(BaseModel):
    # What else goes when the item is deleted: lectures, files, then the
    # registry's counts. Counts of 0 are left out.
    counts: list[DeleteCount]


class AccountDeletePreview(BaseModel):
    # subjects, lectures, files, then the registry's counts; 0 is left out.
    counts: list[DeleteCount]
    # Every registered content type, in registration order, also those with 0
    # (the confirmation names what kinds of content go with the account).
    content_kinds: list[str]
