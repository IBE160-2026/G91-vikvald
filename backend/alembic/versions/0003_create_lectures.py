"""Create the lectures table (subjects module).

Revision ID: 0003_create_lectures
Revises: 0002_create_subjects
Create Date: 2026-11-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0003_create_lectures"
down_revision: Union[str, Sequence[str], None] = "0002_create_subjects"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "lectures",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("subject_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        # Deleting a subject deletes its lectures in the database.
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_lectures_subject_id"), "lectures", ["subject_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_lectures_subject_id"), table_name="lectures")
    op.drop_table("lectures")
