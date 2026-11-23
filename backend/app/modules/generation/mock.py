"""The mock models (NFR-2, NFR-2a): content from fixed rules, with no key and
no internet. The demo content is simple and mechanical on purpose."""

from typing import Any

from app.modules.generation.port import GenerationOptions, Page
from app.modules.generation.registry import get_content_type


class MockGenerator:
    """Runs the content type's mock rule. Never reads the instructions file."""

    async def generate(
        self, kind: str, pages: list[Page], options: GenerationOptions
    ) -> list[dict[str, Any]]:
        return get_content_type(kind).mock_rule(pages, options)


class InvalidMockGenerator:
    """The mock list with three of every four items broken in a fixed way
    (SK-4), to show that the validation throws bad items away. How an item is
    broken belongs to its content type (ContentType.break_item); index % 4 == 0
    stays valid."""

    async def generate(
        self, kind: str, pages: list[Page], options: GenerationOptions
    ) -> list[dict[str, Any]]:
        items = await MockGenerator().generate(kind, pages, options)
        break_item = get_content_type(kind).break_item
        return [break_item(dict(item), index) for index, item in enumerate(items)]
