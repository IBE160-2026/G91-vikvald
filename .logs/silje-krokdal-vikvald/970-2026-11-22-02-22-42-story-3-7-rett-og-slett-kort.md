# Story 3.7: Rett og slett kort, og se hva som slettes

## 2026-11-22 kl. 02:22 — Silje Krokdal Vikvald

### Oppgave
Bygge story 3.7 fra `epics.md` i den autonome kjøringen: rette og slette kort i økten, telle flashcards i slettebekreftelsene (#134) og stoppe sletting mens en jobb pågår. Dette er siste story i epic 3.

### Plan
- `bmad-build-auto` på branchen `story/3-7`: [spesifikasjonen](../../_bmad-output/implementation-artifacts/spec-3-7-rett-og-slett-kort-og-se-hva-som-slettes.md), implementering av en subagent, gjennomgang med fire uavhengige gjennomgåere og rettinger.
- Alle testene, skjermbilder i 1280 og 768 px, sprintstatus, KI-spor, issues og PR.

### Resultat
- **Backend:** `PATCH`/`DELETE /api/flashcards/{id}` med eierskap og feilkodene `FLASHCARD_FRONT_REQUIRED`/`FLASHCARD_BACK_REQUIRED` (`08484cd`, `a3e954c`). Flashcards er meldt inn i telleregisteret. Et vaktregister i `content` gir `409 JOB_ALREADY_RUNNING` ved sletting og erstatning av fil og sletting av forelesning, emne og konto mens en jobb pågår (`7a94695`, `f4a6bb5`).
- **Frontend:** «Rediger» og «Slett» i bunnfeltet på det snudde kortet, dialogen «Rediger kortet» med tekstområder fra shadcn, den felles bekreftelsen «Slette kortet?», og `removeCard` etter reglene i E22 (`4e87939`–`13a3959`). Slettedialogen viser meldingen for 409 (`ac7cf53`).
- **Kontoteksten** sier nå «… slettes for godt: flashcards.». Brukerreisetesten for flyt 4, `konto.spec.ts` og `docs/testing/brukerreiser.md` er oppdatert for den teksten (`f420cae`). Løser #134.
- **Gjennomgang:** 29 funn, 7 rettinger (alle low): blant annet at «Øv igjen» rett etter sletting brukte gammel kortliste, og at feilen i redigeringsdialogen ble stående (`b2a9f7d`–`e12782e`). 16 avvist med begrunnelse, 4 falske.
- **Tester:** `uv run pytest` 460 bestått, `npm run test` 700 bestått, `tsc` rent, `npx playwright test` 121 bestått mot `docker compose up --build`.
- **Spor:** skjermbilder i `docs/skjermbilder/story-3-7/` (`450c81c`), sprintstatus med story 3.7 og epic 3 `done` (`ff8b88e`), KI-spor (`da49e82`), kanttilfellene #188–#193.

### Åpne punkter
- Vurder kanttilfellene fra story 3.7 (#188–#193), særlig at «Rediger»/«Slett» bare vises på snudd kort (#188) og vaktregisteret (#192).
- 409-meldingen i slettedialogen er bare testet i nettleseren med falskt svar fra serveren. Den ekte 409 er testet i pytest.
- En jobb som startes i nøyaktig samme øyeblikk som en sletting, er ikke låst ute (jobben feiler da uten å lagre).
