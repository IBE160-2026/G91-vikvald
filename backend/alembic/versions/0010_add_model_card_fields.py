"""Add points and mnemonic to flashcards for model cards (epic 7).

A model card is a flashcard with kind "model": its back is empty, and its
points (a JSON list of text, in the notes' order) and mnemonic (the first
letters, or empty when every point starts with the same letter) are stored in
these columns. Both are empty for qa and concept cards.

Revision ID: 0010_add_model_card_fields
Revises: 0009_add_content_position
Create Date: 2026-11-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0010_add_model_card_fields"
down_revision: Union[str, Sequence[str], None] = "0009_add_content_position"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # batch_alter_table so the same migration runs on SQLite. Existing cards
    # are qa or concept cards and keep both columns empty.
    with op.batch_alter_table("flashcards") as batch_op:
        batch_op.add_column(sa.Column("points", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("mnemonic", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("flashcards") as batch_op:
        batch_op.drop_column("mnemonic")
        batch_op.drop_column("points")
