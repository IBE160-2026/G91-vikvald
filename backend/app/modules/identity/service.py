"""Business logic for accounts."""

import re

from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError, ErrorCode
from app.core.security import PASSWORD_MAX_BYTES, hash_password
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
