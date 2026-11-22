"""Quiz questions as a content type: the mock rule (NFR-2a), the loose model,
the validation, how mock-invalid breaks a question (SK-4), the prompt with the
chosen difficulty, and saving through the content module. Importing this
module registers the type."""

import uuid
from pathlib import Path
from typing import Any

from pydantic import BaseModel, StrictInt, StrictStr, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.content.service import NewQuizQuestion, add_quiz_questions, quiz_question_texts
from app.modules.generation.flashcards import definition_term, normalise, sentences
from app.modules.generation.port import GenerationOptions, Page
from app.modules.generation.registry import ContentType, register_content_type

KIND = "quiz"
PROMPT_FILE = Path(__file__).resolve().parent / "prompts" / "quiz.txt"
OPTION_COUNT = 4
# The difficulty descriptions put into the prompt (FR-31), as in the dialog «Lag quiz».
DIFFICULTIES = {
    "easy": "Lett: kjenne igjen en definisjon",
    "medium": "Middels: forstå sammenhenger",
    "hard": "Vanskelig: bruke stoffet på et eksempel",
}


def build_prompt(difficulty: str) -> str:
    """The quiz instructions with the description of the chosen difficulty.
    An unknown difficulty is a KeyError (the request is validated before)."""
    return PROMPT_FILE.read_text(encoding="utf-8").replace("{difficulty}", DIFFICULTIES[difficulty])


def _definitions(pages: list[Page]) -> list[tuple[str, str, str, Page]]:
    """(term, answer, sentence, page) for every definition sentence in reading
    order (file, page, position on the page). A term counts once: its first
    sentence, ignoring case. The answer is the rest of the sentence after the
    first «er»/«is»."""
    found: list[tuple[str, str, str, Page]] = []
    seen: set[str] = set()
    for page in pages:
        for sentence in sentences(page.text):
            term = definition_term(sentence)
            if term is None or term.casefold() in seen:
                continue
            seen.add(term.casefold())
            answer = " ".join(sentence.split(" ")[len(term.split(" ")) + 1 :])
            found.append((term, answer, sentence, page))
    return found


def mock_rule(pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
    """One question per definition sentence: «Hva er [term]?», the rest of the
    sentence as the correct answer (first), the answers of the next three terms
    (starting over from the first) as the wrong ones, and the whole sentence as
    the explanation. Fewer than four definitions give nothing. Questions whose
    text (ignoring case) is in options.existing_keys are skipped. The same for
    every difficulty, and the same pages always give the same list."""
    definitions = _definitions(pages)
    if len(definitions) < OPTION_COUNT:
        return []
    questions: list[dict[str, Any]] = []
    for position, (term, answer, sentence, page) in enumerate(definitions):
        question = f"Hva er {term}?"
        if question.casefold() in options.existing_keys:
            continue
        wrong = [definitions[(position + step) % len(definitions)][1] for step in range(1, OPTION_COUNT)]
        questions.append(
            {
                "question": question,
                "options": [answer, *wrong],
                "correct_index": 0,
                "explanation": sentence,
                "file_id": page.file_id,
                "page_no": page.page_no,
            }
        )
    return questions


class LooseQuizQuestion(BaseModel):
    """One question as a model may give it: every field may be missing."""

    question: StrictStr | None = None
    options: list[StrictStr] | None = None
    correct_index: StrictInt | None = None
    explanation: StrictStr | None = None
    file_id: uuid.UUID | None = None
    page_no: StrictInt | None = None


def validate_item(item: Any, pages: list[Page]) -> LooseQuizQuestion | None:
    """The question if it can be stored, otherwise None: wrong types, not
    exactly four options, an empty option, two options that are the same
    (ignoring spaces and case), a correct_index that is not a whole number
    0-3, an empty question or explanation, or a (file, page) that is not among
    the lecture's pages."""
    try:
        question = LooseQuizQuestion.model_validate(item)
    except ValidationError:
        return None
    if question.options is None or len(question.options) != OPTION_COUNT:
        return None
    keys = [normalise(option).casefold() for option in question.options]
    if any(not key for key in keys) or len(set(keys)) != OPTION_COUNT:
        return None
    if question.correct_index is None or not 0 <= question.correct_index < OPTION_COUNT:
        return None
    if not question.question or not question.question.strip():
        return None
    if not question.explanation or not question.explanation.strip():
        return None
    if (question.file_id, question.page_no) not in {(page.file_id, page.page_no) for page in pages}:
        return None
    return question


def break_item(item: dict[str, Any], index: int) -> dict[str, Any]:
    """For LLM_PROVIDER=mock-invalid (SK-4): index % 4 == 1 gets an empty
    option, == 2 a page that does not exist, == 3 a correct_index outside 0-3.
    Index % 4 == 0 stays valid."""
    item = dict(item)
    match index % 4:
        case 1:
            item["options"] = ["", *list(item["options"])[1:]]
        case 2:
            item["page_no"] = 9999
        case 3:
            item["correct_index"] = 7
    return item


async def existing_keys(session: AsyncSession, lecture_id: uuid.UUID) -> frozenset[str]:
    return frozenset(text.casefold() for text in await quiz_question_texts(session, lecture_id))


async def save(session: AsyncSession, items: list[Any]) -> None:
    add_quiz_questions(
        session,
        [
            NewQuizQuestion(
                file_id=item.file_id,
                page_no=item.page_no,
                question=item.question.strip(),
                options=tuple(option.strip() for option in item.options),
                correct_index=item.correct_index,
                explanation=item.explanation.strip(),
            )
            for item in items
        ],
    )


register_content_type(
    ContentType(
        kind=KIND,
        mock_rule=mock_rule,
        loose_model=LooseQuizQuestion,
        validate_item=validate_item,
        existing_keys=existing_keys,
        save=save,
        prompt_file=PROMPT_FILE,
        break_item=break_item,
        uses_difficulty=True,
    )
)
