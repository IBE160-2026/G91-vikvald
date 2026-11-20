"""POST /api/identity/logout (FR-3, AR-10)."""

from httpx import AsyncClient

from app.core.security import SESSION_COOKIE

LOGOUT = "/api/identity/logout"
ME = "/api/identity/me"


async def _register(client: AsyncClient) -> None:
    response = await client.post(
        "/api/identity/register", json={"email": "klara@eksempel.no", "password": "hemmelig1"}
    )
    assert response.status_code == 201


def _assert_clears_cookie(set_cookie: str) -> None:
    parts = [part.strip() for part in set_cookie.split(";")]
    assert parts[0] == f'{SESSION_COOKIE}=""'
    assert "Max-Age=0" in parts
    assert "Path=/" in parts
    assert "HttpOnly" in parts
    assert "SameSite=lax" in parts


async def test_fr3_logg_ut_gir_204_og_sletter_cookien(client: AsyncClient) -> None:
    await _register(client)
    assert (await client.get(ME)).status_code == 200

    response = await client.post(LOGOUT)
    assert response.status_code == 204
    assert response.content == b""
    _assert_clears_cookie(response.headers["set-cookie"])

    # The browser has dropped the cookie, so /me no longer knows her.
    assert SESSION_COOKIE not in client.cookies
    me = await client.get(ME)
    assert me.status_code == 401
    assert me.json() == {"error": {"code": "UNAUTHENTICATED", "details": {}}}


async def test_fr3_logg_ut_uten_cookie_gir_204(client: AsyncClient) -> None:
    response = await client.post(LOGOUT)
    assert response.status_code == 204
    _assert_clears_cookie(response.headers["set-cookie"])


async def test_fr3_logg_ut_med_ugyldig_cookie_gir_204(client: AsyncClient) -> None:
    client.cookies.set(SESSION_COOKIE, "dette-er-ikke-en-jwt")
    response = await client.post(LOGOUT)
    assert response.status_code == 204
    _assert_clears_cookie(response.headers["set-cookie"])


async def test_ar10_logg_ut_sletter_med_samme_attributter_som_innloggingen(client: AsyncClient) -> None:
    register = await client.post(
        "/api/identity/register", json={"email": "klara@eksempel.no", "password": "hemmelig1"}
    )
    set_parts = {p.strip().split("=")[0].lower() for p in register.headers["set-cookie"].split(";")[1:]}
    clear_parts = {
        p.strip().split("=")[0].lower()
        for p in (await client.post(LOGOUT)).headers["set-cookie"].split(";")[1:]
    }
    # Same Path, HttpOnly and SameSite; logout adds expires/max-age=0.
    for attribute in ("path", "httponly", "samesite"):
        assert attribute in set_parts
        assert attribute in clear_parts
    assert "secure" not in clear_parts
