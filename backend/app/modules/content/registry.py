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
    """What is about to be deleted.

    file_ids holds every file being deleted, also the files in the lectures in
    lecture_ids. lecture_ids holds only the lectures deleted as a whole (empty
    when one file is deleted). Count content made from files by file_ids, and
    content owned by a lecture (e.g. summaries) by lecture_ids, so nothing is
    counted twice.
    """

    file_ids: tuple[uuid.UUID, ...]
    lecture_ids: tuple[uuid.UUID, ...]


Counter = Callable[[AsyncSession, DeleteScope], Awaitable[int]]

# kind -> count function, in the order they were registered (dicts keep it).
_counters: dict[str, Counter] = {}

# Counted by the delete preview itself, so no content type may use them.
RESERVED_KINDS = frozenset({"subjects", "lectures", "files"})


def register_counter(kind: str, count: Counter) -> None:
    """Add a content type. The same kind twice, or a reserved kind, is a
    programming error."""
    if kind in RESERVED_KINDS:
        raise ValueError(f"Reserved kind: {kind}")
    if kind in _counters:
        raise ValueError(f"Counter already registered: {kind}")
    _counters[kind] = count


def registered_kinds() -> list[str]:
    """Every registered kind, in the order they were registered (the account
    deletion text names them, also those with nothing to count yet)."""
    return list(_counters)


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
