"""Request and response bodies for the job routes."""

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, StrictInt, field_validator, model_validator

from app.modules.generation.registry import get_content_type, is_registered

# «Lett», «Middels» (the default) and «Vanskelig», for types with a difficulty (quiz).
Difficulty = Literal["easy", "medium", "hard"]
DEFAULT_DIFFICULTY: Difficulty = "medium"
# «Kortsvar» (the default) and «Langsvar», for types with a question type (free text).
QuestionKind = Literal["short", "long"]
DEFAULT_QUESTION_KIND: QuestionKind = "short"


class JobParams(BaseModel):
    # The scope: one of the content type's scopes (ContentType.scopes, e.g.
    # 10/20/30 for flashcards, 5/10/15 for free text). Left out, JobCreate sets
    # the type's default_requested.
    requested: StrictInt | None = None
    difficulty: Difficulty | None = None
    question_kind: QuestionKind | None = None


class JobCreate(BaseModel):
    kind: str
    # Always set after validation, with every default filled in.
    params: JobParams | None = None

    @field_validator("kind")
    @classmethod
    def _known_kind(cls, value: str) -> str:
        if not is_registered(value):
            raise ValueError("unknown kind")
        return value

    @model_validator(mode="after")
    def _params_fit_kind(self) -> "JobCreate":
        """The parameters checked against the content type (AR-12): requested
        must be one of its scopes (the type's default when left out); a type
        with a difficulty gets «medium» and one with a question type «short»
        when none is given; a type without them may not be given them."""
        content_type = get_content_type(self.kind)
        params = self.params or JobParams()
        update: dict[str, object] = {}
        if params.requested is None:
            update["requested"] = content_type.default_requested
        elif params.requested not in content_type.scopes:
            raise ValueError(f"{self.kind} takes requested {list(content_type.scopes)}")
        if content_type.uses_difficulty:
            if params.difficulty is None:
                update["difficulty"] = DEFAULT_DIFFICULTY
        elif params.difficulty is not None:
            raise ValueError(f"{self.kind} has no difficulty")
        if content_type.uses_question_kind:
            if params.question_kind is None:
                update["question_kind"] = DEFAULT_QUESTION_KIND
        elif params.question_kind is not None:
            raise ValueError(f"{self.kind} has no question_kind")
        self.params = params.model_copy(update=update) if update else params
        return self

    def job_params(self) -> tuple[dict[str, Any], int]:
        """The parameters to store on the job (without empty fields, so
        flashcards stay {"requested": 20}) and the number requested, with every
        default filled in by the validation above."""
        params = self.params or JobParams()
        requested = params.requested if params.requested is not None else get_content_type(self.kind).default_requested
        return params.model_dump(exclude_none=True), requested


class JobOut(BaseModel):
    id: uuid.UUID
    lecture_id: uuid.UUID
    kind: str
    # The request's parameters as stored, e.g. {"requested": 20, "difficulty":
    # "medium"} or {"requested": 10, "question_kind": "short"}, so «Prøv igjen» can start a job with the same choices.
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
