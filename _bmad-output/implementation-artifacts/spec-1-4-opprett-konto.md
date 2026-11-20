---
title: 'Story 1.4: Opprett konto'
type: 'feature'
created: '2026-11-20'
baseline_revision: '3c154ec9083d5878f43cb299d9560a11773ffe11'
status: 'in-progress'
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
