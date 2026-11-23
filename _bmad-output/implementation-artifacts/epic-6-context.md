# Epic 6 Context: Ekte språkmodell og klar for sensor

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let the app generate content with real Gemini on Vertex AI in the EU behind the same generation port the mock model uses, fix the model instructions for flashcards and quiz, optionally send formula pages as images and flag their content, and hand the examiner a finished app: a seeded test user and sample subject, a complete README, a licence, a test plan showing requirement coverage, and a documented final check of accessibility, screen width, browsers and real-model quality. Demo mode stays the default; nothing in this epic may break running without keys, accounts or internet.

## Stories

- Story 6.1: Koble Gemini på Vertex AI inn bak språkmodellporten
- Story 6.2: Fastsett instruksene til modellen for flashcards og quiz
- Story 6.3: Send sider med formler som bilde og merk innholdet *(Kan kuttes)*
- Story 6.4: Lag testbruker og eksempelemne med eksempelnotater
- Story 6.5: Fullfør README, legg til lisens og vis testdekningen
- Story 6.6: Gjør den avsluttende kontrollen av universell utforming, skjerm, nettlesere og kvalitet

## Requirements & Constraints

- **Model selection (NFR-4):** one setting picks the model (`LLM_PROVIDER=mock|mock-invalid|vertex`, default `mock`), no code change. The model is called only from the server; keys/project IDs never reach the browser. Secrets live in `.env` outside Git; `.env.example` lists every setting with explanation and no secret values (tested).
- **Data protection (NFR-5):** with the real model, data is processed in the EU/EEA by a provider that does not train on it and has a data processing agreement via its terms; provider caching is disabled on the Google Cloud project (`disableCache`), and README shows how to disable and verify it. Google may log requests for abuse detection; this is accepted and stated in the terms text (NFR-6).
- **Generated content:** Norwegian bokmål; Norwegian terms from the notes as written, English in parentheses when the notes use both («merkevare (brand)»). Quiz: four options, exactly one correct, options roughly equal length, plausible distractors, no «alle de ovenfor» (FR-31). Difficulty: easy = recognise a definition, medium = understand relations, hard = apply to an example.
- **Formulas (cuttable, FR-40/41):** pages whose text lacks formulas are also sent as an image (better one page too many); content from such pages, or where the model reports something missing, is flagged. Verified on *Principles of Economics 3e* PDF pages 127–128.
- **Seed (NFR-3):** test user `test@studiekamerat.no` / `studiekamerat`; subject «Markedsføring» with 2–3 short own-words notes based on OpenStax *Principles of Marketing*, credited and shared under CC BY-NC-SA 4.0; no OpenStax PDF in the repo. Dates computed relative to seed day (lectures in past weeks, exam in three weeks). One or two saved sessions so the overview shows practised and not practised.
- **Startup & docs (NFR-1, SK-11):** app starts from a clean clone following README with copyable commands, without `.env` or accounts. README states demo content is simple/mechanical (proves function, not quality).
- **Licence:** AGPL-3.0 `LICENSE` in repo root because PyMuPDF is AGPL.
- **Test coverage (SK-1):** every must-have FR (FR-1–FR-41, FR-56–FR-58) has a test with the requirement ID in its name or a written reason for manual check in `docs/testplan.md`; a pytest test enforces this.
- **Final checks:** axe with zero violations (NFR-13), no horizontal scroll at 768 px and 200 % text (NFR-14), latest Chrome, Edge (Safari cuttable) (NFR-15), keyboard-only core flow (SK-12). Quality spot checks done manually by Silje against the textbook, not by AI: <5 % factual errors in 50 flashcards (SK-13), ≥95 % correct source (SK-14), 20 quiz questions with one correct option and correct = longest in ≤35 % (SK-15), formulas correct (SK-16, if 6.3 built), ≥80 % of note headings have a card (SK-17). Results as CSV in `docs/kvalitet/`, no personal data.
- **Tests** carry requirement IDs (e.g. `test_ar3_vertex_uses_eu_location`, `test_nfr4_config_has_no_secrets`, `test_fr2_…`, `test_fr31_…`, `test_fr40_…`, `test_fr41_…`, `test_nfr3_…`, `test_ar14_…`, `test_sk1_…`, `test_nfr13_…`).

## Technical Decisions

- **Generation port (AR-3):** only `generation` calls the model, through `generate(kind, pages, options)`; pages carry text and optional page images; every implementation returns the same loose output type. No other module imports pydantic-ai. `MockGenerator` applies the NFR-2a rules independent of instructions; `InvalidMockGenerator` emits invalid items on purpose.
- **`VertexGenerator`:** pydantic-ai (`pydantic-ai-slim[google]`) with `GoogleCloudProvider(location='eu')` and Application Default Credentials (no key file). Never the `global` endpoint (tested). Structured output via `NativeOutput` (Gemini's built-in `responseSchema`) using the same loose schema as the mock. Model and thinking level from `VERTEX_MODEL` (placeholder `gemini-3.5-flash` in `.env.example`; final choice after quality test, issues #3/#4) and `VERTEX_THINKING`. Deviation from the course stack: Vertex AI instead of OpenRouter because of NFR-5.
- **Same pipeline after the call (AR-4):** page text → port → `validate_item(item, pages)` per item → discard and count → save valid items in one transaction. Call failure or a run over 3 minutes (`asyncio.wait_for`) saves nothing; the job becomes `failed` with the existing error code and the UI shows the FR-21 message with «Prøv igjen». No single HTTP request lasts over 30 s; generation always runs as a job.
- **Settings (AR-11, AR-18):** pydantic-settings; `.env` optional. Vertex requires `LLM_PROVIDER=vertex`, `GOOGLE_CLOUD_PROJECT`, `VERTEX_MODEL`; if one is missing, backend refuses to start with a log line naming the missing setting (no secrets). A `docker-compose.override.yml` outside Git (in `.gitignore`) mounts `~/.config/gcloud` read-only into `backend`. `GET /api/config` exposes only `demo_mode` (false with vertex) and feature flags, never project ID or model name. No `NEXT_PUBLIC_` Vertex settings.
- **Testing the real model:** pytest runs with `LLM_PROVIDER=mock`; `VertexGenerator` is tested with pydantic-ai `TestModel`/`FunctionModel` and real calls blocked (`ALLOW_MODEL_REQUESTS = False`).
- **Instructions:** one file per content type in `backend/app/modules/generation/instructions/` (`flashcards.md`, `quiz.md`; epics 7–9 add their own), read by `VertexGenerator`, committed to Git. Each page in the request is labelled with `file_id`, file name and `page_no`; the model must cite these; request includes the max count from scope (10/20/30). Prefer fewer cards over weak filler; spread across note headings.
- **Formula flow (AR-6):** PyMuPDF sets `file_pages.needs_image` at upload (vector drawings or images above a low threshold, documented in a code comment and issue #9). Page images are rendered on demand via `core/storage`, never stored. Schema gets a field like `formula_missing` (mock never sets it). `formula_flag = needs_image OR model-reported`, computed in one place in the pipeline for all content types; applies in demo mode too.
- **Seed (AR-14):** order Alembic → `seed_if_empty` (only `APP_ENV=local`, only on empty DB) → job cleanup → Uvicorn. Uses the normal services in `identity`, `subjects`, `files`, `generation`, `practice`; no raw SQL. Generation always uses the mock model regardless of `LLM_PROVIDER`, awaited (not background), for every registered and enabled content type. On failure: log and delete the test user via normal account deletion so the DB is empty for retry.
- **Logging:** stdout, error codes only; never note text, model responses or passwords.

## UX & Interaction Patterns

- With `demo_mode=false`: no demo badge; the sentence «I demomodus sendes ingenting ut.» disappears from the terms dialog; account page model row «Gemini fra Google, behandlet i EU»; waiting text «Tar vanligvis under to minutter.»; privacy notice on 04: «Notatene sendes til Googles språkmodell i EU.» and «Ikke last opp personopplysninger, f.eks. navn på medstudenter.» (verbatim).
- Formula flag (`formula-flag`): shared component in `frontend/components/` on the note surface with info icon, text «Inneholder formel – sjekk mot kilden» verbatim, directly above the source link; shown during practice, in the quiz explanation and in the missed list; not orange or red; read as text by screen readers; hidden when unflagged.
- 768 px: no horizontal scroll; sidebar and session panel behind the menu button.

## Cross-Story Dependencies

- 6.1 reuses the port, registry, job flow and `job-status` from epic 3 and the config switches from epics 1–3. 6.2 builds on 6.1 (`VertexGenerator` reads instructions). 6.3 extends the schema/instructions from 6.2 and `files` upload from epic 2.
- 6.4 relies on mock generation (epics 3–4), sessions (`practice`, epic 5 overview) and account deletion (story 2.7); epic 7–9 content types join seed automatically when enabled.
- 6.5 collects README sections from 6.1 and 6.4 and creates the test plan used by 6.6. 6.6 needs seed data (6.4), Gemini (6.1, 6.2) and optionally 6.3; it decides the model (issue #4) and sets it only in `.env.example`.
