"""The shared error format (AR-12): every API error is {"error": {"code", "details"}}."""

import logging
import re
from collections.abc import AsyncIterator
from pathlib import Path

import pytest
from fastapi import Depends, FastAPI
from httpx import ASGITransport, AsyncClient
from pydantic import BaseModel

from app.core.errors import ERROR_STATUS, AppError, ErrorCode
from app.core.features import require_feature
from app.main import create_app

MESSAGES_FILE = Path(__file__).resolve().parents[2] / "frontend" / "lib" / "messages.ts"


class _Item(BaseModel):
    name: str


def _make_test_app() -> FastAPI:
    """The real app plus routes that only exist in these tests."""
    app = create_app()

    @app.get("/api/test/feature-disabled")
    async def feature_disabled() -> None:
        raise AppError(ErrorCode.FEATURE_DISABLED)

    @app.post("/api/test/items")
    async def create_item(item: _Item) -> _Item:
        return item

    @app.get("/api/test/crash")
    async def crash() -> None:
        raise RuntimeError("hemmelig")

    @app.get("/api/test/summary", dependencies=[Depends(require_feature("summary"))])
    async def summary() -> dict[str, str]:
        return {"status": "ok"}

    return app


@pytest.fixture
async def test_client() -> AsyncIterator[AsyncClient]:
    # raise_app_exceptions=False: Starlette sends the 500 response from our handler
    # and then re-raises the error; without this the test client would raise it too.
    transport = ASGITransport(app=_make_test_app(), raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


def _assert_error(body: object, code: str) -> dict[str, object]:
    assert isinstance(body, dict)
    assert set(body) == {"error"}
    assert set(body["error"]) == {"code", "details"}
    assert body["error"]["code"] == code
    return body["error"]["details"]


async def test_ar12_apperror_gir_feilformatet(test_client: AsyncClient) -> None:
    response = await test_client.get("/api/test/feature-disabled")
    assert response.status_code == 404
    assert response.json() == {"error": {"code": "FEATURE_DISABLED", "details": {}}}


async def test_ar12_ukjent_sti_gir_not_found(test_client: AsyncClient) -> None:
    response = await test_client.get("/api/finnes-ikke")
    assert response.status_code == 404
    assert _assert_error(response.json(), "NOT_FOUND") == {}


async def test_ar12_feil_metode_gir_method_not_allowed_med_allow(test_client: AsyncClient) -> None:
    response = await test_client.post("/api/health")
    assert response.status_code == 405
    assert _assert_error(response.json(), "METHOD_NOT_ALLOWED") == {}
    assert "GET" in response.headers["allow"]


async def test_ar12_valideringsfeil_navngir_feltet(test_client: AsyncClient) -> None:
    response = await test_client.post("/api/test/items", json={})
    assert response.status_code == 422
    assert _assert_error(response.json(), "VALIDATION_ERROR") == {"fields": {"name": "missing"}}


async def test_ar12_ugyldig_json_gir_valideringsfeil(test_client: AsyncClient) -> None:
    response = await test_client.post(
        "/api/test/items", content=b"{", headers={"content-type": "application/json"}
    )
    assert response.status_code == 422
    _assert_error(response.json(), "VALIDATION_ERROR")


async def test_ar12_uventet_feil_gir_500_uten_innhold(
    test_client: AsyncClient, caplog: pytest.LogCaptureFixture
) -> None:
    response = await test_client.get("/api/test/crash")
    assert response.status_code == 500
    assert _assert_error(response.json(), "INTERNAL_ERROR") == {}
    assert "hemmelig" not in response.text
    assert "Traceback" not in response.text
    logged = [
        r for r in caplog.records if r.name == "app.core.errors" and r.levelno == logging.ERROR
    ]
    assert logged and logged[0].exc_info is not None
    assert "/api/test/crash" in logged[0].getMessage()


async def test_ar11_avslaatt_bryter_gir_feature_disabled(
    test_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("FEATURE_SUMMARY", "false")
    response = await test_client.get("/api/test/summary")
    assert response.status_code == 404
    assert response.json() == {"error": {"code": "FEATURE_DISABLED", "details": {}}}


async def test_ar11_paaslaatt_bryter_slipper_gjennom(
    test_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("FEATURE_SUMMARY", "true")
    response = await test_client.get("/api/test/summary")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ar12_alle_koder_har_status() -> None:
    assert set(ERROR_STATUS) == set(ErrorCode)
    for code in ErrorCode:
        assert re.fullmatch(r"[A-Z][A-Z0-9_]*", code.value), code


def test_fr1_alle_koder_finnes_i_meldingsfila() -> None:
    text = MESSAGES_FILE.read_text(encoding="utf-8")
    keys = set(re.findall(r"^\s*([A-Z][A-Z0-9_]*)\s*:", text, flags=re.MULTILINE))
    missing = sorted(code.value for code in ErrorCode if code.value not in keys)
    assert not missing, f"Missing in frontend/lib/messages.ts: {', '.join(missing)}"
