# Story 4.2: Ta quiz på en forelesning

## 2026-11-22 kl. 10:42 — Silje Krokdal Vikvald

### Oppgave
Bygge story 4.2 i den autonome kjøringen: studenten tar quiz på quizspørsmålene fra en forelesning, velger og bekrefter svar før fasit og forklaring vises, og økten lagres. «Øv nå» på Quiz-raden skulle bli aktiv (#201).

### Plan
- Branch `story/4-2`, `bmad-build-auto` med hensikten «Story 4.2 fra `epics.md`: Ta quiz på en forelesning».
- Spesifikasjon: [spec-4-2-ta-quiz-paa-en-forelesning.md](../../_bmad-output/implementation-artifacts/spec-4-2-ta-quiz-paa-en-forelesning.md).
- Gjenbruke øktrammen fra epic 3 (øktpanel, svarrutenett, hurtigtaster, `useSessionSaver`) med en quizadapter, ikke bygge en ny økt.
- Gjennomgang med fire lag, retting, alle tester, skjermbilder, KI-spor, issues og PR.

### Resultat
- Backend: `GET /api/lectures/{id}/quiz-questions` med fasit, forklaring, kilde og forelesning (`e8ada84`).
- Frontend: quizadapter og to nye rene øktfunksjoner (`4566b0e`), svaralternativ, forklaringskort og spørsmålsvisning (`f0bd039`), quizøkten på `/forelesninger/<id>/quiz` med lagring, hurtigtaster og en enkel resultatvisning, og «Øv nå» aktiv (`9b7fbd2`). Playwright-tester for hele økten med bare tastatur og axe (`c590f49`).
- Gjennomgang: 26 funn, 9 rettet (bl.a. at Esc etter siste bekreftede svar lagret quizen som avbrutt), 17 avvist med begrunnelse (`7be4184`, `8ae86a0`).
- Tester: `uv run pytest` 530 bestått, `npm run test` 754 bestått, `npx tsc --noEmit` rent, `npx playwright test` 137 bestått mot `docker compose up --build`. `filer.spec.ts` feilet ikke denne gangen.
- Skjermbilder i `docs/skjermbilder/story-4-2/` (`9f64d7f`), sprintstatus `done` (`da7a500`), KI-spor (`afe9c55`).
- Kanttilfeller: #206–#212. #201 lukkes av PR-en.

### Åpne punkter
- Vurder kanttilfellene fra story 4.2 (#206–#212), særlig den enkle resultatvisningen (#206) og at Esc etter siste svar fullfører quizen (#209).
- Story 4.3 må bygge videre på resultatvisningen og gi Enter «Ta quizen igjen», så hurtigtastdialogen stemmer (#212).
- Forklaringskortet mangler ordet «Kilde» foran fila og understrekingen fra skisse 09.
