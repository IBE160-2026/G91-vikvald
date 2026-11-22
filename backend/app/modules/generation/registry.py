"""The registry of content types the pipeline can make (AR-5).

A content type registers its kind, its mock rule, its loose model, its
validation, how existing content is found and how valid items are saved
(through the content module), and its prompt file. The pipeline only knows this
registry, so a new type (quiz, model cards, ...) needs no change to the pipeline.
A type that has a difficulty (quiz) says so with uses_difficulty.
"""

import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.generation.port import GenerationOptions, Page

# The mock model's rule: pages and options in, a loose list out (no model call).
MockRule = Callable[[list[Page], GenerationOptions], list[dict[str, Any]]]
# One item from the port and the pages it may come from -> the valid item, or
# None to discard it.
ValidateItem = Callable[[Any, list[Page]], BaseModel | None]
# The keys of what the lecture already has (compared in lower case).
ExistingKeys = Callable[[AsyncSession, uuid.UUID], Awaitable[frozenset[str]]]
# Adds the valid items to the session; the pipeline commits.
Save = Callable[[AsyncSession, list[Any]], Awaitable[None]]
# How LLM_PROVIDER=mock-invalid breaks item number `index` of the mock list
# (SK-4): index % 4 == 0 stays valid, the others are broken so validate_item
# throws them away.
BreakItem = Callable[[dict[str, Any], int], dict[str, Any]]


@dataclass(frozen=True)
class ContentType:
    kind: str
    mock_rule: MockRule
    loose_model: type[BaseModel]
    validate_item: ValidateItem
    existing_keys: ExistingKeys
    save: Save
    # The instructions for a real model (epic 6). The mock models never read it.
    prompt_file: Path
    break_item: BreakItem
    # Whether a job takes params.difficulty (quiz). For the other types a
    # difficulty in the request is a validation error.
    uses_difficulty: bool = False


_types: dict[str, ContentType] = {}


def register_content_type(content_type: ContentType) -> None:
    """Add a content type. The same kind twice is a programming error."""
    if content_type.kind in _types:
        raise ValueError(f"Content type already registered: {content_type.kind}")
    _types[content_type.kind] = content_type


def get_content_type(kind: str) -> ContentType:
    """The registered type, or KeyError for an unknown kind."""
    _ensure_builtin_types()
    return _types[kind]


def is_registered(kind: str) -> bool:
    _ensure_builtin_types()
    return kind in _types


def _ensure_builtin_types() -> None:
    # Importing a type's module registers it. Done here (not at the top) so the
    # type modules can import this one.
    from app.modules.generation import flashcards, quiz  # noqa: F401
