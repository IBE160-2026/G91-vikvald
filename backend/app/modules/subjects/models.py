"""Tables owned by the subjects module. Only this module writes them."""

import uuid
from datetime import UTC, date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

# The longest subject name the app accepts (and the column width), in characters.
NAME_MAX_LENGTH = 200

# There are six subject colours (subject-1 to subject-6 in the frontend), stored as 0-5.
SUBJECT_COLOR_COUNT = 6


def _utc_now() -> datetime:
    return datetime.now(UTC)


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # Deleting the user deletes her subjects in the database (no row-by-row code).
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # Stored trimmed. Two subjects may have the same name.
    name: Mapped[str] = mapped_column(String(NAME_MAX_LENGTH))
    exam_date: Mapped[date] = mapped_column(Date)
    # 0-5, chosen once when the subject is created and never changed.
    color_index: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now)
