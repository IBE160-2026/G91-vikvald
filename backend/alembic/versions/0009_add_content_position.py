"""Add position to flashcards and quiz_questions (content module).

Rows saved in the same batch share one created_at. position is the order each
row was made in within its batch, so lists keep a fixed order (issue #224).

Revision ID: 0009_add_content_position
Revises: 0008_create_quiz_questions
Create Date: 2026-11-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0009_add_content_position"
down_revision: Union[str, Sequence[str], None] = "0008_create_quiz_questions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = ("flashcards", "quiz_questions")


def upgrade() -> None:
    # batch_alter_table so the same migration runs on SQLite. Existing rows get
    # 0 and keep id as their last sort key.
    for table in TABLES:
        with op.batch_alter_table(table) as batch_op:
            batch_op.add_column(sa.Column("position", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    for table in TABLES:
        with op.batch_alter_table(table) as batch_op:
            batch_op.drop_column("position")
