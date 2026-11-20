"""current_user and GET /api/identity/me (AR-2, AR-10)."""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
import pytest
from fastapi.routing import APIRoute
from httpx import AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.core.config import get_settings
from app.core.security import SESSION_COOKIE, create_session_token
from app.main import app
from app.modules.identity.dependencies import current_user
from app.modules.identity.models import User
from app.modules.identity.router import router

ME = "/api/identity/me"
EMAIL = "klara@eksempel.no"
UNAUTHENTICATED = {"error": {"code": "UNAUTHENTICATED", "details": {}}}


async def _create_account(client: AsyncClient) -> str:
    response = await client.post(
        "/api/identity/register", json={"email": EMAIL, "password": "hemmelig1"}
    )
    assert response.status_code == 201
    client.cookies.clear()
    return response.json()["id"]


def _claims(sub: Any, **overrides: Any) -> dict[str, Any]:
    now = datetime.now(UTC)
    claims = {"sub": sub, "iat": now, "exp": now + timedelta(days=1)}
    claims.update(overrides)
    return {key: value for key, value in claims.items() if value is not None}


def _token(claims: dict[str, Any], key: str | None = None, algorithm: str = "HS256") -> str:
    return jwt.encode(claims, key if key is not None else get_settings().JWT_SECRET, algorithm=algorithm)


async def _me_with(client: AsyncClient, token: str) -> Any:
    client.cookies.set(SESSION_COOKIE, token)
    return await client.get(ME)


async def test_ar10_me_med_cookie_fra_registreringen(client: AsyncClient) -> None:
    response = await client.post(
        "/api/identity/register", json={"email": EMAIL, "password": "hemmelig1"}
    )
    me = await client.get(ME)
    assert me.status_code == 200
    assert me.json() == {"id": response.json()["id"], "email": EMAIL}


async def test_ar10_me_med_gyldig_token(client: AsyncClient) -> None:
    user_id = await _create_account(client)
    response = await _me_with(client, create_session_token(uuid.UUID(user_id)))
    assert response.status_code == 200
    assert response.json() == {"id": user_id, "email": EMAIL}


async def test_ar10_me_uten_cookie_gir_unauthenticated(client: AsyncClient) -> None:
    await _create_account(client)
    response = await client.get(ME)
    assert response.status_code == 401
    assert response.json() == UNAUTHENTICATED


def _bad_tokens(user_id: str) -> dict[str, str]:
    now = datetime.now(UTC)
    return {
        "feil-noekkel": _token(_claims(user_id), key="en-helt-annen-noekkel-som-er-lang-nok-1234"),
        "utloept": _token(_claims(user_id, iat=now - timedelta(days=31), exp=now - timedelta(seconds=1))),
        "alg-none": jwt.encode(_claims(user_id), "", algorithm="none"),
        "annen-algoritme-hs512": _token(_claims(user_id), algorithm="HS512"),
        "soeppel": "dette-er-ikke-en-jwt",
        "tom": "",
        "sub-ikke-uuid": _token(_claims("klara")),
        "sub-mangler": _token(_claims(None)),
        "exp-mangler": _token({"sub": user_id, "iat": now}),
        "iat-mangler": _token({"sub": user_id, "exp": now + timedelta(days=1)}),
        "bruker-finnes-ikke": create_session_token(uuid.uuid4()),
        "endret-innhold": _swap_payload(
            create_session_token(uuid.UUID(user_id)), _token(_claims(str(uuid.uuid4())))
        ),
    }


def _swap_payload(signed: str, other: str) -> str:
    """The header and signature of one token with the payload of another."""
    header, _payload, signature = signed.split(".")
    return ".".join([header, other.split(".")[1], signature])


BAD_TOKEN_CASES = [
    "feil-noekkel",
    "utloept",
    "alg-none",
    "annen-algoritme-hs512",
    "soeppel",
    "tom",
    "sub-ikke-uuid",
    "sub-mangler",
    "exp-mangler",
    "iat-mangler",
    "bruker-finnes-ikke",
    "endret-innhold",
]


@pytest.mark.filterwarnings("ignore::jwt.warnings.InsecureKeyLengthWarning")
@pytest.mark.parametrize("case", BAD_TOKEN_CASES)
async def test_ar10_me_med_ugyldig_token_gir_unauthenticated(client: AsyncClient, case: str) -> None:
    user_id = await _create_account(client)
    response = await _me_with(client, _bad_tokens(user_id)[case])
    assert response.status_code == 401
    assert response.json() == UNAUTHENTICATED


async def test_ar10_slettet_bruker_gir_unauthenticated(
    client: AsyncClient, engine: AsyncEngine
) -> None:
    user_id = await _create_account(client)
    token = create_session_token(uuid.UUID(user_id))
    assert (await _me_with(client, token)).status_code == 200
    async with async_sessionmaker(engine)() as session:
        await session.execute(delete(User).where(User.id == uuid.UUID(user_id)))
        await session.commit()
    response = await _me_with(client, token)
    assert response.status_code == 401
    assert response.json() == UNAUTHENTICATED


def test_ar2_me_bruker_current_user() -> None:
    # app.routes holds the included routers unexpanded, so look in the identity router.
    route = next(
        r for r in router.routes if isinstance(r, APIRoute) and r.path == ME and "GET" in r.methods
    )
    calls = [dependency.call for dependency in route.dependant.dependencies]
    assert current_user in calls


async def test_ar2_me_svarer_med_brukeren_fra_current_user(client: AsyncClient) -> None:
    stand_in = User(id=uuid.uuid4(), email="annen@eksempel.no", password_hash="x")
    app.dependency_overrides[current_user] = lambda: stand_in
    response = await client.get(ME)
    assert response.status_code == 200
    assert response.json() == {"id": str(stand_in.id), "email": "annen@eksempel.no"}
