"""Lectures: POST/GET /api/subjects/{id}/lectures and GET/PATCH /api/lectures/{id} (FR-7, FR-15, FR-4)."""

import uuid
from typing import Any

import pytest
from httpx import AsyncClient, Response
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.modules.identity.models import User
from app.modules.subjects.models import Lecture, Subject
from tests.test_subjects import NOT_FOUND, _code, _create, _log_in_new_user

SUBJECTS = "/api/subjects"
LECTURES = "/api/lectures"


async def _new_subject(client: AsyncClient, name: str = "Markedsføring") -> str:
    return (await _create(client, name)).json()["id"]


async def _create_lecture(
    client: AsyncClient, subject_id: str, name: str = "Uke 37: Merkevare", lecture_date: Any = "2026-09-11"
) -> Response:
    return await client.post(f"{SUBJECTS}/{subject_id}/lectures", json={"name": name, "date": lecture_date})


async def _count_lectures(engine: AsyncEngine) -> int:
    async with async_sessionmaker(engine)() as session:
        return await session.scalar(select(func.count()).select_from(Lecture)) or 0


async def test_fr7_opprett_forelesning_trimmer_navnet_og_teller(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    response = await _create_lecture(client, subject_id, " Uke 37: Merkevare ", "2026-09-11")
    assert response.status_code == 201
    body = response.json()
    assert set(body) == {"id", "subject_id", "name", "date", "created_at"}
    assert body["name"] == "Uke 37: Merkevare"
    assert body["date"] == "2026-09-11"
    assert body["subject_id"] == subject_id
    uuid.UUID(body["id"])

    assert (await client.get(f"{SUBJECTS}/{subject_id}")).json()["lecture_count"] == 1
    assert [s["lecture_count"] for s in (await client.get(SUBJECTS)).json()] == [1]


async def test_fr7_lecture_count_er_riktig_per_emne_i_lista(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    first = await _new_subject(client, "Markedsføring")
    second = await _new_subject(client, "Samfunnsøkonomi")
    third = await _new_subject(client, "Organisasjon")
    for _ in range(3):
        await _create_lecture(client, first)
    await _create_lecture(client, third)

    counts = {s["id"]: s["lecture_count"] for s in (await client.get(SUBJECTS)).json()}
    assert counts == {first: 3, second: 0, third: 1}
    patched = await client.patch(f"{SUBJECTS}/{first}", json={"name": "Markedsføring 2"})
    assert patched.json()["lecture_count"] == 3


async def test_fr7_like_navn_godtas(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    first = await _create_lecture(client, subject_id, "Uke 37")
    second = await _create_lecture(client, subject_id, "Uke 37")
    assert first.status_code == second.status_code == 201
    assert first.json()["id"] != second.json()["id"]


async def test_fr15_sortert_paa_dato_saa_opprettingstid(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    late = (await _create_lecture(client, subject_id, "Sen", "2026-09-18")).json()
    early_first = (await _create_lecture(client, subject_id, "Tidlig 1", "2026-09-11")).json()
    early_second = (await _create_lecture(client, subject_id, "Tidlig 2", "2026-09-11")).json()

    response = await client.get(f"{SUBJECTS}/{subject_id}/lectures")
    assert response.status_code == 200
    assert [lecture["id"] for lecture in response.json()] == [early_first["id"], early_second["id"], late["id"]]


async def test_fr15_tom_liste_for_emne_uten_forelesninger(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    response = await client.get(f"{SUBJECTS}/{subject_id}/lectures")
    assert response.status_code == 200
    assert response.json() == []


async def test_fr15_lista_viser_bare_forelesningene_i_emnet(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    first = await _new_subject(client, "Markedsføring")
    second = await _new_subject(client, "Samfunnsøkonomi")
    await _create_lecture(client, first, "I første")
    await _create_lecture(client, second, "I andre")
    names = [lecture["name"] for lecture in (await client.get(f"{SUBJECTS}/{first}/lectures")).json()]
    assert names == ["I første"]


@pytest.mark.parametrize("name", ["", "   ", "\t\n "])
async def test_fr7_tomt_navn_gir_name_required_og_lagrer_ingenting(
    client: AsyncClient, engine: AsyncEngine, name: str
) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    response = await _create_lecture(client, subject_id, name)
    assert response.status_code == 422
    assert response.json() == {"error": {"code": "NAME_REQUIRED", "details": {}}}
    assert await _count_lectures(engine) == 0


async def test_fr7_navn_paa_201_tegn_gir_validation_error(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    assert (await _create_lecture(client, subject_id, "æ" * 200)).status_code == 201
    too_long = await _create_lecture(client, subject_id, "æ" * 201)
    assert too_long.status_code == 422
    assert _code(too_long) == "VALIDATION_ERROR"
    assert await _count_lectures(engine) == 1


@pytest.mark.parametrize(
    "lecture_date", ["31.02.2026", "2026-02-31", "11.09.2026", "", "2026-09-11T00:00:00", 1757548800, None]
)
async def test_fr7_ugyldig_dato_gir_validation_error(
    client: AsyncClient, engine: AsyncEngine, lecture_date: Any
) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    response = await _create_lecture(client, subject_id, lecture_date=lecture_date)
    assert response.status_code == 422
    assert _code(response) == "VALIDATION_ERROR"
    assert "date" in response.json()["error"]["details"]["fields"]
    assert await _count_lectures(engine) == 0


async def test_fr7_manglende_dato_gir_validation_error(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    response = await client.post(f"{SUBJECTS}/{subject_id}/lectures", json={"name": "Uke 37"})
    assert response.status_code == 422
    assert "date" in response.json()["error"]["details"]["fields"]
    assert await _count_lectures(engine) == 0


async def test_fr7_hent_egen_forelesning(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    created = (await _create_lecture(client, await _new_subject(client))).json()
    response = await client.get(f"{LECTURES}/{created['id']}")
    assert response.status_code == 200
    assert response.json() == created


async def test_fr7_endre_navn_og_dato(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    created = (await _create_lecture(client, subject_id, "Uke 37", "2026-09-11")).json()
    url = f"{LECTURES}/{created['id']}"

    renamed = await client.patch(url, json={"name": "  Uke 37: Merkevare "})
    assert renamed.status_code == 200
    assert renamed.json()["name"] == "Uke 37: Merkevare"
    assert renamed.json()["date"] == "2026-09-11"

    moved = await client.patch(url, json={"date": "2026-09-18"})
    assert moved.status_code == 200
    assert moved.json()["name"] == "Uke 37: Merkevare"
    assert moved.json()["date"] == "2026-09-18"
    assert (await client.get(url)).json()["created_at"] == created["created_at"]


async def test_fr15_endret_dato_flytter_forelesningen_forst(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    first = (await _create_lecture(client, subject_id, "Uke 37", "2026-09-11")).json()
    second = (await _create_lecture(client, subject_id, "Uke 38", "2026-09-18")).json()
    await client.patch(f"{LECTURES}/{second['id']}", json={"date": "2026-08-21"})
    ids = [lecture["id"] for lecture in (await client.get(f"{SUBJECTS}/{subject_id}/lectures")).json()]
    assert ids == [second["id"], first["id"]]


async def test_fr7_patch_med_tomt_navn_gir_name_required_og_endrer_ingenting(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    created = (await _create_lecture(client, await _new_subject(client))).json()
    url = f"{LECTURES}/{created['id']}"
    response = await client.patch(url, json={"name": "  ", "date": "2027-01-01"})
    assert response.status_code == 422
    assert _code(response) == "NAME_REQUIRED"
    assert (await client.get(url)).json() == created


async def test_fr7_patch_med_ugyldig_dato_gir_validation_error(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    created = (await _create_lecture(client, await _new_subject(client))).json()
    response = await client.patch(f"{LECTURES}/{created['id']}", json={"date": "31.02.2026"})
    assert response.status_code == 422
    assert "date" in response.json()["error"]["details"]["fields"]


async def test_fr7_patch_med_subject_id_ignoreres(client: AsyncClient) -> None:
    await _log_in_new_user(client)
    subject_id = await _new_subject(client)
    other_subject = await _new_subject(client, "Samfunnsøkonomi")
    created = (await _create_lecture(client, subject_id)).json()
    response = await client.patch(f"{LECTURES}/{created['id']}", json={"subject_id": other_subject})
    assert response.status_code == 200
    assert response.json()["subject_id"] == subject_id


@pytest.mark.parametrize("method", ["GET", "POST"])
async def test_fr4_andres_emne_gir_404_paa_forelesningslista(
    client: AsyncClient, engine: AsyncEngine, method: str
) -> None:
    await _log_in_new_user(client, "ola@eksempel.no")
    ola_subject = await _new_subject(client, "Olas emne")
    await _create_lecture(client, ola_subject, "Olas forelesning")
    await _log_in_new_user(client, "klara@eksempel.no")

    body = {"name": "Kapret", "date": "2026-09-11"} if method == "POST" else None
    others = await client.request(method, f"{SUBJECTS}/{ola_subject}/lectures", json=body)
    unknown = await client.request(method, f"{SUBJECTS}/{uuid.uuid4()}/lectures", json=body)
    malformed = await client.request(method, f"{SUBJECTS}/ikke-en-id/lectures", json=body)
    for response in (others, unknown, malformed):
        assert response.status_code == 404
        assert response.json() == NOT_FOUND
    assert await _count_lectures(engine) == 1


@pytest.mark.parametrize("method", ["GET", "PATCH"])
async def test_fr4_andres_forelesning_og_ukjent_id_gir_lik_404(
    client: AsyncClient, engine: AsyncEngine, method: str
) -> None:
    await _log_in_new_user(client, "ola@eksempel.no")
    ola_lecture = (await _create_lecture(client, await _new_subject(client, "Olas emne"), "Olas forelesning")).json()
    await _log_in_new_user(client, "klara@eksempel.no")
    # Klara has a subject too, so the lookup is not just "any subject".
    await _create_lecture(client, await _new_subject(client), "Klaras forelesning")

    body = {"name": "Kapret"} if method == "PATCH" else None
    others = await client.request(method, f"{LECTURES}/{ola_lecture['id']}", json=body)
    unknown = await client.request(method, f"{LECTURES}/{uuid.uuid4()}", json=body)
    malformed = await client.request(method, f"{LECTURES}/ikke-en-id", json=body)
    for response in (others, unknown, malformed):
        assert response.status_code == 404
        assert response.json() == NOT_FOUND
    assert others.content == unknown.content

    async with async_sessionmaker(engine)() as session:
        lecture = await session.get(Lecture, uuid.UUID(ola_lecture["id"]))
        assert lecture is not None and lecture.name == "Olas forelesning"


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("POST", f"{SUBJECTS}/{uuid.uuid4()}/lectures"),
        ("GET", f"{SUBJECTS}/{uuid.uuid4()}/lectures"),
        ("GET", f"{LECTURES}/{uuid.uuid4()}"),
        ("PATCH", f"{LECTURES}/{uuid.uuid4()}"),
    ],
)
async def test_fr4_uten_innlogging_gir_401(client: AsyncClient, method: str, path: str) -> None:
    client.cookies.clear()
    body = {"name": "Uke 37", "date": "2026-09-11"} if method in ("POST", "PATCH") else None
    response = await client.request(method, path, json=body)
    assert response.status_code == 401
    assert response.json() == {"error": {"code": "UNAUTHENTICATED", "details": {}}}


async def test_ar7_sletting_av_emne_sletter_forelesningene(client: AsyncClient, engine: AsyncEngine) -> None:
    await _log_in_new_user(client)
    doomed = await _new_subject(client, "Slettes")
    kept = await _new_subject(client, "Beholdes")
    await _create_lecture(client, doomed, "Borte 1")
    await _create_lecture(client, doomed, "Borte 2")
    await _create_lecture(client, kept, "Igjen")

    async with async_sessionmaker(engine)() as session:
        await session.execute(delete(Subject).where(Subject.id == uuid.UUID(doomed)))
        await session.commit()
        remaining = list(await session.scalars(select(Lecture.name)))
    assert remaining == ["Igjen"]


async def test_ar7_sletting_av_bruker_sletter_forelesningene(client: AsyncClient, engine: AsyncEngine) -> None:
    klara_id = uuid.UUID(await _log_in_new_user(client, "klara@eksempel.no"))
    await _create_lecture(client, await _new_subject(client), "Klaras")
    await _log_in_new_user(client, "ola@eksempel.no")
    await _create_lecture(client, await _new_subject(client, "Olas emne"), "Olas")

    async with async_sessionmaker(engine)() as session:
        await session.execute(delete(User).where(User.id == klara_id))
        await session.commit()
        remaining = list(await session.scalars(select(Lecture.name)))
    assert remaining == ["Olas"]
