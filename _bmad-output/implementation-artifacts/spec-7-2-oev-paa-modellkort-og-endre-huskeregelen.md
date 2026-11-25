---
title: 'Story 7.2: Øv på modellkort og endre huskeregelen'
type: 'feature'
created: '2026-11-25'
status: 'done'
baseline_revision: 'a557de7e8fffd953a5c518d24623c176e7a6110c'
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

**Problem:** Story 7.1 lagrer modellkort (`kind="model"`, `points`, `mnemonic`), men de vises ikke i flashcard-økten, kan ikke redigeres, og studenten kan ikke bytte eller legge til huskeregel (FR-42, FR-46, FR-23–FR-27, FR-56, UX-DR28).

**Approach:** Kortlistene for forelesning og emne tar med modellkort med `points` og `mnemonic`, og `PATCH /api/flashcards/{id}` godtar `points` og `mnemonic` for modellkort. I økten viser en ny `ModelCard`-visning (skisse 11) baksiden, og en ny dialog «Endre huskeregel»/«Legg til huskeregel» lagrer huskeregelen. Markering, lagring av økten, «Rediger» og «Slett» er de samme som for andre flashcards.

## Boundaries & Constraints

**Always:**
- Bare `content` skriver til `flashcards` (AR-16). Studentens tekst sjekkes bare for tomt felt, aldri mot forbokstavene eller `validate_item` (AR-4). Tekst trimmes i endene.
- `PATCH` med `mnemonic` når `FEATURE_MNEMONICS=false` gir `404 FEATURE_DISABLED` før kortet slås opp (AR-11). `front` og `points` kan rettes også når bryteren er av.
- Tom eller blank `mnemonic`, og `points` uten et eneste ikke-tomt punkt, gir `422 FLASHCARD_BACK_REQUIRED` — den samme feilkoden for tomme felt som epic 3 bruker for svaret (AR-12). Dialogen viser sin egen tekst «Skriv inn en huskeregel.» for denne koden.
- Økten lagres som `kind="flashcards"`; modellkort telles i `shown`, `correct`, `wrong` som andre kort (FR-56). Ingen eget resultat.
- Tekster ordrett: «Huskeregel:», «Endre huskeregel», «Legg til huskeregel», feltet «Huskeregel», «Avbryt», «Lagre», «Skriv inn en huskeregel.».
- Punktene er en `<ol>`; bokstavboksene har `aria-hidden="true"`.
- Tester har krav-ID i navnet. Ingen test kaller Vertex AI. Kode og kommentarer på engelsk.

**Never:**
- Ingen egen øktype eller eget panel «Huskeregler» (skisse 11 er utdatert der; PRD FR-56 sier modellkort er flashcards).
- Ikke regn ut huskeregelen på nytt når punktene rettes.
- Ikke endre planleggingsdokumentene, `CLAUDE.md` eller `frontend/e2e-skjermbilder/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Liste med modellkort | Forelesning med qa, concept og model | Alle tre i `GET …/flashcards`; modellkort har `back: null`, `points`, `mnemonic` | – |
| Ny huskeregel | `PATCH {mnemonic: "  Alle I Dag Allerede  "}` | 200, lagret trimmet, kortet i økten viser den med en gang, markeringen uendret | – |
| Tom huskeregel | `{mnemonic: "   "}` eller `null` | Ingenting lagret | 422 `FLASHCARD_BACK_REQUIRED`; dialog: rød kant, «Skriv inn en huskeregel.», fokus i feltet |
| Bryter av | `FEATURE_MNEMONICS=false`, `{mnemonic: "X"}` | Ingenting lagret | 404 `FEATURE_DISABLED` |
| Rette punkter | `{points: [" A ", "", "B"]}` | Lagret `["A", "B"]`, huskeregel uendret | – |
| Tomme punkter | `{points: ["", "  "]}` eller `[]` | Ingenting lagret | 422 `FLASHCARD_BACK_REQUIRED` |
| Feil felt for typen | `back` på modellkort, `points`/`mnemonic` på qa-kort | Ingenting lagret | 422 `VALIDATION_ERROR` |
| Uten huskeregel | `mnemonic: null` | Bare punktene, knappen «Legg til huskeregel», dialogfeltet tomt | – |
| Punkt med parentes | «Attention (oppmerksomhet)» | «Attention» i 600, «(oppmerksomhet)» dempet | – |
| Punkt med kolon | «Produkt: varen …» | «Produkt» i 600, resten vanlig | – |

</intent-contract>

## Code Map

- `backend/app/modules/content/schemas.py` -- `FlashcardOut` (`kind` qa/concept, `back: str`), `FlashcardUpdate` (front/back). Utvides.
- `backend/app/modules/content/service.py` -- `lecture_flashcards`, `subject_flashcards` filtrerer `PLAIN_FLASHCARD_KINDS`; `get_flashcard` gir 404 for modellkort; `update_flashcard` (trim, `FLASHCARD_*_REQUIRED`); `_flashcard_out`; `first_flashcard_times` (øvd-regelen for økter over hele emnet). `flashcard_count`/`count_flashcards` forblir qa/concept (egne felt for modellkort fra 7.1).
- `backend/app/modules/content/models.py` -- `FLASHCARD_KINDS`, `PLAIN_FLASHCARD_KINDS`, `MODEL_CARD_KIND`.
- `backend/app/modules/content/router.py:88` `edit_flashcard` -- bryteren sjekkes her når `mnemonic` er sendt (mønster: `generation/router.py:80`).
- `backend/app/core/errors.py` -- `FLASHCARD_BACK_REQUIRED`, `FEATURE_DISABLED`, `VALIDATION_ERROR`; ingen ny kode.
- Tester som slår fast at modellkort holdes utenfor, og må snus: `backend/tests/test_flashcards.py:50`, `test_subject_flashcards.py:95`, `test_edit_flashcards.py:178`, `test_overview.py:383`.
- `frontend/modules/practice/types.ts` -- `Flashcard` blir en union av vanlig kort og `ModelCard`.
- `frontend/modules/practice/api.ts` -- `FlashcardUpdateInput` får `points`, `mnemonic`.
- `frontend/modules/practice/components/flashcard.tsx` -- kortrammen (forside, «Snu kortet», bunnfelt, «Kunne»/«Kunne ikke», hint). Baksiden byttes ut for modellkort; bunnfeltet får «Endre/Legg til huskeregel» før «Rediger».
- `frontend/modules/practice/components/edit-flashcard-dialog.tsx` -- «Rediger kortet»; for modellkort «Punkter» (ett per linje) i stedet for «Svar».
- `frontend/modules/practice/pages/flashcard-session-page.tsx` -- `cardSaved` fletter bare front/back; legger til huskeregeldialogen og `useAppConfig`.
- `frontend/components/note-surface.tsx` (Info-ikon), `text-field.tsx`, `dialog.tsx`, `source-link.tsx`, `formula-flag.tsx` -- gjenbrukes.
- `frontend/modules/generation/components/flashcards-row.tsx:35` -- `practiceCountOf` holder modellkort utenfor «Øv nå»; fjernes.
- `frontend/modules/subjects/next-step.ts` -- `firstKind` teller bare `flashcards`; modellkort skal telle som kort.
- `frontend/e2e/modellkort.spec.ts:93` -- forventer at «Øv nå» ikke er aktiv; snus. Ny økttest her.
- `frontend/e2e/pdf.ts`, `e2e/brukerreiser/felles.ts` -- hjelpere for PDF, bruker, emne, axe.
- `docs/testplan.md:73,90` -- FR-46 og SK-10.

## Tasks & Acceptance

**Execution:**
- `backend/app/modules/content/schemas.py` -- `FlashcardOut`: `kind` qa/concept/model, `back: str | None`, `points: list[str] | None`, `mnemonic: str | None`; `FlashcardUpdate`: `points`, `mnemonic` -- FR-42, FR-46.
- `backend/app/modules/content/service.py` -- listene og `get_flashcard` tar med alle `FLASHCARD_KINDS`; `update_flashcard` håndterer typene og tomme felt; `first_flashcard_times` teller modellkort -- FR-23, FR-27, FR-46, FR-56, AR-4.
- `backend/app/modules/content/router.py` -- 404 `FEATURE_DISABLED` når `mnemonic` er sendt og bryteren er av -- AR-11.
- `backend/tests/test_model_card_practice.py` -- ny: lister, PATCH (huskeregel, punkter, tomme felt, feil felt, bryter, andres kort), sletting, øvd for emneøkt -- `test_fr42_…`, `test_fr46_…`, `test_fr56_…`.
- `backend/tests/test_flashcards.py`, `test_subject_flashcards.py`, `test_edit_flashcards.py`, `test_overview.py` -- snu de fire testene som krevde at modellkort holdes utenfor.
- `frontend/modules/practice/types.ts`, `api.ts` -- union og input.
- `frontend/modules/practice/components/model-card-back.tsx` (+ test) -- punktene med bokstavbokser og linje, huskeregel på `NoteSurface` med Info-ikon -- UX-DR28, UX-DR45.
- `frontend/modules/practice/components/flashcard.tsx` (+ test) -- modellkortets bakside og huskeregelknappen -- UX-DR20, UX-DR28.
- `frontend/modules/practice/components/mnemonic-dialog.tsx` (+ test) -- dialogen -- UX-DR21, UX-DR25, E33.
- `frontend/modules/practice/components/edit-flashcard-dialog.tsx` (+ test) -- «Punkter» for modellkort -- FR-27, FR-42.
- `frontend/modules/practice/pages/flashcard-session-page.tsx` (+ test) -- dialogen, bryteren, fletting av lagret kort -- FR-46, AR-11.
- `frontend/modules/generation/components/flashcards-row.tsx`, `generation-row.tsx`, `modules/subjects/next-step.ts` (+ tester) -- «Øv nå» og «Neste å øve på» med bare modellkort.
- `frontend/e2e/modellkort.spec.ts` -- økt med modellkort: tastatur, huskeregel, tomt felt, Esc, axe, lagret økt.
- `docs/testplan.md` -- FR-46 og SK-10.

**Acceptance Criteria:**
- Given en forelesning med flashcards og modellkort, when studenten starter «Øv nå» eller «Øv på hele emnet», then kommer modellkortene i økten i tilfeldig rekkefølge med SPØRSMÅL «Forklar …», og baksiden vises først etter Mellomrom, klikk eller «Snu kortet».
- Given et snudd modellkort, when det vises, then står punktene som `<ol>` med bokstavbokser (skjult for skjermleser) og loddrett linje, «Huskeregel:» på merknadsflaten, eventuelt formelmerke, kilden, og knappene «Endre huskeregel», «Rediger», «Slett».
- Given et snudd modellkort, when studenten trykker `1`/`2` eller knappene, then oppfører det seg som et vanlig kort, og økten lagres som `flashcards` med modellkortet talt med.
- Given huskeregeldialogen, when den åpnes med tastaturet, then har feltet «Huskeregel» fokus og dagens huskeregel; `2` og Mellomrom i feltet skriver tekst; Esc og «Avbryt» lukker uten endring og gir fokus tilbake til knappen; «Lagre» viser den nye huskeregelen på kortet med en gang uten å endre markeringen.
- Given `FEATURE_MNEMONICS=false`, when et modellkort vises, then mangler huskeregelknappen, mens huskeregelen som finnes, vises.
- Given økten med et modellkort og dialogen, when axe kjøres, then er det ingen brudd.

## Spec Change Log

## Review Triage Log

### 2026-11-25 — Review pass
- verdicts: 25 findings — high 0, medium 0, low 19, false 6, maybe-false 0
- findings:
  - Edge Case Hunter
    - `[low]` `[patch]` Modellkort med `points` NULL i databasen sendes som `points: null` — `_flashcard_out` sender alltid en liste for `kind="model"`. Ny backendtest.
    - `[low]` `[patch]` (samme rot) `ModelCardBack` krasjer når `points` er null — dekket av rettelsen i backend.
    - `[low]` `[patch]` (samme rot) «Rediger» krasjer når `points` er null — dekket av rettelsen i backend.
    - `[low]` `[reject]` Et punkt med linjeskift inni deles i flere når det lagres uendret — punktene lages av lister med ett punkt per linje; svært sjelden, og en rettelse krever ny redigeringsform.
    - `[low]` `[patch]` Uavsluttet parentes før kolon («A (b: c») gir termen «A (b» — `pointParts` deler bare på kolon uten åpen parentes foran. Ny test.
  - Blind Hunter
    - `[false]` `[reject]` FR-56 er feil krav-ID for listetestene — PRD-en sier under FR-56 at modellkort er flashcards og øves i samme økt, og storien lister «FR-56 (modellkort)».
    - `[false]` `[reject]` KI-sporet mangler — føres i samme økt etter gjennomgangen.
    - `[low]` `[reject]` Når punktene rettes, kan huskeregelen bli stående usynkronisert — med vilje (AR-4, spesifikasjonen); studenten kan endre huskeregelen selv.
    - `[low]` `[reject]` Ingen øvre grense for antall punkter eller lengden på huskeregelen — det samme gjelder forside og svar fra epic 3; lokal app for én bruker, og en grense krever nye vakter og tekster.
    - `[low]` `[reject]` Feilkoden for tomt felt sier ikke hvilket felt — dialogene sender aldri punkter og huskeregel samtidig, og hver dialog har ett felt som kan gi koden.
    - `[false]` `[reject]` Skjemaet håndhever ikke formen per type — ingen kode lager slike svar; `_flashcard_out` er eneste vei ut, og den bygger fra raden.
    - `[low]` `[patch]` `pointParts` deler «Kl. 10:30» og «https://» på kolon — kolon teller bare når det følges av mellomrom. Nye tester. (Lang innledning i fet skrift avvist: heuristikken er med vilje enkel.)
    - `[low]` `[reject]` Bryteren av er bare delvis testet — listene leser ikke bryteren, og 404 for huskeregel og skjult knapp er testet.
    - `[low]` `[patch]` Grenen for «konfigurasjonen er ikke lastet» i økttesten brukes ikke — ny test der knappen mangler uten konfigurasjon.
    - `[low]` `[reject]` Lagring av huskeregel i en emneøkt er ikke testet — flettingen er den samme koden, og den eksisterende emnetesten viser at kortet beholder forelesningen.
    - `[low]` `[patch]` Kommentaren til `PLAIN_FLASHCARD_KINDS` er ufullstendig — skrevet om, så den nevner dublettsjekken og slettetellingen.
    - `[low]` `[patch]` Navnene i `test_model_card_practice.py` stemmer ikke (`qa` er et begrepskort) — omdøpt til `plain`.
    - `[false]` `[reject]` `SubjectFlashcardOut` bygd med `model_dump` kan feile ved nye felt — `SubjectFlashcardOut` arver fra `FlashcardOut`, så felt i `FlashcardOut` finnes alltid der.
    - `[false]` `[reject]` Ingen test for «Øv nå» med null kort — raden viser ikke «Øv nå» uten innhold (`lecture-page.test.tsx:1062`), og quizraden har aldri brukt `practiceCountOf`.
  - Verification Gap
    - (ingen funn)
  - Intent Alignment
    - `[low]` `[reject]` Blanding av modellkort og andre kort er ikke vist i nettleseren — stokkingen er felles kode fra epic 3, og listene er testet i backend.
    - `[low]` `[reject]` «Kunne ikke» på et modellkort er ikke testet for seg — samme øktkode som andre kort.
    - `[low]` `[reject]` «Slett» på modellkort er bare testet i API-et — samme slettebekreftelse og samme rute som andre kort.
    - `[low]` `[reject]` Bryteren av er ikke testet i nettleseren — Playwright kjører mot én Docker-konfigurasjon med bryteren på (som i 7.1).
    - `[false]` `[reject]` Feilkoden for tom huskeregel er én av flere lesninger — valget står i spesifikasjonen og føres som kanttilfelle.
    - `[low]` `[reject]` «Øv nå», «Neste å øve på» og øvd-regelen er endret uten eget akseptkriterium — følger av FR-42 («øves som andre flashcards»), står i Design Notes og føres i `beslutninger.md`.

## Design Notes

- **Feilkoden for tomme felt:** AC sier «den samme feilkoden … som redigering av kort bruker fra epic 3». Epic 3 har to koder; huskeregelen og punktene står på baksiden, så `FLASHCARD_BACK_REQUIRED` brukes. Dialogene viser egne tekster for feltet («Skriv inn en huskeregel.»), så meldingsfila trenger ingen ny kode. Kanttilfelle.
- **Punktvisning:** «term (oversettelse)» → term i 600 og parentesen dempet; «term: forklaring» → term i 600; ellers vanlig tekst. Bokstavboksen viser første bokstav (`\p{L}`) i punktet, stor bokstav. `lang="en"` settes ikke: appen vet ikke hvilke ord som er engelske (instruksen gir norsk først og engelsk i parentes, skissen motsatt). Kanttilfelle.
- **Øvd:** en emneøkt teller nå forelesninger som bare har modellkort, siden kortene er med i økten (`first_flashcard_times` tar med `model`).
- **Redigering:** `PATCH {front, points}` for modellkort; tomme linjer fjernes, minst ett punkt. Tre-punktsregelen fra FR-45 gjelder bare generering (AR-4).

## Verification

**Commands:**
- `cd backend && uv run pytest && uv run ruff check . && uv run mypy app` -- expected: grønt.
- `cd frontend && npm run test && npm run lint && npx tsc --noEmit` -- expected: grønt.
- `cd frontend && npx playwright test` mot `docker compose up --build -d` -- expected: grønt.

## Auto Run Result

**Status:** done (bygging og gjennomgang). Playwright etter rettelsene, skjermbildene og PR-en gjenstår, se «Gjenstående risiko».

**Hva som er bygd:** modellkortene er med i kortlistene for forelesning og emne (`kind="model"`, `points`, `mnemonic`) og øves i flashcard-økten sammen med de andre kortene. Baksiden viser punktene som en ordnet liste med bokstavbokser og loddrett linje, huskeregelen på merknadsflaten («Huskeregel:») og kilden. «Endre huskeregel»/«Legg til huskeregel» åpner en dialog som lagrer med `PATCH /api/flashcards/{id}`; tom huskeregel gir «Skriv inn en huskeregel.». «Rediger» retter forsiden og punktene (ett per linje). Med `FEATURE_MNEMONICS=false` mangler knappen, og `PATCH` med `mnemonic` gir 404. «Øv nå», «Neste å øve på» og øvd-regelen regner modellkort som kort.

**Filer:**
- `backend/app/modules/content/{schemas,service,router,models}.py` -- listene, `PATCH` med punkter og huskeregel, bryteren, øvd.
- `backend/scripts/export_quality_sample.py` -- stikkprøven tar bare med vanlige flashcards.
- `backend/tests/test_model_card_practice.py` (ny) og fem snudde tester.
- `frontend/modules/practice/components/model-card-back.tsx`, `mnemonic-dialog.tsx` (nye), `flashcard.tsx`, `edit-flashcard-dialog.tsx`, `pages/flashcard-session-page.tsx`, `types.ts`, `api.ts` (+ tester).
- `frontend/modules/generation/components/{flashcards-row,generation-row}.tsx`, `frontend/modules/subjects/next-step.ts` (+ tester).
- `frontend/e2e/modellkort.spec.ts`, `frontend/e2e/brukerreiser/felles.ts`, `docs/testplan.md`.

**Gjennomgang:** 25 funn. 8 rettet (alle lave, i fire grupper), 0 utsatt, 17 avvist (6 feilaktige) med grunn i loggen over.

**followup_review_recommended:** false. Ingen rettede funn var `high` eller `medium`.

**Verifisering:** før rettelsene: `uv run pytest` 831 grønne, `npm run test` grønt, `npx playwright test` mot `docker compose up --build -d` 192 grønne og 4 hoppet over (uten testbruker). Etter rettelsene: `uv run pytest` 832 grønne, `uv run ruff check .` rent, `npm run test` 968 grønne (75 filer), `npx tsc --noEmit` rent. `npm run lint` finnes ikke i `package.json`. `uv run mypy app` er ikke satt opp i prosjektet.

**Gjenstående risiko:** Playwright er ikke kjørt etter rettelsene fra gjennomgangen, og skjermbildene i `docs/skjermbilder/story-7-2/` er ikke tatt, fordi diskplassen var 4,8 GB etter rydding (grensen for `--build` er 5 GB). Rettelsene gjelder `points` for modellkort uten punkter og hvordan punktene deles på kolon; begge har enhetstester.

**Etter stoppet (Siljes avgjørelse om diskgrensen):** `npx playwright test` mot `docker compose up --build -d` ga 192 grønne og 4 hoppet over. Skjermbildene viste at bokstavboksene og punktene var større enn i skisse 11; de har nå skissens størrelser (`b8ec4bc`), og `modellkort.spec.ts` og `universell-utforming.spec.ts` er grønne etter det. Skjermbildene ligger i `docs/skjermbilder/story-7-2/`.
