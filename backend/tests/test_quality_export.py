"""The export script for the quality spot check (story 6.6: SK-13, SK-14, SK-15).

The script only uses the app's API. Here it runs against the app in-process
(the ASGI `client` fixture) with the seeded demo data: 15 flashcards and 15
quiz questions in «Markedsføring». No model is called.
"""

import csv
import re
from pathlib import Path
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.core.config import Settings
from app.seed.service import SUBJECT_NAME, TEST_EMAIL, TEST_PASSWORD, seed_if_empty
from scripts import export_quality_sample as script
from scripts.export_quality_sample import ExportError, collect, correct_is_longest, quiz_text, summarise, write_csv

SOURCE = r"^(markedsmiksen|segmentering|aida)\.pdf, side \d+$"
LECTURE_ORDER = ["markedsmiksen.pdf", "segmentering.pdf", "aida.pdf"]


@pytest.fixture
async def seeded(engine: AsyncEngine, client: AsyncClient) -> AsyncClient:
    settings = Settings(APP_ENV="local", LLM_PROVIDER="mock")
    assert await seed_if_empty(async_sessionmaker(engine, expire_on_commit=False), settings) is True
    return client


async def _collect(client: AsyncClient, **values: Any) -> tuple[list[script.SampleRow], list[str]]:
    options: dict[str, Any] = {"subject_name": SUBJECT_NAME, "flashcards": 10, "quiz": 5, "seed": 1}
    options.update(values)
    return await collect(client, TEST_EMAIL, TEST_PASSWORD, **options)


def _read(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


async def test_sk13_export_writes_sample_with_empty_assessments(seeded: AsyncClient, tmp_path: Path) -> None:
    rows, notes = await _collect(seeded)
    assert notes == []
    path = tmp_path / "stikkprove.csv"
    write_csv(rows, path)

    # UTF-8 with BOM, the four columns, and nothing filled in.
    assert path.read_bytes().startswith(b"\xef\xbb\xbfinnhold,kilde,vurdering,kommentar")
    lines = _read(path)
    assert len(lines) == 15
    cards, questions = lines[:10], lines[10:]
    assert all(line["innhold"].startswith("Flashcard: ") for line in cards)
    assert all(line["innhold"].startswith("Quiz: ") for line in questions)
    assert all(line["vurdering"] == "" and line["kommentar"] == "" for line in lines)
    assert all(re.match(SOURCE, line["kilde"]) for line in lines)
    for line in questions:
        for part in (" | A: ", " | B: ", " | C: ", " | D: ", " | Riktig: "):
            assert part in line["innhold"]
        assert re.search(r"Riktig svar er lengst: (ja|nei)$", line["innhold"])

    # Sorted by lecture (date order), file and page within each kind.
    for group in (cards, questions):
        keys = [(LECTURE_ORDER.index(line["kilde"].split(",")[0]), int(line["kilde"].rsplit(" ", 1)[1])) for line in group]
        assert keys == sorted(keys)


async def test_sk13_export_same_seed_gives_same_sample(seeded: AsyncClient) -> None:
    first, _ = await _collect(seeded, seed=1)
    second, _ = await _collect(seeded, seed=1)
    other, _ = await _collect(seeded, seed=2)
    assert [row.content for row in first] == [row.content for row in second]
    assert [row.content for row in first] != [row.content for row in other]


async def test_sk13_export_takes_everything_when_too_little(seeded: AsyncClient) -> None:
    rows, notes = await _collect(seeded, flashcards=50, quiz=20)
    assert len([row for row in rows if row.content.startswith("Flashcard:")]) == 15
    assert len([row for row in rows if row.content.startswith("Quiz:")]) == 15
    assert notes == ["Fant 15 flashcards, ba om 50", "Fant 15 quizspørsmål, ba om 20"]


async def test_sk13_export_unknown_subject_lists_the_subjects(seeded: AsyncClient) -> None:
    with pytest.raises(ExportError, match="Fant ikke emnet «Ukjent». Emnene som finnes: Markedsføring"):
        await _collect(seeded, subject_name="Ukjent")


async def test_sk13_export_wrong_password_stops(seeded: AsyncClient) -> None:
    with pytest.raises(ExportError, match="Innloggingen feilet"):
        await collect(seeded, TEST_EMAIL, "feilpassord", SUBJECT_NAME, 10, 5)


def test_sk13_export_command_exits_1_and_writes_nothing(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    async def failing(*_args: Any, **_kwargs: Any) -> Any:
        raise ExportError("Innloggingen feilet. Sjekk e-posten og passordet.")

    monkeypatch.setattr(script, "collect", failing)
    monkeypatch.setenv("SK_PASSWORD", "x")
    out = tmp_path / "ut.csv"
    code = script.main(["export", "--email", "a@b.no", "--subject", "X", "--out", str(out)])
    assert code == 1
    assert not out.exists()
    assert "Innloggingen feilet" in capsys.readouterr().err


def test_sk15_correct_longest_counts_ties_as_yes() -> None:
    assert correct_is_longest(["Kort", "Lengre svar", "Midt", "Nei"], 1) is True
    assert correct_is_longest(["Like lang", "Like lang", "Kort", "Nei"], 0) is True
    assert correct_is_longest(["Kort", "Lengre svar", "Midt", "Nei"], 0) is False
    text = quiz_text(
        {
            "question": "Hva er en merkevare?",
            "options": ["Et navn", "En pris", "Et sted", "En logo"],
            "correct_index": 0,
            "formula_flag": True,
        }
    )
    assert text == (
        "Quiz: Hva er en merkevare? | A: Et navn | B: En pris | C: Et sted | D: En logo | Riktig: A"
        " | Riktig svar er lengst: ja [Formelmerke]"
    )


def _filled(path: Path, rows: list[tuple[str, str]]) -> Path:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["innhold", "kilde", "vurdering", "kommentar"])
        for content, assessment in rows:
            writer.writerow([content, "a.pdf, side 1", assessment, ""])
    return path


def test_sk13_summary_computes_sk13_sk14_sk15(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    rows = [("Flashcard: A | Svar: B", "riktig")] * 17 + [
        ("Flashcard: C | Svar: D", "Faglig feil"),
        ("Flashcard: E | Svar: F", "feil side"),
        ("Flashcard: G | Svar: H", ""),
        ("Quiz: Q | A: a | B: b | C: c | D: d | Riktig: A | Riktig svar er lengst: ja", "riktig"),
        ("Quiz: Q | A: a | B: b | C: c | D: d | Riktig: A | Riktig svar er lengst: nei", "faglig feil"),
        ("Quiz: Q | A: a | B: b | C: c | D: d | Riktig: A | Riktig svar er lengst: nei", ""),
        ("Quiz: Q | A: a | B: b | C: c | D: d | Riktig: A | Riktig svar er lengst: nei", ""),
    ]
    path = _filled(tmp_path / "utfylt.csv", rows)
    result = summarise(path)
    assert (result.flashcards_assessed, result.flashcards_factual_errors, result.flashcards_wrong_page) == (19, 1, 1)
    assert (result.quiz_assessed, result.quiz_one_correct) == (2, 1)
    assert (result.quiz_total, result.quiz_correct_longest) == (4, 1)
    assert result.missing == 3

    assert script.main(["summary", str(path)]) == 0
    out = capsys.readouterr().out
    assert "SK-13 faglige feil i flashcards: 1 av 19 (5.3 %), mål under 5 %: ikke nådd" in out
    assert "SK-14 flashcards med riktig side: 18 av 19 (94.7 %), mål minst 95 %: ikke nådd" in out
    assert "SK-15 quizspørsmål med nøyaktig ett riktig alternativ: 1 av 2 (50.0 %), mål alle: ikke nådd" in out
    assert "SK-15 riktig svar er lengst: 1 av 4 (25.0 %), mål høyst 35 %: nådd" in out
    assert "3 rader mangler vurdering" in out


def test_sk15_summary_stops_on_unknown_assessment(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    path = _filled(tmp_path / "utfylt.csv", [("Flashcard: A | Svar: B", "riktig"), ("Flashcard: C | Svar: D", "ok")])
    with pytest.raises(ExportError, match="Ukjent vurdering «ok» på rad 3: Flashcard: C"):
        summarise(path)
    assert script.main(["summary", str(path)]) == 1
    captured = capsys.readouterr()
    assert "Ukjent vurdering «ok»" in captured.err
    assert "SK-13" not in captured.out
