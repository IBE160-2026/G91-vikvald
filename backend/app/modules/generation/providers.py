"""Chooses the generator from LLM_PROVIDER (AR-3).

mock (the default) -> MockGenerator, mock-invalid -> InvalidMockGenerator,
vertex -> VertexGenerator (Gemini on Vertex AI in the EU). vertex needs
GOOGLE_CLOUD_PROJECT and VERTEX_MODEL; if one is missing, the startup stops
(main.py's lifespan logs the error as one CRITICAL line).
"""

from functools import lru_cache

from app.core.config import Settings, get_settings
from app.modules.generation.mock import InvalidMockGenerator, MockGenerator
from app.modules.generation.port import Generator

# The settings LLM_PROVIDER=vertex cannot run without, in the order they are checked.
VERTEX_REQUIRED_SETTINGS = ("GOOGLE_CLOUD_PROJECT", "VERTEX_MODEL")


class UnsupportedProviderError(RuntimeError):
    pass


class MissingProviderSettingError(UnsupportedProviderError):
    """A setting the chosen provider needs is not set. The message names the
    setting, never a value."""

    def __init__(self, name: str) -> None:
        self.setting = name
        super().__init__(
            f"LLM_PROVIDER=vertex needs {name}. Set it in .env (see README, "
            "«Bruk Gemini (Vertex AI)»), or use LLM_PROVIDER=mock."
        )


def select_generator(provider: str, settings: Settings | None = None) -> Generator:
    if provider == "mock":
        return MockGenerator()
    if provider == "mock-invalid":
        return InvalidMockGenerator()
    if provider == "vertex":
        settings = settings or get_settings()
        for name in VERTEX_REQUIRED_SETTINGS:
            if not getattr(settings, name):
                raise MissingProviderSettingError(name)
        return _vertex_generator(
            settings.GOOGLE_CLOUD_PROJECT, settings.VERTEX_MODEL, settings.VERTEX_THINKING
        )
    raise UnsupportedProviderError(f"LLM_PROVIDER={provider} is not supported. Use mock, mock-invalid or vertex.")


@lru_cache
def _vertex_generator(project: str, model_name: str, thinking: str) -> Generator:
    """One generator (and one HTTP client) per combination of settings."""
    # Imported here, so demo mode never loads pydantic-ai.
    from app.modules.generation.vertex import build_vertex_generator

    return build_vertex_generator(project, model_name, thinking)


def get_generator() -> Generator:
    """FastAPI dependency: the generator for the current settings. Tests override it."""
    return select_generator(get_settings().LLM_PROVIDER)
