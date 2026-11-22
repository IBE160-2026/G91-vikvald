---
title: 'Story 4.2: Ta quiz på en forelesning'
type: 'feature'
created: '2026-11-22'
baseline_revision: 'f1f30da439c374308507ac8b8558a04c79c87653'
status: 'done'
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

### 2026-11-22 — Review pass
- verdicts: 26 findings — high 0, medium 1, low 18, false 7, maybe-false 0
- findings:
  - `[low]` `[patch]` (verification-gap) `setSelected(null)` in `next()` is not pinned by a test; a carried-over choice would let Enter confirm an answer never chosen — added «FR-34: neste spørsmål starter uten valg …» (no radio checked, «Bekreft svar» disabled, Enter leaves the status empty).
  - `[low]` `[reject]` (intent) FR-34 shuffle is stubbed in the page test and never observed — `shuffle` is covered by `session.test.ts` since story 3.3 and the page calls the same function; a random-order assertion would be flaky.
  - `[low]` `[reject]` (intent) Enter on another button («Avslutt økt») is not tested on the quiz page — the rule is the unchanged `resolveShortcut` (CONTROL check), covered by `practice-shortcuts.test.tsx` since story 3.4; the quiz adds no exception.
  - `[low]` `[reject]` (intent) A–D while a dialog is open is not tested for quiz — same shared `dialogOpen` rule in `resolveShortcut`, covered since story 3.4.
  - `[low]` `[patch]` (intent) result tests labelled FR-36 belong to story 4.3 — relabelled FR-56/UX-DR33 and FR-34/FR-56. The minimal result itself is a recorded boundary choice (kanttilfelle).
  - `[low]` `[reject]` (intent) hint «Enter se resultatet» on the last question is not an approved text — it reuses the approved button text «Se resultatet» in the hint form the story uses; recorded as a kanttilfelle.
  - `[low]` `[reject]` (intent) logout and `pagehide` saving are not tested for quiz — `useSessionSaver` is unchanged and covered by `use-session-saver.test.tsx`; the quiz passes only a different snapshot, and unmount saving is tested on the quiz page.
  - `[false]` `[reject]` (blind) KI trail and session log missing — written later in the same session before the PR (story prompt steps 5–6).
  - `[false]` `[reject]` (blind) spec review sections empty while in-review — they are filled by this step; the spec is committed at finalize.
  - `[low]` `[patch]` (blind) option accessible name can run together («AEt navn») — inserted `{" "}` text nodes between letter, text and result label.
  - `[low]` `[reject]` (blind) the shortcut dialog lists «Enter Øv igjen» on the quiz result, where Enter does nothing yet — the generic «Resultat» group becomes true when story 4.3 adds «Ta quizen igjen»; a temporary per-page dialog adds surface for days.
  - `[low]` `[reject]` (blind) blank loading state — same pre-existing pattern as the flashcard session since story 3.3.
  - `[false]` `[reject]` (blind) nothing guarantees four options — every stored question passed `validate_item` (exactly four options, `correct_index` 0–3, story 4.1) and the DB has a CHECK on `correct_index`; no path writes other rows.
  - `[false]` `[reject]` (blind) backend lacks a quiz counts check — `PracticeSessionIn.counts_add_up` rejects `partial != 0` for non-freetext and requires `correct + partial + wrong == answered`.
  - `[low]` `[patch]` (blind) session-panel test name says «1 feil» but asserts «2 feil» — name fixed.
  - `[low]` `[patch]` (blind) FR-36/A15 IDs — FR-36 relabelled (same as intent row); A15 kept, it is the EXPERIENCE.md empty-state rule also used by the flashcard tests.
  - `[low]` `[reject]` (blind) e2e helpers duplicated — every e2e spec in the repo defines its own helpers (pre-existing pattern); moving them is a separate refactor.
  - `[low]` `[patch]` (blind) comment «copied once from the first answer» — now «from the first fetch made after the page opened».
  - `[low]` `[patch]` (blind) unchecked `_start_quiz(client, other)` in a backend test — asserts 202 now.
  - `[low]` `[reject]` (blind) aborted result hides the score — the result content belongs to story 4.3 («poengsummen gjelder de besvarte»).
  - `[low]` `[reject]` (blind) no test for Esc on the result with shortcuts off, or for a refetch during a quiz — Esc is not a single key (always on, tested in 3.4); the refetch guard is the same `session === null` lock as flashcards.
  - `[low]` `[reject]` (edge) cached questions plus a failed refetch start a session on stale data — same `isFetchedAfterMount` pattern as the flashcard session (pre-existing); needs a cache from an earlier visit and a failing server.
  - `[medium]` `[patch]` (edge) Esc/«Avslutt økt» after the last question is confirmed saved a fully answered quiz as aborted («Avbrutt etter 5 av 5») — `end()` now finishes the quiz when every question is answered; new test checks `aborted=false` and «2 av 3 riktige».
  - `[false]` `[reject]` (edge) fewer than four options lets «d» pick a missing option — unreachable, see the four-options row.
  - `[false]` `[reject]` (edge) schema does not bound options/correct_index — same as the blind four-options row.
  - `[false]` `[reject]` (edge) letters can be `undefined` — `selected` only comes from the four rendered options and `correct_index` is 0–3 by validation and CHECK.
- own check after the pass (screenshots against mockup 09): `[low]` `[patch]` the correct option's text was regular weight; the mockup shows 600 — `font-semibold` on the correct option's text.

## Design Notes

Tidslinje i én økt: `answerCurrent` ved bekreftelse (panelet oppdateres, ruten får ✗/✓ og beholder brand-kanten), `advance` ved «Neste spørsmål». Siste `advance` tømmer køen → `isFinished` → `finish()` og resultat. Uten `repeats=false` ville `repeatingLeft` vist «Repeterer: 1 kort igjen» mellom bekreftelse og neste på siste spørsmål.

Bokstaven: `"ABCD"[index]`. Statustekst: `Du svarte ${letter}. Svaret er bekreftet.` + (`riktig ? " Riktig." : \` Feil. Riktig svar er ${correctLetter}.\``).

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alt grønt
- `cd frontend && npm run test && npx tsc --noEmit && npm run lint` -- expected: alt grønt
- `cd frontend && npx playwright test` mot `docker compose up --build` -- expected: alt grønt

## Auto Run Result

Status: done

**Summary:** The student can take a quiz on one lecture. The backend has `GET /api/lectures/{id}/quiz-questions` (answer key, explanation, source and lecture; 404 for someone else's lecture). The frontend quiz session at `/forelesninger/<id>/quiz` reuses the practice frame: session panel and answer grid through a new `quizAdapter`, two new pure functions (`answerCurrent`, `advance`), the shared shortcuts and `useSessionSaver` with `kind="quiz"`. New components: `quiz-option`, `explanation-card` and `quiz-question`. «Øv nå» on the Quiz row is active. After the last question a minimal result («QUIZ FERDIG», «N av M riktige» / «Avbrutt etter A av N», «Tilbake til forelesningen») is shown; the rest of the result is story 4.3.

**Files changed:**
- `backend/app/modules/content/{schemas,service,router}.py` -- `QuizQuestionOut`, `lecture_quiz_questions`, the route.
- `backend/tests/test_quiz_questions.py` (new), `backend/tests/test_practice_sessions.py` -- API tests and a saved quiz session.
- `frontend/modules/practice/{types,api,session,adapter}.ts` -- data, fetch, `answerCurrent`/`advance`, `quizAdapter` (`itemLabel`, `repeats`).
- `frontend/modules/practice/components/{answer-grid,session-panel,shortcut-hints}.tsx` -- adapter fields, quiz hints.
- `frontend/modules/practice/components/{quiz-option,explanation-card,quiz-question}.tsx` (new) -- the question view.
- `frontend/modules/practice/pages/quiz-session-page.tsx` (new), `frontend/app/(app)/forelesninger/[lectureId]/quiz/page.tsx` (new) -- the session and route.
- `frontend/components/shortcuts-dialog.tsx`, `frontend/modules/generation/components/quiz-row.tsx` -- «Quiz» group, «Øv nå».
- `frontend/e2e/quiz-okt.spec.ts` (new), `frontend/e2e/quiz.spec.ts`, plus unit tests next to each file.

**Review:** 26 findings: 9 patched (1 medium: Esc after the last confirmed answer saved a complete quiz as aborted; 8 low), 0 deferred, 17 rejected with reasons in the triage log. One own low finding from the screenshots patched (bold correct option).

**Follow-up review recommended:** false (no high patched, one medium patched and covered by a new test).

**Verification:** `uv run pytest` 530 passed; `npm run test` 754 passed (66 files); `npx tsc --noEmit` clean; `npx playwright test` 137 passed against `docker compose up --build`. `npm run lint` does not exist in `package.json` (the spec's command was wrong); `npx next build` passed in the implementation run.

**Residual risks:** the result view is deliberately minimal until story 4.3; the shortcut dialog's «Resultat» group lists «Enter Øv igjen», which does nothing on the quiz result until 4.3 adds «Ta quizen igjen».
