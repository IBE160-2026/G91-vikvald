"""Create the practice_sessions table (practice module).

Revision ID: 0007_create_practice_sessions
Revises: 0006_create_jobs_and_flashcards
Create Date: 2026-11-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0007_create_practice_sessions"
down_revision: Union[str, Sequence[str], None] = "0006_create_jobs_and_flashcards"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "practice_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("subject_id", sa.Uuid(), nullable=False),
        # Empty for a session over the whole subject.
        sa.Column("lecture_id", sa.Uuid(), nullable=True),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("aborted", sa.Boolean(), nullable=False),
        sa.Column("shown", sa.Integer(), nullable=False),
        sa.Column("answered", sa.Integer(), nullable=False),
        sa.Column("correct", sa.Integer(), nullable=False),
        sa.Column("partial", sa.Integer(), nullable=False),
        sa.Column("wrong", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        # Deleting a subject or a lecture deletes its sessions in the database.
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lecture_id"], ["lectures.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    # The browser's session_id is stored once (ON CONFLICT DO NOTHING uses it).
    op.create_index(
        op.f("ix_practice_sessions_session_id"), "practice_sessions", ["session_id"], unique=True
    )
    op.create_index(
        op.f("ix_practice_sessions_subject_id"), "practice_sessions", ["subject_id"], unique=False
    )
    op.create_index(
        op.f("ix_practice_sessions_lecture_id"), "practice_sessions", ["lecture_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_practice_sessions_lecture_id"), table_name="practice_sessions")
    op.drop_index(op.f("ix_practice_sessions_subject_id"), table_name="practice_sessions")
    op.drop_index(op.f("ix_practice_sessions_session_id"), table_name="practice_sessions")
    op.drop_table("practice_sessions")
