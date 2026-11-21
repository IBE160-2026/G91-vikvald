"""Tables owned by the files module. Only this module writes them."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

# The longest original filename that is stored (longer names are cut), in characters.
ORIGINAL_NAME_MAX_LENGTH = 255


def _utc_now() -> datetime:
    return datetime.now(UTC)


class File(Base):
    __tablename__ = "files"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # Deleting the lecture (or the subject or user above it) deletes its files in the database.
    lecture_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("lectures.id", ondelete="CASCADE"), index=True
    )
    # Only the name, without any folder. Never used in the path on disk.
    original_name: Mapped[str] = mapped_column(String(ORIGINAL_NAME_MAX_LENGTH))
    page_count: Mapped[int] = mapped_column(Integer)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now)


class FilePage(Base):
    __tablename__ = "file_pages"

    # Deleting the file deletes its pages in the database.
    file_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("files.id", ondelete="CASCADE"), primary_key=True
    )
    # The PDF's own page number, starting at 1 (never the printed page number).
    page_no: Mapped[int] = mapped_column(Integer, primary_key=True)
    text: Mapped[str] = mapped_column(Text)
    # Always false for now; the rule for pages that need the image comes in epic 6.
    needs_image: Mapped[bool] = mapped_column(Boolean, default=False)
