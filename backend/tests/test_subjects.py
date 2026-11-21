"""Subjects: POST/GET /api/subjects and GET/PATCH /api/subjects/{id} (FR-6, FR-4, UX-DR3)."""

import uuid
from datetime import date
from typing import Any

import pytest
from httpx import AsyncClient, Response
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.modules.identity.models import User
from app.modules.subjects.models import Subject
from app.modules.subjects.service import next_color_index

SUBJECTS = "/api/subjects"
PASSWORD = "hemmelig1"
NOT_FOUND = {"error": {"code": "NOT_FOUND", "details": {}}}


async def _log_in_new_user(client: AsyncClient, email: str = "klara@eksempel.no") -> str:
    """Register (which also logs in, with the cookie on the client). Returns the user id."""
    client.cookies.clear()
    response = await client.post("/api/identity/register", json={"email": email, "password": PASSWORD})
    assert response.status_code == 201
    return response.json()["id"]


async def _create(client: AsyncClient, name: str = "Markedsføring", exam_date: str = "2026-12-04") -> Response:
    return await client.post(SUBJECTS, json={"name": name, "exam_date": exam_date})


def _code(response: Response) -> str:
    return response.json()["error"]["code"]


async def _count_subjects(engine: AsyncEngine) -> int:
    async with async_sessionmaker(engine)() as session:
        return await session.scalar(select(func.count()).select_from(Subject)) or 0


async def test_fr6_opprett_emne_trimmer_navnet(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    response = await _create(client, " Markedsføring ", "2026-12-04")
    assert response.status_code == 201
    body = response.json()
    assert set(body) == {"id", "name", "exam_date", "color_index", "lecture_count", "created_at"}
    assert body["name"] == "Markedsføring"
    assert body["exam_date"] == "2026-12-04"
    assert body["color_index"] == 0
    assert body["lecture_count"] == 0
    uuid.UUID(body["id"])


async def test_fr6_passert_eksamensdato_og_like_navn_godtas(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    first = await _create(client, "Organisasjon", "2020-01-15")
    second = await _create(client, "Organisasjon", "2020-01-15")
    assert first.status_code == second.status_code == 201
    assert first.json()["id"] != second.json()["id"]


@pytest.mark.parametrize("name", ["", "   ", "\t\n "])
async def test_fr6_tomt_navn_gir_name_required_og_lagrer_ingenting(
    client: AsyncClient, engine: AsyncEngine, name: str
) -> None:
    await _log_in_new_user(client)
    response = await _create(client, name)
    assert response.status_code == 422
    assert response.json() == {"error": {"code": "NAME_REQUIRED", "details": {}}}
    assert await _count_subjects(engine) == 0


async def test_fr6_navn_paa_200_tegn_godtas_201_gir_validation_error(
    client: AsyncClient, engine: AsyncEngine
) -> None:
    await _log_in_new_user(client)
    assert (await _create(client, "æ" * 200)).status_code == 201
    too_long = await _create(client, "æ" * 201)
    assert too_long.status_code == 422
    assert _code(too_long) == "VALIDATION_ERROR"
    assert await _count_subjects(engine) == 1


@pytest.mark.parametrize(
    "exam_date", ["31.02.2026", "2026-02-31", "04.12.2026", "", "2026-12-04T00:00:00", 1764806400, None]
)
async def test_fr6_ugyldig_eksamensdato_gir_validation_error(
    client: AsyncClient, engine: AsyncEngine, exam_date: Any
) -> None:
    await _log_in_new_user(client)
    response = await client.post(SUBJECTS, json={"name": "Markedsføring", "exam_date": exam_date})
    assert response.status_code == 422
    assert _code(response) == "VALIDATION_ERROR"
    assert "exam_date" in response.json()["error"]["details"]["fields"]
    assert await _count_subjects(engine) == 0


async def test_uxdr3_sju_emner_faar_fargene_0_til_5_og_saa_0(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    colors = [(await _create(client, f"Emne {n}")).json()["color_index"] for n in range(7)]
    assert colors == [0, 1, 2, 3, 4, 5, 0]


async def test_uxdr3_nytt_emne_faar_forste_ledige_farge(client: AsyncClient, engine: AsyncEngine) -> None:
    user_id = uuid.UUID(await _log_in_new_user(client))
    # Existing subjects with colours 0 and 2 (as after a deleted subject in story 2.5).
    async with async_sessionmaker(engine)() as session:
        for color in (0, 2):
            session.add(Subject(user_id=user_id, name=f"Farge {color}", exam_date=date(2026, 12, 4), color_index=color))
        await session.commit()
    assert (await _create(client)).json()["color_index"] == 1


@pytest.mark.parametrize(
    ("used", "expected"),
    [([], 0), ([0], 1), ([0, 2], 1), ([1, 2, 3, 4, 5], 0), ([0, 1, 2, 3, 4, 5], 0), ([0, 1, 2, 3, 4, 5, 0], 1)],
)
def test_uxdr3_fargevalget(used: list[int], expected: int) -> None:
    assert next_color_index(used) == expected


async def test_uxdr3_fargene_regnes_per_bruker(client: AsyncClient) -> None:
    await _log_in_new_user(client, "ola@eksempel.no")
    await _create(client)
    await _log_in_new_user(client, "klara@eksempel.no")
    assert (await _create(client)).json()["color_index"] == 0


async def test_fr6_lista_viser_bare_egne_emner_i_opprettingsrekkefolge(client: AsyncClient) -> None:
    await _log_in_new_user(client, "ola@eksempel.no")
    await _create(client, "Olas emne")
    await _log_in_new_user(client, "klara@eksempel.no")
    names = ["Markedsføring", "Samfunnsøkonomi", "Organisasjon og ledelse"]
    for name in names:
        await _create(client, name)

    response = await client.get(SUBJECTS)
    assert response.status_code == 200
    body = response.json()
    assert [subject["name"] for subject in body] == names
    assert all(subject["lecture_count"] == 0 for subject in body)
    assert [subject["color_index"] for subject in body] == [0, 1, 2]


async def test_fr6_tom_liste_for_ny_bruker(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    response = await client.get(SUBJECTS)
    assert response.status_code == 200
    assert response.json() == []


async def test_fr6_hent_eget_emne(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    created = (await _create(client)).json()
    response = await client.get(f"{SUBJECTS}/{created['id']}")
    assert response.status_code == 200
    assert response.json() == created


async def test_fr6_endre_navn_og_eksamensdato(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    created = (await _create(client)).json()
    url = f"{SUBJECTS}/{created['id']}"

    renamed = await client.patch(url, json={"name": "  Markedsføring 2 "})
    assert renamed.status_code == 200
    assert renamed.json()["name"] == "Markedsføring 2"
    assert renamed.json()["exam_date"] == "2026-12-04"

    moved = await client.patch(url, json={"exam_date": "2026-12-11"})
    assert moved.status_code == 200
    assert moved.json()["name"] == "Markedsføring 2"
    assert moved.json()["exam_date"] == "2026-12-11"

    fetched = (await client.get(url)).json()
    assert fetched["name"] == "Markedsføring 2"
    assert fetched["exam_date"] == "2026-12-11"
    assert fetched["created_at"] == created["created_at"]


async def test_fr6_patch_med_tomt_navn_gir_name_required_og_endrer_ingenting(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    created = (await _create(client)).json()
    url = f"{SUBJECTS}/{created['id']}"
    response = await client.patch(url, json={"name": "   ", "exam_date": "2027-01-01"})
    assert response.status_code == 422
    assert _code(response) == "NAME_REQUIRED"
    assert (await client.get(url)).json() == created


async def test_fr6_patch_med_201_tegn_gir_validation_error_og_endrer_ingenting(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    created = (await _create(client)).json()
    url = f"{SUBJECTS}/{created['id']}"
    response = await client.patch(url, json={"name": "æ" * 201})
    assert response.status_code == 422
    assert _code(response) == "VALIDATION_ERROR"
    assert (await client.get(url)).json()["name"] == "Markedsføring"


async def test_fr6_patch_med_ugyldig_dato_gir_validation_error(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    created = (await _create(client)).json()
    response = await client.patch(f"{SUBJECTS}/{created['id']}", json={"exam_date": "2026-02-31"})
    assert response.status_code == 422
    assert _code(response) == "VALIDATION_ERROR"


async def test_uxdr3_patch_med_color_index_ignoreres(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    created = (await _create(client)).json()
    url = f"{SUBJECTS}/{created['id']}"
    response = await client.patch(url, json={"color_index": 4})
    assert response.status_code == 200
    assert response.json()["color_index"] == 0
    assert (await client.get(url)).json()["color_index"] == 0


@pytest.mark.parametrize("method", ["GET", "PATCH"])
async def test_fr4_andres_emne_og_ukjent_id_gir_lik_404(client: AsyncClient, method: str) -> None:
    await _log_in_new_user(client, "ola@eksempel.no")
    ola_subject = (await _create(client, "Olas emne")).json()
    await _log_in_new_user(client, "klara@eksempel.no")

    body = {"name": "Kapret"} if method == "PATCH" else None
    others = await client.request(method, f"{SUBJECTS}/{ola_subject['id']}", json=body)
    unknown = await client.request(method, f"{SUBJECTS}/{uuid.uuid4()}", json=body)
    malformed = await client.request(method, f"{SUBJECTS}/ikke-en-id", json=body)
    for response in (others, unknown, malformed):
        assert response.status_code == 404
        assert response.json() == NOT_FOUND
    assert others.content == unknown.content


async def test_fr4_andres_emne_er_uendret_etter_patch(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client, "ola@eksempel.no")
    ola_subject = (await _create(client, "Olas emne")).json()
    await _log_in_new_user(client, "klara@eksempel.no")
    await client.patch(f"{SUBJECTS}/{ola_subject['id']}", json={"name": "Kapret"})
    async with async_sessionmaker(engine)() as session:
        subject = await session.get(Subject, uuid.UUID(ola_subject["id"]))
        assert subject is not None and subject.name == "Olas emne"


@pytest.mark.parametrize(
    ("method", "path"),
    [("POST", SUBJECTS), ("GET", SUBJECTS), ("GET", f"{SUBJECTS}/{uuid.uuid4()}"), ("PATCH", f"{SUBJECTS}/{uuid.uuid4()}")],
)
async def test_fr4_uten_innlogging_gir_401(client: AsyncClient, method: str, path: str) -> None:
    client.cookies.clear()
    body = {"name": "Markedsføring", "exam_date": "2026-12-04"} if method in ("POST", "PATCH") else None
    response = await client.request(method, path, json=body)
    assert response.status_code == 401
    assert response.json() == {"error": {"code": "UNAUTHENTICATED", "details": {}}}


async def test_ar7_sletting_av_bruker_sletter_emnene(client: AsyncClient, engine: AsyncEngine) -> None:
    klara_id = uuid.UUID(await _log_in_new_user(client, "klara@eksempel.no"))
    await _create(client)
    await _create(client)
    await _log_in_new_user(client, "ola@eksempel.no")
    await _create(client, "Olas emne")

    async with async_sessionmaker(engine)() as session:
        await session.execute(delete(User).where(User.id == klara_id))
        await session.commit()
        remaining = list(await session.scalars(select(Subject.name)))
    assert remaining == ["Olas emne"]
