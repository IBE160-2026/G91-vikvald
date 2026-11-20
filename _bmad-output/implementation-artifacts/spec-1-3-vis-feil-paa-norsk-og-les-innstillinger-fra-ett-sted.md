---
title: 'Story 1.3: Vis feil på norsk og les innstillinger fra ett sted'
type: 'feature'
created: '2026-11-20'
baseline_revision: '998c963b71ba044403ca0a0427f4c9429ab46b0d'
status: 'in-progress'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** API-et har ikke ett felles feilformat, frontenden har ingen fetch-transport eller meldingsfil, og innstillingene `LLM_PROVIDER` og de tre bryterne finnes ikke. CI setter `LLM_PROVIDER=mock`, men ingen kode leser den (story 1.3 i `epics.md`, FR-1, NFR-4, AR-11, AR-12).

**Approach:** Backend: `core/errors.py` med én kodeliste, `AppError` og globale feilhåndterere; `core/config.py` utvides med `LLM_PROVIDER` og bryterne; `GET /api/config` og en bryter-avhengighet. Frontend: én fetch-transport, én meldingsfil, TanStack Query i rotlayouten og én config-hook i `frontend/lib/`. Tester, `.env.example` og README holdes i takt.

## Boundaries & Constraints

**Always:**
- Feilformat `{"error": {"code": "<SNAKE_CASE>", "details": {…}}}`, aldri tekst til brukeren fra backend. Koder nå: `NOT_FOUND` 404, `METHOD_NOT_ALLOWED` 405, `BAD_REQUEST` 400, `VALIDATION_ERROR` 422, `FEATURE_DISABLED` 404, `INTERNAL_ERROR` 500, `DATABASE_UNAVAILABLE` 503 (fra story 1.1, #36).
- Meldingsfila har en nøkkel for hver backendkode. Bare godkjente tekster fra EXPERIENCE.md brukes; koder uten godkjent tekst peker på reserveteksten «Noe gikk galt. Prøv igjen.». `NOT_FOUND` får «Fant ikke siden.».
- `LLM_PROVIDER` er `mock` | `mock-invalid` | `vertex`, standard `mock`. Ugyldig verdi: én tydelig logglinje som navngir innstillingen og de gyldige verdiene (aldri selve verdien), deretter avsluttes prosessen med kode 1.
- pytest tvinger `LLM_PROVIDER=mock` i `conftest.py`.
- Testnavn har krav-ID (AR-17). Kode og kommentarer på engelsk.

**Never:**
- Ingen `JWT_SECRET` (story 1.5), ingen auth-koder (1.4–1.6), ingen modellport (3.1/6.1), ingen synlige sideendringer.
- Ingen `NEXT_PUBLIC_`-variabler. Ingen nye pakker utover `@tanstack/react-query` 5.107.1.
- Ikke rør `CLAUDE.md`, `.claude/settings.json`, `.git/hooks/` eller planleggingsdokumentene.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Appfeil | rute kaster `AppError(FEATURE_DISABLED)` | `404 {"error":{"code":"FEATURE_DISABLED","details":{}}}` | — |
| Ukjent sti | `GET /api/finnes-ikke` | `404 NOT_FOUND` | — |
| Feil metode | `POST /api/health` | `405 METHOD_NOT_ALLOWED`, `Allow`-header beholdt | — |
| Valideringsfeil | body mangler felt `name` | `422 VALIDATION_ERROR`, `details.fields == {"name": "missing"}` | — |
| Uventet feil | rute kaster `RuntimeError("hemmelig")` | `500 INTERNAL_ERROR`, teksten «hemmelig» ikke i svaret | logges med stakkspor |
| Config | standard | `{"demo_mode": true, "feature_mnemonics": true, "feature_freetext": true, "feature_summary": true}` | — |
| Config vertex | `LLM_PROVIDER=vertex` | `demo_mode: false` | — |
| Ugyldig provider | `LLM_PROVIDER=gpt` | oppstart stopper, logglinje nevner `LLM_PROVIDER` | exit-kode ≠ 0 |
| Transport ok / 204 | 200 JSON / 204 | data / `undefined` | — |
| Transport feilsvar | 409 med feilformat | kaster `ApiError` med `status`, `code`, `details` | — |
| Transport rart svar | 502 HTML-side | `ApiError` med `INTERNAL_ERROR` | — |
| Transport nettverk | `fetch` kaster | `ApiError` med `NETWORK_ERROR`, status 0 | — |
| Melding | ukjent kode, `INTERNAL_ERROR`, `VALIDATION_ERROR` | «Noe gikk galt. Prøv igjen.» | — |

</intent-contract>

## Code Map

- `backend/app/core/config.py` -- `Settings` (pydantic-settings, `.env` valgfri). Legg til felt; `get_settings()` er `lru_cache` og kalles ved import i `core/db.py` (linje `engine = make_engine(get_settings()...)`), så valideringsfeil må håndteres i `get_settings()`.
- `backend/app/core/health.py` -- svarer i dag 503 med hardkodet JSON; bytt til `AppError(ErrorCode.DATABASE_UNAVAILABLE)` etter logglinjen.
- `backend/app/main.py` -- lager `app` globalt; gjøres om til `create_app()` + `app = create_app()` så testene kan lage egen app med test-ruter.
- `backend/app/core/errors.py` -- ny: `ErrorCode` (StrEnum), `ERROR_STATUS`, `AppError`, `install_error_handlers(app)`.
- `backend/app/core/features.py` -- ny: `require_feature("mnemonics"|"freetext"|"summary")` som FastAPI-avhengighet.
- `backend/app/core/public_config.py` -- ny: router med `GET /api/config`.
- `backend/tests/conftest.py` -- setter `LLM_PROVIDER=mock` før app-import. Feiltestene for 500 trenger en egen klient med `ASGITransport(raise_app_exceptions=False)`, fordi Starlette kaster feilen videre etter svaret.
- `backend/tests/test_health.py` -- 503-testen beholdes uendret og må fortsatt gå grønt.
- `frontend/vitest.config.ts` -- tar med `lib/**/*.test.{ts,tsx}`, miljø `node`; tester mocker `fetch` med `vi.stubGlobal`.
- `frontend/app/layout.tsx` -- serverkomponent; pakk `children` i klientkomponenten `Providers`.
- `docker-compose.yml` -- backend får `LLM_PROVIDER` og de tre bryterne fra miljøet med standardverdier (repo-`.env` leses ikke inne i containeren).
- `.env.example`, `README.md` («Innstillinger») -- samme navn i begge.

## Tasks & Acceptance

**Execution:**
- `backend/app/core/errors.py` -- kodeliste, statuser, `AppError`, håndterere for `AppError`, Starlette `HTTPException` (404→`NOT_FOUND`, 405→`METHOD_NOT_ALLOWED`, annen 4xx→`BAD_REQUEST`, 5xx→`INTERNAL_ERROR`, headere beholdes), `RequestValidationError` (feltnavn = `loc` uten første ledd, punktum-skilt → feiltype) og `Exception` (logger med stakkspor) -- AR-12
- `backend/app/core/config.py` -- `LLM_PROVIDER: Literal[...]`, `FEATURE_MNEMONICS/FREETEXT/SUMMARY: bool = True`, egenskap `demo_mode`; `get_settings()` logger hver ugyldig innstilling (navn + melding, ikke verdi) på CRITICAL og kaster `SystemExit(1)` -- AR-11
- `backend/app/core/features.py`, `backend/app/core/public_config.py`, `backend/app/main.py`, `backend/app/core/health.py` -- bryter-avhengighet, config-ruten, app-fabrikk med håndterere og ruter, health bruker `AppError` -- AR-11, AR-12
- `backend/tests/conftest.py`, `backend/tests/test_errors.py`, `backend/tests/test_config.py` -- dekker backend-radene i matrisen, at feilsvar bare har `code` og `details`, at alle koder har status, at hver kode finnes i `frontend/lib/messages.ts`, at hvert `Settings`-felt står i `.env.example`, og oppstartsstopp via `subprocess` (`python -c "import app.main"`) -- AR-17
- `frontend/package.json`, `frontend/package-lock.json` -- `@tanstack/react-query` 5.107.1 (eksakt)
- `frontend/lib/messages.ts`, `frontend/lib/api.ts`, `frontend/lib/config.ts`, `frontend/lib/providers.tsx`, `frontend/app/layout.tsx` -- meldingsfil med `messageFor(code)`; transport `apiFetch` + `ApiError`; `fetchConfig`, `configQueryOptions`, `useAppConfig`; `QueryClientProvider` i rotlayouten -- FR-1, AR-11, AR-12
- `frontend/lib/*.test.ts` -- transport-, melding-, config- og `NEXT_PUBLIC_`-tester (søker `.env.example` og frontendkoden utenom `node_modules`/`.next`), og at README-tabellen og `.env.example` har de samme navnene -- AR-17, NFR-4
- `frontend/e2e/feil-og-innstillinger.spec.ts` -- `/api/config` og ukjent `/api/*` gjennom rewrites
- `docker-compose.yml`, `.env.example`, `README.md` -- nye innstillinger med standardverdier og forklaring

**Acceptance Criteria:**
- Given en rute merket med `require_feature("summary")` som bare finnes i testen, when `FEATURE_SUMMARY=false`, then svarer den `404 FEATURE_DISABLED`, og med bryteren på svarer den 200.
- Given svaret fra `GET /api/config`, when testen sjekker nøklene, then er det nøyaktig `demo_mode` og de tre bryterne.
- Given en backendkode som mangler i meldingsfila, when `uv run pytest` kjører, then feiler testen og navngir koden.
- Given appen i Docker, when Playwright kaller `/api/config` og `/api/finnes-ikke`, then får den config-svaret og `404 NOT_FOUND` i feilformatet.

## Spec Change Log

## Review Triage Log

## Design Notes

**Kodene uten godkjent tekst:** EXPERIENCE.md har ingen tekst for `DATABASE_UNAVAILABLE`, `FEATURE_DISABLED`, `METHOD_NOT_ALLOWED`, `BAD_REQUEST` eller `NETWORK_ERROR`. De peker på reserveteksten i stedet for at KI finner på ny tekst. Kanttilfelle som legges fram for Silje.

**Uventet feil logges to ganger:** Starlette sender 500-svaret fra håndtereren og kaster feilen videre, så Uvicorn logger den også. Vår egen linje har metode og sti; dobbel logg er ufarlig og krever ingen egen middleware.

**Ugyldig innstilling:** `get_settings()` kalles ved import (fra `core/db.py` og Alembic), så kontrollen ligger der og ikke i en oppstartshendelse. Verdien logges ikke, fordi senere innstillinger kan være hemmelige.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alle grønne
- `cd frontend && npm run test` -- expected: alle grønne
- `cd frontend && npx tsc --noEmit` -- expected: ingen typefeil
- `docker compose up --build -d --wait && cd frontend && npx playwright test` -- expected: alle grønne
