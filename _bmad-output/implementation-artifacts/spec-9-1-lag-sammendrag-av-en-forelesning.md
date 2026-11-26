---
title: 'Story 9.1: Lag sammendrag av en forelesning'
type: 'feature'
created: '2026-11-26'
status: 'done'
baseline_revision: '0a581f5e65fa81ef1ef6882f2adad46f28d85ce4'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/autonom-kjoring.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-8-1-lag-fritekstsporsmal.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Studenten kan lage flashcards, quiz, modellkort og fritekst, men ikke et sammendrag av forelesningen (FR-53–FR-55). Story 9.1 krever innholdstypen `summary` med egne tabeller, en rad «Sammendrag» i «Lag og øv», sammendraget i slettetellingene og seed, alt bak bryteren `FEATURE_SUMMARY`. Lesesiden kommer i 9.2.

**Approach:** En ny typemodul `generation/summary.py` melder typen inn i registeret (mock-regel, løs modell, `validate_item`, `break_item`, lagring gjennom `content`, instruksfil `instructions/summary.md`, `feature="summary"`). Registeret får tre nye valgfrie egenskaper som bare sammendraget bruker: et minste antall gyldige punkter med egen feilkode, at punkter over taket telles som forkastet, og at lagringen kjenner forelesningen. Migrering 0012 lager `summaries` og `summary_points`. `content` får erstatt-lagring, telling, sletting av hele sammendraget når en fil slettes eller erstattes, og `summary_points` i `content-counts`. Frontenden får `SummaryRow` som starter jobben direkte.

## Boundaries & Constraints

**Always:**
- Bare `content` skriver til tabellene (AR-16). `summaries`: `id`, `lecture_id` (FK `ON DELETE CASCADE`, unik), `created_at`. `summary_points`: `id`, `summary_id` (FK `ON DELETE CASCADE`, indeksert), `theme`, `position`, `text`, `file_id` (FK `ON DELETE CASCADE`, indeksert, som sikkerhetsnett), `page_no`, `formula_flag`. Virker på Postgres og SQLite.
- Jobben går gjennom det vanlige løpet (AR-4). Formelmerket settes av løpet (FR-41). `requested` er alltid 15 (`scopes=(15,)`, ingen dialog).
- `validate_item`: forkast tomt tema, tom tekst, tekst over 50 ord (`len(text.split()) > 50`), eller (fil, side) som ikke finnes. Over 15 gyldige: de 15 første (i fil- og siderekkefølge) lagres, resten telles i `discarded`.
- Under 5 gyldige: jobben blir `failed` med `error_code = TOO_FEW_SUMMARY_POINTS`, ingenting lagres, det gamle sammendraget står. Koden finnes i `ErrorCode` (status 422) og i `messages.ts` med teksten «Notatene ga ikke grunnlag for et sammendrag med minst 5 punkter. Det gamle sammendraget er beholdt.»
- Lagring: det gamle sammendraget slettes og det nye legges inn i samme transaksjon som jobben blir `done` (FR-55). `position` er punktets plass i lista.
- Mock: ett punkt per side, i fil- og siderekkefølge: første setning (`flashcards.sentences`) som tekst, filnavnet som tema, siden som kilde. En side uten setning gir ikke punkt. Samme filer gir samme sammendrag. `existing_keys` er tom (sammendraget erstattes).
- Sletting eller erstatting av en fil sletter hele sammendraget til forelesningen i samme transaksjon, gjennom `content.delete_summaries_for_files`, som `files.service.delete_file` og `store_file` (med `replaces`) kaller før fila slettes.
- Delete-preview: telleren `summaries` (antall sammendrag i forelesningene som har en fil i `file_ids` eller står i `lecture_ids`), alltid registrert. Slettebekreftelsen: 1 → «sammendraget av forelesningen», flere → «sammendragene av N forelesninger», alltid sist; for en fil etter « laget fra fila». Kontoteksten tar med «sammendrag».
- Raden «Sammendrag»: uten sammendrag «Ikke laget» og omrissknappen «Lag sammendrag», som starter jobben direkte; med sammendrag «N punkter» (1 → «1 punkt») og ingen knapp (lenken kommer i 9.2). Tekster: «Lager sammendrag …», «Venter til sammendraget er ferdig», feil «Vi klarte ikke å lage sammendraget. Ingenting er lagret. Prøv igjen.» med «Prøv igjen», for `TOO_FEW_SUMMARY_POINTS` meldingen over med «Prøv igjen», ferdig «Sammendraget er ferdig: N punkter i [forelesning].». Aldri «færre enn valgt». Uten filer er knappen ikke aktiv.
- Instruks `instructions/summary.md` med alle punktene i akseptkriteriet, og de felles formuleringene som `test_instructions.py` krever av alle typer.
- Seed: AIDA-notatet deles over minst 5 sider med en sideskiftlinje (`---`) i kildeteksten; teksten er uendret. Bare forelesningen «AIDA-modellen» får sammendrag. Med bryteren av lages ingen.
- `FEATURE_SUMMARY=false`: raden vises ikke, `POST …/jobs` med `kind: "summary"` gir `404 FEATURE_DISABLED`, seed lager ikke sammendrag.
- Tester har krav-ID i navnet. Ingen test kaller Vertex AI eller Gemini. Kode og kommentarer på engelsk, tekster i appen på bokmål.

**Never:**
- Ingen sammendragsside, ingen `GET …/summary` og ingen «Les sammendrag»/«Lag nytt sammendrag» (story 9.2).
- Ingen endring i «øvd» eller økter (FR-56).
- Ikke endre planleggingsdokumentene, `CLAUDE.md`, `.claude/settings.json` eller `frontend/e2e-skjermbilder/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mock, 6 sider | Én fil `a.pdf`, 6 sider med tekst | 6 punkter, tema «a.pdf», tekst = første setning, side 1–6 | – |
| Over 15 | 18 gyldige punkter | 15 lagres, `discarded` = 3 | – |
| Under 5 | Fil med 3 sider | `failed`, `TOO_FEW_SUMMARY_POINTS`, gammelt sammendrag står | – |
| Ugyldig punkt | Tomt tema/tekst, 51 ord, side 9999 | Forkastes og telles | `discarded` +1 |
| Nytt sammendrag | Forelesningen har ett fra før | Det gamle er borte, det nye står, alltid ett | – |
| Feil eller tidsgrense | Porten kaster / over 3 min | Ingenting lagret, gammelt står | `failed` |
| Fil slettes | To filer, sammendrag med punkter fra begge | Hele sammendraget slettes med fila | – |
| Bryter av | `FEATURE_SUMMARY=false` | `404 FEATURE_DISABLED`, raden borte, seed lager ingen | – |

</intent-contract>

## Code Map

- `backend/app/modules/generation/registry.py` -- `ContentType`: legg til `min_items: int = 0`, `too_few_error: ErrorCode | None = None`, `surplus_discarded: bool = False`; `_BUILTIN_ORDER` og `_ensure_builtin_types` får `summary`.
- `backend/app/modules/generation/port.py` `GenerationOptions` -- legg til `lecture_id: uuid.UUID | None = None` (brukes av `summary.save`).
- `backend/app/modules/generation/service.py` `_generate_and_save` (~l. 189–250) -- sett `lecture_id`; tell overskudd som forkastet når `surplus_discarded`; kast en egen feil når `len(kept) < min_items`, og la `run_job` merke jobben med `too_few_error`.
- `backend/app/modules/generation/freetext.py`, `model_cards.py` -- mønster for typemodul; `flashcards.sentences` gjenbrukes.
- `backend/app/modules/generation/vertex.py` `instructions_for` / `output_wrapper` -- virker for nye typer uten endring; `instructions/freetext.md` er mal.
- `backend/app/core/errors.py` -- `TOO_FEW_SUMMARY_POINTS` (422, lagres på jobben); `frontend/lib/messages.ts` må ha samme nøkkel (test sjekker).
- `backend/app/modules/content/models.py`, `service.py`, `registry.py`, `schemas.py`, `router.py` -- `Summary`, `SummaryPoint`, `NewSummaryPoint`, `replace_summary`, `summary_point_count`, `count_summaries`, `delete_summaries_for_files`; teller `summaries` etter `freetext_questions`; `ContentCounts.summary_points`.
- `backend/app/modules/files/service.py` `delete_file` (l. 162) og `store_file` (l. 52) -- kall `delete_summaries_for_files` før fila slettes.
- `backend/alembic/versions/0011_create_freetext_questions.py` -- mønster for `0012_create_summaries.py`.
- `backend/app/seed/service.py` `LECTURES`, `_fill` -- typer som en forelesning hopper over; `backend/app/seed/build_notes.py` -- sideskift `---`; `notater/aida.md/.pdf`, `notater/LISENS.md` uendret.
- `backend/tests/test_freetext.py`, `test_seed.py`, `test_instructions.py`, `test_migrations.py`, `test_testplan.py`, `test_account_delete.py` -- mønster og tester som må utvides.
- `frontend/modules/generation/types.ts`, `texts.ts`, `components/generation-row.tsx` (direkte start uten dialog, egen tom-tekst), `components/create-row.tsx` (skjul handlingene med innhold), ny `components/summary-row.tsx`.
- `frontend/modules/subjects/pages/lecture-page.tsx:265` -- `SummaryRow` etter fritekst når `feature_summary === true`.
- `frontend/lib/messages.ts` `countNouns`, `frontend/lib/delete-text.ts` `alsoDeletedSentence`, `accountDeletedText`.
- `frontend/e2e/universell-utforming.spec.ts:305` -- sammendraget `built: true` (#301); `frontend/e2e/fritekst.spec.ts` -- mal for `e2e/sammendrag.spec.ts`; `e2e/testbruker.spec.ts:85` -- kilde «side \d+».
- Kontoteksten: `frontend/e2e/konto.spec.ts`, `e2e/brukerreiser/flyt-4-*.spec.ts`, `frontend/lib/delete-text.test.ts`, `docs/testing/brukerreiser.md`.
- `README.md` (brytere), `docs/testplan.md`.

## Tasks & Acceptance

**Execution:**
- `backend/alembic/versions/0012_create_summaries.py` -- tabellene -- AR-7, AR-13.
- `backend/app/core/errors.py` -- `TOO_FEW_SUMMARY_POINTS` -- AR-4, AR-12.
- `backend/app/modules/content/*` -- modeller, `replace_summary`, tellinger, `delete_summaries_for_files`, registrering, `summary_points` i `content-counts` -- AR-16, FR-12, FR-55.
- `backend/app/modules/files/service.py` -- kall sletting av sammendrag ved sletting og erstatting -- AR-7, E15.
- `backend/app/modules/generation/registry.py`, `port.py`, `service.py` -- `min_items`, `too_few_error`, `surplus_discarded`, `lecture_id` -- FR-53.
- `backend/app/modules/generation/summary.py`, `instructions/summary.md` -- typen og instruksen -- FR-2, FR-39, FR-53, FR-54, NFR-2a.
- `backend/app/seed/build_notes.py`, `notater/aida.md`, `notater/aida.pdf`, `seed/service.py` -- sideskift, AIDA over 5 sider, sammendrag bare for AIDA -- NFR-3, AR-14.
- `backend/tests/test_summary.py` + berørte tester -- alle radene i matrisen, 202, 409, bryter av, slettetelling, sletting av fil og erstatting (ikke halvt), kaskade fra forelesning, emne og konto, `content-counts`, migrering, instruks og løst skjema, seed med og uten bryter.
- `frontend/modules/generation/*`, `components/create-row.tsx`, `lib/messages.ts`, `lib/delete-text.ts`, `modules/subjects/pages/lecture-page.tsx` -- rad, tekster, slettetekst.
- Vitest -- raden (ikke laget, N punkter, ingen knapp med innhold, direkte start, venting, feil og «Prøv igjen», TOO_FEW-teksten, bryter av), tekstene, slettetekstene.
- `frontend/e2e/sammendrag.spec.ts` -- med bare tastatur: «Lag sammendrag» på en fil med 6 sider gir «6 punkter», venteteksten i de andre radene, en fil med 3 sider gir TOO_FEW-meldingen og «Prøv igjen», slettebekreftelsen nevner sammendraget; axe i 1280 og 768 px.
- `frontend/e2e/universell-utforming.spec.ts` -- sammendraget kreves når bryteren er på (#301).
- `README.md`, `docs/testplan.md`, `docs/testing/brukerreiser.md` -- bryteren, kravene, kontoteksten.

**Acceptance Criteria:**
- Given en forelesning med en fil på 6 sider og bryteren på, when studenten trykker «Lag sammendrag», then svarer API-et 202, raden viser «Lager sammendrag …», de andre radene «Venter til sammendraget er ferdig», og etterpå «6 punkter».
- Given en forelesning med sammendrag, when studenten sletter en fil, then nevner bekreftelsen «sammendraget av forelesningen», og ingen punkter er igjen etterpå.
- Given `APP_ENV=local`, tom database og bryteren på, when seed kjører, then har «AIDA-modellen» et sammendrag med minst 5 punkter; med bryteren av har ingen det.

## Spec Change Log

## Review Triage Log

### 2026-11-26 — Review pass
- verdicts: 22 findings — high 0, medium 2, low 15, false 5, maybe-false 0
- findings:
  - Blind Hunter
    - `[medium]` `[patch]` Løpet sorterer punktene etter fil og side, så punkter om samme tema fra sider som ikke står etter hverandre, blir splittet — `summary.by_theme` samler dem etter tema (temaene i rekkefølgen de først dukker opp) før lagring; `test_fr53_punktene_lagres_samlet_etter_tema`.
    - `[false]` `[reject]` Over 15 punkter beholder bare de første etter side — Silje avgjorde 2026-11-14 at de 15 første beholdes.
    - `[low]` `[reject]` TOO_FEW-meldingen sier «Det gamle sammendraget er beholdt» også første gang — teksten er godkjent ordrett av Silje (epics.md, «Avgjort av Silje 2026-11-14»); å endre den krever henne. Nevnt i PR-en.
    - `[low]` `[reject]` Med sammendrag har raden ingen knapp, så det kan ikke erstattes fra appen — storien sier at lenken kommer i 9.2, og «Lag nytt sammendrag» er 9.2.
    - `[medium]` `[patch]` Seedet sammendrag fikk et punkt fra kildelinja (siste side var bare «# Kilde») — AIDA-notatet har nå «Kilde» på samme side som lista, og «Oppmerksomhet» og «Interesse» på hver sin side; teksten er uendret. Plassholderpunktet på side 1 står, fordi plassholdermerket skal stå øverst (#13).
    - `[low]` `[patch]` Sletteteksten «sammendraget av forelesningen» er uklar for emne og konto — gir nå «sammendraget av 1 forelesning» utenfor fil og forelesning; test i `delete-text.test.ts`.
    - `[low]` `[reject]` Sammendraget merkes ikke som gammelt når en ny fil lastes opp — storien krever bare sletting ved sletting og erstatting; «Lag nytt sammendrag» kommer i 9.2.
    - `[false]` `[reject]` KI-sporet mangler — føres i samme økt etter gjennomgangen, før PR-en.
    - `[low]` `[patch]` Seed har en fast liste over typer per forelesning, og en docstring-linje var for lang — linja er brutt om; lista beholdes fordi den er tydelig og testet, og å lese `min_items` mot sidetall ville koble seed til mock-regelen.
    - `[low]` `[reject]` Lista over typer uten dialog står både i `isScoped` og `ScopedJobKind` — tsc fanger en ny type som mangler i typen, og en felles kilde er omskriving uten feil å rette.
    - `[low]` `[reject]` En TOO_FEW-jobb lagrer ikke antall forkastede — slik er alle feilede jobber; ingen visning bruker tallet.
    - `[low]` `[reject]` Ingen unik regel på `(summary_id, position)` — bare `replace_summary` skriver, med `enumerate`; ny regel uten feil å rette.
  - Edge Case Hunter
    - `[medium]` `[patch]` Tema splittes når temaene går over sider som ikke står etter hverandre — samme rot som første funn; rettet med `by_theme`.
    - `[low]` `[reject]` TOO_FEW-meldingen nevner et gammelt sammendrag som kanskje ikke finnes — samme som over; Siljes ordrette tekst.
    - `[low]` `[reject]` Et notat med bare `---` gir et PDF-dokument uten sider og en uklar feil — gjelder bare utviklere som bygger notatene; ingen slik fil finnes.
    - `[low]` `[reject]` Modellen kan gjenta samme punkt — som dublettene for de andre typene (ført i spec-8-1 og 7-1); ikke innført her.
    - `[low]` `[reject]` Svært lange tematitler godtas — kontrollreglene i storien nevner bare tomt tema; en ny regel ville gå utover FR-53.
    - `[low]` `[reject]` AIDA har akkurat 5 sider, så en endring kan få seed til å feile — `test_fr53_seed_makes_summary_for_aida_only_with_switch_on` feiler da i pytest før noe flettes.
  - Intent Alignment
    - `[medium]` `[patch]` (a) «Ordnet etter tema» holdt ikke for den ekte modellen — samme rot som første funn; rettet.
    - `[false]` `[reject]` (b) Studenten ser bare antallet i 9.1 — akseptkriteriet sier at lenken til sammendragssiden kommer i 9.2.
    - `[false]` `[reject]` (c) Erstatting kan bare nås gjennom API-et — «Lag nytt sammendrag» er 9.2; TOO_FEW-teksten er Siljes.
    - `[false]` `[reject]` (d) Endringer utenfor selve sammendraget (sideskift i notatbyggeren, `side \d+`, nye felt i registeret) — nødvendige for seed-kriteriet og standardverdiene gir samme oppførsel for de andre typene (test).
  - Verification Gap
    - (ingen funn)

## Design Notes

- **Minste antall i registeret:** `min_items` og `too_few_error` gjør regelen generell uten at løpet kjenner sammendrag. Løpet kaster `TooFewItemsError(code)` etter valideringen; `run_job` merker jobben med koden, akkurat som `GENERATION_TIMEOUT`.
- **Raden uten dialog:** `GenerationRow` får `direct` (start med typens eneste omfang) og `emptyText`; `CreateRow` får `contentActions={false}` slik at «Lag flere»/«Øv nå» ikke vises med innhold.
- **Sletting av fil:** `delete(Summary).where(Summary.lecture_id.in_(select(File.lecture_id).where(File.id.in_(file_ids))))` kjøres før fila slettes, i samme transaksjon.

## Verification

**Commands:**
- `cd backend && uv run pytest && uv run ruff check . && uv run mypy app` -- expected: alle grønne.
- `cd frontend && npm run test && npm run lint && npx tsc --noEmit` -- expected: alle grønne.
- `cd frontend && npx playwright test` mot `docker compose up --build -d` -- expected: alle grønne.

## Auto Run Result

**Status:** done

**Hva som er bygd:** innholdstypen `summary` i registeret, med mock-regel (første setning per side, filnavnet som tema), kontroll før lagring (tomt tema eller tekst, over 50 ord, side som ikke finnes), minst 5 og høyst 15 punkter, `TOO_FEW_SUMMARY_POINTS`, instruks for Gemini og bryteren `FEATURE_SUMMARY`. Sammendraget lagres i `summaries` og `summary_points` (migrering 0012) gjennom `content`, erstatter det gamle i én transaksjon, samles etter tema, slettes helt når en fil slettes eller erstattes, telles i slettebekreftelsen og i `content-counts`, og seed lager det for «AIDA-modellen». Forelesningssiden har raden «Sammendrag» som starter jobben uten dialog.

**Filer:**
- `backend/alembic/versions/0012_create_summaries.py` -- tabellene.
- `backend/app/core/errors.py` -- `TOO_FEW_SUMMARY_POINTS`.
- `backend/app/modules/content/*` -- modeller, `replace_summary`, tellinger, `delete_summaries_for_files`, `summary_points`.
- `backend/app/modules/files/service.py` -- sletter sammendraget ved sletting og erstatting.
- `backend/app/modules/generation/registry.py`, `port.py`, `service.py` -- `min_items`, `too_few_error`, `surplus_discarded`, `lecture_id`.
- `backend/app/modules/generation/summary.py`, `instructions/summary.md` -- typen og instruksen.
- `backend/app/seed/*` -- sideskift i notatbyggeren, AIDA over fem sider, sammendrag bare for AIDA.
- `frontend/modules/generation/*`, `frontend/components/create-row.tsx`, `frontend/lib/*`, `frontend/modules/subjects/pages/lecture-page.tsx` -- raden, tekstene, sletteteksten.
- `frontend/e2e/sammendrag.spec.ts`, `universell-utforming.spec.ts` (#301), `konto.spec.ts`, flyt 4, `testbruker.spec.ts`.
- `README.md`, `docs/testplan.md`, `docs/testing/brukerreiser.md`.

**Gjennomgang:** 22 funn. 4 rettet (2 medium, 2 lav: tema samlet, ingen kildelinje-punkt i seed, slettetekst for emne og konto, docstring), ingen utsatt, resten avvist med grunn i loggen over.

**followup_review_recommended:** false. To medium-funn ble rettet; begge er dekket av nye tester (`test_fr53_punktene_lagres_samlet_etter_tema`, seed-testen) og en full kjøring etterpå. Ingen uverifisert risiko gjenstår.

**Verifisering:** `uv run pytest` 1000 bestått, `ruff` rent; `npm run test` 1064 bestått, `npx tsc --noEmit` rent; `npx playwright test` mot `docker compose up --build -d` 208 bestått og 4 hoppet over (seed-testene); seed-testene med `E2E_REQUIRE_SEED=1` mot `sk-seedtest` 10 bestått. `mypy` er ikke en del av prosjektets avhengigheter og ble ikke kjørt; frontenden har ikke noe `lint`-skript.

**Gjenstående risiko:** TOO_FEW-meldingen sier «Det gamle sammendraget er beholdt» også første gang (Siljes tekst, #357). Sammendraget kan ikke leses eller lages på nytt fra raden før story 9.2.
