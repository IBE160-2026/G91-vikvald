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
    decode_session_token,
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


def test_ar10_decode_session_token_gir_bruker_id() -> None:
    user_id = uuid.uuid4()
    assert decode_session_token(create_session_token(user_id)) == user_id


def test_ar10_decode_session_token_avviser_alg_none() -> None:
    token = jwt.encode({"sub": str(uuid.uuid4()), "iat": 0, "exp": 2**40}, "", algorithm="none")
    assert decode_session_token(token) is None


def test_ar10_decode_session_token_avviser_annen_noekkel_og_soeppel() -> None:
    claims = {"sub": str(uuid.uuid4()), "iat": 0, "exp": 2**40}
    assert decode_session_token(jwt.encode(claims, "en-helt-annen-noekkel-som-er-lang-nok")) is None
    assert decode_session_token("soeppel") is None
    assert decode_session_token("") is None


def test_ar10_decode_session_token_krever_exp_iat_og_sub() -> None:
    secret = get_settings().JWT_SECRET
    full = {"sub": str(uuid.uuid4()), "iat": 0, "exp": 2**40}
    for missing in ("sub", "iat", "exp"):
        claims = {key: value for key, value in full.items() if key != missing}
        assert decode_session_token(jwt.encode(claims, secret, algorithm="HS256")) is None, missing


def test_ar10_decode_session_token_avviser_utloept_og_sub_som_ikke_er_uuid() -> None:
    secret = get_settings().JWT_SECRET
    expired = {"sub": str(uuid.uuid4()), "iat": 0, "exp": 1}
    assert decode_session_token(jwt.encode(expired, secret, algorithm="HS256")) is None
    not_uuid = {"sub": "klara", "iat": 0, "exp": 2**40}
    assert decode_session_token(jwt.encode(not_uuid, secret, algorithm="HS256")) is None
