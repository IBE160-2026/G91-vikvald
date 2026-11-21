"""HTTP route for the practice module: POST /api/practice-sessions."""

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.modules.identity.dependencies import current_user
from app.modules.identity.models import User
from app.modules.practice.schemas import PracticeSessionIn
from app.modules.practice.service import save_session

router = APIRouter(prefix="/api/practice-sessions")

CurrentUser = Annotated[User, Depends(current_user)]
Session = Annotated[AsyncSession, Depends(get_session)]


@router.post("", status_code=204)
async def create_practice_session(request: Request, user: CurrentUser, session: Session) -> Response:
    """Save a session's result. 204 the first time and when the same session_id
    comes again.

    The body is read raw and parsed as JSON whatever the Content-Type is:
    fetch sends application/json, but navigator.sendBeacon (when the tab is
    closed) can only send text/plain without a CORS preflight. Both go through
    the same validation."""
    body = await request.body()
    try:
        data = PracticeSessionIn.model_validate_json(body)
    except ValidationError as exc:
        # Same 422 VALIDATION_ERROR format as a normal body ("body" first in loc).
        raise RequestValidationError(
            [{**error, "loc": ("body", *error.get("loc", ()))} for error in exc.errors()]
        ) from None
    await save_session(session, user.id, data)
    return Response(status_code=204)
