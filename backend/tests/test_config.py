"""Settings from one place (AR-11, NFR-4) and GET /api/config."""

import os
import re
import subprocess
import sys
from pathlib import Path

import pytest
from httpx import AsyncClient

from app.core.config import Settings

BACKEND_DIR = Path(__file__).resolve().parents[1]
ENV_EXAMPLE = BACKEND_DIR.parent / ".env.example"


async def test_ar11_config_standardverdier(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    for name in ("FEATURE_MNEMONICS", "FEATURE_FREETEXT", "FEATURE_SUMMARY"):
        monkeypatch.setenv(name, "true")
    response = await client.get("/api/config")
    assert response.status_code == 200
    assert response.json() == {
        "demo_mode": True,
        "feature_mnemonics": True,
        "feature_freetext": True,
        "feature_summary": True,
    }


async def test_ar11_config_har_bare_demo_mode_og_bryterne(client: AsyncClient) -> None:
    response = await client.get("/api/config")
    assert set(response.json()) == {
        "demo_mode",
        "feature_mnemonics",
        "feature_freetext",
        "feature_summary",
    }


async def test_ar11_vertex_er_ikke_demo_mode(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "vertex")
    response = await client.get("/api/config")
    assert response.json()["demo_mode"] is False


async def test_ar11_mock_invalid_er_demo_mode(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "mock-invalid")
    response = await client.get("/api/config")
    assert response.json()["demo_mode"] is True


async def test_ar11_bryter_av_vises_i_config(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("FEATURE_FREETEXT", "false")
    response = await client.get("/api/config")
    assert response.json()["feature_freetext"] is False


def test_ar17_pytest_kjoerer_med_mock() -> None:
    assert os.environ["LLM_PROVIDER"] == "mock"


def test_ar11_ugyldig_provider_stopper_oppstart() -> None:
    env = {**os.environ, "LLM_PROVIDER": "gpt"}
    result = subprocess.run(
        [sys.executable, "-c", "import app.main"],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
    )
    output = result.stdout + result.stderr
    assert result.returncode != 0
    assert "LLM_PROVIDER" in output
    assert "'mock'" in output and "'vertex'" in output
    assert "gpt" not in output
    assert "Traceback" not in output


def test_nfr4_alle_innstillinger_staar_i_env_example() -> None:
    text = ENV_EXAMPLE.read_text(encoding="utf-8")
    names = set(re.findall(r"^([A-Z][A-Z0-9_]*)=", text, flags=re.MULTILINE))
    missing = sorted(name for name in Settings.model_fields if name not in names)
    assert not missing, f"Missing in .env.example: {', '.join(missing)}"
