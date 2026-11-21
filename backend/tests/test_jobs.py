"""Jobs and flashcards over HTTP: POST /api/lectures/{id}/jobs,
GET /api/lectures/{id}/jobs/latest, GET /api/jobs/active, GET /api/jobs/{id}
and GET /api/lectures/{id}/content-counts
(FR-2, FR-17, FR-18, FR-19, FR-21, FR-22, FR-38, NFR-2a, SK-4, SK-8, SK-21, AR-4, AR-5, AR-14)."""

import asyncio
import logging
import time
import uuid
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import pymupdf
import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.main import app, lifespan
from app.modules.content.models import Flashcard
from app.modules.generation.models import Job
from app.modules.generation.port import GenerationOptions, Page
from app.modules.generation.providers import get_generator
from app.modules.generation import service
from app.modules.generation.service import JOB_TASKS, fail_interrupted_jobs
from tests.test_files import _log_in_new_user, _new_lecture, _upload
from tests.test_subjects import NOT_FOUND, _code

LECTURES = "/api/lectures"
JOBS = "/api/jobs"
FIXTURE = Path(__file__).resolve().parent / "fixtures" / "definisjoner.pdf"
JOB_FIELDS = {
    "id",
    "lecture_id",
    "kind",
    "status",
    "requested",
    "created",
    "discarded",
    "error_code",
    "started_at",
    "finished_at",
}
TRACKED_JOB_FIELDS = JOB_FIELDS | {"lecture_name"}


def pdf_with_pages(texts: list[str]) -> bytes:
    """A PDF with one page per text, wrapped over several lines."""
    document = pymupdf.open()
    for text in texts:
        document.new_page().insert_textbox(pymupdf.Rect(72, 72, 520, 770), text, fontsize=11)
    data = document.tobytes()
    document.close()
    return data


def definitions(terms: list[str]) -> str:
    return " ".join(f"{term} er et begrep i faget." for term in terms)


async def _start(client: AsyncClient, lecture_id: str, body: dict[str, Any] | None = None) -> Any:
    return await client.post(f"{LECTURES}/{lecture_id}/jobs", json=body or {"kind": "flashcards"})


async def _finish_jobs() -> None:
    while JOB_TASKS:
        await asyncio.gather(*list(JOB_TASKS))


async def _latest(client: AsyncClient, lecture_id: str) -> list[dict[str, Any]]:
    response = await client.get(f"{LECTURES}/{lecture_id}/jobs/latest")
    assert response.status_code == 200
    return response.json()


async def _card_count(client: AsyncClient, lecture_id: str) -> int:
    response = await client.get(f"{LECTURES}/{lecture_id}/content-counts")
    assert response.status_code == 200
    return response.json()["flashcards"]


async def _cards(engine: AsyncEngine) -> list[Flashcard]:
    async with async_sessionmaker(engine)() as session:
        return list(await session.scalars(select(Flashcard).order_by(Flashcard.created_at)))


@pytest.fixture
async def lecture(client: AsyncClient) -> str:
    """A lecture belonging to a logged-in student, with the fixed test file."""
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    assert (await _upload(client, lecture_id, FIXTURE.read_bytes(), "definisjoner.pdf")).status_code == 201
    return lecture_id


@pytest.fixture(autouse=True)
async def no_jobs_left(engine: AsyncEngine) -> AsyncIterator[None]:
    # Depends on engine, so it is torn down first: the jobs still running must
    # finish before the test database is closed (an autouse fixture without
    # this is torn down last, after engine.dispose()).
    yield
    await _finish_jobs()


async def test_fr38_forste_jobb_gir_202_running_og_lager_kortene(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    assert await _card_count(client, lecture) == 0
    response = await _start(client, lecture)
    assert response.status_code == 202
    body = response.json()
    assert set(body) == JOB_FIELDS
    assert body["status"] == "running"
    assert body["requested"] == 20
    assert body["kind"] == "flashcards"
    assert body["lecture_id"] == lecture
    assert body["created"] is None and body["discarded"] is None and body["finished_at"] is None

    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert job["id"] == body["id"]
    assert (job["status"], job["created"], job["discarded"], job["error_code"]) == ("done", 5, 0, None)
    assert job["finished_at"] is not None
    assert await _card_count(client, lecture) == 5

    cards = await _cards(engine)
    assert [(card.kind, card.front, card.page_no) for card in cards] == [
        ("concept", "Merkevare", 1),
        ("concept", "Segmentering", 1),
        ("concept", "Posisjonering", 1),
        ("concept", "A brand", 2),
        ("concept", "The marketing mix", 2),
    ]
    assert all(card.formula_flag is False for card in cards)


async def test_fr38_svaret_kommer_for_kortene_finnes_med_treg_generator(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    release = asyncio.Event()

    class SlowGenerator:
        async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
            await release.wait()
            return [
                {"kind": "qa", "front": "Hva?", "back": "Det.", "file_id": pages[0].file_id, "page_no": 1}
            ]

    app.dependency_overrides[get_generator] = SlowGenerator
    response = await _start(client, lecture)
    assert response.status_code == 202
    assert response.json()["status"] == "running"
    assert await _cards(engine) == []
    [job] = await _latest(client, lecture)
    assert job["status"] == "running"

    # One running job per lecture (SK-21).
    second = await _start(client, lecture)
    assert second.status_code == 409
    assert second.json() == {"error": {"code": "JOB_ALREADY_RUNNING", "details": {}}}

    release.set()
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["created"]) == ("done", 1)
    assert await _card_count(client, lecture) == 1


async def test_fr38_flere_enn_bedt_om_gir_de_forste_i_fil_side_plassering(
    client: AsyncClient, engine: AsyncEngine
) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    terms = [f"Begrep{number:02d}" for number in range(1, 26)]
    data = pdf_with_pages([definitions(terms[:10]), definitions(terms[10:])])
    assert (await _upload(client, lecture_id, data)).status_code == 201

    assert (await _start(client, lecture_id)).status_code == 202
    await _finish_jobs()
    [job] = await _latest(client, lecture_id)
    assert (job["created"], job["discarded"]) == (20, 0)
    assert [card.front for card in await _cards(engine)] == terms[:20]


async def test_fr38_taket_gjelder_over_to_filer_i_filrekkefolge(
    client: AsyncClient, engine: AsyncEngine
) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    first = [f"Forst{number:02d}" for number in range(1, 16)]
    second = [f"Andre{number:02d}" for number in range(1, 16)]
    assert (await _upload(client, lecture_id, pdf_with_pages([definitions(first)]), "a.pdf")).status_code == 201
    assert (await _upload(client, lecture_id, pdf_with_pages([definitions(second)]), "b.pdf")).status_code == 201

    assert (await _start(client, lecture_id)).status_code == 202
    await _finish_jobs()
    [job] = await _latest(client, lecture_id)
    assert job["created"] == 20
    assert [card.front for card in await _cards(engine)] == first + second[:5]


async def test_nfr17_demojobb_med_20_kort_tar_under_5_sekunder(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    terms = [f"Begrep{number:02d}" for number in range(1, 21)]
    assert (await _upload(client, lecture_id, pdf_with_pages([definitions(terms)]))).status_code == 201

    started = time.monotonic()
    assert (await _start(client, lecture_id)).status_code == 202
    await _finish_jobs()
    elapsed = time.monotonic() - started
    [job] = await _latest(client, lecture_id)
    assert (job["status"], job["created"]) == ("done", 20)
    assert elapsed < 5


@pytest.mark.parametrize("requested", [10, 20, 30])
async def test_fr17_omfanget_bestemmer_hvor_mange_kort_som_lages(
    client: AsyncClient, engine: AsyncEngine, requested: int
) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    terms = [f"Begrep{number:02d}" for number in range(1, 36)]
    assert (await _upload(client, lecture_id, pdf_with_pages([definitions(terms)]))).status_code == 201

    response = await _start(client, lecture_id, {"kind": "flashcards", "params": {"requested": requested}})
    assert response.status_code == 202
    assert response.json()["requested"] == requested
    await _finish_jobs()
    [job] = await _latest(client, lecture_id)
    assert (job["status"], job["requested"], job["created"]) == ("done", requested, requested)
    assert [card.front for card in await _cards(engine)] == terms[:requested]


async def test_fr17_dyp_etter_rask_lager_bare_de_nye(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    terms = [f"Begrep{number:02d}" for number in range(1, 13)]
    assert (await _upload(client, lecture_id, pdf_with_pages([definitions(terms)]))).status_code == 201

    response = await _start(client, lecture_id, {"kind": "flashcards", "params": {"requested": 10}})
    assert response.status_code == 202
    await _finish_jobs()
    assert await _card_count(client, lecture_id) == 10

    response = await _start(client, lecture_id, {"kind": "flashcards", "params": {"requested": 30}})
    assert response.json()["requested"] == 30
    await _finish_jobs()
    # Only the two cards that were not made before: fewer than chosen (FR-18).
    [job] = await _latest(client, lecture_id)
    assert (job["requested"], job["created"]) == (30, 2)
    assert await _card_count(client, lecture_id) == 12


async def test_fr19_lag_flere_med_samme_fil_lagrer_ingenting(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    before = [card.id for card in await _cards(engine)]

    assert (await _start(client, lecture)).status_code == 202
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["created"], job["discarded"]) == ("done", 0, 0)
    assert [card.id for card in await _cards(engine)] == before


async def test_fr19_nye_kort_legges_til_de_gamle(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    # A new file with two new terms and one that exists (in other case).
    new_file = pdf_with_pages([definitions(["Pris", "Kanal", "MERKEVARE"])])
    assert (await _upload(client, lecture, new_file, "nye.pdf")).status_code == 201

    await _start(client, lecture)
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert job["created"] == 2
    assert await _card_count(client, lecture) == 7
    assert [card.front for card in await _cards(engine)][-2:] == ["Pris", "Kanal"]


async def test_sk4_mock_invalid_forkaster_tre_av_fire_og_gir_faerre(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch, engine: AsyncEngine
) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "mock-invalid")
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    data = pdf_with_pages([definitions(["En", "To", "Tre", "Fire"])])
    assert (await _upload(client, lecture_id, data)).status_code == 201

    await _start(client, lecture_id)
    await _finish_jobs()
    [job] = await _latest(client, lecture_id)
    assert (job["status"], job["requested"], job["created"], job["discarded"]) == ("done", 20, 1, 3)
    assert [card.front for card in await _cards(engine)] == ["En"]


async def test_ar4_ingen_gyldige_gir_done_med_null(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    data = pdf_with_pages(["Markedsføring handler om kunden. Ingen definisjoner her."])
    assert (await _upload(client, lecture_id, data)).status_code == 201
    await _start(client, lecture_id)
    await _finish_jobs()
    [job] = await _latest(client, lecture_id)
    assert (job["status"], job["created"], job["discarded"]) == ("done", 0, 0)
    assert await _cards(engine) == []


async def test_fr21_generator_som_feiler_gir_failed_og_ingen_kort(
    client: AsyncClient, lecture: str, engine: AsyncEngine, caplog: pytest.LogCaptureFixture
) -> None:
    class BrokenGenerator:
        async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
            raise RuntimeError(pages[0].text)

    app.dependency_overrides[get_generator] = BrokenGenerator
    with caplog.at_level(logging.INFO):
        assert (await _start(client, lecture)).status_code == 202
        await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["error_code"], job["created"]) == ("failed", "GENERATION_FAILED", None)
    assert job["finished_at"] is not None
    assert await _cards(engine) == []
    assert await _card_count(client, lecture) == 0
    # Logged with the job id, never with the page text.
    assert job["id"] in caplog.text
    assert "Merkevare" not in caplog.text


async def test_fr21_port_som_feiler_endrer_ikke_antallet(client: AsyncClient, lecture: str) -> None:
    await _start(client, lecture)
    await _finish_jobs()
    assert await _card_count(client, lecture) == 5

    class BrokenGenerator:
        async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
            raise RuntimeError("modellen svarte ikke")

    app.dependency_overrides[get_generator] = BrokenGenerator
    await _start(client, lecture)
    await _finish_jobs()
    [job] = await _latest(client, lecture)
    assert (job["status"], job["error_code"]) == ("failed", "GENERATION_FAILED")
    assert await _card_count(client, lecture) == 5


async def test_fr21_tidsgrensen_gir_generation_timeout_og_ingen_kort(
    client: AsyncClient,
    lecture: str,
    engine: AsyncEngine,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    # The app uses 3 minutes; the test lowers the limit so it runs fast.
    assert service.GENERATION_TIMEOUT_SECONDS == 180
    monkeypatch.setattr(service, "GENERATION_TIMEOUT_SECONDS", 0.05)

    class SlowGenerator:
        async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
            await asyncio.sleep(5)
            return [{"kind": "qa", "front": pages[0].text, "back": "Det.", "file_id": pages[0].file_id, "page_no": 1}]

    app.dependency_overrides[get_generator] = SlowGenerator
    started = time.monotonic()
    with caplog.at_level(logging.INFO):
        assert (await _start(client, lecture)).status_code == 202
        await _finish_jobs()
    assert time.monotonic() - started < 2
    [job] = await _latest(client, lecture)
    assert (job["status"], job["error_code"], job["created"]) == ("failed", "GENERATION_TIMEOUT", None)
    assert job["finished_at"] is not None
    assert await _cards(engine) == []
    assert job["id"] in caplog.text
    assert "Merkevare" not in caplog.text


async def test_sk8_lagring_som_feiler_lagrer_ingenting(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    class OneCardGenerator:
        async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
            return [{"kind": "qa", "front": "Hva?", "back": "Det.", "file_id": pages[0].file_id, "page_no": 1}]

    async def failing_save(session: AsyncSession, items: list[Any]) -> None:
        raise RuntimeError("lagringsfeil")

    from app.modules.generation import registry

    content_type = registry.get_content_type("flashcards")
    patched = registry.ContentType(**{**content_type.__dict__, "save": failing_save})
    app.dependency_overrides[get_generator] = OneCardGenerator
    registry._types["flashcards"] = patched
    try:
        await _start(client, lecture)
        await _finish_jobs()
    finally:
        registry._types["flashcards"] = content_type
    [job] = await _latest(client, lecture)
    assert (job["status"], job["error_code"]) == ("failed", "GENERATION_FAILED")
    assert await _cards(engine) == []


async def test_fr21_timeouterror_fra_lagringen_gir_generation_failed(
    client: AsyncClient, lecture: str, engine: AsyncEngine
) -> None:
    # Only the model call has the time limit: a TimeoutError elsewhere is an ordinary failure.
    async def timing_out_save(session: AsyncSession, items: list[Any]) -> None:
        raise TimeoutError

    from app.modules.generation import registry

    content_type = registry.get_content_type("flashcards")
    patched = registry.ContentType(**{**content_type.__dict__, "save": timing_out_save})
    registry._types["flashcards"] = patched
    try:
        await _start(client, lecture)
        await _finish_jobs()
    finally:
        registry._types["flashcards"] = content_type
    [job] = await _latest(client, lecture)
    assert (job["status"], job["error_code"]) == ("failed", "GENERATION_FAILED")
    assert await _cards(engine) == []


async def test_sk21_pagaende_jobb_i_databasen_gir_409(
    client: AsyncClient, lecture: str, session: AsyncSession
) -> None:
    session.add(
        Job(lecture_id=uuid.UUID(lecture), kind="flashcards", params={}, status="running", requested=20)
    )
    await session.commit()
    response = await _start(client, lecture)
    assert response.status_code == 409
    assert _code(response) == "JOB_ALREADY_RUNNING"


async def test_sk21_unik_indeks_gir_ogsa_409(
    client: AsyncClient, lecture: str, session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Two requests that both pass the check: the index stops the second.
    from app.modules.generation import service

    session.add(
        Job(lecture_id=uuid.UUID(lecture), kind="flashcards", params={}, status="running", requested=20)
    )
    await session.commit()

    async def no_running_job(_session: AsyncSession, _lecture_id: uuid.UUID) -> bool:
        return False

    monkeypatch.setattr(service, "lecture_has_running_job", no_running_job)
    response = await _start(client, lecture)
    assert response.status_code == 409
    assert _code(response) == "JOB_ALREADY_RUNNING"
    async with async_sessionmaker(session.bind)() as other:
        assert await other.scalar(select(func.count()).select_from(Job)) == 1


async def test_fr38_forelesning_uten_filer_gir_422(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    lecture_id = await _new_lecture(client)
    response = await _start(client, lecture_id)
    assert response.status_code == 422
    assert response.json() == {"error": {"code": "LECTURE_HAS_NO_FILES", "details": {}}}
    assert await _latest(client, lecture_id) == []


@pytest.mark.parametrize(
    "body",
    [
        {"kind": "quiz"},
        {"kind": "ukjent"},
        {},
        {"kind": "flashcards", "params": {"requested": 15}},
        {"kind": "flashcards", "params": {"requested": 0}},
        {"kind": "flashcards", "params": {"requested": "mange"}},
    ],
)
async def test_fr38_ukjent_kind_eller_antall_gir_422(
    client: AsyncClient, lecture: str, body: dict[str, Any]
) -> None:
    response = await client.post(f"{LECTURES}/{lecture}/jobs", json=body)
    assert response.status_code == 422
    assert _code(response) == "VALIDATION_ERROR"
    assert await _latest(client, lecture) == []


async def test_fr4_andres_forelesning_gir_404(client: AsyncClient, lecture: str) -> None:
    await _log_in_new_user(client, "ola@eksempel.no")
    for response in (
        await _start(client, lecture),
        await client.get(f"{LECTURES}/{lecture}/jobs/latest"),
        await client.get(f"{LECTURES}/{lecture}/content-counts"),
        await _start(client, str(uuid.uuid4())),
        await client.get(f"{LECTURES}/ikke-en-id/content-counts"),
    ):
        assert response.status_code == 404
        assert response.json() == NOT_FOUND


async def test_fr4_uten_innlogging_gir_401(client: AsyncClient, lecture: str) -> None:
    client.cookies.clear()
    assert (await _start(client, lecture)).status_code == 401
    assert (await client.get(f"{LECTURES}/{lecture}/jobs/latest")).status_code == 401
    assert (await client.get(f"{LECTURES}/{lecture}/content-counts")).status_code == 401


async def test_ar4_latest_gir_nyeste_jobb_per_kind(client: AsyncClient, lecture: str) -> None:
    first = (await _start(client, lecture)).json()
    await _finish_jobs()
    second = (await _start(client, lecture)).json()
    await _finish_jobs()
    latest = await _latest(client, lecture)
    assert [job["id"] for job in latest] == [second["id"]]
    assert first["id"] != second["id"]


async def test_ar14_omstart_gjor_pagaende_jobber_til_failed(
    client: AsyncClient, lecture: str, session: AsyncSession
) -> None:
    session.add(
        Job(lecture_id=uuid.UUID(lecture), kind="flashcards", params={}, status="running", requested=20)
    )
    await session.commit()
    # The lifespan runs it before the app takes requests (with the test database).
    async with lifespan(app):
        pass
    [job] = await _latest(client, lecture)
    assert (job["status"], job["error_code"]) == ("failed", "JOB_INTERRUPTED")
    assert job["finished_at"] is not None
    # Nothing left to change the next time.
    assert await fail_interrupted_jobs(async_sessionmaker(session.bind)) == 0
    # A new job can start.
    assert (await _start(client, lecture)).status_code == 202


async def test_fr38_tellingen_teller_bare_forelesningens_filer(client: AsyncClient, lecture: str) -> None:
    other = await _new_lecture(client)
    assert (await _upload(client, other, FIXTURE.read_bytes())).status_code == 201
    await _start(client, lecture)
    await _finish_jobs()
    assert await _card_count(client, lecture) == 5
    assert await _card_count(client, other) == 0


async def _active(client: AsyncClient) -> list[dict[str, Any]]:
    response = await client.get(f"{JOBS}/active")
    assert response.status_code == 200
    return response.json()


class _WaitingGenerator:
    """Waits until the test releases it, so the job stays running."""

    release = asyncio.Event()

    async def generate(self, kind: str, pages: list[Page], options: GenerationOptions) -> list[dict[str, Any]]:
        await self.release.wait()
        return []


async def test_ar5_active_gir_bare_egne_pagaende_jobber(client: AsyncClient) -> None:
    _WaitingGenerator.release = asyncio.Event()
    app.dependency_overrides[get_generator] = _WaitingGenerator

    await _log_in_new_user(client, "kari@eksempel.no")
    karis = await _new_lecture(client)
    assert (await _upload(client, karis, FIXTURE.read_bytes())).status_code == 201
    karis_job = (await _start(client, karis)).json()
    karis_cookies = dict(client.cookies)

    await _log_in_new_user(client, "ola@eksempel.no")
    olas = await _new_lecture(client)
    assert (await _upload(client, olas, FIXTURE.read_bytes())).status_code == 201
    olas_job = (await _start(client, olas)).json()

    [job] = await _active(client)
    assert set(job) == TRACKED_JOB_FIELDS
    assert (job["id"], job["status"], job["lecture_id"]) == (olas_job["id"], "running", olas)
    assert job["lecture_name"]

    client.cookies.clear()
    client.cookies.update(karis_cookies)
    [job] = await _active(client)
    assert job["id"] == karis_job["id"]

    _WaitingGenerator.release.set()
    await _finish_jobs()
    assert await _active(client) == []


async def test_ar5_active_er_sortert_eldste_forst(client: AsyncClient) -> None:
    _WaitingGenerator.release = asyncio.Event()
    app.dependency_overrides[get_generator] = _WaitingGenerator
    await _log_in_new_user(client)
    first = await _new_lecture(client)
    second = await _new_lecture(client)
    for lecture_id in (first, second):
        assert (await _upload(client, lecture_id, FIXTURE.read_bytes())).status_code == 201
    first_job = (await _start(client, first)).json()
    second_job = (await _start(client, second)).json()
    assert [job["id"] for job in await _active(client)] == [first_job["id"], second_job["id"]]
    _WaitingGenerator.release.set()
    await _finish_jobs()


async def test_ar5_jobb_etter_id_gir_resultatet_med_forelesningsnavn(client: AsyncClient, lecture: str) -> None:
    started = (await _start(client, lecture)).json()
    await _finish_jobs()
    response = await client.get(f"{JOBS}/{started['id']}")
    assert response.status_code == 200
    job = response.json()
    assert set(job) == TRACKED_JOB_FIELDS
    assert (job["id"], job["status"], job["created"]) == (started["id"], "done", 5)
    lecture_response = await client.get(f"{LECTURES}/{lecture}")
    assert job["lecture_name"] == lecture_response.json()["name"]


async def test_ar5_andres_ukjent_eller_ugyldig_jobb_gir_404(client: AsyncClient, lecture: str) -> None:
    started = (await _start(client, lecture)).json()
    await _finish_jobs()
    await _log_in_new_user(client, "ola@eksempel.no")
    for job_id in (started["id"], str(uuid.uuid4()), "ikke-en-id"):
        response = await client.get(f"{JOBS}/{job_id}")
        assert response.status_code == 404
        assert response.json() == NOT_FOUND
    assert await _active(client) == []


async def test_ar5_jobbrutene_krever_innlogging(client: AsyncClient, lecture: str) -> None:
    started = (await _start(client, lecture)).json()
    await _finish_jobs()
    client.cookies.clear()
    assert (await client.get(f"{JOBS}/active")).status_code == 401
    assert (await client.get(f"{JOBS}/{started['id']}")).status_code == 401
