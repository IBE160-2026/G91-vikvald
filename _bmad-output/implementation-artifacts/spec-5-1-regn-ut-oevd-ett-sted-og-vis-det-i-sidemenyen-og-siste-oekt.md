---
title: 'Story 5.1: Regn ut «øvd» ett sted og vis det i sidemenyen og SISTE ØKT'
type: 'feature'
created: '2026-11-22'
baseline_revision: '22ef0952d69b09b204c902a3d1f975d65476975d'
status: 'ready-for-dev'
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

**Problem:** Økter lagres i `practice_sessions` (epic 3–4), men ingenting regner ut hvilke forelesninger som er øvd. Sidemenyen viser alltid hul prikk, og emnesiden har ingen SISTE ØKT (story 5.1 i `epics.md`: FR-56, AR-2, AR-9, AR-15, AR-16, AR-17, UX-DR7, UX-DR14).

**Approach:** Én funksjon `practiced_lectures` i `practice/service.py` regner ut «øvd» og siste tidspunkt per forelesning. Spørsmålet «hadde forelesningen innhold av typen ved T» besvares av én funksjon i `content` (register per øvingstype). Ny rute `GET /api/overview` gir emner, forelesninger med `practiced`/`last_practiced_at` og `last_session`. Frontend henter oversikten for statusprikkene i sidemenyen og SISTE ØKT i «Øv på hele emnet», og henter den på nytt når en økt er lagret.

## Boundaries & Constraints

**Always:**
- **Regelen:** en forelesning er øvd når minst én økt teller for den, også en avbrutt. En økt med `lecture_id` teller for den forelesningen. En emneøkt (`lecture_id` tom) med `started_at` T teller for hver forelesning i emnet der første innhold av øktens type (`flashcards`: kort av typen qa/concept, `quiz`: quizspørsmål, `freetext`: ikke registrert ennå → ingen) har `created_at` ≤ T. `last_practiced_at` = største `started_at` blant øktene som teller, ellers `null`. Tider normaliseres til UTC (SQLite gir dem uten tidssone).
- **Modulgrenser (AR-9, AR-16):** bare `practice` leser `practice_sessions`; `practice` leser aldri innholdstabellene, men kaller `first_content_times(session, lecture_ids, kind)` i `content/registry.py`, som slår opp en registrert funksjon per øvingstype (flashcards og quiz registreres av `content` selv, som tellerne). En test sjekker at `PracticeSession`/`practice_sessions` bare nevnes i `app/modules/practice/`.
- **`GET /api/overview`** (i `practice/router.py`, `current_user`): `{"subjects": [{id, name, color_index, exam_date, lectures: [{id, name, date, practiced, last_practiced_at}], last_session: null | {kind, lecture_id, started_at, aborted, shown, answered, correct, partial, wrong}}]}`. Emner i samme rekkefølge som `GET /api/subjects`, forelesninger som `GET /api/subjects/{id}/lectures`. `last_session` = økten med størst `started_at` (så `id`). Bare egne data; uten innlogging `401 UNAUTHENTICATED`.
- **Sidemenyen (UX-DR7):** hver forelesningsrad har fylt prikk (`bg-ink-muted`, 8 px) når øvd, hul (som i dag) ellers. Prikken har `role="img"` og `aria-label` «Øvd» eller «Ikke øvd ennå». Uten oversikt (lastes/feil): hul prikk.
- **SISTE ØKT (UX-DR14, skisse 03):** nederst i `PracticeAllCard`, under en hårstrek: overlinjen «SISTE ØKT» (`text-overline`, dempet; for skjermleser en `h3` «Siste økt»), linjen «<Type> · <forelesningsnavn>» (`text-label`/500, ink) eller «<Type> · Hele emnet», og linjen «dd.mm · <resultat>» (`text-body-sm`, dempet). Type: «Flashcards», «Quiz», «Fritekstspørsmål». Resultat: quiz/fritekst «C av A riktige», flashcards «Kunne C av A» (C = `correct`, A = `answered`); avbrutt økt får «Avbrutt · » foran resultatet. Datoen fra `started_at` i lokal tid med en felles `formatDayMonth` i `frontend/lib/dates.ts` (som også tar «åååå-mm-dd»; `modules/subjects/format.ts` re-eksporterer den). Ingen økt → ingen SISTE ØKT. Kortet vises fortsatt bare når det har minst én rad.
- **Ferskhet:** `useSessionSaver` ugyldiggjør `["overview"]` når en lagring er bekreftet av serveren (via `QueryClientContext`, så hooken virker uten provider i testene).
- Testnavn med krav-ID (`test_ar9_…`, `test_fr56_…`, `test_ux_dr14_…`, «UX-DR7: …»). axe uten brudd på 03, 04 og 15 (konto) med prikkene, 1280 og 768 px.

**Never:** Ingen endring i forelesningstabellen (story 5.2), eksamenslinja (5.3), forsiden (5.4) eller semesterlinja (5.5). Ingen ny tabell, migrering eller pakke. Ingen endring i `e2e/brukerreiser/`, `CLAUDE.md`, planleggingsdokumentene eller `.claude/settings.json`. Ingen kall til Gemini. Frontend regner aldri ut «øvd» selv.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Forelesningsøkt, avbrutt | én økt på L1, `aborted` | L1 øvd, `last_practiced_at` = `started_at`; L2 ikke øvd, `null` | — |
| Emneøkt med innhold | kort i L1 laget før T, ingen i L2 | L1 øvd ved T, L2 ikke | — |
| Innhold etter start | emneøkt ved T, første kort i L1 laget etter T | L1 ikke øvd | — |
| Innhold ved nøyaktig T | `created_at` = T | teller | — |
| Feil type | quiz-emneøkt, L1 har bare kort | L1 ikke øvd | — |
| Klokke fem min etter | kort laget, så emneøkt med `started_at` fra nettleseren 5 min bak | L1 øvd i `GET /api/overview` | — |
| Flere økter | forelesningsøkt T1 og emneøkt T2 > T1 som teller | `last_practiced_at` = T2 | — |
| Annen brukers økter | to brukere | hver ser bare egne emner | — |
| Uten innlogging | `GET /api/overview` | — | `401 UNAUTHENTICATED` |

</intent-contract>

## Code Map

- `backend/app/modules/practice/service.py` -- `save_session`; nye `practiced_lectures`, `overview`.
- `backend/app/modules/practice/router.py` -- `router` (prefix `/api/practice-sessions`); ny `overview_router` registreres i `backend/app/main.py`.
- `backend/app/modules/practice/schemas.py` -- nye `OverviewOut`, `OverviewSubject`, `OverviewLecture`, `LastSessionOut`.
- `backend/app/modules/content/registry.py` -- mønster `_ensure_builtin_counters`/`register_counter`; nye `register_first_content`, `first_content_times`.
- `backend/app/modules/content/service.py` -- `flashcard_count` (bruker `PLAIN_FLASHCARD_KINDS`), `quiz_question_count`; nye `first_flashcard_times`, `first_quiz_question_times` (min `created_at` per forelesning via `File.lecture_id`).
- `backend/app/modules/subjects/service.py` -- `list_subjects`, `get_subject`, `list_lectures` (gjenbrukes).
- `backend/tests/test_practice_sessions.py` -- hjelpere `_body`, `_utc`, `_subject_and_lecture`; klokketesten l. 281 viser oppsettet med `_upload`, `_start`, `_finish_jobs`.
- `backend/tests/test_route_guard.py` -- må fortsatt være grønn.
- `frontend/modules/practice/api.ts`, `types.ts` -- nye `OVERVIEW_QUERY_KEY`, `fetchOverview`, typene.
- `frontend/modules/practice/use-session-saver.ts` (+ test) -- ugyldiggjør oversikten etter lagring.
- `frontend/modules/subjects/components/subject-sidebar.tsx` (l. 170–180 prikken) -- statusprikken.
- `frontend/modules/practice/components/practice-all-card.tsx` (+ test) -- ny `lastSession`-prop.
- `frontend/modules/subjects/pages/subject-page.tsx` (+ test) -- henter oversikten, sender SISTE ØKT til kortet.
- `frontend/modules/subjects/format.ts` -- `formatDayMonth` flyttes til `frontend/lib/dates.ts`.
- `frontend/e2e/forelesninger.spec.ts` l. 153 og `frontend/modules/subjects/subject-page.test.tsx` l. 388 -- forventer `aria-hidden` prikk i menyen; oppdateres.
- `frontend/e2e/lagre-okt.spec.ts` -- hjelpere for ny `frontend/e2e/ovd.spec.ts`.

## Tasks & Acceptance

**Execution:**
- `backend/app/modules/content/registry.py`, `service.py` -- registeret og funksjonene for første innhold -- AR-16.
- `backend/app/modules/practice/service.py`, `schemas.py`, `router.py`, `backend/app/main.py` -- `practiced_lectures`, `overview`, `GET /api/overview` -- AR-9, AR-15.
- `backend/tests/test_overview.py` (ny) -- hele matrisen (rader satt inn med faste tider), API-felt/ISO/rekkefølge, 401, egne data, modulgrense-testen, `first_content_times` (modellkort teller ikke, ukjent type → tomt).
- `frontend/lib/dates.ts` (+ test), `frontend/modules/subjects/format.ts` -- felles `formatDayMonth`.
- `frontend/modules/practice/api.ts`, `types.ts`, `last-session.ts` (+ test) -- henting og tekstene til SISTE ØKT.
- `frontend/modules/practice/use-session-saver.ts` + test -- ugyldiggjøring.
- `frontend/modules/practice/components/practice-all-card.tsx` + test, `frontend/modules/subjects/pages/subject-page.tsx` + test -- SISTE ØKT.
- `frontend/modules/subjects/components/subject-sidebar.tsx` + `subject-page.test.tsx`, `frontend/e2e/forelesninger.spec.ts` -- statusprikkene.
- `frontend/e2e/ovd.spec.ts` (ny) -- økt på L1 i nettleseren, tilbake til emnesiden uten omlasting: fylt prikk «Øvd» på L1, hul «Ikke øvd ennå» på L2, SISTE ØKT med type, forelesning, dato og resultat; emneøkt (lagret via API) gir «Hele emnet»; uten økt ingen SISTE ØKT; axe på 03, 04, 15 i 1280 og 768; prikk og SISTE ØKT nås med skjermleser (tilgjengelige navn).

**Acceptance Criteria:**
- Given en student med en lagret økt, when hun går tilbake til emnesiden, then viser sidemenyen fylt prikk med navnet «Øvd» for forelesningen og SISTE ØKT viser økten, uten at siden lastes på nytt.
- Given et emne uten økter, when emnesiden vises, then finnes ingen SISTE ØKT og alle prikker heter «Ikke øvd ennå».
- Given koden i backend, when testen for modulgrensene kjører, then nevnes `practice_sessions` bare i `practice`.

## Spec Change Log

## Review Triage Log

## Design Notes

`first_content_times` gir tidspunktet for første innhold per forelesning i stedet for ja/nei for én T, så en emneside med mange emneøkter trenger én spørring per type. «Hadde innhold ved T» er da `first <= T`. Sletter hun alt innhold i en forelesning, mister den «øvd» fra emneøkter (godtatt begrensning i epic-konteksten).

Kanttilfeller avgjort her (egne issues): resultatteksten i SISTE ØKT for flashcards og avbrutte økter; SISTE ØKT vises bare når kortet har en rad; prikken som `role="img"`, slik at lenkens navn blir «Uke 37: Merkevare Øvd».

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alt grønt
- `cd frontend && npm run test && npx tsc --noEmit && npm run lint` -- expected: alt grønt
- `cd frontend && npx playwright test` mot `docker compose up --build` -- expected: alt grønt
