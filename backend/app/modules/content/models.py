"""Tables owned by the content module. Only this module writes them."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, Text, Uuid, false
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

# The card types: question/answer, term/explanation, and (epic 7) model card.
FLASHCARD_KINDS = ("qa", "concept", "model")
# The types counted and practised as flashcards (model cards have their own place).
PLAIN_FLASHCARD_KINDS = ("qa", "concept")
# The kind of a model card (FR-42): front, points and mnemonic, no back.
MODEL_CARD_KIND = "model"


def _utc_now() -> datetime:
    return datetime.now(UTC)


class Flashcard(Base):
    __tablename__ = "flashcards"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # The file the card was made from. Deleting the file deletes its cards.
    file_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("files.id", ondelete="CASCADE"), index=True
    )
    # "qa", "concept" or "model" (FLASHCARD_KINDS).
    kind: Mapped[str] = mapped_column(String(16))
    front: Mapped[str] = mapped_column(Text)
    # Empty only for model cards (epic 7); the pipeline never stores an empty back for qa/concept.
    back: Mapped[str | None] = mapped_column(Text, nullable=True)
    # The PDF's own page number, starting at 1.
    page_no: Mapped[int] = mapped_column(Integer)
    # True when the source page needed an image or the model reported that
    # something was missing (FR-41); set by the generation pipeline.
    formula_flag: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now)
    # The order the row was made in within the batch it was saved with. A batch
    # shares one created_at, so this keeps "the order they were made in" fixed.
    position: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    # Model cards only (epic 7): the points in the notes' order, and the
    # mnemonic made of their first letters (empty when they all start with the
    # same letter, FR-44). Both are empty for qa and concept cards.
    points: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    mnemonic: Mapped[str | None] = mapped_column(Text, nullable=True)


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"
    __table_args__ = (
        CheckConstraint("correct_index >= 0 AND correct_index <= 3", name="ck_quiz_questions_correct_index"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # The file the question was made from. Deleting the file deletes its questions.
    file_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("files.id", ondelete="CASCADE"), index=True
    )
    # The PDF's own page number, starting at 1.
    page_no: Mapped[int] = mapped_column(Integer)
    # True when the source page needed an image or the model reported that
    # something was missing (FR-41); set by the generation pipeline.
    formula_flag: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    question: Mapped[str] = mapped_column(Text)
    # The four options, in the order shown as A-D (shuffled once when saved).
    options: Mapped[list[str]] = mapped_column(JSON)
    # The correct option's place in `options` (0-3).
    correct_index: Mapped[int] = mapped_column(Integer)
    explanation: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now)
    # The order the row was made in within the batch it was saved with. A batch
    # shares one created_at, so this keeps "the order they were made in" fixed.
    position: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
