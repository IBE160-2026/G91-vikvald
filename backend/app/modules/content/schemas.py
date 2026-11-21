"""Response bodies for the content routes."""

import uuid

from pydantic import BaseModel


class ContentCounts(BaseModel):
    # Flashcards (qa and concept) made from the lecture's files.
    flashcards: int


class FlashcardSource(BaseModel):
    file_id: uuid.UUID
    # The file's original name, shown as «merkevare-notater.pdf, side 4».
    file_name: str
    # The PDF's own page number, starting at 1.
    page_no: int


class FlashcardOut(BaseModel):
    id: uuid.UUID
    # "qa" or "concept" (both are shown the same way).
    kind: str
    front: str
    back: str | None
    source: FlashcardSource
