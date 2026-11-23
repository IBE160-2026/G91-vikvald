"""VertexGenerator: Gemini on Vertex AI in the EU behind the generation port
(AR-3, AR-4, AR-11, NFR-4, NFR-5).

No test calls Vertex AI: conftest.py sets ALLOW_MODEL_REQUESTS = False, and the
answers come from pydantic-ai's FunctionModel instead."""

import asyncio
import json
import logging
import re
import uuid
from pathlib import Path
from typing import Any

import pytest
from httpx import AsyncClient
from pydantic_ai.messages import ModelMessage, ModelResponse, TextPart
from pydantic_ai.models.function import AgentInfo, FunctionModel
from pydantic_ai.models.test import TestModel
from pydantic_ai.profiles import ModelProfile
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.config import get_settings
from app.main import app, lifespan
from app.modules.generation import service
from app.modules.generation.port import GenerationOptions, Page
from app.modules.generation.providers import (
    MissingProviderSettingError,
    get_generator,
    select_generator,
)
from app.modules.generation.vertex import VERTEX_LOCATION, VertexGenerator, build_vertex_model
from tests.test_jobs import FIXTURE, _cards, _finish_jobs, _latest, _start, no_jobs_left  # noqa: F401
from tests.test_files import _log_in_new_user, _new_lecture, _upload

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent
PROJECT = "test-project-123"
MODEL = "gemini-test-model"
_PAGE_LABEL = re.compile(r"file_id: ([0-9a-f-]{36}), page_no: (\d+)")


def _vertex_env(
    monkeypatch: pytest.MonkeyPatch,
    project: str | None = PROJECT,
    model: str | None = MODEL,
    thinking: str | None = None,
) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "vertex")
    for name, value in (("GOOGLE_CLOUD_PROJECT", project), ("VERTEX_MODEL", model), ("VERTEX_THINKING", thinking)):
        if value is None:
            monkeypatch.delenv(name, raising=False)
        else:
            monkeypatch.setenv(name, value)
    get_settings.cache_clear()


def _prompt_text(messages: list[ModelMessage]) -> str:
    return "\n".join(
        str(part.content) for message in messages for part in message.parts if hasattr(part, "content")
    )


def _answer(items: list[Any]) -> ModelResponse:
    return ModelResponse(parts=[TextPart(json.dumps({"items": items}))])


@pytest.fixture
async def lecture(client: AsyncClient) -> str:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    assert (await _upload(client, lecture_id, FIXTURE.read_bytes(), "definisjoner.pdf")).status_code == 201
    return lecture_id


# --- EU location and settings --------------------------------------------------------


def test_ar3_vertex_uses_eu_location() -> None:
    model = build_vertex_model(PROJECT, MODEL)
    api_client = model.client._api_client  # type: ignore[attr-defined]
    assert VERTEX_LOCATION == "eu"
    assert api_client.location == "eu"
    assert api_client.vertexai is True
    assert "aiplatform.eu.rep.googleapis.com" in api_client._http_options.base_url
    assert "global" not in api_client._http_options.base_url
    assert api_client.location != "global"


def test_ar3_vertex_location_is_never_read_from_the_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GOOGLE_CLOUD_LOCATION", "global")
    api_client = build_vertex_model(PROJECT, MODEL).client._api_client  # type: ignore[attr-defined]
    assert api_client.location == "eu"
    assert "global" not in api_client._http_options.base_url


def test_nfr4_vertex_model_and_thinking_come_from_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    _vertex_env(monkeypatch, thinking="high")
    generator = get_generator()
    assert isinstance(generator, VertexGenerator)
    assert generator.model.model_name == MODEL
    assert generator.model_settings == {"thinking": "high"}
    assert generator.model.client._api_client.project == PROJECT  # type: ignore[attr-defined]


def test_nfr4_vertex_thinking_defaults_to_low(monkeypatch: pytest.MonkeyPatch) -> None:
    _vertex_env(monkeypatch)
    generator = get_generator()
    assert isinstance(generator, VertexGenerator)
    assert generator.model_settings == {"thinking": "low"}


async def test_ar3_vertex_with_settings_starts_without_critical(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    _vertex_env(monkeypatch)
    with caplog.at_level(logging.INFO):
        async with lifespan(app):
            assert isinstance(get_generator(), VertexGenerator)
    assert not [record for record in caplog.records if record.levelno >= logging.CRITICAL]


@pytest.mark.parametrize(
    ("project", "model", "missing"),
    [(None, MODEL, "GOOGLE_CLOUD_PROJECT"), (PROJECT, None, "VERTEX_MODEL"), (None, None, "GOOGLE_CLOUD_PROJECT")],
)
async def test_ar11_vertex_missing_setting_stops_startup(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
    project: str | None,
    model: str | None,
    missing: str,
) -> None:
    _vertex_env(monkeypatch, project, model)
    with caplog.at_level(logging.CRITICAL), pytest.raises(MissingProviderSettingError):
        async with lifespan(app):
            pass
    critical = [record.getMessage() for record in caplog.records if record.levelno == logging.CRITICAL]
    assert len(critical) == 1
    assert critical[0].startswith(f"LLM_PROVIDER=vertex needs {missing}")
    for value in (PROJECT, MODEL):
        assert value not in critical[0]


def test_ar11_demo_mode_never_needs_vertex_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    _vertex_env(monkeypatch, None, None)
    monkeypatch.setenv("LLM_PROVIDER", "mock")
    get_settings.cache_clear()
    select_generator("mock")
    select_generator("mock-invalid")


async def test_nfr4_config_has_no_secrets(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _vertex_env(monkeypatch)
    response = await client.get("/api/config")
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"demo_mode", "feature_mnemonics", "feature_freetext", "feature_summary"}
    assert body["demo_mode"] is False
    assert PROJECT not in response.text
    assert MODEL not in response.text


def test_ar3_only_generation_imports_pydantic_ai() -> None:
    generation = BACKEND_DIR / "app" / "modules" / "generation"
    offenders = [
        str(path.relative_to(BACKEND_DIR))
        for path in (BACKEND_DIR / "app").rglob("*.py")
        if generation not in path.parents and "pydantic_ai" in path.read_text(encoding="utf-8")
    ]
    assert offenders == []


def test_nfr4_no_next_public_vertex_settings() -> None:
    for name in (".env.example", "docker-compose.yml"):
        assert "NEXT_PUBLIC_" not in (REPO_ROOT / name).read_text(encoding="utf-8"), name


def test_nfr4_env_example_has_vertex_placeholders() -> None:
    text = (REPO_ROOT / ".env.example").read_text(encoding="utf-8")
    assert re.search(r"^VERTEX_MODEL=gemini-3\.5-flash$", text, flags=re.MULTILINE)
    assert re.search(r"^GOOGLE_CLOUD_PROJECT=$", text, flags=re.MULTILINE)
    assert re.search(r"^VERTEX_THINKING=low$", text, flags=re.MULTILINE)


# --- Schema and instructions -----------------------------------------------------------


async def test_ar3_vertex_sends_loose_schema_instructions_and_pages() -> None:
    seen: dict[str, Any] = {}
    file_id = uuid.uuid4()

    def answer(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        seen["params"] = info.model_request_parameters
        seen["instructions"] = info.instructions
        seen["prompt"] = _prompt_text(messages)
        return _answer([])

    pages = [Page(file_id, 3, "Merkevare er et navn.")]
    options = GenerationOptions(requested=10, existing_keys=frozenset({"pris"}))
    assert await VertexGenerator(FunctionModel(answer)).generate("flashcards", pages, options) == []

    params = seen["params"]
    assert params.output_mode == "native"
    schema = params.output_object.json_schema
    item_schema = json.dumps(schema["properties"]["items"])
    for field in ("kind", "front", "back", "file_id", "page_no"):
        assert field in item_schema
    assert "flashcards" in seen["instructions"] and "bokmål" in seen["instructions"]
    assert f"file_id: {file_id}, page_no: 3" in seen["prompt"]
    assert "Merkevare er et navn." in seen["prompt"]
    assert "10" in seen["prompt"] and "pris" in seen["prompt"]


async def test_fr31_vertex_quiz_gets_the_difficulty_in_the_instructions() -> None:
    seen: dict[str, str] = {}

    def answer(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        seen["instructions"] = info.instructions or ""
        return _answer([])

    pages = [Page(uuid.uuid4(), 1, "Tekst.")]
    options = GenerationOptions(requested=10, difficulty="hard")
    await VertexGenerator(FunctionModel(answer)).generate("quiz", pages, options)
    assert "{difficulty}" not in seen["instructions"]
    assert "vanskelig" in seen["instructions"].lower()


async def test_ar3_vertex_returns_items_as_given_with_testmodel() -> None:
    item = {"kind": "qa", "front": "Hva?", "back": "Det.", "file_id": "bad", "page_no": 1}
    model = TestModel(
        custom_output_text=json.dumps({"items": [item, "en streng"]}),
        profile=ModelProfile(supports_json_schema_output=True),
    )
    generator = VertexGenerator(model)
    items = await generator.generate("flashcards", [Page(uuid.uuid4(), 1, "T.")], GenerationOptions(requested=5))
    assert items == [item, "en streng"]


# --- The pipeline after the call (AR-4) -------------------------------------------------


async def test_ar4_vertex_answer_goes_through_validation_and_is_saved(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    def answer(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        file_id, page_no = _PAGE_LABEL.search(_prompt_text(messages)).groups()  # type: ignore[union-attr]
        good = {"kind": "qa", "front": "Hva er en merkevare?", "back": "Et navn.", "file_id": file_id, "page_no": int(page_no)}
        return _answer([good, {**good, "file_id": "bad"}, "en streng", {**good, "front": "Hva er pris?"}])

    app.dependency_overrides[get_generator] = lambda: VertexGenerator(FunctionModel(answer))
    assert (await _start(client, lecture)).status_code == 202
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["created"], job["discarded"]) == ("done", 2, 2)
    assert [card.front for card in await _cards(engine)] == ["Hva er en merkevare?", "Hva er pris?"]


async def test_fr21_vertex_failure_gives_generation_failed_without_note_text_in_log(
    client: AsyncClient, lecture: str, engine: AsyncEngine, caplog: pytest.LogCaptureFixture
) -> None:
    def answer(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        raise RuntimeError(_prompt_text(messages))

    app.dependency_overrides[get_generator] = lambda: VertexGenerator(FunctionModel(answer))
    with caplog.at_level(logging.DEBUG):
        assert (await _start(client, lecture)).status_code == 202
        await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["error_code"], job["created"]) == ("failed", "GENERATION_FAILED", None)
    assert await _cards(engine) == []
    assert job["id"] in caplog.text
    assert "RuntimeError" in caplog.text
    assert "Merkevare" not in caplog.text


async def test_ar3_real_vertex_call_is_blocked_in_tests(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    # The real GoogleModel: ALLOW_MODEL_REQUESTS = False stops it before any
    # network call, and the job fails the normal way.
    app.dependency_overrides[get_generator] = lambda: VertexGenerator(build_vertex_model(PROJECT, MODEL))
    await _start(client, lecture)
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["error_code"]) == ("failed", "GENERATION_FAILED")
    assert await _cards(engine) == []


async def test_fr21_vertex_timeout_gives_generation_timeout(
    client: AsyncClient, lecture: str, engine: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(service, "GENERATION_TIMEOUT_SECONDS", 0.05)

    async def answer(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        await asyncio.sleep(5)
        return _answer([])

    app.dependency_overrides[get_generator] = lambda: VertexGenerator(FunctionModel(answer))
    await _start(client, lecture)
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["error_code"]) == ("failed", "GENERATION_TIMEOUT")
    assert await _cards(engine) == []
