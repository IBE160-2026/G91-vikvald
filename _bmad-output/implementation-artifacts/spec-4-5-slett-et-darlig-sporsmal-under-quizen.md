---
title: 'Story 4.5: Slett et dårlig spørsmål under quizen'
type: 'feature'
created: '2026-11-22'
baseline_revision: 'cb1999935fe835bc7c572fb46a948659059da9af'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
warnings: ['oversized']
deferred:
  - summary: >-
      A deleted quiz question can be generated again by «+ Lag flere», since duplicate checking only sees questions that still exist.
    evidence: |-
      quiz_question_texts (story 4.1) lists stored questions; a deleted one is gone from it, and the mock rule makes the same question from the same page. Same for flashcards since 3.7. A fix needs a record of deleted texts (migration).
    location: >-
      backend/app/modules/content/service.py (quiz_question_texts)
    severity: medium
  - summary: >-
      CI does not run Playwright, so keyboard and axe checks in the e2e suite run only locally.
    evidence: |-
      .github/workflows/ci.yml runs uv run pytest and npm run test only. Applies to the whole e2e suite.
    location: >-
      .github/workflows/ci.yml
    severity: low
---

<intent-contract>

## Intent

**Problem:** Studenten kan ikke fjerne et dårlig quizspørsmål mens hun tar quizen, så det kommer igjen neste gang (story 4.5 i `epics.md`: FR-37, AR-2, AR-17, UX-DR22, UX-DR29; E22 for quiz).

**Approach:** Ny rute `DELETE /api/quiz-questions/{id}` i `content`, bygd som `DELETE /api/flashcards/{id}` fra story 3.7. Quizøkten får tekstknappen «Slett» i bunnfeltet under spørsmålet (før og etter bekreftelse), med den felles slettebekreftelsen; et slettet spørsmål tas ut av økten med den samme rene funksjonen `removeCard` som flashcards bruker (E22).

## Boundaries & Constraints

**Always:**
- **API (`content`):** `DELETE /api/quiz-questions/{id}` → `204` uten innhold, med `current_user`. Eierskap via fil → forelesning → emne; andres, ukjent og ugyldig id gir lik `404 NOT_FOUND`; uten innlogging `401`. Ny `quiz_questions_router` registreres i `backend/app/main.py`; `test_route_guard.py` skal være grønn uten endring.
- **Jobb pågår:** samme regel som sletting av kort i 3.7 (#191): sletting av ett spørsmål stoppes ikke av en jobb som pågår (spørsmålene hører til fila, ikke jobben). Testet med en `Job(status="running")`-rad.
- **Tellingene:** etter sletting er spørsmålet borte fra `GET /api/lectures/{id}/content-counts`, `…/quiz-questions` og `GET /api/subjects/{id}/quiz-questions`.
- **«Slett» i økten (UX-DR29):** tekstknapp (`Button variant="text"`, rød som i `flashcard.tsx`, `Trash2`-ikon) i bunnfeltet til `QuizQuestion` (raden med hintlinja og «Bekreft svar»/«Neste spørsmål»), synlig både før og etter bekreftelse, rett til venstre for hovedknappen. Ingen «Rediger». Kilden står som før i forklaringskortet etter bekreftelse. Klikk på «Slett» endrer ikke valget eller bekreftelsen.
- **Bekreftelsen:** `DeleteConfirmDialog` med tittel «Slette spørsmålet?», boksen med spørsmålsteksten, ingen telling (bare «Det kan ikke angres.»), fareknappen «Slett spørsmålet», `target="quiz-question"` (ny verdi i `DeleteTarget`). «Avbryt» har startfokus; «Avbryt»/Esc sletter ingenting og gir fokus tilbake til «Slett». `A`–`D` og Enter gjør ingenting mens dialogen er åpen (`usePracticeShortcuts` er av når `[role="dialog"]` finnes).
- **E22 i økten:** `204` eller `404` → `removeCard(state, id)`. Ubekreftet spørsmål: ut av rekkefølgen, ruten og totalen (f.eks. «4 / 15» → «4 / 14»), neste spørsmål vises. Bekreftet spørsmål: svaret står i poengsummen, ruten og lista over feil, og neste spørsmål vises. Tom kø etterpå: noe besvart → økten er ferdig (lagres som ikke avbrutt, resultatsiden); ingenting besvart → tilbake dit økten startet, ingenting lagres. Valget nullstilles; fokus går til neste spørsmåls tittel eller resultatets tittel.
- **Cache:** etter sletting fjernes spørsmålet fra øktens egen spørsmålsliste i cachen (`setQueryData`), og `["lectures", <spørsmålets forelesning>]` og alle emners øvingslister (`isSubjectPracticeQueryKey`) ugyldiggjøres, så forelesningssiden, emnesiden og «Ta quizen igjen» viser riktig tall.
- Testnavn med krav-ID: `test_fr37_slett_quizspormaal`, `test_fr37_…`, `test_sk6_…`/`test_ar2_…`; Vitest/Playwright «FR-37: …», inkludert «FR-37: avbryt sletter ingenting». axe uten brudd på quizsiden med slettebekreftelsen åpen (1280 og 768 px), og sletting med bare tastatur.

**Never:** Ingen redigering av quizspørsmål, ingen ny tabell, migrasjon eller pakke, ingen egen listeside. Ingen endring i brukerreisetestene i `e2e/brukerreiser/`, `CLAUDE.md`, planleggingsdokumentene eller `.claude/settings.json`. Ingen endring i flashcards-økten utover delte typer. Ingen kall til Gemini.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Slett ubekreftet | 3 spørsmål, spm. 1 vist, valgt B, slett | «1 / 2», ruten borte, nytt spørsmål uten valg | — |
| Slett bekreftet riktig | spm. 1 bekreftet riktig, slett | «2 / 3», rute 1 ✓ står, «1 riktige · 0 feil» | — |
| Slett bekreftet feil | spm. 1 bekreftet feil, slett, resten riktig | resultatet teller feilen, lista viser spørsmålet | — |
| Siste spørsmål, noe besvart | to bekreftet, det siste slettes ubekreftet | økten ferdig, lagres `aborted:false`, `answered:2`, resultatside | — |
| Eneste spørsmål | 1 spørsmål, slett ubekreftet | tilbake til forelesningen/emnet, ingenting lagret | — |
| Avbryt / Esc | dialogen åpen | spørsmålet står i økten og i API-et; fokus på «Slett» | — |
| Allerede borte | DELETE gir 404 | regnes som slettet (felles dialog) | — |
| Andres spørsmål | DELETE andres, ukjent, ugyldig id | `404 NOT_FOUND`, ingenting slettet | — |
| Jobb pågår | jobb `running` på forelesningen | `204`, spørsmålet slettet | — |
| Annen feil | 500 | dialogen viser reserveteksten, spørsmålet står | — |

</intent-contract>

## Code Map

- `backend/app/modules/content/service.py:291-357` -- `get_flashcard`/`delete_flashcard`: mønster for `get_quiz_question` (join `File`, `Lecture`, `Subject`; ugyldig uuid → 404) og `delete_quiz_question`.
- `backend/app/modules/content/router.py` -- `flashcards_router`; ny `quiz_questions_router = APIRouter(prefix="/api/quiz-questions")`.
- `backend/app/main.py:79` -- `include_router(flashcards_router)`; legg til den nye.
- `backend/tests/test_edit_flashcards.py:125-170` -- mønster for 204, 404 andres/ukjent/ugyldig, jobb som pågår, 401.
- `backend/tests/test_quiz.py` (`_start_quiz`, `lecture`), `test_quiz_questions.py` (`_quiz_questions`), `test_jobs.py` (`_finish_jobs`, `no_jobs_left`), `test_files.py` (`_log_in_new_user`), `test_subjects.py` (`NOT_FOUND`).
- `frontend/modules/practice/api.ts:93` -- `deleteFlashcard`; ny `deleteQuizQuestion`.
- `frontend/lib/delete-text.ts` -- `DeleteTarget` får `"quiz-question"`.
- `frontend/modules/practice/session.ts:73` -- `removeCard` gjenbrukes uendret (dekker E22 for quiz).
- `frontend/modules/practice/components/quiz-question.tsx` -- bunnfeltet; ny valgfri `onDelete`, «Slett»-knapp; `data-question-title` på h2 for fokus etter sletting.
- `frontend/modules/practice/components/flashcard.tsx:123-135` -- stil på «Slett» (`variant="text"`, `text-danger hover:bg-danger-tint`, `Trash2`).
- `frontend/modules/practice/pages/quiz-session-page.tsx` -- ny tilstand `deleting`/`deleteTarget`, `questionDeleted`, `DeleteConfirmDialog`; mønster i `flashcard-session-page.tsx:283-330,430-450`.
- `frontend/components/delete-confirm-dialog.tsx` -- felles dialog (404 = slettet, `focusAfterDelete`).
- `frontend/lib/practice-shortcuts.ts:85` -- tastene er av mens `[role="dialog"]` finnes.
- `frontend/e2e/quiz-okt.spec.ts`, `frontend/e2e/rett-og-slett-kort.spec.ts` -- hjelpere og mønster for ny `frontend/e2e/slett-quizsporsmal.spec.ts`.

## Tasks & Acceptance

**Execution:**
- `backend/app/modules/content/service.py`, `router.py`, `backend/app/main.py` -- `get_quiz_question`, `delete_quiz_question`, ruten -- FR-37, AR-2.
- `backend/tests/test_delete_quiz_questions.py` (ny) -- 204 og borte fra DB, lista og tellingene (forelesning og emne); 404 ved ny sletting; andres/ukjent/ugyldig → 404 og ingenting slettet; 401; jobb som pågår → 204.
- `frontend/lib/delete-text.ts` -- `"quiz-question"`.
- `frontend/modules/practice/api.ts` -- `deleteQuizQuestion`.
- `frontend/modules/practice/components/quiz-question.tsx` + test -- «Slett» før og etter bekreftelse, ingen «Rediger», klikk kaller bare `onDelete`.
- `frontend/modules/practice/session.test.ts` -- quiz-tilfellene av `removeCard` (bekreftet uten å gå videre, ubekreftet).
- `frontend/modules/practice/pages/quiz-session-page.tsx` + test -- dialogen, E22 (alle radene i matrisen), cache, tastene av i dialogen, fokus.
- `frontend/e2e/slett-quizsporsmal.spec.ts` (ny) -- slett ubekreftet og bekreftet, Avbryt og Esc, bare tastatur, axe med dialogen åpen 1280/768, tellingen på forelesningssiden går ned.

**Acceptance Criteria:**
- Given et spørsmål i quizøkten, when det vises før og etter bekreftelse, then står «Slett» i bunnfeltet, og det finnes ingen «Rediger».
- Given slettebekreftelsen, when hun trykker «Avbryt» eller Esc, then er spørsmålet fortsatt i økten og API-et, og fokus er på «Slett».
- Given at hun bekrefter, when økten fortsetter, then er spørsmålet borte fra økten etter E22, og forelesningssiden viser ett spørsmål færre.

## Spec Change Log

## Review Triage Log

### 2026-11-22 — Review pass
- verdicts: 25 findings — high 0, medium 1, low 17, false 7, maybe-false 0
- findings:
  - `[low]` `[reject]` (intent) R1: sletting mens en jobb pågår er tillatt (204) i stedet for 409 — samme regel som `DELETE /api/flashcards/{id}` i 3.7 (#191); 409-regelen i epic 3 gjelder fil, forelesning, emne og konto. Valgt og ført som kanttilfelle.
  - `[low]` `[reject]` (intent) R2: emnesidens tall etter sletting testes bare via ugyldiggjøringen i Vitest — emnesiden teller fra `subjects/<id>/quiz-questions`, som API-testen viser er uten spørsmålet, og nøkkelen ugyldiggjøres; en egen e2e gir lite mer.
  - `[false]` `[reject]` (intent) R4: ingen pytest heter `test_fr37_avbryt_sletter_ingenting` — navnene er eksempler («for eksempel»); avbryt finnes bare i nettleseren og er testet som «FR-37: avbryt sletter ingenting …» i Vitest og Playwright.
  - `[low]` `[reject]` (intent) Enter med åpen dialog prøves i Playwright bare som «Avbryt» — Vitest trykker Enter og `c` med åpen dialog og ser at valget og «Bekreft svar» er uendret; `usePracticeShortcuts` slår av alle taster når `[role="dialog"]` finnes.
  - `[false]` `[reject]` (intent) kilden ved «Slett» sjekkes ikke på nytt — kilden står i forklaringskortet som før, uendret av diffen og testet i 4.2.
  - `[low]` `[patch]` (edge) «Ta quizen igjen» med feilet henting brukte `session.state.order`, som fortsatt har et bekreftet, slettet spørsmål — reserven er nå øktens egen liste i cachen (som `questionDeleted` har filtrert), med ny Vitest-test (`b0a8899`).
  - `[low]` `[patch]` (edge) kommentaren over `ownQuestionsKey` lovet at spørsmålet aldri kommer tilbake — sann etter rettingen over (`b0a8899`).
  - `[false]` `[reject]` (edge) emnets telling sjekkes ikke i backend — emnet har ingen telle-rute; API-testen sjekker emnets liste, som emnesiden teller fra.
  - `[low]` `[patch]` (verification-gap) ingen test for bekreftet, slettet spørsmål og «Ta quizen igjen» med feilet henting — samme rot og retting som over (`b0a8899`).
  - `[low]` `[defer]` (verification-gap) CI kjører ikke Playwright, så tastatur og axe sjekkes bare lokalt — gjelder hele e2e-pakken fra før (story 1.2 er kuttbar); kjøres i hver story.
  - `[low]` `[patch]` (verification-gap, other) `playAgain` gir tilbake slettet spørsmål — samme rot (`b0a8899`).
  - `[low]` `[patch]` (verification-gap, other) testkommentaren om at bare cachen holder spørsmålet ute var feil — skrevet om (`b0a8899`).
  - `[false]` `[reject]` (blind) KI-sporet og sesjonsloggen mangler — skrives senere i samme kjøring før PR-en.
  - `[false]` `[reject]` (blind) sprint-status er gammel — oppdateres i samme kjøring etter testene.
  - `[medium]` `[defer]` (blind) et slettet spørsmål kan lages på nytt av «+ Lag flere», fordi duplikatsjekken (`quiz_question_texts`, story 4.1) bare ser spørsmål som finnes — fra før, gjelder også kort (3.7), og en løsning krever en tabell over slettede tekster (migrasjon) som storien ikke ber om. Kanttilfelle-issue.
  - `[low]` `[reject]` (blind) `setSession({ ...session, state })` bruker verdien fra siste render — sletting skjer etter en brukerhandling med ny render, og mønsteret er det samme som `cardDeleted` i 3.7.
  - `[low]` `[reject]` (blind) `deleteTarget` nullstilles aldri — dialogen er lukket og får nytt mål ved neste «Slett»; nullstilling midt i lukkingen ville fjernet teksten mens dialogen tones ut (samme som 3.7).
  - `[false]` `[reject]` (blind) `ownQuestionsKey` kan bli `["lectures", ""]` — `ScopeProps` krever enten `lectureId` eller `subjectId`.
  - `[low]` `[reject]` (blind) 404- og 500-testene sjekker lite — 404 bruker samme vei som 204 (testet grundig), og 500-veien er den felles dialogen, testet i 2.5/3.7.
  - `[low]` `[reject]` (blind) emneøkten er bare testet med mock — samme side og samme kode; forelesningen hentes fra spørsmålet, og Vitest dekker at `l2` ugyldiggjøres.
  - `[low]` `[patch]` (blind) 404-testen sammenlignet bare to av tre svar — sammenligner nå alle tre (`2b4f191`).
  - `[low]` `[reject]` (blind) eierskapsoppslaget er kopiert fra `get_flashcard` — to korte funksjoner med ulike modeller og filtre; en felles hjelper gir mer kode enn den sparer.
  - `[low]` `[reject]` (blind) «Slett» heter bare «Slett» og er ikke `size="lg"` — samme navn og størrelse som «Slett» på kortet i 3.7; det står rett under spørsmålet, og dialogen viser hele spørsmålet før noe slettes.
  - `[low]` `[reject]` (blind) `tabTo` fra toppen er skjør — mønsteret fra `rett-og-slett-kort.spec.ts`, og testen skal vise at «Slett» nås med bare tastatur.
  - `[false]` `[reject]` (blind) `frontend/e2e-skjermbilder/` bør ignoreres eller slettes — mappa skal ligge urørt etter instruks og blir aldri lagt til.

## Design Notes

- **Plassering av «Slett»:** skisse 09 tegner ikke knappen, og kilden står bare i forklaringskortet etter bekreftelse. Storien krever «Slett» også før bekreftelse, så knappen står fast i bunnfeltet under spørsmålet (raden med hintlinja og hovedknappen), samme sted før og etter, i stedet for å flytte seg inn i forklaringskortet. Kanttilfelle.
- **`removeCard` gjenbrukes:** quizen bruker `firstMarks` for bekreftede svar, så regelen for markerte kort (bli i rekkefølgen, ut av køen) gir akkurat E22 for bekreftede spørsmål, og regelen for umarkerte gir E22 for ubekreftede. Ingen ny øktfunksjon trengs.
- **Tekster:** «Slette spørsmålet?» og «Slett spørsmålet» er laget etter mønsteret «Slette kortet?»/«Slett kortet» fra 3.7. Kanttilfelle.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alt grønt
- `cd frontend && npm run test && npx tsc --noEmit && npm run lint` -- expected: alt grønt
- `cd frontend && npx playwright test` mot `docker compose up --build` -- expected: alt grønt

## Auto Run Result

Status: done

**Summary:** Story 4.5 is built. New route `DELETE /api/quiz-questions/{id}` (204; someone else's, unknown or malformed id → the same 404; 401 without login; not blocked by a running job, as cards in 3.7). The quiz session has a red text button «Slett» in the footer next to «Bekreft svar»/«Neste spørsmål», before and after confirmation, and no «Rediger». It opens the shared delete confirmation «Slette spørsmålet?» with the question text, «Det kan ikke angres.» and «Slett spørsmålet»; «Avbryt» has initial focus and Esc/«Avbryt» return focus to «Slett». A deleted question leaves the session with `removeCard` (E22): unconfirmed leaves the counter and grid, confirmed keeps its answer; nothing left → result if something was answered, otherwise back. The cache and the lecture/subject lists are refreshed.

**Files changed:**
- `backend/app/modules/content/service.py`, `router.py`, `backend/app/main.py` -- `get_quiz_question`, `delete_quiz_question`, the route.
- `backend/tests/test_delete_quiz_questions.py` (new) -- 204/gone/counts, job running, 404, 401.
- `frontend/lib/delete-text.ts`, `frontend/modules/practice/api.ts` -- `"quiz-question"`, `deleteQuizQuestion`.
- `frontend/modules/practice/components/quiz-question.tsx` (+ test) -- «Slett» in the footer.
- `frontend/modules/practice/pages/quiz-session-page.tsx` (+ test) -- dialog, E22, cache, «Ta quizen igjen» fallback.
- `frontend/modules/practice/session.test.ts` -- quiz cases for `removeCard`.
- `frontend/e2e/slett-quizsporsmal.spec.ts` (new) -- keyboard only, axe 1280/768, lecture page count.
- `docs/skjermbilder/story-4-5/` -- screenshots.

**Review:** 25 findings: 6 rows patched (one root cause: «Ta quizen igjen» after a failed refetch could bring back a deleted, confirmed question; plus the 404 test comparing all three bodies), 2 deferred (re-generation of a deleted question by «+ Lag flere», medium; Playwright not in CI, low), 17 rejected with reasons in the triage log (7 false).

**Follow-up review recommended:** false (patched: low 6, no high or medium).

**Verification:** `uv run pytest` 545 passed; `npm run test` 801 passed (66 files); `npx tsc --noEmit` clean; `npx playwright test` against `docker compose up --build` 148 passed (a first full run had one failure in `vilkar.spec.ts:150`, a file-chooser timeout unrelated to this story, which passed 12/12 alone and in the next full run). `npm run lint` does not exist in this project (no lint script), so it was not run.

**Residual risks:** A deleted question can be generated again by «+ Lag flere» (deferred, issue). Bare prøvd i Chromium.

