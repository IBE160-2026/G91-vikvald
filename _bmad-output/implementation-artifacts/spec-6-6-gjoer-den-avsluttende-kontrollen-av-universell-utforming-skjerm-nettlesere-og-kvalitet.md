---
title: 'Story 6.6: Gjør den avsluttende kontrollen av universell utforming, skjerm, nettlesere og kvalitet'
type: 'chore'
created: '2026-11-23'
status: 'in-progress'
baseline_revision: 'acc6bba1c4ac9af0ce9a26cb7491dbb10ca8f61c'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/autonom-kjoring.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Sensor skal se dokumentert at appen er kontrollert for universell utforming (NFR-13, SK-9), skjermbredde (NFR-14), nettlesere (NFR-15), tastatur (SK-12) og kvalitet med ekte modell (SK-13–SK-17). I dag sjekker axe mange sider spredt i flere testfiler, men ingen samlet test går gjennom alle sidene og tilstandene, ingen test sjekker alle sidene på 768 px, ingen nettleserkjøring er ført, og det finnes verken eksportskript eller mal for kvalitetsstikkprøven.

**Approach:** Bygg alt som kan automatiseres: én samlet Playwright-test med axe på alle sider og tilstander i 1280 og 768 px (med sjekk av vannrett rulling og menyknapp), en egen axe-test på seed-dataene, en kjerneflyt-test som kan kjøres i Chrome (og Edge/Safari når de finnes) og fører versjonsnummeret, og et eksportskript i `backend/scripts/` som lager CSV-en for stikkprøven. Kontrollene som er Siljes (tastatur, 200 % tekst, stikkprøven med Gemini, formelsidene, modellvalget, Edge og Safari når de ikke finnes på maskinen), gjøres klare med tomme rader, framgangsmåte og ett GitHub-issue hver.

## Boundaries & Constraints

**Always:**
- Testtitlene har krav-ID-ene NFR-13, NFR-14, NFR-15 og SK-9, ikke FR-ID-er (ellers må FR-tabellen i testplanen endres, se `test_sk1_testplan_files_match_test_names`).
- axe-testen dekker: innlogging (tom og med feilmelding), oppretting av konto (tom og med feilmelding), forsiden uten og med emner, dialogen «Nytt emne», emnesiden, dialogen «Ny forelesning», forelesningssiden uten og med filer, vilkårsdialogen, dialogene «Lag flashcards» og «Lag quiz», slettebekreftelsen for en fil, flashcardøkten (forside og snudd kort), flashcardresultatet, quizøkten (før og etter svar), quizresultatet, hurtigtastdialogen, kontosiden med slettebekreftelsen for kontoen, og «Fant ikke siden» (innlogget og utlogget).
- Sider for bør ha: testen leser `GET /api/config`. Er bryteren på og inngangen finnes i appen («Lag modellkort» i Flashcards-raden, raden «Fritekst», raden «Sammendrag» i «Lag og øv»), åpnes den og sjekkes med axe. Er bryteren på uten at inngangen finnes, føres «ikke bygd ennå» som annotasjon, og testen er grønn.
- Hver side og tilstand sjekkes i både 1280 og 768 px: axe uten brudd og `scrollWidth <= innerWidth`. I 768 px har appsidene knappen «Meny» og ingen synlig navigasjon «Emner», og i øktene ligger øktpanelet bak «Meny».
- axe på seed-dataene: forelesningssiden, flashcardøkten og quizøkten for testbrukeren, uten å lagre en økt eller endre noe. Testene hopper over seg selv uten testbrukeren, og feiler da med `E2E_REQUIRE_SEED=1`, som i `testbruker.spec.ts`.
- Kjerneflyten (NFR-15) går i nettleseren: logg inn → nytt emne og forelesning → last opp PDF og godta vilkår → lag og øv på flashcards → lag og ta quiz → logg ut. Den fører nettlesernavn og versjon som annotasjon. `playwright.config.ts` får prosjektene `chrome`, `msedge` og `webkit` bare når `E2E_BROWSERS` nevner dem; uten variabelen er oppsettet som før.
- Eksportskriptet `backend/scripts/export_quality_sample.py` bruker bare app-API-et (logger inn med e-post og passord fra miljøvariabelen `SK_PASSWORD` eller ledetekst), finner emnet på navn, og skriver én CSV med kolonnene `innhold,kilde,vurdering,kommentar`, UTF-8 med BOM. `vurdering` og `kommentar` er alltid tomme. Kilden er «fil.pdf, side N». Innholdet begynner med «Flashcard:» eller «Quiz:»; quizraden har alternativene A–D, hvilket som er riktig, og «Riktig svar er lengst: ja/nei» (mekanisk lengdesammenligning, likt regnes som ja). Formelmerket står som «[Formelmerke]».
- Er det flere enn ønsket antall, trekkes et tilfeldig utvalg med fast frø (`--seed`, standard 1), sortert etter forelesning, fil og side. Er det færre, tas alt med, og skriptet skriver hvor mange det fant.
- `summary`-kommandoen i samme skript regner ut tallene for SK-13, SK-14 og SK-15 fra en utfylt CSV og sier hvor mange rader som mangler vurdering. Ukjente vurderinger stopper utregningen med en melding.
- `docs/kvalitet/README.md` har framgangsmåten for stikkprøven, kommandoene, tabellene med tomme resultatceller for SK-13–SK-17, modell, tenkenivå, ventetid for 20 flashcards (NFR-17) og hva som gjøres når en grense ikke nås.
- `docs/testplan.md`: resultatkolonnen for SK-9 fylles med den automatiske kjøringen. Avsnittet «Resultater fra den avsluttende kontrollen» får axe, 768 px, nettlesere (Chrome fylt ut av KI med versjon, Edge og Safari tomme), og tomme tabeller med framgangsmåte for 200 % tekst og SK-12. Ingen ny tabellrad starter med `| SK-` eller `| FR-`.
- Feil axe finner, rettes i appen, ikke i testen.

**Never:**
- Ingen kall til Vertex AI eller Gemini. Ingen KI-vurderinger i vurderingskolonnen, ingen utfylte rader for SK-12, 200 % tekst, SK-13–SK-17, Edge eller Safari.
- Ikke velg modell (#4) eller endre `.env.example`.
- Ingen nye nettlesere installeres. Ingen personopplysninger eller demodata-CSV i `docs/kvalitet/`.
- Ikke rør planleggingsdokumentene, `CLAUDE.md`, `.claude/settings.json` eller `frontend/e2e-skjermbilder/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Eksport, nok innhold | 15 kort, 15 spørsmål, `--flashcards 10 --quiz 5` | 10 + 5 rader, samme utvalg med samme frø | – |
| Eksport, for lite | 15 kort, `--flashcards 50` | 15 kortrader | Melding «Fant 15 flashcards, ba om 50» |
| Emnet finnes ikke | `--subject Ukjent` | Ingen fil | Avslutter med kode 1 og emnene som finnes |
| Feil passord | Innlogging gir 401 | Ingen fil | Avslutter med kode 1 og «Innloggingen feilet» |
| Likt lengste | Riktig alternativ like langt som et annet | «Riktig svar er lengst: ja» | – |
| Summary, ufullstendig | 3 rader uten vurdering | Tallene for de vurderte, og «3 rader mangler vurdering» | – |
| Summary, ukjent verdi | vurdering «ok» | Ingen tall | Avslutter med kode 1 og raden |
| Bør ha uten side | `feature_summary: true`, ingen rad «Sammendrag» | Annotasjon «ikke bygd ennå» | Testen er grønn |

</intent-contract>

## Code Map

- `frontend/playwright.config.ts` -- ett prosjekt `chromium`; testDir `./e2e`. Nye prosjekter legges til fra `E2E_BROWSERS`.
- `frontend/e2e/brukerreiser/felles.ts` -- gjenbruk `expectNoAxeViolations`, `registerWithTermsViaApi`, `createSubjectViaApi`, `createLectureViaApi`, `uploadViaApi`, `pdfFile`, `makeFlashcardsViaApi`, `makeQuizViaApi`, `dropFiles`, `dayFromToday`, `uniqueEmail`, `PASSWORD`.
- `frontend/e2e/testbruker.spec.ts` -- mønster for seed-innlogging, `E2E_REQUIRE_SEED` og skip.
- `frontend/e2e/hurtigtaster-og-smal-skjerm.spec.ts` -- mønster for `expectNoHorizontalScroll`, «Meny»-knappen og arket «Emner» i 768 px; `?` åpner «Hurtigtaster».
- `frontend/e2e/konto.spec.ts` -- «Slett kontoen …» åpner «Slette kontoen?».
- `frontend/e2e/logg-inn.spec.ts`, `opprett-konto.spec.ts` -- feilmeldinger (feil passord, ugyldig e-post).
- `frontend/modules/subjects/pages/lecture-page.tsx` -- «Lag og øv» med gruppene Flashcards og Quiz; bør ha-radene kommer i epic 7–9.
- `backend/app/core/public_config.py` -- `GET /api/config` med `feature_mnemonics`, `feature_freetext`, `feature_summary`.
- `backend/app/modules/content/schemas.py` -- `SubjectFlashcardOut` og `QuizQuestionOut` (kilde, `formula_flag`, `lecture`); rutene `GET /api/subjects/{id}/flashcards` og `/quiz-questions`.
- `backend/app/seed/service.py` + `backend/tests/test_seed.py` -- `seed_if_empty` gir demodata til testen av eksportskriptet.
- `backend/tests/conftest.py` -- `client`-fixturen (ASGI) og `engine`.
- `backend/tests/test_testplan.py` -- SK-1-reglene: radene leses fra første kolonne `FR-n`/`SK-n`.
- `docs/testplan.md` -- SK-tabellen og avsnittet «Resultater fra den avsluttende kontrollen (story 6.6)».

## Tasks & Acceptance

**Execution:**
- `frontend/e2e/universell-utforming.spec.ts` -- alle sider og tilstander i 1280 og 768 px, bør ha-sidene etter `GET /api/config`, og seed-testene for forelesningssiden, flashcardøkten og quizøkten.
- `frontend/e2e/kjerneflyt.spec.ts` -- kjerneflyten med nettleserversjon som annotasjon.
- `frontend/playwright.config.ts` -- prosjektene fra `E2E_BROWSERS`, som bare kjører `kjerneflyt.spec.ts`.
- `backend/scripts/__init__.py`, `backend/scripts/export_quality_sample.py` -- `export` og `summary`.
- `backend/tests/test_quality_export.py` -- eksport med seed-demodata via API-et, utvalg, for lite innhold, lengste svar, CSV-format og `summary` (`test_sk13_…`, `test_sk15_…`).
- `docs/kvalitet/README.md` -- framgangsmåte og mal.
- `docs/testplan.md` -- resultater og maler.
- `README.md` -- én lenke til `docs/kvalitet/README.md` og kommandoen for nettleserkjøringen.
- Appen -- rett det axe eller 768 px-testen finner.

**Acceptance Criteria:**
- Given appen med seed-dataene (`-p sk-seedtest`, `E2E_REQUIRE_SEED=1`), when `npx playwright test` kjøres, then er alle axe-testene grønne, også seed-testene, og alle sider er uten vannrett rulling i 768 px.
- Given `E2E_BROWSERS=chrome`, when `npx playwright test --project=chrome` kjøres, then går kjerneflyten grønt, og testplanen har Chrome-versjonen og datoen.
- Given seed-demodata, when eksportskriptet kjøres mot appen, then får CSV-en riktige kolonner og tomme vurderinger, og `summary` regner ut tallene fra en utfylt kopi.
- Given Siljes kontroller, when PR-en leses, then har hver kontroll en tom mal, en framgangsmåte og et issue.

## Spec Change Log

## Review Triage Log

## Design Notes

**Bør ha-sidene.** Sidene finnes ikke før epic 7–9 er bygd, men bryterne står på som standard. Testen leter etter inngangen i appen i stedet for å anta en adresse, så den tar sidene med når de kommer, uten endring, og er grønn så lenge de ikke finnes.

**API i stedet for database i skriptet.** Bare port 3000 er åpen fra Compose, og modulene eier sine tabeller. Gjennom API-et ser skriptet det samme som Silje ser i appen, og trenger ingen databasetilkobling.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- alle grønne.
- `cd frontend && npm run test` -- alle grønne.
- `docker compose up --build -d && cd frontend && npx playwright test` -- alle grønne.
- `docker compose -p sk-seedtest up --build -d && cd frontend && E2E_REQUIRE_SEED=1 npx playwright test`, deretter `E2E_BROWSERS=chrome npx playwright test --project=chrome` og eksportskriptet mot testbrukeren; rydd med `docker compose -p sk-seedtest down -v`.
