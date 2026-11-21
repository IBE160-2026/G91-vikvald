---
title: 'Story 2.1: Opprett emner og se dem på forsiden'
type: 'feature'
created: '2026-11-21'
baseline_revision: '52538baa6def530c9ec699180e0039236b5e02cb'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Fargeverdiene subject-4 til subject-6 er ikke ført i DESIGN.md, og Silje har ikke godkjent dem.
    evidence: |-
      Storien krever føring i DESIGN.md og godkjenning før fletting. Kjøringen får ikke endre planleggingsdokumentene og venter ikke på godkjenning per endring. Fulgt opp i kanttilfelle #80.
    location: >-
      frontend/app/globals.css
    severity: medium
  - summary: >-
      Kontrakten mellom frontend og backend sjekkes bare av e2e, som CI ikke kjører.
    evidence: |-
      ci.yml kjører bare pytest og Vitest (AR-20). Frontendtestene bruker egne Subject-objekter, så et omdøpt felt i SubjectOut ville gått grønt i CI.
    location: >-
      .github/workflows/ci.yml
    severity: medium
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

### 2026-11-21 — Review pass
- verdicts: 30 findings — high 0, medium 5, low 21, false 4, maybe-false 0
- findings:
  - `[medium]` `[defer]` (intent) Fargeverdiene står ikke i DESIGN.md, og Siljes godkjenning før fletting mangler — instruksen for kjøringen forbyr endring av planleggingsdokumentene og godkjenning per endring; fulgt opp i kanttilfelle #80 og gjennomgangen av epic 2.
  - `[low]` `[reject]` (intent) Storien skriver «eksamen fredag …» med liten forbokstav, koden «Eksamen fredag …» — bevisst: linja står alene og begynner en setning; ført som kanttilfelle.
  - `[low]` `[reject]` (intent) Vitest-testen heter «UX-DR3: …», ikke `test_uxdr3_…` — følger frontendens navnestil med krav-ID (AR-17 er oppfylt).
  - `[medium]` `[patch]` (intent) «Nytt navn», «Endre eksamensdato», «Nytt emne» og sidemenyen testes bare med mus, og fokusringen sjekkes ikke — e2e utvidet med Tab/Enter og sjekk av fokusringen.
  - `[false]` `[reject]` (intent) Undertittelen er et tillegg storien ikke ber om — oppgaven sier at undertittelen fra skisse 02 hører til denne storien.
  - `[medium]` `[patch]` (edge) Navn over 200 tegn gir bare reserveteksten — feltet har nå `maxLength` 200, med test.
  - `[low]` `[reject]` (edge) NUL-tegn i navnet gir 500 på Postgres — krever at hun limer inn et kontrolltegn; rettingen er en ny vakt.
  - `[low]` `[reject]` (edge) UUID i annen skrivemåte (store bokstaver, uten bindestrek) gir ingen `aria-current` — appen lager bare kanoniske lenker; rettingen er en ny vakt.
  - `[low]` `[reject]` (edge) Lukk og åpne dialogen igjen mens PATCH går, gir mulig dobbel lagring — lokale kall tar millisekunder; rettingen er ny tilstand.
  - `[low]` `[reject]` (edge) Avbryt mens «Opprett emne» går, sender henne likevel til emnet — emnet er opprettet, så siden finnes; sjelden i praksis.
  - `[low]` `[reject]` (edge) To samtidige opprettinger kan få samme farge — én student i én fane; låsing er ny mekanisme, og fargen er aldri eneste kjennetegn.
  - `[low]` `[reject]` (edge) Undertittelen oppdateres ikke over midnatt — oppdateres ved neste innlasting; ny timer er unødvendig.
  - `[low]` `[patch]` (verification-gap) Ingen test for at henting av emnelista feiler — test lagt til i `home-page.test.tsx`.
  - `[low]` `[patch]` (verification-gap) Ingen test for annen feil enn 404 på emnesiden — test lagt til i `subject-page.test.tsx`.
  - `[medium]` `[defer]` (verification-gap) Kontrakten mellom frontend og backend sjekkes bare av e2e, som CI ikke kjører — gjelder hele repoet (AR-20-valget i `ci.yml`), ikke laget av denne storien.
  - `[low]` `[reject]` (verification-gap) Årstall 0–99 tolkes ulikt i frontend og backend — urealistiske eksamensdatoer.
  - `[medium]` `[patch]` (blind) Navn over 200 tegn gir generisk feil, og feltet har ingen `maxLength` — samme rot og retting som edge-raden.
  - `[low]` `[reject]` (blind) Ingen visning av at lagring pågår, og lukking avbryter ikke kallet — samme vurdering som edge-radene om samtidighet.
  - `[false]` `[reject]` (blind) Rekkefølgen er ikke sikker fordi `id` er tilfeldig — `created_at` har mikrosekunder og hver oppretting er en egen forespørsel med commit, så like tidsstempler oppstår ikke i praksis; `id` er bare stabil reserve.
  - `[low]` `[reject]` (blind) Ingen CHECK på `color_index` og ingen lås ved samtidige opprettinger — bare tjenesten skriver kolonnen og velger alltid 0–5; samtidighet som over.
  - `[low]` `[reject]` (blind) Tom PATCH eller `null` gjør ingenting og svarer 200 — ufarlig, og frontend sender alltid ett felt.
  - `[low]` `[reject]` (blind) Ugyldig body til andres emne gir 422 før 404 — svaret er likt for egne, andres og ukjente id-er, så ingenting lekker.
  - `[false]` `[reject]` (blind) `\d` slipper gjennom andre sifre enn ASCII — Pydantics datotolking avviser dem, så svaret blir 422 uansett.
  - `[low]` `[reject]` (blind) Ingen lengdegrense på `name` i skjemaet — appen kjører lokalt; `clean_name` avviser for lange navn.
  - `[low]` `[reject]` (blind) Sidemenyen har ingen feiltilstand og ingen egen rulling — siden viser feilmeldingen når hentingen feiler; mange emner er sjeldent i ett semester.
  - `[low]` `[patch]` (blind) Manglende tester for feil ved henting, PATCH-feil og PATCH med 201 tegn — tester lagt til i frontend og backend.
  - `[low]` `[reject]` (blind) `subject!` i dialogen — begge kallene sender alltid emnet; en ny typestruktur er omskriving.
  - `[low]` `[reject]` (blind) E2e avhenger av antall Tab-trykk og 288 px — bevisst: bredden er designkravet, og rekkefølgen er en del av tastaturkravet.
  - `[low]` `[patch]` (blind) Oppføringen i `prompts.md` er ikke i tråd med regelen for KI-sporet — skrevet om til den korte oppføringen story-prompten ber om.
  - `[false]` `[reject]` (blind) Fargene 4–6 kan gli fra DESIGN.md uten at noe feiler — `design-tokens.test.ts` sammenligner hver farge i DESIGN.md med temaet, så en annen verdi der gir rød test.

## Design Notes

- **Datofelt som tekst:** Meldingen «for eksempel 04.12.2026» peker på et felt der man skriver `dd.mm.åååå`. Et tekstfelt gir samme oppførsel i alle nettlesere og er lett å teste. Godta `d.m.åååå` også; kalenderdato må finnes (31.02 avvises).
- **Fargene:** magenta (hue 329), oker (46) og blågrønn (176), med kontrast 5,9 / 4,7 / 5,1 mot `paper`. Ingen ligger nær merkefargen (237), rødt (4) eller grønt (139). DESIGN.md kan ikke endres i kjøringen, så verdiene føres i `beslutninger.md` og et `kanttilfelle`-issue til Silje.
- **Sidemenyen** er vanlig `nav`/`ul`-markup, ikke shadcn `Sidebar`: den har ingen interaksjon ennå (bare lenker), mens shadcn-varianten tar med mobilskuff, Ctrl+B og egen tilstand som ikke står i designet.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alle grønne
- `cd frontend && npm run test` -- expected: alle grønne
- `docker compose up --build -d && cd frontend && npx playwright test` -- expected: alle grønne

## Auto Run Result

**Sammendrag:** Emner kan opprettes, vises og endres. Backend har tabellen `subjects` (migrering `0002_create_subjects`, `ON DELETE CASCADE` fra `users`) og rutene `POST/GET /api/subjects` og `GET/PATCH /api/subjects/{id}` med `current_user`, `get_owned`, fargevalg (første ledige av 0–5, ellers antall % 6) og `NAME_REQUIRED`. Frontend har forsiden med undertittel, «Nytt emne» og emneliste (eller tom-tilstand med «Lag ditt første emne»), emnesiden `/emner/[id]` med sidemeny, og dialogene «Nytt emne», «Nytt navn» og «Endre eksamensdato» på den felles dialogen. Tre nye emnefarger med kontrasttest.

**Filer:**
- `backend/app/core/errors.py`, `frontend/lib/messages.ts` -- `NAME_REQUIRED` og datomeldingen
- `backend/app/modules/subjects/*` -- modell, skjema, tjeneste og ruter
- `backend/alembic/versions/0002_create_subjects.py`, `backend/alembic/env.py`, `backend/app/main.py` -- migrering og kobling
- `backend/tests/test_subjects.py`, `test_migrations.py`, `conftest.py` -- backendtester
- `frontend/app/globals.css`, `frontend/lib/subject-colors.ts` (+ test) -- emnefarger 4–6 og kontrasttest
- `frontend/lib/use-document-title.ts` (+ test) -- fanetittel med emnenavnet
- `frontend/modules/subjects/*` -- typer, API, format, validering, prikk, dialog, sidemeny, sidene og tester
- `frontend/app/(app)/page.tsx`, `frontend/app/(app)/emner/[subjectId]/page.tsx` -- rutene
- `frontend/e2e/emner.spec.ts` -- ende-til-ende med axe og tastatur
- `docs/skjermbilder/story-2-1/` -- skjermbilder i 1280 og 768 px

**Gjennomgang:** 30 funn. Rettet (5 grupper): medium 2 (`maxLength` 200 på navnefeltet; e2e med bare tastatur og sjekk av fokusringen), low 3 (tester for feil ved henting av lista og emnet og for PATCH-feil, backendtest for 201 tegn ved PATCH, oppføringen i `prompts.md`). Utsatt 2 (DESIGN.md og godkjenning av fargene, #80; kontrakten sjekkes bare av e2e utenfor CI). Avvist: 4 `false` og 19 `low` med grunner i Review Triage Log. I tillegg rettet etter skjermbildene: emnenavnet ble delt midt i ordet på 768 px (`61e897c`).

**Ny gjennomgang anbefales:** ja, fordi to medium-funn ble rettet. Konkret risiko: de nye tastaturstegene i `emner.spec.ts` kjøres bare lokalt mot Docker, ikke i CI.

**Verifisering:** `uv run pytest` 166 grønne; `npm run test` 327 grønne og `tsc --noEmit` uten feil; `docker compose up --build` + `npx playwright test` 34 grønne (også etter rettingen av emnesiden).

**Gjenværende risiko:** fargene er ikke godkjent av Silje (#80); fanetittelen holdes på plass av en `MutationObserver`, som er en omvei rundt Next.js; ingen menyknapp for sidemenyen ved 768 px (EXPERIENCE.md, ikke i storien).

