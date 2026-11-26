# Story 9.2: Les sammendraget og lag et nytt

## 2026-11-26 kl. 05:56 — Silje Krokdal Vikvald

### Oppgave
Bygge story 9.2 i den autonome kjøringen: «Les sammendrag» på raden, sammendragssiden (skisse 13) og «Lag nytt sammendrag», der det gamle sammendraget står til det nye er ferdig. Bygget på 9.1 (PR #359), med #353 og #357 som kanttilfeller. #301 skulle løses ved at axe-testen krever sammendragssiden. Ingen kall til Vertex AI.

### Plan
- `bmad-build-auto`: epic 9-kontekst og 9.1-spesifikasjonen, [spesifikasjonen](../../_bmad-output/implementation-artifacts/spec-9-2-les-sammendraget-og-lag-et-nytt.md), implementering av en subagent og gjennomgang med fire gjennomgåere.
- Gjennomgåerne stoppet på bruksgrensen og ble startet igjen der de slapp.
- Full Playwright-kjøring etter alle rettinger, og seed-testene og skjermbildene mot `sk-seedtest` med de samme bildene.

### Resultat
- Backend: `GET /api/lectures/{id}/summary` bak `FEATURE_SUMMARY`, med temaer, punkter med kilde og filene punktene kommer fra (`c5318dd`).
- Frontend: omrissknappen «Les sammendrag» på raden (`8f49230`, `5e08fc9`), sammendragssiden med artikkel, innholdskort og merknad, «Lag nytt sammendrag» med jobbstatus, feil og «Prøv igjen», og ingen kort melding på sammendragssiden (`7064f0b`). Nettlesertestene og axe-testen krever siden (`d8284dc`, #301).
- Gjennomgang: 35 funn, 3 rettet (`631eb38`), 1 utsatt (Playwright i CI), resten avvist med grunn i spesifikasjonen. Skjermbildene viste at «Les sammendrag» var fylt, mot avgjørelsen om at bare «Øv nå» er fylt; rettet til omriss (`5e08fc9`).
- Tester: `uv run pytest` 1008 bestått, `ruff` rent; `npm run test` 1086 bestått, `tsc` rent; `npx playwright test` mot `docker compose up --build -d` etter alle rettinger 211 bestått og 4 hoppet over (seed-testene); seed-testene med `E2E_REQUIRE_SEED=1` mot `sk-seedtest` 10 bestått. `sk-seedtest` ryddet med `down -v` og `docker image rm`. Appen stoppet med `docker compose down`.
- Skjermbilder i `docs/skjermbilder/story-9-2/` (`a987a31`). Sprintstatus `done` for 9.2 og epic 9 (`47dbbd8`). KI-sporet (`aba073d`). Kanttilfellene er #360–#364.

### Åpne punkter
- Vurder kanttilfellene fra story 9.2 (#360–#364), særlig om «Les sammendrag» skal være omriss (#360) og hvilke filer KILDER viser (#361).
- Kildeteksten under punktene har ikke strek under som i skisse 13 (delt komponent uten lenke i MVP).
- Epic 9 er ferdig: brukerreisetestene skal utvides (flyt 1, steg 11) og gjennomgangsissuet lages av orkestratoren.
- Disken har 3,1 GB ledig etter kjøringen, fortsatt under grensen på 5 GB for neste `--build` (punktet fra 9.1 står åpent).
