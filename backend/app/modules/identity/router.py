"""HTTP routes for the identity module (/api/identity/*)."""

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.security import create_session_token, set_session_cookie
from app.modules.identity.schemas import RegisterRequest, UserOut
from app.modules.identity.service import register_user

router = APIRouter(prefix="/api/identity")


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
    return UserOut(id=user.id, email=user.email)
