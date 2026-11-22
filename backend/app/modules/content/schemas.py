"""Response bodies for the content routes."""

import uuid
from typing import Literal

from pydantic import BaseModel


class ContentCounts(BaseModel):
    # Flashcards (qa and concept) made from the lecture's files.
    flashcards: int
    # Quiz questions made from the lecture's files.
    quiz_questions: int


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


class FlashcardUpdate(BaseModel):
    # The student's new text. A field left out is not changed; an empty (or
    # only blank) one is rejected by the service with its own error code.
    front: str | None = None
    back: str | None = None


class LectureRef(BaseModel):
    id: uuid.UUID
    name: str


class SubjectFlashcardOut(FlashcardOut):
    # The lecture the card was made from (the subject session spans all of them).
    lecture: LectureRef
