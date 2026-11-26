"""Response bodies for the content routes."""

import uuid
from typing import Literal

from pydantic import BaseModel


class ContentCounts(BaseModel):
    # Flashcards (qa and concept) made from the lecture's files.
    flashcards: int
    # Quiz questions made from the lecture's files.
    quiz_questions: int
    # Model cards (kind "model") made from the lecture's files. The lecture
    # page adds them to the Flashcards row's count.
    model_cards: int
    # Free-text questions (short and long) made from the lecture's files.
    freetext_questions: int
    # The points in the lecture's summary (epic 9); 0 without a summary.
    summary_points: int


class FlashcardSource(BaseModel):
    file_id: uuid.UUID
    # The file's original name, shown as «merkevare-notater.pdf, side 4».
    file_name: str
    # The PDF's own page number, starting at 1.
    page_no: int


class FlashcardOut(BaseModel):
    id: uuid.UUID
    # "qa" or "concept" (both are shown the same way), or "model" (FR-42),
    # shown with its points and mnemonic in the same session.
    kind: Literal["qa", "concept", "model"]
    front: str
    # Always set for qa and concept cards; None for model cards.
    back: str | None
    # Model cards only: the points in the notes' order. None for qa and concept.
    points: list[str] | None = None
    # Model cards only: the mnemonic, or None when the card has none (FR-44).
    mnemonic: str | None = None
    # Shown as «Inneholder formel – sjekk mot kilden» above the source (FR-41).
    formula_flag: bool = False
    source: FlashcardSource


class FlashcardUpdate(BaseModel):
    # The student's new text. A field left out is not changed; an empty (or
    # only blank) one is rejected by the service with its own error code.
    front: str | None = None
    # qa and concept cards only.
    back: str | None = None
    # Model cards only (FR-42, FR-46). Unlike front and back, a mnemonic or
    # points sent as null are treated as empty and rejected, since the field
    # was sent on purpose.
    points: list[str] | None = None
    mnemonic: str | None = None


class LectureRef(BaseModel):
    id: uuid.UUID
    name: str


class SubjectFlashcardOut(FlashcardOut):
    # The lecture the card was made from (the subject session spans all of them).
    lecture: LectureRef


class QuizQuestionOut(BaseModel):
    id: uuid.UUID
    question: str
    # The four options in stored order, shown as A-D.
    options: list[str]
    # The correct option's place in `options` (0-3). Sent on purpose (AR-15):
    # the app runs locally, and the page shows it only after confirmation.
    correct_index: int
    explanation: str
    # As for FlashcardOut (FR-41).
    formula_flag: bool = False
    source: FlashcardSource
    # The lecture the question was made from (shown in the explanation card).
    lecture: LectureRef


# "short" («Kortsvar») or "long" («Langsvar»).
FreetextKind = Literal["short", "long"]


class FreetextQuestionOut(BaseModel):
    id: uuid.UUID
    # As the student chose when the questions were made.
    kind: FreetextKind
    question: str
    # Sent with the question on purpose (AR-15); the session shows it only
    # after the student has written an answer and asked to see it.
    model_answer: str
    # As for FlashcardOut (FR-41).
    formula_flag: bool = False
    source: FlashcardSource
    # The lecture the question was made from (shown under the model answer).
    lecture: LectureRef
