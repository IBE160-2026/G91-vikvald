---
title: 'Story 4.1: Lag quizspørsmål fra en forelesning'
type: 'feature'
created: '2026-11-22'
baseline_revision: '4b9ad81d5102d87fe894ccc32ef09759ef00c0ff'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
warnings: ['oversized']
deferred:
  - summary: >-
      A real model may return quiz questions that already exist in the lecture or repeat within one answer, and the pipeline stores them.
    evidence: |-
      existing_keys is only passed to the model as advice; save() does not drop duplicates. Same design as flashcards since story 3.1. Matters when Vertex AI arrives in epic 6.
    location: >-
      backend/app/modules/generation/quiz.py
    severity: low
---

<intent-contract>

## Intent

**Problem:** Studenten kan bare lage flashcards. Hun kan ikke lage flervalgsspørsmål med omfang og vanskelighetsgrad fra en forelesning (story 4.1 i `epics.md`: FR-2, FR-28–FR-31, FR-33, FR-38, FR-39, NFR-2a, AR-3–AR-5, AR-7, AR-15, AR-17, UX-DR18, UX-DR19, UX-DR24, UX-DR42).

**Approach:** Quiz meldes inn som ny `kind` i registeret i `generation` (mock-regel, løs modell, `validate_item`, lagring, instruks), uten et nytt løp. Tabellen `quiz_questions` eies av `content`, som også melder quizspørsmål inn i telleregisteret for sletting. På forelesningssiden får «Lag og øv» en Quiz-rad bygd på den samme radlogikken som Flashcards-raden, og dialogen «Lag flashcards» gjøres generell, slik at «Lag quiz» får omfang og vanskelighetsgrad.

## Boundaries & Constraints

**Always:**
- **Tabell (`content/models.py`, migrering `0008_create_quiz_questions`):** `quiz_questions` med `id` (UUID), `file_id` (FK `files.id` `ON DELETE CASCADE`, indeks), `page_no`, `formula_flag` (false), `question`, `options` (JSON, fire tekster), `correct_index` (0–3, CHECK), `explanation`, `created_at`. Virker på Postgres og SQLite (AR-13).
- **Registeret (`generation/registry.py`):** `ContentType` får `uses_difficulty: bool = False` og `break_item` (regelen `mock-invalid` bruker for typen). `_ensure_builtin_types` importerer også `quiz`. Løpet (`service.py`) endres bare ved at `GenerationOptions` får `difficulty` fra `job.params`.
- **API:** `POST /api/lectures/{id}/jobs` med `{"kind": "quiz", "params": {"requested": 10|20|30, "difficulty": "easy"|"medium"|"hard"}}` → `202`. Mangler `difficulty` for quiz, brukes `medium`. Ugyldig omfang eller vanskelighetsgrad, og `difficulty` for en type uten vanskelighetsgrad (flashcards), gir `422 VALIDATION_ERROR`. `params` lagres uten tomme felt (flashcards fortsatt `{"requested": 20}`). `JobOut` får `params`, så «Prøv igjen» kan bruke samme valg. `409`, tidsgrensen, `GET /api/jobs/active` og eierskap (`404`) gjenbrukes uten egen kode.
- **Mock-regelen (`generation/quiz.py`):** definisjonssetningene med regelen fra `flashcards` (samme `sentences`/`definition_term`), i leserekkefølge, ett begrep én gang (første forekomst, uten hensyn til store/små bokstaver). Færre enn fire → tom liste. Ellers ett spørsmål per definisjon: `question` «Hva er [begrep]?», riktig svar = resten av setningen etter «er»/«is», feilalternativer = svarene til de tre neste begrepene (omstart fra begynnelsen), `correct_index` 0, `explanation` = hele setningen, `file_id`/`page_no` fra siden. Spørsmål med samme tekst (casefold) som i `existing_keys` hoppes over. Uavhengig av vanskelighetsgrad.
- **`validate_item`:** forkaster element som ikke er nøyaktig fire tekster, har tomt alternativ, like alternativer (mellomrom samlet og casefold), `correct_index` som ikke er et heltall 0–3, tomt spørsmål eller forklaring, eller (fil, side) som ikke finnes.
- **Lagring (`content/service.py`):** `add_quiz_questions` blander alternativene én gang med en frø fra SHA-256 av spørsmålet og alternativene (egen Fisher–Yates, ikke `hash()`/`random`), og `correct_index` følger det riktige. Nye legges til de gamle (FR-33). Samme innhold → samme rekkefølge.
- **Instruks:** `generation/prompts/quiz.txt` med plassholderen `{difficulty}`; `quiz.build_prompt(difficulty)` setter inn beskrivelsen: easy «Lett: kjenne igjen en definisjon», medium «Middels: forstå sammenhenger», hard «Vanskelig: bruke stoffet på et eksempel». Teksten: bare stoff fra sidene, bokmål med engelsk fagbegrep i parentes, fire alternativer med nøyaktig ett riktig, forklaring, fil og sidetall, omtrent like lange og troverdige alternativer, ikke gjenta eksisterende spørsmål, høyst så mange som bedt om.
- **Telling:** `content-counts` får `quiz_questions`; telleregisteret får `quiz_questions` etter `flashcards` (innebygd i `content`). Slettevakten gjelder alle jobbtyper, også quiz.
- **Tekster (`modules/generation/texts.ts`):** quiz: «Lager quizspørsmål …», feil «Vi klarte ikke å lage quizspørsmålene. Ingenting er lagret. Prøv igjen.», færre «Det ble laget 12 av inntil 20 spørsmål. Notatene ga ikke grunnlag for flere.», ingenting «Notatene ga ikke grunnlag for spørsmål. Ingenting er lagret.», ferdig «Quizspørsmålene er ferdige: 15 spørsmål i Uke 37: Merkevare.». Ny `waiting`: «Venter til flashcardene er ferdige» / «Venter til quizspørsmålene er ferdige».
- **Radene:** felles `GenerationRow` med logikken fra `FlashcardsRow`; `FlashcardsRow` og `QuizRow` er tynne innpakninger. Når en jobb av en annen type kjører i forelesningen, er raden i `waiting` med den andre typens `waiting`-tekst. Quiz-raden: «Ingen ennå»/«Lag quiz», med spørsmål «15 spørsmål», «Øv nå» (ikke aktiv før story 4.2) og «Lag flere». Radene skilles med `divider`-linje.
- **Dialogen (`scope-dialog.tsx`):** tar `kind`. Quiz: tittel og knapp «Lag quiz», «Nye spørsmål legges til de 15 du har fra før.», omfangskort «Inntil N spørsmål», gruppen «Vanskelighetsgrad» med tre fullbredde rader («Lett» «Kjenne igjen en definisjon», «Middels» «Forstå sammenhenger», «Vanskelig» «Bruke stoffet på et eksempel»); «Vanlig» og «Middels» valgt ved åpning; piltaster innenfor hver gruppe. Flashcards som før.
- Brukerreisene flyt 3 og 4 og `docs/testing/brukerreiser.md` oppdateres bare for den nye teksten (kontoteksten blir «… slettes for godt: flashcards og quizspørsmål.»); ingen test svekkes.
- Testnavn med krav-ID (`test_fr30_…`, `test_nfr2a_…`, «FR-28: …»). axe uten brudd på forelesningssiden med Quiz-raden og dialogen «Lag quiz»; dialogen brukbar med bare tastatur.

**Never:** Ingen quizøkt, «Øv nå»-mål eller resultatside (4.2–4.5). Ingen kall til Gemini. Ingen endring i `CLAUDE.md`, planleggingsdokumentene eller `.claude/settings.json`. Ingen nye pakker.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Testfila | `definisjoner.pdf` (5 definisjoner) | 5 spørsmål, riktig svar ikke på samme plass i alle | — |
| Færre enn fire | 3 definisjonssetninger | `done`, `created=0`, «Notatene ga ikke grunnlag for spørsmål. …» | — |
| Lag flere | samme fil igjen | ingen nye, `created=0` | — |
| `mock-invalid` | 5 definisjoner | 3 av 4 forkastes, `discarded` telles | meldingen «færre» |
| Ugyldig param | `difficulty: "lett"` eller `requested: 15` | `422 VALIDATION_ERROR`, ingen jobb | — |
| Flashcards med difficulty | `{"kind":"flashcards","params":{"difficulty":"easy"}}` | `422` | — |
| Feil/timeout | porten feiler | `failed`, ingenting lagret, «Prøv igjen» med samme valg | — |
| Andres forelesning | quizjobb | `404 NOT_FOUND` | — |
| Sletting under quizjobb | slett fil | `409 JOB_ALREADY_RUNNING` | — |

</intent-contract>

## Code Map

- `backend/app/modules/generation/registry.py` -- `ContentType`, `_ensure_builtin_types` (import `quiz`).
- `backend/app/modules/generation/flashcards.py` -- mønsteret for typen; `sentences`, `definition_term`, `normalise` gjenbrukes; flytt flashcards-delen av `InvalidMockGenerator` hit som `break_item`.
- `backend/app/modules/generation/mock.py` -- `InvalidMockGenerator` kaller `content_type.break_item(item, index)`.
- `backend/app/modules/generation/port.py` -- `GenerationOptions.difficulty`.
- `backend/app/modules/generation/service.py:_generate_and_save` -- sett `difficulty` fra `job.params`.
- `backend/app/modules/generation/schemas.py` -- `JobParams.difficulty`, `JobCreate` modellvalidator, `JobOut.params`.
- `backend/app/modules/generation/router.py:start_job/_job_out` -- `model_dump(exclude_none=True)`, `params` ut.
- `backend/app/modules/content/{models,service,registry,schemas,router}.py` -- `QuizQuestion`, `add_quiz_questions`, `quiz_question_texts`, `quiz_question_count`, `count_quiz_questions`, `ContentCounts.quiz_questions`.
- `backend/alembic/versions/0007_create_practice_sessions.py` -- stil for ny `0008`.
- `backend/tests/test_generation.py`, `test_jobs.py`, `test_migrations.py`, `test_delete.py`, `test_delete_flashcards_counts.py`, `test_account_delete.py` -- hjelpere og påstander som må utvides (`JOB_FIELDS`, `registered_kinds`, `content_kinds`).
- `frontend/modules/generation/{types,api,texts}.ts` -- `JobKind` får `quiz`, `Difficulty`, `params`, `startJob(..., difficulty?)`.
- `frontend/modules/generation/components/flashcards-row.tsx` -- logikken flyttes til `generation-row.tsx`.
- `frontend/modules/generation/components/scope-dialog.tsx` -- generell for `kind`.
- `frontend/components/choice-option.tsx` -- variant `layout="row"` for vanskelighetsradene.
- `frontend/modules/subjects/pages/lecture-page.tsx:222` -- legg til `QuizRow` med skillelinje.
- `frontend/e2e/brukerreiser/flyt-4-avslutter-etter-semesteret.spec.ts`, `frontend/e2e/konto.spec.ts`, `docs/testing/brukerreiser.md` -- ny kontotekst.

## Tasks & Acceptance

**Execution:**
- `backend/alembic/versions/0008_create_quiz_questions.py` + `content/models.py` -- tabellen -- AC 1.
- `backend/app/modules/content/service.py`, `registry.py`, `schemas.py`, `router.py` -- lagring med blanding, tekster for «Lag flere», telling og innmelding -- FR-30, FR-33, AR-7.
- `backend/app/modules/generation/quiz.py` + `prompts/quiz.txt` -- typen og instruksen -- AR-5, FR-28, FR-31.
- `backend/app/modules/generation/{registry,mock,port,service,schemas,router,flashcards}.py` -- vanskelighetsgrad, `break_item`, `params` -- AR-12, SK-4.
- `backend/tests/test_quiz.py` (ny) + oppdaterte tester -- mock-regel, validering, blanding, instruks, HTTP, telling, vakt, kaskade, migrering.
- `frontend/modules/generation/*` -- typer, API, tekster, `generation-row.tsx`, `quiz-row.tsx`, generell `scope-dialog.tsx`, `choice-option.tsx` -- UX-DR18/19/24.
- `frontend/modules/subjects/pages/lecture-page.tsx` -- Quiz-raden.
- Vitest: `scope-dialog.test.tsx`, `texts.test.ts`, `lecture-page.test.tsx` (quiz-rad, venting, dialog). Playwright: `frontend/e2e/quiz.spec.ts` (lag quiz med bare tastatur, axe, sletting viser quizspørsmål). Flyt 4 og `konto.spec.ts` for kontoteksten.

**Acceptance Criteria:**
- Given en forelesning med testfila, when studenten lager quiz «Vanlig»/«Middels», then raden viser «5 spørsmål» og slettebekreftelsen for fila sier «Dette sletter også 5 flashcards og 5 quizspørsmål laget fra fila.» når begge finnes.
- Given en flashcardsjobb som kjører, when Quiz-raden vises, then «Lag quiz» er ikke aktiv og raden sier «Venter til flashcardene er ferdige» (og motsatt).
- Given dialogen «Lag quiz», when den åpnes med bare tastatur, then «Vanlig» og «Middels» er valgt, piltaster flytter innen gruppen, Esc lukker uten jobb og fokus går tilbake.

## Spec Change Log

## Review Triage Log

### 2026-11-22 — Review pass
- verdicts: 26 findings — high 0, medium 0, low 10, false 9, maybe-false 7
- findings:
  - `[low]` `[reject]` (verification-gap) `quiz.build_prompt` is not reachable through the registry; a later consumer of `prompt_file` would see `{difficulty}` unfilled — no effect while only mock models exist; wiring the real model is epic 6 and needs a new registry hook (more than a direct correction).
  - `[low]` `[defer]` (edge) a real model may return questions that already exist or repeat within a batch — same advisory `existing_keys` design as flashcards since 3.1 (pre-existing pattern); belongs with the real model in epic 6.
  - `[low]` `[patch]` (edge) `page_no` was lax `int`, so `True`/`"1"` passed as page 1 — fixed: `StrictInt`, two new rejection cases in `test_quiz.py`.
  - `[maybe-false]` `[reject]` (edge) mock gives duplicate options when two definitions share the answer text — follows the AC rule literally («definisjonene til de tre neste begrepene»); validation discards and counts them, as AC 5 says; would only be low.
  - `[maybe-false]` `[reject]` (edge) four identical answers give `done` with N discarded instead of 0 discarded — same root as above; the message shown is still the approved fewer/nothing text; would only be low.
  - `[false]` `[reject]` (edge) unknown running kind would crash `generationTexts[kind].waiting` — the backend only returns registered kinds (`JobCreate._known_kind`), and every registered kind has texts; a kind added without texts fails `tsc` via `Record<JobKind, …>`.
  - `[low]` `[reject]` (edge) the other row stays active during the POST of a start — needs a quick double click; the server answers 409 with the approved text; fix needs shared state between rows.
  - `[low]` `[reject]` (blind) same as the verification-gap prompt finding — see first row.
  - `[maybe-false]` `[reject]` (blind) `quiz.txt` mentions a list of existing questions and no output format — same as `flashcards.txt`; the call site that adds pages, existing keys and the JSON schema is epic 6; would only be low now.
  - `[low]` `[patch]` (blind) difficulty values in several places and an unused `quiz.DEFAULT_DIFFICULTY` — removed the constant, added `test_fr29_vanskelighetsgradene_i_instruksen_og_api_et_er_de_samme`.
  - `[maybe-false]` `[reject]` (blind) mock duplicates — same as edge finding above.
  - `[false]` `[reject]` (blind) answer extraction counts words again — `sentences()` normalises all whitespace to single spaces and `definition_term` splits on the same single space, so the word count always matches.
  - `[low]` `[reject]` (blind) no database CHECK on the length of `options` — `validate_item` is the only writer's gate (AR-4); a JSON length CHECK is dialect-specific; adds complexity for a state no code path can reach.
  - `[low]` `[patch]` (blind) `page_no` lax int — same as the edge row; fixed there.
  - `[false]` `[reject]` (blind) `params` may be null and break `JobOut` — `jobs.params` is NOT NULL since migration 0006 and always written by `create_job`; the `or {}` and `?.` are defensive only.
  - `[maybe-false]` `[reject]` (blind) quiz «Øv nå» disabled without a reason — temporary until story 4.2 builds the quiz session; there is no approved text for a reason; would only be low.
  - `[maybe-false]` `[reject]` (blind) no lecture/subject delete-preview test with quiz questions — the counter takes `scope.file_ids`, which the lecture, subject and account previews fill the same way (covered for flashcards in 3.7); would only be low.
  - `[low]` `[patch]` (blind) stale test names and flow-4 comment — renamed the two `test_ar7_…` tests and updated the comment.
  - `[false]` `[reject]` (blind) user-journey docs lack quiz steps — the journey tests are extended by a separate run after each epic (autonom-kjoring.md, «Brukerreiser»); this story only had to keep them green and update the text.
  - `[false]` `[reject]` (blind) KI trail missing from the diff — written later in the same session, before the PR (story prompt step 5).
  - `[false]` `[reject]` (intent) R3: «gjenbruker omfangsvalget» read as reuse of the scope picker, not carry-over of the chosen value — carry-over would contradict «Vanlig … er forhåndsvalgt»; recorded as a kanttilfelle.
  - `[false]` `[reject]` (intent) R4: the 0-of-N message uses epic 3's separate nothing-text with «spørsmål» — the AC points to A20/E12, which is that text; recorded as a kanttilfelle.
  - `[false]` `[reject]` (intent) migration not run against in-memory SQLite and Postgres in this diff — `test_ar13_alembic_upgrade_head_kjorer` style tests run on SQLite, and Postgres ran migration 0008 at `docker compose up --build`.
  - `[maybe-false]` `[reject]` (intent) no quiz-specific test of cascade on file replace — replace deletes the old file row with the same `delete(File)` statement as delete, so the FK cascade is the same path tested for delete; would only be low.
  - `[false]` `[reject]` (intent) «Prøv igjen» and the reverse waiting direction only in Vitest — both are covered by tests that run on every build; Playwright covers one direction.
  - `[low]` `[reject]` (intent) API surface changes beyond the story (`JobOut.params`, 422 for flashcards with difficulty, `break_item`, `GenerationRow`) — all are needed for «Prøv igjen med samme valg», AR-12 and SK-4 for a second type; recorded in beslutninger.md.
- own check after the pass (screenshots): `[medium]` `[patch]` «Øv nå» on a row with content was disabled while another row's job ran, so she could not practise flashcards while the quiz was being made (EXPERIENCE.md flow 1, step 7) — `CreateRow` keeps «Øv nå» active in `waiting`; new test in `create-row.test.tsx`.

## Design Notes

Blanding: `digest = sha256("\x1f".join([question, *options]))`; for `i` fra 3 ned til 1: `j = digest[i] % (i + 1)`, bytt `order[i]` og `order[j]`. Ny `correct_index = order.index(correct_index)`.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alt grønt
- `cd frontend && npm run test` -- expected: alt grønt
- `cd frontend && npx playwright test` mot `docker compose up --build` -- expected: alt grønt

## Auto Run Result

Status: done

**Summary:** Quiz is registered as a new `kind` in the generation registry (mock rule, strict loose model, `validate_item`, `break_item`, prompt with difficulty) and stored in the new `quiz_questions` table owned by `content`, with options shuffled once by a SHA-256 seed. Quiz questions are counted in delete confirmations, and the delete guard covers quiz jobs. The lecture page has a Quiz row built on a shared `GenerationRow`, and the dialog «Lag quiz» has scope and difficulty.

**Files changed:**
- `backend/alembic/versions/0008_create_quiz_questions.py`, `backend/app/modules/content/{models,service,registry,schemas,router}.py` -- table, shuffle and save, counts.
- `backend/app/modules/generation/{quiz.py,prompts/quiz.txt}` -- the quiz content type and its instructions.
- `backend/app/modules/generation/{registry,mock,port,service,schemas,router,flashcards}.py` -- `break_item`, `uses_difficulty`, difficulty to the port, `JobOut.params`.
- `backend/tests/test_quiz.py` (new) and updated job, delete, account and generation tests.
- `frontend/modules/generation/{types,api,texts}.ts`, `components/{generation-row,quiz-row,flashcards-row,scope-dialog}.tsx`, `frontend/components/{choice-option,create-row}.tsx`, `frontend/modules/subjects/pages/lecture-page.tsx` -- Quiz row, dialog, waiting state.
- `frontend/e2e/quiz.spec.ts` (new), `konto.spec.ts`, `flashcards.spec.ts`, `brukerreiser/{felles.ts,flyt-3,flyt-4}`, `docs/testing/brukerreiser.md` -- new account text and narrower row helpers.

**Review:** 26 findings: 4 patched (all low: strict `page_no`, shared difficulty values, test names, flow-4 comment), 1 deferred (duplicate questions from a real model, epic 6), 21 rejected with reasons in the triage log. One own finding from the screenshots (medium) was patched: «Øv nå» stays active while another row's job runs.

**Follow-up review recommended:** false (no high patched, one medium patched, which is covered by a new test and the screenshots).

**Verification:** `uv run pytest` 523 passed; `npm run test` 717 passed; `npx tsc --noEmit` clean; `npx playwright test` 133 passed against `docker compose up --build` (one run had a flaky failure in `filer.spec.ts` FR-8, which passed 3 of 3 alone and in the full rerun).

**Residual risks:** the prompt is not yet wired to a real model (epic 6); the arrow-key race noted by the implementer may make keyboard e2e tests flaky.
