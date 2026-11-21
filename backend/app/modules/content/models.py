"""Tables owned by the content module. Only this module writes them."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, Uuid, false
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

# The card types: question/answer, term/explanation, and (epic 7) model card.
FLASHCARD_KINDS = ("qa", "concept", "model")
# The types counted and practised as flashcards (model cards have their own place).
PLAIN_FLASHCARD_KINDS = ("qa", "concept")


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
    # Always false for now; the formula rule comes in epic 6.
    formula_flag: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now)
