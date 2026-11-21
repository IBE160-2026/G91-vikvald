"""Flashcards as a content type: the mock rule (NFR-2a), the loose model, the
validation, and saving through the content module. Importing this module
registers the type."""

import re
import uuid
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.content.service import NewFlashcard, add_flashcards, flashcard_fronts
from app.modules.generation.port import GenerationOptions, Page
from app.modules.generation.registry import ContentType, register_content_type

KIND = "flashcards"
# The card types the pipeline may store for flashcards.
CARD_KINDS = ("qa", "concept")
PROMPT_FILE = Path(__file__).resolve().parent / "prompts" / "flashcards.txt"

# The verb that makes a definition sentence: «X er …» / «X is …» (lower case, a word of its own).
DEFINITION_VERBS = ("er", "is")
# How many words may stand before the verb.
MAX_TERM_WORDS = 6
_WHITESPACE = re.compile(r"\s+")
# A sentence ends with . ! or ? followed by a space.
_SENTENCE_END = re.compile(r"(?<=[.!?]) ")


def normalise(text: str) -> str:
    """Every run of spaces and line breaks becomes one space."""
    return _WHITESPACE.sub(" ", text).strip()


def sentences(text: str) -> list[str]:
    normalised = normalise(text)
    return [part for part in _SENTENCE_END.split(normalised) if part] if normalised else []


def definition_term(sentence: str) -> str | None:
    """The words before «er»/«is» if the sentence is a definition (1-6 words
    before the first «er»/«is»), otherwise None."""
    words = sentence.split(" ")
    for index, word in enumerate(words):
        if word in DEFINITION_VERBS:
            return " ".join(words[:index]) if 1 <= index <= MAX_TERM_WORDS else None
    return None


def mock_rule(pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
    """One concept card per definition sentence, in the order file, page,
    position on the page. Cards whose front (ignoring case) is in
    options.existing_keys are skipped. The same pages always give the same list."""
    cards: list[dict[str, Any]] = []
    for page in pages:
        for sentence in sentences(page.text):
            term = definition_term(sentence)
            if term is None or term.casefold() in options.existing_keys:
                continue
            cards.append(
                {
                    "kind": "concept",
                    "front": term,
                    "back": sentence,
                    "file_id": page.file_id,
                    "page_no": page.page_no,
                }
            )
    return cards


class LooseFlashcard(BaseModel):
    """One card as a model may give it: every field may be missing."""

    kind: str | None = None
    front: str | None = None
    back: str | None = None
    file_id: uuid.UUID | None = None
    page_no: int | None = None


def validate_item(item: Any, pages: list[Page]) -> LooseFlashcard | None:
    """The card if it can be stored, otherwise None: wrong types, a kind other
    than qa/concept, an empty front or back, or a (file, page) that is not
    among the lecture's pages."""
    try:
        card = LooseFlashcard.model_validate(item)
    except ValidationError:
        return None
    if card.kind not in CARD_KINDS:
        return None
    if not card.front or not card.front.strip() or not card.back or not card.back.strip():
        return None
    if (card.file_id, card.page_no) not in {(page.file_id, page.page_no) for page in pages}:
        return None
    return card


async def existing_keys(session: AsyncSession, lecture_id: uuid.UUID) -> frozenset[str]:
    return frozenset(front.casefold() for front in await flashcard_fronts(session, lecture_id))


async def save(session: AsyncSession, items: list[Any]) -> None:
    add_flashcards(
        session,
        [
            NewFlashcard(
                file_id=card.file_id,
                page_no=card.page_no,
                kind=card.kind,
                front=card.front.strip(),
                back=card.back.strip(),
            )
            for card in items
        ],
    )


register_content_type(
    ContentType(
        kind=KIND,
        mock_rule=mock_rule,
        loose_model=LooseFlashcard,
        validate_item=validate_item,
        existing_keys=existing_keys,
        save=save,
        prompt_file=PROMPT_FILE,
    )
)
