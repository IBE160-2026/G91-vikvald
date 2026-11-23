"""The instructions for the real model (story 6.2): one file per content type in
generation/instructions/, pointed to from the registry and read by
VertexGenerator (AR-3), with the rules from FR-2, FR-28, FR-31 and SK-17.

These tests check what the files say. Whether Gemini follows them can only be
measured by hand, in the spot checks of story 6.6 (SK-13 to SK-17)."""

import re
import subprocess
from pathlib import Path

import pytest

from app.modules.generation import quiz
from app.modules.generation.port import GenerationOptions
from app.modules.generation.registry import get_content_type
from app.modules.generation.vertex import instructions_for

GENERATION_DIR = Path(__file__).resolve().parents[1] / "app" / "modules" / "generation"
INSTRUCTIONS_DIR = GENERATION_DIR / "instructions"


def _text(kind: str) -> str:
    return get_content_type(kind).instructions_file.read_text(encoding="utf-8")


def _flat(kind: str) -> str:
    """The instructions in lower case with line breaks as spaces."""
    return re.sub(r"\s+", " ", _text(kind)).lower()


# --- The files (AR-3) ------------------------------------------------------------------


@pytest.mark.parametrize("kind", ["flashcards", "quiz"])
def test_ar3_instructions_file_is_in_instructions_folder(kind: str) -> None:
    path = get_content_type(kind).instructions_file
    assert path == INSTRUCTIONS_DIR / f"{kind}.md"
    assert path.is_file()


def test_ar3_old_prompts_folder_is_gone() -> None:
    assert not (GENERATION_DIR / "prompts").exists()


@pytest.mark.parametrize("kind", ["flashcards", "quiz"])
def test_ar3_instructions_file_is_tracked_in_git(kind: str) -> None:
    path = get_content_type(kind).instructions_file
    try:
        result = subprocess.run(
            ["git", "ls-files", "--error-unmatch", path.name],
            cwd=path.parent,
            capture_output=True,
            check=False,
        )
    except FileNotFoundError:
        pytest.skip("git is not installed")
    if result.returncode != 0 and b"not a git repository" in result.stderr:
        pytest.skip("not run from a Git checkout")
    assert result.returncode == 0, result.stderr


@pytest.mark.parametrize("kind", ["flashcards", "quiz"])
def test_ar3_instructions_ask_for_the_source_from_the_page_label(kind: str) -> None:
    text = _text(kind)
    assert "file_id: …, filnavn: …, page_no: …" in text
    assert "`file_id` nøyaktig som i sidemerket" in text
    assert "`page_no` som PDF-ens eget sidetall fra 1" in text


@pytest.mark.parametrize("kind", ["flashcards", "quiz"])
def test_ar3_instructions_only_use_the_pages(kind: str) -> None:
    assert "bruk bare stoff som står på sidene" in _flat(kind)


# --- Language (FR-2) -------------------------------------------------------------------


@pytest.mark.parametrize("kind", ["flashcards", "quiz"])
def test_fr2_flashcard_instructions_require_norwegian_terms(kind: str) -> None:
    text = _flat(kind)
    assert "norsk bokmål, også når notatene er på engelsk" in text
    assert "behold norske fagbegreper slik de står i notatene" in text
    assert "det engelske i parentes" in text
    assert "«merkevare (brand)»" in text


# --- Flashcards (FR-2, SK-17) ----------------------------------------------------------


def test_fr2_flashcard_instructions_have_both_card_kinds() -> None:
    text = _text("flashcards")
    assert "- `qa`:" in text
    assert "- `concept`:" in text


def test_sk17_flashcard_instructions_prefer_fewer_cards_over_weak_ones() -> None:
    text = _flat("flashcards")
    assert "høyst så mange kort som det blir bedt om" in text
    assert "heller færre kort enn svake kort" in text


def test_sk17_flashcard_instructions_spread_cards_over_headings() -> None:
    text = _flat("flashcards")
    assert "spre kortene over hele notatene" in text
    assert "hver overskrift" in text


def test_fr2_flashcard_instructions_skip_existing_cards() -> None:
    assert "lag ikke kort som allerede finnes" in _flat("flashcards")


# --- Quiz (FR-28, FR-31) ---------------------------------------------------------------


def test_fr31_quiz_instructions_require_four_options_one_correct_explanation() -> None:
    text = _flat("quiz")
    assert "nøyaktig fire svaralternativer" in text
    assert "nøyaktig ett av dem skal være riktig" in text
    assert "forklaring (`explanation`)" in text


def test_fr28_quiz_instructions_describe_all_three_difficulties() -> None:
    text = _flat("quiz")
    for description in ("kjenne igjen en definisjon", "forstå sammenhenger", "bruke stoffet på et eksempel"):
        assert description in text, description
    assert "valgt vanskelighetsgrad: {difficulty}." in text


@pytest.mark.parametrize("difficulty", list(quiz.DIFFICULTIES))
def test_fr28_quiz_instructions_get_the_chosen_difficulty(difficulty: str) -> None:
    text = instructions_for("quiz", GenerationOptions(requested=10, difficulty=difficulty))
    assert f"Valgt vanskelighetsgrad: {quiz.DIFFICULTIES[difficulty]}." in text
    assert "{difficulty}" not in text


def test_fr28_quiz_without_difficulty_keeps_the_placeholder() -> None:
    assert "{difficulty}" in instructions_for("quiz", GenerationOptions(requested=10))


def test_fr31_quiz_instructions_require_equal_length() -> None:
    text = _flat("quiz")
    assert "alternativene skal være omtrent like lange" in text
    assert "ikke skille seg ut ved å være lengst" in text


def test_fr31_quiz_instructions_require_plausible_distractors() -> None:
    assert "feilalternativene skal være troverdige for en som ikke kan stoffet" in _flat("quiz")


def test_fr31_quiz_instructions_forbid_all_of_the_above() -> None:
    text = _flat("quiz")
    for phrase in ("«alle de ovenfor»", "«ingen av de ovenfor»", "«både a og b»"):
        assert phrase in text, phrase
    assert "ikke bruk «alle de ovenfor»" in text


@pytest.mark.parametrize("kind", ["flashcards", "quiz"])
def test_sk17_instructions_skip_pages_without_content_and_allow_an_empty_list(kind: str) -> None:
    text = _flat(kind)
    assert "sider uten faglig innhold" in text
    assert "er en tom liste et riktig svar" in text


@pytest.mark.parametrize("kind", ["flashcards", "quiz"])
def test_ar3_instructions_cite_the_main_page_when_several_pages_are_used(kind: str) -> None:
    assert "på flere sider, oppgi siden der hovedpoenget står" in _flat(kind)
