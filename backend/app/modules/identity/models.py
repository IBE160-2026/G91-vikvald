"""Tables owned by the identity module. Only this module writes them."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

# The longest e-mail address the app accepts (and the column width).
EMAIL_MAX_LENGTH = 254


def _utc_now() -> datetime:
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # Stored trimmed and in lower case, so one address can only be registered once.
    email: Mapped[str] = mapped_column(String(EMAIL_MAX_LENGTH), unique=True, index=True)
    # bcrypt hash; the password itself is never stored.
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now)
    # When the student accepted the terms (UTC). Empty until then; set once and
    # never changed afterwards (see service.accept_terms).
    terms_accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
