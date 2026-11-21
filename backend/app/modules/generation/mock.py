"""The mock models (NFR-2, NFR-2a): content from fixed rules, with no key and
no internet. The demo content is simple and mechanical on purpose."""

from typing import Any

from app.modules.generation.port import GenerationOptions, Page
from app.modules.generation.registry import get_content_type


class MockGenerator:
    """Runs the content type's mock rule. Never reads the prompt file."""

    async def generate(
        self, kind: str, pages: list[Page], options: GenerationOptions
    ) -> list[dict[str, Any]]:
        return get_content_type(kind).mock_rule(pages, options)


class InvalidMockGenerator:
    """The mock list with three of every four items broken in a fixed way
    (SK-4), to show that the validation throws bad items away:
    index % 4 == 1 gets an empty front, == 2 a page that does not exist,
    == 3 an unknown kind. Index % 4 == 0 stays valid."""

    async def generate(
        self, kind: str, pages: list[Page], options: GenerationOptions
    ) -> list[dict[str, Any]]:
        items = await MockGenerator().generate(kind, pages, options)
        broken: list[dict[str, Any]] = []
        for index, item in enumerate(items):
            item = dict(item)
            match index % 4:
                case 1:
                    item["front"] = ""
                case 2:
                    item["page_no"] = 9999
                case 3:
                    item["kind"] = "unknown"
            broken.append(item)
        return broken
