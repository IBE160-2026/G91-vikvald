# Story 3.1: Lag flashcards fra en forelesning i demomodus

## 2026-11-21 kl. 18:26 — Silje Krokdal Vikvald

### Oppgave
Den autonome kjøringen bygde story 3.1 fra `epics.md`, første story i epic 3: «Lag flashcards» på forelesningssiden lager kort fra notatene med mock-modellen, uten nøkkel eller nett. Storien legger grunnmuren som de andre innholdstypene bygger på: språkmodellporten, registeret over innholdstyper, genereringsløpet og jobbene.

### Plan
- Branch `story/3-1`, `bmad-build-auto` med spesifikasjon på norsk: [spec-3-1](../../_bmad-output/implementation-artifacts/spec-3-1-lag-flashcards-fra-en-forelesning-i-demomodus.md) og samlet kontekst for epic 3 ([epic-3-context](../../_bmad-output/implementation-artifacts/epic-3-context.md)).
- Implementering av en subagent (avbrutt av bruksgrensen for API-et og fortsatt etterpå), gjennomgang med fire gjennomgåere, retting.
- Alle tester (pytest, Vitest, Playwright mot `docker compose up --build`), skjermbilder i 1280 og 768 px.
- Sprintstatus, KI-spor, kanttilfelle-issues, sesjonslogg, PR og fletting.

### Resultat
- Backend: ny modul `generation` med porten `generate(kind, pages, options)`, `MockGenerator` og `InvalidMockGenerator`, registeret over innholdstyper (flashcards først), løpet i AR-4 (sider → port → `validate_item` → forkast og tell → lagre i én transaksjon), jobbrutene `POST /api/lectures/{id}/jobs` (202, 409, 422, 404) og `GET …/jobs/latest`, og instruksene i `prompts/flashcards.txt`. `LLM_PROVIDER=vertex` stopper oppstarten, og avbrutte jobber blir `JOB_INTERRUPTED` i `lifespan`. `content` eier tabellen `flashcards` og tellingen `GET …/content-counts`. Migrering 0006. Commits `1c3e17a`, `f9679a3`, tester i `14a8dde`.
- Frontend: «Lag og øv» ved siden av «Filer» med Flashcards-raden, de felles komponentene `create-row` og `job-status` (shadcn-spinner tilpasset DESIGN.md) og levende område for start og slutt. Commit `08e525c`. README og `.env.example` i `fb3ee3d`.
- Gjennomgang: 43 funn. 10 rettet i `d5f7771`, `dacf480` og `f346bb2` (bl.a. like kort fra samme begrep, layout ved 1280 px og smal skjerm, tre nye tester), 4 utsatt (tidsgrense i 3.2, sletting under jobb i 3.7, deduplisering for ekte modell, test av slettet forelesning under jobb), resten avvist med begrunnelse i spesifikasjonen (`39df0ab`).
- Skjermbilder i `docs/skjermbilder/story-3-1/` (`c52baeb`).
- Tester: `uv run pytest` 375 grønne, `ruff` rent, `npm run test` 484 grønne, `tsc --noEmit` uten feil, `npx playwright test` 86 grønne (også brukerreisene).
- Sprintstatus: 3.1 `done`, epic 3 `in-progress` (`1705337`). KI-spor i `41bfc0e`. Kanttilfellene er #134–#141.

### Åpne punkter
- Vurder kanttilfellene fra story 3.1 (#134–#141), særlig at flashcards ikke er meldt inn i slette-registeret før 3.7 (#134) og at «Øv nå» ikke er aktiv før 3.3 (#135).
- Når story 3.7 melder flashcards inn i slette-registeret, må brukerreisetesten for flyt 4 vente «… slettes for godt: flashcards.» (#134).
- `vilkar.spec.ts` («FR-11: vilkårsdialogen med bare tastatur») feilet én gang på tidsavbrudd under en full parallell kjøring og gikk grønt ellers. Følg med på om den er ustabil.
