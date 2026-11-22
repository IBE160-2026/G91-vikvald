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


class DeleteCount(BaseModel):
    # "lectures", "files", or a kind from the content registry (in the file
    # counts only kinds from the registry).
    kind: str
    count: int


class LectureFileCount(BaseModel):
    lecture_id: uuid.UUID
    file_count: int
    page_count: int
    # The content registry's counts for the lecture (flashcards, quiz_questions,
    # ...), in registration order, without the counts that are 0 (FR-16).
    content_counts: list[DeleteCount]


class SubjectFileCounts(BaseModel):
    # All files in the subject.
    file_count: int
    # Only the lectures that have files.
    lectures: list[LectureFileCount]


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
