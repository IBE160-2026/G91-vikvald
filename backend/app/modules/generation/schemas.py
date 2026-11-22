"""Request and response bodies for the job routes."""

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, field_validator, model_validator

from app.modules.generation.registry import get_content_type, is_registered

# The scopes «Rask» (10), «Vanlig» (20, the default) and «Dyp» (30).
DEFAULT_REQUESTED = 20
# «Lett», «Middels» (the default) and «Vanskelig», for types with a difficulty (quiz).
Difficulty = Literal["easy", "medium", "hard"]
DEFAULT_DIFFICULTY: Difficulty = "medium"


class JobParams(BaseModel):
    requested: Literal[10, 20, 30] = DEFAULT_REQUESTED
    difficulty: Difficulty | None = None


class JobCreate(BaseModel):
    kind: str
    params: JobParams | None = None

    @field_validator("kind")
    @classmethod
    def _known_kind(cls, value: str) -> str:
        if not is_registered(value):
            raise ValueError("unknown kind")
        return value

    @model_validator(mode="after")
    def _difficulty_fits_kind(self) -> "JobCreate":
        """A type with a difficulty gets «medium» when none is given; a type
        without one (flashcards) may not be given one."""
        params = self.params or JobParams()
        if get_content_type(self.kind).uses_difficulty:
            if params.difficulty is None:
                params = params.model_copy(update={"difficulty": DEFAULT_DIFFICULTY})
        elif params.difficulty is not None:
            raise ValueError(f"{self.kind} has no difficulty")
        self.params = params
        return self


class JobOut(BaseModel):
    id: uuid.UUID
    lecture_id: uuid.UUID
    kind: str
    # The request's parameters as stored, e.g. {"requested": 20, "difficulty":
    # "medium"}, so «Prøv igjen» can start a job with the same choices.
    params: dict[str, Any]
    status: Literal["running", "done", "failed"]
    requested: int
    created: int | None
    discarded: int | None
    error_code: str | None
    started_at: datetime
    finished_at: datetime | None


class TrackedJobOut(JobOut):
    """A job for the job watcher in the frontend, which also needs the lecture's
    name for its message on other pages."""

    lecture_name: str
