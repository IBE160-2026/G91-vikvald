"""The quality spot check of the real model (story 6.6: SK-13, SK-14, SK-15).

Two commands, run from backend/ against the running app (port 3000):

    uv run python -m scripts.export_quality_sample export --email <e-post> --subject <emne> \
        --flashcards 50 --quiz 20 --out stikkprove.csv
    uv run python -m scripts.export_quality_sample summary stikkprove.csv

`export` logs in through the app's own API (the password comes from the
SK_PASSWORD environment variable or a prompt, never from the command line),
finds the subject by name, and writes one CSV with the columns
innhold,kilde,vurdering,kommentar (UTF-8 with BOM, so Excel shows æ, ø and å).
`vurdering` and `kommentar` are always empty: the student fills them in by
hand against the textbook. When there is more content than asked for, a random
sample is drawn with a fixed seed (--seed, default 1), so the same command gives
the same sample; the rows are sorted by lecture, file and page.

`summary` reads a filled-in copy and computes the numbers for SK-13, SK-14 and
SK-15. Allowed values in `vurdering` (case does not matter):

- riktig: correct, and the source page is right.
- faglig feil: a factual error (for a quiz question also: not exactly one
  correct option, or the marked answer is wrong).
- feil kilde: correct, but the source (file or page) is wrong.
- faglig feil og feil kilde: both.

Only the app's API is used: no database connection, and no model is called.
"""

import argparse
import asyncio
import csv
import getpass
import io
import os
import random
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx

COLUMNS = ["innhold", "kilde", "vurdering", "kommentar"]
DEFAULT_BASE_URL = "http://localhost:3000"
FORMULA_MARK = "[Formelmerke]"
LONGEST_YES = "Riktig svar er lengst: ja"
LONGEST_NO = "Riktig svar er lengst: nei"
# «Riktig svar er lengst: ja» only at the end of a quiz row, optionally followed by the formula mark.
_LONGEST_YES_AT_END = re.compile(re.escape(LONGEST_YES) + r"(?: " + re.escape(FORMULA_MARK) + r")?\s*$")

CORRECT = "riktig"
FACTUAL_ERROR = "faglig feil"
WRONG_SOURCE = "feil kilde"
BOTH = "faglig feil og feil kilde"
ASSESSMENTS = {CORRECT, FACTUAL_ERROR, WRONG_SOURCE, BOTH}

# The goals in the PRD.
SK13_MAX_ERROR_SHARE = 0.05
SK14_MIN_SOURCE_SHARE = 0.95
SK15_MAX_LONGEST_SHARE = 0.35


class ExportError(Exception):
    """Stops the command with a message and exit code 1. Nothing is written."""


@dataclass(frozen=True)
class SampleRow:
    content: str
    source: str
    # For sorting: the lecture's place in date order, the file name and the page.
    sort_key: tuple[int, str, int]

    def as_csv(self) -> dict[str, str]:
        return {"innhold": self.content, "kilde": self.source, "vurdering": "", "kommentar": ""}


def _source(item: dict[str, Any]) -> str:
    return f"{item['source']['file_name']}, side {item['source']['page_no']}"


def _with_flag(text: str, item: dict[str, Any]) -> str:
    return f"{text} {FORMULA_MARK}" if item.get("formula_flag") else text


def correct_is_longest(options: list[str], correct_index: int) -> bool:
    """A mechanical length comparison. A tie with another option counts as longest."""
    lengths = [len(option.strip()) for option in options]
    return lengths[correct_index] >= max(lengths)


def flashcard_text(card: dict[str, Any]) -> str:
    return _with_flag(f"Flashcard: {card['front']} | Svar: {card['back']}", card)


def quiz_text(question: dict[str, Any]) -> str:
    options = question["options"]
    letters = "ABCD"
    parts = [f"Quiz: {question['question']}"]
    parts += [f"{letters[index]}: {option}" for index, option in enumerate(options)]
    parts.append(f"Riktig: {letters[question['correct_index']]}")
    parts.append(LONGEST_YES if correct_is_longest(options, question["correct_index"]) else LONGEST_NO)
    return _with_flag(" | ".join(parts), question)


def draw(rows: list[SampleRow], wanted: int, seed: int) -> list[SampleRow]:
    """A random sample with a fixed seed when there are more rows than wanted, sorted."""
    chosen = random.Random(seed).sample(rows, wanted) if len(rows) > wanted else list(rows)
    return sorted(chosen, key=lambda row: row.sort_key)


async def _get(client: httpx.AsyncClient, path: str) -> Any:
    response = await client.get(path)
    if response.status_code != 200:
        raise ExportError(f"{path} svarte {response.status_code}")
    return response.json()


async def collect(
    client: httpx.AsyncClient,
    email: str,
    password: str,
    subject_name: str,
    flashcards: int,
    quiz: int,
    seed: int = 1,
) -> tuple[list[SampleRow], list[str]]:
    """The sample rows and the notes to print. Raises ExportError when nothing can be written."""
    login = await client.post("/api/identity/login", json={"email": email, "password": password})
    if login.status_code != 200:
        raise ExportError("Innloggingen feilet. Sjekk e-posten og passordet.")

    subjects = await _get(client, "/api/subjects")
    matches = [item for item in subjects if item["name"] == subject_name]
    if not matches:
        names = ", ".join(sorted(item["name"] for item in subjects)) or "ingen"
        raise ExportError(f"Fant ikke emnet «{subject_name}». Emnene som finnes: {names}")
    if len(matches) > 1:
        raise ExportError(f"Det finnes {len(matches)} emner som heter «{subject_name}». Gi dem ulike navn i appen.")
    subject = matches[0]

    lectures = await _get(client, f"/api/subjects/{subject['id']}/lectures")
    order = {lecture["id"]: index for index, lecture in enumerate(sorted(lectures, key=lambda x: (x["date"], x["name"])))}

    def key(item: dict[str, Any]) -> tuple[int, str, int]:
        return (order.get(item["lecture"]["id"], len(order)), item["source"]["file_name"], item["source"]["page_no"])

    cards = await _get(client, f"/api/subjects/{subject['id']}/flashcards")
    questions = await _get(client, f"/api/subjects/{subject['id']}/quiz-questions")
    card_rows = [SampleRow(flashcard_text(card), _source(card), key(card)) for card in cards]
    quiz_rows = [SampleRow(quiz_text(question), _source(question), key(question)) for question in questions]

    notes = []
    if len(card_rows) < flashcards:
        notes.append(f"Fant {len(card_rows)} flashcards, ba om {flashcards}")
    if len(quiz_rows) < quiz:
        notes.append(f"Fant {len(quiz_rows)} quizspørsmål, ba om {quiz}")
    return draw(card_rows, flashcards, seed) + draw(quiz_rows, quiz, seed), notes


def refuse_existing(path: Path) -> None:
    """A filled-in sample must never be overwritten by a new export."""
    if path.exists():
        raise ExportError(f"{path} finnes fra før. Velg et annet navn med --out, eller slett fila først.")


def write_csv(rows: list[SampleRow], path: Path) -> None:
    refuse_existing(path)
    with path.open("x", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(row.as_csv() for row in rows)


# --- summary ------------------------------------------------------------------


@dataclass
class Summary:
    flashcards_assessed: int = 0
    flashcards_factual_errors: int = 0
    flashcards_wrong_source: int = 0
    quiz_assessed: int = 0
    quiz_one_correct: int = 0
    quiz_total: int = 0
    quiz_correct_longest: int = 0
    missing: int = 0


def summarise(path: Path) -> Summary:
    """The numbers for SK-13, SK-14 and SK-15. Raises ExportError on an unknown assessment or row.

    Excel with Norwegian settings saves CSV with «;», so the delimiter is read
    from the header line."""
    result = Summary()
    text = path.read_text(encoding="utf-8-sig")
    header = text.split("\n", 1)[0]
    delimiter = ";" if header.count(";") > header.count(",") else ","
    with io.StringIO(text, newline="") as handle:
        reader = csv.DictReader(handle, delimiter=delimiter)
        if reader.fieldnames is None or list(reader.fieldnames) != COLUMNS:
            raise ExportError(f"Kolonnene skal være {','.join(COLUMNS)}")
        for line, row in enumerate(reader, start=2):
            content = row["innhold"] or ""
            is_quiz = content.startswith("Quiz:")
            if not is_quiz and not content.startswith("Flashcard:"):
                raise ExportError(f"Rad {line} begynner verken med «Flashcard:» eller «Quiz:»: {content}")
            if is_quiz:
                result.quiz_total += 1
                result.quiz_correct_longest += bool(_LONGEST_YES_AT_END.search(content))
            value = (row["vurdering"] or "").strip().lower()
            if not value:
                result.missing += 1
                continue
            if value not in ASSESSMENTS:
                raise ExportError(
                    f"Ukjent vurdering «{row['vurdering']}» på rad {line}: {content}. "
                    f"Gyldige verdier: {', '.join(sorted(ASSESSMENTS))}"
                )
            factual = value in (FACTUAL_ERROR, BOTH)
            if is_quiz:
                result.quiz_assessed += 1
                result.quiz_one_correct += not factual
            else:
                result.flashcards_assessed += 1
                result.flashcards_factual_errors += factual
                result.flashcards_wrong_source += value in (WRONG_SOURCE, BOTH)
    return result


def _share(part: int, whole: int) -> str:
    return f"{part} av {whole} ({100 * part / whole:.1f} %)" if whole else "ingen rader"


def _verdict(ok: bool, whole: int, incomplete: bool = False) -> str:
    if not whole:
        return "–"
    if incomplete:
        return "ufullstendig"
    return "nådd" if ok else "ikke nådd"


def summary_lines(result: Summary) -> list[str]:
    cards = result.flashcards_assessed
    errors = result.flashcards_factual_errors
    right_source = cards - result.flashcards_wrong_source
    quiz = result.quiz_assessed
    # While rows lack an assessment, the assessment-based goals cannot be decided.
    incomplete = result.missing > 0
    lines = [
        f"SK-13 faglige feil i flashcards: {_share(errors, cards)}, mål under 5 %: "
        f"{_verdict(cards > 0 and errors / cards < SK13_MAX_ERROR_SHARE, cards, incomplete)}",
        f"SK-14 flashcards med riktig kilde: {_share(right_source, cards)}, mål minst 95 %: "
        f"{_verdict(cards > 0 and right_source / cards >= SK14_MIN_SOURCE_SHARE, cards, incomplete)}",
        f"SK-15 quizspørsmål med nøyaktig ett riktig alternativ: {_share(result.quiz_one_correct, quiz)}, mål alle: "
        f"{_verdict(quiz > 0 and result.quiz_one_correct == quiz, quiz, incomplete)}",
        f"SK-15 riktig svar er lengst: {_share(result.quiz_correct_longest, result.quiz_total)}, mål høyst 35 %: "
        f"{_verdict(result.quiz_total > 0 and result.quiz_correct_longest / result.quiz_total <= SK15_MAX_LONGEST_SHARE, result.quiz_total)}",
    ]
    if result.missing:
        lines.append(f"{result.missing} rader mangler vurdering")
    return lines


# --- command line ---------------------------------------------------------------


def _count(value: str) -> int:
    try:
        number = int(value)
    except ValueError:
        number = -1
    if number < 0:
        raise argparse.ArgumentTypeError(f"«{value}» er ikke et heltall fra og med 0")
    return number


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="export_quality_sample", description=__doc__.split("\n\n")[0])
    commands = parser.add_subparsers(dest="command", required=True)
    export = commands.add_parser("export", help="Lag CSV-en for stikkprøven fra appen")
    export.add_argument("--email", required=True, help="E-posten du logger inn i appen med")
    export.add_argument("--subject", required=True, help="Navnet på emnet, nøyaktig som i appen")
    export.add_argument("--flashcards", type=_count, default=50, help="Antall flashcards (standard 50)")
    export.add_argument("--quiz", type=_count, default=20, help="Antall quizspørsmål (standard 20)")
    export.add_argument("--seed", type=int, default=1, help="Frøet til det tilfeldige utvalget (standard 1)")
    export.add_argument("--out", type=Path, default=Path("stikkprove.csv"), help="Fila som skrives")
    export.add_argument("--base-url", default=DEFAULT_BASE_URL, help=f"Appens adresse (standard {DEFAULT_BASE_URL})")
    summary = commands.add_parser("summary", help="Regn ut SK-13, SK-14 og SK-15 fra en utfylt CSV")
    summary.add_argument("file", type=Path)
    return parser


async def _export(args: argparse.Namespace) -> None:
    refuse_existing(args.out)
    password = os.environ.get("SK_PASSWORD") or getpass.getpass("Passord: ")
    async with httpx.AsyncClient(base_url=args.base_url, timeout=30) as client:
        rows, notes = await collect(client, args.email, password, args.subject, args.flashcards, args.quiz, args.seed)
    for note in notes:
        print(note)
    write_csv(rows, args.out)
    print(f"Skrev {len(rows)} rader til {args.out}")


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        if args.command == "export":
            asyncio.run(_export(args))
        else:
            for line in summary_lines(summarise(args.file)):
                print(line)
    except ExportError as error:
        print(error, file=sys.stderr)
        return 1
    except (OSError, UnicodeDecodeError) as error:
        print(f"Kunne ikke lese eller skrive fila: {error}", file=sys.stderr)
        return 1
    except httpx.HTTPError as error:
        print(f"Fikk ikke kontakt med appen på {args.base_url}: {type(error).__name__}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
