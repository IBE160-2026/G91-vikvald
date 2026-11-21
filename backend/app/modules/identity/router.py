"""HTTP routes for the identity module (/api/identity/*)."""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.security import clear_session_cookie, create_session_token, set_session_cookie
from app.modules.identity.dependencies import current_user
from app.modules.identity.models import User
from app.modules.identity.schemas import LoginRequest, RegisterRequest, UserOut
from app.modules.identity.service import accept_terms, authenticate, register_user

router = APIRouter(prefix="/api/identity")


def _as_utc(moment: datetime | None) -> datetime | None:
    # SQLite (tests) gives back the stored UTC time without its time zone.
    if moment is None or moment.tzinfo is not None:
        return moment
    return moment.replace(tzinfo=UTC)


def _user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id, email=user.email, terms_accepted_at=_as_utc(user.terms_accepted_at)
    )


@router.post("/register", status_code=201)
async def register(
    body: RegisterRequest,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> UserOut:
    user = await register_user(session, body.email, body.password)
    # The student is logged in straight away. The token only goes in the
    # HttpOnly cookie, never in the response body.
    set_session_cookie(response, create_session_token(user.id))
    return _user_out(user)


@router.post("/login")
async def login(
    body: LoginRequest,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> UserOut:
    user = await authenticate(session, body.email, body.password)
    # The same cookie as after registration; the token is never in the body.
    set_session_cookie(response, create_session_token(user.id))
    return _user_out(user)


@router.post("/logout", status_code=204)
async def logout(response: Response) -> None:
    # No current_user: logging out must work with a missing, expired or broken
    # cookie too. The JWT itself is not revoked (stateless); removing the cookie
    # is what logs the browser out.
    clear_session_cookie(response)


@router.get("/me")
async def me(user: Annotated[User, Depends(current_user)]) -> UserOut:
    return _user_out(user)


@router.post("/terms")
async def terms(
    user: Annotated[User, Depends(current_user)],
    session: AsyncSession = Depends(get_session),
) -> UserOut:
    # No body. Idempotent: a second call keeps the first time of acceptance.
    return _user_out(await accept_terms(session, user))
