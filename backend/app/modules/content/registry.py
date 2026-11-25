"""The count registry for delete confirmations (AR-7, FR-12).

Every content type (flashcards, quiz questions, ...) registers a `kind` and a
function that counts its rows made from a set of files and lectures. The delete
preview asks the registry, so a new content type shows up in the confirmation
without any change to the delete code. Flashcards and quiz questions are
registered by this module itself (the first time the registry is used), so
they always come first, in that order, followed by model cards and free-text
questions.

The module also keeps the delete guards (AR-7): a module that owns something
that must stop a delete (generation's running jobs) registers a guard here, and
the delete routes in `files` ask `check_delete_allowed` before anything is
deleted. That way `files` never imports `generation`.

It also answers "when did this lecture first get content of a practice kind"
(AR-16, story 5.1): every practice kind registers a function that gives the
time of the first content per lecture, and `first_content_times` asks it. The
practice module uses this to decide which lectures a whole-subject session
counts for, without reading the content tables itself. Flashcards, quiz and
free text are registered by this module itself, like the counters.

This module imports nothing from `files` or `subjects` at the top.
"""

import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime

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
    from app.modules.content.service import (
        count_flashcards,
        count_freetext_questions,
        count_model_cards,
        count_quiz_questions,
    )

    _counters["flashcards"] = count_flashcards
    _counters["quiz_questions"] = count_quiz_questions
    # Model cards (epic 7) are counted apart from the other flashcards. Always
    # registered: a card made while FEATURE_MNEMONICS was on is still deleted
    # with its file, so the confirmation must name it.
    _counters["model_cards"] = count_model_cards
    # Free-text questions (epic 8), always registered for the same reason as
    # model cards (FEATURE_FREETEXT).
    _counters["freetext_questions"] = count_freetext_questions
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


# The time of the first content of one practice kind per lecture. A lecture
# without such content is missing from the result.
FirstContentTimes = Callable[[AsyncSession, tuple[uuid.UUID, ...]], Awaitable[dict[uuid.UUID, datetime]]]

# practice kind ("flashcards", "quiz", ...) -> its first-content function.
_first_content: dict[str, FirstContentTimes] = {}
_builtin_first_content_registered = False


def _ensure_builtin_first_content() -> None:
    # Imported here for the same reason as in _ensure_builtin_counters.
    global _builtin_first_content_registered
    if _builtin_first_content_registered:
        return
    from app.modules.content.service import (
        first_flashcard_times,
        first_freetext_question_times,
        first_quiz_question_times,
    )

    _first_content.setdefault("flashcards", first_flashcard_times)
    _first_content.setdefault("quiz", first_quiz_question_times)
    # A whole-subject free-text session counts for the lectures that had
    # free-text questions when it started (#236).
    _first_content.setdefault("freetext", first_freetext_question_times)
    _builtin_first_content_registered = True


def register_first_content(kind: str, first_times: FirstContentTimes) -> None:
    """Add a practice kind (e.g. "summary"). The same kind twice is
    a programming error."""
    _ensure_builtin_first_content()
    if kind in _first_content:
        raise ValueError(f"First-content function already registered: {kind}")
    _first_content[kind] = first_times


def unregister_first_content(kind: str) -> None:
    """Remove a practice kind (used by tests). An unknown kind is ignored."""
    _first_content.pop(kind, None)


async def first_content_times(
    session: AsyncSession, lecture_ids: tuple[uuid.UUID, ...], kind: str
) -> dict[uuid.UUID, datetime]:
    """When each lecture first had content of the practice kind, in UTC.
    "Had content of the kind at time T" is then `first <= T`. A lecture without
    such content, and every lecture for a kind nobody registered, is missing."""
    _ensure_builtin_first_content()
    first_times = _first_content.get(kind)
    if first_times is None or not lecture_ids:
        return {}
    found = await first_times(session, lecture_ids)
    # SQLite (tests) gives the stored UTC time back without its time zone.
    return {
        lecture_id: moment if moment.tzinfo else moment.replace(tzinfo=UTC)
        for lecture_id, moment in found.items()
    }


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
