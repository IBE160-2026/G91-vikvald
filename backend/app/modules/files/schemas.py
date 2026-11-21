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
