---
title: 'Story 4.4: Ta quiz på hele emnet'
type: 'feature'
created: '2026-11-22'
baseline_revision: '4ad48d44428a5ad9e4c295f2a4c51921b1d43975'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Quiz questions saved in one transaction can share created_at, so same-page order falls back to the random UUID.
    evidence: |-
      created_at defaults to _utc_now per row (microseconds); order_by ends with created_at, id. Pattern from story 4.2, never observed failing.
    location: >-
      backend/app/modules/content/service.py (lecture_quiz_questions, subject_quiz_questions)
    severity: low
---

<intent-contract>

## Intent

**Problem:** Quiz finnes bare for én forelesning (story 4.2–4.3). Før eksamen vil studenten ta quiz på spørsmålene fra alle forelesningene i emnet, men emnesiden har ingen Quiz-rad i «Øv på hele emnet», og det finnes verken API-rute eller side for en quizøkt over hele emnet (story 4.4 i `epics.md`: FR-34, FR-56, AR-9, AR-17, UX-DR14).

**Approach:** Ny rute `GET /api/subjects/{id}/quiz-questions` (samme form som forelesningsruta, ordnet som emnets flashcards). Emnesiden får Quiz-raden under Flashcards. `QuizSessionPage` tar enten `lectureId` eller `subjectId`, som `FlashcardSessionPage` fra story 3.6, og den nye siden `/emner/<id>/quiz` gjenbruker hele quizøkten og resultatsiden.

## Boundaries & Constraints

**Always:**
- **Backend:** `subject_quiz_questions(session, subject_id)` i `content/service.py` gir `list[QuizQuestionOut]` fra alle emnets forelesninger, ordnet som `subject_flashcards` (forelesningsdato, opprettet, id, så fil, side, laget). Ruta bruker `current_user` og `get_subject` (andres, ukjent eller ugyldig id → `404 NOT_FOUND`; uten innlogging → `401`). Tester `test_fr34_…`/`test_fr4_…`.
- **Quiz-raden (UX-DR14, skisse 03):** under Flashcards-raden i `PracticeAllCard`: tittel «Quiz», omfang «N spørsmål fra M forelesninger» (M = antall forelesninger spørsmålene kommer fra, `lectureCountLabel`), handling: tekstknapp-lenke «Start» med pil (`ArrowRight`, `Button variant="text"`) til `/emner/<id>/quiz`; lenkens tilgjengelige navn er «Start quiz på hele emnet» (synlig «Start» + skjult « quiz på hele emnet»). Raden står alltid på én linje med handlingen til høyre (ny valgfri `inline` på `PracticeAllRow`). Ingen spørsmål → ingen Quiz-rad. Seksjonen vises når minst én rad finnes; feil i første henting av en av spørringene gir reserveteksten (som i dag for flashcards).
- **Spørringsnøkler:** `subjectQuizQuestionsQueryKey(id)` = `["subjects", id, "quiz-questions"]`. Jobbvakta (`job-watcher.tsx`) frisker opp emnenes flashcards **og** quizspørsmål når en jobb er ferdig (ny `isSubjectPracticeQueryKey`).
- **Økten for hele emnet (`/emner/<id>/quiz`):** spørsmålene fra `fetchSubjectQuizQuestions`, blandet med `shuffle` og låst ved start (som før). Panelet viser «Quiz» og «<emne>, hele emnet» (teksten i storien og skisse 09/10) med emnets farge. Forklaringskortet viser spørsmålets egen forelesning (som i dag). Resultatsiden: undertittel «<emne>, hele emnet · …», lista over feil viser forelesningen ved kilden på hver rad (bare i emneøkten). Lagring med emnets id og `lecture_id: null`. Alle veier tilbake (Esc og «Tilbake til emnet» på resultatsiden, «Avslutt økt»/Esc uten bekreftet svar, tom økt) går til `/emner/<id>`; hintet «Esc tilbake til emnet». Sidetittel «Quiz – <emne> – Studiekamerat». «Ta quizen igjen» henter emnets spørsmål på nytt. Tom: «Det finnes ingen quizspørsmål her ennå.» + «Tilbake til emnet». Andres/ukjent emne → «Fant ikke siden».
- Økten for én forelesning er uendret. Testnavn med krav-ID (`test_fr34_…`, «FR-34: …»). axe uten brudd på emnesiden med Quiz-raden og på emneøkten (spørsmål før/etter bekreftelse og resultat), 1280 og 768 px, og alt med bare tastatur.

**Never:** Ingen «Slett» i quizen (4.5), ingen SISTE ØKT (epic 5). Ingen ny pakke eller migrering. Ingen endring i flashcards-økten (utover delt hjelpefunksjon for nøkkelen), brukerreisetestene i `e2e/brukerreiser/`, `CLAUDE.md`, planleggingsdokumentene eller `.claude/settings.json`. Ingen kall til Gemini.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| To forelesninger med quiz | 4 + 4 spørsmål | Raden «8 spørsmål fra 2 forelesninger»; økten «… / 8», blandet | — |
| Bare flashcards | kort, ingen quiz | Bare Flashcards-raden | — |
| Bare quiz | quiz, ingen kort | Seksjonen med bare Quiz-raden | — |
| Annen brukers emne | GET quiz-questions | `404 NOT_FOUND`; siden viser «Fant ikke siden» | — |
| Emneøkt avsluttet | ett bekreftet svar, Esc | lagres med `lecture_id: null`, `kind: "quiz"`, `aborted: true`; resultat; Esc → emnesiden | lagring feiler → reservetekst |
| Avslutt uten svar | ingen bekreftet | rett til emnesiden, ingenting sendt | — |

</intent-contract>

## Code Map

- `backend/app/modules/content/service.py` -- `lecture_quiz_questions` (l. 122) og `subject_flashcards` (l. 197): mønster for spørring og rekkefølge; ny `subject_quiz_questions`.
- `backend/app/modules/content/router.py` -- `subject_flashcard_list` på `subjects_router`; ny `subject_quiz_question_list`.
- `backend/tests/test_subject_flashcards.py`, `backend/tests/test_quiz_questions.py` -- hjelpere (`_start_quiz`, `distinct_definitions`, `_create_lecture`, `_new_subject`, `NOT_FOUND`); ny `test_subject_quiz_questions.py`.
- `backend/tests/test_route_guard.py` -- går over alle ruter automatisk; må fortsatt være grønn.
- `frontend/modules/practice/api.ts` -- `subjectFlashcardsQueryKey`, `isSubjectFlashcardsQueryKey`; nye `subjectQuizQuestionsQueryKey`, `fetchSubjectQuizQuestions`, `isSubjectPracticeQueryKey`.
- `frontend/modules/generation/components/job-watcher.tsx` (l. 100) + test (l. 126) -- bruk `isSubjectPracticeQueryKey`.
- `frontend/modules/practice/components/practice-all-card.tsx` + test -- `inline` på raden.
- `frontend/modules/subjects/pages/subject-page.tsx` (+ test) -- ny spørring og `quizRows`, `practiceError` for begge.
- `frontend/modules/practice/pages/quiz-session-page.tsx` + test -- `QuizSessionPage({lectureId}|{subjectId})`, ny `useQuizScope` etter mønster av `useScope` i `flashcard-session-page.tsx` (l. 66–140); `QuizResult` får `backText`, `backHint`, `showLecture`.
- `frontend/modules/practice/components/missed-list.tsx` + test -- valgfri `lecture` på `MissedQuizItem`, vist ved kilden.
- `frontend/app/(app)/emner/[subjectId]/quiz/page.tsx` (ny) -- som `emner/[subjectId]/flashcards/page.tsx`.
- `frontend/e2e/hele-emnet.spec.ts`, `frontend/e2e/quiz-resultat.spec.ts` -- hjelpere for ny `frontend/e2e/quiz-hele-emnet.spec.ts`.

## Tasks & Acceptance

**Execution:**
- `backend/app/modules/content/service.py`, `router.py` -- `subject_quiz_questions` og `GET /api/subjects/{id}/quiz-questions` -- FR-34.
- `backend/tests/test_subject_quiz_questions.py` (ny) -- felt, rekkefølge over forelesninger, tomt emne, annet emne kommer ikke med, 404/401.
- `frontend/modules/practice/api.ts` (+ test om finnes) og `job-watcher.tsx` + test -- nøkler, henting, oppfrisking.
- `frontend/modules/practice/components/practice-all-card.tsx` + test -- `inline`-rad.
- `frontend/modules/subjects/pages/subject-page.tsx` + test -- Quiz-raden under Flashcards, skjult uten spørsmål -- UX-DR14.
- `frontend/modules/practice/components/missed-list.tsx` + test -- forelesningen ved kilden.
- `frontend/modules/practice/pages/quiz-session-page.tsx` + test, `frontend/app/(app)/emner/[subjectId]/quiz/page.tsx` -- emneøkten -- FR-34, FR-56, AR-9.
- `frontend/e2e/quiz-hele-emnet.spec.ts` (ny) -- raden og axe på emnesiden, økten med spørsmål fra begge forelesningene, panelet «Markedsføring, hele emnet», forelesningen i forklaringskortet og lista, lagring med `lecture_id: null`, Esc til emnesiden, axe 1280/768, bare tastatur.

**Acceptance Criteria:**
- Given et emne der minst én forelesning har quizspørsmål, when emnesiden vises, then har «Øv på hele emnet» en Quiz-rad under Flashcards med «N spørsmål fra M forelesninger» og «Start ›» (lenke til `/emner/<id>/quiz`); uten spørsmål finnes ingen Quiz-rad.
- Given at hun trykker «Start», when økten går, then får hun alle emnets spørsmål i tilfeldig rekkefølge, panelet viser «Quiz» og «Markedsføring, hele emnet», og forklaringskortet og lista over feil viser forelesningen til hvert spørsmål.
- Given en emneøkt med minst ett bekreftet svar, when den lagres, then er `lecture_id` null, og Esc og «Tilbake til emnet» på resultatsiden går til emnesiden.
- Given en annen brukers emne, when `GET /api/subjects/{id}/quiz-questions` kalles, then svarer API-et `404 NOT_FOUND`.

## Spec Change Log

## Review Triage Log

### 2026-11-22 — Review pass
- verdicts: 19 findings — high 0, medium 0, low 13, false 5, maybe-false 0 (plus 1 own finding from the screenshots)
- findings:
  - `[low]` `[reject]` (blind) the subject page fetches every question (with the answer key) only to count them — same pattern as the Flashcards row from 3.6, and the story names this endpoint as the source; the app runs locally, and a count endpoint adds surface.
  - `[low]` `[reject]` (blind) `subject_quiz_questions` has no limit — a subject's questions are bounded by its lectures and the 30-per-job cap; same as `subject_flashcards`.
  - `[low]` `[reject]` (blind) the `start.sh` keep-alive fix is unrelated to the story — the run asked for the root cause of the flaky `erstatt.spec.ts` in this story; it is its own commit and is logged in `korrigeringer.md`.
  - `[false]` `[reject]` (blind) no KI trail, spec not committed — written later in the same run before the PR; `frontend/e2e-skjermbilder/` is a leftover folder that must not be committed.
  - `[low]` `[patch]` (blind) the lecture line in the list of wrong answers has no label for screen readers — now starts with a hidden «Forelesning: ».
  - `[low]` `[reject]` (blind) a quiz load error shows the shared fallback text above a working Flashcards row — the same text and rule as 3.6; the unit test shows the alert and the code keeps the other row.
  - `[low]` `[patch]` (blind) no test pins file upload order inside one lecture for the subject endpoint — new `test_fr34_sporsmalene_i_en_forelesning_kommer_i_fil_og_siderekkefolge`.
  - `[low]` `[reject]` (blind) no test checks that the subject quiz mixes lectures — `shuffle` is tested in `session.test.ts` and called by `newSession`; a random-order assertion would be flaky (same as 4.3).
  - `[low]` `[reject]` (blind) the inline row is not tested at phone width — the app is designed for PC; 768 px is the narrowest width in EXPERIENCE.md, and it is tested.
  - `[low]` `[patch]` (blind) the `playAgain` comment talks only about the lecture — reworded for both scopes.
  - `[low]` `[reject]` (blind) `useQuizScope` creates disabled queries with `""` ids and waits for the subject before the questions — same as `useScope` in the flashcard session; disabled queries send nothing.
  - `[false]` `[reject]` (blind) the arrow should be a chevron «›» — mockup 03 draws an arrow (path `M3 8h10`, `M9 4l4 4-4 4`), which is `ArrowRight`.
  - `[low]` `[reject]` (blind) repeated setup in the e2e file — test-only, and the two tests need different content (with and without flashcards).
  - `[low]` `[defer]` (edge) questions saved in one flush can get equal `created_at`, so same-page order falls back to the UUID — the order rule comes from story 4.2 (`lecture_quiz_questions`) and is not changed here; never seen in a run.
  - `[false]` `[reject]` (edge) the e2e helper picks the wrong question if two share text — the fixture uses eight distinct terms, so texts are unique.
  - `[low]` `[patch]` (verification-gap) file upload order inside a lecture not pinned — same patch as the blind row above.
  - `[false]` `[reject]` (intent) the random mix is in the client, not the API — the story's «blandet … i tilfeldig rekkefølge» is met by the session, as for flashcards in 3.6; a shuffled API would break the stable order the tests rely on.
  - `[low]` `[patch]` (intent) no test stores a quiz session with `lecture_id` null — new `test_fr56_quizokt_for_hele_emnet_lagres_uten_forelesning`.
  - `[false]` `[reject]` (intent) `start.sh` outside the intent — same as the blind row; requested by the run.
  - own check (screenshots against mockup 03): the arrow ended 8 px inside the card's edge; patched with `-mr-2` on the text button, so its padding lies in the card's padding and the arrow ends at the inner edge as in the mockup. In the 344 px card (1440 px) the scope «8 spørsmål fra 2 forelesninger» still wraps to two lines, because the scope uses the DESIGN.md token `body-sm` (15 px) where the mockup draws 14 px (same as the Flashcards row since 3.6). Left as is and noted in the PR.

## Design Notes

Emneøkten følger 3.6: én side med to omfang, så rettinger gjelder begge. Omfanget for quiz skrives «<emne>, hele emnet» (storien og skisse 09/10), mens flashcards bruker «<emne> · hele emnet» (story 3.6). Komma er valgt fordi resultatets undertittel allerede bruker « · » som skille («Markedsføring, hele emnet · her er de 4 …»).

`useQuizScope` speiler `useScope` i flashcards-siden i stedet for å dele kode, fordi spørringene og omfangsteksten er ulike; en felles hook ville trengt like mange parametere som den sparer.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alt grønt
- `cd frontend && npm run test && npx tsc --noEmit && npm run lint` -- expected: alt grønt
- `cd frontend && npx playwright test` mot `docker compose up --build` -- expected: alt grønt

## Auto Run Result

Status: done

**Summary:** Story 4.4 is built. New route `GET /api/subjects/{id}/quiz-questions` returns all the subject's quiz questions with answer key, source and lecture (404 for someone else's subject). The subject page's «Øv på hele emnet» has a Quiz row under Flashcards («N spørsmål fra M forelesninger», «Start →», read as «Start quiz på hele emnet»), hidden when there are no questions. `/emner/<id>/quiz` reuses the quiz session and result page with the subject as scope: «<emne>, hele emnet» in the panel and result, each question's lecture in the explanation card and the list of wrong answers, saving with `lecture_id: null`, and every way back to the subject page («Tilbake til emnet»). The job watcher also refreshes the subject's quiz list. Separately, the flaky Playwright tests were traced to Uvicorn and Node's proxy agent both closing idle keep-alive connections after 5 s; Uvicorn now keeps them 65 s.

**Files changed:**
- `backend/app/modules/content/service.py`, `router.py` -- `subject_quiz_questions` and the route.
- `backend/tests/test_subject_quiz_questions.py` (new), `backend/tests/test_practice_sessions.py` -- API tests and a quiz session without lecture.
- `backend/start.sh` -- `--timeout-keep-alive 65` (flaky e2e root cause).
- `frontend/modules/practice/api.ts`, `frontend/modules/generation/components/job-watcher.tsx` -- query key, fetch, refresh.
- `frontend/modules/practice/components/practice-all-card.tsx` -- `inline` rows.
- `frontend/modules/subjects/pages/subject-page.tsx` -- the Quiz row.
- `frontend/modules/practice/components/missed-list.tsx` -- lecture under the source (hidden «Forelesning:»).
- `frontend/modules/practice/pages/quiz-session-page.tsx`, `frontend/app/(app)/emner/[subjectId]/quiz/page.tsx` -- the subject session.
- `frontend/e2e/quiz-hele-emnet.spec.ts` (new) and unit tests next to each file.

**Review:** 19 findings: 5 patched (all low, two of them the same root cause), 1 deferred (low), 13 rejected with reasons in the triage log, plus one own fix from the screenshots.

**Follow-up review recommended:** false (no high or medium patched; patched: low 5).

**Verification:** `uv run pytest` 538 passed (one run during a Docker rebuild had 1 failure that passed alone and in the next full run); `npm run test` 783 passed (66 files); `npx tsc --noEmit` clean; `npx playwright test` 145 passed against `docker compose up --build`; `erstatt.spec.ts` + `slett.spec.ts` + `quiz-okt.spec.ts` with `--repeat-each=6 --workers=10`: 1 ECONNRESET failure before the fix, 60/60 passed and 0 ECONNRESET in the proxy log after.

**Residual risks:** In the 344 px card at 1440 px the quiz scope wraps to two lines (15 px token vs 14 px in the mockup). Same-page question order relies on `created_at` (deferred).
