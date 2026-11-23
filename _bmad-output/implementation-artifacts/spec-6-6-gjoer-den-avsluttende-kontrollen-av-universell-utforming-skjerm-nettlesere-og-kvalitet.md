---
title: 'Story 6.6: Gjør den avsluttende kontrollen av universell utforming, skjerm, nettlesere og kvalitet'
type: 'chore'
created: '2026-11-23'
status: 'done'
baseline_revision: 'acc6bba1c4ac9af0ce9a26cb7491dbb10ca8f61c'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/autonom-kjoring.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Bør ha-testen er grønn når inngangen ikke finnes, også om lokatoren bommer på en side som er bygd.
    evidence: |-
      Valgt fordi epic 7–9 ikke er bygd. Når hver bør ha-side bygges, må testen kreve at inngangen finnes (kanttilfelle-issue).
    location: >-
      frontend/e2e/universell-utforming.spec.ts (bør ha-testen)
    severity: medium
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

### 2026-11-23 — Review pass
- verdicts: 39 findings — high 0, medium 8, low 29, false 1, maybe-false 1
- findings:
  - `[medium]` `[patch]` (blind) `export` kunne skrive over Siljes utfylte CSV — skriptet nekter nå å skrive over en fil som finnes, før innloggingen; testet.
  - `[low]` `[patch]` (blind) `summary` telte alle rader som ikke var quiz, som flashcards — ukjent start på raden stopper nå med radnummer.
  - `[low]` `[patch]` (blind) Feil input ga Python-traceback — negative tall avvises av argparse, `OSError`/`UnicodeDecodeError` gir melding og kode 1. Ctrl-C og svar som ikke er JSON er avvist (sjeldent).
  - `[low]` `[patch]` (blind) Like emnenavn og tvetydig kilde — like emnenavn stopper nå eksporten. Forelesningsnavn i `kilde` avvist: kolonnen er gitt av storien, og like filnavn i to forelesninger er sjeldent.
  - `[low]` `[patch]` (blind) Øktpanelet ble ikke sjekket i 1280 px — sjekkes nå når ingen dialog er åpen. Arket bak «Meny» i økten er allerede sjekket med axe i `hurtigtaster-og-smal-skjerm.spec.ts`.
  - `[low]` `[patch]` (blind) «Alle sider og tilstander» lovet mer enn testen dekker — ordlyden er snevret inn til tilstandene storien lister, med henvisning til brukerreisene for jobbstatus, feil og avviste filer.
  - `[medium]` `[patch]` (blind) Framgangsmåten for 200 % blandet skriftstørrelse og zoom — nå 1280 px vindu og zoom til 200 % (WCAG 1.4.4).
  - `[low]` `[patch]` (blind) Nettlesertabellen hadde ingen commit — kolonne lagt til, alle tre kjøringer viser `c51bfa2`.
  - `[low]` `[patch]` (blind) Ukjente navn i `E2E_BROWSERS` forsvant stille — små bokstaver, dubletter fjernet, varsel om ukjente.
  - `[low]` `[patch]` (blind) Uklar feil når «Markedsmiksen» mangler — `expect` med melding. Dupliserte innloggingsdata avvist: samme mønster som `testbruker.spec.ts`.
  - `[low]` `[patch]` (blind) SK-12–SK-17 i SK-tabellen lenket ikke til issuene — lenker til #295, #299, #300 og `docs/kvalitet/README.md`.
  - `[false]` `[reject]` (blind) KI-sporet mangler — skrives etter byggeløpet i samme økt, før PR.
  - `[low]` `[patch]` (blind) Ingen kreditering og faste antall — kreditering og «skriv antallet som ble funnet» lagt til i `docs/kvalitet/README.md`.
  - `[low]` `[patch]` (blind) SK-15-andelene har ulik nevner og delstrengsøk — søket er forankret på slutten av raden, og nevnerne står i README.
  - `[low]` `[patch]` (edge) Negative `--flashcards`/`--quiz` — samme som blind-funnet om traceback.
  - `[low]` `[patch]` (edge) `--out` i mappe som ikke finnes — samme rettelse (`OSError`).
  - `[low]` `[patch]` (edge) Manglende fil eller annen koding i `summary` — samme rettelse.
  - `[low]` `[patch]` (edge) Like emnenavn — samme som blind-funnet.
  - `[low]` `[reject]` (edge) Svar som ikke er JSON — skjer bare med feil `--base-url`; sjeldent.
  - `[low]` `[reject]` (edge) EOF/Ctrl-C ved passordledeteksten — avbrudd fra brukeren selv; sjeldent.
  - `[low]` `[patch]` (edge) Løse rader telles som flashcards — samme som blind-funnet.
  - `[medium]` `[patch]` (edge) «nådd» skrevet ut med rader uten vurdering — skriver nå «ufullstendig»; testet.
  - `[medium]` `[patch]` (edge) `afterEach` feilet hoppede seed-tester — `saves` settes før `test.skip`; hovedkjøringen viste 4 hoppet over, ingen feil.
  - `[low]` `[patch]` (edge) TypeError når forelesningen mangler — samme som blind-funnet.
  - `[low]` `[patch]` (edge) Bryter som mangler i `/api/config` ble ført som «skrudd av» — testen feiler nå.
  - `[maybe-false]` `[reject]` (edge) axe på en overgangstilstand når en bør ha-inngang åpnes — ingen inngang finnes ennå; ville bare vært lav.
  - `[low]` `[patch]` (edge) Store bokstaver i `E2E_BROWSERS` — samme som blind-funnet.
  - `[low]` `[patch]` (edge) Samme nettleser to ganger — fjernes med Set.
  - `[low]` `[patch]` (edge) Safari og Edge manglet framgangsmåte — lagt til i testplanen.
  - `[medium]` `[defer]` (verification) Bør ha-testen er grønn også når lokatoren ikke treffer en bygd side — valgt i spesifikasjonen; må strammes inn når epic 7–9 bygges (utsatt, kanttilfelle-issue).
  - `[medium]` `[patch]` (verification) `export` gjennom `main` var ikke testet — ny test sjekker at argumentene sendes i riktig rekkefølge og at fila skrives.
  - `[medium]` `[patch]` (verification) Hoppede seed-tester feiler i `afterEach` — samme som edge-funnet.
  - `[medium]` `[patch]` (verification) Norsk Excel lagrer med semikolon — `summary` finner skilletegnet fra overskriftslinja; testet.
  - `[low]` `[reject]` (intent) Resultatene for Siljes kontroller er tomme — bevisst: kontrollene er Siljes, med mal, framgangsmåte og issue (#295–#300, #4).
  - `[low]` `[reject]` (intent) SK-12 er ikke automatisert — storien sier at Silje gjør den med tastatur.
  - `[low]` `[reject]` (intent) Edge er ikke kjørt — Edge finnes ikke på maskinen, og nettlesere skal ikke installeres; #297.
  - `[low]` `[reject]` (intent) Testnavnene følger ikke `test_nfr13_…` — Playwright-testene følger repoets mønster med krav-ID først i tittelen.
  - `[low]` `[reject]` (intent) Seed-testene hopper over seg selv uten `E2E_REQUIRE_SEED` — samme valg som i 6.4; kjøringen med seed er gjort med variabelen satt.
  - `[low]` `[reject]` (intent) Fjerde vurderingsverdi og SK-14 bare for flashcards — testplanen sier «kortene» for SK-14; «faglig feil og feil kilde» lar Silje føre begge; ført som kanttilfelle.

## Design Notes

**Bør ha-sidene.** Sidene finnes ikke før epic 7–9 er bygd, men bryterne står på som standard. Testen leter etter inngangen i appen i stedet for å anta en adresse, så den tar sidene med når de kommer, uten endring, og er grønn så lenge de ikke finnes.

**API i stedet for database i skriptet.** Bare port 3000 er åpen fra Compose, og modulene eier sine tabeller. Gjennom API-et ser skriptet det samme som Silje ser i appen, og trenger ingen databasetilkobling.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- alle grønne.
- `cd frontend && npm run test` -- alle grønne.
- `docker compose up --build -d && cd frontend && npx playwright test` -- alle grønne.
- `docker compose -p sk-seedtest up --build -d && cd frontend && E2E_REQUIRE_SEED=1 npx playwright test`, deretter `E2E_BROWSERS=chrome npx playwright test --project=chrome` og eksportskriptet mot testbrukeren; rydd med `docker compose -p sk-seedtest down -v`.

## Auto Run Result

Status: done

**Hva som er bygd:** En samlet axe-test på alle sidene og tilstandene storien lister, i 1280 og 768 px, med sjekk av vannrett rulling, «Meny» og øktpanelet, bør ha-sidene etter `GET /api/config`, og tre tester på eksempelemnet. En kjerneflyt-test som fører nettleserversjonen, med Chrome, Edge og WebKit som valgfrie prosjekter. Et eksportskript med `export` og `summary` for kvalitetsstikkprøven. Mal og framgangsmåte i `docs/kvalitet/README.md` og i testplanen for Siljes kontroller.

**Filer:**
- `frontend/e2e/universell-utforming.spec.ts` -- axe og 768 px på alle sider og tilstander, bør ha-sidene og eksempelemnet.
- `frontend/e2e/kjerneflyt.spec.ts` -- kjerneflyten med nettleserversjon (NFR-15).
- `frontend/playwright.config.ts` -- prosjektene fra `E2E_BROWSERS`.
- `backend/scripts/__init__.py`, `backend/scripts/export_quality_sample.py` -- eksport og utregning.
- `backend/tests/test_quality_export.py` -- 18 tester med seed-demodata.
- `docs/kvalitet/README.md` -- framgangsmåte og tomme resultattabeller.
- `docs/testplan.md` -- SK-9, axe, 768 px og Chrome fylt ut; maler for 200 %, Edge, Safari og SK-12.
- `README.md` -- nettleserkjøringen og lenke til kvalitetsmalen.

**Gjennomgang:** 39 funn. 28 rader rettet (7 middels, 21 lave), 1 utsatt (bør ha-lokatorene), 10 avvist med begrunnelse.

**Ny gjennomgang anbefales:** nei. Sju middels rader ble rettet. Alle er verifisert: skriptrettelsene av nye pytest-tester, Playwright-rettelsene av full kjøring mot både hovedprosjektet og seed-prosjektet. Ingen konkret uverifisert risiko gjenstår (patchet: high 0, medium 7, low 21).

**Verifisering (commit `c51bfa2`):**
- `uv run pytest`: 732 passed.
- `npm run test`: 918 passed (73 filer).
- `npx playwright test` mot `docker compose up --build -d`: 185 passed, 4 skipped (seed-testene mot det eldre `pgdata`-volumet).
- `E2E_REQUIRE_SEED=1 npx playwright test` mot `docker compose -p sk-seedtest up --build -d`: 189 passed.
- `E2E_BROWSERS=chrome npx playwright test --project=chrome`: bestått i Chrome 158.0.8127.37.
- Eksportskriptet mot testbrukeren: 30 rader, «Fant 15 flashcards, ba om 50», nektet å skrive over, `summary` ga «30 rader mangler vurdering». Ryddet med `down -v`.

**Gjenværende risiko:**
- Siljes kontroller er ikke gjort: SK-12 (#295), 200 % (#296), Edge (#297), Safari (#298), stikkprøven (#299), formlene (#300) og modellvalget (#4).
- axe og 768 px er bare kjørt i Playwrights Chromium.
