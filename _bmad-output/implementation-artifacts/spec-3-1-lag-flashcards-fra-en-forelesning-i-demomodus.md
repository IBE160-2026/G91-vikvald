---
title: 'Story 3.1: Lag flashcards fra en forelesning i demomodus'
type: 'feature'
created: '2026-11-21'
baseline_revision: '97246d7ab3c0089a00f3f7533b6c59004e196c66'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Forelesningssiden har bare «Filer». Studenten kan ikke lage flashcards fra notatene, og appen har verken språkmodellport, genereringsløp, jobber eller tabell for kort (story 3.1 i `epics.md`: FR-2, FR-18, FR-19, FR-22, FR-38, NFR-2, NFR-2a, NFR-17, AR-3, AR-4, AR-5, UX-DR18, UX-DR19).

**Approach:** Ny backendmodul `generation` med porten `generate(kind, pages, options)`, `MockGenerator`/`InvalidMockGenerator`, et register over innholdstyper (flashcards først), løpet i AR-4 og jobber i tabellen `jobs`. `content` eier tabellen `flashcards` og lagringen. Forelesningssiden får seksjonen «Lag og øv» med Flashcards-raden (felles `create-row` og `job-status`), som starter en jobb på inntil 20 kort og følger den til den er ferdig.

## Boundaries & Constraints

**Always:**
- **Leverandør:** `generation/providers.py` velger generator fra `LLM_PROVIDER`: `mock` (standard) → `MockGenerator`, `mock-invalid` → `InvalidMockGenerator`. `vertex` (og alt annet) gir `UnsupportedProviderError`. FastAPI-`lifespan` i `main.py` kaller valget ved oppstart; feiler det, logges `CRITICAL` med «LLM_PROVIDER=vertex is not supported yet (Vertex AI arrives in epic 6). Use mock or mock-invalid.», og oppstarten stopper. Rutene får generatoren gjennom avhengigheten `get_generator` (testene overstyrer den).
- **Port:** `generate(kind, pages, options) -> list[dict]` (løs liste). `pages` er `Page(file_id, page_no, text)` i fast rekkefølge (fil etter `uploaded_at, id`, så `page_no`). `options` er `GenerationOptions(requested, existing_keys)`. Ingen kode kaller et eksternt API.
- **Register (`generation/registry.py`):** `ContentType(kind, mock_rule, loose_model, validate_item, existing_keys, save, prompt_file)`, `register_content_type`, `get_content_type`. `generation/flashcards.py` melder inn `flashcards` ved import. Løpet kjenner bare registeret.
- **Mock-regel (NFR-2a):** sidetekst normaliseres (alle mellomrom/linjeskift → ett mellomrom), deles i setninger etter `.`, `!`, `?` fulgt av mellomrom. En definisjonssetning har ordet `er` eller `is` (små bokstaver, eget ord) med 1–6 ord foran. Kortet er `{"kind": "concept", "front": <ordene foran>, "back": <hele setningen>, "file_id", "page_no"}`, i rekkefølge fil, side, plassering. Kort hvis forside (uten forskjell på store/små bokstaver) finnes i `existing_keys`, hoppes over. Samme sider gir alltid samme liste.
- **Ugyldig mock:** `InvalidMockGenerator` tar mock-listen og ødelegger fast hvert element med indeks `i % 4`: 1 → tom forside, 2 → `page_no` 9999, 3 → `kind` `"unknown"`; 0 er gyldig.
- **Løpet (`generation/service.py`, `run_job`):** egen sesjon fra `get_sessionmaker` (ny avhengighet i `core/db.py`, overstyres i testene) → sider fra `files.service.pages_for_lecture` → `existing_keys` → porten → `validate_item(item, pages)` per element (forkast og tell) → sorter de gyldige stabilt på (filrekkefølge, side) → behold de første `requested` → lagre kortene og sett jobben til `done` med `created`, `discarded`, `finished_at` i **én** commit. Ingen gyldige: `done` med `created=0`. Unntak: rollback, jobben settes til `failed` med `GENERATION_FAILED` og `finished_at`, logges uten innhold.
- **`validate_item` for flashcards:** løs Pydantic-modell (alle felt valgfrie); forkast ved feil type, `kind` ikke `qa`/`concept`, tom forside, tom bakside, eller `(file_id, page_no)` som ikke er blant sidene.
- **Instrukser:** `generation/prompts/flashcards.txt` på norsk (bokmål også fra engelske notater, norske fagbegreper som de står, engelsk i parentes når begge brukes, bare stoff fra sidene, fil og PDF-side per kort, korttypene `qa` og `concept`). Mock leser den ikke.
- **Tabeller (migrering `0006_create_jobs_and_flashcards`):** `jobs` (`id`, `lecture_id` FK `ON DELETE CASCADE` med indeks, `kind`, `params` JSON, `status`, `requested`, `created`, `discarded` (begge kan være tomme til jobben er ferdig), `error_code`, `started_at`, `finished_at`) og delvis unik indeks `uq_jobs_running_lecture` på `lecture_id` der `status = 'running'` (`postgresql_where` og `sqlite_where`). `flashcards` (`id`, `file_id` FK `ON DELETE CASCADE` med indeks, `kind`, `front`, `back` (kan være tom), `page_no`, `formula_flag` (standard false), `created_at`). Modellene i `generation/models.py` og `content/models.py`.
- **API (`generation/router.py`, med `current_user`, eierskap via `subjects.service.get_lecture`):**
  - `POST /api/lectures/{id}/jobs` `{"kind": "flashcards", "params": {"requested": 20}}` (`params` valgfri, `requested` 10/20/30, standard 20; ukjent `kind` eller annet tall → `422 VALIDATION_ERROR`). Uten filer → `422 LECTURE_HAS_NO_FILES`. Pågående jobb → `409 JOB_ALREADY_RUNNING` (sjekk først, og `IntegrityError` fra indeksen gir det samme). Ellers lagres jobben (`running`), `run_job` startes med `asyncio.create_task` (oppgavene holdes i et sett), og svaret er `202` med `JobOut`.
  - `GET /api/lectures/{id}/jobs/latest` → liste med siste jobb per `kind` (nyeste `started_at`).
  - `JobOut`: `id, lecture_id, kind, status, requested, created, discarded, error_code, started_at, finished_at`.
- **Tellinger (`content/router.py`):** `GET /api/lectures/{id}/content-counts` → `{"flashcards": <antall kort med kind qa/concept i forelesningens filer>}`.
- **Oppstart:** `lifespan` kjører `fail_interrupted_jobs()` (alle `running` → `failed`, `JOB_INTERRUPTED`, `finished_at`) etter leverandørsjekken og før appen tar imot forespørsler.
- **Feilkoder:** nye `JOB_ALREADY_RUNNING` (409), `LECTURE_HAS_NO_FILES` (422), `GENERATION_FAILED` (500), `JOB_INTERRUPTED` (500). Tekster i `messages.ts`: `LECTURE_HAS_NO_FILES` = «Last opp notater først.», `JOB_ALREADY_RUNNING` = «Det lages innhold i denne forelesningen nå. Vent til det er ferdig, og prøv igjen.» (godkjent i 3.7), de to andre reserveteksten (3.2 gir dem egne tekster).
- **Frontend:**
  - `components/create-row.tsx`: rad (min. høyde `create-row`, 96 px) med tittel og telling til venstre (fylt prikk med innhold, hul prikk uten) og handlinger til høyre. Tilstander: med innhold «Øv nå» (hovedknapp) + tekstknappen «Lag flere» med plussikon; uten innhold omrissknappen «Lag …»; `running` → `job-status` i stedet for knappene; `waiting` og `disabled` → knappene ikke aktive og grunnen som tekst under tellingen, koblet med `aria-describedby`. Et alltid montert `sr-only` `role="status"` leser `announcement`. Valgfri synlig `message` og `error` (`role="alert"`) under raden.
  - `components/job-status.tsx`: boks på papir med kant (`border-card`, `rounded-md`), snurr (shadcn `spinner` tilpasset: spor `progress-track`, bue `brand`, roterer ikke med `prefers-reduced-motion`), «Lager flashcards …» og «Du kan bruke resten av appen imens.».
  - `modules/generation/` (`types.ts`, `api.ts`, `components/flashcards-row.tsx`): henter `jobs/latest` (spør hvert sekund mens en jobb er `running`) og `content-counts`. Telling «24 kort» eller «Ingen ennå». Uten filer: «Last opp notater først.». Knappene starter jobb uten `params`. Når en jobb denne fanen fulgte, går fra `running` til `done`/`failed`: tellinger hentes på nytt og `announcement` settes til «Flashcardene er ferdige: N kort i <forelesning>.», eller ved `created=0` «Notatene ga ikke grunnlag for flashcards. Ingenting er lagret.» (som også vises synlig til neste jobb), eller ved feil reserveteksten (synlig `role="alert"`). Start setter «Lager flashcards …».
  - `lecture-page.tsx`: «Filer» og «Lag og øv» side om side (`flex-wrap`, `gap-column-gap`, «Filer» maks 496 px, «Lag og øv» maks 512 px, begge minst 360 px før de brytes); «Lag og øv» har h2 og et hvitt kort (`rounded-lg`, `border-card`, `shadow-lift`) med Flashcards-raden.
- Testnavn har krav-ID (`test_fr38_…`, `test_nfr2a_…`, `test_sk21_…`, `test_ar5_…`, «UX-DR18: …»). Kode og kommentarer på engelsk, synlig tekst på bokmål. README og `.env.example` forklarer `mock` og `mock-invalid` og at demoinnholdet er enkelt og mekanisk.

**Never:**
- Ikke rør planleggingsdokumentene, `CLAUDE.md`, `.claude/settings.json`, `.git/hooks/` eller `frontend/e2e/brukerreiser/`.
- Ikke meld flashcards inn i slette-registeret i `content` (det er story 3.7, og flyt 4 forventer ingen innholdstyper ennå).
- Ingen dialog for omfang, ingen meldinger for «færre enn valgt», tidsgrense eller `GET /api/jobs/active` (story 3.2). Ingen økt: «Øv nå» vises, men er ikke aktiv før 3.3.
- Ingen nye Python-pakker; ingen eksterne kall; ingen tekst fra backenden til brukeren.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Første jobb | forelesning med fil med 3 definisjoner | `202 running, requested 20`; etterpå `done, created 3, discarded 0`; telling 3 | — |
| Flere enn bedt om | 25 definisjoner, `requested` 20 | 20 lagres, de første i fil/side/plassering | — |
| «Lag flere» | samme fil, kortene finnes | `done, created 0`, ingenting lagres | melding «ingenting laget» |
| Legges til | 24 kort, ny fil med 2 nye | 26 kort | — |
| `mock-invalid` | 4 definisjoner | `created 1, discarded 3` | — |
| Pågår | jobb `running` | `409 JOB_ALREADY_RUNNING` | — |
| Ingen filer | forelesning uten filer | `422 LECTURE_HAS_NO_FILES` | — |
| Andres forelesning | annen bruker | `404 NOT_FOUND` | — |
| Generator kaster | port feiler | `failed, GENERATION_FAILED`, ingen kort | logget uten innhold |
| Omstart | jobb `running` i databasen | `failed, JOB_INTERRUPTED` før forespørsler | — |
| `vertex` | `LLM_PROVIDER=vertex` | oppstarten stopper | `CRITICAL`-logg |

</intent-contract>

## Code Map

- `backend/app/core/config.py` -- `LLM_PROVIDER` Literal `mock|mock-invalid|vertex`, `demo_mode`; endres ikke.
- `backend/app/core/db.py` -- `SessionLocal`, `get_session`; ny `get_sessionmaker()`.
- `backend/app/core/errors.py` -- `ErrorCode`, `ERROR_STATUS`; fire nye koder.
- `backend/app/main.py` -- `create_app()`; legg til `lifespan` og de nye routerne.
- `backend/app/modules/subjects/service.py:115` -- `get_lecture(session, user_id, lecture_id)` gir 404 for andres/ukjent.
- `backend/app/modules/files/models.py` -- `File`, `FilePage(file_id, page_no, text)`; `files/service.py` får `pages_for_lecture`.
- `backend/app/modules/content/registry.py` -- slette-registeret (røres ikke i denne storien).
- `backend/alembic/versions/0005_add_terms_accepted_at.py` -- forrige migrering (`down_revision` for 0006).
- `backend/tests/conftest.py` -- `client`-fixture overstyrer `get_session`; må også overstyre `get_sessionmaker` og registrere de nye modellene.
- `backend/tests/test_migrations.py` -- `compare_metadata` må importere de nye modellene.
- `backend/tests/test_errors.py` -- sjekker at hver `ErrorCode` har tekst i `messages.ts`.
- `backend/tests/test_route_guard.py` -- alle nye ruter må ha `current_user`.
- `frontend/modules/subjects/pages/lecture-page.tsx` -- siden 04; «Lag og øv» inn ved siden av «Filer».
- `frontend/modules/subjects/lecture-page.test.tsx` -- falsk backend; må svare på `jobs/latest` og `content-counts`.
- `frontend/components/ui/button.tsx` -- variantene `primary`, `outline`, `text`; `frontend/components/icon.ts` -- `iconProps`.
- `frontend/lib/messages.ts` -- `messages`, `messageFor`.
- `frontend/e2e/pdf.ts` -- `makePdf({pages})` (bare ASCII, én linje per side).
- Skisse `_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/mockups/04-forelesning.svg` -- «Lag og øv» x=880, 512 bredt, rader 96 px med hårlinje, «Øv nå» 184×40.

## Tasks & Acceptance

**Execution:**
- `backend/app/core/errors.py` -- fire nye koder med status -- AR-12.
- `backend/app/core/db.py` -- `get_sessionmaker()` -- egen sesjon for jobben, kan overstyres.
- `backend/app/modules/content/models.py`, `content/service.py`, `content/router.py` -- `Flashcard`, `add_flashcards`, `flashcard_fronts`, `flashcard_count`, rute for tellinger.
- `backend/app/modules/files/service.py` -- `pages_for_lecture(session, lecture_id) -> list[(file_id, page_no, text)]`.
- `backend/app/modules/generation/{__init__,models,port,registry,mock,flashcards,providers,service,schemas,router}.py` og `prompts/flashcards.txt` -- porten, registeret, mock, løpet, jobber, ruter.
- `backend/alembic/versions/0006_create_jobs_and_flashcards.py` -- migreringen.
- `backend/app/main.py` -- `lifespan` (leverandørsjekk, `fail_interrupted_jobs`) og routerne.
- `backend/tests/fixtures/definisjoner.pdf` + `backend/tests/fixtures/make_fixture.py` -- fast testfil (egne ord, norsk og engelsk, to sider).
- `backend/tests/test_generation.py`, `test_jobs.py` + oppdatering av `conftest.py`, `test_migrations.py` -- matrisen og AC-ene.
- `frontend/components/ui/spinner.tsx` (shadcn), `components/job-status.tsx`, `components/create-row.tsx` + tester (to rader med «venter»).
- `frontend/modules/generation/{types,api}.ts`, `components/flashcards-row.tsx`; `lecture-page.tsx` og testen.
- `frontend/lib/messages.ts` -- nye koder.
- `frontend/e2e/flashcards.spec.ts` -- lag kort, «Lag flere», uten filer, axe med og uten kort og mens jobben pågår (rute fanget med `page.route`), tastatur.
- `README.md`, `.env.example` -- `LLM_PROVIDER` og demoinnholdet.

**Acceptance Criteria:**
- Given den faste testfila, when mock-modellen kjøres to ganger, then er resultatet likt og hvert kort følger NFR-2a.
- Given en jobb som ikke er ferdig (treg generator), when `POST` besvares, then er svaret `202 running` før kortene finnes.
- Given forelesningssiden uten kort, when studenten trykker «Lag flashcards», then vises «Lager flashcards …», og så «24 kort»-tellingen og «Øv nå» uten ny sidelasting, og start/slutt leses i et levende område.
- Given to `create-row` der den ene har en jobb, when den andre er `waiting`, then er knappen ikke aktiv og «Venter til flashcardene er ferdige» vises.
- Given forelesningssiden med og uten kort og med jobb, when axe kjører, then er det ingen brudd.

## Spec Change Log

## Review Triage Log

## Design Notes

- **Hvorfor `lifespan`:** den kjører i Uvicorn-prosessen før første forespørsel, så rekkefølgen i AR-14 (migreringer → seed → opprydding → forespørsler) holder, og testene kan kalle funksjonene direkte.
- **Hvorfor egen tellerute:** antallet kort trengs på 04 før lista over kort finnes (3.3). `content` eier tellinger (arkitekturen), og ruta kan utvides med flere typer.
- **Eierskap:** `generation` og `content` kaller `subjects.service.get_lecture` slik `files/router.py` gjør; ingen ny kode for eierskap.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- alle grønne
- `cd backend && uv run ruff check .` -- ingen funn (hvis ruff finnes)
- `cd frontend && npm run test && npx tsc --noEmit` -- grønne
- `docker compose up --build -d && cd frontend && npx playwright test` -- grønne
