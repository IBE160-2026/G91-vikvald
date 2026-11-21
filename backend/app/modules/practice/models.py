"""Tables owned by the practice module. Only this module writes them."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

# The practice types a session can have.
PRACTICE_KINDS = ("flashcards", "quiz", "freetext")


class PracticeSession(Base):
    """The result of one practice session. No user_id: the owner is the
    subject's owner (AR-9)."""

    __tablename__ = "practice_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # Made by the browser. The same session sent twice is stored once.
    session_id: Mapped[uuid.UUID] = mapped_column(Uuid, unique=True, index=True)
    # Deleting the subject (or the user above it) deletes its sessions.
    subject_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("subjects.id", ondelete="CASCADE"), index=True
    )
    # Empty for a session over the whole subject (story 3.6). Deleting the
    # lecture deletes its sessions.
    lecture_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("lectures.id", ondelete="CASCADE"), index=True, nullable=True
    )
    # "flashcards", "quiz" or "freetext" (PRACTICE_KINDS).
    kind: Mapped[str] = mapped_column(String(16))
    # True when she ended the session before it was finished.
    aborted: Mapped[bool] = mapped_column(Boolean)
    # Different cards/questions shown, and how many of them were answered.
    shown: Mapped[int] = mapped_column(Integer)
    answered: Mapped[int] = mapped_column(Integer)
    # The first answer per card: right, partly right (free text) and wrong.
    correct: Mapped[int] = mapped_column(Integer)
    partial: Mapped[int] = mapped_column(Integer)
    wrong: Mapped[int] = mapped_column(Integer)
    # The server's time when the result arrived, minus the duration the browser
    # measured; never the browser's own clock.
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
