---
title: 'Story 5.2: Vis tellinger og «Øvd 03.11» i forelesningstabellen'
type: 'feature'
created: '2026-11-22'
baseline_revision: '649d705da30b808d610d8fe9a3d1f94a0b912646'
status: 'in-progress'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Forelesningstabellen på emnesiden (03) har bare Dato, Forelesning, Filer og Status, og Status sier alltid «Ikke øvd ennå», også for forelesninger som er øvd (story 5.2 i `epics.md`: FR-16, UX-DR13, AR-15, AR-17).

**Approach:** `GET /api/subjects/{id}/file-counts` får per forelesning også tellingene fra tellingsregisteret i `content` (samme `content_counts` som slettebekreftelsen bruker). Tabellen får kolonnene Kort og Quiz, og Status leser `practiced`/`last_practiced_at` fra `GET /api/overview` (funksjonen `practiced_lectures` fra 5.1).

## Boundaries & Constraints

**Always:**
- **API:** hver rad i `lectures` i `GET /api/subjects/{id}/file-counts` får `content_counts: [{kind, count}]` = `content_counts(session, DeleteScope(file_ids=forelesningens filer, lecture_ids=(forelesningen,)))`, i registerets rekkefølge, uten tellinger som er 0. Feltene som finnes, endres ikke. Eierskap og 401/404 som før.
- **Kolonner (UX-DR13):** Dato, Forelesning, Filer, Kort, Quiz, Status. Kort = summen av typene `flashcards` og `model_cards` (modellkort, epic 7, telles når de finnes); Quiz = `quiz_questions`. Typene står i én konstant i frontend. Tallene høyrejustert med `tabular-nums`; 0 vises som «–» i dempet grå (`text-ink-muted`, skisse 03), andre tall i ink. Før tellingene er lastet er cellene tomme, som Filer i dag.
- **Status** (bare fra oversikten, frontend regner aldri ut «øvd»):
  - øvd → fylt prikk (8 px, `bg-ink-muted`, `data-status="practised"`) og «Øvd dd.mm», dato fra `last_practiced_at` med `formatDayMonth` (lokal tid).
  - ikke øvd og filer > 0 → hul prikk (`data-status="not-practised"`) og «Ikke øvd ennå».
  - ikke øvd og ingen filer → «Ingen filer ennå» uten prikk (som før).
  - Status er tom til både filtellingene og oversikten er lastet. Feiler oversikten, vises forelesningen som ikke øvd (som prikkene i sidemenyen, 5.1).
- Prikken er `aria-hidden`; teksten bærer betydningen. Under 1024 px er status-teksten bare for skjermleser (som før), men prikken vises, så status kan sees også ved 768 px.
- Hele raden er fortsatt lenken (Tab, Enter åpner 04). Pilen (›) står ytterst.
- Testnavn med krav-ID (`test_fr16_…`, «FR-16: …», «UX-DR13: …»). axe uten brudd på 03 i 1280 og 768 px.

**Never:** Ingen egen regel for «øvd» i backend eller frontend. Ingen ny tabell, migrering eller pakke. Ingen endring i sidemenyen, SISTE ØKT, eksamenslinja (5.3), forsiden (5.4) eller semesterlinja (5.5). I `e2e/brukerreiser/` endres bare kolonneindeksen der flyt 2 sjekker «Ikke øvd ennå» i tabellen. Ingen endring i `CLAUDE.md`, planleggingsdokumentene eller `.claude/settings.json`. Ingen kall til Gemini.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tellinger | L1: 2 filer, 3 kort, 2 quizspørsmål, 1 modellkort i tabellen | `content_counts` = flashcards 3, quiz_questions 2 (modellkort ikke registrert ennå); tabellen Filer 2, Kort 3, Quiz 2 | — |
| Fil uten innhold | L2: 1 fil, ingen kort | `content_counts: []`; Kort «–», Quiz «–» | — |
| Ingen filer | L3 uten filer | ikke i `lectures`; Filer, Kort, Quiz «–», «Ingen filer ennå» | — |
| Modellkort registrert | frontend får `model_cards: 2`, `flashcards: 3` | Kort 5 | — |
| Øvd | `practiced` true, `last_practiced_at` 2026-11-03T09:00Z | fylt prikk, «Øvd 03.11» | — |
| Øvd, filene slettet etterpå | `practiced` true, ingen filer | «Øvd dd.mm» (samme svar som sidemenyen) | — |
| Emneøkt | quiz-emneøkt; L1 har quiz før T, L2 bare kort | L1 «Øvd dd.mm», L2 «Ikke øvd ennå» | — |
| Oversikten feiler | `GET /api/overview` 500 | rader med filer «Ikke øvd ennå» | ingen egen feilmelding |
| Annen brukers emne | `file-counts` på fremmed emne | — | `404 NOT_FOUND` som før |

</intent-contract>

## Code Map

- `backend/app/modules/files/router.py` (l. 221–236 `subject_file_counts`; l. 239 `_preview` viser bruken av `content_counts`) -- utvides med `content_counts` per forelesning.
- `backend/app/modules/files/service.py` (l. 90 `file_counts`, l. 128 `file_ids_for_lectures`) -- trenger fil-id-er gruppert per forelesning.
- `backend/app/modules/files/schemas.py` (l. 17 `LectureFileCount`, l. 30 `DeleteCount`) -- nytt felt, gjenbruk `DeleteCount`.
- `backend/app/modules/content/registry.py` (`content_counts`, `DeleteScope`) -- gjenbrukes uendret.
- `backend/tests/test_files.py` (l. 374–399 tellingstestene sjekker hele svaret; må få `content_counts`) og `backend/tests/test_overview.py` (hjelperne `_add_card`, `_add_quiz_question`, `_add_session`, `T`) -- mønster for nye tester.
- `frontend/modules/files/types.ts` -- `LectureFileCount` får `content_counts`.
- `frontend/modules/subjects/components/lecture-table.tsx` -- kolonnene og status; ny prop med oversiktens forelesninger.
- `frontend/modules/subjects/pages/subject-page.tsx` (l. 82 `overview`, l. 172 `LectureTable`) -- sender `overviewSubject?.lectures` og om oversikten er lastet/feilet.
- `frontend/modules/subjects/components/subject-sidebar.tsx` (l. 205–220) -- prikkens klasser (fylt `bg-ink-muted`) som mønster.
- `frontend/lib/dates.ts` -- `formatDayMonth` (tar ISO-tid).
- `frontend/modules/subjects/subject-page.test.tsx` (l. 333–375 tabelltestene; `respond`-hjelperen) -- oppdateres og utvides.
- `frontend/e2e/filer.spec.ts` l. 203–206 -- kolonneoverskrifter og celler får Kort og Quiz.
- `frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts` l. 146–148 -- status-cellen flyttes fra indeks 3 til 5.
- `frontend/e2e/ovd.spec.ts` -- hjelperne (`subjectWithCards`, `expectedLastSessionDate`, `SAVE_PATH`) som mønster for ny e2e-fil.

## Tasks & Acceptance

**Execution:**
- `backend/app/modules/files/service.py`, `schemas.py`, `router.py` -- `file_ids_by_lecture` og `content_counts` per forelesning i `file-counts` -- FR-16, gjenbruk av registeret.
- `backend/tests/test_files.py` -- oppdater de to tellingstestene, og legg til `test_fr16_tellinger_per_forelesning` (kort, quiz, modellkort telles ikke, fil uten innhold gir `[]`) og en test der en type registrert med `register_counter` kommer med uten endring i `files`.
- `frontend/modules/files/types.ts`, `frontend/modules/subjects/components/lecture-table.tsx`, `pages/subject-page.tsx` -- kolonnene Kort og Quiz og status fra oversikten.
- `frontend/modules/subjects/subject-page.test.tsx` -- overskrifter, celler med «–», `model_cards` i Kort, «Øvd 03.11» med fylt prikk, ingen status før oversikten, feil i oversikten, øvd uten filer.
- `frontend/e2e/filer.spec.ts`, `frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts` -- følger de nye kolonnene.
- `frontend/e2e/forelesningstabell.spec.ts` (ny) -- forelesning med kort og quiz og lagret økt: Kort/Quiz-tallene, «Øvd dd.mm» (dato fra oversikten, formatert i nettleseren), «Ikke øvd ennå», «Ingen filer ennå»; emneøkt gir «Øvd» bare der innhold fantes; Tab til raden og Enter åpner 04; axe på 03 i 1280 og 768.

**Acceptance Criteria:**
- Given emnesiden med en øvd forelesning, when tabellen vises, then har den kolonnene Dato, Forelesning, Filer, Kort, Quiz og Status, og raden viser fylt prikk og «Øvd dd.mm» med datoen fra `GET /api/overview`.
- Given en ny innholdstype registrert med `register_counter`, when `file-counts` hentes, then kommer den med i `content_counts` uten endring i `files`.
- Given tabellen, when studenten trykker Tab til en rad og Enter, then åpnes forelesningen (04), og axe finner ingen brudd på 03.

## Spec Change Log

## Review Triage Log

## Design Notes

Tellingene legges på `file-counts` i stedet for en ny rute: tabellen henter dem allerede, bare forelesninger med filer kan ha innhold, og `files` bygger alt `DeleteScope` for slettebekreftelsen. Det koster én registerspørring per type per forelesning, som er greit for et emne med rundt ti forelesninger.

Kanttilfeller avgjort her (egne issues): en øvd forelesning uten filer viser «Øvd dd.mm», ikke «Ingen filer ennå», så tabellen og sidemenyen aldri sier noe forskjellig; status-prikken vises også under 1024 px.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alt grønt
- `cd frontend && npm run test && npx tsc --noEmit` -- expected: alt grønt
- `cd frontend && npx playwright test` mot `docker compose up --build` -- expected: alt grønt
