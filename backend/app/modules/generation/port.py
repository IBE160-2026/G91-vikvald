"""The language-model port (AR-3): the one way the app asks a model for content.

Every implementation (the mock models now, Vertex AI in epic 6) answers with a
*loose* list: plain dicts whose fields may be missing or wrong. The pipeline
validates every item itself, so a bad answer from any model is caught the same way.
"""

import uuid
from dataclasses import dataclass, field
from typing import Any, Protocol

from pydantic import BaseModel, field_validator


@dataclass(frozen=True)
class Page:
    """One PDF page from the lecture's files. page_no is the PDF's own number
    from 1. file_name is the uploaded file's name, shown to the real model in the
    page label; it comes last with a default so Page(file_id, page_no, text) works."""

    file_id: uuid.UUID
    page_no: int
    text: str
    file_name: str = ""
    # The page probably has something its text misses, such as a formula drawn
    # as vector graphics (FR-40). Content from it is always flagged (FR-41).
    needs_image: bool = False
    # A PNG picture of the page, made by the pipeline for a needs_image page
    # and kept in memory only. None for other pages, or when it could not be made.
    image: bytes | None = field(default=None, repr=False)


@dataclass(frozen=True)
class GenerationOptions:
    # The most items asked for (the pipeline keeps at most this many).
    requested: int
    # Keys of content that already exists (for flashcards: the fronts, in lower
    # case), so «Lag flere» does not make the same cards again.
    existing_keys: frozenset[str] = field(default_factory=frozenset)
    # The chosen difficulty ("easy", "medium" or "hard") for types that have
    # one (quiz); None for the others. The mock rules ignore it.
    difficulty: str | None = None


class FormulaReport(BaseModel):
    """The part every loose model shares: the model's own report that the page
    text or image lacked something it needed, such as a formula (FR-41).

    Missing means no report. Any value that is not true or false counts as
    true (better one flag too many) and never discards the item. The mock
    models never set it."""

    formula_missing: bool | None = None

    @field_validator("formula_missing", mode="before")
    @classmethod
    def _odd_value_means_missing(cls, value: Any) -> bool | None:
        if value is None or value is True or value is False:
            return value
        return True


class Generator(Protocol):
    async def generate(
        self, kind: str, pages: list[Page], options: GenerationOptions
    ) -> list[dict[str, Any]]:
        """Items of the content type `kind` made only from `pages`."""
        ...
