# Epic 7 Context: Huskeregler (bør ha)

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let the student press «Lag modellkort» on a lecture and get one model card per model or list in her notes (for example AIDA), with a mnemonic made from the first letter of each point, then practise those cards mixed into the ordinary flashcard session and replace or add her own mnemonic. Model cards are flashcards (`kind = "model"`) and plug into the generation pipeline and session frame built in epic 3, so this epic adds a content type, not a new engine. It is the first should-have epic to be built and the last to be cut, and everything sits behind the `FEATURE_MNEMONICS` switch.

## Stories

- Story 7.1: Lag modellkort fra en forelesning
- Story 7.2: Øv på modellkort og endre huskeregelen

## Requirements & Constraints

- **Generation (FR-42):** the app finds models and lists and makes one model card each: front asks the student to explain the model, back shows the points and the mnemonic. New cards are added to existing ones (FR-22). Real model writes the front as «Forklar …», keeps the points in note order, cites the PDF page number, writes Norwegian bokmål using the note terms with English in parentheses when the notes use both.
- **Mnemonic rule (FR-43/44):** mnemonic = first letter of each point, uppercase, in note order. If all points start with the same letter (like the four P's), the card is saved with an empty `mnemonic`.
- **Validation before saving (FR-45, FR-38, SK-10):** discard and count a card if the mnemonic's letters (letters only, case-insensitive, æ/ø/å count as letters) are not exactly the points' first letters in order, or the mnemonic is missing when letters differ; also if the front is empty, it has fewer than three points, any point is empty, or the page does not exist in the file. The three-point minimum applies to the real model too. No separate message when some cards are discarded.
- **Nothing found (FR-47):** a finished job that saved no cards shows verbatim «Vi fant ingen modeller eller lister i denne forelesningen.» in a live region. It is not an error: job status `done`, no «Prøv igjen».
- **Failure (FR-21):** model error or a run over 3 minutes saves nothing; `job-status` shows «Vi klarte ikke å lage modellkortene. Ingenting er lagret. Prøv igjen.» with «Prøv igjen».
- **Mock model (NFR-2a, NFR-2):** a line followed by three or more consecutive lines starting with a bullet or number, all on one page, becomes one model card: front «Forklar [linja rett over lista].», points = list lines without bullet/number in order, source = that page, mnemonic per FR-43/44. Same file gives the same cards every time. On repeat «Lag modellkort», the mock skips cards whose front already exists on the lecture (as for flashcards).
- **Own mnemonic (FR-46):** student can replace the mnemonic or add one where none exists. Student edits are checked only for empty/blank, never against the first letters (AR-4). Saving does not change the card's marking in the session.
- **Practice (FR-23–FR-27, FR-56):** model cards are shuffled in with other flashcards from «Øv nå» or «Øv på hele emnet»; marked «Kunne»/«Kunne ikke» like any card (`1`/`2`); session saved as `kind = "flashcards"` with model cards counted in `shown`, `correct`, `wrong`. No separate model-card result. «Rediger» edits front and points (one point per line) with the epic 3 editing; «Slett» uses the normal delete confirmation.
- **Deleting (FR-12–FR-14):** delete-preview counts model cards separately from other flashcards.
- **Seed (NFR-3):** with `FEATURE_MNEMONICS` on, seed makes model cards for at least one sample lecture via normal services and the mock; sample notes contain at least one list with differing first letters and one where all share a letter. Switch off: seed makes none.
- **Keyboard and accessibility (NFR-8, NFR-10, NFR-13):** everything doable by keyboard (flip, mark, change mnemonic, save, cancel); shortcuts inactive while focus is in a text field; no axe violations on the lecture page, the session with a model card, or the mnemonic dialog.
- **Tests** carry requirement IDs: `test_fr42_…`, `test_fr43_…`, `test_fr45_…`, `test_fr46_…`, `test_fr47_…`; an `LLM_PROVIDER=mock-invalid` test shows invalid model cards are discarded and valid ones saved (SK-4). README's switch list explains `FEATURE_MNEMONICS`.

## Technical Decisions

- **Data:** an Alembic migration adds `points` (JSON list of text) and `mnemonic` (text, may be empty) to `flashcards`; must run on both Postgres and SQLite. Model cards are stored as `flashcards` rows with `kind = "model"`, `front`, `points`, `mnemonic`, `file_id`, `page_no`, `formula_flag`. Only the `content` module writes to the table (AR-16).
- **Content-type registry:** register `models` (generator rule, validator, storage) in the epic 3 registry. `POST /api/lectures/{id}/jobs` with `kind: "models"` returns `202`; a running job on the lecture gives `409 JOB_ALREADY_RUNNING`. Jobs run through the shared pipeline (AR-4): page text → port `generate(kind, pages, options)` → `validate_item(item, pages)` per card → discard and count → save valid ones in one transaction. `formula_flag` is computed by the existing pipeline step.
- **Vertex:** add a model-card instruction file next to the epic 6 instructions (`backend/app/modules/generation/instructions/`) and a loose output schema for models; a test without Google calls checks both exist for `models`.
- **Delete preview / cascade (AR-7):** register model cards in the epic 2 delete-preview registry; they are deleted with the file via `ON DELETE CASCADE`.
- **Feature switch (AR-11):** `FEATURE_MNEMONICS` read by pydantic-settings; frontend reads it from `GET /api/config`. Off: «Lag modellkort» hidden, `POST …/jobs` with `kind: "models"` and `PATCH` with `mnemonic` return `404 FEATURE_DISABLED`. Existing model cards still appear in sessions as model cards but without «Endre huskeregel»/«Legg til huskeregel».
- **Editing API:** `PATCH /api/flashcards/{id}` accepts `mnemonic`; empty or blank is rejected with the same empty-field error code that card editing uses from epic 3 (AR-12 error format).

## UX & Interaction Patterns

- **Lecture page, «Lag og øv»:** text button «Lag modellkort» sits on the Flashcards row (beside «Lag flere»), shown both with and without flashcards, starts the job directly with no dialog (UX-DR18, UX-DR24). Inactive without files. No separate Huskeregler row; the Flashcards row count includes model cards. (Sketch 04 placing it elsewhere is outdated.)
- **Job status (UX-DR19):** while running, `job-status` shows a spinner, «Lager modellkort …» and «Du kan bruke resten av appen imens.»; other «Lag …» buttons are inactive and say «Venter til modellkortene er ferdige». Announced at start and end.
- **Delete confirmation (UX-DR22):** e.g. «Dette sletter også 18 flashcards, 11 quizspørsmål og 2 modellkort laget fra fila. Det kan ikke angres.» «Avbryt» has initial focus.
- **Model card (`model-card`, UX-DR28, sketch 11):** same white card as the flashcard (768 px, `rounded.xl` 16 px, float shadow), overlines SPØRSMÅL («Forklar AIDA-modellen») and SVAR. The back shows the points as rows, each with a letter box in front (A, I, D, A) joined by a thin vertical line; English term in weight 600 with the Norwegian translation in parentheses, e.g. «Attention» «(oppmerksomhet)». Below, the mnemonic on the note surface (`note-surface`, `surface-note` #F0EFE9, info icon, muted text) labelled «Huskeregel:», e.g. «AIDA. Kunden går fra oppmerksomhet til handling, i denne rekkefølgen.» At the bottom the source link («merkevare-notater.pdf, side 9») and text button «Endre huskeregel» with a pencil icon; without a mnemonic only the points show and the button reads «Legg til huskeregel». Formula flag shown as on other cards. Buttons «Kunne ikke» / «Kunne» and shortcut hints (Mellomrom snu kortet, Esc avslutt) as for flashcards.
- **Screen readers (UX-DR45):** points are an ordered list; letter boxes are hidden from screen readers so each point is read once; `lang="en"` on English terms.
- **Mnemonic dialog (UX-DR21, UX-DR25):** field «Huskeregel» with visible label, prefilled with the current mnemonic, buttons «Avbryt» then «Lagre». Focus trapped; Esc or «Avbryt» closes without change and returns focus to the opening button. Empty/blank on «Lagre»: nothing saved, red border, «Skriv inn en huskeregel.» under the field, focus moves to the field. Saved mnemonic shows on the card immediately.

## Cross-Story Dependencies

- 7.1 reuses the generation pipeline, content-type registry, job flow, `job-status` and mock/invalid-mock generators from epic 3, the delete-preview registry and cascade from epic 2, the instruction folder and `VertexGenerator` from epic 6, `formula-flag` (6.3) and the seed flow (6.4).
- 7.2 depends on 7.1 (columns and stored model cards) and reuses the epic 3 session frame, `flashcard` component, card editing and its empty-field error code, `note-surface`, source link, dialog, `text-field` and delete confirmation.
