"""HTTP routes for the content module: GET /api/lectures/{id}/content-counts,
GET /api/lectures/{id}/flashcards and GET /api/subjects/{id}/flashcards.

The lecture page needs only the number of cards; the practice session needs
the cards with their source (and, for a whole subject, their lecture). More
content types are added later.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.modules.content.schemas import ContentCounts, FlashcardOut, SubjectFlashcardOut
from app.modules.content.service import flashcard_count, lecture_flashcards, subject_flashcards
from app.modules.identity.dependencies import current_user
from app.modules.identity.models import User
from app.modules.subjects.service import get_lecture, get_subject

lectures_router = APIRouter(prefix="/api/lectures")
subjects_router = APIRouter(prefix="/api/subjects")

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


@subjects_router.get("/{subject_id}/flashcards")
async def subject_flashcard_list(
    subject_id: str, user: CurrentUser, session: Session
) -> list[SubjectFlashcardOut]:
    subject = await get_subject(session, user.id, subject_id)
    return await subject_flashcards(session, subject.id)
