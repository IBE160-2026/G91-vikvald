---
title: 'Story 1.1: Sett opp skjelettet som starter med én kommando'
type: 'feature'
created: '2026-11-20'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-G91-vikvald-2026-11-14/ARCHITECTURE-SPINE.md'
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** Repoet har ingen kode ennå. Sensor skal kunne klone repoet og starte hele appen med `docker compose up`, uten nøkler og uten `.env`, og alle senere stories trenger en felles grunnmur å bygge på (story 1.1 i `epics.md`).

**Approach:** Lag et skjelett med tre Docker-tjenester (`db` Postgres 16, `backend` FastAPI, `frontend` Next.js) der bare port 3000 er åpen. Backenden kjører Alembic og så Uvicorn med én prosess og har `/api/health`. Frontenden sender `/api/*` videre med `rewrites` og viser en enkel startside. Tre testkommandoer (pytest, Vitest, Playwright med axe) går grønt, og README forklarer oppstart, utvikling og testing.

## Boundaries & Constraints

**Always:**
- Versjonene fra arkitekturen: Python 3.12 (`python:3.12-slim`), FastAPI 0.162.7, Uvicorn 0.54.0, SQLAlchemy 2.1.8, Alembic 1.20.1, asyncpg 0.32.0, aiosqlite 0.22.1, pydantic-settings 2.16.3, pytest 9.2.0, pytest-asyncio 1.5.0, httpx 0.28.1; Node 22 (`node:22-alpine`), Next.js 16.4.6, React 19.3.1, TypeScript 5.9.3, Vitest 5.1.0, Playwright 1.65.1, @axe-core/playwright 4.14.0. Låst i `uv.lock` og `package-lock.json`.
- `frontend/package.json` har `"engines": { "node": "22.x" }`, og `.nvmrc` i rota har `22` (avgjørelse 6 i `autonom-kjoring.md`).
- Kode, variabelnavn og kommentarer på engelsk. Testnavn har krav-ID-en (AR-17), slik epics.md viser: `test_nfr1_health_svarer_ok`, `test_ar13_sqlite_foreign_keys_er_paa`.
- Backend logger til stdout. Uvicorn startes med nøyaktig én prosess (ingen `--reload`, ingen `--workers` > 1).
- Ingen hemmeligheter i repoet. Postgres-passordet er en lokal standardverdi som kan overstyres i miljøet.

**Never:**
- Ingen `proxy.ts`, ingen Caddy, ingen CORS-oppsett, ingen `NEXT_PUBLIC_`-variabler.
- Ingen databasetabeller (de lages i story 1.4). Ingen feilliste i `core/errors.py`, ingen `/api/config`, ingen `LLM_PROVIDER`-sjekk, ingen Tailwind/designtokens, ingen CI (det er story 1.2–1.4).
- Ingen åpne porter ut av Docker utenom 3000 i `docker-compose.yml`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Helse OK | `GET /api/health`, databasen svarer på `SELECT 1` | `200 {"status": "ok"}` | Ingen |
| Database nede | `GET /api/health`, tilkoblingen feiler | `503 {"error": {"code": "DATABASE_UNAVAILABLE", "details": {}}}` | Feilen logges til stdout, ingen stakkspor i svaret |
| Helse via frontend | `GET http://localhost:3000/api/health` | Samme svar som backenden, gjennom `rewrites` | Ingen |
| Startside | `GET http://localhost:3000/` | `<html lang="nb">`, én `h1` «Studiekamerat» i `<main>` | Ingen |

</intent-contract>

## Code Map

- `backend/pyproject.toml`, `backend/uv.lock`, `backend/.python-version` -- prosjekt og låste pakker (ny)
- `backend/app/main.py` -- FastAPI-appen, logging til stdout, monterer helseruten (ny)
- `backend/app/core/config.py` -- pydantic-settings: `APP_ENV`, `DATABASE_URL` (ny; story 1.3 utvider)
- `backend/app/core/db.py` -- `make_engine(url)` med `PRAGMA foreign_keys=ON` for SQLite, `SessionLocal`, `get_session` (ny)
- `backend/app/core/health.py` -- ruten `GET /api/health` (ny)
- `backend/app/core/logging.json` -- loggoppsett for Uvicorn og appen, alt til stdout (ny)
- `backend/app/modules/__init__.py` -- tom pakke, modulene kommer fra story 1.4 (ny)
- `backend/alembic.ini`, `backend/alembic/env.py`, `backend/alembic/script.py.mako`, `backend/alembic/versions/.gitkeep` -- async Alembic koblet til `core/db` og `core/config`, ingen revisjoner (ny)
- `backend/tests/conftest.py`, `backend/tests/test_health.py`, `backend/tests/test_db.py` -- SQLite i minnet med `StaticPool` (ny)
- `backend/Dockerfile`, `backend/start.sh`, `backend/.dockerignore` -- `uv sync --locked`, så `alembic upgrade head` og `exec uvicorn` (ny)
- `frontend/package.json`, `frontend/package-lock.json`, `frontend/tsconfig.json`, `frontend/next.config.ts` -- Next.js med `output: 'standalone'` og `rewrites` til `API_INTERNAL_URL` (ny)
- `frontend/app/layout.tsx`, `frontend/app/page.tsx`, `frontend/app/globals.css` -- `lang="nb"`, enkel startside med farger fra DESIGN.md (`paper`, `ink`) (ny)
- `frontend/modules/`, `frontend/lib/`, `frontend/components/` -- tomme mapper med `.gitkeep` (ny)
- `frontend/vitest.config.ts`, `frontend/lib/next-config.test.ts` -- Vitest, tester rewrites (ny)
- `frontend/playwright.config.ts`, `frontend/e2e/skjelett.spec.ts` -- Playwright mot port 3000 med axe (ny)
- `frontend/Dockerfile`, `frontend/.dockerignore` -- flertrinns bygg fra `node:22-alpine` (ny)
- `docker-compose.yml` -- `db`, `backend`, `frontend`; bare `3000:3000` (ny)
- `docker-compose.override.example.yml` -- åpner `127.0.0.1:5432` for utviklingsmodus når den kopieres til `docker-compose.override.yml` (ny)
- `.env.example`, `.nvmrc`, `.gitignore`, `README.md` -- innstillinger, Node-versjon, ignorerte filer, oppstart og testing (ny/endret)

## Tasks & Acceptance

**Execution:**
- `backend/*` -- lag uv-prosjektet, appen, `core/config`, `core/db`, helseruten, Alembic og testene som i Code Map -- grunnmuren AD-1, AD-13, AD-14 beskriver
- `backend/Dockerfile`, `backend/start.sh` -- bygg med `uv sync --locked --no-dev`; start med `alembic upgrade head` og deretter `exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-config app/core/logging.json` -- én prosess, logger til stdout
- `frontend/*` -- lag Next.js-appen, startsiden, Vitest-testen og Playwright-testen -- AR-1, UX-DR45
- `frontend/Dockerfile` -- trinn `deps` (`npm ci`), `build` (`ARG API_INTERNAL_URL=http://backend:8000`, `next build`), `runner` (standalone, `node server.js` på port 3000) -- rewrites bakes inn ved bygging
- `docker-compose.yml` -- `db` med `pg_isready`-helsesjekk og volumet `pgdata`, `backend` med `depends_on: db: condition: service_healthy` og `DATABASE_URL` mot `db`, `frontend` med `ports: ["3000:3000"]` -- NFR-1
- `docker-compose.override.example.yml`, `.env.example`, `.gitignore`, `.nvmrc`, `README.md` -- som i Code Map

**Acceptance Criteria:**
- Given et klonet repo uten `.env`, when `docker compose up --build` kjører, then starter `db`, `backend` og `frontend`, og `docker compose ps` viser bare port 3000 publisert.
- Given at backend starter, when loggen leses, then har `alembic upgrade head` kjørt før Uvicorn, og Alembic har ingen tabeller.
- Given `uv run pytest` i `backend/`, then går testene grønt, og `test_ar13_sqlite_foreign_keys_er_paa` bekrefter `PRAGMA foreign_keys` = 1.
- Given `npm run test` i `frontend/`, then går Vitest-testen grønt.
- Given appen kjører, when `npx playwright test` kjøres i `frontend/`, then åpner testen startsiden og `/api/health` gjennom `rewrites`, og axe finner ingen brudd.
- Given README, then viser den programversjonene, `docker compose up`, utviklingsmodus, de tre testkommandoene og lenker til planleggingsdokumentene.

## Spec Change Log

## Review Triage Log

## Design Notes

**Utviklingsmodus og port 5432:** Akseptkriteriene krever både at bare port 3000 er åpen, og at utvikleren kan kjøre `docker compose up db` og backenden direkte på maskinen. Uten en åpen databaseport når ikke backenden på maskinen databasen. Løsning: `docker-compose.yml` åpner bare 3000. `docker-compose.override.example.yml` åpner `127.0.0.1:5432`, og README sier at den kopieres til `docker-compose.override.yml` (som Git ignorerer) før utviklingsmodus. Docker Compose leser override-fila automatisk, så kommandoen er fortsatt `docker compose up db`. Standardverdien for `DATABASE_URL` i `core/config` peker på `localhost`, og `docker-compose.yml` setter den til `db` inne i Docker.

**Helsesjekk når databasen er nede:** `503` med feilformatet fra AD-12 og koden `DATABASE_UNAVAILABLE`. Story 1.3 lager lista i `core/errors.py` og må ta med koden.

**Testdatabase:** `make_engine("sqlite+aiosqlite://")` brukes med `poolclass=StaticPool` og `connect_args={"check_same_thread": False}`. En `connect`-lytter kjører `PRAGMA foreign_keys=ON` for hver SQLite-tilkobling. Testene overstyrer `get_session` med `app.dependency_overrides`.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alle grønne
- `cd frontend && npm run test` -- expected: alle grønne
- `docker compose up --build -d && cd frontend && npx playwright test` -- expected: alle grønne
- `docker compose ps --format json` -- expected: bare `3000` publisert
