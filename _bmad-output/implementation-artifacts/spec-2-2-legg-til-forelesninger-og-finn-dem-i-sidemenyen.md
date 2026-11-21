---
title: 'Story 2.2: Legg til forelesninger og finn dem i sidemenyen'
type: 'feature'
created: '2026-11-21'
baseline_revision: '1a9cc45d72d8f9a700ab5d53048ff1d1d95af8e4'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Lenken til forelesningssiden, klikk på hele tabellraden og åpne/lukke med tastatur sjekkes bare av e2e, som CI ikke kjører.
    evidence: |-
      ci.yml kjører bare pytest og Vitest (AR-20). Vitest gjengir LecturePage direkte og sjekker bare klassenavnene for raden. Samme utsatte punkt som i story 2.1; gjelder hele repoet.
    location: >-
      .github/workflows/ci.yml
    severity: medium
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

### 2026-11-21 — Review pass
- verdicts: 30 findings — high 0, medium 1, low 23, false 5, maybe-false 1
- findings:
  - `[false]` `[reject]` (blind) KI-sporet, skjermbildene og spesifikasjonen mangler i diffen — de skrives og committes i samme økt etter gjennomgangen (punkt 5–6 i story-prompten), før PR-en; den midlertidige skjermbildetesten er slettet.
  - `[low]` `[reject]` (blind) `get_lecture` sjekker eierskap selv i stedet for `get_owned` — `get_owned` krever `user_id` på raden; en variant for «forelder eier raden» er ny mekanisme for én bruker. Valget står i Design Notes og `beslutninger.md`, og 404-oppførselen er testet.
  - `[low]` `[reject]` (blind) Emner hun åpnet selv, lukkes ved sidebytte — bare emnet til siden skal være åpent (storien); å løfte tilstanden til layouten er ny struktur.
  - `[low]` `[reject]` (blind) Pilknappen og emnelenken har samme tilgjengelige navn — knappen meldes som «knapp, lukket/utvidet» (`aria-expanded`), og en ny etikett ville vært tekst som ikke er godkjent i EXPERIENCE.md.
  - `[low]` `[patch]` (blind) Sidemenyen viser ingenting når forelesningene ikke kan hentes — reserveteksten vises nå under emnet (`role="alert"`), med test.
  - `[maybe-false]` `[reject]` (blind) `position: relative` på `<tr>` virker ikke i eldre Safari — gjeldende Safari støtter det; ville krevd test i WebKit, og er i så fall bare `low` (raden klikkbar via navnet uansett).
  - `[low]` `[patch]` (blind) `examDateErrorCode` og `lectureDateErrorCode` brukes ikke lenger — fjernet sammen med testene sine.
  - `[false]` `[reject]` (blind) Skjemaene viser ikke at lagring pågår — det gjorde ikke den gamle dialogen heller (`isPending` ble ikke brukt), så omskrivingen har ikke fjernet noe.
  - `[low]` `[patch]` (blind) Ingen test for PATCH med 201 tegn — `test_fr7_patch_med_201_tegn_gir_validation_error_og_endrer_ingenting` lagt til.
  - `[low]` `[reject]` (blind) Ingen test for PATCH med tom body — ufarlig no-op, samme vurdering som i 2.1.
  - `[low]` `[patch]` (blind) Ingen test for feil fra backenden i den felles dialogen — test i `lecture-page.test.tsx` der PATCH gir `VALIDATION_ERROR` på `date`: forelesningsteksten under «Dato» og fokus i feltet.
  - `[low]` `[patch]` (blind) Ingen e2e for «Nytt navn» på forelesningssiden — lagt til i `forelesninger.spec.ts` med bare tastatur, fokusring, axe, h1, fanetittel og sidemeny.
  - `[low]` `[reject]` (blind) Ny forelesning henter mer data på nytt enn nødvendig — lokale kall, ubetydelig kostnad.
  - `[low]` `[reject]` (blind) Sammensatt indeks på `(subject_id, date, created_at)` — noen titalls rader per emne.
  - `[low]` `[reject]` (blind) Ekstra telling ved oppretting av emne — én rask spørring.
  - `[low]` `[reject]` (blind) Datokolonnen viser `dd.mm` uten år — storien og DESIGN.md krever `dd.mm`; rekkefølgen kommer fra API-et.
  - `[low]` `[reject]` (blind) Forelesningssiden har ingen brødsmuler tilbake til emnet — storien ber ikke om det; emnet nås fra sidemenyen. Ført som avvik fra skisse 04 i PR-en.
  - `[low]` `[patch]` (edge) Sidemenyen viser tomt emne ved feil — samme rot og retting som blind-raden over.
  - `[low]` `[reject]` (edge) År 0001–0099 vises feil — urealistiske datoer, samme vurdering som i 2.1.
  - `[false]` `[reject]` (edge) Datofeil fra backenden i «Nytt navn» der datofeltet er skjult — «Nytt navn» sender bare `name`, så backenden kan ikke svare med feil på `date`.
  - `[low]` `[patch]` (verification-gap) Avrundingen i `isoWeek` ved sommertid testes bare i en tidssone med sommertid — `vitest.config.ts` setter nå `TZ=Europe/Oslo`.
  - `[low]` `[patch]` (verification-gap) Datofeil fra backenden i dialogen er ikke testet — samme retting som blind-raden over.
  - `[medium]` `[defer]` (verification-gap) Ruten, klikk på hele raden og tastatur i sidemenyen sjekkes bare av e2e utenfor CI — gjelder hele repoet (AR-20), ført i `deferred`.
  - `[low]` `[patch]` (intent) Ingen test kan skille «sorterer ikke på nytt» fra en ny sortering — Vitest-test der API-et gir senere dato først, og tabellen og sidemenyen beholder rekkefølgen.
  - `[false]` `[reject]` (intent) «Hele raden er en lenke» er løst med én lenke som dekker raden — e2e klikker på datocellen og kommer til 04; én lenke per rad er riktig semantikk.
  - `[low]` `[reject]` (intent) Ingen test klikker en forelesning i sidemenyen — `href` og `aria-current` er testet, og lenken er en vanlig `Link`.
  - `[low]` `[patch]` (intent) «Nytt navn» på 04 er ikke testet med bare tastatur — samme retting som e2e-raden over.
  - `[low]` `[patch]` (intent) Ingen ende-til-ende-test for nytt navn mot ekte backend — samme retting.
  - `[false]` `[reject]` (intent) Frontendtestene bruker «FR-7:» og ikke `test_fr7_` — frontendens navnestil med krav-ID, avgjort i 2.1 (AR-17 er oppfylt).
  - `[low]` `[reject]` (intent) Tom dato er bare testet i Vitest, ikke e2e — samme kode som ugyldig dato, som e2e dekker.

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

## Auto Run Result

**Sammendrag:** Forelesninger kan opprettes, vises og endres. Backend har tabellen `lectures` (migrering `0003_create_lectures`, `ON DELETE CASCADE` fra `subjects`), rutene `POST/GET /api/subjects/{id}/lectures` og `GET/PATCH /api/lectures/{id}` med lik 404 for andres, ukjente og ugyldige id-er, sortering på dato, opprettingstid og id, og ekte `lecture_count` fra én `GROUP BY`. Frontend har en felles navn/dato-dialog for emner og forelesninger, «Ny forelesning» med dagens dato, forelesningstabellen på 03, forelesningssiden `/forelesninger/[id]` og en sidemeny der emner åpnes og lukkes med en pilknapp (shadcn `Collapsible`) og viser forelesningene med ukenummer og hul statusprikk.

**Filer:**
- `backend/app/modules/subjects/{models,schemas,service,router}.py`, `backend/app/main.py` -- modell, skjemaer, tjeneste og ruter
- `backend/alembic/versions/0003_create_lectures.py` -- migrering
- `backend/tests/test_lectures.py`, `test_migrations.py` -- backendtester
- `frontend/components/ui/{collapsible,table}.tsx` -- shadcn-komponenter tilpasset DESIGN.md
- `frontend/lib/messages.ts` -- `INVALID_DATE`
- `frontend/modules/subjects/components/{name-date-dialog,subject-form-dialog,lecture-form-dialog,lecture-table,subject-sidebar}.tsx` -- dialoger, tabell og sidemeny
- `frontend/modules/subjects/pages/{subject-page,lecture-page}.tsx`, `frontend/app/(app)/forelesninger/[lectureId]/page.tsx` -- sidene
- `frontend/modules/subjects/{types,api,format,validation}.ts` + tester -- typer, kall, `isoWeek`, `formatDayMonth`, `todayNorwegian`
- `frontend/vitest.config.ts` -- tidssonen Europe/Oslo i testene
- `frontend/e2e/forelesninger.spec.ts`, `frontend/e2e/emner.spec.ts` -- ende-til-ende med axe og tastatur
- `docs/skjermbilder/story-2-2/` -- skjermbilder i 1280 og 768 px

**Gjennomgang:** 30 funn. Rettet (alle `low`): feilmelding i sidemenyen, ubrukte datofunksjoner fjernet, `TZ=Europe/Oslo` i Vitest, tester for PATCH med 201 tegn, datofeil fra backenden i dialogen, API-rekkefølge uten ny sortering, og e2e for «Nytt navn» med tastatur. Utsatt 1 (`medium`: e2e utenfor CI, gjelder hele repoet). Avvist: 5 `false`, 1 `maybe-false` og 13 `low` med grunner i Review Triage Log. Rettet etter skjermbildene: sidemenyens rader var flyttet for langt inn og brukte prosjektets egen avstandsskala (`size-6` = 40 px), og lange navn presset pila ut av tabellen på 768 px. Rettingene ble gjort av hovedøkten, ikke av implementeringsagenten.

**Ny gjennomgang anbefales:** nei. Bare `low`-funn ble rettet (patched: high 0, medium 0, low 7 grupper).

**Verifisering:** `uv run pytest` 203 grønne; `npm run test` 356 grønne og `tsc --noEmit` uten feil; `docker compose up --build` + `npx playwright test` 39 grønne. Frontend har ikke noe `lint`-skript.

**Gjenværende risiko:** e2e kjøres ikke i CI; forelesningssiden mangler brødsmuler og semesterlinje fra skisse 04 (semesterlinja kommer i epic 5); fargene 4–6 er fortsatt ikke godkjent (#80).
