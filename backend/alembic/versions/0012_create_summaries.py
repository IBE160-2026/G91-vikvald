"""Create the summaries and summary_points tables (content module, epic 9).

A summary belongs to a lecture (at most one per lecture) and has 5 to 15
points ordered by theme, each with the file and page it comes from (FR-53,
FR-54). Deleting the lecture deletes its summary, and deleting the summary
deletes its points. Deleting a file deletes the whole summary through the
content module (FR-55, E15); file_id's ON DELETE CASCADE is only a safety net.

Revision ID: 0012_create_summaries
Revises: 0011_create_freetext_questions
Create Date: 2026-11-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0012_create_summaries"
down_revision: Union[str, Sequence[str], None] = "0011_create_freetext_questions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "summaries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("lecture_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        # Deleting a lecture deletes its summary.
        sa.ForeignKeyConstraint(["lecture_id"], ["lectures.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    # At most one summary per lecture.
    op.create_index(op.f("ix_summaries_lecture_id"), "summaries", ["lecture_id"], unique=True)
    op.create_table(
        "summary_points",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("summary_id", sa.Uuid(), nullable=False),
        sa.Column("theme", sa.Text(), nullable=False),
        # The point's place in the summary (0, 1, ...).
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("file_id", sa.Uuid(), nullable=False),
        sa.Column("page_no", sa.Integer(), nullable=False),
        sa.Column("formula_flag", sa.Boolean(), nullable=False, server_default=sa.false()),
        # Deleting a summary deletes its points.
        sa.ForeignKeyConstraint(["summary_id"], ["summaries.id"], ondelete="CASCADE"),
        # A safety net: the content module deletes the whole summary first.
        sa.ForeignKeyConstraint(["file_id"], ["files.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_summary_points_summary_id"), "summary_points", ["summary_id"], unique=False)
    op.create_index(op.f("ix_summary_points_file_id"), "summary_points", ["file_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_summary_points_file_id"), table_name="summary_points")
    op.drop_index(op.f("ix_summary_points_summary_id"), table_name="summary_points")
    op.drop_table("summary_points")
    op.drop_index(op.f("ix_summaries_lecture_id"), table_name="summaries")
    op.drop_table("summaries")
