# Story 4.5: Slett et dårlig spørsmål under quizen

## 2026-11-22 kl. 15:55 — Silje Krokdal Vikvald

### Oppgave
Den autonome kjøringen ba om story 4.5 fra `epics.md` (siste story i epic 4): studenten skal kunne slette et dårlig quizspørsmål mens hun tar quizen, med den felles slettebekreftelsen og reglene i E22 fra story 3.7.

### Plan
- `bmad-build-auto` med spesifikasjonen [spec-4-5-slett-et-darlig-sporsmal-under-quizen.md](../../_bmad-output/implementation-artifacts/spec-4-5-slett-et-darlig-sporsmal-under-quizen.md), bygd på mønsteret fra 3.7.
- Gjennomgang med fire gjennomgåere, retting av funn, alle tester, skjermbilder, sprint-status, KI-spor, issues og PR.
- Kjøringen ble avbrutt av bruksgrensen for API-et midt i gjennomgangen og fortsatte der den stoppet.

### Resultat
- Backend: `DELETE /api/quiz-questions/{id}` (204; andres, ukjent og ugyldig id gir lik 404; 401 uten innlogging; ikke sperret av en jobb) (`fd135c3`, `2b4f191`).
- Frontend: rød tekstknapp «Slett» i bunnfeltet under spørsmålet, før og etter bekreftelse, ingen «Rediger» (`4345ae6`); bekreftelsen «Slette spørsmålet?» / «Slett spørsmålet», og spørsmålet tas ut av økten med `removeCard` etter E22 (`c9c88df`); Playwright-test med bare tastatur og axe på 1280 og 768 px (`d25f6be`).
- Gjennomgangen: 25 funn. Rettet at «Ta quizen igjen» kunne hente tilbake et slettet, bekreftet spørsmål når hentingen feilet (`b0a8899`). 2 utsatt, 17 avvist med begrunnelse i spesifikasjonen.
- Tester: `uv run pytest` 545 bestått, `npm run test` 801 bestått, `npx tsc --noEmit` rent, `npx playwright test` 148 bestått (én ustabil test i `vilkar.spec.ts` feilet i første fulle kjøring, grønn alene og i neste kjøring).
- Skjermbilder i `docs/skjermbilder/story-4-5/` (`42d0abb`). Sprint-status: 4.5 og epic 4 `done` (`2daaecc`). KI-spor (`c8f7827`). Kanttilfeller #226–#229.

### Åpne punkter
- Vurder kanttilfellene fra story 4.5 (#226–#229), særlig om slettede spørsmål og kort skal huskes slik at «+ Lag flere» ikke lager dem igjen (#229).
- Enkelte Playwright-tester (`vilkar.spec.ts:150` filvelgeren, `logg-inn.spec.ts:140`) feilet hver én gang i fulle kjøringer og var grønne alene.
