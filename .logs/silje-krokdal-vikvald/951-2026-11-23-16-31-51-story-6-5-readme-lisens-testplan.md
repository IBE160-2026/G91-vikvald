# Story 6.5: README, lisens og testplan

## 2026-11-23 kl. 16:31 — Silje Krokdal Vikvald

### Oppgave
Bygge story 6.5 i den autonome kjøringen: fullføre README, legge til lisensen AGPL-3.0 (#25) og vise testdekningen i en testplan med en test som håndhever SK-1. I tillegg prøve README fra en ren kopi av repoet (SK-11).

### Plan
- `bmad-build-auto` med spesifikasjonen [spec-6-5](../../_bmad-output/implementation-artifacts/spec-6-5-fullfoer-readme-legg-til-lisens-og-vis-testdekningen.md): spesifikasjon, implementasjon med subagent og gjennomgang med fire gjennomgåere.
- Lisensteksten hentet med `curl` fra gnu.org, uendret.
- SK-11 i en klone i scratchpad med eget Compose-prosjekt (`-p sk-renkopi`), så `pgdata` ikke ble rørt.
- Alle testene, sprint-status, KI-sporet, issues og PR.

### Resultat
- `LICENSE` (AGPL-3.0, låst med SHA-256-test) og `LICENSE -text` i `.gitattributes` (`09fbe71`).
- `docs/testplan.md`: én rad per må ha-krav med testfilene, begrunnelse for manuell kontroll for FR-2, FR-31, FR-40 og FR-41, SK-2–SK-22 med plass til resultatene fra 6.6, og SK-11-kjøringen (`721013b`, `b17c72f`, `c1093e6`).
- `backend/tests/test_testplan.py`: SK-1-testen, at tabellen stemmer med testnavnene, lisensen og README (`721013b`, `1c072ec`).
- `test_nfr4_env_example_lists_all_settings` i `test_config.py` (`dd340ad`). Tre feilmerkede testnavn rettet (`0a15af2`).
- README: lisens og kreditering, lenker til testplanen og brukerreisene, kodeblokker for alle kommandoer (#27) (`c394228`, `0292451`).
- Gjennomgang: 36 funn, 9 rettelser, 4 utsatt, 17 avvist (se spesifikasjonen).
- Tester: pytest 714 passed, Vitest 918 passed, Playwright 178 passed og 1 skipped (testbrukertesten mot det eldre `pgdata`). I den rene klonen: pytest 713, Vitest 918, `E2E_REQUIRE_SEED=1 npx playwright test` 179 passed.
- Story 6.5 er `done` i sprint-status. Kanttilfeller: #291–#293. Åpent punkt: #290.
- Lukket punkt: «testplanen skal si at FR-2 og FR-31 bare kan måles manuelt» (fra 6.2) og «skriv oppsettsguide i README» (#27).
- Klonen i scratchpad (`renkopi`, 765 MB) ble ikke slettet: `rm -rf` ble nektet av tillatelsene. Compose-prosjektet og volumene er ryddet.

### Åpne punkter
- Følg README ordrett fra en ren kopi selv, og før kjøringen som ny rad i testplanen (#290).
- Velg lisensvariant (AGPL-3.0-only eller -or-later) og om appen skal lenke til kildekoden (AGPL §13) (#291).
- Vurder kanttilfellene fra story 6.5: reglene for SK-1-testen og rettede krav-ID-er (#292), hemmelige innstillinger i `.env.example` (#293).
