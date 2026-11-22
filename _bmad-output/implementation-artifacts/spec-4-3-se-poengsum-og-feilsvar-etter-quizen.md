---
title: 'Story 4.3: Se poengsum og feilsvar etter quizen'
type: 'feature'
created: '2026-11-22'
baseline_revision: '3977bc830d1ba87f0ce911f434594866f4a4cbb0'
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

**Problem:** Etter quizen fra story 4.2 viser appen bare en enkel resultatvisning (#206): ingen «Ta quizen igjen», Enter gjør ingenting (#212), og studenten ser ikke hvilke spørsmål hun svarte feil på. Story 4.3 i `epics.md` (FR-36, AR-17, UX-DR8, UX-DR32–35) krever resultatsiden fra skisse 10.

**Approach:** Bytt den enkle visningen i `quiz-session-page.tsx` med resultatsiden fra skisse 10, bygd på de eksisterende komponentene `result-summary` og `missed-list` fra øktrammen (utvidet med en quizvariant, ikke kopiert). Siden husker hvilket alternativ studenten valgte på hvert spørsmål, slik at lista kan vise «✗ Ditt svar» og «✓ Riktig svar». «Ta quizen igjen» starter en ny økt med ny `session_id`, henter spørsmålene på nytt og blander dem.

## Boundaries & Constraints

**Always:**
- **`result-summary` (`kind="quiz"`):** overlinjen «QUIZ FERDIG» (også ved avbrutt, som #171 for flashcards), h2 i `text-result-title` med fokus (`tabIndex=-1`): ferdig «11 av 15 riktige», avbrutt «Avbrutt etter 12 av 20». Undertittel: omfanget (forelesningens navn); med minst ett feilsvar « · her er de 4 du svarte feil på, med riktig svar og kilde» (ett feilsvar: « · her er den ene du svarte feil på, med riktig svar og kilde»). Avbrutt: poengsummen for de besvarte står i undertittelen etter omfanget, « · 9 av 12 riktige». Ingen felt-kort med «Kunne»/prosent for quiz (skisse 10 har det ikke). Flashcards-varianten er uendret.
- **`missed-list` (`kind="quiz"`):** ingen overskrift (skisse 10, undertittelen forklarer lista), ett hvitt kort (`rounded.lg`, `border-card`, `lift`) med én rad per feilsvar i rutenettets rekkefølge: nummeret i økten i en 31 px boks med kant (skjult «Spørsmål »), spørsmålet (16 px, 600), kilden (`SourceLink`) til høyre, så «✗ Ditt svar» (`danger`, 600) med valgt tekst, «✓ Riktig svar» (`success`, 600) med riktig tekst (600), og forklaringen (`text-meta`, dempet). Symbolene er `aria-hidden`. Flashcards-varianten er uendret.
- **Valgt svar:** økten (`Session` i `quiz-session-page.tsx`) får `answers: Record<id, index>`, satt ved bekreftelse (første gjelder). Lista bygges fra `gridCells` (mark `missed`) + `answers`.
- **Knapper og taster (skisse 10):** bunnlinje med hint-linja til venstre (bare med hurtigtaster på): «Enter ta quizen igjen», «Esc tilbake til forelesningen»; til høyre omrisslenken «Tilbake til forelesningen» og hovedknappen «Ta quizen igjen». Enter = ta quizen igjen (ikke når en annen knapp/lenke har fokus, regelen i `resolveShortcut`; holdt Enter ignoreres), Esc = tilbake.
- **Ta quizen igjen:** `questions.refetch()`; nye data (feiler hentingen: spørsmålene fra økten) → `saver.restart()` (ny `session_id`), ny økt med `shuffle`, `answers` tom, `aborted=false`, valg null, fokus til første spørsmåls h2. Tom liste → tomtilstanden «Det finnes ingen quizspørsmål her ennå.». Dobbelttrykk mens hentingen pågår starter bare én økt.
- **Øktpanelet:** som i dag (fullt, «✓ Økten er ferdig og lagret» når ferdig og lagret). Det levende området på siden sier «Økten er ferdig og lagret» når økten er ferdig og lagret, ellers «Økten er ferdig» når ferdig.
- **Hurtigtastdialogen:** gruppen «Resultat» viser «Enter» «Øv igjen / Ta quizen igjen» (teksten fra EXPERIENCE.md, tastetabellen). Lukker #212.
- Lagring, reservetekst ved feilet lagring og fokus på tittelen som i 4.2. Testnavn med krav-ID (`test_fr36_…`/«FR-36: …»). axe uten brudd med og uten liste; alt med bare tastatur.

**Never:** Ingen quiz på hele emnet eller «Tilbake til emnet» (4.4), ingen «Slett» (4.5). Ingen ny pakke, ingen backendendring, ingen endring i `resolveShortcut`, flashcards-resultatet eller brukerreisetestene i `e2e/brukerreiser/`. Ingen kall til Gemini. Ingen endring i `CLAUDE.md`, planleggingsdokumentene eller `.claude/settings.json`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ferdig med feil | 3 spørsmål, 1 feil (valgte A, riktig B) | «QUIZ FERDIG», «2 av 3 riktige», «Uke 37 · her er den ene du svarte feil på, med riktig svar og kilde», én rad med «Ditt svar» Svar A, «Riktig svar» Svar B, forklaring | — |
| Alle riktige | 3 av 3 | «3 av 3 riktige», undertittel bare omfanget, ingen liste | — |
| Avbrutt | 2 bekreftet av 3, ett feil | «Avbrutt etter 2 av 3», «Uke 37 · 1 av 2 riktige · her er den ene …», én rad | lagring feiler → reservetekst |
| Ta quizen igjen | resultat vist | ny POST-id ved neste lagring, ny henting av spørsmål, «SPØRSMÅL 1 AV n», panel nullstilt | henting feiler → økt med forrige spørsmål |
| Enter på lenken | fokus på «Tilbake til forelesningen» | bare lenken følges | — |

</intent-contract>

## Code Map

- `frontend/modules/practice/pages/quiz-session-page.tsx` -- `Session`, `newSession`, `confirm`, `QuizResult` (erstattes), `quizResultTitle`, bindingene for resultatet, levende område.
- `frontend/modules/practice/pages/flashcard-session-page.tsx` -- mønster: `playAgain` (l. 272), `ResultView` med `MissedList` fra `gridCells` (l. 475–530). Ikke endret.
- `frontend/modules/practice/components/result-summary.tsx` -- `ResultSummary`, `resultTitle`; legg til `kind="quiz"`-varianten.
- `frontend/modules/practice/components/missed-list.tsx` -- `MissedList`, `MissedItem`; legg til quizvarianten.
- `frontend/modules/practice/components/answer-grid.tsx` -- `MarkIcon`, `MARK_CLASSES` (✓/✗-ikoner).
- `frontend/modules/practice/components/shortcut-hints.tsx` -- `quizResultHints` byttes med hint for «ta quizen igjen».
- `frontend/components/shortcuts-dialog.tsx` (+ test l. 57–58) -- «Resultat»-gruppen.
- `frontend/modules/practice/use-session-saver.ts` -- `restart()` gir ny id.
- `frontend/e2e/quiz-okt.spec.ts` -- hjelpere og eksisterende forventninger til resultatet (oppdateres ved behov).

## Tasks & Acceptance

**Execution:**
- `frontend/modules/practice/components/result-summary.tsx` + test -- quizvarianten med undertittel og uten felt -- FR-36, UX-DR34.
- `frontend/modules/practice/components/missed-list.tsx` + test -- quizvarianten med svar og forklaring -- FR-36, UX-DR35.
- `frontend/modules/practice/components/shortcut-hints.tsx` + test -- quizresultatets hint.
- `frontend/modules/practice/pages/quiz-session-page.tsx` + test -- `answers`, resultatsiden, «Ta quizen igjen», Enter, levende område -- FR-36, UX-DR32, UX-DR33.
- `frontend/components/shortcuts-dialog.tsx` + test -- «Øv igjen / Ta quizen igjen».
- `frontend/e2e/quiz-resultat.spec.ts` (ny) -- resultat med og uten liste, axe, bare tastatur, Enter tar quizen igjen med ny `session_id`.

**Acceptance Criteria:**
- Given en ferdig quiz med feilsvar, when resultatet vises, then står «QUIZ FERDIG», «N av M riktige», undertittelen med antall feil, og lista med nummer, spørsmål, kilde, «✗ Ditt svar», «✓ Riktig svar» og forklaring; panelet viser «✓ Økten er ferdig og lagret».
- Given resultatet, when hun trykker Enter (eller «Ta quizen igjen»), then hentes spørsmålene på nytt, en ny økt starter på «SPØRSMÅL 1 AV M», og neste lagring har en annen `session_id`.
- Given resultatet, when hun trykker Esc eller «Tilbake til forelesningen», then er hun på forelesningssiden.
- Given resultatet med og uten liste, when axe kjøres i 1280 og 768 px, then finnes ingen brudd.

## Spec Change Log

## Review Triage Log

### 2026-11-22 — Review pass
- verdicts: 31 findings — high 0, medium 0, low 22, false 9, maybe-false 0
- findings:
  - `[low]` `[reject]` (blind) «Ta quizen igjen» while the first save is still in flight hides a later save failure (restart bumps the saver generation) — same pattern as the flashcard «Øv igjen» since story 3.5; needs a press within the save's few milliseconds and a failing server; a fix adds waiting/disabled state.
  - `[low]` `[reject]` (blind) the save-failure alert disappears after restart — she has seen it on the result page; a new session starts with a clean status, as for flashcards.
  - `[low]` `[reject]` (blind) Esc during the refetch, then restart runs after leaving — after unmount React ignores the state updates, and the saver has already sent (or had nothing to send); a fresh session with 0 answers never sends. Harmless; a guard adds a mounted ref.
  - `[low]` `[reject]` (blind) no busy state on «Ta quizen igjen» — the fetch is local (the app runs on the student's machine) and takes milliseconds; a busy state adds surface.
  - `[low]` `[reject]` (blind) the failed-refetch test cannot tell `own` from stale cached data — both hold the same questions, and both paths give the right result; tightening needs a different question set in the cache.
  - `[false]` `[reject]` (blind) Enter on the focused «Ta quizen igjen» button could run playAgain twice — `resolveShortcut` ignores Enter on controls (tested since story 3.4), and the ref guards a second call anyway.
  - `[low]` `[reject]` (blind) the quiz missed-list has no accessible name — a plain list is valid (axe passes), and the subtitle right above says what it is; linking needs an id passed between two components.
  - `[low]` `[patch]` (blind) «Ditt svar»/«Riktig svar» are loose paragraphs — now a `<dl>` with `<dt>`/`<dd>`, same look.
  - `[false]` `[reject]` (blind) a missing chosen answer shows an empty «Ditt svar» — every confirmed question stores its choice in `confirm()`, the only place a «missed» mark is set; an empty explanation is impossible (`validate_item`, story 4.1).
  - `[low]` `[patch]` (blind) the `quizResultTitle` re-export from the page exists only for a duplicate test — re-export and duplicate test removed.
  - `[low]` `[reject]` (blind) the live region may announce twice («ferdig», then «ferdig og lagret») — both texts are true when said, and the second is what the story asks to be read; the failed-save case keeps «Økten er ferdig» next to the alert, as intended.
  - `[false]` `[reject]` (blind) KI trail, sprint status, spec and screenshots missing from the diff — done later in the same run before the PR; `frontend/e2e-skjermbilder/` is a leftover folder that must not be committed.
  - `[low]` `[reject]` (edge) Esc/route change during refetch — same as the blind row above.
  - `[low]` `[reject]` (edge) no pending state on the button — same as the blind row above.
  - `[false]` `[reject]` (edge) an empty refetch lands on the empty state — that is the spec's chosen behaviour («Tom liste → tomtilstanden»): the lecture has no questions any more.
  - `[false]` `[reject]` (edge) fewer than four options — unreachable: validation (4.1) stores exactly four, with a DB CHECK on `correct_index`.
  - `[false]` `[reject]` (edge) missed cell without an answer — same as the blind row above.
  - `[low]` `[reject]` (edge) aborted sessions never announce «lagret» — the panel shows «lagret» only for finished sessions (story 3.5 rule, also for flashcards); the spec keeps that.
  - `[low]` `[reject]` (edge) double announcement — same as the blind row above.
  - `[false]` `[reject]` (edge) Enter on the focused button runs twice — same as the blind row above.
  - `[false]` `[reject]` (edge) e2e `% 4` with fewer options — unreachable, same as above.
  - `[low]` `[reject]` (edge) e2e heading text could differ from the API text — the mock questions have no extra whitespace or markup and the test passes; a trim would hide a real mismatch.
  - `[low]` `[reject]` (intent) no test that the new order is random — `shuffle` is covered in `session.test.ts` and called by `newSession`; a random-order assertion would be flaky.
  - `[low]` `[reject]` (intent) new `session_id` checked only in the request, not in the database — backend unchanged; the backend tests since 3.5 store one row per `session_id`.
  - `[low]` `[reject]` (intent) the panel itself is not changed and its «lagret» text has no new test — it already worked since 3.5 and is checked by the quiz e2e test.
  - `[low]` `[reject]` (intent) quiz variants are separate branches inside the shared components (C2) — the story asks to reuse the components; mockup 10 has a different summary (no fields) and rows (answers), so a shared layout would not match.
  - `[low]` `[reject]` (intent) test names use «FR-36: …» not `test_fr36_…` — that is the repo's frontend convention for requirement IDs; there is no backend code in this story.
  - `[low]` `[reject]` (intent) refetch fallback without notice — recorded choice in the spec, logged as a kanttilfelle.
  - `[low]` `[reject]` (intent) «hele emnet» scope not covered — story 4.4.
  - `[low]` `[reject]` (intent) aborted score placed in the subtitle — recorded choice in the spec, logged as a kanttilfelle.
  - `[false]` `[reject]` (verification-gap) no gaps reported — nothing to triage.
- own check after the pass (screenshots against mockup 10): matches; title uses the DESIGN.md `result-title` token (40 px) where the mockup draws 32 px, as the 4.2 result did.

## Design Notes

Undertittel: `[scope, aborted ? \`${correct} av ${answered} riktige\` : null, wrong === 1 ? "her er den ene du svarte feil på, med riktig svar og kilde" : wrong > 1 ? \`her er de ${wrong} du svarte feil på, med riktig svar og kilde\` : null].filter(Boolean).join(" · ")`.

«Ta quizen igjen» er asynkron (henting først). En `ref` hindrer at to trykk starter to økter.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alt grønt
- `cd frontend && npm run test && npx tsc --noEmit` -- expected: alt grønt
- `cd frontend && npx playwright test` mot `docker compose up --build` -- expected: alt grønt

## Auto Run Result

Status: done

**Summary:** The quiz result page from mockup 10 replaces the simple view from 4.2. `result-summary` and `missed-list` get a quiz variant (`kind="quiz"`): «QUIZ FERDIG», «N av M riktige» / «Avbrutt etter A av N» with the score for the answered questions in the subtitle, the subtitle with the number of wrong answers, and a list with number, question, source, «✗ Ditt svar», «✓ Riktig svar» and the explanation. The page remembers the confirmed option per question. «Ta quizen igjen» (Enter) refetches the questions, restarts the saver (new `session_id`) and starts a new shuffled session. The shortcut dialog's «Resultat» row says «Øv igjen / Ta quizen igjen».

**Files changed:**
- `frontend/modules/practice/components/result-summary.tsx` -- quiz variant, `quizResultTitle`, `quizResultSubtitle`.
- `frontend/modules/practice/components/missed-list.tsx` -- quiz variant with `<dl>` answers.
- `frontend/modules/practice/components/shortcut-hints.tsx` -- «Enter ta quizen igjen».
- `frontend/modules/practice/pages/quiz-session-page.tsx` -- `answers`, the result page, `playAgain`, live region.
- `frontend/components/shortcuts-dialog.tsx` -- «Øv igjen / Ta quizen igjen».
- `frontend/e2e/quiz-resultat.spec.ts` (new) and unit tests next to each file.

**Review:** 31 findings: 2 patched (low), 0 deferred, 29 rejected with reasons in the triage log.

**Follow-up review recommended:** false (no high or medium patched).

**Verification:** `uv run pytest` 530 passed; `npm run test` 768 passed (66 files); `npx tsc --noEmit` clean; `npx playwright test` 139 passed against `docker compose up --build` (a first run had two timeouts in `erstatt.spec.ts`, a file chooser test from story 2.6 not touched here; they passed on rerun, and the full rerun was green).

**Residual risks:** «Ta quizen igjen» pressed during a still-running save can hide a later save failure (same as flashcards).
