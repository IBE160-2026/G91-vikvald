"""Fetch a row that belongs to the logged-in student (FR-4, AR-2).

Every module that reads or changes a user's own row by id goes through
`get_owned`. A row owned by someone else and an id that does not exist give the
exact same 404 NOT_FOUND (never 403), so nobody can find out which ids exist.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError, ErrorCode


async def get_owned[ModelT](
    session: AsyncSession, model: type[ModelT], row_id: uuid.UUID, user_id: uuid.UUID
) -> ModelT:
    """The row with this id that belongs to this user, or AppError(NOT_FOUND).

    `model` is any ORM model with the columns `id` and `user_id`.
    """
    statement = select(model).where(
        model.id == row_id,  # type: ignore[attr-defined]
        model.user_id == user_id,  # type: ignore[attr-defined]
    )
    row = (await session.execute(statement)).scalar_one_or_none()
    if row is None:
        raise AppError(ErrorCode.NOT_FOUND)
    return row
