---
title: 'Story 1.2: Kjør testene automatisk ved hver pull request'
type: 'chore'
created: '2026-11-20'
baseline_revision: '9970b561b98b8f91685136a46503ac05b525f83f'
status: 'in-progress'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Repoet har ingen CI. Sensor kan ikke se at backend- og frontendtestene faktisk kjørte før en pull request ble flettet (story 1.2 i `epics.md`, AR-20).

**Approach:** Én GitHub Actions-arbeidsflyt med én jobb som kjører ved hver pull request mot `main`: `uv sync --locked` og `uv run pytest` i `backend/`, deretter `npm ci` og `npm run test` i `frontend/`. En Vitest-test sjekker at arbeidsflyten har det AR-20 krever, og README forteller hva som kjører automatisk og hva som kjøres lokalt.

## Boundaries & Constraints

**Always:**
- Utløses av `pull_request` mot `main` (åpnet, oppdatert, gjenåpnet; standardtypene).
- Én jobb (`tests`) på `ubuntu-latest`. Python-versjonen fra `backend/.python-version`, Node-versjonen fra `.nvmrc` (22).
- `LLM_PROVIDER: mock` satt for hele jobben, så ingen test kan nå Gemini.
- `permissions: contents: read`. Hvert steg feiler jobben når kommandoen feiler (standard), så pull requesten merkes som feilet.
- Testnavn har krav-ID-en (AR-17), for eksempel `AR-20: ...`. Kode og kommentarer på engelsk.

**Never:**
- Ingen hemmeligheter (`secrets.`), ingen database-tjeneste (pytest bruker SQLite i minnet), ingen Docker, ingen Playwright.
- Ingen endring i appkoden, testene fra story 1.1, `CLAUDE.md`, `.claude/settings.json`, `.git/hooks/` eller planleggingsdokumentene.
- Ingen regler for grenbeskyttelse i GitHub-innstillingene (det er en repo-innstilling, ikke kode).

</intent-contract>

## Code Map

- `.github/workflows/ci.yml` -- arbeidsflyten (ny). Bruker `actions/checkout@v5`, `astral-sh/setup-uv@v6` (med `python-version-file`/cache) og `actions/setup-node@v5` med `node-version-file: .nvmrc`, `cache: npm`, `cache-dependency-path: frontend/package-lock.json`.
- `backend/pyproject.toml` -- `requires-python = "==3.12.*"`, testene i dev-gruppen; `uv sync --locked` installerer dev-gruppen som standard. Les bare.
- `backend/tests/conftest.py` -- `sqlite+aiosqlite://` med `StaticPool`; ingen Postgres trengs. `test_migrations.py` bruker en midlertidig SQLite-fil. Les bare.
- `backend/app/core/config.py` -- `DATABASE_URL` har standardverdi og leses ikke av testene; ingen miljøvariabler kreves. Les bare.
- `frontend/package.json` -- `"test": "vitest run"`, `engines.node 22.x`, `package-lock.json` finnes for `npm ci`. Les bare.
- `frontend/vitest.config.ts` -- tar med `lib/**/*.test.{ts,tsx}`; den nye testen legges i `frontend/lib/`.
- `frontend/lib/ci-workflow.test.ts` -- ny Vitest-test som leser `../../.github/workflows/ci.yml` som tekst (ingen ny YAML-pakke).
- `README.md` -- avsnittet «Testene» utvides.

## Tasks & Acceptance

**Execution:**
- `.github/workflows/ci.yml` -- lag arbeidsflyten `CI` med `on: pull_request: branches: [main]`, `concurrency` per PR med `cancel-in-progress: true`, `env: LLM_PROVIDER: mock`, og jobben `tests` med stegene: checkout; setup-uv; `uv sync --locked` og `uv run pytest` med `working-directory: backend`; setup-node; `npm ci` og `npm run test` med `working-directory: frontend` -- AR-20
- `frontend/lib/ci-workflow.test.ts` -- tester med navn som starter med `AR-20:`: utløses av `pull_request` mot `main`; kjører de fire kommandoene i riktig mappe; nevner ikke `secrets.`, `playwright` eller `services:`; setter `LLM_PROVIDER: mock` -- holder arbeidsflyten i tråd med kravet når den endres senere
- `README.md` -- i «Testene»: pytest og Vitest kjører automatisk i GitHub Actions ved hver pull request mot `main` (lenke til `.github/workflows/ci.yml`), en feilende test merker pull requesten som feilet, og Playwright kjøres lokalt fordi den trenger hele appen i Docker -- siste akseptkriterium i storien

**Acceptance Criteria:**
- Given en pull request mot `main`, when den åpnes eller oppdateres, then kjører jobben `tests` `uv sync --locked` og `uv run pytest` i `backend/` og `npm ci` og `npm run test` i `frontend/`, og den blir grønn.
- Given jobben, when den kjører, then bruker den ingen hemmeligheter, ingen databasetjeneste og ikke Playwright.
- Given at en test feiler, when jobben er ferdig, then er pull requesten merket som feilet (standard i GitHub Actions når et steg avslutter med en annen kode enn 0).
- Given README, when sensor leser «Testene», then står det at pytest og Vitest kjører automatisk ved hver pull request, og at Playwright kjøres lokalt.

## Spec Change Log

## Review Triage Log

## Design Notes

**Én jobb, ikke to:** Storien sier «en GitHub Actions-jobb». To parallelle jobber ville vært litt raskere, men én jobb følger teksten og gir én sjekk å se etter i PR-en.

**Test av arbeidsflyten som tekst:** Å legge til en YAML-pakke bare for én test er mer enn behovet. Testen sjekker linjer i fila. Den beviser ikke at GitHub kjører den. Det beviser den første kjøringen på denne PR-en.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alle grønne
- `cd frontend && npm run test` -- expected: alle grønne, inkludert `AR-20`-testene
- `docker compose up --build -d --wait && cd frontend && npx playwright test` -- expected: alle grønne

**Manual checks (if no CLI):**
- `gh pr checks <nr>` på PR-en for denne storien -- expected: sjekken `tests` er grønn
