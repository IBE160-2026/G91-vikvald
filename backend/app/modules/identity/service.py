"""Business logic for accounts."""

import re
from datetime import UTC, datetime

from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError, ErrorCode
from app.core.security import PASSWORD_MAX_BYTES, hash_password, verify_password
from app.modules.identity.models import EMAIL_MAX_LENGTH, User

# Deliberately simple: something@something.something, no spaces. The frontend
# (modules/identity/validation.ts) uses the same pattern.
EMAIL_PATTERN = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")
PASSWORD_MIN_LENGTH = 8


def normalize_email(email: str) -> str:
    return email.strip().lower()


def _check_email(email: str) -> None:
    if len(email) > EMAIL_MAX_LENGTH or not EMAIL_PATTERN.fullmatch(email):
        raise AppError(ErrorCode.INVALID_EMAIL)


def _check_password(password: str) -> None:
    # Minimum in characters (what the student sees), maximum in bytes (what bcrypt uses).
    if len(password) < PASSWORD_MIN_LENGTH:
        raise AppError(ErrorCode.PASSWORD_TOO_SHORT)
    if len(password.encode("utf-8")) > PASSWORD_MAX_BYTES:
        raise AppError(ErrorCode.PASSWORD_TOO_LONG)


async def register_user(session: AsyncSession, email: str, password: str) -> User:
    """Create an account. The password is never stripped, stored or logged as is."""
    email = normalize_email(email)
    _check_email(email)
    _check_password(password)

    existing = await session.scalar(select(User.id).where(User.email == email))
    if existing is not None:
        raise AppError(ErrorCode.EMAIL_ALREADY_REGISTERED)

    # bcrypt is slow on purpose; run it in a thread so other requests are not blocked.
    password_hash = await run_in_threadpool(hash_password, password)
    user = User(email=email, password_hash=password_hash)
    session.add(user)
    try:
        await session.commit()
    except IntegrityError:
        # Two registrations with the same address at the same time: the unique
        # index stops the second. The request's session is closed afterwards,
        # which discards the failed transaction (no rollback() on the shared session).
        raise AppError(ErrorCode.EMAIL_ALREADY_REGISTERED) from None
    return user


# A bcrypt hash that no password is checked against with success. Login checks
# the password against it when the e-mail has no account, so an unknown address
# takes as long as a wrong password and the answer time does not reveal which
# addresses have an account. Made once per process, when the module loads, so
# even the first login with an unknown address costs only one bcrypt check.
_FALLBACK_PASSWORD_HASH = hash_password("no-account-has-this-password")


def fallback_password_hash() -> str:
    """The hash an unknown e-mail's password is checked against (made once per
    process, when the module loads)."""
    return _FALLBACK_PASSWORD_HASH


def _password_matches(password: str, password_hash: str | None) -> bool:
    # Runs in a worker thread: bcrypt takes a few hundred milliseconds on purpose.
    return verify_password(password, password_hash or fallback_password_hash())


async def authenticate(session: AsyncSession, email: str, password: str) -> User:
    """The user with this e-mail and password, or INVALID_CREDENTIALS.

    Unknown e-mail, wrong password, an empty or too long password and an e-mail
    that is not an address at all all give the same error, so the answer never
    says which part was wrong. The password is never stripped or logged.
    """
    user = await session.scalar(select(User).where(User.email == normalize_email(email)))
    matches = await run_in_threadpool(
        _password_matches, password, user.password_hash if user is not None else None
    )
    if user is None or not matches:
        raise AppError(ErrorCode.INVALID_CREDENTIALS)
    return user


async def accept_terms(session: AsyncSession, user: User) -> User:
    """Record that the student accepted the terms, the first time only.

    One conditional UPDATE (only while the field is empty) instead of read,
    check, write: two calls at the same time, or a later call, can never move
    the time of acceptance.
    """
    await session.execute(
        update(User)
        .where(User.id == user.id, User.terms_accepted_at.is_(None))
        .values(terms_accepted_at=datetime.now(UTC))
        .execution_options(synchronize_session=False)
    )
    await session.commit()
    await session.refresh(user)
    return user
