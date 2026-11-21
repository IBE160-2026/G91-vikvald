---
title: 'Story 2.1: Opprett emner og se dem på forsiden'
type: 'feature'
created: '2026-11-21'
baseline_revision: '52538baa6def530c9ec699180e0039236b5e02cb'
status: 'in-progress'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Forsiden viser bare overskriften «Dine emner». Studenten kan ikke opprette emner, se dem, åpne et emne eller endre navn og eksamensdato, og det finnes ingen tabell `subjects` (story 2.1 i `epics.md`: FR-6, FR-4, UX-DR3, UX-DR7, UX-DR15, UX-DR21, UX-DR25).

**Approach:** Ny backend-modul `subjects` med tabell, migrering og rutene `POST/GET /api/subjects`, `GET/PATCH /api/subjects/{id}`. Frontend-modul `subjects` med forsiden (liste eller tom-tilstand), emnesiden `/emner/[id]` med sidemeny, og dialogene «Nytt emne», «Nytt navn» og «Endre eksamensdato» bygd på den felles dialogen. Tre nye emnefarger som tokens.

## Boundaries & Constraints

**Always:**
- Tabell `subjects`: `id` (UUID), `user_id` (FK `users.id`, `ON DELETE CASCADE`, indeks), `name` (`String(200)`), `exam_date` (`Date`), `color_index` (`Integer`), `created_at` (UTC). Migrering `0002_create_subjects`.
- Svar i `snake_case`: `{id, name, exam_date, color_index, lecture_count, created_at}`. `lecture_count` er 0 til story 2.2.
- `POST` → `201`. `GET` lista → bare egne emner sortert på `created_at`, så `id`. `GET/PATCH` på andres eller ukjent id → `404 NOT_FOUND` via `get_owned`. Alle rutene bruker `current_user`.
- Navn trimmes. Tomt eller bare mellomrom → `422 NAME_REQUIRED` (ny kode i `errors.py` og `messages.ts`: «Skriv inn et navn.»). Over 200 tegn → `VALIDATION_ERROR`. Like navn er lov.
- `exam_date` er ISO-dato; ugyldig → `VALIDATION_ERROR`. Passert dato godtas.
- `color_index`: første av 0–5 som ingen av hennes emner bruker; brukes alle, `antall % 6`. Settes bare ved oppretting; `PATCH` endrer bare `name` og/eller `exam_date`.
- Emnefarger `subject-4` #A8326E, `subject-5` #8A6A00, `subject-6` #00766E i `globals.css`; Vitest regner kontrast for alle seks mot `paper` og krever ≥ 3:1. Prikken er `aria-hidden` og navnet står alltid ved den.
- Forsiden (02): h1 «Dine emner», undertittel «Høstsemesteret 2026 · lørdag 21. november» (jan–jun = vårsemesteret, jul–des = høstsemesteret, dagens dato), omrissknappen «Nytt emne» med plussikon til høyre. Liste i hvitt kort: emneprikk, navn som lenke til `/emner/{id}`, «0 forelesninger» (1 = «1 forelesning»), «Eksamen 04.12.2026». Ingen sidemeny.
- Uten emner: ingen h2/liste, bare setningen «Studiekamerat lager flashcards og quiz fra forelesningsnotatene dine, så du kan øve fram mot eksamen.» og hovedknappen «Lag ditt første emne», som åpner samme dialog.
- Dialog «Nytt emne»: felt «Navn» og «Eksamensdato» (tekstfelt, `dd.mm.åååå`), hovedknapp «Opprett emne». Fokus i første felt, Esc lukker uten endring, fokus tilbake til åpneren. Enter i et felt sender. Feil vises under feltet med rød kant og `aria-describedby`, og fokus flyttes til første felt med feil. Datofeil: «Skriv inn eksamensdatoen, for eksempel 04.12.2026.» Lykkes → `/emner/{id}`.
- Emnesiden (03): h1 navn, linje «Eksamen fredag 04.12.2026», knappene «Nytt navn», «Endre eksamensdato» (dialoger med dagens verdi, `PATCH`, hovedknapp «Lagre») og «Ny forelesning» (`disabled` til 2.2). `NOT_FOUND` → «Fant ikke siden». Tittel «<navn> – Studiekamerat».
- Sidemeny (`sidebar-tree`, 288 px, kant `divider`): `nav` med navn «Emner», overlinjen EMNER, én lenke per emne (prikk, navn avkortet med «…», antall høyrejustert), `aria-current="page"` og valgt-stil (`brand-tint`, 2 px `brand`-strek) på åpent emne. Lenkens tilgjengelige navn er hele emnenavnet.
- Alle testnavn har krav-ID. Kode og kommentarer på engelsk, synlig tekst på bokmål.

**Never:**
- Ikke rør planleggingsdokumentene (heller ikke DESIGN.md), `CLAUDE.md`, `.claude/settings.json`, `.git/hooks/` eller `frontend/e2e/brukerreiser/`.
- Ingen sletting av emner, ingen forelesninger, ingen semesterlinje eller emnekort, ingen «? Hurtigtaster», ingen menyknapp for smal skjerm.
- Ingen håndlagd erstatning for shadcn-komponenter som finnes (knapp, felt, dialog).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Opprett | `{"name":" Markedsføring ","exam_date":"2026-12-04"}` | `201`, `name` trimmet, `color_index` 0, `lecture_count` 0 | — |
| Tomt navn | `name: "   "` (POST/PATCH) | `422 NAME_REQUIRED`, ingenting lagret | «Skriv inn et navn.» under feltet |
| Ugyldig dato | `exam_date: "31.02.2026"` / `"2026-02-31"` | frontend stopper; backend `422 VALIDATION_ERROR` | datomeldingen under feltet |
| Farger | sju emner opprettet etter hverandre | `color_index` 0,1,2,3,4,5,0 | — |
| Hull i fargene | eksisterende 0 og 2 | nytt får 1 | — |
| Andres emne | `GET/PATCH /api/subjects/{olas id}` | `404 NOT_FOUND`, likt ukjent id | — |
| PATCH med `color_index` | `{"color_index": 4}` | ignoreres, fargen uendret | — |
| Uten innlogging | alle rutene | `401 UNAUTHENTICATED` | — |

</intent-contract>

## Code Map

- `backend/app/core/errors.py` -- `ErrorCode`, `ERROR_STATUS`; legg til `NAME_REQUIRED` (422). `tests/test_errors.py` sjekker at hver kode finnes i `messages.ts`.
- `backend/app/core/ownership.py` -- `get_owned(session, model, row_id, user_id)` gir lik 404.
- `backend/app/modules/identity/dependencies.py` -- `current_user`; `models.py` -- mønster for modell (`Uuid`, `_utc_now`).
- `backend/app/main.py` -- `create_app()`; inkluder `subjects`-routeren.
- `backend/alembic/env.py` -- importer `app.modules.subjects.models`; `versions/0001_create_users.py` -- mønster.
- `backend/tests/conftest.py` -- `client`, `engine`; importer subjects-modellene så `create_all` lager tabellen.
- `backend/tests/test_migrations.py` -- `test_ar13_migreringene_samsvarer_med_modellene` importerer modellene; legg til subjects-import.
- `backend/tests/test_route_guard.py` -- nye ruter må ha `current_user` (skjer automatisk).
- `frontend/app/(app)/page.tsx` -- tynn rute; flytt innhold til `modules/subjects/pages/home-page.tsx`.
- `frontend/app/(app)/emner/[subjectId]/page.tsx` (ny) -- tynn rute til `subject-page.tsx`.
- `frontend/components/dialog.tsx` -- `Dialog({open,title,onClose,primaryAction,width})`; fokus i første felt.
- `frontend/components/text-field.tsx` -- `TextField` med `label`, `error`, `ref`.
- `frontend/components/ui/button.tsx` -- `primary`/`outline`; `frontend/components/icon.ts` -- `iconProps`.
- `frontend/lib/api.ts` -- `apiFetch`, `ApiError`, `notFoundOnMissing`; `lib/messages.ts` -- `messageFor`.
- `frontend/app/globals.css` -- fargetokens; `lib/design-tokens.test.ts` sjekker DESIGN.md-fargene (de nye finnes ikke der og testes for seg).
- `frontend/modules/identity/` -- mønster for `api.ts`, `types.ts`, `pages/`, `validation.ts` og tester.
- `frontend/e2e/innlogget.spec.ts` -- mønster for registrering via API, axe og fokusring.

## Tasks & Acceptance

**Execution:**
- `backend/app/core/errors.py`, `frontend/lib/messages.ts` -- `NAME_REQUIRED` -- E35
- `backend/app/modules/subjects/{__init__,models,schemas,service,router}.py` (ny) -- modell, `create_subject` med fargevalg, `list_subjects`, `get_subject`, `update_subject` -- FR-6, FR-4, UX-DR3
- `backend/alembic/versions/0002_create_subjects.py`, `backend/alembic/env.py`, `backend/app/main.py` -- migrering og kobling -- AR-7
- `backend/tests/test_subjects.py` (ny), `conftest.py`, `test_migrations.py` -- matrisen, fargerekkefølge, cascade ved sletting av bruker, migrering -- AR-17
- `frontend/app/globals.css`, `frontend/lib/subject-colors.ts` + test -- tokens, klasse per `color_index`, kontrasttest `UX-DR3` -- UX-DR3
- `frontend/modules/subjects/{types,api,format,validation}.ts` + tester -- typer, API-kall, `formatDate`, `formatWeekdayDate`, `semesterLabel`, `lectureCountLabel`, parsing av `dd.mm.åååå` -- FR-6, UX-DR25
- `frontend/modules/subjects/components/{subject-dot,subject-form-dialog,subject-sidebar}.tsx` -- prikk, dialog for nytt/navn/dato, sidemeny -- UX-DR7, UX-DR21
- `frontend/modules/subjects/pages/{home-page,subject-page}.tsx` + tester, `frontend/app/(app)/page.tsx`, `frontend/app/(app)/emner/[subjectId]/page.tsx` -- sidene -- UX-DR15
- `frontend/e2e/emner.spec.ts` (ny) -- tom forside, opprett via dialog (tastatur, Esc, fokus tilbake, `inert`), feil, liste, emneside, nytt navn/dato, sidemeny, 404, axe -- NFR-12, NFR-13
- `frontend/e2e/innlogget.spec.ts` -- oppdater hvis forsiden endrer forventningene

**Acceptance Criteria:**
- Given en ny bruker på `/`, when siden vises, then står setningen og «Lag ditt første emne», ingen liste, og axe finner ingen brudd.
- Given dialogen «Nytt emne» åpnet med tastatur, when hun trykker Esc, then lukkes den uten nytt emne, resten av siden var `inert` mens den var åpen, og fokus står på knappen som åpnet den.
- Given gyldig navn og dato i dialogen, when hun bekrefter, then er hun på `/emner/{id}` med h1 navnet, «Eksamen fredag 04.12.2026» og sidemenyen der emnet har `aria-current="page"`.
- Given en student med emner på `/`, when siden vises, then er det ett listeelement per emne i opprettingsrekkefølge med prikk, lenke, «0 forelesninger» og «Eksamen dd.mm.åååå», og ingen sidemeny.
- Given emnesiden, when hun endrer navn eller eksamensdato i dialogen, then vises den nye verdien i h1/linja og i sidemenyen uten omlasting.

## Spec Change Log

## Review Triage Log

## Design Notes

- **Datofelt som tekst:** Meldingen «for eksempel 04.12.2026» peker på et felt der man skriver `dd.mm.åååå`. Et tekstfelt gir samme oppførsel i alle nettlesere og er lett å teste. Godta `d.m.åååå` også; kalenderdato må finnes (31.02 avvises).
- **Fargene:** magenta (hue 329), oker (46) og blågrønn (176), med kontrast 5,9 / 4,7 / 5,1 mot `paper`. Ingen ligger nær merkefargen (237), rødt (4) eller grønt (139). DESIGN.md kan ikke endres i kjøringen, så verdiene føres i `beslutninger.md` og et `kanttilfelle`-issue til Silje.
- **Sidemenyen** er vanlig `nav`/`ul`-markup, ikke shadcn `Sidebar`: den har ingen interaksjon ennå (bare lenker), mens shadcn-varianten tar med mobilskuff, Ctrl+B og egen tilstand som ikke står i designet.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alle grønne
- `cd frontend && npm run test` -- expected: alle grønne
- `docker compose up --build -d && cd frontend && npx playwright test` -- expected: alle grønne
