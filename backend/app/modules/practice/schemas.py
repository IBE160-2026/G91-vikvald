"""Request body for POST /api/practice-sessions and the response of GET /api/overview."""

import uuid
from datetime import date, datetime
from typing import Annotated, Literal, Self

from pydantic import BaseModel, Field, model_validator

# The practice types a session can have.
PracticeKind = Literal["flashcards", "quiz", "freetext"]

# The longest session the server accepts: 31 days, in seconds.
MAX_DURATION_SECONDS = 31 * 24 * 60 * 60

# The largest count the server accepts (far below the INTEGER column's limit).
MAX_COUNT = 100_000

# A count: zero or more.
Count = Annotated[int, Field(ge=0, le=MAX_COUNT)]


class PracticeSessionIn(BaseModel):
    """The result the browser sends. Unknown fields (also a started_at from the
    browser) are ignored."""

    session_id: uuid.UUID
    # Kept as text, so a malformed id gives the same 404 as someone else's.
    subject_id: str = Field(max_length=64)
    lecture_id: str | None = Field(default=None, max_length=64)
    kind: PracticeKind
    aborted: bool
    shown: Count
    answered: int = Field(ge=1, le=MAX_COUNT)
    correct: Count
    partial: Count = 0
    wrong: Count
    duration_seconds: int = Field(ge=0, le=MAX_DURATION_SECONDS)

    @model_validator(mode="after")
    def counts_add_up(self) -> Self:
        # Only free text has «Delvis riktig».
        if self.partial != 0 and self.kind != "freetext":
            raise ValueError("partial is only allowed for freetext")
        if self.correct + self.partial + self.wrong != self.answered:
            raise ValueError("correct + partial + wrong must equal answered")
        if self.answered > self.shown:
            raise ValueError("answered must not be above shown")
        return self


class OverviewLecture(BaseModel):
    id: uuid.UUID
    name: str
    date: date
    # Whether at least one session counts for the lecture (practiced_lectures).
    practiced: bool
    # The newest started_at among those sessions, or null.
    last_practiced_at: datetime | None


class LastSessionOut(BaseModel):
    kind: PracticeKind
    # Null for a session over the whole subject.
    lecture_id: uuid.UUID | None
    started_at: datetime
    aborted: bool
    shown: int
    answered: int
    correct: int
    partial: int
    wrong: int


class OverviewSubject(BaseModel):
    id: uuid.UUID
    name: str
    color_index: int
    exam_date: date
    # In the same order as GET /api/subjects/{id}/lectures.
    lectures: list[OverviewLecture]
    # The subject's newest session, or null when it has none.
    last_session: LastSessionOut | None


class OverviewOut(BaseModel):
    # In the same order as GET /api/subjects.
    subjects: list[OverviewSubject]
