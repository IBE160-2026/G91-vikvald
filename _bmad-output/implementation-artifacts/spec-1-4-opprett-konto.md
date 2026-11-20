---
title: 'Story 1.4: Opprett konto'
type: 'feature'
created: '2026-11-20'
baseline_revision: '3c154ec9083d5878f43cb299d9560a11773ffe11'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Appen har ingen brukere: ingen tabell, ingen registrering, ingen innloggingscookie, og frontenden har verken designtokens, Inter, felles komponenter eller siden «Opprett konto» (story 1.4 i `epics.md`, FR-1, FR-3, NFR-7, AR-10, UX-DR1–6).

**Approach:** Backend: modulen `identity` med tabellen `users` (første Alembic-migrering), `POST /api/identity/register` med bcrypt og HS256-JWT i cookien `sk_session`, og `JWT_SECRET` i innstillingene. Frontend: Tailwind 4 med alle tokens fra DESIGN.md, Inter fra `@fontsource-variable/inter`, felles komponenter i `frontend/components/` og siden `/registrer` i `(auth)`-layouten, med zod-sjekk før kallet.

## Boundaries & Constraints

**Always:**
- Feilkoder (alle i `core/errors.py` og `frontend/lib/messages.ts`): `EMAIL_ALREADY_REGISTERED` 409, `INVALID_EMAIL` 422, `PASSWORD_TOO_SHORT` 422, `PASSWORD_TOO_LONG` 422. Meldingene er de godkjente tekstene fra EXPERIENCE.md, ordrett.
- E-post: `strip()` + `lower()` før sjekk og lagring. Gyldig = høyst 254 tegn og samme enkle mønster i backend og frontend: `^[^@\s]+@[^@\s]+\.[^@\s]+$`.
- Passord: minst 8 tegn (kodepunkter), høyst 72 byte UTF-8. Sjekkrekkefølge i backend: e-post, for kort, for langt, deretter finnes fra før. Passordet strippes aldri.
- Cookie `sk_session`: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age` 30 dager, uten `Secure` (lokal http). JWT: HS256, `sub` = bruker-ID, `iat`, `exp`. JWT-en står aldri i svarkroppen.
- `JWT_SECRET`: standardverdi (minst 32 tegn) bare når `APP_ENV=local`. Ellers stopper oppstarten hvis den mangler eller er lik den lokale standardverdien, med samme logglinje som story 1.3 (navn, aldri verdi).
- Passordet logges aldri og lagres bare som bcrypt-hash.
- Fokusring: `:focus-visible` med 2 px `focus-ring` og 2 px luft på alt; ingen `outline-none` noe sted. Bare vektene 400/500/600. Ikoner: lucide-react, 16 px, `strokeWidth` 1,5 med `absoluteStrokeWidth`.
- Testnavn har krav-ID (AR-17). Kode, variabelnavn og kommentarer på engelsk; all synlig tekst på bokmål.

**Never:**
- Ingen `/logg-inn`, `/me`, `current_user`, utlogging eller innlogget toppfelt (story 1.5–1.6). Lenken «Har du konto? Logg inn» kommer i 1.5, sammen med siden den peker på.
- Ingen shadcn-generator, Radix, `class-variance-authority` eller `tailwind-merge`: komponentene skrives for hånd med Tailwind-klasser.
- Ingen `NEXT_PUBLIC_`, ingen `localStorage`, ingen henting utenfor `localhost`.
- Ikke rør `CLAUDE.md`, `.claude/settings.json`, `.git/hooks/` eller planleggingsdokumentene.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ny konto | `{"email":"  Klara@Eksempel.NO ","password":"hemmelig1"}` | `201 {"id": "<uuid>", "email": "klara@eksempel.no"}`, `Set-Cookie: sk_session=…` | — |
| Finnes fra før | samme adresse med annen skrivemåte | `409 EMAIL_ALREADY_REGISTERED` | ingen ny rad |
| Samtidig dobbel | unik-indeksen slår til ved commit | `409 EMAIL_ALREADY_REGISTERED` | `IntegrityError` fanges, ingen `rollback()` |
| Ugyldig e-post | `klara`, `klara@eksempel`, tom, 255 tegn | `422 INVALID_EMAIL` | — |
| For kort | 7 tegn | `422 PASSWORD_TOO_SHORT` | — |
| 72 byte | 36 «æ» | `201` | — |
| 73+ byte | 37 «æ» | `422 PASSWORD_TOO_LONG` | — |
| Felt mangler | `{"email":"a@b.no"}` | `422 VALIDATION_ERROR` | — |
| Prod uten nøkkel | `APP_ENV=production`, ingen `JWT_SECRET` | oppstart stopper, logg nevner `JWT_SECRET` | exit 1 |
| Skjema: feil e-post / kort / langt passord | sendes i nettleseren | zod stopper kallet, meldingen under feltet, fokus til første feil | — |
| Skjema: 409 fra API | sendes | meldingen under e-postfeltet, fokus dit | — |
| Skjema: annen feil | 500 / nett | reserveteksten i et varsel (`role="alert"`) over knappen | — |

</intent-contract>

## Code Map

- `backend/app/core/config.py` -- `Settings`; legg til `JWT_SECRET` med `Field(default=None, validate_default=True)` og `field_validator` som leser `info.data["APP_ENV"]`. `get_settings()` logger allerede `loc` + melding og avslutter med 1.
- `backend/app/core/errors.py` -- `ErrorCode` + `ERROR_STATUS`; legg til de fire kodene. Testen i `backend/tests/test_errors.py` sjekker meldingsfila.
- `backend/app/core/security.py` (ny) -- `hash_password`, `verify_password` (brukes i 1.5), `create_session_token(user_id)`, `set_session_cookie(response, token)`, konstantene `SESSION_COOKIE = "sk_session"` og `SESSION_MAX_AGE`.
- `backend/app/modules/identity/` (ny) -- `models.py` (`User` på `Base` fra `core/db.py`, `Uuid`-kolonne, `DateTime(timezone=True)`), `schemas.py` (`RegisterRequest`, `UserOut`), `service.py` (`register_user(session, email, password)`), `router.py` (`POST /api/identity/register`, status 201).
- `backend/app/main.py` -- `create_app()` tar med identity-routeren.
- `backend/alembic/env.py` -- importer `app.modules.identity.models` (kommentaren sier at det skal skje i 1.4). Ny migrering i `backend/alembic/versions/`.
- `backend/tests/conftest.py` -- `engine`-fixturen må lage tabellene (`Base.metadata.create_all`) etter at modellene er importert.
- `backend/tests/test_migrations.py` -- utvides: `users` med riktige kolonner og unik `email` etter `upgrade head` på SQLite.
- `backend/pyproject.toml`, `uv.lock` -- `pyjwt==2.15.1`, `bcrypt==5.0.0`.
- `frontend/app/globals.css` -- byttes til `@import "tailwindcss"` + `@theme` med alle tokens. `frontend/postcss.config.mjs` (ny).
- `frontend/app/layout.tsx` -- importer `@fontsource-variable/inter/wght.css`; `Providers` beholdes.
- `frontend/app/page.tsx` -- startsiden fra 1.1, uendret innhold; e2e `skjelett.spec.ts` må fortsatt gå grønt.
- `frontend/lib/api.ts`, `frontend/lib/messages.ts` -- transport og `messageFor` fra 1.3 brukes uendret (bare nye nøkler).
- `frontend/vitest.config.ts` -- legg til `@`-alias; komponenttester bruker `// @vitest-environment jsdom`.
- `frontend/e2e/` -- Playwright mot `docker compose up --build`; `AxeBuilder` brukes som i `skjelett.spec.ts`.
- Skisse: `_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/mockups/01-logg-inn.svg` -- kort 464 px, 48 px innvendig marg, felt 48 px, stor hovedknapp, grå semesterlinje (kan kopieres som inline SVG) og setningen under.

## Tasks & Acceptance

**Execution:**
- `backend/pyproject.toml`, `backend/uv.lock` -- legg til `pyjwt==2.15.1` og `bcrypt==5.0.0` -- AR-10
- `backend/app/core/config.py`, `.env.example`, `README.md`, `docker-compose.yml` -- `JWT_SECRET` (Compose: `${JWT_SECRET:-}`) -- AR-10, NFR-4
- `backend/app/core/errors.py`, `frontend/lib/messages.ts` -- fire nye koder og de godkjente tekstene -- FR-1, AR-12
- `backend/app/core/security.py` -- bcrypt og JWT-cookie -- NFR-7, AR-10
- `backend/app/modules/identity/{__init__,models,schemas,service,router}.py`, `backend/app/main.py` -- registrering etter matrisen -- FR-3
- `backend/alembic/env.py`, `backend/alembic/versions/0001_create_users.py` -- tabellen `users` (`id` UUID PK, `email` unik, `password_hash`, `created_at` UTC) -- AR-13
- `backend/tests/conftest.py`, `backend/tests/test_identity.py`, `backend/tests/test_security.py`, `backend/tests/test_migrations.py`, `backend/tests/test_config.py` -- dekker backend-radene i matrisen, cookie-attributtene og JWT-innholdet, at passordet ikke står i databasen eller i noen loggpost (`caplog` på DEBUG), og `JWT_SECRET`-reglene -- AR-17
- `frontend/package.json`, `package-lock.json` -- eksakte versjoner: `tailwindcss` og `@tailwindcss/postcss` 4.3.5, `lucide-react` 1.73.0, `zod` 4.6.7, `@fontsource-variable/inter` 5.3.0; dev: `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.1, `jsdom` 30.1.3
- `frontend/postcss.config.mjs`, `frontend/app/globals.css`, `frontend/app/layout.tsx` -- Tailwind-tema med alle tokens (farger, typografi som `--text-*` med vekt/sperring/linjehøyde, `--spacing-*` inkludert sideoppsett og komponentmål, `--radius-*`, `--shadow-lift`/`--shadow-float`, slør 42 %), Inter med reserve, `tnum` på `body`, global fokusring -- UX-DR1, UX-DR2, UX-DR4
- `frontend/components/icon.ts`, `button.tsx`, `text-field.tsx`, `password-field.tsx`, `top-bar.tsx`, `semester-line.tsx` -- felles komponenter: knapp med variantene `primary`/`outline`/`text`/`danger` og størrelsene 40/48 px; tekstfelt med synlig etikett, 48 px, feil med 1,5 px rød kant + ikon + tekst koblet med `aria-describedby`/`aria-invalid`, `forwardRef` til `input`; passordfelt med «Vis» (`aria-pressed`); toppfelt med bare logo; grå semesterlinje med `aria-hidden` -- UX-DR5, UX-DR6
- `frontend/modules/identity/{types,api,validation}.ts`, `frontend/modules/identity/pages/register-page.tsx`, `frontend/app/(auth)/layout.tsx`, `frontend/app/(auth)/registrer/page.tsx` -- siden «Opprett konto»: zod-skjema, `useMutation` mot `/api/identity/register`, feil per felt med fokus, `router.push("/")` ved suksess, `noValidate` på skjemaet -- FR-3, NFR-11, NFR-12
- `frontend/lib/design-tokens.test.ts`, `frontend/components/*.test.tsx`, `frontend/modules/identity/*.test.ts(x)` -- tema = DESIGN.md-farger, ingen `outline-none`/andre vekter i kildekoden, knappvarianter, feiltilstand i tekstfelt, «Vis», zod-reglene (36/37 «æ»), feil fra API vises under riktig felt -- AR-17
- `frontend/e2e/opprett-konto.spec.ts` -- side, axe uten og med feilmelding, tastaturrekkefølge og Enter, 409-melding, vellykket konto lander på `/` med cookien satt, ingen forespørsler utenfor `localhost` -- NFR-9, NFR-12, UX-DR45
- `README.md` -- hvordan man oppretter konto på `http://localhost:3000/registrer`

**Acceptance Criteria:**
- Given Alembic, when `upgrade head` kjører på SQLite i testen og på Postgres i Docker, then finnes `users` med unik `email`.
- Given `/registrer` uten innlogging, when siden vises, then er det ett `header` med bare logoen, én h1 «Opprett konto», undertittelen, feltene «E-post» og «Passord» med «Vis», hovedknappen «Opprett konto», den grå semesterlinja skjult for skjermleser og setningen under, og axe finner ingen brudd.
- Given skjemaet, when studenten bruker bare tastaturet, then går fokus E-post → Passord → Vis → Opprett konto, ringen vises, og Enter i et felt sender skjemaet.
- Given gyldig e-post og passord, when studenten oppretter konto, then lander hun på `/` og har cookien `sk_session` med `HttpOnly`.
- Given en side i appen, when den lastes i Playwright, then går ingen forespørsel til en annen vert enn `localhost`, og `body` bruker «Inter Variable» med `tnum`.

## Spec Change Log

## Review Triage Log

### 2026-11-20 — Review pass
- verdicts: 32 findings — high 0, medium 5, low 17, false 10, maybe-false 0
- findings:
  - `[low]` `[reject]` (blind) Svak `JWT_SECRET` («x», bare mellomrom) godtas utenfor `local` — stemmer, men appen kjøres bare lokalt i dette prosjektet, og en minstelengde er en ny regel som spesifikasjonen ikke har. Lagt fram for Silje som kanttilfelle.
  - `[low]` `[reject]` (blind) `APP_ENV`-sjekken avhenger av feltrekkefølgen og eksakt `"local"`, og `str` har `None` som standard — feiler høyt ved oppstart om noe endres; typen er kosmetisk.
  - `[false]` `[reject]` (blind) KI-sporet i `docs/ki-prosess/` mangler — skrives i samme økt etter gjennomgangen (steg 5 i story-prompten).
  - `[false]` `[reject]` (blind) Spesifikasjonen har tomme logger og status `in-review` — loggen skrives nå, i denne gjennomgangen.
  - `[low]` `[patch]` (blind) Ingen test sammenligner migreringen med modellene, og Postgres sjekkes ikke direkte — ny test med `compare_metadata` etter `upgrade head`. Postgres-delen avvist: e2e-testene registrerer mot Postgres i Docker, og migreringen kjører ved hver oppstart.
  - `[low]` `[patch]` (blind) Frontend og backend teller e-postlengden ulikt (UTF-16 mot kodepunkter); ulike blanktegn-regler — lengden rettet med `characterCount`. Blanktegn og «İ» avvist: eksotiske tegn som ingen skriver i en e-postadresse.
  - `[medium]` `[patch]` (blind) Ingen synlig ventetilstand og ingen test av dobbelt innsending — `aria-disabled:`-stil i knappen, vakt med `useRef`, ny test.
  - `[low]` `[patch]` (blind) Gammelt varsel (`role="alert"`) blir stående etter redigering; dobbel parsing — varselet fjernes nå ved redigering. Dobbel parsing avvist: ufarlig.
  - `[low]` `[patch]` (blind) `{...inputProps}` etter `aria-describedby` kan bryte koblingen til feilmeldingen — spredningen flyttet før de beregnede attributtene.
  - `[false]` `[reject]` (blind) Feil JSON-typer er ikke testet, og `VALIDATION_ERROR` kan vise passordet — Pydantic gjør ikke tall om til tekst (422), og håndtereren sender bare feltnavn og feiltype, aldri verdien.
  - `[low]` `[reject]` (blind) Ingen hastighetsgrense på `register` — ikke i storien eller arkitekturen; appen kjøres lokalt.
  - `[false]` `[reject]` (blind) Unikhet uten `lower(email)` i databasen — bare `identity` skriver tabellen, og tjenesten normaliserer alltid før lagring.
  - `[low]` `[reject]` (blind) README nevner ikke at ny `JWT_SECRET` logger alle ut, eller at `down -v` sletter kontoene — `down -v` står allerede i README med «det sletter den lokale databasen».
  - `[low]` `[reject]` (edge) Enslig surrogat i passordet gir 500 i stedet for 422 — bare med håndskrevet JSON mot API-et; svaret er fortsatt i feilformatet uten detaljer.
  - `[low]` `[reject]` (edge) NUL-tegn i e-posten gir 500 på Postgres — samme som over: kan ikke skrives i skjemaet.
  - `[low]` `[reject]` (edge) NFC/NFD-varianter av samme adresse gir to kontoer — svært sjeldent, og retting er en ny regel.
  - `[low]` `[patch]` (edge) zod `.max` teller UTF-16 — samme rot og retting som blind-raden om lengde.
  - `[low]` `[reject]` (edge) Kort `JWT_SECRET` godtas utenfor `local` — samme som blind-raden; kanttilfelle-issue.
  - `[low]` `[reject]` (edge) `APP_ENV=Local` regnes som ikke-lokal — appen nekter å starte med en tydelig linje, som er trygt.
  - `[low]` `[reject]` (edge) Subprosess-testen feiler hvis utviklerens `.env` setter `JWT_SECRET` — ingen `.env` finnes i repoet; samme forutsetning som testene fra story 1.3.
  - `[false]` `[reject]` (edge) `user.id` etter commit gir `MissingGreenlet` — `SessionLocal` og testene bruker `expire_on_commit=False`, og ID-en settes i Python før insert.
  - `[medium]` `[patch]` (edge) To raske innsendinger før ny rendring sender to POST — samme rot som blind-raden om dobbel innsending; vakten er en `useRef` som settes med en gang.
  - `[medium]` `[patch]` (edge) Ny innsending mens `router.push` navigerer gir 409 — samme rot; vakten står på etter suksess.
  - `[low]` `[patch]` (edge) Kallerens `aria-describedby` overstyrer feilkoblingen — samme rot og retting som blind-raden.
  - `[medium]` `[patch]` (verification-gap) Vakten mot dobbel innsending har ingen test — ny test i `register-page.test.tsx`.
  - `[medium]` `[patch]` (verification-gap, other) `isPending` leses fra lukningen — samme rot; `useRef`.
  - `[false]` `[reject]` (intent) Testnavn er på norsk, ikke engelsk — storien krever selv norske testnavn med krav-ID (`test_fr3_opprett_konto`).
  - `[low]` `[reject]` (intent) Migreringen testes bare på SQLite — e2e-testene kjører registrering mot Postgres i Docker; se også `compare_metadata`-testen.
  - `[false]` `[reject]` (intent) Ingen test viser at cookien godtas som innlogging — `/me` og `current_user` hører til story 1.5; akseptkriteriet i 1.4 er at cookien settes.
  - `[false]` `[reject]` (intent) Loggsjekken dekker bare backendens logging — passordet går bare gjennom Next sin rewrite, som ikke logger kropper; backenden er der passordet behandles.
  - `[false]` `[reject]` (intent) Krav-ID-er som AR-15 og UX-DR46 står ikke i noe testnavn — kravet er at hvert testnavn har ID-en det tester, ikke at hver ID har en egen test.
  - `[false]` `[reject]` (intent) Testen av forespørsler utenfor `localhost` er merket NFR-2, som ikke står i kravlista — NFR-2 er kravet om at appen virker uten nett (DESIGN.md viser til det for fontene).

## Design Notes

**Tokens og Tailwind 4:** DESIGN.md-skalaen `spacing.1–9` (4, 8, 16 … 80 px) defineres som `--spacing-1` … `--spacing-9`, så `p-3` blir 16 px som i DESIGN.md og ikke 12 px som i Tailwind. Navngitte mål (`--spacing-topbar-height`, `--spacing-button-height` …) gir klasser som `h-button-height`. Fargetesten leser `colors:` i frontmatteren i DESIGN.md og krever samme verdi for `--color-<navn>` i `globals.css`.

**Hvorfor ikke shadcn:** komponentene i AC er fire knappevarianter, et tekstfelt og et passordfelt. Generatoren drar inn Radix, `cva` og `tailwind-merge` og må deretter skrives om til DESIGN.md likevel. Håndskrevne komponenter med Tailwind er færre pakker og lettere å forklare. Dialogen (epic 2) kan vurdere shadcn på nytt.

**Feil fra API til felt:** `INVALID_EMAIL` og `EMAIL_ALREADY_REGISTERED` → e-postfeltet; `PASSWORD_TOO_SHORT`/`PASSWORD_TOO_LONG` → passordfeltet; alt annet → varsel over knappen med `messageFor(code)`.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alle grønne
- `cd frontend && npm run test` -- expected: alle grønne
- `cd frontend && npx tsc --noEmit` -- expected: ingen typefeil
- `docker compose up --build -d --wait && cd frontend && npx playwright test` -- expected: alle grønne

## Auto Run Result

Status: done

**Sammendrag:** En student kan opprette konto på `/registrer`. Backenden har modulen `identity` med tabellen `users` (første migrering), `POST /api/identity/register` med sjekk i fast rekkefølge, bcrypt-hash og HS256-JWT i HttpOnly-cookien `sk_session` (30 dager), og innstillingen `JWT_SECRET` som bare har standardverdi når `APP_ENV=local`. Frontenden har Tailwind 4 med alle tokens fra DESIGN.md, Inter fra pakken med `tnum`, global fokusring, felles komponenter skrevet for hånd og siden «Opprett konto» med zod-sjekk, feil under feltet og fokus til første feil.

**Filer:**
- `backend/app/core/config.py` -- `JWT_SECRET` med lokal standardverdi og stopp utenfor `local`
- `backend/app/core/errors.py`, `frontend/lib/messages.ts` -- fire nye koder med de godkjente tekstene
- `backend/app/core/security.py` -- bcrypt, JWT og cookien (ny)
- `backend/app/modules/identity/` -- modeller, skjema, tjeneste og rute (ny)
- `backend/alembic/versions/0001_create_users.py`, `backend/alembic/env.py` -- tabellen `users`
- `backend/tests/` -- `test_identity.py`, `test_security.py`, utvidet `test_migrations.py`, `test_config.py`, `conftest.py`
- `frontend/app/globals.css`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx` -- tema, font, fokusring
- `frontend/components/` -- `button`, `text-field`, `password-field`, `top-bar`, `semester-line`, `icon` med tester
- `frontend/modules/identity/`, `frontend/app/(auth)/` -- siden «Opprett konto» med tester
- `frontend/lib/design-tokens.test.ts`, `frontend/e2e/opprett-konto.spec.ts` -- tema mot DESIGN.md, e2e med axe
- `README.md`, `.env.example`, `docker-compose.yml`, `package.json`, `pyproject.toml` og låsefilene

**Gjennomgang:** 32 funn. Rettet (5 grupper): medium 1 (dobbel innsending: vakt med `useRef` som står på etter suksess, stil for `aria-disabled`, test), low 4 (gammelt varsel fjernes ved redigering, e-postlengde telles i tegn i frontend, `aria-*` i tekstfeltet kan ikke overstyres, test som sammenligner migreringen med modellene). Ingen utsatt. Avvist: 10 `false` og 13 `low` med grunner i Review Triage Log.

**Anbefaling om ny gjennomgang:** `false`. Én medium-gruppe ble rettet og er dekket av en test; ingen ubekreftet risiko kan navngis.

**Verifisering:**
- `cd backend && uv run pytest` -- 71 passed
- `cd frontend && npm run test` -- 169 passed
- `cd frontend && npx tsc --noEmit` -- ingen feil
- `docker compose up --build -d --wait && cd frontend && npx playwright test` -- 12 passed
- For hånd: drift-testen feiler når en kolonne legges til i modellen uten migrering; skjermbilder av `/registrer` i 1280 og 768 px sammenlignet med skisse 01.

**Gjenværende risiko:** `JWT_SECRET` har ingen minstelengde utenfor `local` (lagt fram som kanttilfelle). Ingen hastighetsgrense på registreringen. Lenken tilbake til «Logg inn» kommer i story 1.5.
