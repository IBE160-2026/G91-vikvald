"""Create the files and file_pages tables (files module).

Revision ID: 0004_create_files
Revises: 0003_create_lectures
Create Date: 2026-11-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0004_create_files"
down_revision: Union[str, Sequence[str], None] = "0003_create_lectures"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "files",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("lecture_id", sa.Uuid(), nullable=False),
        sa.Column("original_name", sa.String(length=255), nullable=False),
        sa.Column("page_count", sa.Integer(), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        # Deleting a lecture deletes its files in the database.
        sa.ForeignKeyConstraint(["lecture_id"], ["lectures.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_files_lecture_id"), "files", ["lecture_id"], unique=False)
    op.create_table(
        "file_pages",
        sa.Column("file_id", sa.Uuid(), nullable=False),
        sa.Column("page_no", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("needs_image", sa.Boolean(), nullable=False),
        # Deleting a file deletes its pages in the database.
        sa.ForeignKeyConstraint(["file_id"], ["files.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("file_id", "page_no"),
    )


def downgrade() -> None:
    op.drop_table("file_pages")
    op.drop_index(op.f("ix_files_lecture_id"), table_name="files")
    op.drop_table("files")
