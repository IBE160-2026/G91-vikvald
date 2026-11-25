# Story 8.3: Fritekst for hele emnet og slett dårlige spørsmål

## 2026-11-25 kl. 21:37 — Silje Krokdal Vikvald

### Oppgave
Bygge story 8.3 i den autonome kjøringen: øve på fritekstspørsmål fra hele emnet og slette dårlige spørsmål under øving. Deretter kjøre alle testene, ta skjermbilder, sette 8.3 og epic 8 til `done`, føre KI-sporet, lage issuer for kanttilfeller og flette PR-en.

### Plan
- `bmad-build-auto` med story-prompten fra [autonom-kjoring.md](../../_bmad-output/implementation-artifacts/autonom-kjoring.md). Spesifikasjon: [spec-8-3](../../_bmad-output/implementation-artifacts/spec-8-3-fritekst-for-hele-emnet-og-slett-darlige-sporsmal.md).
- Byggesteinene som ble gjenbrukt: øvingen på hele emnet (3.6, 4.4), slettingen i quizen (4.5), regelen for «øvd» (5.1) og fritekst-økten (8.2).
- Kjøringen stoppet én gang fordi disken var full (215 MB ledig), og fortsatte etter at Silje ryddet. Resten ble gjort med ett bygg og én full Playwright-kjøring.

### Resultat
- Backend: `GET /api/subjects/{id}/freetext-questions` og `DELETE /api/freetext-questions/{id}` bak `FEATURE_FREETEXT` (`8189114`).
- Frontend: raden «Fritekstspørsmål» på emnesiden (`d960bdc`), ruta `/emner/<id>/fritekst` og «Slett» med slettebekreftelse i fritekst-økten (`2502c4f`, `b342e6a`).
- Tester og testplan: `9bb1ee0`, `cf85138`. Rettelser fra gjennomgangen: `aa4aacf` (24 funn, 2 rettet, 1 utsatt).
- Spesifikasjonen er satt til `done` (`51dccd3`). Skjermbildene ligger i `docs/skjermbilder/story-8-3/` (`5fe03d5`). Sprintstatus: 8.3 og epic 8 er `done` (`bb2a4a1`). KI-sporet: `6858d27`. Kanttilfellene er #344–#347.
- Testene: `uv run pytest` 931 bestått, `npm run test` 1050 bestått, `npx tsc --noEmit` rent, `npx playwright test` 202 bestått, 4 hoppet over og 0 feilet.

### Åpne punkter
- Vurder kanttilfellene fra story 8.3 (#344–#347).
- Utsatt fra gjennomgangen: sletter studenten alle spørsmålene fra den første jobben i en forelesning, kan en tidligere emneøkt slutte å telle som «øvd». Regelen er fra 5.1 og gjelder alle typer innhold (#348).
