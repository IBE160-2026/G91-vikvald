"""Tables owned by the generation module. Only this module writes them."""

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, Index, Integer, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

# A job's status: running until it is done or has failed.
JOB_RUNNING = "running"
JOB_DONE = "done"
JOB_FAILED = "failed"


def _utc_now() -> datetime:
    return datetime.now(UTC)


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (
        # At most one running job per lecture. The route checks first; this index
        # catches two requests that pass the check at the same time.
        Index(
            "uq_jobs_running_lecture",
            "lecture_id",
            unique=True,
            postgresql_where=text("status = 'running'"),
            sqlite_where=text("status = 'running'"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # Deleting the lecture (or the subject or user above it) deletes its jobs.
    lecture_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("lectures.id", ondelete="CASCADE"), index=True
    )
    # The content type, e.g. "flashcards" (a kind from the generation registry).
    kind: Mapped[str] = mapped_column(String(32))
    # The request's parameters as given, e.g. {"requested": 20}.
    params: Mapped[dict[str, Any]] = mapped_column(JSON)
    # "running", "done" or "failed".
    status: Mapped[str] = mapped_column(String(16))
    # The most items asked for (10, 20 or 30).
    requested: Mapped[int] = mapped_column(Integer)
    # Items stored and items thrown away by the validation; empty until the job is done.
    created: Mapped[int | None] = mapped_column(Integer, nullable=True)
    discarded: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # An ErrorCode when the job failed, e.g. GENERATION_FAILED.
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
