"""The real language model (AR-3, NFR-5): Gemini on Vertex AI in the EU.

VertexGenerator answers through the same port as the mock models. It sends the
content type's instructions (prompt_file) and the lecture's pages to Gemini and
asks for structured output (NativeOutput, Gemini's own responseSchema) with the
type's *loose* schema. The pipeline in service.py then validates, discards and
saves every item exactly as in demo mode.

This is the only module in the app that imports pydantic_ai, so the rest of the
app never depends on a model library.
"""

import json
from typing import Annotated, Any

import pydantic_ai
from pydantic import BaseModel, WithJsonSchema, create_model
from pydantic_ai import Agent, NativeOutput
from pydantic_ai.models import Model
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google_cloud import GoogleCloudProvider
from pydantic_ai.settings import ModelSettings

from app.modules.generation.port import GenerationOptions, Page
from app.modules.generation.quiz import DIFFICULTIES
from app.modules.generation.registry import get_content_type

# Always the EU multi-region (NFR-5): requests go to
# aiplatform.eu.rep.googleapis.com and are processed in the EU. A fixed value on
# purpose, never read from the environment, and never "global".
VERTEX_LOCATION = "eu"

# pydantic-ai may print a first-run banner to the terminal; the backend owns its output.
pydantic_ai.BANNER_ENABLED = False


def build_vertex_model(project: str, model_name: str) -> GoogleModel:
    """Gemini on Vertex AI in the EU. Signs in with Application Default
    Credentials (no key file); they are only read when a request is made."""
    provider = GoogleCloudProvider(project=project, location=VERTEX_LOCATION)
    return GoogleModel(model_name, provider=provider)


def instructions_for(kind: str, options: GenerationOptions) -> str:
    """The content type's instructions. «{difficulty}» becomes the chosen
    difficulty's description (e.g. «Vanskelig: bruke stoffet på et eksempel»).
    Story 6.2 settles the final instructions."""
    text = get_content_type(kind).prompt_file.read_text(encoding="utf-8")
    if options.difficulty is not None:
        text = text.replace("{difficulty}", DIFFICULTIES[options.difficulty])
    return text


def user_message(pages: list[Page], options: GenerationOptions) -> str:
    """The request: how many items at most, the keys that already exist, and
    every page labelled with file_id and page_no."""
    existing = sorted(options.existing_keys)
    parts = [
        f"Lag høyst {options.requested}.",
        "Eksisterende: " + (json.dumps(existing, ensure_ascii=False) if existing else "ingen"),
        "",
        "Sidene:",
    ]
    for page in pages:
        parts.append(f"--- file_id: {page.file_id}, page_no: {page.page_no} ---")
        parts.append(page.text)
    return "\n".join(parts)


def output_wrapper(kind: str) -> type[BaseModel]:
    """{"items": [...]} where Gemini gets the loose model's JSON schema for each
    item, but pydantic-ai accepts any value there. One item with a wrong type
    then does not make the whole answer invalid: validate_item discards and
    counts it, as in demo mode."""
    schema = get_content_type(kind).loose_model.model_json_schema()
    item = Annotated[Any, WithJsonSchema(schema)]
    return create_model(f"{kind}_items", items=(list[item], ...))  # type: ignore[valid-type]


class VertexGenerator:
    """The port on top of a pydantic-ai model (GoogleModel in the app, a
    FunctionModel or TestModel in the tests)."""

    def __init__(self, model: Model, model_settings: ModelSettings | None = None) -> None:
        self.model = model
        self.model_settings = model_settings

    async def generate(
        self, kind: str, pages: list[Page], options: GenerationOptions
    ) -> list[dict[str, Any]]:
        agent = Agent(
            self.model,
            output_type=NativeOutput(output_wrapper(kind)),
            instructions=instructions_for(kind, options),
            model_settings=self.model_settings,
        )
        result = await agent.run(user_message(pages, options))
        return list(result.output.items)  # type: ignore[attr-defined]


def build_vertex_generator(project: str, model_name: str, thinking: str) -> VertexGenerator:
    """The generator the app uses with LLM_PROVIDER=vertex."""
    return VertexGenerator(
        build_vertex_model(project, model_name),
        ModelSettings(thinking=thinking),
    )
