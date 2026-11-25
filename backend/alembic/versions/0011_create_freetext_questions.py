"""Create the freetext_questions table (content module, epic 8).

A free-text question is a short- or long-answer question with a model answer
made from one page of a file (FR-48, FR-49). Deleting the file deletes its
questions.

Revision ID: 0011_create_freetext_questions
Revises: 0010_add_model_card_fields
Create Date: 2026-11-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0011_create_freetext_questions"
down_revision: Union[str, Sequence[str], None] = "0010_add_model_card_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "freetext_questions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("file_id", sa.Uuid(), nullable=False),
        # "short" (kortsvar) or "long" (langsvar).
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("model_answer", sa.Text(), nullable=False),
        sa.Column("page_no", sa.Integer(), nullable=False),
        sa.Column("formula_flag", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.CheckConstraint("kind IN ('short', 'long')", name="ck_freetext_questions_kind"),
        # Deleting a file deletes the questions made from it.
        sa.ForeignKeyConstraint(["file_id"], ["files.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_freetext_questions_file_id"), "freetext_questions", ["file_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_freetext_questions_file_id"), table_name="freetext_questions")
    op.drop_table("freetext_questions")
