# Story 6.6: avsluttende kontroll

## 2026-11-23 kl. 20:41 — Silje Krokdal Vikvald

### Oppgave
Bygge story 6.6 i den autonome kjøringen: den avsluttende kontrollen av universell utforming, skjermbredde, nettlesere og kvalitet med ekte modell. Alt som kan automatiseres, skulle bygges og kjøres. Kontrollene som er Siljes, skulle gjøres klare med tom mal, framgangsmåte og issue, uten at KI gjør eller fyller dem ut.

### Plan
- `bmad-build-auto` med spesifikasjonen [spec-6-6](../../_bmad-output/implementation-artifacts/spec-6-6-gjoer-den-avsluttende-kontrollen-av-universell-utforming-skjerm-nettlesere-og-kvalitet.md) (norsk), bygging i subagent, gjennomgang med fire gjennomgåere, rettelser.
- Playwright: samlet axe-test i 1280 og 768 px, seed-tester, kjerneflyt i Chrome.
- Eksportskript for stikkprøven, testet med demodata.
- Maler i `docs/kvalitet/README.md` og `docs/testplan.md`, issues for Siljes kontroller og kanttilfellene.

### Resultat
- Nye filer: `frontend/e2e/universell-utforming.spec.ts`, `frontend/e2e/kjerneflyt.spec.ts`, `backend/scripts/export_quality_sample.py`, `backend/tests/test_quality_export.py`, `docs/kvalitet/README.md`. Endret: `frontend/playwright.config.ts`, `docs/testplan.md`, `README.md`, `sprint-status.yaml` (6.6 og epic 6 `done`), KI-sporet.
- axe fant ingen brudd og ingen side hadde vannrett rulling i 768 px, så ingen appkode ble endret. Ingen skjermbilder, siden ingenting brukeren ser ble endret.
- Gjennomgang: 39 funn, 28 rettet, 1 utsatt (#301), 10 avvist.
- Tester på `c51bfa2`: pytest 732 bestått; Vitest 918 bestått; Playwright mot `docker compose up --build -d` 185 bestått og 4 hoppet over (seed-testene mot gamle `pgdata`); `E2E_REQUIRE_SEED=1` mot `-p sk-seedtest` 189 bestått; Chrome 158.0.8127.37 bestått. Eksportskriptet ga 30 rader fra testbrukeren og nektet å skrive over fila. `sk-seedtest` ryddet med `down -v`; `pgdata` ikke rørt.
- Siljes kontroller: #295 (SK-12), #296 (200 %), #297 (Edge), #298 (Safari), #299 (stikkprøven), #300 (SK-16), kommentar på #4 (modellvalget). Kanttilfeller: #301–#308.
- Commits fra `6fdd41c` til `3271b0a` på `story/6-6`.

### Åpne punkter
- Gå gjennom kjerneflyten med bare tastatur og før resultatet i testplanen (SK-12, #295).
- Kontroller kjerneflyten med 200 % zoom og før resultatet (NFR-14, #296).
- Kjør kjerneflyten i Edge (#297) og eventuelt Safari, som kan kuttes (#298).
- Lag stikkprøven med Gemini, vurder den mot læreboka og før tallene og ventetiden i `docs/kvalitet/` (SK-13–SK-15, SK-17, NFR-17, #299).
- Velg modell ut fra stikkprøven og sett den i `.env.example` (#4).
- Bør ha-testen må kreve at inngangen finnes når epic 7–9 bygges (#301).
- Vurder kanttilfellene fra story 6.6 (#301–#308), særlig vurderingsverdiene og SK-14 (#305).
