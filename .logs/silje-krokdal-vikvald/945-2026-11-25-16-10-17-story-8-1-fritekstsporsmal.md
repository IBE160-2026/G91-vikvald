# Story 8.1: Lag fritekstspørsmål

## 2026-11-25 kl. 16:10 — Silje Krokdal Vikvald

### Oppgave
Bygge story 8.1 («Lag fritekstspørsmål») i den autonome kjøringen med `bmad-build-auto`: kortsvar- og langsvarsspørsmål med modellsvar fra en forelesning, bak bryteren `FEATURE_FREETEXT`, uten kall til Vertex AI. Løse det som hører til storien i #301 (axe-testen skal kreve fritekstraden) og #236 (fritekstøkter skal telle som «øvd»).

### Plan
- Konteksten for epic 8 ble kompilert, og spesifikasjonen skrevet på norsk: [spec-8-1-lag-fritekstsporsmal.md](../../_bmad-output/implementation-artifacts/spec-8-1-lag-fritekstsporsmal.md).
- En implementeringsagent kodet etter spesifikasjonen, med 7.1 (`model_cards.py`) som mønster.
- Fire gjennomgåere (Blind Hunter, Edge Case Hunter, Verification Gap, Intent Alignment) gikk gjennom diffen. Funnene ble vurdert, og småfeil ble rettet.
- Alle testene ble kjørt, også Playwright mot `docker compose up --build -d` og seed-testene mot `sk-seedtest`. Skjermbilder ble tatt i 1280 og 768 px.

### Resultat
- **Backend:** migrering 0011 lager `freetext_questions`. `content` lagrer, teller og registrerer fritekst for «øvd» (#236). Den nye typen ligger i `generation/freetext.py` med instruksen `instructions/freetext.md`. Registeret har omfang per type (fritekst 5/10/15) og `question_kind`, og `Save` får jobbens valg. Commit `bc52d00`, `58d7f87`.
- **Frontend:** raden «Fritekstspørsmål» med dialogen for type og omfang, uten «Øv nå» til story 8.2. Commit `79fd421`.
- **Playwright:** `fritekst.spec.ts`. Axe-testen krever raden når bryteren er på (#301). Kontoteksten nevner fritekstspørsmål. Commit `a263330`, `5f4bbc2`.
- **Gjennomgangen:** 28 funn, hvorav 6 rettet (`bad3400`), 1 utsatt og resten avvist med grunn i spesifikasjonen.
- **Testbrukertesten:** den ventet ennå 15 kort i «Øv på hele emnet», selv om story 7.2 tok med modellkortene. Den er rettet (`a0d41f2`).
- **Skjermbilder** i `docs/skjermbilder/story-8-1/` (`b5a1992`). De stemmer med skisse 04 og dialogmønsteret i 06. «Øv nå» mangler med vilje.
- **Sprint-status:** 8.1 er `done`, og epic 8 er `in-progress` (`df1a887`). KI-sporet er ført (`5a31fb6`).
- **Kanttilfeller:** #329–#334.
- **Tester:**
  - `uv run pytest`: 905 bestått, og `ruff` er rent.
  - `npm run test`: 984 bestått, og `npx tsc --noEmit` er rent.
  - `npx playwright test`: 197 bestått og 4 hoppet over (de trenger seed).
  - Seed-testene mot `sk-seedtest` med `E2E_REQUIRE_SEED=1`: grønne. Seed lager 5 fritekstspørsmål per eksempelforelesning.
- Appen ble stoppet med `docker compose down`. `sk-seedtest` ble ryddet bort med `down -v` og `docker image rm`.

### Åpne punkter
- Vurder kanttilfellene fra story 8.1 (#329–#334), særlig standardverdiene når typen mangler (#329) og tekstene KI valgte (#331).
- Bare 2,4 GB disk er ledig etter `docker builder prune -f` og `docker image prune -f`. Det er under grensen på 5 GB for neste `--build`.
