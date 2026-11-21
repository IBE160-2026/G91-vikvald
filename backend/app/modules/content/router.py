"""HTTP routes for the content module: GET /api/lectures/{id}/content-counts
and GET /api/lectures/{id}/flashcards.

The lecture page needs only the number of cards; the practice session needs
the cards with their source. More content types are added later.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.modules.content.schemas import ContentCounts, FlashcardOut
from app.modules.content.service import flashcard_count, lecture_flashcards
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


@lectures_router.get("/{lecture_id}/flashcards")
async def lecture_flashcard_list(lecture_id: str, user: CurrentUser, session: Session) -> list[FlashcardOut]:
    lecture = await get_lecture(session, user.id, lecture_id)
    return await lecture_flashcards(session, lecture.id)
