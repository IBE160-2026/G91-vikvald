"""Create the quiz_questions table (content module).

Revision ID: 0008_create_quiz_questions
Revises: 0007_create_practice_sessions
Create Date: 2026-11-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0008_create_quiz_questions"
down_revision: Union[str, Sequence[str], None] = "0007_create_practice_sessions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "quiz_questions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("file_id", sa.Uuid(), nullable=False),
        sa.Column("page_no", sa.Integer(), nullable=False),
        sa.Column("formula_flag", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("question", sa.Text(), nullable=False),
        # The four options, in the order shown as A-D.
        sa.Column("options", sa.JSON(), nullable=False),
        sa.Column("correct_index", sa.Integer(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "correct_index >= 0 AND correct_index <= 3", name="ck_quiz_questions_correct_index"
        ),
        # Deleting a file deletes the questions made from it.
        sa.ForeignKeyConstraint(["file_id"], ["files.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_quiz_questions_file_id"), "quiz_questions", ["file_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_quiz_questions_file_id"), table_name="quiz_questions")
    op.drop_table("quiz_questions")
