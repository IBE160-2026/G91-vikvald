"""Request and response bodies for the subject routes."""

import re
import uuid
from datetime import date, datetime
from typing import Annotated, Any

from pydantic import BaseModel, BeforeValidator

_ISO_DATE = re.compile(r"\d{4}-\d{2}-\d{2}")


def _iso_date_string(value: Any) -> Any:
    # Pydantic would also take a timestamp or a date-time; only "2026-12-04" is
    # allowed. Whether the day exists (not 2026-02-31) is checked by the date type.
    if not isinstance(value, str) or not _ISO_DATE.fullmatch(value):
        raise ValueError("exam_date must be an ISO date (YYYY-MM-DD)")
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
    # Always 0 until lectures exist (story 2.2).
    lecture_count: int
    created_at: datetime
