"""Shared FastAPI dependencies from the identity module.

`current_user` is the one place that reads the login cookie and checks its JWT.
Every route that needs a logged-in student depends on it (later modules import it
from here); no other code reads the cookie or decodes the token.
"""

from typing import Annotated

from fastapi import Cookie, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.errors import AppError, ErrorCode
from app.core.security import SESSION_COOKIE, decode_session_token
from app.modules.identity.models import User


async def current_user(
    session: Annotated[AsyncSession, Depends(get_session)],
    token: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> User:
    """The logged-in user, or 401 UNAUTHENTICATED.

    No cookie, a bad signature, an expired token, another algorithm (also "none"),
    a broken token, a sub that is not a UUID, and a user that no longer exists all
    give the same answer.
    """
    user_id = decode_session_token(token) if token else None
    user = await session.get(User, user_id) if user_id is not None else None
    if user is None:
        raise AppError(ErrorCode.UNAUTHENTICATED)
    return user
