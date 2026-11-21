"""Request and response bodies for the subject and lecture routes."""

import re
import uuid
from datetime import date, datetime
from typing import Annotated, Any

from pydantic import BaseModel, BeforeValidator

_ISO_DATE = re.compile(r"\d{4}-\d{2}-\d{2}")


def _iso_date_string(value: Any) -> Any:
    # Pydantic would also take a timestamp or a date-time; only "2026-12-04" is
    # allowed. Whether the day exists (not 2026-02-31) is checked by the date type.
    # Used for both exam_date and a lecture's date; the field name is in the error.
    if not isinstance(value, str) or not _ISO_DATE.fullmatch(value):
        raise ValueError("must be an ISO date (YYYY-MM-DD)")
    return value


IsoDate = Annotated[date, BeforeValidator(_iso_date_string)]


class SubjectCreate(BaseModel):
    # A plain string: the service trims it and answers NAME_REQUIRED when it is empty.
    name: str
    exam_date: IsoDate


class SubjectUpdate(BaseModel):
    # Only name and exam date can be changed. Other fields (also color_index) are ignored.
    name: str | None = None
    exam_date: IsoDate | None = None


class SubjectOut(BaseModel):
    id: uuid.UUID
    name: str
    exam_date: date
    color_index: int
    # The number of lectures in the subject.
    lecture_count: int
    created_at: datetime


class LectureCreate(BaseModel):
    # A plain string: the service trims it and answers NAME_REQUIRED when it is empty.
    name: str
    # Required. The frontend fills in today's date.
    date: IsoDate


class LectureUpdate(BaseModel):
    # Only name and date can be changed. Other fields (also subject_id) are ignored.
    name: str | None = None
    date: IsoDate | None = None


class LectureOut(BaseModel):
    id: uuid.UUID
    subject_id: uuid.UUID
    name: str
    date: date
    created_at: datetime
