---
title: 'Story 4.4: Ta quiz på hele emnet'
type: 'feature'
created: '2026-11-22'
baseline_revision: '4ad48d44428a5ad9e4c295f2a4c51921b1d43975'
status: 'in-progress'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
warnings: ['oversized']
deferred: []
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

## Design Notes

Emneøkten følger 3.6: én side med to omfang, så rettinger gjelder begge. Omfanget for quiz skrives «<emne>, hele emnet» (storien og skisse 09/10), mens flashcards bruker «<emne> · hele emnet» (story 3.6). Komma er valgt fordi resultatets undertittel allerede bruker « · » som skille («Markedsføring, hele emnet · her er de 4 …»).

`useQuizScope` speiler `useScope` i flashcards-siden i stedet for å dele kode, fordi spørringene og omfangsteksten er ulike; en felles hook ville trengt like mange parametere som den sparer.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alt grønt
- `cd frontend && npm run test && npx tsc --noEmit && npm run lint` -- expected: alt grønt
- `cd frontend && npx playwright test` mot `docker compose up --build` -- expected: alt grønt
