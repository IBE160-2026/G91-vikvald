"""The count registry for delete confirmations (AR-7, FR-12).

Every content type (flashcards, quiz questions, ...) registers a `kind` and a
function that counts its rows made from a set of files and lectures. The delete
preview asks the registry, so a new content type shows up in the confirmation
without any change to the delete code. No types are registered in epic 2.

This module imports nothing from `files` or `subjects`.
"""

import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True)
class DeleteScope:
    """What is about to be deleted: these files, and these lectures as a whole."""

    file_ids: tuple[uuid.UUID, ...]
    lecture_ids: tuple[uuid.UUID, ...]


Counter = Callable[[AsyncSession, DeleteScope], Awaitable[int]]

# kind -> count function, in the order they were registered (dicts keep it).
_counters: dict[str, Counter] = {}


def register_counter(kind: str, count: Counter) -> None:
    """Add a content type. The same kind twice is a programming error."""
    if kind in _counters:
        raise ValueError(f"Counter already registered: {kind}")
    _counters[kind] = count


def unregister_counter(kind: str) -> None:
    """Remove a content type (used by tests). An unknown kind is ignored."""
    _counters.pop(kind, None)


async def content_counts(session: AsyncSession, scope: DeleteScope) -> list[tuple[str, int]]:
    """(kind, count) for every registered type in registration order, without
    the counts that are 0."""
    counts: list[tuple[str, int]] = []
    for kind, count in list(_counters.items()):
        value = await count(session, scope)
        if value > 0:
            counts.append((kind, value))
    return counts
