"""HTTP routes for the content module: GET /api/lectures/{id}/content-counts.

The lecture page needs the number of cards before the card list exists (3.3).
More content types are added to the same answer later.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.modules.content.schemas import ContentCounts
from app.modules.content.service import flashcard_count
from app.modules.identity.dependencies import current_user
from app.modules.identity.models import User
from app.modules.subjects.service import get_lecture

lectures_router = APIRouter(prefix="/api/lectures")

CurrentUser = Annotated[User, Depends(current_user)]
Session = Annotated[AsyncSession, Depends(get_session)]


@lectures_router.get("/{lecture_id}/content-counts")
async def lecture_content_counts(lecture_id: str, user: CurrentUser, session: Session) -> ContentCounts:
    lecture = await get_lecture(session, user.id, lecture_id)
    return ContentCounts(flashcards=await flashcard_count(session, lecture.id))
