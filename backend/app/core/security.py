"""Password hashing (bcrypt) and the login cookie (HS256 JWT in sk_session)."""

import uuid
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from fastapi import Response

from app.core.config import get_settings

SESSION_COOKIE = "sk_session"
# The login lasts 30 days, in seconds (cookie Max-Age and JWT exp).
SESSION_MAX_AGE = 30 * 24 * 60 * 60
JWT_ALGORITHM = "HS256"

# bcrypt only uses the first 72 bytes of a password, so longer ones are refused
# before they get here (PASSWORD_TOO_LONG) instead of being cut silently.
PASSWORD_MAX_BYTES = 72


def hash_password(password: str) -> str:
    """Return a bcrypt hash (with its own random salt) of the password."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    """True when the password matches the hash. Used by login."""
    encoded = password.encode("utf-8")
    if len(encoded) > PASSWORD_MAX_BYTES:
        return False
    return bcrypt.checkpw(encoded, password_hash.encode("ascii"))


def create_session_token(user_id: uuid.UUID) -> str:
    """A signed JWT that says who is logged in (sub) and until when (exp)."""
    now = datetime.now(UTC)
    claims = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(seconds=SESSION_MAX_AGE),
    }
    return jwt.encode(claims, get_settings().JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_session_token(token: str) -> uuid.UUID | None:
    """The user id in a session token, or None when the token cannot be trusted.

    Only HS256 is accepted (so "none" and other algorithms are refused), the
    signature must match JWT_SECRET, and exp, iat and sub must be present.
    An expired, broken or tampered token gives None, never an exception.
    """
    try:
        claims = jwt.decode(
            token,
            get_settings().JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["exp", "iat", "sub"]},
        )
        return uuid.UUID(claims["sub"])
    except (jwt.InvalidTokenError, ValueError, TypeError, AttributeError):
        return None


def set_session_cookie(response: Response, token: str) -> None:
    """Put the token in the sk_session cookie. HttpOnly: page scripts cannot read it.
    No Secure flag, because the app runs on plain http://localhost."""
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=SESSION_MAX_AGE,
        path="/",
        httponly=True,
        samesite="lax",
        secure=False,
    )
