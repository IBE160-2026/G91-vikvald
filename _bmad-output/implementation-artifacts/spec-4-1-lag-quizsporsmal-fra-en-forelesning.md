---
title: 'Story 4.1: Lag quizspørsmål fra en forelesning'
type: 'feature'
created: '2026-11-22'
baseline_revision: '4b9ad81d5102d87fe894ccc32ef09759ef00c0ff'
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

## Design Notes

Blanding: `digest = sha256("\x1f".join([question, *options]))`; for `i` fra 3 ned til 1: `j = digest[i] % (i + 1)`, bytt `order[i]` og `order[j]`. Ny `correct_index = order.index(correct_index)`.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alt grønt
- `cd frontend && npm run test` -- expected: alt grønt
- `cd frontend && npx playwright test` mot `docker compose up --build` -- expected: alt grønt
