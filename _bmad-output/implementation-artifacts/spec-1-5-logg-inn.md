---
title: 'Story 1.5: Logg inn'
type: 'feature'
created: '2026-11-20'
baseline_revision: '7571307f551187e02b1e0eaf25c02358c5f6fb0f'
status: 'ready-for-dev'
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

**Problem:** En student som har konto, kan ikke logge inn igjen: det finnes ingen `POST /api/identity/login`, ingen `GET /api/identity/me`, ingen felles avhengighet `current_user` og ingen side `/logg-inn`. «Opprett konto» mangler veien tilbake til «Logg inn» (story 1.5 i `epics.md`, FR-3, NFR-11, NFR-12, AR-2, AR-10, UX-DR25, UX-DR40).

**Approach:** Backend: `login` i `identity`-tjenesten som sjekker e-post og passord med bcrypt og setter samme cookie som registreringen, `current_user` som leser og sjekker JWT-en i `sk_session` og henter brukeren, og `/me` som første rute som bruker den. Frontend: siden `/logg-inn` i `(auth)`-layouten med samme kort og komponenter som «Opprett konto» (skisse 01), lenker begge veier mellom de to sidene, og et felles kort-skall for begge.

## Boundaries & Constraints

**Always:**
- Nye feilkoder i `core/errors.py` og `frontend/lib/messages.ts`: `INVALID_CREDENTIALS` 401 → «Feil e-post eller passord. Sjekk at Caps Lock er av.», `UNAUTHENTICATED` 401 → «Du er logget ut. Logg inn igjen.» (ordrett fra EXPERIENCE.md).
- Innlogging: e-posten `strip()` + `lower()` som ved registrering; passordet strippes aldri. Ukjent e-post, feil passord, tomt passord, passord over 72 byte og ugyldig e-postformat gir alle nøyaktig samme svar: `401 {"error":{"code":"INVALID_CREDENTIALS","details":{}}}` uten `Set-Cookie`. Ukjent e-post kjører likevel en bcrypt-sjekk mot en fast hash, så svartiden ikke avslører om kontoen finnes. bcrypt kjøres i tråd (`run_in_threadpool`).
- Vellykket innlogging: `200 {id, email}` og cookien `sk_session` laget med de samme funksjonene som i 1.4 (`create_session_token`, `set_session_cookie`). JWT-en står aldri i svarkroppen.
- `current_user` (i `backend/app/modules/identity/dependencies.py`): leser cookien, dekoder med `algorithms=["HS256"]` og krever `exp`, `iat` og `sub`; `sub` må være en UUID og brukeren må finnes. Alt annet (ingen cookie, feil signatur, utløpt, annen algoritme inkludert `none`, ødelagt token, slettet bruker) gir `401 UNAUTHENTICATED`. Ingen annen kode leser cookien eller dekoder JWT-en.
- Frontend: feil e-post eller passord → meldingen under **passordfeltet** med rød kant (som skisse 01), fokus dit, koblet med `aria-describedby`. Ugyldig e-postformat stoppes av zod før kallet med `INVALID_EMAIL` under e-postfeltet. Andre feil → varsel (`role="alert"`) over knappen. Vellykket → `router.push("/")`. Vakt mot dobbel innsending som i 1.4.
- Testnavn har krav-ID (AR-17). Kode, variabelnavn og kommentarer på engelsk; all synlig tekst på bokmål.

**Never:**
- Ingen `logout`-rute, ingen rutevakt, ingen omdirigering for innloggede som åpner `/logg-inn`, ingen bruk av `/me` i frontend, ingen meldingen «Du er logget ut» på siden (alt story 1.6).
- Ingen minstelengde på passordet ved innlogging i frontend (ingen godkjent tekst for det; backend svarer `INVALID_CREDENTIALS`).
- Ingen `NEXT_PUBLIC_`, ingen `localStorage`, frontend leser aldri cookien.
- Ikke rør `CLAUDE.md`, `.claude/settings.json`, `.git/hooks/` eller planleggingsdokumentene.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Logg inn | `{"email":" Klara@Eksempel.NO ","password":"hemmelig1"}` for eksisterende konto | `200 {"id","email":"klara@eksempel.no"}`, `Set-Cookie: sk_session=…` HttpOnly, Lax, `/`, 30 dager | — |
| Feil passord | riktig e-post, feil passord | `401 INVALID_CREDENTIALS` | ingen cookie |
| Ukjent e-post | e-post uten konto | samme svar som feil passord, byte for byte | bcrypt kjøres mot fast hash |
| Rart innhold | tomt passord, 37 «æ», `klara` som e-post | `401 INVALID_CREDENTIALS` | — |
| Felt mangler | `{"email":"a@b.no"}` | `422 VALIDATION_ERROR` | — |
| `/me` gyldig | cookie fra login eller register | `200 {"id","email"}` | — |
| `/me` ugyldig | ingen cookie, feil nøkkel, utløpt, `alg: none`, søppel, `sub` ikke UUID, bruker finnes ikke | `401 UNAUTHENTICATED` | — |
| Skjema: feil innlogging | 401 fra API | meldingen under passordfeltet, fokus dit | — |
| Skjema: ugyldig e-post | `klara` | zod stopper kallet, melding under e-postfeltet, fokus dit | — |
| Skjema: annen feil | 500 / nett | reserveteksten i varsel over knappen | — |

</intent-contract>

## Code Map

- `backend/app/core/security.py` -- `verify_password` (finnes, sier nei til over 72 byte), `create_session_token`, `set_session_cookie`, `SESSION_COOKIE`, `JWT_ALGORITHM`. Legg til `decode_session_token(token) -> uuid.UUID | None` her, så JWT-reglene står ett sted.
- `backend/app/core/errors.py` -- `ErrorCode`/`ERROR_STATUS`; to nye koder. `backend/tests/test_errors.py` sjekker at meldingsfila har dem.
- `backend/app/modules/identity/service.py` -- `normalize_email`, `register_user`; legg til `authenticate(session, email, password) -> User` og en fast reservehash (lages én gang, `functools.cache`).
- `backend/app/modules/identity/schemas.py` -- `LoginRequest` (`email: str`, `password: str`), `UserOut` gjenbrukes.
- `backend/app/modules/identity/dependencies.py` (ny) -- `current_user`, bruker `get_session` fra `core/db.py` og `Cookie(alias=SESSION_COOKIE)`.
- `backend/app/modules/identity/router.py` -- `POST /login` (200), `GET /me`.
- `backend/tests/conftest.py` -- `client`-fixturen overstyrer `get_session`; tester som lager tokens selv bruker `get_settings().JWT_SECRET`.
- `frontend/modules/identity/pages/register-page.tsx` -- mønsteret for felt, fokus, vakt og varsel; får lenken «Har du konto? Logg inn».
- `frontend/modules/identity/validation.ts` -- `registerSchema`, `fieldForErrorCode`; legg til `loginSchema`/`loginErrorCodes` (bare e-postregelen) og `INVALID_CREDENTIALS` → `password`.
- `frontend/app/(auth)/layout.tsx` -- toppfelt, `main`, semesterlinje og setning; uendret bortsett fra kommentaren.
- `frontend/e2e/opprett-konto.spec.ts` -- første test krever i dag at «Logg inn» ikke finnes; må endres.
- Skisse `_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/mockups/01-logg-inn.svg` -- kort 464 px, 48 px marg, feil under passordet, stor knapp, skillelinje (`divider`) og «Ny her?» (`ink-muted`) + «Opprett konto» (brand, vekt 500) med pil-ikon, midtstilt.

## Tasks & Acceptance

**Execution:**
- `backend/app/core/errors.py`, `frontend/lib/messages.ts` -- `INVALID_CREDENTIALS`, `UNAUTHENTICATED` med tekstene over -- FR-1, AR-12
- `backend/app/core/security.py` -- `decode_session_token` -- AR-10
- `backend/app/modules/identity/{schemas,service,dependencies,router}.py` -- innlogging, `current_user`, `/me` etter matrisen -- FR-3, AR-2, AR-10
- `backend/tests/test_login.py`, `backend/tests/test_current_user.py`, `backend/tests/test_security.py` -- alle backend-radene i matrisen, likt svar byte for byte, at reservehashen brukes for ukjent e-post, at passordet ikke står i loggen, og at `current_user` brukes av `/me` -- AR-17
- `frontend/modules/identity/components/auth-card.tsx` (ny) -- kortet (h1, undertittel, innhold, bunnlinje med skillelinje og lenke med tekst + lenketekst + pil); `register-page.tsx` bruker det -- UX-DR25
- `frontend/modules/identity/{types,api,validation}.ts`, `frontend/modules/identity/pages/login-page.tsx`, `frontend/app/(auth)/logg-inn/page.tsx` -- siden «Logg inn» med `autoComplete="current-password"`, tittel «Logg inn – Studiekamerat» -- FR-3, NFR-11, NFR-12
- `frontend/modules/identity/*.test.ts(x)`, `frontend/components/*` -- login-siden (feil under passordet med fokus, zod stopper ugyldig e-post, varsel ved 500, `push("/")`, vakt), lenkene begge veier, `loginErrorCodes` -- AR-17
- `frontend/e2e/logg-inn.spec.ts` (ny), `frontend/e2e/opprett-konto.spec.ts` -- side og axe uten og med feil, tastaturrekkefølgen og Enter, lenkene begge veier, opprett → slett cookie → logg inn → `/me` gir 200, at alle kallene gikk til `localhost:3000/api/…`, og HttpOnly -- NFR-12, UX-DR40
- `README.md` -- innlogging på `http://localhost:3000/logg-inn`

**Acceptance Criteria:**
- Given `/logg-inn` uten innlogging, when siden vises, then er det ett `header` med bare logoen, én h1 «Logg inn», undertittelen, «E-post», «Passord» med «Vis», hovedknappen «Logg inn», «Ny her?» med lenken «Opprett konto», semesterlinja (skjult for skjermleser) og setningen, og axe finner ingen brudd, heller ikke med feilmeldingen.
- Given skjemaet, when studenten bruker bare tastaturet, then går fokus E-post → Passord → Vis → Logg inn → Opprett konto, og Enter i et felt sender skjemaet.
- Given «Opprett konto»-lenken, when studenten velger den, then er hun på `/registrer`, og der fører «Logg inn» tilbake til `/logg-inn`.
- Given feil e-post eller passord, when hun logger inn, then står «Feil e-post eller passord. Sjekk at Caps Lock er av.» under passordfeltet med feilkant og `aria-invalid`, og fokus er i passordfeltet.
- Given en konto i Docker, when Playwright sletter cookien og logger inn igjen, then lander hun på `/`, `sk_session` er HttpOnly og ikke synlig i `document.cookie`, `/api/identity/me` svarer 200 med e-posten, og alle API-kallene gikk til `localhost:3000`.

## Spec Change Log

## Review Triage Log

## Design Notes

**Likt svar og lik tid:** Uten reservehash ville «ukjent e-post» svare på et par millisekunder og «feil passord» på rundt 200 ms, og da kan hvem som helst finne ut hvilke adresser som har konto. Derfor kjøres `verify_password` mot en fast hash også når brukeren ikke finnes.

**Feilen under passordfeltet:** Skissen viser feilen under passordet, og AC-en sier «under feltet». Fokus går dit, så skjermleseren leser feltet og meldingen sammen (samme mønster som i 1.4). E-postfeltet får ikke rød kant, fordi vi ikke vil si hvilket av de to som er feil.

**`current_user` i identity:** Arkitekturen sier at modulen som eier tabellen, leser den. `current_user` henter `User`, så den bor i `identity`. Senere moduler importerer bare avhengigheten.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alle grønne
- `cd frontend && npm run test` -- expected: alle grønne
- `cd frontend && npx tsc --noEmit` -- expected: ingen typefeil
- `docker compose up --build -d --wait && cd frontend && npx playwright test` -- expected: alle grønne
