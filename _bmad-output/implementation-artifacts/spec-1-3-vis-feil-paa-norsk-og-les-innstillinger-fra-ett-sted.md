---
title: 'Story 1.3: Vis feil på norsk og les innstillinger fra ett sted'
type: 'feature'
created: '2026-11-20'
baseline_revision: '998c963b71ba044403ca0a0427f4c9429ab46b0d'
status: 'done'
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

### 2026-11-20 — Review pass
- verdicts: 36 findings — high 0, medium 4, low 19, false 13, maybe-false 0
- findings:
  - `[medium]` `[patch]` (verification-gap) Standardverdiene testes ikke: «standardverdier»-testen setter bryterne selv, og conftest setter `LLM_PROVIDER` — ny test sletter variablene, bygger `Settings(_env_file=None)` og sjekker `mock`, `demo_mode` og at bryterne er på; den gamle testen har fått et navn som sier hva den sjekker.
  - `[low]` `[patch]` (verification-gap) Annen 4xx enn 404/405 fra `HTTPException` kommer fram som 400 — verifisert: `HTTPException(401)` ga 400 med `WWW-Authenticate`. Rettet: statusen og headerne beholdes, bare kroppen skrives om; ny test for 401.
  - `[low]` `[patch]` (blind) HTTP-statusen overskrives (401/403 → 400, 503 → 500) — samme rot og retting som raden over.
  - `[low]` `[patch]` (blind) Feltnavn i valideringsfeil: byteposisjon ved ugyldig JSON, senere feil overskriver første, rå pydantic-typer — overskrivingen rettet med `setdefault`. Byteposisjonen avvist: frontenden sender alltid `JSON.stringify`, og retting krever en egen gren. Typene avvist: feltnavnet er det frontenden trenger, og ingen kode leser typen ennå.
  - `[low]` `[reject]` (blind) Uventet feil logges to ganger (vår linje og Uvicorns) — står i Design Notes; ufarlig, og retting krever egen middleware.
  - `[medium]` `[patch]` (blind) Standardverditesten tester ikke standardverdiene, og en lokal `.env` kan påvirke — samme rot og retting som første rad (testen bruker `_env_file=None`).
  - `[low]` `[patch]` (blind) `test_ar17_pytest_kjoerer_med_mock` sjekker bare variabelen conftest satte — sjekker nå `get_settings().LLM_PROVIDER` og `demo_mode`.
  - `[low]` `[patch]` (blind) `require_feature` bygger innstillingsnavnet som tekst uten kontroll — ny test: hver verdi i `Feature` har et `FEATURE_*`-felt.
  - `[medium]` `[patch]` (blind) TanStack Query prøver 4xx tre ganger med pause, så feilen kommer sekunder for sent — `shouldRetry` i `frontend/lib/query-client.ts` prøver aldri 4xx på nytt, ellers inntil 3 ganger; 11 Vitest-tester.
  - `[low]` `[reject]` (blind) Avbrutt forespørsel blir `NETWORK_ERROR`, og `fetchConfig` sender ikke `signal` videre — TanStack Query overser feil fra avbrutte spørringer, og ingen kode avbryter ennå; retting krever ny gren.
  - `[low]` `[reject]` (blind) 2xx uten JSON-kropp gir `INTERNAL_ERROR` — API-konvensjonen (AR) gir kropp på 200/201/202 og ingen på 204, som håndteres.
  - `[false]` `[reject]` (blind) Ingen side viser de norske meldingene ennå — ingen side kaller API-et før story 1.4–1.6, som bruker transporten og meldingsfila; akseptkriteriene i 1.3 gjelder grunnmuren.
  - `[false]` `[reject]` (blind) Logglinjen ved ugyldig innstilling avhenger av loggoppsettet — verifisert: under Uvicorn med `logging.json` står `CRITICAL app.core.config: Invalid setting LLM_PROVIDER: …` på stdout med exit 1, og Alembic (første steg i `start.sh`) skriver samme linje og stopper.
  - `[false]` `[reject]` (blind) `vertex` godtas uten implementasjon — akseptkriteriet sier uttrykkelig at testen her bare sjekker at verdien er gyldig (story 3.1/6.1 avgjør resten).
  - `[false]` `[reject]` (blind) Kodesjekken går bare én vei, og meldingstesten låser reserveteksten — akseptkriteriet krever bare backend → meldingsfil (`NETWORK_ERROR` finnes bare i frontend med vilje), og at `INTERNAL_ERROR`/`VALIDATION_ERROR` gir reserveteksten.
  - `[low]` `[patch]` (edge) 401/403/409/413/429/503 får feil status — samme rot og retting som status-raden.
  - `[low]` `[patch]` (edge) `WWW-Authenticate` på et 400-svar — samme rot; statusen er nå 401.
  - `[low]` `[patch]` (edge) Flere valideringsfeil på samme felt overskriver hverandre — rettet med `setdefault`.
  - `[false]` `[reject]` (edge) Tom `loc` gir `IndexError` — FastAPI lager alltid `loc` med minst kilden (`body`, `query` …).
  - `[low]` `[reject]` (edge) Ugyldig JSON gir feltnavn som byteposisjon — samme begrunnelse som i blind-raden.
  - `[low]` `[patch]` (edge) Tom verdi i `.env` (`FEATURE_SUMMARY=`) stopper oppstarten, mens Compose bruker standardverdien — verifisert; `env_ignore_empty=True` og ny test.
  - `[low]` `[reject]` (edge) `Mock` eller `mock ` med mellomrom stopper oppstarten — feiler høyt med en tydelig linje om gyldige verdier, som er riktig atferd.
  - `[false]` `[reject]` (edge) `SystemExit` kan skje under en forespørsel — `get_settings()` er bufret og kalles første gang ved import; bufferen tømmes bare i testene.
  - `[low]` `[reject]` (edge) `AbortError` blir `NETWORK_ERROR` — samme som blind-raden om avbrudd.
  - `[false]` `[reject]` (edge) `credentials` fra kalleren overstyres — med vilje: akseptkriteriet sier at transporten sender cookien med `same-origin`.
  - `[low]` `[reject]` (edge) 2xx med tom kropp gir feil — samme som blind-raden.
  - `[low]` `[reject]` (edge) Tom `code` i feilsvar gir tom kode — backenden sender aldri tom kode, og `messageFor("")` gir reserveteksten uansett.
  - `[low]` `[reject]` (edge) E2E feiler hvis backenden startes med `vertex` — testen kjøres mot `docker compose up` med standardverdiene, som README beskriver.
  - `[false]` `[reject]` (intent) Ingen side viser feilteksten (lesning A) — samme som blind-raden; 1.4–1.6 bygger sidene.
  - `[false]` `[reject]` (intent) TanStack-provideren brukes ikke av noen test — rotlayouten med `Providers` rendres i Playwright-testen av startsiden (med axe), og `makeQueryClient` er enhetstestet.
  - `[low]` `[reject]` (intent) `useAppConfig` kjøres ikke i noen test — én linje rundt `configQueryOptions`, som er testet; første bruker kommer i en senere epic.
  - `[medium]` `[patch]` (intent) Standardverdiene «uten `.env`» testes ikke — samme rot og retting som første rad.
  - `[false]` `[reject]` (intent) Oppstartsstoppen testes med `import app.main`, ikke Uvicorn — samme kodevei; Uvicorn og Alembic er i tillegg prøvd for hånd (se over).
  - `[false]` `[reject]` (intent) `require_feature` brukes bare av en testrute — akseptkriteriet ber om nettopp det.
  - `[false]` `[reject]` (intent) Håndtererne skriver om alle 404, ikke bare `/api/*` — backenden får bare `/api/*` gjennom rewrites; ingen skade.
  - `[false]` `[reject]` (intent) Ekstra koder og `create_app()` — innenfor storien, og ingen endring for brukeren.

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

## Auto Run Result

Status: done

**Sammendrag:** API-et har nå ett feilformat, `{"error": {"code", "details"}}`, med alle kodene i `core/errors.py` og globale håndterere for appfeil, `HTTPException`, valideringsfeil og uventede feil (500 uten tekst, logget med stakkspor). Innstillingene `LLM_PROVIDER` og de tre bryterne leses med pydantic-settings, en ugyldig verdi stopper oppstarten med én tydelig logglinje, og `GET /api/config` gir bare `demo_mode` og bryterne. Frontenden har én fetch-transport, én meldingsfil, TanStack Query i rotlayouten (uten nye forsøk på 4xx) og én config-hook.

**Filer:**
- `backend/app/core/errors.py` -- kodeliste, statuser, `AppError` og håndtererne (ny)
- `backend/app/core/config.py` -- `LLM_PROVIDER`, bryterne, `demo_mode`, tom verdi = standard, stopp ved ugyldig verdi
- `backend/app/core/features.py` -- `require_feature` (ny)
- `backend/app/core/public_config.py` -- `GET /api/config` (ny)
- `backend/app/core/health.py` -- bruker `AppError(DATABASE_UNAVAILABLE)`
- `backend/app/main.py` -- `create_app()`
- `backend/tests/conftest.py`, `test_errors.py`, `test_config.py` -- tvinger `mock`, nye tester (AR-11, AR-12, AR-17, FR-1, NFR-4)
- `frontend/lib/api.ts`, `messages.ts`, `config.ts`, `providers.tsx`, `query-client.ts` -- transport, meldingsfil, config-hook, provider, regel for nye forsøk (nye)
- `frontend/lib/*.test.ts` -- 44 Vitest-tester totalt; `frontend/e2e/feil-og-innstillinger.spec.ts` -- `/api/config` og ukjent `/api/*`
- `frontend/app/layout.tsx` -- `Providers` rundt innholdet
- `frontend/package.json`, `package-lock.json` -- `@tanstack/react-query` 5.107.1
- `docker-compose.yml`, `.env.example`, `README.md` -- de nye innstillingene

**Gjennomgang:** 36 funn. Rettet (7 grupper): medium 2 (standardverdiene testes nå ekte; ingen nye forsøk på 4xx), low 5 (`HTTPException` beholder status og headere, første valideringsfeil per felt, tom verdi = standard, AR-17-testen leser innstillingene, test for bryternavnene). Ingen utsatt. Avvist: 13 `false` og 11 `low` med grunner i Review Triage Log.

**Anbefaling om ny gjennomgang:** `false`. To medium-grupper ble rettet, men begge er nå dekket av tester som kjørte grønt, og ingen ubekreftet risiko kan navngis.

**Verifisering:**
- `cd backend && uv run pytest` -- 26 passed
- `cd frontend && npm run test` -- 44 passed
- `cd frontend && npx tsc --noEmit` -- ingen feil
- `docker compose up --build -d --wait && cd frontend && npx playwright test` -- 4 passed (før rettingene; kjøres igjen i sluttrunden)
- For hånd: `LLM_PROVIDER=gpt uvicorn ... --log-config app/core/logging.json` skriver `CRITICAL app.core.config: Invalid setting LLM_PROVIDER: Input should be 'mock', 'mock-invalid' or 'vertex'` på stdout og avslutter med 1; `alembic upgrade head` stopper med samme linje.

**Gjenværende risiko:** Bare `NOT_FOUND` har egen tekst; de andre kodene viser reserveteksten til Silje godkjenner tekster. Uventede feil logges to ganger (vår linje og Uvicorns).
