"""HTTP routes for the content module: GET /api/lectures/{id}/content-counts,
GET /api/lectures/{id}/flashcards, GET /api/lectures/{id}/quiz-questions, GET /api/subjects/{id}/flashcards,
GET /api/subjects/{id}/quiz-questions, and
PATCH and DELETE /api/flashcards/{id}, and DELETE /api/quiz-questions/{id}.

The lecture page needs only the number of cards; the practice session needs
the cards with their source (and, for a whole subject, their lecture), and lets
the student edit or delete a bad card or delete a bad quiz question. More content types are added later.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_session
from app.core.errors import AppError, ErrorCode
from app.modules.content.schemas import (
    ContentCounts,
    FlashcardOut,
    FlashcardUpdate,
    QuizQuestionOut,
    SubjectFlashcardOut,
)
from app.modules.content.service import (
    delete_flashcard,
    delete_quiz_question,
    flashcard_count,
    lecture_flashcards,
    lecture_quiz_questions,
    model_card_count,
    quiz_question_count,
    subject_flashcards,
    subject_quiz_questions,
    update_flashcard,
)
from app.modules.identity.dependencies import current_user
from app.modules.identity.models import User
from app.modules.subjects.service import get_lecture, get_subject

lectures_router = APIRouter(prefix="/api/lectures")
subjects_router = APIRouter(prefix="/api/subjects")
flashcards_router = APIRouter(prefix="/api/flashcards")
quiz_questions_router = APIRouter(prefix="/api/quiz-questions")

CurrentUser = Annotated[User, Depends(current_user)]
Session = Annotated[AsyncSession, Depends(get_session)]


@lectures_router.get("/{lecture_id}/content-counts")
async def lecture_content_counts(lecture_id: str, user: CurrentUser, session: Session) -> ContentCounts:
    lecture = await get_lecture(session, user.id, lecture_id)
    return ContentCounts(
        flashcards=await flashcard_count(session, lecture.id),
        quiz_questions=await quiz_question_count(session, lecture.id),
        model_cards=await model_card_count(session, lecture.id),
    )


@lectures_router.get("/{lecture_id}/flashcards")
async def lecture_flashcard_list(lecture_id: str, user: CurrentUser, session: Session) -> list[FlashcardOut]:
    lecture = await get_lecture(session, user.id, lecture_id)
    return await lecture_flashcards(session, lecture.id)


# The answer key is sent with the questions on purpose (AR-15); the quiz page
# shows it only after the student has confirmed her answer.
@lectures_router.get("/{lecture_id}/quiz-questions")
async def lecture_quiz_question_list(
    lecture_id: str, user: CurrentUser, session: Session
) -> list[QuizQuestionOut]:
    lecture = await get_lecture(session, user.id, lecture_id)
    return await lecture_quiz_questions(session, lecture.id)


@subjects_router.get("/{subject_id}/flashcards")
async def subject_flashcard_list(
    subject_id: str, user: CurrentUser, session: Session
) -> list[SubjectFlashcardOut]:
    subject = await get_subject(session, user.id, subject_id)
    return await subject_flashcards(session, subject.id)


# As for one lecture, the answer key is sent on purpose (AR-15).
@subjects_router.get("/{subject_id}/quiz-questions")
async def subject_quiz_question_list(
    subject_id: str, user: CurrentUser, session: Session
) -> list[QuizQuestionOut]:
    subject = await get_subject(session, user.id, subject_id)
    return await subject_quiz_questions(session, subject.id)


# Editing or deleting a card is not stopped by a running job: the cards belong
# to the file, not to the job.
@flashcards_router.patch("/{flashcard_id}")
async def edit_flashcard(
    flashcard_id: str, changes: FlashcardUpdate, user: CurrentUser, session: Session
) -> FlashcardOut:
    # A mnemonic is behind FEATURE_MNEMONICS: with the switch off, sending one
    # answers 404 FEATURE_DISABLED before the card is looked up (AR-11). Front
    # and points can still be fixed.
    if "mnemonic" in changes.model_fields_set and not get_settings().FEATURE_MNEMONICS:
        raise AppError(ErrorCode.FEATURE_DISABLED)
    return await update_flashcard(session, user.id, flashcard_id, changes)


@flashcards_router.delete("/{flashcard_id}", status_code=204)
async def remove_flashcard(flashcard_id: str, user: CurrentUser, session: Session) -> Response:
    await delete_flashcard(session, user.id, flashcard_id)
    return Response(status_code=204)


# Like a card, a quiz question can be deleted while a job runs: the questions
# belong to the file, not to the job. Quiz questions cannot be edited.
@quiz_questions_router.delete("/{question_id}", status_code=204)
async def remove_quiz_question(question_id: str, user: CurrentUser, session: Session) -> Response:
    await delete_quiz_question(session, user.id, question_id)
    return Response(status_code=204)
