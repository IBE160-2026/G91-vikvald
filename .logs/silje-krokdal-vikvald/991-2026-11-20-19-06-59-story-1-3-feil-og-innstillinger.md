# Story 1.3: feil på norsk og innstillinger fra ett sted

## 2026-11-20 kl. 19:06 — Silje Krokdal Vikvald

### Oppgave
Den autonome kjøringen bygde story 1.3 fra `epics.md`. Målet var ett felles feilformat i API-et, norske feiltekster fra én meldingsfil i frontenden og alle innstillingene lest fra ett sted, med `LLM_PROVIDER` og de tre bryterne.

### Plan
- Branch `story/1-3` og `bmad-build-auto`: først spesifikasjonen ([spec-1-3](../../_bmad-output/implementation-artifacts/spec-1-3-vis-feil-paa-norsk-og-les-innstillinger-fra-ett-sted.md)), så implementering i en subagent og gjennomgang med fire uavhengige gjennomgåere.
- Kjøre pytest, Vitest og Playwright mot `docker compose up --build`. Ingen skjermbilder, siden ingen side brukeren ser, er endret.
- Oppdatere sprint-status, KI-sporet og kanttilfelle-issues, og deretter lage PR og flette når CI er grønn.

### Resultat
- **Backend:**
  - `core/errors.py` har kodelista, `AppError` og de globale håndtererne. Uventede feil gir 500 `INTERNAL_ERROR` uten tekst og logges.
  - `core/config.py` har `LLM_PROVIDER` (`mock`, `mock-invalid` eller `vertex`) og de tre bryterne. En ugyldig verdi stopper oppstarten med én linje i loggen, og en tom verdi gir standardverdien.
  - Nye `GET /api/config` og `require_feature`. Health bruker `DATABASE_UNAVAILABLE` fra lista (#36).
- **Frontend:** `lib/api.ts` (transporten), `lib/messages.ts` (reserveteksten «Noe gikk galt. Prøv igjen.»), `lib/config.ts` (hooken) og TanStack Query i rotlayouten, som ikke prøver 4xx-feil på nytt.
- `.env.example`, README-tabellen og `docker-compose.yml` har de nye innstillingene.
- **Gjennomgang:** 36 funn, der 7 grupper ble rettet (`8b944f3`, `7495ee3`) og resten avvist med begrunnelse i spesifikasjonen.
- **Tester:**
  - `uv run pytest`: 26 passed
  - `npm run test`: 44 passed
  - `npx playwright test` mot `docker compose up --build`: 4 passed
- **Commits:** `351bc7b` (spesifikasjonen), `35b99e6` til `3a302df` (koden), `8b944f3` og `7495ee3` (rettingene) og `2f55d56` (KI-spor og status).
- **Issues:** kanttilfellene #41–#44 er laget. `CI` setter `LLM_PROVIDER=mock`, og den innstillingen leses nå.

### Åpne punkter
- Godkjenn eller skriv egne feiltekster for kodene som nå viser reserveteksten (#41).
- Se over kanttilfellene om HTTP-feilkoder (#42), feltnavnene i `/api/config` (#43) og tom verdi i `.env` (#44).
- Les over forklaringene av de tre bryterne i README. KI skrev dem ut fra navnene i `epics.md`.
