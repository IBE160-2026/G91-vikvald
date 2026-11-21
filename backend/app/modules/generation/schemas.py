"""Request and response bodies for the job routes."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator

from app.modules.generation.registry import is_registered

# The scopes «Rask», «Vanlig» and «Dyp» (story 3.2 adds the choice).
DEFAULT_REQUESTED = 20


class JobParams(BaseModel):
    requested: Literal[10, 20, 30] = DEFAULT_REQUESTED


class JobCreate(BaseModel):
    kind: str
    params: JobParams | None = None

    @field_validator("kind")
    @classmethod
    def _known_kind(cls, value: str) -> str:
        if not is_registered(value):
            raise ValueError("unknown kind")
        return value


class JobOut(BaseModel):
    id: uuid.UUID
    lecture_id: uuid.UUID
    kind: str
    status: Literal["running", "done", "failed"]
    requested: int
    created: int | None
    discarded: int | None
    error_code: str | None
    started_at: datetime
    finished_at: datetime | None
