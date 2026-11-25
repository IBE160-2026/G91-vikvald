"""The registry of content types the pipeline can make (AR-5).

A content type registers its kind, its mock rule, its loose model, its
validation, how existing content is found and how valid items are saved
(through the content module), and its instructions file for the real model.
The pipeline only knows this registry, so a new type (quiz, model cards, ...)
needs no change to the pipeline.
A type that has a difficulty (quiz) says so with uses_difficulty, a type with
a question type (free text) with uses_question_kind, the scopes a job may ask
for with scopes and default_requested, and a type behind a feature switch
(FEATURE_*) says so with feature.
"""

import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.features import Feature
from app.modules.generation.port import GenerationOptions, Page

# The mock model's rule: pages and options in, a loose list out (no model call).
MockRule = Callable[[list[Page], GenerationOptions], list[dict[str, Any]]]
# One item from the port and the pages it may come from -> the valid item, or
# None to discard it.
ValidateItem = Callable[[Any, list[Page]], BaseModel | None]
# The keys of what the lecture already has (compared in lower case).
ExistingKeys = Callable[[AsyncSession, uuid.UUID], Awaitable[frozenset[str]]]


@dataclass(frozen=True)
class ValidItem:
    """A valid item and its formula flag, worked out once by the pipeline for
    every content type (FR-41)."""

    item: Any
    formula_flag: bool


# Adds the valid items to the session; the pipeline commits. The job's options
# come along, so a type can store what the student chose (free text stores
# options.question_kind); the other types ignore them.
Save = Callable[[AsyncSession, list[ValidItem], GenerationOptions], Awaitable[None]]
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
    # The instructions for the real model (instructions/<kind>.md), read by
    # VertexGenerator. The mock models never read it.
    instructions_file: Path
    break_item: BreakItem
    # Whether a job takes params.difficulty (quiz). For the other types a
    # difficulty in the request is a validation error.
    uses_difficulty: bool = False
    # Whether a job takes params.question_kind (free text: "short" or "long").
    # For the other types a question_kind in the request is a validation error.
    uses_question_kind: bool = False
    # The values params.requested may have («Rask», «Vanlig», «Dyp») and the
    # one used when it is left out. The one place that decides what is valid.
    scopes: tuple[int, ...] = (10, 20, 30)
    default_requested: int = 20
    # The feature switch the type belongs to (e.g. "summary" for FEATURE_SUMMARY),
    # or None for the must-have types (flashcards, quiz), which are always on.
    feature: Feature | None = None


_types: dict[str, ContentType] = {}


def register_content_type(content_type: ContentType) -> None:
    """Add a content type. The same kind twice is a programming error."""
    if content_type.kind in _types:
        raise ValueError(f"Content type already registered: {content_type.kind}")
    _types[content_type.kind] = content_type


def unregister_content_type(kind: str) -> None:
    """Remove a type (used by tests that register a type of their own)."""
    _types.pop(kind, None)


def enabled_content_types(settings: Settings | None = None) -> list[ContentType]:
    """Every registered type without the types whose feature switch is off:
    the must-have types first, then the others, the built-in types in a fixed
    order (_BUILTIN_ORDER) and any other type after them in registration
    order, so the order does not depend on which module was imported first.
    The seed makes content of exactly these (AR-14)."""
    _ensure_builtin_types()
    settings = settings or get_settings()
    enabled = [
        content_type
        for content_type in _types.values()
        if content_type.feature is None or getattr(settings, f"FEATURE_{content_type.feature.upper()}")
    ]
    return sorted(enabled, key=_order)


# The built-in types in a fixed order: the must-have types, then the types
# behind a switch in the order they were built. A module may import a type
# module early (vertex.py imports freetext), so registration order alone is
# not fixed. Other types (tests) come after, in registration order.
_BUILTIN_ORDER = ("flashcards", "quiz", "models", "freetext")


def _order(content_type: ContentType) -> tuple[bool, int]:
    position = _BUILTIN_ORDER.index(content_type.kind) if content_type.kind in _BUILTIN_ORDER else len(_BUILTIN_ORDER)
    return (content_type.feature is not None, position)


def get_content_type(kind: str) -> ContentType:
    """The registered type, or KeyError for an unknown kind."""
    _ensure_builtin_types()
    return _types[kind]


def is_registered(kind: str) -> bool:
    _ensure_builtin_types()
    return kind in _types


def _ensure_builtin_types() -> None:
    # Importing a type's module registers it. Done here (not at the top) so the
    # type modules can import this one. The must-have types are registered
    # first, then the types behind a feature switch.
    from app.modules.generation import flashcards, quiz  # noqa: F401, I001
    from app.modules.generation import model_cards  # noqa: F401
    from app.modules.generation import freetext  # noqa: F401
