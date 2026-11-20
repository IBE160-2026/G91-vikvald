---
title: 'Story 1.1: Sett opp skjelettet som starter med én kommando'
type: 'feature'
created: '2026-11-20'
baseline_revision: 'fb0ce3aec2eadd3ac6c25ebecaddcbda62bef642'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
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

### 2026-11-20 — Review pass
- verdicts: 30 findings — high 0, medium 4, low 11, false 15, maybe-false 0
- findings:
  - `[low]` `[patch]` (verification-gap) 503-testen sjekker ikke at feilen logges — `caplog` lagt til, sjekker ERROR-post fra `app.core.health` med `exc_info`.
  - `[low]` `[patch]` (verification-gap) `*.test.ts` i `frontend/.dockerignore` treffer bare rota — endret til `**/*.test.ts` og `**/*.test.tsx`.
  - `[false]` `[reject]` (blind) Låsefilene mangler i diffen — de ble utelatt fra gjennomgangsdiffen med vilje (genererte filer); de finnes og committes.
  - `[false]` `[reject]` (blind) KI-sporet og spesifikasjonen mangler i diffen — KI-sporet oppdateres i senere steg av samme økt; spesifikasjonen ble holdt utenfor med vilje.
  - `[medium]` `[patch]` (blind) `.env` i rota leses ikke i utviklingsmodus fordi `env_file` er relativ til `backend/` — `env_file` peker nå også på rota.
  - `[low]` `[patch]` (blind) Backenden har ingen helsesjekk, så frontenden starter før migreringen er ferdig — helsesjekk på `/api/health` og `condition: service_healthy`.
  - `[low]` `[patch]` (blind) Endret `POSTGRES_PASSWORD` etter at volumet finnes, bryter innloggingen — notat i README og `.env.example`.
  - `[medium]` `[patch]` (blind) `start.sh` feiler med CRLF eller uten kjørerett (Windows) — `CMD ["sh", "./start.sh"]` og `.gitattributes` med `*.sh text eol=lf`.
  - `[medium]` `[patch]` (blind) Ingen test kjører `alembic/env.py` — ny synkron test kjører `upgrade head` mot SQLite i en midlertidig fil.
  - `[low]` `[patch]` (blind) Vitest hopper over `*.test.tsx` — mønstrene utvidet til `{ts,tsx}`.
  - `[false]` `[reject]` (blind) Ingen typesjekk, lint eller CI; `overrides.vitest` er overflødig — CI er story 1.2 etter intensjonen; `overrides` trengs fordi `@vitest/mocker` trakk inn 5.1.1 og npm krasjet.
  - `[low]` `[reject]` (blind) `APP_ENV` valideres ikke — ingen kode leser den ennå, og story 1.3 tar innstillingene; å legge til en vakt nå er mer enn en direkte retting.
  - `[false]` `[reject]` (blind) 80 px marg på mobil, og `public/` kopieres ikke — appen er bare for PC ned til 768 px (PRD), og `public/` finnes ikke.
  - `[low]` `[reject]` (edge) Passord med `@:/#%` ødelegger `DATABASE_URL` — lokal standardverdi; lite sannsynlig, og koding av URL-en ville lagt til kompleksitet.
  - `[low]` `[patch]` (edge) Samme som passordnotatet over — samme retting.
  - `[medium]` `[patch]` (edge) Samme som `.env` i rota over — samme retting.
  - `[low]` `[patch]` (edge) `API_INTERNAL_URL` i `.env` blir ikke brukt av Compose — byggeargumentet leser nå `${API_INTERNAL_URL:-http://backend:8000}`.
  - `[low]` `[patch]` (edge) Samme som helsesjekken for backend over — samme retting.
  - `[low]` `[reject]` (edge) Ingen `restart`-regel — en migrering som feiler, blir ikke rettet av omstart; feilen skal synes.
  - `[medium]` `[patch]` (edge) Samme som CRLF i `start.sh` over — samme retting.
  - `[low]` `[reject]` (edge) Helsesjekken har ingen tidsgrense mot en database som henger — `db` ligger i samme Compose-nettverk; Docker-helsesjekken har egen tidsgrense.
  - `[false]` `[reject]` (edge) Feil `API_INTERNAL_URL` gir ødelagt rewrite — byggingen feiler høyt, som er riktig oppførsel ved brukerfeil.
  - `[low]` `[patch]` (edge) Samme som `.dockerignore` over — samme retting.
  - `[false]` `[reject]` (edge) `data/` uten anker treffer alle mapper med navnet — med vilje: opplastingene havner i `backend/data/` i utviklingsmodus (AD-8).
  - `[low]` `[reject]` (edge) Samme som `APP_ENV` over — samme grunn.
  - `[false]` `[reject]` (edge) `StaticPool` brukes også for SQLite i fil — bare testene bruker SQLite, og de bruker minnet.
  - `[false]` `[reject]` (edge) Port 5432 er åpen når override-fila er kopiert — med vilje og dokumentert; standardoppsettet åpner bare 3000.
  - `[false]` `[reject]` (intent) Testen «AR-14: bygger standalone» har feil krav-ID — AR-14 dekker byggingen i flere trinn med `output: 'standalone'` (AD-14).
  - `[low]` `[patch]` (intent) README viser `docker compose up --build` i stedet for `docker compose up` — viser nå `docker compose up`, med `--build` etter kodeendringer.
  - `[false]` `[reject]` (intent) Kjørende oppsett (porter, rekkefølge, 503 i drift) er bare dekket av konfigurasjon og Playwright — kontrollert for hånd med `docker compose ps`, backendloggen og stoppet `db`; ingen feil.

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

## Auto Run Result

Status: done

**Sammendrag:** Skjelettet for Studiekamerat er bygd. `docker compose up` starter `db` (Postgres 16), `backend` (FastAPI) og `frontend` (Next.js) uten `.env`, og bare port 3000 er åpen. Backenden kjører `alembic upgrade head` og så én Uvicorn-prosess, og `/api/health` svarer `200 {"status": "ok"}` gjennom `rewrites` bare når databasen kan nås (ellers `503 DATABASE_UNAVAILABLE`). Startsiden har `lang="nb"` og én h1 «Studiekamerat».

**Filer:**
- `backend/` -- uv-prosjekt (`pyproject.toml`, `uv.lock`), `app/main.py`, `app/core/{config,db,health}.py`, `logging.json`, Alembic, `Dockerfile`, `start.sh`, tester (helse, 503 med logging, `PRAGMA foreign_keys`, Alembic mot SQLite)
- `frontend/` -- Next.js 16 med `output: 'standalone'` og rewrites, startside, Vitest-test av rewrites, Playwright-test med axe, flertrinns `Dockerfile`, `engines.node 22.x`
- `docker-compose.yml`, `docker-compose.override.example.yml` -- tjenestene, helsesjekker, port 3000; override åpner 5432 lokalt for utviklingsmodus
- `.env.example`, `.gitignore`, `.gitattributes`, `.nvmrc`, `README.md` -- innstillinger, ignorerte filer, LF i skript, Node 22, oppstart og testing
- `docs/skjermbilder/story-1-1/` -- startsiden i 1280 og 768 piksler

**Gjennomgang:** 30 funn. 15 rettet, gruppert i 10 rettinger: medium 3 (`.env` i rota, CRLF i `start.sh`, test av Alembic), low 7. Ingen utsatt. Avvist: 15 `false` og 5 `low` (grunnene står i Review Triage Log). I tillegg rettet implementeringsagenten at Alembics `fileConfig` slo av eksisterende loggere i testene.

**Anbefaling om ny gjennomgang:** `true`. Tre medium-rettinger ble gjort i denne runden. Risikoen som ikke er bekreftet: oppstart fra en Windows-klone (LF-regelen i `.gitattributes` og `sh ./start.sh`) og lesing av `.env` i rota i utviklingsmodus er ikke prøvd i praksis.

**Verifisering:**
- `cd backend && uv run pytest` -- 4 passed
- `cd frontend && npm run test` -- 3 passed
- `docker compose up --build -d --wait` -- alle tre tjenestene healthy; `docker compose ps` viser bare `3000` publisert
- `cd frontend && npx playwright test` -- 2 passed, ingen axe-brudd
- Backendloggen viser `alembic upgrade head` før Uvicorn, én prosess
- Under implementeringen: `db` stoppet for hånd ga `503` med feilformatet gjennom port 3000

**Gjenværende risiko:** Koden `DATABASE_UNAVAILABLE` må med i lista i `core/errors.py` når story 1.3 lager den. Port 5432 var opptatt på maskinen der dette ble bygd, så utviklingsmodus ble prøvd på en annen port.
