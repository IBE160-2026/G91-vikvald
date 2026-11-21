"""Business logic for stored content: save generated flashcards, count them
and list them with their source."""

import uuid
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.content.models import PLAIN_FLASHCARD_KINDS, Flashcard
from app.modules.content.schemas import FlashcardOut, FlashcardSource
from app.modules.files.models import File


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
