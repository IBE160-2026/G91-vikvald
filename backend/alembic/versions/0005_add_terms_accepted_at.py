"""Add users.terms_accepted_at (identity module).

Revision ID: 0005_add_terms_accepted_at
Revises: 0004_create_files
Create Date: 2026-11-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0005_add_terms_accepted_at"
down_revision: Union[str, Sequence[str], None] = "0004_create_files"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # batch_alter_table so the same migration runs on SQLite, which cannot
    # alter tables in place. Empty (NULL) until the student accepts the terms.
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("terms_accepted_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("terms_accepted_at")
