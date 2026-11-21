"""Response bodies for the content routes."""

import uuid
from typing import Literal

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
    # "qa" or "concept" (both are shown the same way). Model cards are not listed.
    kind: Literal["qa", "concept"]
    front: str
    # Always set for qa and concept cards.
    back: str
    source: FlashcardSource
