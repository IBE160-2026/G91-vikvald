"""Request body for POST /api/practice-sessions."""

import uuid
from typing import Annotated, Literal, Self

from pydantic import BaseModel, Field, model_validator

# The longest session the server accepts: 31 days, in seconds.
MAX_DURATION_SECONDS = 31 * 24 * 60 * 60

# A count: zero or more.
Count = Annotated[int, Field(ge=0)]


class PracticeSessionIn(BaseModel):
    """The result the browser sends. Unknown fields (also a started_at from the
    browser) are ignored."""

    session_id: uuid.UUID
    # Kept as text, so a malformed id gives the same 404 as someone else's.
    subject_id: str = Field(max_length=64)
    lecture_id: str | None = Field(default=None, max_length=64)
    kind: Literal["flashcards", "quiz", "freetext"]
    aborted: bool
    shown: Count
    answered: int = Field(ge=1)
    correct: Count
    partial: Count = 0
    wrong: Count
    duration_seconds: int = Field(ge=0, le=MAX_DURATION_SECONDS)

    @model_validator(mode="after")
    def counts_add_up(self) -> Self:
        if self.correct + self.partial + self.wrong != self.answered:
            raise ValueError("correct + partial + wrong must equal answered")
        if self.answered > self.shown:
            raise ValueError("answered must not be above shown")
        return self
