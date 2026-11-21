"""Login: POST /api/identity/login (FR-3, NFR-7, AR-10)."""

import logging
import uuid

import jwt
import pytest
from httpx import AsyncClient, Response

from app.core.config import get_settings
from app.core.security import SESSION_COOKIE, SESSION_MAX_AGE
from app.modules.identity import service

REGISTER = "/api/identity/register"
LOGIN = "/api/identity/login"
EMAIL = "klara@eksempel.no"
PASSWORD = "hemmelig1"
INVALID_CREDENTIALS = {"error": {"code": "INVALID_CREDENTIALS", "details": {}}}


async def _create_account(client: AsyncClient, email: str = EMAIL, password: str = PASSWORD) -> str:
    response = await client.post(REGISTER, json={"email": email, "password": password})
    assert response.status_code == 201
    # Log out again, so each login test starts without a cookie.
    client.cookies.clear()
    return response.json()["id"]


async def _login(client: AsyncClient, email: str, password: str) -> Response:
    return await client.post(LOGIN, json={"email": email, "password": password})


def _assert_invalid_credentials(response: Response) -> None:
    assert response.status_code == 401
    assert response.json() == INVALID_CREDENTIALS
    assert "set-cookie" not in response.headers


async def test_fr3_logg_inn(client: AsyncClient) -> None:
    user_id = await _create_account(client)
    response = await _login(client, " Klara@Eksempel.NO ", PASSWORD)
    assert response.status_code == 200
    assert response.json() == {"id": user_id, "email": EMAIL, "terms_accepted_at": None}


async def test_ar10_innlogging_setter_samme_cookie_som_registreringen(client: AsyncClient) -> None:
    user_id = await _create_account(client)
    response = await _login(client, EMAIL, PASSWORD)
    parts = [part.strip().lower() for part in response.headers["set-cookie"].split(";")]
    assert parts[0].startswith(f"{SESSION_COOKIE}=")
    for attribute in ("httponly", "samesite=lax", "path=/", f"max-age={SESSION_MAX_AGE}"):
        assert attribute in parts
    assert "secure" not in parts

    token = response.cookies[SESSION_COOKIE]
    assert jwt.get_unverified_header(token)["alg"] == "HS256"
    claims = jwt.decode(token, get_settings().JWT_SECRET, algorithms=["HS256"])
    assert claims["sub"] == user_id
    assert claims["exp"] - claims["iat"] == SESSION_MAX_AGE


async def test_ar10_jwt_staar_aldri_i_svarkroppen_ved_innlogging(client: AsyncClient) -> None:
    await _create_account(client)
    response = await _login(client, EMAIL, PASSWORD)
    assert response.cookies[SESSION_COOKIE] not in response.text


async def test_fr3_feil_passord_gir_invalid_credentials(client: AsyncClient) -> None:
    await _create_account(client)
    _assert_invalid_credentials(await _login(client, EMAIL, "hemmelig2"))


async def test_fr3_ukjent_epost_gir_invalid_credentials(client: AsyncClient) -> None:
    await _create_account(client)
    _assert_invalid_credentials(await _login(client, "ukjent@eksempel.no", PASSWORD))


async def test_fr3_ukjent_epost_og_feil_passord_gir_likt_svar_byte_for_byte(client: AsyncClient) -> None:
    await _create_account(client)
    wrong_password = await _login(client, EMAIL, "hemmelig2")
    unknown_email = await _login(client, "ukjent@eksempel.no", PASSWORD)
    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.content == unknown_email.content
    assert dict(wrong_password.headers) == dict(unknown_email.headers)


async def test_fr3_ukjent_epost_sjekkes_mot_reservehashen(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls: list[tuple[str, str]] = []
    real_verify = service.verify_password

    def spy(password: str, password_hash: str) -> bool:
        calls.append((password, password_hash))
        return real_verify(password, password_hash)

    monkeypatch.setattr(service, "verify_password", spy)
    _assert_invalid_credentials(await _login(client, "ukjent@eksempel.no", PASSWORD))
    assert calls == [(PASSWORD, service.fallback_password_hash())]
    assert service.fallback_password_hash().startswith("$2b$")


async def test_fr3_feil_passord_sjekkes_mot_brukerens_hash(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    await _create_account(client)
    hashes: list[str] = []
    real_verify = service.verify_password

    def spy(password: str, password_hash: str) -> bool:
        hashes.append(password_hash)
        return real_verify(password, password_hash)

    monkeypatch.setattr(service, "verify_password", spy)
    await _login(client, EMAIL, "hemmelig2")
    assert len(hashes) == 1
    assert hashes[0] != service.fallback_password_hash()


@pytest.mark.parametrize(
    ("email", "password"),
    [
        (EMAIL, ""),
        (EMAIL, "æ" * 37),
        ("klara", PASSWORD),
        ("", ""),
        (EMAIL, f" {PASSWORD} "),
    ],
    ids=["tomt-passord", "37-ae", "ugyldig-epost", "begge-tomme", "passord-med-mellomrom"],
)
async def test_fr3_rart_innhold_gir_invalid_credentials(
    client: AsyncClient, email: str, password: str
) -> None:
    await _create_account(client)
    _assert_invalid_credentials(await _login(client, email, password))


async def test_ar10_passord_paa_72_byte_kan_logge_inn(client: AsyncClient) -> None:
    password = "æ" * 36
    await _create_account(client, password=password)
    assert (await _login(client, EMAIL, password)).status_code == 200


async def test_fr3_passordet_strippes_ikke_ved_innlogging(client: AsyncClient) -> None:
    password = "  hemmelig  "
    await _create_account(client, password=password)
    assert (await _login(client, EMAIL, password)).status_code == 200
    _assert_invalid_credentials(await _login(client, EMAIL, password.strip()))


@pytest.mark.parametrize(
    ("body", "field"),
    [({"email": "a@b.no"}, "password"), ({"password": PASSWORD}, "email")],
)
async def test_ar12_felt_mangler_ved_innlogging_gir_validation_error(
    client: AsyncClient, body: dict[str, str], field: str
) -> None:
    response = await client.post(LOGIN, json=body)
    assert response.status_code == 422
    assert response.json() == {
        "error": {"code": "VALIDATION_ERROR", "details": {"fields": {field: "missing"}}}
    }


async def test_nfr7_passordet_staar_aldri_i_loggen_ved_innlogging(
    client: AsyncClient, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.DEBUG)
    password = "Hemmelig-Passord-42"
    await _create_account(client, password=password)
    caplog.clear()
    await _login(client, EMAIL, password)  # 200
    await _login(client, EMAIL, password + "x")  # wrong password
    await _login(client, "ukjent@eksempel.no", password)  # unknown e-mail
    await _login(client, EMAIL, password + "æ" * 40)  # too long
    assert caplog.records, "expected some log records at DEBUG"
    for record in caplog.records:
        assert password not in " ".join([record.getMessage(), str(record.args)])
    assert password not in caplog.text


async def test_fr3_innlogget_etter_innlogging_ifoelge_me(client: AsyncClient) -> None:
    user_id = await _create_account(client)
    await _login(client, EMAIL, PASSWORD)
    response = await client.get("/api/identity/me")
    assert response.status_code == 200
    assert response.json() == {"id": user_id, "email": EMAIL, "terms_accepted_at": None}
    uuid.UUID(response.json()["id"])
