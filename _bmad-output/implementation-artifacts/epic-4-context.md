# Epic 4 Context: Ta quiz

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let the student generate multiple-choice quiz questions from a lecture with a chosen scope and difficulty, answer each question and confirm before the correct answer and explanation appear, see the score and wrong answers afterwards, take a quiz on a whole subject, and delete bad questions during the quiz. The epic adds no new engines: quiz plugs into the generation pipeline (`generation`) and the practice frame (`practice`) built in epic 3. Everything works in demo mode with no keys or internet; epics 1–4 form the core flow for the 27.11 milestone.

## Stories

- Story 4.1: Lag quizspørsmål fra en forelesning
- Story 4.2: Ta quiz på en forelesning
- Story 4.3: Se poengsum og feilsvar etter quizen
- Story 4.4: Ta quiz på hele emnet
- Story 4.5: Slett et dårlig spørsmål under quizen

## Requirements & Constraints

- **Question shape:** four options, exactly one correct, correct position varies across questions; explanation and source (file + PDF page) on every question. Only material from the lecture's pages. New questions are appended, never replace. Questions cannot be edited, only deleted (with confirmation).
- **Scope/difficulty:** `requested` 10, 20 or 30 (as flashcards); `difficulty` `easy`/`medium`/`hard`. Invalid values → error in the shared `core/errors` format.
- **Mock rule (deterministic, same file → same questions):** one question per definition sentence («X er …»/«X is …»): «Hva er [begrep]?», rest of the sentence as correct answer, the definitions (rest of sentence) of the next three terms in the lecture in reading order, wrapping to the start, as distractors; explanation = whole definition sentence; source = that page. Same rule regardless of difficulty; selection/truncation as flashcards. «+ Lag flere» skips questions whose question text already exists in the lecture. Fewer than four definition sentences → nothing stored, `created=0`, «fewer than requested» message for 0 of N with the word «spørsmål».
- **Validation:** discard unless exactly four options, none empty or duplicated (ignoring whitespace and case), correct is exactly one of them, question and explanation non-empty, and the page exists in the file. Discards counted in `discarded`. `LLM_PROVIDER=mock-invalid` must produce invalid quiz items (SK-4).
- **Answer integrity:** answer locked after confirmation; no colour, explanation or correct-answer marking in the page before confirmation (SK-5). A selected but unconfirmed answer does not count as answered.
- **Real-model quality (FR-31, measured in epic 6 SK-15):** options roughly equal length and plausible; correct answer the longest in at most 35 % of a 20-question sample. Here only the prompt is written, plus a unit test that the prompt includes the right difficulty description.
- **Ownership:** another user's lecture, subject or question → `404 NOT_FOUND`.
- **Tests** carry requirement IDs (e.g. `test_fr30_…`, `test_nfr2a_…`, `test_fr35_…`, `test_sk5_…`, `test_fr56_…`, `test_fr36_…`, `test_fr34_…`, `test_fr37_…`). axe zero violations and full keyboard use on every page/dialog/state touched (lecture page Quiz row, «Lag quiz» dialog, quiz before/after confirm, result with/without list, subject page, delete dialog open).

## Technical Decisions

- **Table `quiz_questions`** (migration in 4.1, must work on Postgres and in-memory SQLite): `id` UUID, `file_id` FK `ON DELETE CASCADE`, `page_no`, `formula_flag`, `question`, `options` (list of four texts), `correct_index` (0–3), `explanation`, `created_at`. Owned by `content`; loose model owned by `generation`.
- **Registry entry:** `kind='quiz'` registers mock rule, loose model, `validate_item` and persistence. Reuses the job flow, `POST /api/lectures/{id}/jobs` `{kind:'quiz', params:{requested, difficulty}}` → `202`, `409 JOB_ALREADY_RUNNING`, the 3-minute timeout, all-or-nothing save and `GET /api/jobs/active` with no quiz-specific job code.
- **Deterministic option shuffle at save time:** shuffle once in the save transaction, seed derived from question + option text with a stable hash (e.g. SHA-256, never Python `hash()`); `correct_index` points to the correct option after shuffling. Frontend shows options in stored order as A–D.
- **Prompt file:** quiz instructions as a text file next to the flashcards prompt: pages only, bokmål with English term in parentheses, four options with exactly one correct, explanation, page number, the chosen difficulty's description («Kjenne igjen en definisjon» / «Forstå sammenhenger» / «Bruke stoffet på et eksempel»), equal-length plausible options.
- **API:** `GET /api/lectures/{id}/quiz-questions` and `GET /api/subjects/{id}/quiz-questions` return `question`, `options`, `correct_index`, `explanation`, `source: {file_id, file_name, page_no}` and lecture name, styled like the flashcards API. The answer key is sent deliberately (app runs locally) and shown only after confirmation. `DELETE /api/quiz-questions/{id}` → `204`; while a job runs on the lecture, same rule as flashcard delete in epic 3.
- **Delete preview:** quiz registers in the `content` counting registry; file/replace/lecture/subject/account deletes count and cascade quiz questions.
- **Session saving:** reuse `POST /api/practice-sessions` with `kind='quiz'`, `answered` = confirmed answers, `correct`, `wrong = answered − correct`, `partial = 0`, `aborted` when not completed, same triggers as epic 3 (finish, «Avslutt økt»/Esc, navigation, logout, `pagehide`). Nothing stored without a confirmed answer. Subject quiz: `lecture_id` empty.

## UX & Interaction Patterns

- **Quiz row on 04 (`create-row`):** no questions «Ingen ennå» + «Lag quiz»; with questions «15 spørsmål», «Øv nå», «+ Lag flere»; disabled without files or while another job runs (with reason). While running, `job-status` «Lager quizspørsmål …» / «Du kan bruke resten av appen imens.»; other rows show «Venter til quizspørsmålene er ferdige». Failure: «Vi klarte ikke å lage quizspørsmålene. Ingenting er lagret. Prøv igjen.» + «Prøv igjen» (same choices). Fewer: «Det ble laget 12 av inntil 20 spørsmål. Notatene ga ikke grunnlag for flere.»
- **Dialog «Lag quiz» (06), 720 px:** lecture with file/page counts, «Nye spørsmål legges til de 15 du har fra før.», scope choice cards «Rask / Inntil 10 spørsmål», «Vanlig / Inntil 20 spørsmål», «Dyp / Inntil 30 spørsmål» (reuse flashcards scope picker), difficulty rows «Lett», «Middels», «Vanskelig» with descriptions; «Vanlig» and «Middels» preselected, arrows move within each group; «Tar vanligvis under to minutter.», «Avbryt» / «Lag quiz»; Esc closes, focus returns.
- **Quiz session (09):** practice frame with panel «Quiz» + lecture name (subject: «Markedsføring, hele emnet»), counter «4 / 15», progress bar, «3 riktige · 1 feil», answer grid (cell read as «Spørsmål 4: feil»), legend «Riktig», «Feil», «Ikke besvart ennå», «Avslutt økt». Random order, each once. «SPØRSMÅL 4 AV 15», four `quiz-option` (62 px, A–D, radio group), «Bekreft svar» disabled until a choice; choice changeable until confirmed.
- **After confirm:** options locked; correct gets green tone + «✓ Riktig svar», wrong chosen red + «✗ Ditt svar» (text/symbol, not colour only); `explanation-card` with explanation, `source-link` («merkevare-notater.pdf, side 7») and lecture; live region «Du svarte C. Svaret er bekreftet.» then «Riktig.» / «Feil. Riktig svar er B.»; focus to «Neste spørsmål» (last question: «Se resultatet»).
- **Shortcuts:** `A`–`D` (any case) choose before confirm, Enter confirm, Enter next; Esc ends. `A`–`D` inert after confirm or with a dialog open. Enter on another focused button does only that button; Enter with no choice does nothing; a held (repeated) Enter must not confirm and advance in one press. Hint line «A–D velg svar», «Enter bekreft svar» / «Enter neste spørsmål», «Esc avslutt»; shortcut dialog lists quiz keys.
- **Result (10):** «QUIZ FERDIG», «11 av 15 riktige»; aborted «Avbrutt etter 12 av 20» scored on answered; panel «✓ Økten er ferdig og lagret» announced. «Ta quizen igjen» (primary, Enter; new `session_id`, refetch, new order) and back to where it started (Esc; subject: «Tilbake til emnet»). Cuttable: subtitle «… · her er de 4 du svarte feil på, med riktig svar og kilde» and `missed-list` with number, question, source, «✗ Ditt svar», «✓ Riktig svar», explanation; all correct → no list, subtitle shows scope only.
- **Subject page 03:** Quiz row in «Øv på hele emnet» under flashcards with question count and «Start ›»; hidden when none.
- **Delete during quiz:** «Slett» always in the footer (before and after confirm), no «Rediger»; shared confirmation, «Avbryt» focused, Esc/Avbryt return focus to «Slett». Delete text example: «Dette sletter også 18 flashcards, 11 quizspørsmål og 2 modellkort laget fra fila. Det kan ikke angres.» Unconfirmed question deleted → leaves counter and grid, next question shown (last one → result if anything answered, else back). Confirmed question deleted → answer still counts in score and list.

## Cross-Story Dependencies

- 4.1 builds the table, registry entry, mock/validation, shuffle, prompt, Quiz row, «Lag quiz» dialog and delete-preview registration; 4.2–4.5 depend on it.
- 4.2 builds the quiz adapter for the practice frame, `quiz-option`, `explanation-card`, shortcuts and session saving; 4.3 adds the result page; 4.4 reuses 4.2–4.3 for subject sessions; 4.5 adds delete in the session.
- Relies on epic 3: generation registry/pipeline/jobs, `create-row`, `job-status`, polling hook, scope choice cards, `session-panel` with per-type adapter, answer grid, result summary, `missed-list`, `source-link`, shortcut function and dialog, `practice_sessions`, `practice-all-card`, and E22 delete-in-session rule. Relies on epic 2 for `file_pages`, shared dialog and delete confirmation.
- Later: epic 5 counts quiz in «øvd» and lecture table; epic 6 adds the real model, final quiz prompt and SK-15 measurement, and `formula_flag` rules.
