"""Password hashing and the session token (NFR-7, AR-10)."""

import uuid

import jwt
import pytest
from fastapi import Response

from app.core.config import get_settings
from app.core.security import (
    SESSION_COOKIE,
    SESSION_MAX_AGE,
    create_session_token,
    hash_password,
    set_session_cookie,
    verify_password,
)


def test_nfr7_hash_er_bcrypt_og_ikke_passordet() -> None:
    password_hash = hash_password("hemmelig1")
    assert password_hash.startswith("$2b$")
    assert "hemmelig1" not in password_hash


def test_nfr7_samme_passord_gir_ulik_hash() -> None:
    assert hash_password("hemmelig1") != hash_password("hemmelig1")


def test_nfr7_verify_password_godtar_riktig_og_avviser_feil() -> None:
    password_hash = hash_password("hemmelig1")
    assert verify_password("hemmelig1", password_hash)
    assert not verify_password("hemmelig2", password_hash)


def test_ar10_verify_password_avviser_over_72_byte() -> None:
    password_hash = hash_password("æ" * 36)
    assert not verify_password("æ" * 36 + "x", password_hash)


def test_ar10_token_har_sub_iat_exp() -> None:
    user_id = uuid.uuid4()
    token = create_session_token(user_id)
    claims = jwt.decode(token, get_settings().JWT_SECRET, algorithms=["HS256"])
    assert set(claims) == {"sub", "iat", "exp"}
    assert claims["sub"] == str(user_id)
    assert claims["exp"] - claims["iat"] == SESSION_MAX_AGE


def test_ar10_token_med_annen_noekkel_avvises() -> None:
    token = create_session_token(uuid.uuid4())
    with pytest.raises(jwt.InvalidSignatureError):
        jwt.decode(token, "en-helt-annen-noekkel-som-er-lang-nok", algorithms=["HS256"])


def test_ar10_set_session_cookie_setter_attributtene() -> None:
    response = Response()
    set_session_cookie(response, "token")
    header = response.headers["set-cookie"].lower()
    assert header.startswith(f"{SESSION_COOKIE}=token")
    for attribute in ("httponly", "samesite=lax", "path=/", f"max-age={SESSION_MAX_AGE}"):
        assert attribute in header
    assert "secure" not in header
