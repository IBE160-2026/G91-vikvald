"""Registration: POST /api/identity/register (FR-3, NFR-7, AR-10)."""

import logging
import uuid
from datetime import UTC, datetime

import jwt
import pytest
from httpx import AsyncClient, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.core.config import get_settings
from app.core.errors import AppError, ErrorCode
from app.core.security import SESSION_COOKIE, SESSION_MAX_AGE, verify_password
from app.modules.identity.models import User
from app.modules.identity.service import register_user

REGISTER = "/api/identity/register"
PASSWORD = "hemmelig1"


async def _register(client: AsyncClient, email: str, password: str = PASSWORD) -> Response:
    return await client.post(REGISTER, json={"email": email, "password": password})


def _error_code(response: Response) -> str:
    return response.json()["error"]["code"]


async def _count_users(engine: AsyncEngine) -> int:
    async with async_sessionmaker(engine)() as session:
        return await session.scalar(select(func.count()).select_from(User)) or 0


async def test_fr3_opprett_konto(client: AsyncClient, engine: AsyncEngine) -> None:
    response = await _register(client, "  Klara@Eksempel.NO ")
    assert response.status_code == 201
    body = response.json()
    assert set(body) == {"id", "email", "terms_accepted_at"}
    assert body["terms_accepted_at"] is None
    assert body["email"] == "klara@eksempel.no"
    uuid.UUID(body["id"])
    assert await _count_users(engine) == 1


async def test_fr3_epost_lagres_trimmet_og_med_smaa_bokstaver(
    client: AsyncClient, session: AsyncSession
) -> None:
    await _register(client, "  Klara@Eksempel.NO ")
    user = await session.scalar(select(User))
    assert user is not None
    assert user.email == "klara@eksempel.no"
    assert user.created_at is not None


async def test_ar10_cookie_er_httponly_lax_og_30_dager(client: AsyncClient) -> None:
    response = await _register(client, "klara@eksempel.no")
    header = response.headers["set-cookie"]
    parts = [part.strip().lower() for part in header.split(";")]
    assert parts[0].startswith(f"{SESSION_COOKIE}=")
    assert "httponly" in parts
    assert "samesite=lax" in parts
    assert "path=/" in parts
    assert f"max-age={SESSION_MAX_AGE}" in parts
    assert SESSION_MAX_AGE == 30 * 24 * 60 * 60
    assert "secure" not in parts


async def test_ar10_jwt_er_hs256_med_sub_iat_og_exp(client: AsyncClient) -> None:
    response = await _register(client, "klara@eksempel.no")
    token = response.cookies[SESSION_COOKIE]
    assert jwt.get_unverified_header(token)["alg"] == "HS256"
    claims = jwt.decode(token, get_settings().JWT_SECRET, algorithms=["HS256"])
    assert claims["sub"] == response.json()["id"]
    assert claims["exp"] - claims["iat"] == SESSION_MAX_AGE
    assert abs(claims["iat"] - datetime.now(UTC).timestamp()) < 60


async def test_ar10_jwt_staar_aldri_i_svarkroppen(client: AsyncClient) -> None:
    response = await _register(client, "klara@eksempel.no")
    token = response.cookies[SESSION_COOKIE]
    assert token not in response.text


async def test_fr3_finnes_fra_foer_med_annen_skrivemaate_gir_409(
    client: AsyncClient, engine: AsyncEngine
) -> None:
    assert (await _register(client, "klara@eksempel.no")).status_code == 201
    response = await _register(client, " KLARA@eksempel.no", "annetpassord")
    assert response.status_code == 409
    assert response.json() == {"error": {"code": "EMAIL_ALREADY_REGISTERED", "details": {}}}
    assert "set-cookie" not in response.headers
    assert await _count_users(engine) == 1


async def test_fr3_samtidig_registrering_gir_409_uten_rollback(
    engine: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> None:
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with sessions() as first:
        await register_user(first, "klara@eksempel.no", PASSWORD)

    async with sessions() as second:
        # The other request committed after this one checked: the check finds nothing,
        # so the unique index has to stop the second row.
        async def nothing_found(*_args: object, **_kwargs: object) -> None:
            return None

        async def no_rollback() -> None:
            raise AssertionError("rollback() must not be called on the request session")

        monkeypatch.setattr(second, "scalar", nothing_found)
        monkeypatch.setattr(second, "rollback", no_rollback)
        with pytest.raises(AppError) as caught:
            await register_user(second, "klara@eksempel.no", PASSWORD)
        assert caught.value.code is ErrorCode.EMAIL_ALREADY_REGISTERED
        assert caught.value.status_code == 409

    assert await _count_users(engine) == 1


@pytest.mark.parametrize(
    "email",
    [
        "klara",
        "klara@eksempel",
        "",
        "   ",
        "klara @eksempel.no",
        "klara@@eksempel.no",
        "a" * (255 - len("@eksempel.no")) + "@eksempel.no",
    ],
    ids=["uten-krollalfa", "uten-punktum", "tom", "bare-mellomrom", "mellomrom", "to-krollalfa", "255-tegn"],
)
async def test_fr3_ugyldig_epost_gir_invalid_email(client: AsyncClient, email: str) -> None:
    response = await _register(client, email)
    assert response.status_code == 422
    assert _error_code(response) == "INVALID_EMAIL"


async def test_fr3_epost_paa_254_tegn_godtas(client: AsyncClient) -> None:
    email = "a" * (254 - len("@eksempel.no")) + "@eksempel.no"
    assert len(email) == 254
    assert (await _register(client, email)).status_code == 201


async def test_fr3_passord_paa_7_tegn_gir_password_too_short(client: AsyncClient) -> None:
    response = await _register(client, "klara@eksempel.no", "1234567")
    assert response.status_code == 422
    assert _error_code(response) == "PASSWORD_TOO_SHORT"


async def test_fr3_passord_paa_8_tegn_godtas(client: AsyncClient) -> None:
    assert (await _register(client, "klara@eksempel.no", "12345678")).status_code == 201


async def test_fr3_kort_passord_telles_i_tegn_ikke_byte(client: AsyncClient) -> None:
    # 7 «æ» are 14 bytes, but still only 7 characters.
    response = await _register(client, "klara@eksempel.no", "æ" * 7)
    assert _error_code(response) == "PASSWORD_TOO_SHORT"


async def test_ar10_passord_paa_72_byte_godtas(client: AsyncClient, session: AsyncSession) -> None:
    password = "æ" * 36
    assert len(password.encode("utf-8")) == 72
    assert (await _register(client, "klara@eksempel.no", password)).status_code == 201
    user = await session.scalar(select(User))
    assert user is not None and verify_password(password, user.password_hash)


async def test_ar10_passord_over_72_byte_avvises(client: AsyncClient, engine: AsyncEngine) -> None:
    response = await _register(client, "klara@eksempel.no", "æ" * 37)
    assert response.status_code == 422
    assert _error_code(response) == "PASSWORD_TOO_LONG"
    assert await _count_users(engine) == 0


async def test_fr3_epost_sjekkes_foer_passordet(client: AsyncClient) -> None:
    response = await _register(client, "klara", "kort")
    assert _error_code(response) == "INVALID_EMAIL"


async def test_fr3_passordet_sjekkes_foer_finnes_fra_foer(client: AsyncClient) -> None:
    await _register(client, "klara@eksempel.no")
    assert _error_code(await _register(client, "klara@eksempel.no", "kort")) == "PASSWORD_TOO_SHORT"
    assert _error_code(await _register(client, "klara@eksempel.no", "æ" * 37)) == "PASSWORD_TOO_LONG"


async def test_fr3_passordet_strippes_ikke(client: AsyncClient, session: AsyncSession) -> None:
    password = "  hemmelig  "
    assert (await _register(client, "klara@eksempel.no", password)).status_code == 201
    user = await session.scalar(select(User))
    assert user is not None
    assert verify_password(password, user.password_hash)
    assert not verify_password(password.strip(), user.password_hash)


@pytest.mark.parametrize(
    ("body", "field"),
    [({"email": "a@b.no"}, "password"), ({"password": PASSWORD}, "email")],
)
async def test_ar12_felt_mangler_gir_validation_error(
    client: AsyncClient, body: dict[str, str], field: str
) -> None:
    response = await client.post(REGISTER, json=body)
    assert response.status_code == 422
    assert response.json() == {
        "error": {"code": "VALIDATION_ERROR", "details": {"fields": {field: "missing"}}}
    }


async def test_nfr7_passord_lagres_som_hash(client: AsyncClient, session: AsyncSession) -> None:
    password = "Hemmelig-Passord-42"
    await _register(client, "klara@eksempel.no", password)
    user = await session.scalar(select(User))
    assert user is not None
    assert user.password_hash.startswith("$2b$")
    assert verify_password(password, user.password_hash)
    for value in (user.id, user.email, user.password_hash, user.created_at):
        assert password not in str(value)


async def test_nfr7_passordet_staar_aldri_i_loggen(
    client: AsyncClient, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.DEBUG)
    password = "Hemmelig-Passord-42"
    await _register(client, "klara@eksempel.no", password)
    await _register(client, "klara@eksempel.no", password)  # 409
    await _register(client, "klara", password)  # 422
    await _register(client, "ny@eksempel.no", password + "æ" * 40)  # too long
    assert caplog.records, "expected some log records at DEBUG"
    for record in caplog.records:
        text = " ".join([record.getMessage(), str(record.args), caplog.text])
        assert password not in text
