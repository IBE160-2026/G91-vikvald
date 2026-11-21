---
title: 'Story 3.5: Lagre økten og se resultatet'
type: 'feature'
created: '2026-11-22'
baseline_revision: '04e242be76989e95cdaa65bc7fef813a16f9b0a9'
status: 'in-progress'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Flashcard-økten fra 3.3/3.4 lagrer ingenting. En ferdig økt viser bare «Økten er ferdig» (#154), og «Avslutt økt» går rett tilbake også når kort er markert (#153). Appen vet derfor ikke hva studenten har øvd på, og hun ser ikke hvilke kort hun bør se på igjen (story 3.5 i `epics.md`: FR-26, FR-56, NFR-10, NFR-12, AR-9, UX-DR8, UX-DR32–35, UX-DR44).

**Approach:** Ny backendmodul `practice` med tabellen `practice_sessions` (migrering 0007) og `POST /api/practice-sessions` (JSON eller `text/plain`, `ON CONFLICT DO NOTHING`). I frontend-modulen `practice` en hook som lager `session_id`, måler varigheten og sender resultatet nøyaktig én gang (ferdig, «Avslutt økt»/Esc, navigering, før utlogging, `pagehide` med `sendBeacon`), og resultatsiden (skisse 08) med `result-summary` og `missed-list`.

## Boundaries & Constraints

**Always:**
- **Tabell (`backend/app/modules/practice/models.py`, `alembic/versions/0007_create_practice_sessions.py`):** `id` (UUID, PK), `session_id` (UUID, unik), `subject_id` (FK `subjects.id`, `ON DELETE CASCADE`, indeks), `lecture_id` (FK `lectures.id`, `ON DELETE CASCADE`, kan være tom, indeks), `kind` (`flashcards`/`quiz`/`freetext`), `aborted` (bool), `shown`, `answered`, `correct`, `partial`, `wrong` (heltall), `started_at` (tidssone). Ingen `user_id`; eierskap via emnet (AR-9). Modellen registreres i `alembic/env.py` og `tests/conftest.py`.
- **API (`router.py`, `schemas.py`, `service.py`):** `POST /api/practice-sessions` med `current_user`. Kroppen leses rått og tolkes som JSON uansett `Content-Type` (JSON fra `fetch`, `text/plain` fra `sendBeacon`). Felt: `session_id` (UUID), `subject_id`, `lecture_id` (eller `null`), `kind`, `aborted`, `shown`, `answered`, `correct`, `partial` (standard 0), `wrong`, `duration_seconds` (heltall 0–2 678 400, altså høyst 31 dager). Ugyldig JSON eller felt gir `422 VALIDATION_ERROR` i det vanlige feilformatet. Regler: alle tall ≥ 0, `answered ≥ 1`, `correct + partial + wrong = answered`, `answered ≤ shown`. Emnet hentes med `get_subject` (andres eller ukjent → `404 NOT_FOUND`); en `lecture_id` må høre til dette emnet, ellers `404 NOT_FOUND`. `started_at = nå (UTC, serverens klokke) − duration_seconds`; et `started_at` fra nettleseren ignoreres. Lagres med dialektens `insert(...).on_conflict_do_nothing(index_elements=["session_id"])` (Postgres og SQLite). Svar `204` både første gang og ved gjentakelse.
- **Sending (`frontend/modules/practice/save.ts`, `use-session-saver.ts`):** `buildSessionPayload` (ren funksjon) bygger kroppen med `duration_seconds` fra `performance.now()` (ikke klokkeslett). `crypto.randomUUID()` med reserve via `crypto.getRandomValues`. Hooken holder `session_id`, starttid og et «sendt»-flagg i refs og sender bare når `answered ≥ 1` og ikke allerede sendt: ferdig → `aborted=false`; «Avslutt økt»/Esc, avmontering (navigering i appen) og før utlogging → `aborted=true` med `fetch` (`keepalive`); `pagehide` → `sendBeacon` med `text/plain` (faller tilbake til `fetch keepalive` hvis den gir `false`). Status `idle`/`saving`/`saved`/`failed` for panelet. `restart()` gir ny `session_id`, ny starttid og nullstilt flagg.
- **Utlogging (`frontend/lib/before-logout.ts`, `modules/identity/use-logout.ts`):** et lite register der økten melder inn «send før utlogging». `useLogout` venter på alle (høyst 3 s) før `POST /api/identity/logout`. Identity kjenner ikke `practice`.
- **Økten (`flashcard-session-page.tsx`):** «Avslutt økt»/Esc uten markerte kort → rett tilbake til forelesningen, ingenting sendes. Med markerte kort → sendes som avbrutt, og resultatsiden vises (EXPERIENCE.md «Avslutt økt»). Ferdig økt → sendes med `aborted=false` og resultatsiden vises; «Økten er ferdig» leses i det levende området som før.
- **Øktpanelet (`session-panel.tsx`):** ferdig og lagret → nederst «✓ Økten er ferdig og lagret» (ikon + tekst i `text-meta text-ink-muted`) i stedet for «Avslutt økt»; ferdig legend som før. Avbrutt → ingen «Avslutt økt», ingen «Repeterer», ingen gjeldende rute, legend «Kunne», «Kunne ikke», «Ikke vist ennå». Lagring feilet → reserveteksten «Noe gikk galt. Prøv igjen.» i `role="alert"` på resultatsiden.
- **Resultatsiden (`components/result-summary.tsx`, `components/missed-list.tsx`):** i innholdsområdet, 768 px kolonne som kortet. Overlinjen «ØKT FERDIG», tittel (`h2`, `text-page-title`, får fokus) «Du har gått gjennom alle N kortene» (ett kort: «Du har gått gjennom 1 kort») eller ved avbrudd «Avbrutt etter A av N» (A = markerte kort). Undertekst: forelesningsnavnet, og når økten er ferdig og har «Kunne ikke»-kort, « · kortene du ikke kunne, ble repetert til slutt i økten». Kort (hvitt, `border-card`, `rounded-lg`, `shadow-lift`) med to felt delt av en hårlinje: tonet ikonrute 32 px (✓ på success-tint / ✗ på danger-tint), «Kunne» med «P % av kortene» (P = avrundet `correct/answered`), og «Kunne ikke» med «Repetert til slutt i økten» (bare når ferdig); tallet i `text-result-title` til høyre. Ingen feiring. `missed-list` bare når `wrong ≥ 1`: `h3` «Kortene du ikke kunne» og «N kort» dempet, kort med én rad per kort i rutenettets rekkefølge: nummeret i rutenettet, spørsmålet (forsiden) og `SourceLink`. Knapper sentrert: omriss «Tilbake til forelesningen» (lenke) og hovedknapp «Øv igjen». Hint-linjen under (bare med bryteren på): «Enter øv igjen», «Esc tilbake til forelesningen».
- **Taster på resultatsiden:** Enter → «Øv igjen», Esc → tilbake, `?` → dialogen. Enter (som Mellomrom) gjør ingenting når fokus står på en kontroll, så knappen/lenken gjør sin egen handling. Enter og Esc er ikke enkelttaster og virker også med bryteren av. Hurtigtastdialogen får gruppen «Resultat»: Enter «Øv igjen», Esc «Tilbake».
- **Øv igjen:** ny blanding av kortene forelesningen har nå (spørringens data, ellers de låste kortene), ny `session_id`, ny starttid, fokus til «Snu kortet».
- Testnavn har krav-ID (`test_ar9_…`, `test_fr56_…`, `test_sk20_…`, `test_fr26_…`; Vitest/Playwright «AR-9: …», «FR-56: …», «SK-20: …», «FR-26: …», «UX-DR8: …», «UX-DR33: …», «UX-DR34: …», «UX-DR35: …»). Kode og kommentarer på engelsk, synlig tekst på bokmål.

**Never:**
- Ikke rør planleggingsdokumentene, `CLAUDE.md`, `.claude/settings.json`, `.git/hooks/` eller `frontend/e2e/brukerreiser/`.
- Ingen «øvd»-funksjon, oversikt eller statusprikk (story 5.1). Ingen emneøkt (3.6), redigering/sletting av kort (3.7), quiz eller fritekst. Ingen enkeltmarkeringer eller klokkeslett fra nettleseren til serveren. Ingen nye npm- eller Python-pakker.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ferdig økt | 3 kort, ett «Kunne ikke», alle «Kunne» til slutt | én POST, `aborted=false`, `shown=3 answered=3 correct=2 wrong=1`; resultatside «Du har gått gjennom alle 3 kortene», «Kunne 2»/«67 % av kortene», «Kunne ikke 1», `missed-list` med 1 kort; panelet «✓ Økten er ferdig og lagret» | POST feiler → reserveteksten, panelet uten «lagret» |
| Avslutt med markering | 1 av 3 markert, «Avslutt økt» eller Esc | én POST `aborted=true`; «Avbrutt etter 1 av 3» | — |
| Avslutt uten markering | 0 markert, «Avslutt økt»/Esc/navigering/`pagehide` | ingen POST, rett tilbake (Avslutt/Esc) | — |
| Navigering | ≥ 1 markert, klikk på logoen | én POST `aborted=true` (`keepalive`) | — |
| Lukke fanen | ≥ 1 markert, `pagehide` | `sendBeacon` med `text/plain`, `aborted=true` | `false` → `fetch keepalive` |
| Logg ut | ≥ 1 markert, «Logg ut» | POST av økten før `POST /api/identity/logout` | treg lagring → utlogging etter høyst 3 s |
| Dobbel sending | samme `session_id` to ganger | 204 begge, én rad | — |
| Andres emne/forelesning | `subject_id` eller `lecture_id` som ikke er hennes, eller forelesning i et annet emne | `404 NOT_FOUND` | — |
| Ugyldige tall | `answered=0`, eller summen stemmer ikke, eller `answered > shown`, negativ varighet | `422 VALIDATION_ERROR` | — |
| Klokke | nettleserens klokke 5 min etter, `started_at` sendt med | ignoreres; `started_at` = serverens nå − varighet, ikke før kortene ble laget | — |
| Øv igjen | Enter eller «Øv igjen» på resultatsiden | ny økt, ny `session_id`, ny blanding | — |

</intent-contract>

## Code Map

- `backend/app/modules/subjects/service.py` -- `get_subject(session, user_id, subject_id: str)` (404 for andres/ukjent/ugyldig), modellene `Subject`, `Lecture`.
- `backend/app/core/errors.py` -- `AppError`, `ErrorCode.NOT_FOUND`, `VALIDATION_ERROR`; `RequestValidationError` gir feltformatet.
- `backend/app/modules/content/router.py` -- mønster for router med `CurrentUser`/`Session`.
- `backend/app/main.py` -- `create_app()` inkluderer routerne; ny `practice_router`.
- `backend/alembic/versions/0006_create_jobs_and_flashcards.py` -- mønster; `down_revision` for 0007.
- `backend/alembic/env.py`, `backend/tests/conftest.py` -- modellimport som registrerer tabellen.
- `backend/tests/test_route_guard.py` -- sjekker at nye ruter har `current_user` (uendret).
- `backend/tests/test_migrations.py` -- mønster for migreringstest mot SQLite.
- `frontend/modules/practice/session.ts` -- `sessionCounts`, `gridCells`, `startSession`, `shuffle`, `isFinished`.
- `frontend/modules/practice/pages/flashcard-session-page.tsx` -- `end`, `finished`, `finishedRef`, `bindings`, levende område.
- `frontend/modules/practice/components/session-panel.tsx` -- `finished`, «Avslutt økt», legend, `gridCells`.
- `frontend/modules/practice/adapter.ts` -- legend per tilstand (får `aborted`).
- `frontend/modules/practice/components/shortcut-hints.tsx` -- `ShortcutHints`, `FLASHCARD_HINTS`.
- `frontend/components/source-link.tsx`, `components/ui/button.tsx`, `components/icon.ts`.
- `frontend/lib/practice-shortcuts.ts` -- `resolveShortcut`: Mellomrom-regelen for kontroller utvides til Enter.
- `frontend/components/shortcuts-dialog.tsx` -- `GROUPS`.
- `frontend/lib/api.ts` -- `apiFetch` (setter JSON-header for strenger; `keepalive` i `init`).
- `frontend/modules/identity/use-logout.ts` -- venter på `runBeforeLogout()`.
- `frontend/e2e/flashcard-okt.spec.ts`, `e2e/hurtigtaster-og-smal-skjerm.spec.ts` -- tester som forventer «Økten er ferdig»-overskriften og at «Avslutt økt» etter markering går rett tilbake; oppdateres.
- Skisse `mockups/08-flashcard-ferdig.svg`: kolonne 768 px, sammendragskort 112 px høyt, liste med rader på 56 px, knapper ~225 px, hint-linje under.

## Tasks & Acceptance

**Execution:**
- `backend/app/modules/practice/{__init__,models,schemas,service,router}.py` -- modell, inn-skjema med regler, `save_session`, rute.
- `backend/alembic/versions/0007_create_practice_sessions.py` -- tabellen med unik `session_id` og kaskader.
- `backend/app/main.py`, `alembic/env.py`, `tests/conftest.py` -- registrering.
- `backend/tests/test_practice_sessions.py` -- JSON, `text/plain`, dobbel sending, 404 for andres emne/forelesning/forelesning i annet emne, 401 uten innlogging, 422-reglene, `started_at` fra serveren (klokketesten), kaskade ved sletting av forelesning og emne; `tests/test_migrations.py` -- tabellen og den unike indeksen.
- `frontend/modules/practice/save.ts` + test -- payload, UUID-reserve, `postPracticeSession`, `beaconPracticeSession`.
- `frontend/modules/practice/use-session-saver.ts` + test -- én gang, avmontering, `pagehide`, utlogging, `restart`.
- `frontend/lib/before-logout.ts` + test; `modules/identity/use-logout.ts` (+ test) -- vent før utlogging.
- `frontend/lib/practice-shortcuts.ts` (+ test) -- Enter på kontroll gjør ingenting.
- `frontend/components/shortcuts-dialog.tsx` (+ test) -- gruppen «Resultat».
- `frontend/modules/practice/adapter.ts`, `components/session-panel.tsx` (+ test) -- avbrutt og lagret.
- `frontend/modules/practice/components/{result-summary,missed-list}.tsx` + tester; `shortcut-hints.tsx` -- `RESULT_HINTS`.
- `frontend/modules/practice/pages/flashcard-session-page.tsx` (+ test) -- lagring, resultatside, Avslutt-regelen, Øv igjen, taster.
- `frontend/e2e/flashcard-okt.spec.ts`, `e2e/hurtigtaster-og-smal-skjerm.spec.ts` -- oppdatert til ny oppførsel; ny `e2e/lagre-okt.spec.ts`: ferdig økt med resultatside og POST fanget, axe; avbrudd med «Avbrutt etter»; Avslutt uten markering; navigering sender; Øv igjen med Enter; logg ut venter; 768 px uten vannrett rulling.

**Acceptance Criteria:**
- Given en ferdig økt, when resultatsiden vises, then viser den «ØKT FERDIG», tittelen, de to feltene og `missed-list`, panelet viser «✓ Økten er ferdig og lagret», og axe finner ingen brudd på 1280 og 768 px.
- Given minst ett markert kort, when studenten avslutter på hvilken som helst måte, then lagres nøyaktig én rad, og bare den ferdige har `aborted=false`.
- Given resultatsiden, when studenten trykker Enter, then starter en ny økt med ny `session_id`; Esc går til forelesningen.

## Spec Change Log

## Review Triage Log

## Design Notes

- **Hvorfor `id` og en egen unik `session_id`:** alle tabellene har `id` som nøkkel; `session_id` er nettleserens nøkkel for å unngå dobbel lagring.
- **Hvorfor rå kropp:** `sendBeacon` kan ikke sette `Content-Type: application/json` uten en CORS-forhåndssjekk, så den sender `text/plain`. Å lese kroppen selv gjør at begge typer følger samme valideringsregler. Innloggingscookien er `SameSite=Lax`, så en annen nettside kan ikke sende en slik POST som studenten.
- **Hvorfor `performance.now()`:** den teller tid siden siden ble åpnet og påvirkes ikke av at nettleserens klokke går feil; serveren regner om til tidspunkt med sin egen klokke (AR-9).
- **Hvorfor et register før utlogging i `lib/`:** «Logg ut» står i toppfeltet (identity), økten i `practice`. Et nøytralt register lar identity vente uten å kjenne økten.
- **Valg tatt selv (kanttilfeller):** avbrutt økt via «Avslutt»/Esc viser resultatsiden (EXPERIENCE.md), navigering og utlogging gjør det ikke; A i «Avbrutt etter A av N» er markerte kort; avbrutt panel og tekster uten «repetert»; entallsform for ett kort; Enter virker med bryteren av (som Esc); «Øv igjen» bruker kortene forelesningen har nå; lagringsfeil vises med reserveteksten uten nytt forsøk; `duration_seconds` høyst 31 dager; utlogging venter høyst 3 s; en side gjenopprettet fra bfcache etter `pagehide` lagres ikke på nytt.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- grønne
- `cd frontend && npm run test && npx tsc --noEmit` -- grønne
- `docker compose up --build -d && cd frontend && npx playwright test` -- grønne
