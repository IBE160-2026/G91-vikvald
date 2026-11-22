"""Business logic for stored content: save generated flashcards, count them,
list them with their source, and let the student edit or delete one."""

import uuid
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError, ErrorCode
from app.modules.content.models import PLAIN_FLASHCARD_KINDS, Flashcard
from app.modules.content.registry import DeleteScope
from app.modules.content.schemas import (
    FlashcardOut,
    FlashcardSource,
    FlashcardUpdate,
    LectureRef,
    SubjectFlashcardOut,
)
from app.modules.files.models import File
from app.modules.subjects.models import Lecture, Subject


@dataclass(frozen=True)
class NewFlashcard:
    file_id: uuid.UUID
    page_no: int
    kind: str
    front: str
    back: str | None


def add_flashcards(session: AsyncSession, cards: list[NewFlashcard]) -> None:
    """Add the cards to the session. New cards are added to the existing ones,
    never in their place. The caller commits (one transaction with the job)."""
    session.add_all(
        Flashcard(
            id=uuid.uuid4(),
            file_id=card.file_id,
            page_no=card.page_no,
            kind=card.kind,
            front=card.front,
            back=card.back,
            formula_flag=False,
        )
        for card in cards
    )


async def flashcard_fronts(session: AsyncSession, lecture_id: uuid.UUID) -> list[str]:
    """The front of every card made from the lecture's files."""
    statement = (
        select(Flashcard.front)
        .join(File, Flashcard.file_id == File.id)
        .where(File.lecture_id == lecture_id)
        .order_by(Flashcard.created_at, Flashcard.id)
    )
    return list(await session.scalars(statement))


async def flashcard_count(session: AsyncSession, lecture_id: uuid.UUID) -> int:
    """The number of flashcards (qa and concept) made from the lecture's files."""
    statement = (
        select(func.count(Flashcard.id))
        .join(File, Flashcard.file_id == File.id)
        .where(File.lecture_id == lecture_id, Flashcard.kind.in_(PLAIN_FLASHCARD_KINDS))
    )
    return int(await session.scalar(statement) or 0)


async def lecture_flashcards(session: AsyncSession, lecture_id: uuid.UUID) -> list[FlashcardOut]:
    """The lecture's flashcards (qa and concept) with their source, ordered by
    file (upload order), then page, then the order they were made in."""
    statement = (
        select(Flashcard, File.original_name)
        .join(File, Flashcard.file_id == File.id)
        .where(File.lecture_id == lecture_id, Flashcard.kind.in_(PLAIN_FLASHCARD_KINDS))
        .order_by(File.uploaded_at, File.id, Flashcard.page_no, Flashcard.created_at, Flashcard.id)
    )
    return [
        FlashcardOut(
            id=card.id,
            kind=card.kind,
            front=card.front,
            back=card.back,
            source=FlashcardSource(file_id=card.file_id, file_name=file_name, page_no=card.page_no),
        )
        for card, file_name in (await session.execute(statement)).all()
    ]


async def subject_flashcards(session: AsyncSession, subject_id: uuid.UUID) -> list[SubjectFlashcardOut]:
    """The flashcards (qa and concept) from all the subject's lectures, with
    their source and lecture. Ordered by lecture (date, then when it was
    created), then as for one lecture: file, page, the order they were made in."""
    statement = (
        select(Flashcard, File.original_name, Lecture.id, Lecture.name)
        .join(File, Flashcard.file_id == File.id)
        .join(Lecture, File.lecture_id == Lecture.id)
        .where(Lecture.subject_id == subject_id, Flashcard.kind.in_(PLAIN_FLASHCARD_KINDS))
        .order_by(
            Lecture.date,
            Lecture.created_at,
            Lecture.id,
            File.uploaded_at,
            File.id,
            Flashcard.page_no,
            Flashcard.created_at,
            Flashcard.id,
        )
    )
    return [
        SubjectFlashcardOut(
            id=card.id,
            kind=card.kind,
            front=card.front,
            back=card.back,
            source=FlashcardSource(file_id=card.file_id, file_name=file_name, page_no=card.page_no),
            lecture=LectureRef(id=lecture_id, name=lecture_name),
        )
        for card, file_name, lecture_id, lecture_name in (await session.execute(statement)).all()
    ]


async def count_flashcards(session: AsyncSession, scope: DeleteScope) -> int:
    """The flashcards (qa and concept) made from the files in the delete scope
    (the count in the delete confirmation, FR-12)."""
    if not scope.file_ids:
        return 0
    statement = select(func.count(Flashcard.id)).where(
        Flashcard.file_id.in_(scope.file_ids), Flashcard.kind.in_(PLAIN_FLASHCARD_KINDS)
    )
    return int(await session.scalar(statement) or 0)


async def get_flashcard(
    session: AsyncSession, user_id: uuid.UUID, flashcard_id: str
) -> tuple[Flashcard, str, uuid.UUID]:
    """Her flashcard (qa or concept) with its file's name and its lecture's id.
    A card has no user_id of its own: it is hers through file, lecture and
    subject. Someone else's, a missing and a malformed id (and a model card)
    all give the same 404 NOT_FOUND."""
    try:
        parsed = uuid.UUID(flashcard_id)
    except ValueError:
        raise AppError(ErrorCode.NOT_FOUND) from None
    statement = (
        select(Flashcard, File.original_name, Lecture.id)
        .join(File, Flashcard.file_id == File.id)
        .join(Lecture, File.lecture_id == Lecture.id)
        .join(Subject, Lecture.subject_id == Subject.id)
        .where(
            Flashcard.id == parsed,
            Subject.user_id == user_id,
            Flashcard.kind.in_(PLAIN_FLASHCARD_KINDS),
        )
    )
    row = (await session.execute(statement)).first()
    if row is None:
        raise AppError(ErrorCode.NOT_FOUND)
    card, file_name, lecture_id = row
    return card, file_name, lecture_id


def _flashcard_out(card: Flashcard, file_name: str) -> FlashcardOut:
    return FlashcardOut(
        id=card.id,
        kind=card.kind,
        front=card.front,
        back=card.back,
        source=FlashcardSource(file_id=card.file_id, file_name=file_name, page_no=card.page_no),
    )


async def update_flashcard(
    session: AsyncSession, user_id: uuid.UUID, flashcard_id: str, changes: FlashcardUpdate
) -> FlashcardOut:
    """Save the student's own text (FR-27). The text is trimmed at both ends,
    line breaks inside are kept. Only empty fields are rejected (front first),
    never with the generation's validate_item (AR-4): her text needs no page
    to come from. Nothing is stored when a field is empty."""
    card, file_name, _lecture_id = await get_flashcard(session, user_id, flashcard_id)
    front = changes.front.strip() if changes.front is not None else None
    back = changes.back.strip() if changes.back is not None else None
    if front is not None and not front:
        raise AppError(ErrorCode.FLASHCARD_FRONT_REQUIRED)
    if back is not None and not back:
        raise AppError(ErrorCode.FLASHCARD_BACK_REQUIRED)
    if front is not None:
        card.front = front
    if back is not None:
        card.back = back
    result = _flashcard_out(card, file_name)
    await session.commit()
    return result


async def delete_flashcard(session: AsyncSession, user_id: uuid.UUID, flashcard_id: str) -> None:
    """Delete her flashcard (FR-27). Someone else's or a missing one gives 404."""
    card, _file_name, _lecture_id = await get_flashcard(session, user_id, flashcard_id)
    await session.delete(card)
    await session.commit()
