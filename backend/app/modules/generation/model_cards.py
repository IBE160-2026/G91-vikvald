"""Model cards as a content type (epic 7, behind FEATURE_MNEMONICS): the mock
rule (NFR-2a), the mnemonic rule (FR-43, FR-44), the loose model, the
validation (FR-45), how mock-invalid breaks a card (SK-4), and saving through
the content module. Importing this module registers the type.

The module is called model_cards (not models) because generation/models.py
already holds the module's tables; the kind is still "models".
"""

import re
import uuid
from pathlib import Path
from typing import Any

from pydantic import StrictInt, StrictStr, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.content.service import NewModelCard, add_model_cards, model_card_fronts
from app.modules.generation.port import FormulaReport, GenerationOptions, Page
from app.modules.generation.registry import ContentType, ValidItem, register_content_type

KIND = "models"
INSTRUCTIONS_FILE = Path(__file__).resolve().parent / "instructions" / "models.md"
# A model or list needs at least three points, for the mock and the real model (FR-45).
MIN_POINTS = 3
# The front the mock writes: «Forklar [the line above the list].»
FRONT_PREFIX = "Forklar "
# A list line: a bullet (•, ◦, ▪, -, –, *) or a number with «.» or «)», then a space.
_LIST_MARKER = re.compile(r"^\s*(?:[•◦▪\-–*]|\d{1,3}[.)])\s+")
# What ends the line above the list and is dropped before «.» is added.
_FRONT_END = ".:;"


def first_letter(point: str) -> str | None:
    """The first letter in the point (str.isalpha, so æ, ø and å count), or
    None if it has no letter."""
    return next((char for char in point if char.isalpha()), None)


def mnemonic_for(points: list[str]) -> str | None:
    """The first letter of each point in upper case, in order (FR-43), or None
    when every point starts with the same letter, ignoring case (FR-44), or a
    point has no letter."""
    letters = [first_letter(point) for point in points]
    if any(letter is None for letter in letters):
        return None
    if len({letter.casefold() for letter in letters if letter}) == 1:
        return None
    return "".join(letter.upper() for letter in letters if letter)


def _lists_on_page(page: Page) -> list[tuple[str, list[str]]]:
    """(the line above, the points) for every run of three or more list lines
    on the page that has a line above it. Blank lines are skipped."""
    lines = [line.strip() for line in page.text.splitlines() if line.strip()]
    found: list[tuple[str, list[str]]] = []
    index = 0
    while index < len(lines):
        if not _LIST_MARKER.match(lines[index]):
            index += 1
            continue
        start = index
        while index < len(lines) and _LIST_MARKER.match(lines[index]):
            index += 1
        points = [_LIST_MARKER.sub("", line, count=1).strip() for line in lines[start:index]]
        if start > 0 and len(points) >= MIN_POINTS:
            found.append((lines[start - 1], points))
    return found


def mock_rule(pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
    """One model card per list (NFR-2a): a line followed by three or more lines
    that start with a bullet or a number, on one page. The front is «Forklar
    [the line above, without a closing . : or ;].», the points are the list
    lines without bullet or number, and the mnemonic follows FR-43/FR-44. A list
    with a point without any letter gives no card. Cards whose front (ignoring
    case) is in options.existing_keys, or was made earlier in this run, are
    skipped. The same pages always give the same list."""
    cards: list[dict[str, Any]] = []
    seen = set(options.existing_keys)
    for page in pages:
        for above, points in _lists_on_page(page):
            if any(first_letter(point) is None for point in points):
                continue
            front = f"{FRONT_PREFIX}{above.rstrip(_FRONT_END).rstrip()}."
            if front.casefold() in seen:
                continue
            seen.add(front.casefold())
            cards.append(
                {
                    "front": front,
                    "points": points,
                    "mnemonic": mnemonic_for(points),
                    "file_id": page.file_id,
                    "page_no": page.page_no,
                }
            )
    return cards


class LooseModelCard(FormulaReport):
    """One model card as a model may give it: every field may be missing
    (formula_missing comes from FormulaReport)."""

    front: StrictStr | None = None
    points: list[StrictStr] | None = None
    mnemonic: StrictStr | None = None
    file_id: uuid.UUID | None = None
    page_no: StrictInt | None = None


def mnemonic_matches(points: list[str], mnemonic: str | None) -> bool:
    """FR-45: when the points' first letters differ, the mnemonic's letters
    (letters only, ignoring case) must be exactly those first letters in order.
    When they are all the same, any mnemonic is accepted (it is not stored)."""
    expected = mnemonic_for(points)
    if expected is None:
        return True
    if mnemonic is None:
        return False
    return "".join(char for char in mnemonic if char.isalpha()).casefold() == expected.casefold()


def validate_item(item: Any, pages: list[Page]) -> LooseModelCard | None:
    """The card if it can be stored, otherwise None (FR-45): wrong types, an
    empty front, fewer than three points, an empty point or one without any
    letter, a mnemonic that does not match the first letters (or is missing
    when they differ), or a (file, page) that is not among the lecture's pages."""
    try:
        card = LooseModelCard.model_validate(item)
    except ValidationError:
        return None
    if not card.front or not card.front.strip():
        return None
    if card.points is None or len(card.points) < MIN_POINTS:
        return None
    if any(not point.strip() or first_letter(point) is None for point in card.points):
        return None
    if not mnemonic_matches(card.points, card.mnemonic):
        return None
    if (card.file_id, card.page_no) not in {(page.file_id, page.page_no) for page in pages}:
        return None
    return card


def break_item(item: dict[str, Any], index: int) -> dict[str, Any]:
    """For LLM_PROVIDER=mock-invalid (SK-4): index % 4 == 1 gets an empty
    front, == 2 a page that does not exist, == 3 only two points. Index % 4 == 0
    stays valid."""
    item = dict(item)
    match index % 4:
        case 1:
            item["front"] = ""
        case 2:
            item["page_no"] = 9999
        case 3:
            item["points"] = list(item["points"])[:2]
    return item


async def existing_keys(session: AsyncSession, lecture_id: uuid.UUID) -> frozenset[str]:
    return frozenset(front.casefold() for front in await model_card_fronts(session, lecture_id))


def _stored_mnemonic(points: list[str], mnemonic: str | None) -> str | None:
    """The mnemonic as the model gave it (trimmed), or None when the points all
    start with the same letter (FR-44)."""
    if mnemonic_for(points) is None or mnemonic is None:
        return None
    return mnemonic.strip() or None


async def save(session: AsyncSession, items: list[ValidItem]) -> None:
    add_model_cards(
        session,
        [
            NewModelCard(
                file_id=valid.item.file_id,
                page_no=valid.item.page_no,
                front=valid.item.front.strip(),
                points=tuple(point.strip() for point in valid.item.points),
                mnemonic=_stored_mnemonic(valid.item.points, valid.item.mnemonic),
                formula_flag=valid.formula_flag,
            )
            for valid in items
        ],
    )


register_content_type(
    ContentType(
        kind=KIND,
        mock_rule=mock_rule,
        loose_model=LooseModelCard,
        validate_item=validate_item,
        existing_keys=existing_keys,
        save=save,
        instructions_file=INSTRUCTIONS_FILE,
        break_item=break_item,
        feature="mnemonics",
    )
)
