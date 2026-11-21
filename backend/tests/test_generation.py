"""The generation module without HTTP: the mock rule (NFR-2a), the invalid mock
(SK-4), validate_item, the registry (AR-5), the provider choice and the startup
(AR-3, AR-14)."""

import logging
import uuid
from pathlib import Path

import pytest

from app.main import app, lifespan
from app.modules.files.pdf import read_pages
from app.modules.generation import flashcards
from app.modules.generation.mock import InvalidMockGenerator, MockGenerator
from app.modules.generation.port import GenerationOptions, Page
from app.modules.generation.providers import (
    UNSUPPORTED_MESSAGE,
    UnsupportedProviderError,
    get_generator,
    select_generator,
)
from app.modules.generation.registry import ContentType, get_content_type, register_content_type

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "definisjoner.pdf"
FILE_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def fixture_pages(file_id: uuid.UUID = FILE_ID) -> list[Page]:
    texts = read_pages(FIXTURE.read_bytes())
    return [Page(file_id, number, text) for number, text in enumerate(texts, start=1)]


def options(existing: set[str] | None = None, requested: int = 20) -> GenerationOptions:
    return GenerationOptions(requested=requested, existing_keys=frozenset(existing or set()))


async def test_nfr2a_mock_gir_samme_kort_for_samme_fil_to_ganger() -> None:
    first = await MockGenerator().generate("flashcards", fixture_pages(), options())
    second = await MockGenerator().generate("flashcards", fixture_pages(), options())
    assert first == second
    assert [(card["front"], card["page_no"]) for card in first] == [
        ("Merkevare", 1),
        ("Segmentering", 1),
        ("Posisjonering", 1),
        ("A brand", 2),
        ("The marketing mix", 2),
    ]


async def test_nfr2a_hvert_kort_folger_regelen() -> None:
    pages = fixture_pages()
    cards = await MockGenerator().generate("flashcards", pages, options())
    for card in cards:
        assert set(card) == {"kind", "front", "back", "file_id", "page_no"}
        assert card["kind"] == "concept"
        assert card["file_id"] == FILE_ID
        # The back is the whole sentence, taken unchanged (apart from spaces) from the page.
        page_text = flashcards.normalise(pages[card["page_no"] - 1].text)
        assert card["back"] in page_text
        words = card["back"].split(" ")
        verb = next(index for index, word in enumerate(words) if word in ("er", "is"))
        assert 1 <= verb <= 6
        assert card["front"] == " ".join(words[:verb])
        assert card["back"][-1] in ".!?"
    assert cards[0]["back"] == (
        "Merkevare er et navn, et symbol eller en design som skiller et produkt fra andre."
    )


def test_nfr2a_setninger_deles_etter_punktum_utrop_og_sporsmal() -> None:
    assert flashcards.sentences("En er to.\n\nTre  er fire! Fem er seks? Sju") == [
        "En er to.",
        "Tre er fire!",
        "Fem er seks?",
        "Sju",
    ]


@pytest.mark.parametrize(
    ("sentence", "term"),
    [
        ("Merkevare er et navn.", "Merkevare"),
        ("A brand is a promise.", "A brand"),
        ("En to tre fire fem seks er sju.", "En to tre fire fem seks"),
        ("En to tre fire fem seks sju er åtte.", None),
        ("Er dette en definisjon?", None),
        ("Merkevare Er et navn.", None),
        ("Prisen erstatter alt.", None),
        ("Ingen verb her.", None),
    ],
)
def test_nfr2a_definisjonssetning(sentence: str, term: str | None) -> None:
    assert flashcards.definition_term(sentence) == term


async def test_nfr2a_kjente_forsider_hoppes_over_uten_forskjell_paa_store_og_smaa() -> None:
    cards = await MockGenerator().generate(
        "flashcards", fixture_pages(), options({"merkevare", "a brand"})
    )
    assert [card["front"] for card in cards] == ["Segmentering", "Posisjonering", "The marketing mix"]


async def test_sk4_ugyldig_mock_odelegger_tre_av_fire() -> None:
    cards = await InvalidMockGenerator().generate("flashcards", fixture_pages(), options())
    assert len(cards) == 5
    assert cards[0]["front"] == "Merkevare" and cards[0]["kind"] == "concept"
    assert cards[1]["front"] == ""
    assert cards[2]["page_no"] == 9999
    assert cards[3]["kind"] == "unknown"
    assert cards[4]["front"] == "The marketing mix"
    pages = fixture_pages()
    valid = [card for card in cards if flashcards.validate_item(card, pages) is not None]
    assert [card["front"] for card in valid] == ["Merkevare", "The marketing mix"]


def _card(**changes: object) -> dict[str, object]:
    card: dict[str, object] = {
        "kind": "qa",
        "front": "Hva er en merkevare?",
        "back": "Et navn eller symbol.",
        "file_id": FILE_ID,
        "page_no": 1,
    }
    card.update(changes)
    return card


@pytest.mark.parametrize(
    "item",
    [
        _card(kind="model"),
        _card(kind="unknown"),
        _card(kind=None),
        _card(front=""),
        _card(front="   "),
        _card(back=""),
        _card(back=None),
        _card(page_no=3),
        _card(page_no="ikke et tall"),
        _card(file_id=uuid.uuid4()),
        _card(file_id="ikke en id"),
        _card(front=["en", "liste"]),
        "ikke et objekt",
        None,
        {},
    ],
)
def test_ar4_validate_item_forkaster_ugyldige(item: object) -> None:
    assert flashcards.validate_item(item, fixture_pages()) is None


def test_ar4_validate_item_godtar_qa_og_concept() -> None:
    pages = fixture_pages()
    assert flashcards.validate_item(_card(), pages) is not None
    assert flashcards.validate_item(_card(kind="concept", page_no=2), pages) is not None
    # A file id as text is accepted too (a real model answers with JSON).
    assert flashcards.validate_item(_card(file_id=str(FILE_ID)), pages) is not None


def test_ar5_flashcards_er_registrert_med_promptfil() -> None:
    content_type = get_content_type("flashcards")
    assert content_type.kind == "flashcards"
    assert content_type.loose_model is flashcards.LooseFlashcard
    prompt = content_type.prompt_file.read_text(encoding="utf-8")
    for rule in ("bokmål", "(brand)", "qa", "concept", "PDF-siden"):
        assert rule in prompt
    with pytest.raises(KeyError):
        get_content_type("quiz")


def test_ar5_samme_type_to_ganger_er_en_feil() -> None:
    with pytest.raises(ValueError, match="flashcards"):
        register_content_type(ContentType(**{**get_content_type("flashcards").__dict__}))


def test_ar3_leverandoren_velges_fra_llm_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    assert isinstance(select_generator("mock"), MockGenerator)
    assert isinstance(select_generator("mock-invalid"), InvalidMockGenerator)
    with pytest.raises(UnsupportedProviderError):
        select_generator("vertex")
    monkeypatch.setenv("LLM_PROVIDER", "mock-invalid")
    assert isinstance(get_generator(), InvalidMockGenerator)


async def test_ar3_vertex_stopper_oppstarten_med_critical_logg(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "vertex")
    with caplog.at_level(logging.CRITICAL), pytest.raises(UnsupportedProviderError):
        async with lifespan(app):
            pass
    critical = [record for record in caplog.records if record.levelno == logging.CRITICAL]
    assert [record.getMessage() for record in critical] == [UNSUPPORTED_MESSAGE]
    assert UNSUPPORTED_MESSAGE == (
        "LLM_PROVIDER=vertex is not supported yet (Vertex AI arrives in epic 6). Use mock or mock-invalid."
    )
