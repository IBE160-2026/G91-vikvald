# Story 4.1: Lag quizspørsmål fra en forelesning

## 2026-11-22 kl. 06:51 — Silje Krokdal Vikvald

### Oppgave
Bygge story 4.1 fra `epics.md` i den autonome kjøringen: quiz som ny innholdstype i genereringsløpet fra epic 3, med omfang og vanskelighetsgrad, Quiz-raden i «Lag og øv» og dialogen «Lag quiz». Første story i epic 4.

### Plan
- `bmad-build-auto` på branchen `story/4-1`: [spesifikasjonen](../../_bmad-output/implementation-artifacts/spec-4-1-lag-quizsporsmal-fra-en-forelesning.md) og [epic-4-konteksten](../../_bmad-output/implementation-artifacts/epic-4-context.md), implementering av en subagent, gjennomgang med fire uavhengige gjennomgåere og rettinger.
- Alle testene, skjermbilder i 1280 og 768 px, sprintstatus, KI-spor, issues og PR.

### Resultat
- **Backend:** tabellen `quiz_questions` (migrering 0008) og lagring der alternativene blandes én gang med et frø fra SHA-256 (`a29a25f`). Quiz er meldt inn i registeret med mock-regel, kontroll, `break_item` for `mock-invalid`, vanskelighetsgrad og instruksen `prompts/quiz.txt` (`9076350`). Quizspørsmål telles i slettebekreftelsene, og slettevakten gjelder også quizjobber.
- **Frontend:** felles `GenerationRow` for Flashcards- og Quiz-raden, ventetekstene «Venter til … er ferdige», og dialogen «Lag quiz» med omfang og vanskelighetsgrad (`3fd489e`). Playwright-testen `quiz.spec.ts`, og ny kontotekst «… slettes for godt: flashcards og quizspørsmål.» i flyt 4 og `konto.spec.ts` (`3c6c932`).
- **Gjennomgang:** 26 funn, 4 rettet (`46aa4fa`), 1 utsatt til epic 6, 21 avvist med begrunnelse. På skjermbildene fant KI i tillegg at «Øv nå» var av mens en annen rad lagde innhold; rettet (`53fad5a`).
- **Tester:** `uv run pytest` 523 bestått, `npm run test` 717 bestått, `tsc` rent, `npx playwright test` 133 bestått mot `docker compose up --build`.
- **Spor:** skjermbilder i `docs/skjermbilder/story-4-1/` (`d123c60`), sprintstatus med story 4.1 `done` og epic 4 `in-progress` (`0e7f73a`), KI-spor (`e74c091`), kanttilfellene #197–#204.

### Åpne punkter
- Vurder kanttilfellene fra story 4.1 (#197–#204), særlig meldingen når ingen spørsmål ble laget (#197) og ferdigmeldingen (#198), som ikke står ordrett i EXPERIENCE.md.
- Instruksen for quiz er ikke koblet til en ekte modell ennå. Det, og at en ekte modell kan gi spørsmål som finnes fra før, hører til epic 6.
- Den midlertidige mappa `frontend/e2e-skjermbilder/` (skjermbildeskriptet) ble ikke slettet, fordi slettekommandoen ble avvist av tillatelsene. Den er ikke committet og kan slettes.
- `filer.spec.ts` (FR-8) feilet én gang i en full Playwright-kjøring, men besto alene og i neste fulle kjøring. Følg med på om den er ustabil.
