---
title: 'Story 1.6: Bruk appen innlogget, logg ut og få «Fant ikke siden»'
type: 'feature'
created: '2026-11-20'
baseline_revision: '6f20a3b639e0d15067a49f9956272b9688da39ed'
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

**Problem:** Etter innlogging kommer studenten til en plassholder uten toppfelt og uten «Logg ut». Sidene i appen er ikke beskyttet, det finnes ingen `POST /api/identity/logout`, ingen side «Fant ikke siden», ingen felles hjelper for «bare egne rader», ingen test som krever `current_user` på alle ruter og ingen felles dialog (story 1.6 i `epics.md`, FR-1, FR-3, FR-4, NFR-11, NFR-12, AR-2, AR-10, AR-12, UX-DR4–6, UX-DR21, UX-DR40, UX-DR41, UX-DR43, UX-DR45).

**Approach:** Backend: `logout`-ruten, hjelperen `get_owned` i `core/ownership.py` og en test som går gjennom alle ruter (også i inkluderte routere). Frontend: route-gruppen `(app)` med en vakt som spør `/me`, fullt toppfelt, forsiden «Dine emner», felles håndtering av `401 UNAUTHENTICATED` (med «Du er logget ut»-meldingen bare når fanen har vært innlogget), «Fant ikke siden» med hjelper i fetch-transporten, og en felles dialog.

## Boundaries & Constraints

**Always:**
- `POST /api/identity/logout`: `204`, sletter `sk_session` (samme `path`, `httponly`, `samesite` som da den ble satt), virker også uten eller med ugyldig cookie, bruker ikke `current_user`.
- `get_owned(session, model, row_id, user_id)` i `backend/app/core/ownership.py`: henter raden der `id == row_id` og `user_id == user_id`; finnes ikke eller tilhører en annen → `AppError(NOT_FOUND)`. Svaret er byte for byte likt i begge tilfellene, aldri `403`.
- Rutetesten finner alle `APIRoute` rekursivt (også gjennom `_IncludedRouter.original_router` og prefiks fra `include_context`), sjekker at stien den fant er den samme mengden som i OpenAPI, og feiler for hver rute uten `current_user` i avhengighetstreet (rutens egne og routerens) utenom de fem offentlige.
- Frontend avgjør innlogging bare med `GET /api/identity/me` (TanStack Query, nøkkel `["me"]`). Før svaret vises ingen innhold. `401` → `router.replace("/logg-inn")` uten melding.
- Alle `401 UNAUTHENTICATED` fra spørringer og mutasjoner går til én funksjon (via `QueryCache`/`MutationCache` `onError`). Et flagg i `sessionStorage` (per fane, bare `"1"`, aldri token) settes når `/me` lykkes. Ved 401: finnes flagget → fjern det og sett flagget «utløpt»; tøm spørringsbufferen; gå til `/logg-inn`. Innloggingssiden leser og fjerner «utløpt» etter montering og viser «Du er logget ut. Logg inn igjen.» i et `role="status"`-område som alltid finnes.
- «Logg ut»: kaller `logout`, fjerner flagget, tømmer bufferen og går til `/logg-inn` uten bekreftelse og melding. Vakt mot dobbelklikk. Feiler kallet, blir hun stående innlogget og ser «Noe gikk galt. Prøv igjen.» i `role="alert"` under toppfeltet.
- Toppfelt (skisse 02): logo som lenke til `/`; til høyre initialsirkel (24 px, `brand-tint`, bokstav i `brand`, første tegn i e-posten med stor bokstav, `aria-hidden`) og «Konto» i én lenke til `/konto` (blekk), hårlinje, og knappen «Logg ut» med `LogOut`-ikon i dempet grå. Ingen understreking. Auth-sidene beholder bare logoen (ikke lenke).
- Forsiden `/`: h1 «Dine emner», tittel «Dine emner – Studiekamerat», `home-margin` (80 px) på sidene, ingen sidemeny.
- «Fant ikke siden»: felles komponent med h1 «Fant ikke siden» og lenken «Gå til forsiden» (`/`). `app/not-found.tsx` (ukjente adresser, toppfelt med bare logo, HTTP 404) og `app/(app)/not-found.tsx` (inne i appen). `notFoundOnMissing(error)` i `lib/api.ts` kaller `notFound()` for `ApiError` med kode `NOT_FOUND`.
- Dialog `components/dialog.tsx`: `role="dialog"`, `aria-modal`, `aria-labelledby` til tittelen, over sløret (`bg-scrim-veil`), `shadow-float`, `rounded-xl`, kant `border-card`, bredde 560/640/720, lukkekryss «Lukk», skillelinje, knappene «Avbryt» så hovedhandling. Fokus inn ved åpning, holdes inne med Tab/Shift+Tab, Esc lukker uten å kalle hovedhandlingen, fokus tilbake til elementet som åpnet.
- Testnavn har krav-ID (AR-17). Kode, variabelnavn og kommentarer på engelsk; all synlig tekst på bokmål og bare godkjente tekster.

**Never:**
- Ingen `proxy.ts`/middleware, frontend leser aldri cookien, ingen `localStorage`, ingen `NEXT_PUBLIC_`.
- Ingen kontoside (epic 2), ingen emner på forsiden, ingen sidemeny, ingen bruk av dialogen på en side.
- Ingen omdirigering for innloggede som åpner `/logg-inn` (ikke i storien).
- Ikke rør `CLAUDE.md`, `.claude/settings.json`, `.git/hooks/` eller planleggingsdokumentene.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Logg ut | `POST /logout` med gyldig cookie | `204`, `Set-Cookie: sk_session=""; Max-Age=0; Path=/; HttpOnly; SameSite=lax`; `/me` gir så 401 | — |
| Logg ut uten cookie | ingen eller ugyldig cookie | `204` | — |
| Egen rad | `get_owned` med egen id | raden | — |
| Andres rad / ukjent id | annen brukers id, tilfeldig UUID | `404 {"error":{"code":"NOT_FOUND","details":{}}}`, likt | aldri 403 |
| Ny rute uten vakt | testrouter med åpen rute | rutetesten lister den | — |
| Åpner `/` uten innlogging | `/me` 401, ingen flagg | `/logg-inn`, ingen melding | — |
| Cookie borte etter innlogging i fanen | flagget satt, `/me` 401 | `/logg-inn` med «Du er logget ut. Logg inn igjen.» | — |
| Logget ut, går tilbake | flagget fjernet | `/logg-inn`, ingen melding | — |
| `/me` svarer 500 / nett | annen feil | «Noe gikk galt. Prøv igjen.» i `role="alert"` | ingen omdirigering |
| Ukjent adresse | `/finnes-ikke` | HTTP 404, h1 «Fant ikke siden», «Gå til forsiden» | — |
| Dialog Esc | åpen dialog | lukkes, hovedhandling ikke kalt, fokus til åpneren | — |

</intent-contract>

## Code Map

- `backend/app/main.py` -- `create_app()` lager appen; tester lager egne apper med testrutere.
- `backend/app/core/security.py` -- `SESSION_COOKIE`, `set_session_cookie`; legg til `clear_session_cookie(response)` med samme attributter.
- `backend/app/core/errors.py` -- `AppError`, `ErrorCode.NOT_FOUND` finnes; ingen nye koder.
- `backend/app/modules/identity/router.py` -- `register`, `login`, `me`; legg til `POST /logout` (204).
- `backend/app/modules/identity/dependencies.py` -- `current_user`.
- `backend/tests/conftest.py` -- `engine`, `client` (overstyrer `get_session`, tømmer overrides).
- `backend/tests/test_current_user.py` -- `test_ar2_me_bruker_current_user` viser at `app.routes` har `_IncludedRouter` med `.original_router` og `.include_context` (`prefix`, `dependencies`).
- Testtabell: egen `DeclarativeBase` i testfila (ikke `Base`, så migrasjonstesten ikke påvirkes), tabell med `id` og `user_id` (UUID), opprettes på test-engine.
- `frontend/app/page.tsx` -- plassholder; slettes, erstattes av `frontend/app/(app)/page.tsx`.
- `frontend/app/(auth)/layout.tsx` -- mønster for layout med `TopBar` + `main`.
- `frontend/components/top-bar.tsx` -- `TopBar({children})`, `Logo`; får prop `logoHref` (lenke når satt).
- `frontend/lib/api.ts` -- `ApiError`, `apiFetch` (204 → `undefined`); legg til `notFoundOnMissing`, `isUnauthenticated`.
- `frontend/lib/query-client.ts` -- `makeQueryClient`; legg til `QueryCache`/`MutationCache` med `onUnauthenticated`.
- `frontend/lib/providers.tsx` -- lager klienten; kobler `onUnauthenticated` til `handleSessionLost` med `useRouter`.
- `frontend/lib/session.ts` (ny) -- flaggene i `sessionStorage` med try/catch: `markSignedIn`, `clearSignedIn`, `noteSessionLost` (returnerer om meldingen skal vises), `takeSessionExpired`.
- `frontend/modules/identity/api.ts` -- legg til `fetchMe`, `logoutUser`; `pages/login-page.tsx` får statusområdet.
- `frontend/lib/messages.ts` -- `UNAUTHENTICATED` har teksten, `FALLBACK_MESSAGE`.
- `frontend/e2e/skjelett.spec.ts`, `opprett-konto.spec.ts` (linje ~131) -- forventer h1 «Studiekamerat» på `/`; må endres.
- Skisse `mockups/02-emner.svg` -- toppfelt: logo x=24; sirkel r=12; «Konto» 14 px/500 blekk; hårlinje 20 px; ikon + «Logg ut» 14 px/500 `ink-muted`; høyre marg 24 px. h1 ved x=80.

## Tasks & Acceptance

**Execution:**
- `backend/app/core/security.py`, `backend/app/modules/identity/router.py` -- `clear_session_cookie`, `POST /logout` -- FR-3, AR-10
- `backend/app/core/ownership.py` (ny) -- `get_owned` -- FR-4, AR-2
- `backend/tests/test_logout.py`, `backend/tests/test_ownership.py`, `backend/tests/test_route_guard.py` (nye) -- matrisens backend-rader, rutegjennomgang med OpenAPI-krysssjekk og negativ test -- AR-17
- `frontend/lib/{api,session,query-client,providers}.ts(x)` -- 404-hjelper, 401-håndtering, flagg -- FR-4, UX-DR40
- `frontend/components/{top-bar,not-found-view,dialog}.tsx` -- toppfelt med logo-lenke, «Fant ikke siden», dialog -- UX-DR4, UX-DR6, UX-DR21, UX-DR41
- `frontend/modules/identity/{api.ts,components/require-login.tsx,components/account-links.tsx,pages/login-page.tsx}` -- vakt, konto/logg ut, meldingen -- FR-3, UX-DR40
- `frontend/app/(app)/{layout,page,not-found}.tsx`, `frontend/app/not-found.tsx`, slett `frontend/app/page.tsx` -- rammen, forsiden, 404 -- UX-DR5, UX-DR45
- `frontend/**/*.test.ts(x)` -- flaggene, 401-håndtering, `notFoundOnMissing`, vakt, toppfelt, logg ut (også feil), meldingen, dialogen (fokus inn, felle, Esc, fokus tilbake, rekkefølge, bredder) -- AR-17
- `frontend/e2e/innlogget.spec.ts` (ny), `skjelett.spec.ts`, `opprett-konto.spec.ts` -- hele reisen, axe, tastatur, 404 -- NFR-12, NFR-13
- `README.md` -- logg inn og ut, 30 dager

**Acceptance Criteria:**
- Given en innlogget student på `/`, when siden vises, then er det ett `header` med logo-lenke, «K» + «Konto» og «Logg ut», ett `main` med én h1 «Dine emner», Tab går logo → Konto → Logg ut med synlig fokusring, og axe finner ingen brudd.
- Given Playwright i Docker, when den oppretter konto, logger ut, går tilbake, åpner `/`, logger inn, sletter cookien og laster `/`, then havner hun på `/logg-inn` hver gang, og «Du er logget ut. Logg inn igjen.» står bare i det siste tilfellet (i `role="status"`, uten axe-brudd).
- Given `/finnes-ikke`, when siden åpnes, then svarer serveren 404, viser h1 «Fant ikke siden» og «Gå til forsiden» som kan nås med Tab, og axe finner ingen brudd.
- Given en ny rute uten `current_user` som ikke er på unntakslista, when `uv run pytest` kjører, then feiler rutetesten.

## Spec Change Log

## Review Triage Log

## Design Notes

**Flagg per fane:** Backenden kan ikke se forskjell på «utløpt» og «aldri innlogget». `sessionStorage` lever bare i én fane, så en ny fane etter utløp har ikke flagget og får ingen melding, slik storien krever. Flagget er bare `"1"`; det sier ingenting om hvem som er innlogget.

**Én vei for 401:** Vakten (`/me`) og senere sider får samme behandling fordi alt går gjennom `QueryCache`/`MutationCache`. Senere epics trenger ikke tenke på utløpt innlogging.

**Rutetesten:** I FastAPI 0.162 ligger inkluderte routere som `_IncludedRouter` i `app.routes`. Testen går rekursivt gjennom dem og krysssjekker mot OpenAPI, så den ikke stille kan hoppe over ruter hvis strukturen endres.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alle grønne
- `cd frontend && npm run test && npx tsc --noEmit` -- expected: alle grønne, ingen typefeil
- `docker compose up --build -d --wait && cd frontend && npx playwright test` -- expected: alle grønne
