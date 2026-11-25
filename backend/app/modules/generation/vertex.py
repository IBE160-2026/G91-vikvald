"""The real language model (AR-3, NFR-5): Gemini on Vertex AI in the EU.

VertexGenerator answers through the same port as the mock models. It sends the
content type's instructions (instructions_file) and the lecture's pages to
Gemini and asks for structured output (NativeOutput, Gemini's own responseSchema) with the
type's *loose* schema. The pipeline in service.py then validates, discards and
saves every item exactly as in demo mode.

Only the generation module imports pydantic_ai (and of it, only this file), so
the rest of the app never depends on a model library.
"""

import json
import logging
from typing import Annotated, Any

import pydantic_ai
from pydantic import BaseModel, WithJsonSchema, create_model
from pydantic_ai import Agent, BinaryContent, NativeOutput
from pydantic_ai.models import Model
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google_cloud import GoogleCloudProvider
from pydantic_ai.settings import ModelSettings

from app.modules.generation.freetext import QUESTION_KINDS
from app.modules.generation.port import GenerationOptions, Page
from app.modules.generation.quiz import DIFFICULTIES
from app.modules.generation.registry import get_content_type

# Always the EU multi-region (NFR-5): requests go to
# aiplatform.eu.rep.googleapis.com and are processed in the EU. A fixed value on
# purpose, never read from the environment, and never "global".
VERTEX_LOCATION = "eu"

# The most page text sent in one request (issue #271): 400 000 characters is
# about 100 000 tokens, more than eight full 50-page PDFs of notes. Well inside
# Gemini's context window, and keeps a run inside the 3-minute time limit.
MAX_REQUEST_PAGE_CHARS = 400_000

logger = logging.getLogger(__name__)

# pydantic-ai may print a first-run banner to the terminal; the backend owns its output.
pydantic_ai.BANNER_ENABLED = False

# The HTTP clients log every request URL at INFO, and a Vertex URL holds the
# project ID. Set here as well as in logging.json, so it also holds when the
# backend runs without that file (e.g. `uvicorn --reload`).
for _name in ("httpx", "httpcore", "google_genai"):
    logging.getLogger(_name).setLevel(logging.WARNING)


def build_vertex_model(project: str, model_name: str) -> GoogleModel:
    """Gemini on Vertex AI in the EU. Signs in with Application Default
    Credentials (no key file); they are only read when a request is made."""
    provider = GoogleCloudProvider(project=project, location=VERTEX_LOCATION)
    return GoogleModel(model_name, provider=provider)


def instructions_for(kind: str, options: GenerationOptions) -> str:
    """The content type's instructions file (instructions/<kind>.md), the one
    place where «{difficulty}» becomes the chosen difficulty's description
    (e.g. «Vanskelig: bruke stoffet på et eksempel») and «{question_kind}» the
    chosen question type's (e.g. «Langsvar: forklar sammenhenger eller gi et
    eksempel»). Without a value the placeholder is left as it is (the app
    always sets one for quiz and free text)."""
    text = get_content_type(kind).instructions_file.read_text(encoding="utf-8")
    if options.difficulty is not None:
        text = text.replace("{difficulty}", DIFFICULTIES[options.difficulty])
    if options.question_kind is not None:
        text = text.replace("{question_kind}", QUESTION_KINDS[options.question_kind])
    return text


def pages_within_limit(pages: list[Page]) -> list[Page]:
    """The pages to send, in their fixed order, until the page text would pass
    MAX_REQUEST_PAGE_CHARS. Whole pages only, never half a page, and always at
    least the first page. Left-out pages are logged as counts only, never text."""
    budget = MAX_REQUEST_PAGE_CHARS
    sent: list[Page] = []
    for page in pages:
        if sent and len(page.text) > budget:
            break
        sent.append(page)
        budget -= len(page.text)
    if len(sent) < len(pages):
        logger.warning(
            "Request page text over the limit: sent %d pages, left out %d", len(sent), len(pages) - len(sent)
        )
    return sent


def user_message(pages: list[Page], options: GenerationOptions) -> str | list[str | BinaryContent]:
    """The request: how many items at most, the keys that already exist, and
    the pages within the limit, each labelled with file_id, file name and
    page_no, which the model is asked to cite.

    A page with an image (FR-40) says so in its label, and its PNG comes right
    after its text, so the message becomes a list: text, image, text, ...
    Without any image it stays one plain string."""
    existing = sorted(options.existing_keys)
    lines = [
        f"Lag høyst {options.requested} elementer.",
        "Disse finnes fra før og skal ikke lages på nytt: "
        + (json.dumps(existing, ensure_ascii=False) if existing else "ingen"),
        "",
        "Hver side begynner med et sidemerke. Oppgi kilden til hvert element med "
        "file_id og page_no nøyaktig som i sidemerket til siden det bygger på.",
        "",
        "Sidene:",
    ]
    parts: list[str | BinaryContent] = []
    for page in pages_within_limit(pages):
        # The file name is the student's own text: quoted as JSON, so a name with
        # commas or «page_no:» in it cannot be read as another label field.
        name = json.dumps(page.file_name, ensure_ascii=False)
        note = ", sidebilde: følger etter teksten" if page.image is not None else ""
        lines.append(f"--- file_id: {page.file_id}, filnavn: {name}, page_no: {page.page_no}{note} ---")
        lines.append(page.text)
        if page.image is not None:
            parts.append("\n".join(lines))
            parts.append(BinaryContent(data=page.image, media_type="image/png"))
            lines = []
    if not parts:
        return "\n".join(lines)
    if lines:
        parts.append("\n".join(lines))
    return parts


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
