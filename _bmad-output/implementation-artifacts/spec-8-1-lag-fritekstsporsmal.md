---
title: 'Story 8.1: Lag fritekstspørsmål'
type: 'feature'
created: '2026-11-25'
status: 'in-progress'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/autonom-kjoring.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-7-1-lag-modellkort-fra-en-forelesning.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Studenten kan lage flashcards, quiz og modellkort, men ikke kortsvar- eller langsvarsspørsmål med modellsvar (FR-48, FR-49). Story 8.1 krever en ny innholdstype `freetext` med egen tabell, en rad «Fritekstspørsmål» i «Lag og øv» med en dialog for type og omfang, fritekstspørsmål i slettetellingene og i seed, alt bak bryteren `FEATURE_FREETEXT`.

**Approach:** En ny typemodul `generation/freetext.py` melder typen inn i registeret (mock-regel, løs modell, `validate_item`, `break_item`, lagring gjennom `content`, instruksfil `instructions/freetext.md`, `feature="freetext"`). Registeret får omfang per type (`scopes`, `default_requested`) og en valgfri spørsmålstype (`uses_question_kind`), og `Save` får jobbens `GenerationOptions`, så typen studenten valgte lagres uansett hva modellen svarer. Migrering 0011 lager `freetext_questions`. `content` får `freetext_questions` i telleregisteret, i `content-counts` og i `first_content_times` (#236). Frontenden får `FreetextRow` og dialogen «Lag fritekstspørsmål» som gjenbruker `ScopeDialog`.

## Boundaries & Constraints

**Always:**
- Bare `content` skriver til `freetext_questions` (AR-16). Kolonner: `id`, `file_id` (FK `ON DELETE CASCADE`, indeksert), `kind` (`short`/`long`, CHECK-regel), `question`, `model_answer`, `page_no`, `formula_flag`, `created_at`, og i tillegg `position` som de andre innholdstabellene (rekkefølgen i en lagring).
- Jobben går gjennom det vanlige løpet (AR-4): port → `validate_item` → forkast og tell → lagre i én transaksjon. Formelmerket settes av løpet (FR-41).
- Jobbparametrene: `params.question_kind` (`short`/`long`, standard `short` når den mangler) og `params.requested` (5, 10 eller 15, standard 10). Annen verdi, `question_kind` for en annen type, eller `difficulty` for fritekst gir `422` med den vanlige feilformen (AR-12). Flashcards, quiz og modellkort beholder 10/20/30 og standard 20.
- Mock: ett spørsmål «Forklar [begrep].» per definisjonssetning (begrepet fra `definition_term`, ett per begrep som i flashcards), modellsvaret er hele setningen, kilden er siden. Spørsmål med samme tekst som et fritekstspørsmål forelesningen har fra før (uten hensyn til store/små og uansett type), hoppes over. Samme mock for kortsvar og langsvar.
- Typen som lagres, er alltid den studenten valgte (`options.question_kind`), ikke noe modellen sier.
- Tekster ordrett: «Fritekstspørsmål», «Ingen ennå», «Lag fritekstspørsmål», «N spørsmål», «Lager fritekstspørsmål …», «Du kan bruke resten av appen imens.», «Venter til fritekstspørsmålene er ferdige», «Det ble laget N av inntil M spørsmål. Notatene ga ikke grunnlag for flere.», «Vi klarte ikke å lage fritekstspørsmålene. Ingenting er lagret. Prøv igjen.», «Notatene ga ikke grunnlag for fritekstspørsmål. Ingenting er lagret.», «Fritekstspørsmålene er ferdige: N spørsmål i [forelesning].», og i slettebekreftelsen «N fritekstspørsmål».
- Dialogen: tittel og hovedknapp «Lag fritekstspørsmål». Gruppa «Type» med to valgkort «Kortsvar» («Svar med noen få setninger») og «Langsvar» («Forklar sammenhenger eller gi et eksempel»), deretter «Omfang» med «Rask» («Inntil 5 spørsmål»), «Vanlig» (10) og «Dyp» (15). «Kortsvar» og «Vanlig» er forhåndsvalgt hver gang den åpnes. Ingen vanskelighetsgrad.
- Raden viser aldri «Øv nå» i denne storien (økten kommer i 8.2). Med spørsmål: antallet og «+ Lag flere».
- `FEATURE_FREETEXT=false`: raden vises ikke, `POST …/jobs` med `kind: "freetext"` gir `404 FEATURE_DISABLED` (før oppslag av forelesningen), seed lager ingen fritekstspørsmål. Telleren for slettebekreftelsen er alltid registrert (som modellkort).
- Tester har krav-ID i navnet. Ingen test kaller Vertex AI eller Gemini.
- Kode og kommentarer på engelsk, tekster i appen på norsk bokmål.

**Never:**
- Ingen fritekst-økt, ingen `GET …/freetext-questions`-ruter og ingen sletting av enkeltspørsmål (story 8.2 og 8.3).
- Ingen endring av flyttestene for flyt 2 og 3 utover det som følger av den nye kontoteksten.
- Ikke endre planleggingsdokumentene, `CLAUDE.md`, `.claude/settings.json` eller `frontend/e2e-skjermbilder/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mock, definisjoner | Side «Merkevare er et navn. Pris er det kunden betaler.» | To spørsmål «Forklar Merkevare.» og «Forklar Pris.», modellsvar er hele setningen, kilden er siden | – |
| Mock, omfang | 7 definisjoner, omfang 5 | 5 lagres (de første i fil- og siderekkefølge) | – |
| Mock, «+ Lag flere» | Alle spørsmålene finnes fra før | `done`, `created=0`, «Notatene ga ikke grunnlag for fritekstspørsmål. Ingenting er lagret.» | – |
| Langsvar | `question_kind: "long"` | Spørsmålene lagres med `kind="long"` | – |
| Ugyldig element | Tomt spørsmål eller modellsvar, side som ikke finnes, feil typer | Forkastes og telles | `discarded` +1 |
| mock-invalid | 8 definisjoner | 2 lagres, 6 forkastes | – |
| Ugyldige parametre | `requested: 20`, `question_kind: "medium"`, `difficulty` satt | `422` | `VALIDATION_ERROR` |
| `question_kind` på flashcards | `kind: "flashcards"`, `question_kind: "short"` | `422` | `VALIDATION_ERROR` |
| Feil eller tidsgrense | Porten kaster / over 3 min | Ingenting lagret, feilteksten og «Prøv igjen» | `failed` |
| Bryter av | `FEATURE_FREETEXT=false` | `404 FEATURE_DISABLED`, raden er borte, seed lager ingen | – |
| Sletting | Fil med 10 fritekstspørsmål | «… og 10 fritekstspørsmål laget fra fila. Det kan ikke angres.», spørsmålene slettes med fila | – |

</intent-contract>

## Code Map

- `backend/app/modules/generation/registry.py` -- `ContentType` (legg til `scopes`, `default_requested`, `uses_question_kind`), `Save`-typen (får `GenerationOptions` som tredje argument), `_ensure_builtin_types` (importer `freetext` etter `model_cards`).
- `backend/app/modules/generation/model_cards.py`, `quiz.py`, `flashcards.py` -- mønster for typemodul; deres `save` må ta imot (og ignorere) `options`. `flashcards.definition_term`, `sentences` gjenbrukes.
- `backend/app/modules/generation/port.py` `GenerationOptions` -- legg til `question_kind: str | None = None`.
- `backend/app/modules/generation/service.py:195` -- `GenerationOptions` bygges fra `job.params`; `:231` `content_type.save(session, kept)` får `options`.
- `backend/app/modules/generation/schemas.py` -- `JobParams.requested` er `Literal[10, 20, 30]` i dag; valideringen flyttes til `JobCreate._difficulty_fits_kind` (gjør den generell) med typens `scopes`.
- `backend/app/modules/generation/router.py:66` `start_job` -- bryteren sjekkes allerede generisk.
- `backend/app/modules/generation/vertex.py` `instructions_for` -- erstatt også `{question_kind}` (beskrivelser i `freetext.QUESTION_KINDS`, slik `{difficulty}` bruker `quiz.DIFFICULTIES`).
- `backend/app/modules/generation/instructions/models.md` -- mal for `freetext.md`.
- `backend/app/modules/content/models.py` `QuizQuestion` -- mal for `FreetextQuestion`.
- `backend/app/modules/content/service.py` -- `NewQuizQuestion`/`add_quiz_questions`/`quiz_question_texts`/`quiz_question_count`/`count_quiz_questions`/`first_quiz_question_times` er mal.
- `backend/app/modules/content/registry.py` `_ensure_builtin_counters` (legg `freetext_questions` etter `model_cards`) og `_ensure_builtin_first_content` (legg `freetext`, #236).
- `backend/app/modules/content/schemas.py` `ContentCounts`, `router.py:50` `lecture_content_counts`.
- `backend/alembic/versions/0008_create_quiz_questions.py`, `0010_add_model_card_fields.py` -- mønster for `0011_create_freetext_questions.py`.
- `backend/app/seed/service.py` -- bruker `enabled_content_types` og `JobCreate(kind=kind)`; tar typen med av seg selv når standardparametrene er gyldige.
- `backend/tests/test_models.py`, `test_quiz.py`, `test_seed.py`, `test_instructions.py`, `test_vertex.py`, `test_migrations.py`, `test_testplan.py` -- mønster og tester som må utvides.
- `frontend/modules/generation/types.ts`, `texts.ts`, `api.ts` (`startJob` tar et `JobParams`-objekt), `components/generation-row.tsx` (`start`, `retry`, `startFromDialog` sender hele params), `components/scope-dialog.tsx` (`KIND_TEXTS` får omfang per type og valgfri typegruppe), `components/quiz-row.tsx` (mal for `freetext-row.tsx`).
- `frontend/components/create-row.tsx` -- ny valgfri prop for å skjule «Øv nå».
- `frontend/modules/subjects/pages/lecture-page.tsx:256` -- `FreetextRow` etter `QuizRow` når `useAppConfig().data?.feature_freetext === true`.
- `frontend/lib/messages.ts:64` `countNouns` -- `freetext_questions`.
- `frontend/modules/subjects/lecture-page.test.tsx`, `modules/generation/components/scope-dialog.test.tsx`, `modules/generation/texts.test.ts` -- Vitest.
- `frontend/e2e/modellkort.spec.ts`, `e2e/pdf.ts`, `e2e/brukerreiser/felles.ts` -- mønster og hjelpere for ny `e2e/fritekst.spec.ts`.
- `frontend/e2e/universell-utforming.spec.ts:299` -- fritekst-inngangen heter gruppa «Fritekstspørsmål», `built: true` (#301).
- Kontoteksten (registrerte typer): `frontend/e2e/konto.spec.ts`, `e2e/brukerreiser/flyt-4-*.spec.ts`, `docs/testing/brukerreiser.md:129` og tilsvarende Vitest/pytest som sjekker «flashcards, quizspørsmål og modellkort».
- `README.md:314`, `docs/testplan.md`.

## Tasks & Acceptance

**Execution:**
- `backend/alembic/versions/0011_create_freetext_questions.py` -- tabellen, Postgres og SQLite -- AR-7, AR-13, AR-15.
- `backend/app/modules/content/models.py`, `service.py`, `registry.py`, `schemas.py`, `router.py` -- `FreetextQuestion`, `NewFreetextQuestion`, `add_freetext_questions`, `freetext_question_texts`, `freetext_question_count`, `count_freetext_questions`, `first_freetext_question_times`; registrering i tellere og første-innhold; `ContentCounts.freetext_questions` -- AR-16, FR-12, #236.
- `backend/app/modules/generation/registry.py`, `port.py`, `service.py`, `schemas.py`, `flashcards.py`, `quiz.py`, `model_cards.py` -- omfang per type, `question_kind`, `Save` med options -- AR-5, AR-12.
- `backend/app/modules/generation/freetext.py` -- typen `freetext` med `QUESTION_KINDS`, `mock_rule`, `LooseFreetextQuestion`, `validate_item`, `break_item`, `existing_keys`, `save`, `scopes=(5, 10, 15)`, `default_requested=10`, `uses_question_kind=True`, `feature="freetext"` -- FR-48, FR-49, NFR-2a.
- `backend/app/modules/generation/instructions/freetext.md` og `vertex.py` -- instruksen med alle punktene i akseptkriteriet (bare stoffet på sidene, inntil valgt antall av valgt type `{question_kind}`, ingen spørsmål om modeller og lister, modellsvar fra notatene, PDF-sidenummer, bokmål med engelsk i parentes, `formula_missing`) -- FR-2, FR-39, FR-48, FR-49.
- `backend/tests/test_freetext.py` -- mock, omfang, typer, dubletter, validering, mock-invalid, jobb over HTTP (202, `requested`, lagres med valgt type), ugyldige parametre, 409, feil/tidsgrense, færre enn valgt, bryter av, slettetelling, cascade, `content-counts`, første-innhold, migrering, instruks og løst skjema.
- `backend/tests/test_seed.py`, `test_instructions.py` og andre berørte tester -- seed med og uten bryteren; instruksfila; nye `save`-signaturer og fire tellere.
- `frontend/modules/generation/*`, `frontend/components/create-row.tsx`, `frontend/lib/messages.ts`, `frontend/modules/subjects/pages/lecture-page.tsx` -- rad, dialog, tekster, tellinger.
- Vitest i de berørte filene -- raden (uten/med spørsmål, ingen «Øv nå», bryter av), dialogen (forhåndsvalg, omfang 5/10/15, sender `question_kind`), tekstene.
- `frontend/e2e/fritekst.spec.ts` -- med bare tastatur: åpne dialogen, piltaster, Esc uten endring, lag langsvar, jobbstatus og venteteksten i de andre radene, antallet, «+ Lag flere» som gir «ingenting»-teksten, slettebekreftelsen med fritekstspørsmål; axe på siden og dialogen i 1280 og 768 px.
- `frontend/e2e/universell-utforming.spec.ts` -- fritekst kreves når bryteren er på (#301).
- `README.md`, `docs/testplan.md`, `docs/testing/brukerreiser.md` -- bryteren forklart; FR-48/FR-49; kontoteksten.

**Acceptance Criteria:**
- Given en forelesning med filer og bryteren på, when studenten trykker «Lag fritekstspørsmål», velger Langsvar og Rask og starter, then svarer API-et 202 med `requested: 5`, raden viser «Lager fritekstspørsmål …», Flashcards- og Quiz-raden venter med «Venter til fritekstspørsmålene er ferdige», og etterpå viser raden «N spørsmål» og «+ Lag flere», men ikke «Øv nå».
- Given en fil med fritekstspørsmål, when studenten vil slette fila, then nevner bekreftelsen fritekstspørsmålene, og de slettes med fila.
- Given `APP_ENV=local`, tom database og bryteren på, when seed kjører, then har minst én eksempelforelesning fritekstspørsmål; med bryteren av har ingen det.
- Given en emneøkt med `kind: "freetext"`, when «øvd» regnes ut, then teller den for forelesninger som hadde fritekstspørsmål da økten startet (#236).

## Spec Change Log

## Review Triage Log

## Design Notes

- **Typen lagres fra jobben:** `Save` får `GenerationOptions`, og `freetext.save` setter `kind=options.question_kind`. Den løse modellen har derfor ikke noe `kind`-felt. De andre typene ignorerer argumentet.
- **Omfang per type:** `ContentType.scopes` og `default_requested` erstatter `Literal[10, 20, 30]`. Ett sted avgjør hva som er gyldig, og seed får gyldige standardverdier for alle typer.
- **«Øv nå» skjult:** `CreateRow` får `showPractice` (standard `true`); `GenerationRow` sender den videre.

## Verification

**Commands:**
- `cd backend && uv run pytest && uv run ruff check . && uv run mypy app` -- expected: alle grønne, ingen feil.
- `cd frontend && npm run test && npm run lint && npx tsc --noEmit` -- expected: alle grønne.
- `cd frontend && npx playwright test` mot `docker compose up --build -d` -- expected: alle grønne.
