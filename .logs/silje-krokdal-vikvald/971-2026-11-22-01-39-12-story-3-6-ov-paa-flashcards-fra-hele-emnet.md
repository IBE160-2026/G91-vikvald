# Story 3.6: Øv på flashcards fra hele emnet

## 2026-11-22 kl. 01:39 — Silje Krokdal Vikvald

### Oppgave
Bygge story 3.6 i den autonome kjøringen: studenten skal kunne øve på flashcardene fra alle forelesningene i et emne samlet. Klokketesten fra 3.5 (emneøkt med nettleserens klokke fem minutter etter) skulle legges til med en ekte emneøkt.

### Plan
- `bmad-build-auto` med spesifikasjonen [spec-3-6-oev-paa-flashcards-fra-hele-emnet.md](../../_bmad-output/implementation-artifacts/spec-3-6-oev-paa-flashcards-fra-hele-emnet.md): ny API-rute, kortet «Øv på hele emnet» på emnesiden, og øktsiden fra 3.3–3.5 gjenbrukt med emnet som omfang.
- Gjennomgang med fire gjennomgåere, alle testene, skjermbilder i 1280, 1440 og 768 px, KI-spor, issues og PR.

### Resultat
- **Backend:** `GET /api/subjects/{id}/flashcards` i `content` gir alle kortene i emnet med kilde og forelesning (`108249c`).
- **Emnesiden:** kortet «Øv på hele emnet» med raden Flashcards («N kort fra M forelesninger», «Øv på flashcards»), som bare vises når emnet har kort. Kortet er generelt, så quiz og fritekst kan legge til rader (`d47c9ae`). Jobbovervåkeren oppdaterer antallet (`c157b5e`).
- **Økten:** `/emner/<id>/flashcards` bruker samme øktside. Panelet viser «Markedsføring · hele emnet», lagringen har `lecture_id: null`, og alle veier tilbake går til emnesiden med «Tilbake til emnet» (`b697182`).
- **E2e:** `hele-emnet.spec.ts`, med klokketesten (`4a64842`). Implementeringsagenten satte klokka fem minutter foran, ikke etter. Rettet i `1e6bf16`.
- **Gjennomgang:** 21 funn, 5 rettet (`b33c15f`), 9 avvist og 7 falske. Skjermbildene viste for mye luft i kortet (40 px mot 24 px i skissen), også rettet i `b33c15f`.
- **Tester:**
  - `uv run pytest`: 432 bestått
  - `npm run test`: 669 bestått
  - `npx tsc --noEmit`: rent
  - `npx playwright test`: 117 bestått mot `docker compose up --build`
- **Spor:** skjermbilder i `docs/skjermbilder/story-3-6/` (`c96f231`), KI-spor (`c6b5c7d`), kanttilfellene #180–#186.

### Åpne punkter
- Vurder kanttilfellene fra story 3.6 (#180–#186), særlig teksten «Tilbake til emnet» (#180) og at kortet står under tabellen på 1280 px (#182).
