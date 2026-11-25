"""Free-text questions as a content type (epic 8, behind FEATURE_FREETEXT):
short- and long-answer questions with a model answer (FR-48, FR-49). The mock
rule (NFR-2a), the loose model, the validation, how mock-invalid breaks a
question (SK-4), the question-type descriptions for the instructions, and
saving through the content module. Importing this module registers the type.

The question type («Kortsvar» or «Langsvar») is the one the student chose for
the job (options.question_kind), never something the model says, so the loose
model has no kind field.
"""

import uuid
from pathlib import Path
from typing import Any

from pydantic import StrictInt, StrictStr, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.content.service import NewFreetextQuestion, add_freetext_questions, freetext_question_texts
from app.modules.generation.flashcards import definition_term, sentences
from app.modules.generation.port import FormulaReport, GenerationOptions, Page
from app.modules.generation.registry import ContentType, ValidItem, register_content_type

KIND = "freetext"
INSTRUCTIONS_FILE = Path(__file__).resolve().parent / "instructions" / "freetext.md"
# The question-type descriptions put into the instructions in place of
# «{question_kind}» (by vertex.instructions_for), as in the dialog «Lag fritekstspørsmål».
QUESTION_KINDS = {
    "short": "Kortsvar: svar med noen få setninger",
    "long": "Langsvar: forklar sammenhenger eller gi et eksempel",
}
# Stored when a job somehow has no question type (the API always sets one).
DEFAULT_QUESTION_KIND = "short"
# «Rask» (5), «Vanlig» (10, the default) and «Dyp» (15).
SCOPES = (5, 10, 15)
DEFAULT_REQUESTED = 10


def mock_rule(pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
    """One question «Forklar [term].» per definition sentence (NFR-2a), in the
    order file, page, position on the page, with the whole sentence as the
    model answer and the page as the source. A term counts once (its first
    sentence, ignoring case), as for flashcards. Questions whose text (ignoring
    case) is in options.existing_keys are skipped. The same for short and long
    questions, and the same pages always give the same list."""
    questions: list[dict[str, Any]] = []
    seen_terms: set[str] = set()
    for page in pages:
        for sentence in sentences(page.text):
            term = definition_term(sentence)
            if term is None or term.casefold() in seen_terms:
                continue
            seen_terms.add(term.casefold())
            question = f"Forklar {term}."
            if question.casefold() in options.existing_keys:
                continue
            questions.append(
                {
                    "question": question,
                    "model_answer": sentence,
                    "file_id": page.file_id,
                    "page_no": page.page_no,
                }
            )
    return questions


class LooseFreetextQuestion(FormulaReport):
    """One question as a model may give it: every field may be missing
    (formula_missing comes from FormulaReport)."""

    question: StrictStr | None = None
    model_answer: StrictStr | None = None
    file_id: uuid.UUID | None = None
    page_no: StrictInt | None = None


def validate_item(item: Any, pages: list[Page]) -> LooseFreetextQuestion | None:
    """The question if it can be stored, otherwise None: wrong types, an empty
    question or model answer, or a (file, page) that is not among the
    lecture's pages."""
    try:
        question = LooseFreetextQuestion.model_validate(item)
    except ValidationError:
        return None
    if not question.question or not question.question.strip():
        return None
    if not question.model_answer or not question.model_answer.strip():
        return None
    if (question.file_id, question.page_no) not in {(page.file_id, page.page_no) for page in pages}:
        return None
    return question


def break_item(item: dict[str, Any], index: int) -> dict[str, Any]:
    """For LLM_PROVIDER=mock-invalid (SK-4): index % 4 == 1 gets an empty
    question, == 2 a page that does not exist, == 3 an empty model answer.
    Index % 4 == 0 stays valid."""
    item = dict(item)
    match index % 4:
        case 1:
            item["question"] = ""
        case 2:
            item["page_no"] = 9999
        case 3:
            item["model_answer"] = ""
    return item


async def existing_keys(session: AsyncSession, lecture_id: uuid.UUID) -> frozenset[str]:
    """The text of every free-text question the lecture has, short and long,
    in lower case."""
    return frozenset(text.casefold() for text in await freetext_question_texts(session, lecture_id))


async def save(session: AsyncSession, items: list[ValidItem], options: GenerationOptions) -> None:
    """Saves the questions with the type the student chose for the job."""
    kind = options.question_kind or DEFAULT_QUESTION_KIND
    add_freetext_questions(
        session,
        [
            NewFreetextQuestion(
                file_id=valid.item.file_id,
                page_no=valid.item.page_no,
                kind=kind,
                question=valid.item.question.strip(),
                model_answer=valid.item.model_answer.strip(),
                formula_flag=valid.formula_flag,
            )
            for valid in items
        ],
    )


register_content_type(
    ContentType(
        kind=KIND,
        mock_rule=mock_rule,
        loose_model=LooseFreetextQuestion,
        validate_item=validate_item,
        existing_keys=existing_keys,
        save=save,
        instructions_file=INSTRUCTIONS_FILE,
        break_item=break_item,
        uses_question_kind=True,
        scopes=SCOPES,
        default_requested=DEFAULT_REQUESTED,
        feature="freetext",
    )
)
