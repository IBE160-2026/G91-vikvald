"""The count registry for delete confirmations (AR-7, FR-12).

Every content type (flashcards, quiz questions, ...) registers a `kind` and a
function that counts its rows made from a set of files and lectures. The delete
preview asks the registry, so a new content type shows up in the confirmation
without any change to the delete code. Flashcards are registered by this module
itself (the first time the registry is used), so they always come first.

The module also keeps the delete guards (AR-7): a module that owns something
that must stop a delete (generation's running jobs) registers a guard here, and
the delete routes in `files` ask `check_delete_allowed` before anything is
deleted. That way `files` never imports `generation`.

This module imports nothing from `files` or `subjects` at the top.
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
# Raises an AppError (e.g. JOB_ALREADY_RUNNING) if any of the lectures may not
# lose content now; returns None if the delete may go ahead.
DeleteGuard = Callable[[AsyncSession, tuple[uuid.UUID, ...]], Awaitable[None]]

# kind -> count function, in the order they were registered (dicts keep it).
_counters: dict[str, Counter] = {}
_builtin_counters_registered = False

_guards: list[DeleteGuard] = []

# Counted by the delete preview itself, so no content type may use them.
RESERVED_KINDS = frozenset({"subjects", "lectures", "files"})


def _ensure_builtin_counters() -> None:
    # The content module's own types, registered the first time the registry
    # is used, before any type registered later. Imported here (not at the
    # top) so the service module can be imported without this one.
    global _builtin_counters_registered
    if _builtin_counters_registered:
        return
    from app.modules.content.service import count_flashcards

    _counters["flashcards"] = count_flashcards
    # Set only once registered, so a failed import is tried again next time.
    _builtin_counters_registered = True


def register_counter(kind: str, count: Counter) -> None:
    """Add a content type. The same kind twice, or a reserved kind, is a
    programming error."""
    _ensure_builtin_counters()
    if kind in RESERVED_KINDS:
        raise ValueError(f"Reserved kind: {kind}")
    if kind in _counters:
        raise ValueError(f"Counter already registered: {kind}")
    _counters[kind] = count


def registered_kinds() -> list[str]:
    """Every registered kind, in the order they were registered (the account
    deletion text names them, also those with nothing to count yet)."""
    _ensure_builtin_counters()
    return list(_counters)


def unregister_counter(kind: str) -> None:
    """Remove a content type (used by tests). An unknown kind is ignored."""
    _counters.pop(kind, None)


async def content_counts(session: AsyncSession, scope: DeleteScope) -> list[tuple[str, int]]:
    """(kind, count) for every registered type in registration order, without
    the counts that are 0."""
    _ensure_builtin_counters()
    counts: list[tuple[str, int]] = []
    for kind, count in list(_counters.items()):
        value = await count(session, scope)
        if value > 0:
            counts.append((kind, value))
    return counts


def register_delete_guard(guard: DeleteGuard) -> None:
    """Add a guard that is asked before every file, lecture, subject or account
    delete (and before a file is replaced). The same guard twice is ignored."""
    if guard not in _guards:
        _guards.append(guard)


def unregister_delete_guard(guard: DeleteGuard) -> None:
    """Remove a guard (used by tests). An unknown guard is ignored."""
    if guard in _guards:
        _guards.remove(guard)


async def check_delete_allowed(session: AsyncSession, lecture_ids: tuple[uuid.UUID, ...]) -> None:
    """Ask every guard about the lectures that would lose content. A guard that
    says no raises its AppError, and nothing has been deleted yet."""
    if not lecture_ids:
        return
    for guard in list(_guards):
        await guard(session, lecture_ids)
