---
title: 'Story 4.2: Ta quiz på en forelesning'
type: 'feature'
created: '2026-11-22'
baseline_revision: 'f1f30da439c374308507ac8b8558a04c79c87653'
status: 'ready-for-dev'
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

**Problem:** Quizspørsmålene fra story 4.1 kan lages, men ikke tas: «Øv nå» på Quiz-raden er ikke aktiv (#201), og det finnes verken API for å hente spørsmålene eller en quizøkt (story 4.2 i `epics.md`: FR-32, FR-34, FR-35, FR-56, NFR-8, NFR-10, NFR-12, AR-9, AR-15, AR-17, UX-DR8, UX-DR9, UX-DR29, UX-DR31–33, UX-DR44).

**Approach:** Backend får `GET /api/lectures/{id}/quiz-questions` i `content`, i samme stil som flashcards-API-et. Frontend får en quizøkt på `/forelesninger/<id>/quiz` bygd på øktrammen i `practice`: rene funksjoner i `session.ts`, en `quizAdapter` for øktpanelet og svarrutenettet, de felles hurtigtastene og `useSessionSaver` med `kind="quiz"`. Nytt er bare det quizen trenger: `quiz-option`, `explanation-card` og spørsmålsvisningen.

## Boundaries & Constraints

**Always:**
- **API:** `GET /api/lectures/{id}/quiz-questions` (bak `current_user`, eierskap med `get_lecture` → `404 NOT_FOUND`) gir en liste med `id`, `question`, `options` (fire tekster i lagret rekkefølge), `correct_index`, `explanation`, `source: {file_id, file_name, page_no}` og `lecture: {id, name}`, sortert som flashcards (fil, side, laget). Fasiten sendes med (AR-15).
- **Økten (`practice/session.ts`):** gjenbruk `SessionState`. Nye rene funksjoner: `answerCurrent(state, mark)` setter merket for gjeldende spørsmål uten å flytte køen (første merke gjelder), og `advance(state)` tar gjeldende ut av køen (aldri bakerst igjen) og viser neste. `sessionCounts`, `gridCells`, `isFinished` gjenbrukes uendret. Tilfeldig rekkefølge med `shuffle`, hvert spørsmål én gang (FR-34).
- **Adapteren (`practice/adapter.ts`):** `PracticeAdapter` får `itemLabel` («Kort» / «Spørsmål», brukt i rutenettets skjulte tekst) og `repeats` (false for quiz: ingen «Repeterer»-linje). `quizAdapter`: «Quiz», «3 riktige · 1 feil», forklaringene «Riktig», «Feil», «Ikke besvart ennå» (ferdig: «Riktig», «Feil»), cellene «riktig», «feil», «ikke besvart ennå» («Spørsmål 4: feil»).
- **Spørsmålet (skisse 09, kolonne `quiz-column` 832 px):** overlinjen «SPØRSMÅL 4 AV 15» (nummer = viste spørsmål), spørsmålet i `quiz-question` (h2), og en radiogruppe (Radix `RadioGroup`, navngitt av spørsmålet) med fire `quiz-option` (62 px, bokstavboks A–D og tekst). Valgt men ikke bekreftet: `brand-tint` og 1,5 px `brand`-kant, som `choice-option`. Før bekreftelse finnes ingen riktig/feil-farge, ingen forklaring og ingen markering av riktig svar i DOM-en (SK-5). Valget kan byttes fritt.
- **Bekreft (FR-35):** «Bekreft svar» (hovedknapp, 48 px) er ikke aktiv før et valg. Etter bekreftelse er gruppen låst (`disabled`). Riktig alternativ: `success-tint`, 1,5 px `success`-kant og «✓ Riktig svar». Feil valgt: `danger-tint`, 1,5 px `danger`-kant og «✗ Ditt svar». Andre uendret. Symbolene er `aria-hidden`, teksten leses.
- **Levende område (UX-DR44):** et `role="status"`-avsnitt under spørsmålet, montert fra start og tomt før bekreftelse. Etter bekreftelse: synlig «Du svarte C. Svaret er bekreftet.» og skjult « Riktig.» eller « Feil. Riktig svar er B.». Fokus flyttes ikke av dette.
- **Forklaringskortet (`explanation-card`):** hvitt kort (`rounded.lg`, `border-card`, `lift`) med «Forklaring», forklaringen, hårlinje, `SourceLink` fra `frontend/components/` til venstre og emneprikk + forelesningens navn til høyre. Vises bare etter bekreftelse.
- **Bunnlinja:** hint-linja til venstre (bare med «Bruk hurtigtaster» på): «A–D velg svar», «Enter bekreft svar» / «Enter neste spørsmål» (siste: «Enter se resultatet»), «Esc avslutt»; hovedknappen til høyre: «Bekreft svar» → «Neste spørsmål» (med pil) → på siste «Se resultatet». Etter bekreftelse får «Neste spørsmål»/«Se resultatet» fokus (UX-DR31). Neste spørsmål gir fokus til spørsmålets h2 (`tabIndex=-1`), ikke på første spørsmål.
- **Taster (`lib/practice-shortcuts.ts` uendret):** bindinger `a`–`d` og `A`–`D` (enkelttaster, bare før bekreftelse), Enter (bekreft når et valg finnes, ellers ingenting; etter bekreftelse neste), Esc (`end`), `?` (dialogen). Enter med fokus i radiogruppen bekrefter via gruppens egen `onKeyDown` (Radix stopper Enter på radioknapper), aldri når `event.repeat`. «Neste spørsmål»/«Se resultatet» ignorerer en gjentatt Enter (`repeat` → `preventDefault`), så en holdt Enter aldri bekrefter og går videre i ett trykk (E26). Enter på en annen knapp gjør bare det knappen gjør (regelen i `resolveShortcut`).
- **Hurtigtastdialogen:** ny gruppe «Quiz» med «A–D» «Velg svar», «Enter» «Bekreft svar, deretter neste spørsmål», «Esc» «Avslutt økten».
- **Lagring (FR-56):** `useSessionSaver` med `kind: "quiz"`, `lecture_id`, `counts = sessionCounts(state)` (`answered` = bekreftede, `partial` 0). Ferdig → `finish()`; «Avslutt økt»/Esc med minst ett bekreftet → `abort()` og resultatvisning; uten bekreftede → rett tilbake, ingenting sendt. Navigasjon, «Logg ut» og `pagehide` som i epic 3.
- **Resultatet i denne storien (grense mot 4.3):** en enkel visning: overlinjen «QUIZ FERDIG», h2 «11 av 15 riktige» (avbrutt: «Avbrutt etter 12 av 20»), forelesningens navn, reserveteksten ved feilet lagring, omrissknappen «Tilbake til forelesningen», og Esc tilbake (hint «Esc tilbake til forelesningen»). Tittelen får fokus. Øktpanelet viser ferdig/avbrutt som i epic 3.
- **Øv nå:** `QuizRow` sender til `/forelesninger/<id>/quiz`. Ingen spørsmål i økten → h1 «Det finnes ingen quizspørsmål her ennå.» og «Tilbake til forelesningen». Smal skjerm: øktpanelet bak «Meny» (`SideMenu`) som flashcards, med skjult h1 «Quiz».
- Bare tekster fra `epics.md`/EXPERIENCE.md, ellers reserveteksten. Testnavn med krav-ID. axe uten brudd før og etter bekreftelse; hele økten med bare tastatur.

**Never:** Ingen «Ta quizen igjen», `missed-list` eller undertittel med feilsvar (4.3), ingen quiz på hele emnet (4.4), ingen «Slett» i økten (4.5). Ingen ny pakke, ingen endring i `resolveShortcut`-reglene, ingen kall til Gemini, ingen endring i `CLAUDE.md`, planleggingsdokumentene eller `.claude/settings.json`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Henter spørsmål | forelesning med 5 spørsmål | 200, 5 elementer med alle feltene, `options[correct_index]` = riktig svar | — |
| Ingen spørsmål | ny forelesning | 200 `[]`; økten viser «Det finnes ingen quizspørsmål her ennå.» | — |
| Andres / ukjent | annen brukers forelesning | `404 NOT_FOUND`; siden viser «Fant ikke siden» | — |
| Enter uten valg | intet valgt | ingenting skjer, «Bekreft svar» ikke aktiv | — |
| Holdt Enter | Enter med `repeat` etter bekreftelse | går ikke videre | — |
| A–D etter bekreftelse | bekreftet | valget endres ikke | — |
| Avslutt uten svar | ingenting bekreftet | tilbake til forelesningen, ingen POST | — |
| Avslutt etter svar | 2 bekreftet av 5 | POST `aborted=true, answered=2`, resultat «Avbrutt etter 2 av 5» | lagring feiler → reservetekst |

</intent-contract>

## Code Map

- `backend/app/modules/content/{schemas,service,router}.py` -- `QuizQuestionOut` (gjenbruk `FlashcardSource`, `LectureRef`), `lecture_quiz_questions` etter mønsteret i `lecture_flashcards`, ruten på `lectures_router`.
- `backend/tests/test_quiz.py` -- hjelperne `lecture`, `_start_quiz`, `_finish_jobs`; ny `backend/tests/test_quiz_questions.py`. `test_route_guard.py` dekker ny rute automatisk.
- `backend/tests/test_practice_sessions.py` -- mønster for å poste en økt; legg til en quizøkt (`test_fr56_quizokt_lagres`).
- `frontend/modules/practice/{types,api,session,adapter}.ts` -- `QuizQuestion`, `lectureQuizQuestionsQueryKey` (under `["lectures", id]`, så jobbvakten oppdaterer), `fetchLectureQuizQuestions`, `answerCurrent`, `advance`, `quizAdapter`.
- `frontend/modules/practice/components/{answer-grid,session-panel,shortcut-hints}.tsx` -- `adapter.itemLabel`, `adapter.repeats`, `quizHints`.
- `frontend/modules/practice/pages/flashcard-session-page.tsx` -- mønsteret for scope, lagring, `end`, `SideMenu`, tastebindinger og resultat; ikke endret utover adapterfeltene.
- `frontend/components/ui/radio-group.tsx` -- Radix-gruppen; `quiz-option` bruker `RadioGroupPrimitive.Item` direkte med egen stil.
- `frontend/components/source-link.tsx`, `frontend/modules/subjects/components/subject-dot.tsx` -- forklaringskortet.
- `frontend/components/shortcuts-dialog.tsx` -- gruppen «Quiz».
- `frontend/modules/generation/components/quiz-row.tsx` -- `onPractice`.
- `frontend/app/(app)/forelesninger/[lectureId]/flashcards/page.tsx` -- mønster for ny `quiz/page.tsx`.
- `frontend/e2e/quiz.spec.ts` -- hjelperne `newLecture`, `uploadDefinitions`, `quizRow`, `tabTo`, axe.

## Tasks & Acceptance

**Execution:**
- `backend/app/modules/content/{schemas,service,router}.py` -- schema, spørring og rute -- FR-32, AR-15.
- `backend/tests/test_quiz_questions.py` (ny), `backend/tests/test_practice_sessions.py` -- felt, rekkefølge, fasit, tom liste, 404, 401, quizøkt lagres.
- `frontend/modules/practice/{types,api,session,adapter}.ts` + tester -- data, rene funksjoner, adapter.
- `frontend/modules/practice/components/{answer-grid,session-panel,shortcut-hints}.tsx` + tester -- adapterfeltene og quizhintene.
- `frontend/modules/practice/components/{quiz-option,explanation-card,quiz-question}.tsx` + tester -- alternativene, forklaringen, spørsmålsvisningen med status og bunnlinje.
- `frontend/modules/practice/pages/quiz-session-page.tsx` + test, `frontend/app/(app)/forelesninger/[lectureId]/quiz/page.tsx` -- økten.
- `frontend/components/shortcuts-dialog.tsx` + test, `frontend/modules/generation/components/quiz-row.tsx`, `frontend/modules/subjects/lecture-page.test.tsx` -- dialog og «Øv nå».
- `frontend/e2e/quiz-okt.spec.ts` (ny) -- hele økten med bare tastatur, axe før og etter bekreftelse, lagring sendt én gang.

**Acceptance Criteria:**
- Given en forelesning med 5 quizspørsmål, when studenten trykker «Øv nå» på Quiz-raden, then quizøkten viser «Quiz», forelesningens navn, «1 / 5», «0 riktige · 0 feil», svarrutenettet, «SPØRSMÅL 1 AV 5» og fire alternativer A–D, uten forklaring.
- Given et valgt alternativ, when hun bekrefter, then er gruppen låst, riktig har «✓ Riktig svar», feil valgt har «✗ Ditt svar», forklaringskortet viser kilden, statusområdet sier «Du svarte C. Svaret er bekreftet.» og «Feil. Riktig svar er B.», fokus står på «Neste spørsmål», og ruten leses «Spørsmål 1: feil».
- Given hurtigtaster på, when hun bruker A–D, Enter og Esc, then velger, bekrefter, går videre og avslutter tastene som beskrevet; uten hurtigtaster virker Tab, piltaster, Mellomrom og Enter.
- Given siste spørsmål bekreftet, when hun trykker «Se resultatet» eller Enter, then sendes økten én gang med `kind="quiz"`, `aborted=false`, og resultatet viser «QUIZ FERDIG» og «N av 5 riktige».

## Spec Change Log

## Review Triage Log

## Design Notes

Tidslinje i én økt: `answerCurrent` ved bekreftelse (panelet oppdateres, ruten får ✗/✓ og beholder brand-kanten), `advance` ved «Neste spørsmål». Siste `advance` tømmer køen → `isFinished` → `finish()` og resultat. Uten `repeats=false` ville `repeatingLeft` vist «Repeterer: 1 kort igjen» mellom bekreftelse og neste på siste spørsmål.

Bokstaven: `"ABCD"[index]`. Statustekst: `Du svarte ${letter}. Svaret er bekreftet.` + (`riktig ? " Riktig." : \` Feil. Riktig svar er ${correctLetter}.\``).

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alt grønt
- `cd frontend && npm run test && npx tsc --noEmit && npm run lint` -- expected: alt grønt
- `cd frontend && npx playwright test` mot `docker compose up --build` -- expected: alt grønt
