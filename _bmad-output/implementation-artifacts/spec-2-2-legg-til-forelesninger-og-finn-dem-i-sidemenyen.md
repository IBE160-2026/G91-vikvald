---
title: 'Story 2.2: Legg til forelesninger og finn dem i sidemenyen'
type: 'feature'
created: '2026-11-21'
baseline_revision: '1a9cc45d72d8f9a700ab5d53048ff1d1d95af8e4'
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

**Problem:** Et emne kan ikke ha forelesninger. «Ny forelesning» er grå, emnesiden har ingen tabell, sidemenyen viser bare emnene, og forelesningssiden (04) finnes ikke (story 2.2 i `epics.md`: FR-7, FR-15, FR-4, UX-DR7, UX-DR13, UX-DR21, UX-DR25).

**Approach:** Tabellen `lectures` i modulen `subjects` med migrering `0003`, rutene `POST/GET /api/subjects/{id}/lectures` og `GET/PATCH /api/lectures/{id}`, og ekte `lecture_count`. I frontend: dialogene for forelesning (felles navn/dato-dialog med emnene), forelesningstabellen på 03, forelesningssiden `/forelesninger/[id]` og en sidemeny der emner åpnes og lukkes og viser forelesningene.

## Boundaries & Constraints

**Always:**
- Tabell `lectures`: `id` (UUID), `subject_id` (FK `subjects.id`, `ON DELETE CASCADE`, indeks), `name` (`String(200)`), `date` (`Date`), `created_at` (UTC). Migrering `0003_create_lectures`. Modell i `app/modules/subjects/models.py`.
- Svar i `snake_case`: `{id, subject_id, name, date, created_at}`. `POST` → `201`. `date` er påkrevd ISO-dato (samme validering som `exam_date`); frontend fyller inn dagens dato.
- `GET /api/subjects/{id}/lectures` sorterer på `date`, så `created_at`, så `id`. Frontend sorterer aldri på nytt.
- `lecture_count` i alle emnesvar er det faktiske antallet (én spørring med `GROUP BY`, ikke én per emne).
- Eierskap: emneruter går via `get_subject` (`get_owned`). `/api/lectures/{id}` slår opp forelesningen sammen med emnet og krever `subjects.user_id == bruker`; andres, ukjent og ugyldig id gir samme `404 NOT_FOUND`. Alle rutene har `current_user`.
- Navn: samme `clean_name` som emner (`NAME_REQUIRED`, trimming, maks 200). Like navn er lov.
- Dialogene bygger på den felles `Dialog`. «Ny forelesning»: felt «Navn» og «Dato» (tekst `dd.mm.åååå`, ferdig utfylt med dagens dato), hovedknapp «Opprett forelesning», lykkes → `/forelesninger/{id}`. «Nytt navn» og «Endre dato» (felt «Dato») med dagens verdi og «Lagre». Datofeil: «Skriv inn datoen, for eksempel 11.09.2026.» (ny frontendkode `INVALID_DATE`). Fokus, Esc, Enter og feilvisning som emnedialogen.
- Emnesiden (03): «Ny forelesning» virker. Under knappene: h2 «Forelesninger» med «etter dato» i dempet grå, så `lecture-table` i hvitt kort: kolonnene Dato (`dd.mm`) og Forelesning, pil (›) i `icon-faint` ytterst, radhøyde `table-row`, hover `row-hover`. Hele raden er klikkbar; lenken sitter på navnet og dekker raden. Uten forelesninger: «Ingen forelesninger ennå.» i stedet for tabellen.
- Forelesningssiden (04): h1 navnet, linja «Forelesning fredag 11.09.2026», knappene «Nytt navn» og «Endre dato», tittel «<navn> – Studiekamerat», og sidemenyen med emnet åpent og forelesningen valgt. `NOT_FOUND` → «Fant ikke siden».
- Sidemeny: hvert emne har en knapp med pil (shadcn `Collapsible`, `aria-expanded`, tilgjengelig navn «<emnenavn>») som åpner og lukker, og ved siden av lenken til 03 som før. Emnet til siden som vises, er åpent fra start. Åpent emne viser forelesningene som `menu-row`: ISO-ukenummer i dempet grå, navn (avkortet med «…»), hul statusprikk (`aria-hidden`) til høyre; lenkens tilgjengelige navn er hele forelesningsnavnet, og ukenummeret gis som beskrivelse («Uke 37»). Valgt forelesning har `aria-current="page"` og valgt-stil; på 04 er emnelenken ikke valgt. Åpent emne uten forelesninger viser ingen rader.
- Etter oppretting eller endring oppdateres tabellen, sidemenyen, antallet og forsiden uten omlasting (invalider spørringene).
- Testnavn har krav-ID (`test_fr7_…`, `test_fr15_…`, `test_uxdr7_…`, «FR-7: …»). Kode og kommentarer på engelsk, synlig tekst på bokmål.

**Never:**
- Ikke rør planleggingsdokumentene, `CLAUDE.md`, `.claude/settings.json`, `.git/hooks/` eller `frontend/e2e/brukerreiser/`.
- Ingen kolonner for filer, status, kort eller quiz; ingen sletting; ingen semesterlinje, brødsmuler eller «? Hurtigtaster»; ingen fylt statusprikk; ingen tellinger i linja under h1.
- Ingen håndlagd erstatning for shadcn-komponenter (Collapsible, Table hentes med shadcn).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Opprett | `POST …/lectures {"name":" Uke 37: Merkevare ","date":"2026-09-11"}` | `201`, navn trimmet; `lecture_count` 1 | — |
| Sortering | datoer 18.09, 11.09, 11.09 (opprettet i den rekkefølgen) | 11.09 (først opprettet), 11.09, 18.09 | — |
| Tomt navn | `name: "  "` (POST/PATCH) | `422 NAME_REQUIRED`, ingenting lagret | «Skriv inn et navn.» |
| Ugyldig dato | `date: "31.02.2026"`, `""`, mangler | `422 VALIDATION_ERROR` med `fields.date` | «Skriv inn datoen, for eksempel 11.09.2026.» |
| Andres emne | `POST/GET /api/subjects/{olas}/lectures` | `404 NOT_FOUND`, ingenting lagret | «Fant ikke siden» |
| Andres forelesning | `GET/PATCH /api/lectures/{olas}`, ukjent, `ikke-en-id` | lik `404 NOT_FOUND` | «Fant ikke siden» |
| Endre dato | `PATCH {"date":"2026-08-21"}` | ny dato, flytter seg først i lista | — |
| Slett emne | rad i `subjects` slettes | forelesningene slettes (cascade) | — |
| Uten innlogging | alle nye ruter | `401 UNAUTHENTICATED` | — |

</intent-contract>

## Code Map

- `backend/app/modules/subjects/models.py` -- `Subject`, `NAME_MAX_LENGTH`, `_utc_now`; legg til `Lecture`.
- `backend/app/modules/subjects/service.py` -- `clean_name`, `get_subject` (bruker `get_owned`); legg til `lecture_counts`, forelesningsfunksjonene.
- `backend/app/modules/subjects/schemas.py` -- `IsoDate` (feilteksten nevner `exam_date`; gjør den generell); legg til `LectureCreate/Update/Out`.
- `backend/app/modules/subjects/router.py` -- `_out` har `lecture_count=0`; `_as_utc`. Legg til forelesningsrutene og en egen `lectures_router` med prefiks `/api/lectures`.
- `backend/app/main.py` -- inkluder `lectures_router`.
- `backend/app/core/ownership.py` -- `get_owned` krever `user_id` på modellen; forelesninger har det ikke, derfor egen oppslagsfunksjon med join.
- `backend/alembic/versions/0002_create_subjects.py` -- mønster for `0003`.
- `backend/tests/test_subjects.py` -- hjelpere `_log_in_new_user`, `_create`; mønster for nye `test_lectures.py`.
- `backend/tests/test_migrations.py` -- legg til test for `lectures` (kolonner, cascade, indeks) og downgrade til `0002`.
- `backend/tests/test_route_guard.py` -- dekker nye ruter automatisk.
- `frontend/modules/subjects/components/subject-form-dialog.tsx` -- trekk ut skjema-logikken til en felles `name-date-dialog.tsx` som både emne- og forelesningsdialogen bruker.
- `frontend/modules/subjects/validation.ts` -- `parseNorwegianDate`, `fieldForApiError` (må også kjenne `date`).
- `frontend/modules/subjects/format.ts` -- legg til `formatDayMonth` (`dd.mm`), `isoWeek`, `todayNorwegian`.
- `frontend/modules/subjects/components/subject-sidebar.tsx` -- bygges om med `Collapsible` og forelesningsrader.
- `frontend/modules/subjects/pages/subject-page.tsx` -- aktiver «Ny forelesning», legg til tabellen.
- `frontend/lib/messages.ts` -- `INVALID_DATE`.
- `frontend/lib/use-document-title.ts` -- fanetittel.
- `frontend/app/(app)/emner/[subjectId]/page.tsx` -- mønster for `app/(app)/forelesninger/[lectureId]/page.tsx`.
- `frontend/components/ui/` -- legg til shadcn `collapsible.tsx` og `table.tsx`.
- `frontend/e2e/emner.spec.ts` -- forventer at «Ny forelesning» er `disabled`; må oppdateres. Mønster for `forelesninger.spec.ts`.

## Tasks & Acceptance

**Execution:**
- `backend/app/modules/subjects/{models,schemas,service,router}.py`, `backend/app/main.py` -- `Lecture`, skjemaer, `create_lecture`, `list_lectures`, `get_lecture`, `update_lecture`, `lecture_counts`, ruter -- FR-7, FR-15, FR-4
- `backend/alembic/versions/0003_create_lectures.py` -- migrering -- AR-7
- `backend/tests/test_lectures.py` (ny), `test_migrations.py` -- matrisen, `lecture_count`, cascade fra emne og bruker -- AR-17
- `frontend/components/ui/{collapsible,table}.tsx` -- shadcn -- #46
- `frontend/lib/messages.ts`, `frontend/modules/subjects/{types,api,format,validation}.ts` + tester -- typer, API, `isoWeek`, `formatDayMonth`, datokode -- UX-DR25
- `frontend/modules/subjects/components/{name-date-dialog,subject-form-dialog,lecture-form-dialog,lecture-table,subject-sidebar}.tsx` -- dialoger, tabell, sidemeny -- UX-DR7, UX-DR13, UX-DR21
- `frontend/modules/subjects/pages/{subject-page,lecture-page}.tsx` + tester, `frontend/app/(app)/forelesninger/[lectureId]/page.tsx` -- sidene -- FR-7
- `frontend/e2e/emner.spec.ts`, `frontend/e2e/forelesninger.spec.ts` (ny) -- dialog med dagens dato, feil, tabell og sidemeny i samme rekkefølge, åpne/lukke emne med tastatur, 04, endre dato flytter raden, 404, axe -- NFR-8, NFR-12

**Acceptance Criteria:**
- Given emnesiden, when «Ny forelesning» åpnes, then står dagens dato som `dd.mm.åååå` i «Dato», og gyldig navn gir forelesningssiden med h1 navnet og «Forelesning <ukedag> <dato>».
- Given et emne med forelesninger, when 03 vises, then har tabellen og sidemenyen samme rekkefølge som API-et, hver rad lenker til 04, og sidemenyen viser ukenummer og hul prikk.
- Given sidemenyen, when hun bruker bare tastatur, then kan hun åpne og lukke et emne med pilknappen (Enter/Mellomrom), `aria-expanded` følger tilstanden, og fokusringen er synlig.
- Given forelesningssiden, when hun endrer dato, then flytter raden seg i sidemenyen uten omlasting.
- Given et emne uten forelesninger, when 03 vises, then står «Ingen forelesninger ennå.», sidemenyen viser 0 og ingen rader, og forsiden «0 forelesninger».
- Given 03 og 04, when axe kjøres, then finnes ingen brudd.

## Spec Change Log

## Review Triage Log

## Design Notes

- **Nettadressen** `/forelesninger/{id}` er flat, som API-et (`/api/lectures/{id}`). Planene sier ikke noe om adressen, så dette føres som kanttilfelle.
- **Pilknapp + lenke** i sidemenyen: emnenavnet går fortsatt til 03 (EXPERIENCE.md), så åpne/lukke må være en egen knapp. Skissen har pilen foran prikken.
- **Lenken dekker hele raden** i tabellen med `after:absolute after:inset-0` på lenken og `relative` på raden. Tabellen beholder tabellsemantikk, og det finnes én lenke per rad.
- **Felles dialog:** emne- og forelesningsdialogene har samme felt (navn, dato) og samme feilflyt; bare tekster, datomelding og kall skiller dem.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alle grønne
- `cd frontend && npm run test && npx tsc --noEmit && npm run lint` -- expected: alle grønne
- `docker compose up --build -d && cd frontend && npx playwright test` -- expected: alle grønne
