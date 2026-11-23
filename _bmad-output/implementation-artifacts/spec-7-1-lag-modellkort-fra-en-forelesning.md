---
title: 'Story 7.1: Lag modellkort fra en forelesning'
type: 'feature'
created: '2026-11-23'
status: 'ready-for-dev'
baseline_revision: 'baa5c8b4834df40a9905676451009eebf534e26c'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/autonom-kjoring.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Studenten kan i dag lage flashcards og quiz, men ikke modellkort for modeller og lister som AIDA. Story 7.1 (FR-42–FR-45, FR-47) krever en ny innholdstype `models` med huskeregel av forbokstavene, en knapp «Lag modellkort» på Flashcards-raden og modellkort i slettetellingene, bak bryteren `FEATURE_MNEMONICS`.

**Approach:** En ny modul `generation/models.py` melder typen inn i registeret (mock-regel, løs modell, `validate_item`, `break_item`, lagring gjennom `content`, instruksfil `instructions/models.md`, `feature="mnemonics"`). En Alembic-migrering legger `points` og `mnemonic` på `flashcards`. `content` får `model_cards` i telleregisteret og i `content-counts`. Frontenden får en tekstknapp «Lag modellkort» i `GenerationRow` for Flashcards-raden, som følger både flashcards- og modelljobber. Seed tar typen med av seg selv.

## Boundaries & Constraints

**Always:**
- Bare `content` skriver til `flashcards` (AR-16). Modellkort lagres med `kind="model"`, `back=None`, `points` (liste), `mnemonic` (tekst eller `None`).
- Jobben går gjennom det vanlige løpet (AR-4): port → `validate_item` → forkast og tell → lagre i én transaksjon. Formelmerket settes av løpet (FR-41).
- Huskeregelen er forbokstaven (første bokstav, `str.isalpha`, æ/ø/å teller) i hvert punkt, store bokstaver, i notatenes rekkefølge. Har alle punktene samme forbokstav (uten hensyn til store/små), lagres `mnemonic=None` (FR-44).
- Tekster ordrett: «Lag modellkort», «Lager modellkort …», «Venter til modellkortene er ferdige», «Vi fant ingen modeller eller lister i denne forelesningen.», «Vi klarte ikke å lage modellkortene. Ingenting er lagret. Prøv igjen.»
- `FEATURE_MNEMONICS=false`: knappen vises ikke, `POST …/jobs` med `kind: "models"` gir `404 FEATURE_DISABLED`, seed lager ingen modellkort.
- Tester har krav-ID i navnet. Ingen test kaller Vertex AI.
- Kode og kommentarer på engelsk, tekster i appen på norsk.

**Never:**
- Ingen visning eller øving av modellkort i flashcard-økten, ingen `PATCH` av huskeregel (story 7.2).
- Ingen egen Huskeregler-rad og ingen dialog for «Lag modellkort».
- Ikke endre planleggingsdokumentene, `CLAUDE.md` eller `frontend/e2e-skjermbilder/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mock, liste | Side: «Deler av modellen» + 4 linjer «• A …», «• I …», «• D …», «• A …» | Ett kort: forside «Forklar Deler av modellen.», 4 punkter uten kulepunkt, `mnemonic="AIDA"`, kilden er siden | – |
| Mock, linje over slutter med punktum/kolon | «Rekkefølgen gir navnet til modellen.» | Forside «Forklar Rekkefølgen gir navnet til modellen.» (ett punktum, ikke to) | – |
| Mock, for kort liste | 2 listelinjer | Ingen kort | – |
| Mock, liste øverst på siden | Ingen linje over lista | Ingen kort | – |
| Mock, nummerert liste | «1. …», «2) …» | Punkter uten nummer | – |
| Mock, kjent forside | Forsiden finnes som modellkort (store/små ignoreres) | Hoppes over | – |
| Samme forbokstav | Produkt, Pris, Plass, Påvirkning | Lagres med `mnemonic=None` | – |
| Feil huskeregel | Punkter A, I, D, A, huskeregel «AIDE» eller mangler | Forkastes og telles | `discarded` +1 |
| Huskeregel med tegn | «A-I-D-A» eller «aida» | Godtas (bare bokstaver, uten hensyn til store/små), lagres som modellen ga den | – |
| Ugyldig kort | Tom forside, < 3 punkter, tomt punkt, punkt uten bokstav, side som ikke finnes | Forkastes og telles | `discarded` +1 |
| Ingenting funnet | Jobb `done`, `created=0` | «Vi fant ingen modeller eller lister i denne forelesningen.» i levende område, ingen «Prøv igjen» | – |
| Feil eller tidsgrense | Porten kaster / > 3 min | Ingenting lagret, feilteksten og «Prøv igjen» | `failed` |
| Bryter av | `FEATURE_MNEMONICS=false` | `POST` gir 404 `FEATURE_DISABLED`, knappen er borte | – |

</intent-contract>

## Code Map

- `backend/app/modules/generation/registry.py` -- `ContentType`, `register_content_type`, `enabled_content_types`; `_ensure_builtin_types` importerer typemodulene (legg til `models`).
- `backend/app/modules/generation/flashcards.py` -- mønster for typemodul (mock-regel, `LooseFlashcard(FormulaReport)`, `validate_item`, `break_item`, `existing_keys`, `save`).
- `backend/app/modules/generation/service.py` -- løpet; uendret. `formula_flag` per gyldig element.
- `backend/app/modules/generation/router.py:66` `start_job` -- sjekk bryteren her (404 før oppslag).
- `backend/app/modules/generation/vertex.py` -- generisk: bruker `instructions_file` og `loose_model` fra registeret; trenger bare ny instruksfil.
- `backend/app/modules/generation/instructions/flashcards.md` -- mal for `models.md`.
- `backend/app/core/features.py` -- `Feature`-typen; `require_feature`.
- `backend/app/modules/content/models.py` -- `Flashcard`; `FLASHCARD_KINDS` har allerede `model`, `back` er nullable.
- `backend/app/modules/content/service.py` -- `NewFlashcard`, `add_flashcards`, `flashcard_fronts`, `flashcard_count`, `count_flashcards`.
- `backend/app/modules/content/registry.py:63` `_ensure_builtin_counters` -- legg `model_cards` etter `quiz_questions`.
- `backend/app/modules/content/schemas.py` `ContentCounts`, `router.py` `lecture_content_counts`.
- `backend/alembic/versions/0009_add_content_position.py` -- mønster (batch_alter_table).
- `backend/app/seed/service.py` -- bruker `enabled_content_types`; notatene har allerede AIDA (ulike), fire P-er (like) og segmentering (ulike).
- `backend/tests/test_seed.py:108` -- teller alle forsider per fil; må filtrere bort modellkort.
- `frontend/modules/generation/components/generation-row.tsx` -- radlogikken; følger én `kind` i dag.
- `frontend/modules/generation/components/flashcards-row.tsx`, `texts.ts`, `types.ts`, `api.ts`.
- `frontend/components/create-row.tsx` -- knappene i raden.
- `frontend/lib/config.ts` `useAppConfig` -- `feature_mnemonics`.
- `frontend/lib/messages.ts:70` -- `countNouns.model_cards` finnes allerede.
- `frontend/modules/subjects/lecture-page.test.tsx:1016` -- testoppsett for «Lag og øv».
- `frontend/e2e/pdf.ts` -- én linje per side; trenger flere linjer for lister.
- `frontend/e2e/universell-utforming.spec.ts:281` -- bør ha-testen (#301).
- `frontend/e2e/brukerreiser/flyt-3-rydder-i-filene.spec.ts` -- slettetekstene (#131).
- `docs/testing/brukerreiser.md`, `docs/testplan.md`, `README.md:313`.

## Tasks & Acceptance

**Execution:**
- `backend/alembic/versions/0010_add_model_card_fields.py` -- `points` (JSON, nullable) og `mnemonic` (Text, nullable) på `flashcards` -- AR-13.
- `backend/app/modules/content/models.py` -- kolonnene `points` og `mnemonic`.
- `backend/app/modules/content/service.py` -- `NewModelCard`, `add_model_cards`, `model_card_fronts`, `model_card_count`, `count_model_cards` -- AR-16.
- `backend/app/modules/content/registry.py`, `schemas.py`, `router.py` -- `model_cards` i telleregisteret og `ContentCounts.model_cards` -- FR-12, FR-42.
- `backend/app/modules/generation/models.py` -- typen `models`: `mock_rule`, `mnemonic_for`, `LooseModelCard`, `validate_item`, `break_item`, `existing_keys`, `save`, `feature="mnemonics"` -- FR-42–FR-45, NFR-2a.
- `backend/app/modules/generation/instructions/models.md` -- instruksen -- FR-2, FR-39, FR-42–FR-44.
- `backend/app/modules/generation/registry.py` -- importer `models`.
- `backend/app/modules/generation/router.py` -- 404 `FEATURE_DISABLED` når typens bryter er av -- AR-11.
- `backend/tests/test_models.py` -- mock, huskeregel, validering, mock-invalid, jobb over HTTP, 409, feil/tidsgrense, ingenting funnet, bryter, slettetelling, cascade, migrering, instruks og skjema.
- `backend/tests/test_seed.py`, `test_instructions.py` -- seed med modellkort og uten når bryteren er av; instruksfila i registeret.
- `frontend/modules/generation/types.ts`, `texts.ts`, `api.ts` -- `JobKind` `models`, tekstene, `fewer` kan mangle.
- `frontend/components/create-row.tsx` -- valgfri ekstra tekstknapp.
- `frontend/modules/generation/components/generation-row.tsx`, `flashcards-row.tsx` -- raden følger også `models`, starter direkte, skjules når bryteren er av; antallet teller modellkort med.
- `frontend/modules/subjects/lecture-page.test.tsx`, `modules/generation/texts.test.ts` -- Vitest for knappen, tekstene og bryteren.
- `frontend/e2e/pdf.ts`, `frontend/e2e/modellkort.spec.ts` -- flere linjer per side; «Lag modellkort» i nettleseren med tastatur og axe.
- `frontend/e2e/universell-utforming.spec.ts` -- modellkort kreves når bryteren er på (#301).
- `frontend/e2e/brukerreiser/flyt-3-rydder-i-filene.spec.ts`, `docs/testing/brukerreiser.md` -- 2 modellkort i flyt 3 (#131).
- `README.md`, `docs/testplan.md` -- bryteren forklart; FR-42–FR-47.

**Acceptance Criteria:**
- Given en forelesning med filer, when studenten trykker «Lag modellkort», then starter jobben uten dialog, raden viser «Lager modellkort …», Quiz-raden er ikke aktiv med «Venter til modellkortene er ferdige», og etterpå teller Flashcards-raden modellkortene med.
- Given en fil med modellkort, when studenten vil slette fila, then viser bekreftelsen «… og 2 modellkort laget fra fila.», og modellkortene forsvinner med fila.
- Given `APP_ENV=local`, tom database og bryteren på, when seed kjører, then har AIDA- og segmenteringsforelesningen modellkort med huskeregel og markedsmiksen ett uten.

## Spec Change Log

## Review Triage Log

## Design Notes

- **Antall i jobben:** «Lag modellkort» har ingen dialog. Frontenden sender `requested: 30` (det største omfanget), og raden viser aldri «færre enn valgt» for modellkort, siden studenten ikke har valgt noe.
- **Forsiden i demomodus:** «Forklar » + linja over lista uten avsluttende `.`, `:` eller `;` + «.», så linjer som slutter med punktum ikke gir «..».
- **Én rad, to jobbtyper:** Flashcards-raden følger nyeste jobb av `flashcards` og `models` (etter `started_at`) og viser den jobbens tekst, feil eller «ingenting»-melding. «Prøv igjen» starter samme type på nytt.
- **Tellingene:** `content-counts` får `model_cards` som eget felt; Flashcards-raden viser summen. Øving av modellkort kommer i 7.2.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alle grønne.
- `cd backend && uv run ruff check . && uv run mypy app` -- expected: ingen feil (hvis satt opp).
- `cd frontend && npm run test && npm run lint && npx tsc --noEmit` -- expected: alle grønne.
- `cd frontend && npx playwright test` mot `docker compose up --build -d` -- expected: alle grønne.
