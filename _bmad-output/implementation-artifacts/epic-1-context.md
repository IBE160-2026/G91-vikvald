# Epic 1 Context: Kom i gang: appen starter og du kan logge inn

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Make Studiekamerat start with a single `docker compose up` (no keys, no `.env`, demo mode by default) and let a student create an account, log in and log out. The epic lays the foundation every later epic builds on: project skeleton, Docker Compose, CI, shared folders, design tokens, top bar, error format, settings, ownership checks and the «Fant ikke siden» page. The examiner (sensor) must be able to run the app and all tests by following the README.

## Stories

- Story 1.1: Sett opp skjelettet som starter med én kommando
- Story 1.2: Kjør testene automatisk ved hver pull request *(kan kuttes)*
- Story 1.3: Vis feil på norsk og les innstillinger fra ett sted
- Story 1.4: Opprett konto
- Story 1.5: Logg inn
- Story 1.6: Bruk appen innlogget, logg ut og få «Fant ikke siden»

## Requirements & Constraints

- All UI text, including errors, is Norwegian bokmål (FR-1); `<html lang="nb">`. Backend never sends user-facing text.
- Account with email + password; log in, log out. No email verification, no "forgot password" (FR-3). A student only sees her own data; other users' data is indistinguishable from non-existent (FR-4).
- Passwords never stored or logged in clear text (NFR-7). Logs to stdout never contain passwords or note text.
- Model provider chosen by one setting, server-side only; secrets only in `.env` (git-ignored), `.env.example` checked in (NFR-4). No `NEXT_PUBLIC_` variables at all (enforced by a test).
- README: tool versions (Docker, Node 22, Python 3.12, uv), copyable start command, dev setup, the three test commands, links to planning docs, settings table matching `.env.example` (NFR-1).
- Accessibility (WCAG 2.1 AA): keyboard-only use in reading order with visible focus, 4.5:1 text contrast, visible labels, errors that say what is wrong and how to fix it, status messages announced by screen readers (NFR-8, NFR-9, NFR-11, NFR-12). axe runs in Playwright on every page with zero violations (NFR-13).
- No request may last over 30 s. App must work offline in demo mode: fonts, icons and scripts are bundled (a Playwright test checks nothing is fetched outside `localhost`).

## Technical Decisions

**Topology:** Docker Compose services `db` (Postgres 16, healthcheck `pg_isready`, volume `pgdata`), `backend` (FastAPI, `depends_on` `condition: service_healthy`), `frontend` (Next.js). Only port 3000 exposed. Frontend reaches backend only via `/api/*` Next.js `rewrites` to `API_INTERNAL_URL` (default `http://backend:8000`, set at build time). No `proxy.ts`, no Caddy, no CORS (deliberate deviation from technology.md).

**Backend startup order:** `alembic upgrade head` → (later epics add `seed_if_empty` for `APP_ENV=local` and job cleanup) → Uvicorn with exactly one process. `/api/health` returns `200 {"status": "ok"}` only when the DB is reachable. Alembic is wired to `core/db` but epic 1's first table is `users` (story 1.4).

**Versions (pinned, lockfiles `uv.lock` / `package-lock.json`):** Python 3.12 (`python:3.12-slim`, `uv sync --locked`), FastAPI 0.162.7, Uvicorn 0.54.0, SQLAlchemy 2.1.8 (async), Alembic 1.20.1, asyncpg 0.32.0, aiosqlite 0.22.1, Pydantic 2.14.3, pydantic-settings 2.16.3, PyJWT 2.15.1, bcrypt 5.0.0, pytest 9.2.0, pytest-asyncio 1.5.0, httpx 0.28.1. Node 22 (`node:22-alpine`, multi-stage, `output: 'standalone'`), Next.js 16.4.6, React 19.3.1, TypeScript 5.9.3, Tailwind CSS 4.3.5, shadcn/ui CLI 4.23.0, TanStack Query 5.107.1, zod 4.6.7, lucide-react 1.73.0, sonner 2.0.8, @fontsource-variable/inter 5.3.0, Vitest 5.1.0, Playwright 1.65.1, @axe-core/playwright 4.14.0.

**Folders:** `backend/app/core/` (config, db, security, storage, errors), `backend/app/modules/<module>/` with `router.py`, `service.py`, `models.py`, `schemas.py` (epic 1 builds `identity`), `backend/alembic/`, `backend/tests/`; `frontend/app/` (route groups `(auth)`, `(app)`; routes are thin), `frontend/modules/<module>/` with `types.ts`, `api.ts`, `components/`, `pages/` mirroring backend, `frontend/lib/` (fetch transport, config hook, message file), `frontend/components/` (shared UI), `frontend/e2e/` (Playwright + axe). Only the owning module writes its tables.

**Settings (`core/config`, pydantic-settings, `.env` optional):** `APP_ENV=local`, `LLM_PROVIDER=mock` (valid: `mock`, `mock-invalid`, `vertex`; invalid value stops startup with a clear log line), `FEATURE_MNEMONICS`, `FEATURE_FREETEXT`, `FEATURE_SUMMARY` (on by default), `JWT_SECRET` (default only when `APP_ENV=local`, otherwise refuse to start), `API_INTERNAL_URL` (frontend build). `GET /api/config` returns only `demo_mode` (true for `mock`/`mock-invalid`) plus the three flags — a test asserts no other fields. Disabled should-have routes answer `404 FEATURE_DISABLED`. `.gitignore`: `.env`, `docker-compose.override.yml`, `data/`, `node_modules/`, `.next/`, Python caches.

**Errors:** every API error is `{"error": {"code": "<SNAKE_CASE>", "details": {…}}}`; all codes listed in `core/errors.py`. Global handlers rewrite `HTTPException` (unknown `/api/*` → `NOT_FOUND`) and `422` (`VALIDATION_ERROR` with field names in `details`); unexpected errors → `500 INTERNAL_ERROR`, no message/stack trace, logged to stdout. Frontend: one fetch transport in `frontend/lib/` (`credentials: 'same-origin'`, converts error bodies to an error with `code`/`details`), TanStack Query in root layout, one message file mapping code → Norwegian text; fallback «Noe gikk galt. Prøv igjen.». A test fails if a backend code is missing from the message file. Epic 1 codes include `EMAIL_ALREADY_REGISTERED` (409), `PASSWORD_TOO_SHORT`, `PASSWORD_TOO_LONG`, `INVALID_EMAIL`, `INVALID_CREDENTIALS` (401), `UNAUTHENTICATED` (401), `NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_ERROR`, `FEATURE_DISABLED`.

**Auth (`identity`):** table `users` (UUID PK, unique `email` lowercased+trimmed, `password_hash`, `created_at` UTC). bcrypt; password 8 chars to 72 bytes (test with «æ»: 36 OK, 37 rejected). HS256 JWT via PyJWT in cookie `sk_session` (`HttpOnly`, `SameSite=Lax`, `Path=/`, 30 days); never in response body or `localStorage`, never read by frontend. Routes: `POST /api/identity/register` (201 `{id, email}`, sets cookie), `POST /api/identity/login`, `POST /api/identity/logout` (204, clears cookie), `GET /api/identity/me`. Login failure gives identical `401 INVALID_CREDENTIALS` for wrong email or password. Frontend decides logged-in state only via `/me`.

**Ownership:** every route uses the shared dependency `current_user` except `/api/health`, `/api/config`, `register`, `login`, `logout` — a test walks all routes and fails for new routes missing it. A shared helper in `backend/app/core/` fetches a user-owned row; another user's row and a missing ID both give the exact same `404 NOT_FOUND`, never `403`.

**DB & conventions:** app on Postgres, pytest on in-memory SQLite (aiosqlite, `StaticPool`, `PRAGMA foreign_keys=ON` on every connection, tested). Only SQL that works on both; migrations via Alembic and must run on both. No `rollback()` on the shared request session. Code/tables/API fields in English, `snake_case` JSON, UUID keys, UTC ISO 8601 timestamps, `201`/`204`/`202` status conventions.

**Testing:** `uv run pytest` (with `LLM_PROVIDER=mock`), `npm run test` (Vitest), `npx playwright test` against `docker compose up` on port 3000, axe on every page. Every test name carries the requirement ID it covers, e.g. `test_nfr1_health_svarer_ok`, `test_ar13_sqlite_foreign_keys_er_paa`, `test_fr3_opprett_konto`, `test_ar10_cookie_er_httponly`, `test_fr4_andres_rad_gir_404` (AR-17). CI (story 1.2, AR-20): GitHub Actions on PRs to `main` runs `uv sync --locked` + `uv run pytest` in `backend/` and `npm ci` + `npm run test` in `frontend/`; no secrets, no Playwright.

**Dev mode:** `docker compose up db`, `uv run uvicorn app.main:app --reload`, `npm run dev` with `API_INTERNAL_URL=http://localhost:8000`.

## UX & Interaction Patterns

- Tailwind theme holds all DESIGN.md tokens (colors, typography, spacing incl. the three layout measures, radii, component values); a test checks theme colors equal DESIGN.md. Inter via `@fontsource-variable/inter`, fallback `system-ui, sans-serif`, weights 400/500/600 only, `tnum` on all text. Shadows `lift` and `float`, scrim 42 %, lucide-react icons at 1.5 px stroke, no emoji.
- Focus ring: black, 2 px with 2 px offset, never removed. Controls use `border-control`; `border-card` never on anything clickable.
- Shared components in `frontend/components/`: `button-primary`, `button-outline`, `button-text`, `button-danger` (40 px; large 48 px); `text-field` (visible label, 48 px, error = red border + icon + text below linked via `aria-describedby`/`aria-invalid`, focus moves to field); password field with «Vis» toggle (`aria-pressed`); `dialog` (over scrim, `float` shadow, `rounded.xl`, focus trap, Esc closes without change, focus returns to opener, buttons «Avbryt» then primary, widths 560/640/720 px, no stacking).
- Auth pages (`/logg-inn`, `/registrer`, `(auth)` layout): top bar with logo only; one card that switches between «Logg inn» and «Opprett konto», subtitle «Fra forelesningsnotat til eksamen.», grey simplified semester line (hidden from screen readers) and «Studiekamerat lager øvingsstoff fra dine egne forelesningsnotater, med kilde på alt.». zod validates client-side, backend decides. Enter submits.
- Approved texts: «Feil e-post eller passord. Sjekk at Caps Lock er av.», «Det finnes allerede en konto med denne e-postadressen. Logg inn i stedet.», «Passordet må ha minst 8 tegn.», «Passordet er for langt. Bruk færre tegn.», «Skriv inn en gyldig e-postadresse, for eksempel klara@eksempel.no.», «Du er logget ut. Logg inn igjen.» (live region; only when the session expires while used in the same tab), «Fant ikke siden» + link «Gå til forsiden».
- `(app)` layout: `top-bar` with logo → `/`, initial circle (first letter of email), «Konto» (page arrives in epic 2) and «Logg ut» with exit icon (no confirmation, no message). Landmarks `header`/`main`, one h1 per page. Front page `/`: h1 «Dine emner», no sidebar, 80 px margin. After register or login the student lands on `/`. Not logged in → silent redirect to login.

## Cross-Story Dependencies

- 1.1 creates the skeleton, compose, `core/db`, Alembic, test harnesses and placeholder start page (h1 «Studiekamerat») that 1.5/1.6 replace. 1.2 reuses 1.1's test commands.
- 1.3's error format, message file, fetch transport and config hook are used by 1.4–1.6; new codes from 1.4–1.6 must be added to both `core/errors.py` and the message file.
- 1.4 builds design tokens, shared components and the first migration (`users`); 1.5 reuses the card and components and adds `current_user` (first used by `/me`); 1.6 builds on both and adds the route-guard test and the 404 helper that later epics inherit.
- Later epics: `seed_if_empty` and job cleanup join the startup sequence in epics 6 and 3; the account page in epic 2; the dialog's first real use in epic 2; Vertex/`LLM_PROVIDER=vertex` actually working in story 6.1 (epic 1 only validates the value).
