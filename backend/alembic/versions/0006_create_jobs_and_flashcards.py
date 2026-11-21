"""Create the jobs (generation module) and flashcards (content module) tables.

Revision ID: 0006_create_jobs_and_flashcards
Revises: 0005_add_terms_accepted_at
Create Date: 2026-11-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0006_create_jobs_and_flashcards"
down_revision: Union[str, Sequence[str], None] = "0005_add_terms_accepted_at"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "jobs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("lecture_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("params", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("requested", sa.Integer(), nullable=False),
        # Empty until the job is done.
        sa.Column("created", sa.Integer(), nullable=True),
        sa.Column("discarded", sa.Integer(), nullable=True),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        # Deleting a lecture deletes its jobs in the database.
        sa.ForeignKeyConstraint(["lecture_id"], ["lectures.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_jobs_lecture_id"), "jobs", ["lecture_id"], unique=False)
    # At most one running job per lecture (a partial unique index, on both databases).
    op.create_index(
        "uq_jobs_running_lecture",
        "jobs",
        ["lecture_id"],
        unique=True,
        postgresql_where=sa.text("status = 'running'"),
        sqlite_where=sa.text("status = 'running'"),
    )
    op.create_table(
        "flashcards",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("file_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("front", sa.Text(), nullable=False),
        # Empty only for model cards (epic 7).
        sa.Column("back", sa.Text(), nullable=True),
        sa.Column("page_no", sa.Integer(), nullable=False),
        sa.Column("formula_flag", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        # Deleting a file deletes the cards made from it.
        sa.ForeignKeyConstraint(["file_id"], ["files.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_flashcards_file_id"), "flashcards", ["file_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_flashcards_file_id"), table_name="flashcards")
    op.drop_table("flashcards")
    op.drop_index("uq_jobs_running_lecture", table_name="jobs")
    op.drop_index(op.f("ix_jobs_lecture_id"), table_name="jobs")
    op.drop_table("jobs")
