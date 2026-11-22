"""The language-model port (AR-3): the one way the app asks a model for content.

Every implementation (the mock models now, Vertex AI in epic 6) answers with a
*loose* list: plain dicts whose fields may be missing or wrong. The pipeline
validates every item itself, so a bad answer from any model is caught the same way.
"""

import uuid
from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass(frozen=True)
class Page:
    """One PDF page from the lecture's files. page_no is the PDF's own number from 1."""

    file_id: uuid.UUID
    page_no: int
    text: str


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


class Generator(Protocol):
    async def generate(
        self, kind: str, pages: list[Page], options: GenerationOptions
    ) -> list[dict[str, Any]]:
        """Items of the content type `kind` made only from `pages`."""
        ...
