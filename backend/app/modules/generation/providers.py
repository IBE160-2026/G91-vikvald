"""Chooses the generator from LLM_PROVIDER (AR-3).

mock (the default) -> MockGenerator, mock-invalid -> InvalidMockGenerator.
Anything else, also vertex, is not supported yet and stops the startup
(main.py's lifespan). VertexGenerator comes in epic 6.
"""

from app.core.config import get_settings
from app.modules.generation.mock import InvalidMockGenerator, MockGenerator
from app.modules.generation.port import Generator

UNSUPPORTED_MESSAGE = (
    "LLM_PROVIDER=vertex is not supported yet (Vertex AI arrives in epic 6). "
    "Use mock or mock-invalid."
)


class UnsupportedProviderError(RuntimeError):
    pass


def select_generator(provider: str) -> Generator:
    if provider == "mock":
        return MockGenerator()
    if provider == "mock-invalid":
        return InvalidMockGenerator()
    raise UnsupportedProviderError(UNSUPPORTED_MESSAGE)


def get_generator() -> Generator:
    """FastAPI dependency: the generator for the current settings. Tests override it."""
    return select_generator(get_settings().LLM_PROVIDER)
