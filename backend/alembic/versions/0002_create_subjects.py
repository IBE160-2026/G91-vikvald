"""Create the subjects table (subjects module).

Revision ID: 0002_create_subjects
Revises: 0001_create_users
Create Date: 2026-11-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0002_create_subjects"
down_revision: Union[str, Sequence[str], None] = "0001_create_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "subjects",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("exam_date", sa.Date(), nullable=False),
        sa.Column("color_index", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        # Deleting a user deletes her subjects in the database.
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_subjects_user_id"), "subjects", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_subjects_user_id"), table_name="subjects")
    op.drop_table("subjects")
