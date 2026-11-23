"""Pages with formulas (FR-40, FR-41, AR-6): the needs_image rule at upload,
page images to the port (never stored), and formula_flag on the content.

No test calls Vertex AI (ALLOW_MODEL_REQUESTS = False in conftest.py); the
real-model request is checked with pydantic-ai's FunctionModel."""

import logging
import uuid
from pathlib import Path
from typing import Any

import pymupdf
import pytest
from httpx import AsyncClient
from pydantic_ai import BinaryContent
from pydantic_ai.messages import ModelMessage, ModelResponse, UserPromptPart
from pydantic_ai.models.function import AgentInfo, FunctionModel
from sqlalchemy import LargeBinary, select
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.core.db import Base
from app.main import app
from app.modules.files import pdf as pdf_module
from app.modules.files import service as files_service
from app.modules.files.models import FilePage
from app.modules.generation import service
from app.modules.generation.flashcards import LooseFlashcard
from app.modules.generation.flashcards import validate_item as validate_flashcard
from app.modules.generation.mock import InvalidMockGenerator, MockGenerator
from app.modules.generation.port import GenerationOptions, Page
from app.modules.generation.providers import get_generator
from app.modules.generation.quiz import LooseQuizQuestion
from app.modules.generation.vertex import VertexGenerator, output_wrapper, user_message
from tests.fixtures.formula_pdf import PAGE_1_TEXT, build_formula_pdf, build_image_pdf
from tests.test_files import _log_in_new_user, _new_lecture, _upload
from tests.test_jobs import _finish_jobs, _latest, _start, no_jobs_left
from tests.test_lectures import _create_lecture, _new_subject
from tests.test_quiz import _start_quiz
from tests.test_vertex import _answer

# Fixture used by the tests below (imported so pytest finds it here).
__all__ = ["no_jobs_left"]

LECTURES = "/api/lectures"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
FILE_ID = uuid.UUID("00000000-0000-0000-0000-000000000003")


class RecordingGenerator:
    """Records the pages the port gets and answers with `answer(pages)`."""

    def __init__(self, answer: Any = None) -> None:
        self.pages: list[Page] = []
        self.answer = answer

    async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
        self.pages = pages
        return self.answer(pages) if self.answer else []


def _use(generator: Any) -> None:
    app.dependency_overrides[get_generator] = lambda: generator


async def _formula_lecture(client: AsyncClient) -> tuple[str, str, str]:
    """(user_id, lecture_id, file_id) with the formula PDF uploaded."""
    user_id = await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    response = await _upload(client, lecture_id, build_formula_pdf(), "formler.pdf")
    assert response.status_code == 201
    return user_id, lecture_id, response.json()["id"]


def _files_on_disk(upload_dir: Path) -> list[Path]:
    return sorted(path for path in upload_dir.rglob("*") if path.is_file()) if upload_dir.exists() else []


def _card(file_id: str, page_no: int, front: str, **extra: Any) -> dict[str, Any]:
    return {"kind": "qa", "front": front, "back": "Et svar.", "file_id": file_id, "page_no": page_no, **extra}


# --- The rule at upload (FR-40) --------------------------------------------------------


def test_fr40_vector_formula_page_needs_image() -> None:
    pages = pdf_module.read_pages(build_formula_pdf())
    assert pages[0].needs_image is True
    # The drawn formula is not in the text: that is why the image is needed.
    assert "Elastisitet" in pages[0].text


def test_fr40_text_page_with_underline_does_not_need_image() -> None:
    pages = pdf_module.read_pages(build_formula_pdf())
    assert pages[1].needs_image is False


def test_fr40_image_over_threshold_needs_image() -> None:
    assert pdf_module.read_pages(build_image_pdf(0.01))[0].needs_image is True


def test_fr40_image_under_threshold_does_not_need_image() -> None:
    assert pdf_module.read_pages(build_image_pdf(0.002))[0].needs_image is False


def test_fr40_rule_thresholds_are_the_documented_ones() -> None:
    assert pdf_module.MIN_COMPLEX_DRAWINGS == 3
    assert pdf_module.COMPLEX_DRAWING_MIN_ITEMS == 5
    assert pdf_module.MIN_IMAGE_AREA_SHARE == 0.005


def test_fr40_render_pages_png_gives_png_bytes_from_one_open() -> None:
    images = pdf_module.render_pages_png(build_formula_pdf(), [1, 2])
    assert sorted(images) == [1, 2]
    assert all(image.startswith(PNG_MAGIC) for image in images.values())


def test_fr40_huge_page_is_rendered_within_the_side_cap() -> None:
    document = pymupdf.open()
    document.new_page(width=14_400, height=7_200).insert_text((72, 72), "Plakat")
    data = document.tobytes()
    document.close()
    image = pdf_module.render_pages_png(data, [1])[1]
    pixmap = pymupdf.Pixmap(image)
    assert max(pixmap.width, pixmap.height) <= pdf_module.MAX_PAGE_IMAGE_SIDE_PX


def test_fr40_page_the_rule_cannot_inspect_still_uploads_and_needs_image(monkeypatch: pytest.MonkeyPatch) -> None:
    def broken(_page: Any) -> bool:
        raise RuntimeError("cannot inspect drawings")

    monkeypatch.setattr(pdf_module, "page_needs_image", broken)
    pages = pdf_module.read_pages(build_formula_pdf())
    assert [page.needs_image for page in pages] == [True, True]
    assert "Elastisitet" in pages[0].text


async def test_fr40_upload_succeeds_when_the_rule_fails(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(pdf_module, "page_needs_image", lambda _page: 1 / 0)
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    assert (await _upload(client, lecture_id, build_formula_pdf())).status_code == 201


async def test_fr40_upload_stores_needs_image_per_page(client: AsyncClient, engine: AsyncEngine) -> None:
    _user_id, _lecture_id, file_id = await _formula_lecture(client)
    async with async_sessionmaker(engine)() as session:
        pages = list(
            await session.scalars(
                select(FilePage).where(FilePage.file_id == uuid.UUID(file_id)).order_by(FilePage.page_no)
            )
        )
    assert [(page.page_no, page.needs_image) for page in pages] == [(1, True), (2, False)]


# --- Page images to the port (FR-40, AR-6) --------------------------------------------


async def test_fr40_port_gets_png_for_image_page_and_nothing_is_stored(
    client: AsyncClient, upload_dir: Path
) -> None:
    _user_id, lecture_id, file_id = await _formula_lecture(client)
    before = _files_on_disk(upload_dir)
    generator = RecordingGenerator()
    _use(generator)

    assert (await _start(client, lecture_id)).status_code == 202
    await _finish_jobs()

    assert [(page.page_no, page.needs_image) for page in generator.pages] == [(1, True), (2, False)]
    assert generator.pages[0].image is not None and generator.pages[0].image.startswith(PNG_MAGIC)
    assert generator.pages[1].image is None
    # No new file in UPLOAD_DIR, and no column in the database can hold image data.
    assert _files_on_disk(upload_dir) == before
    assert not [
        f"{table.name}.{column.name}"
        for table in Base.metadata.tables.values()
        for column in table.columns
        if isinstance(column.type, LargeBinary)
    ]


async def test_fr40_at_most_20_page_images(
    client: AsyncClient, caplog: pytest.LogCaptureFixture
) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    document = pymupdf.open()
    for _ in range(service.MAX_PAGE_IMAGES + 2):
        document.insert_pdf(pymupdf.open(stream=build_formula_pdf(), filetype="pdf"), from_page=0, to_page=0)
    data = document.tobytes()
    document.close()
    assert (await _upload(client, lecture_id, data)).status_code == 201
    generator = RecordingGenerator()
    _use(generator)

    with caplog.at_level(logging.WARNING):
        assert (await _start(client, lecture_id)).status_code == 202
        await _finish_jobs()

    assert service.MAX_PAGE_IMAGES == 20
    assert all(page.needs_image for page in generator.pages)
    assert [page.image is not None for page in generator.pages] == [True] * 20 + [False] * 2
    warnings = [record.getMessage() for record in caplog.records if record.levelno == logging.WARNING]
    assert "Too many pages need an image: sending 20, left out 2" in warnings
    assert not any("Elastisitet" in message for message in caplog.messages)


async def test_fr40_missing_pdf_sends_page_without_image_and_still_flags(
    client: AsyncClient, upload_dir: Path, caplog: pytest.LogCaptureFixture
) -> None:
    user_id, lecture_id, file_id = await _formula_lecture(client)
    (upload_dir / user_id / f"{file_id}.pdf").unlink()
    generator = RecordingGenerator(lambda pages: [_card(file_id, 1, "Hva er elastisitet?")])
    _use(generator)

    with caplog.at_level(logging.WARNING):
        assert (await _start(client, lecture_id)).status_code == 202
        await _finish_jobs()

    assert generator.pages[0].needs_image is True
    assert generator.pages[0].image is None
    assert any(file_id in message for message in caplog.messages)
    cards = (await client.get(f"{LECTURES}/{lecture_id}/flashcards")).json()
    assert [card["formula_flag"] for card in cards] == [True]


async def test_fr40_render_failure_sends_page_without_image_and_still_flags(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    _user_id, lecture_id, file_id = await _formula_lecture(client)

    def broken(_data: bytes, _page_nos: list[int]) -> dict[int, bytes]:
        raise RuntimeError("cannot render")

    monkeypatch.setattr(files_service, "render_pages_png", broken)
    generator = RecordingGenerator(lambda pages: [_card(file_id, 1, "Hva er elastisitet?")])
    _use(generator)

    assert (await _start(client, lecture_id)).status_code == 202
    await _finish_jobs()

    assert [job["status"] for job in await _latest(client, lecture_id)] == ["done"]
    assert (generator.pages[0].needs_image, generator.pages[0].image) == (True, None)
    cards = (await client.get(f"{LECTURES}/{lecture_id}/flashcards")).json()
    assert [card["formula_flag"] for card in cards] == [True]


async def test_fr40_page_images_stay_within_the_byte_limit(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    pages = [Page(FILE_ID, number, "tekst", needs_image=True) for number in (1, 2, 3)]
    big = service.MAX_PAGE_IMAGE_BYTES // 2 + 1

    async def fake_page_images(_owner: uuid.UUID, wanted: list[tuple[uuid.UUID, int]]) -> dict:
        return {key: b"x" * big for key in wanted}

    monkeypatch.setattr(service, "page_images", fake_page_images)
    with caplog.at_level(logging.WARNING):
        result = await service._with_page_images(uuid.uuid4(), pages)

    assert [page.image is not None for page in result] == [True, False, False]
    assert all(page.needs_image for page in result)
    assert "Page images over the size limit: sending 1, left out 2" in caplog.messages


# --- formula_flag (FR-41) --------------------------------------------------------------


@pytest.mark.parametrize(
    ("needs_image", "formula_missing", "expected"),
    [(False, None, False), (False, False, False), (False, True, True), (True, None, True), (True, False, True), (True, True, True)],
)
def test_fr41_formula_flag_is_needs_image_or_model_report(
    needs_image: bool, formula_missing: bool | None, expected: bool
) -> None:
    item = LooseFlashcard(formula_missing=formula_missing)
    assert service.formula_flag(needs_image, item) is expected


@pytest.mark.parametrize("loose_model", [LooseFlashcard, LooseQuizQuestion])
@pytest.mark.parametrize(("value", "expected"), [(None, None), (True, True), (False, False), ("ja", True), (1, True), ([], True)])
def test_fr41_odd_formula_missing_value_counts_as_true(loose_model: Any, value: Any, expected: bool | None) -> None:
    assert loose_model.model_validate({"formula_missing": value}).formula_missing is expected


def test_fr41_odd_formula_missing_value_never_discards_the_item() -> None:
    pages = [Page(FILE_ID, 1, "tekst")]
    card = validate_flashcard(_card(str(FILE_ID), 1, "Spørsmål", formula_missing="ja"), pages)
    assert card is not None and card.formula_missing is True


async def test_fr41_flag_set_when_model_reports_missing(client: AsyncClient) -> None:
    _user_id, lecture_id, file_id = await _formula_lecture(client)
    _use(
        RecordingGenerator(
            lambda pages: [
                _card(file_id, 2, "Meldt mangel", formula_missing=True),
                _card(file_id, 2, "Rar verdi", formula_missing="ja"),
                _card(file_id, 2, "Ingen mangel", formula_missing=False),
                _card(file_id, 2, "Uten feltet"),
            ]
        )
    )
    assert (await _start(client, lecture_id)).status_code == 202
    await _finish_jobs()

    cards = (await client.get(f"{LECTURES}/{lecture_id}/flashcards")).json()
    assert {card["front"]: card["formula_flag"] for card in cards} == {
        "Meldt mangel": True,
        "Rar verdi": True,
        "Ingen mangel": False,
        "Uten feltet": False,
    }


@pytest.mark.parametrize("generator", [MockGenerator(), InvalidMockGenerator()])
@pytest.mark.parametrize("kind", ["flashcards", "quiz"])
async def test_fr41_mock_never_sets_formula_missing(generator: Any, kind: str) -> None:
    text = PAGE_1_TEXT + " Tilbud er mengden som selges. Likevekt er der tilbud og etterspørsel møtes."
    items = await generator.generate(kind, [Page(FILE_ID, 1, text)], GenerationOptions(requested=20))
    assert items
    assert all("formula_missing" not in item for item in items)


async def test_fr41_flag_in_api_for_flashcards_in_demo_mode(client: AsyncClient) -> None:
    _user_id, lecture_id, _file_id = await _formula_lecture(client)
    assert (await _start(client, lecture_id)).status_code == 202
    await _finish_jobs()

    cards = (await client.get(f"{LECTURES}/{lecture_id}/flashcards")).json()
    assert [(card["source"]["page_no"], card["formula_flag"]) for card in cards] == [
        (1, True),
        (1, True),
        (2, False),
        (2, False),
    ]


async def test_fr41_flag_in_api_for_quiz_in_demo_mode(client: AsyncClient) -> None:
    _user_id, lecture_id, _file_id = await _formula_lecture(client)
    assert (await _start_quiz(client, lecture_id)).status_code == 202
    await _finish_jobs()

    questions = (await client.get(f"{LECTURES}/{lecture_id}/quiz-questions")).json()
    assert [(question["source"]["page_no"], question["formula_flag"]) for question in questions] == [
        (1, True),
        (1, True),
        (2, False),
        (2, False),
    ]


async def test_fr41_flag_in_subject_endpoints_for_both_types(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    lecture_id = (await _create_lecture(client, subject_id)).json()["id"]
    assert (await _upload(client, lecture_id, build_formula_pdf(), "formler.pdf")).status_code == 201
    assert (await _start(client, lecture_id)).status_code == 202
    await _finish_jobs()
    assert (await _start_quiz(client, lecture_id)).status_code == 202
    await _finish_jobs()

    for path in ("flashcards", "quiz-questions"):
        response = await client.get(f"/api/subjects/{subject_id}/{path}")
        assert response.status_code == 200
        assert [(item["source"]["page_no"], item["formula_flag"]) for item in response.json()] == [
            (1, True),
            (1, True),
            (2, False),
            (2, False),
        ]


# --- The Vertex request (FR-40) -------------------------------------------------------


def test_fr40_vertex_message_has_image_right_after_its_page_text() -> None:
    image = PNG_MAGIC + b"bilde"
    pages = [
        Page(FILE_ID, 1, "Tekst på side 1", "formler.pdf", needs_image=True, image=image),
        Page(FILE_ID, 2, "Tekst på side 2", "formler.pdf"),
    ]
    message = user_message(pages, GenerationOptions(requested=10))

    assert isinstance(message, list)
    assert len(message) == 3
    first, picture, rest = message
    assert isinstance(first, str) and first.endswith("Tekst på side 1")
    assert "page_no: 1, sidebilde: følger etter teksten ---" in first
    assert isinstance(picture, BinaryContent)
    assert picture.media_type == "image/png" and picture.data == image
    assert isinstance(rest, str) and "page_no: 2 ---" in rest and "sidebilde" not in rest


def test_fr40_vertex_message_without_images_is_a_string() -> None:
    pages = [Page(FILE_ID, 1, "Tekst", "notater.pdf", needs_image=True)]
    message = user_message(pages, GenerationOptions(requested=10))
    assert isinstance(message, str)
    assert "sidebilde" not in message


async def test_fr40_vertex_sends_binary_content_to_the_model() -> None:
    seen: list[Any] = []

    def answer(messages: list[ModelMessage], _info: AgentInfo) -> ModelResponse:
        for message in messages:
            for part in message.parts:
                if isinstance(part, UserPromptPart):
                    seen.append(part.content)
        return _answer([])

    pages = [Page(FILE_ID, 1, "Tekst", "formler.pdf", needs_image=True, image=PNG_MAGIC + b"x")]
    await VertexGenerator(FunctionModel(answer)).generate("flashcards", pages, GenerationOptions(requested=10))
    assert len(seen) == 1
    assert any(isinstance(item, BinaryContent) and item.media_type == "image/png" for item in seen[0])


@pytest.mark.parametrize("kind", ["flashcards", "quiz"])
def test_fr41_output_schema_has_formula_missing(kind: str) -> None:
    schema = output_wrapper(kind).model_json_schema()
    assert "formula_missing" in str(schema)


def test_fr41_instructions_tell_the_model_about_page_images_and_formula_missing() -> None:
    for name in ("flashcards.md", "quiz.md"):
        text = (Path(service.__file__).parent / "instructions" / name).read_text(encoding="utf-8")
        assert "sidebilde: følger etter teksten" in text
        assert "`formula_missing`" in text
