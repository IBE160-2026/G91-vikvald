# Brukerreiser etter epic 3

## 2026-11-22 kl. 05:56 — Silje Krokdal Vikvald

### Oppgave
Den autonome kjøringen ba en subagent utvide Playwright-testene for brukerreisene i `EXPERIENCE.md` etter at epic 3 (flashcards) var ferdig. Alle steg epic 3 har gjort mulige skulle testes, flashcards skulle inn i tellingene i flyt 3, og #131 skulle få en kommentar om hva som fortsatt venter.

### Plan
- Les flytene i `EXPERIENCE.md` og testene fra epic 3 på nytt.
- Flyt 1: «Lag flashcards» med «Vanlig» og jobbstatus, økten med Mellomrom, `1` og `2`, resultatsiden, og feilveiene for færre kort og feilet generering.
- Flyt 2: øving på hele emnet, øving i «Uke 37: Merkevare», og feilveiene rediger kort, slett kort og avslutt med Esc.
- Flyt 3: 18 flashcards i slette- og erstattdialogen, og «Lag og øv» etter erstatningen.
- Oppdatere `docs/testing/brukerreiser.md`, KI-sporet og #131, kjøre alle testene, lage PR og flette.

### Resultat
- Testene: `frontend/e2e/brukerreiser/felles.ts` (hjelpefunksjoner for flashcards), flyt 1 (`cb14d23`), flyt 2 (`e871351`) og flyt 3 (`60f3242`). Flyt 4 er uendret.
- Oversikten `docs/testing/brukerreiser.md` (`5e4dfe9`): alle steg med flashcards er `testet`. Quiz, semesterlinjen, status «Øvd», modellkort, fritekst og sammendrag er `ikke bygd ennå` med story. Ingen steg er kuttet.
- KI-sporet (`79cf57f`): seks beslutninger, fem korrigeringer og én oppføring i `prompts.md`.
- Flyttestene fant ingen feil i appen. Det ble ikke endret noe i appen.
- Testene: `uv run pytest` 460 passed. `npx playwright test` 131 passed mot `docker compose up --build`. `npm run test` (vitest) avsluttet med kode 0. Den endelige kjøringen står i PR-en.
- Kommentar i #131 om hva som venter: quizspørsmål (epic 4) og modellkort (epic 7).

### Åpne punkter
- Når epic 4 er ferdig: quiz i flyt 1 (steg 6, 7, 9 og 10), flyt 2 (steg 3 og feilveien for quizspørsmål) og quiztellingene i flyt 3 (#131).
- Når epic 7 er ferdig: modellkort i flyt 2 (steg 4) og i tellingene i flyt 3 (#131).
