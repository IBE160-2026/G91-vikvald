"""The summary as a content type (epic 9, behind FEATURE_SUMMARY): 5 to 15
main points from the lecture, ordered by theme, each with the file and page it
comes from (FR-53, FR-54). The mock rule (NFR-2a), the loose model, the
validation, how mock-invalid breaks a point (SK-4), and saving through the
content module. Importing this module registers the type.

Unlike the other types, a summary belongs to the lecture and a new one
replaces the old (FR-55): saving deletes the old summary and adds the new one
in the same transaction as the finished job. There is no scope to choose
(always up to 15 points), and fewer than 5 valid points fail the job with
TOO_FEW_SUMMARY_POINTS, so the old summary stays.
"""

import uuid
from pathlib import Path
from typing import Any

from pydantic import StrictInt, StrictStr, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ErrorCode
from app.modules.content.service import NewSummaryPoint, replace_summary
from app.modules.generation.flashcards import sentences
from app.modules.generation.port import FormulaReport, GenerationOptions, Page
from app.modules.generation.registry import ContentType, ValidItem, register_content_type

KIND = "summary"
INSTRUCTIONS_FILE = Path(__file__).resolve().parent / "instructions" / "summary.md"
# The most points stored (FR-53). Also the only scope: there is no dialog.
MAX_POINTS = 15
# The fewest valid points for a summary to be stored (FR-53).
MIN_POINTS = 5
# The most words in one point (FR-53).
MAX_WORDS = 50


def mock_rule(pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
    """One point per page (NFR-2a), in the order file, page: the page's first
    sentence as the text, the file name as the theme (one theme per file) and
    the page as the source. A page without a sentence gives no point. The
    same pages always give the same summary. existing_keys is not used: a
    new summary replaces the old one."""
    points: list[dict[str, Any]] = []
    for page in pages:
        found = sentences(page.text)
        if not found:
            continue
        points.append(
            {
                "theme": page.file_name,
                "text": found[0],
                "file_id": page.file_id,
                "page_no": page.page_no,
            }
        )
    return points


class LooseSummaryPoint(FormulaReport):
    """One point as a model may give it: every field may be missing
    (formula_missing comes from FormulaReport)."""

    theme: StrictStr | None = None
    text: StrictStr | None = None
    file_id: uuid.UUID | None = None
    page_no: StrictInt | None = None


def validate_item(item: Any, pages: list[Page]) -> LooseSummaryPoint | None:
    """The point if it can be stored, otherwise None (FR-38, FR-53): wrong
    types, an empty theme or text, a text over 50 words, or a (file, page)
    that is not among the lecture's pages."""
    try:
        point = LooseSummaryPoint.model_validate(item)
    except ValidationError:
        return None
    if not point.theme or not point.theme.strip():
        return None
    if not point.text or not point.text.strip():
        return None
    if len(point.text.split()) > MAX_WORDS:
        return None
    if (point.file_id, point.page_no) not in {(page.file_id, page.page_no) for page in pages}:
        return None
    return point


def break_item(item: dict[str, Any], index: int) -> dict[str, Any]:
    """For LLM_PROVIDER=mock-invalid (SK-4): index % 4 == 1 gets an empty
    theme, == 2 a page that does not exist, == 3 a text of 51 words.
    Index % 4 == 0 stays valid."""
    item = dict(item)
    match index % 4:
        case 1:
            item["theme"] = ""
        case 2:
            item["page_no"] = 9999
        case 3:
            item["text"] = " ".join(["ord"] * (MAX_WORDS + 1))
    return item


async def existing_keys(_session: AsyncSession, _lecture_id: uuid.UUID) -> frozenset[str]:
    """None: a new summary replaces the old one, so nothing is left out."""
    return frozenset()


def by_theme(points: list[NewSummaryPoint]) -> list[NewSummaryPoint]:
    """The points grouped by theme (FR-53): the themes in the order they first
    appear, and each theme's points in their own (file and page) order."""
    groups: dict[str, list[NewSummaryPoint]] = {}
    for point in points:
        groups.setdefault(point.theme, []).append(point)
    return [point for group in groups.values() for point in group]


async def save(session: AsyncSession, items: list[ValidItem], options: GenerationOptions) -> None:
    """Replaces the lecture's summary with these points (FR-55), grouped by
    theme. Which points are kept is decided by the pipeline before this."""
    if options.lecture_id is None:
        raise ValueError("A summary is saved for a lecture")
    points = [
        NewSummaryPoint(
            file_id=valid.item.file_id,
            page_no=valid.item.page_no,
            theme=valid.item.theme.strip(),
            text=valid.item.text.strip(),
            formula_flag=valid.formula_flag,
        )
        for valid in items
    ]
    await replace_summary(session, options.lecture_id, by_theme(points))


register_content_type(
    ContentType(
        kind=KIND,
        mock_rule=mock_rule,
        loose_model=LooseSummaryPoint,
        validate_item=validate_item,
        existing_keys=existing_keys,
        save=save,
        instructions_file=INSTRUCTIONS_FILE,
        break_item=break_item,
        scopes=(MAX_POINTS,),
        default_requested=MAX_POINTS,
        feature="summary",
        min_items=MIN_POINTS,
        too_few_error=ErrorCode.TOO_FEW_SUMMARY_POINTS,
        surplus_discarded=True,
    )
)
