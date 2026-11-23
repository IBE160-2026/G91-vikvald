# Brukerreiser etter epic 5

## 2026-11-23 kl. 10:47 — Silje Krokdal Vikvald

### Oppgave
Utvide Playwright-testene av brukerreisene (flyt 1–4 i EXPERIENCE.md) med det epic 5 har bygd: status «Øvd», tellinger i tabellen, tiden til eksamen, emnekortene med «Åpne» og semesterlinja. Oppdatere oversikten i `docs/testing/brukerreiser.md` og KI-sporet, og flette via PR. Kjørt av den autonome kjøringen.

### Plan
- Lese `autonom-kjoring.md` («Brukerreiser»), PR #231 og specene for story 5.1–5.5.
- Branch `brukerreiser/epic-5`. Nye hjelpere i `felles.ts` (dato relativt til i dag, semesterlinja, emnekortet, prikken i sidemenyen).
- Flyt 1 steg 2 og flyt 2 steg 1–2 (og SISTE ØKT i steg 3) testet. Semesterlinja sjekkes via sr-only-lista og det synlige, ikke SVG-detaljer.
- Eksamen alltid tre uker fram fra dagens dato.

### Resultat
- `9503d54` flyt 1: semesterlinja uten stasjoner (E6) og emnekortet med NESTE STEG i steg 2, «Åpne», prikken «Ikke øvd ennå» i steg 6 og «Øvd» i steg 8. Eksamen er nå relativ (før fast 04.12.2026).
- `345c9dc` flyt 2: forutsetningen lagrer fire økter (uke 34–37) gjennom API-et. Steg 1 sjekker «4 av 8 forelesninger øvd», «om 3 uker», «Neste å øve på» Uke 38. Steg 2 sjekker «Øvd dd.mm», Kort, Quiz, prikkene og semesterlinja, og at alle åtte er øvd etter emneøkten. SISTE ØKT etter flashcards og quiz.
- `cfa5560`: oversikten oppdatert (`docs/testing/brukerreiser.md`), nytt avsnitt «Det epic 5 har bygd som ingen flyt viser». KI-sporet i `aa0cff9`.
- Ingen feil i appen. Én feil i KI-ens test (manglende «Siste økt»-overskrift) ble rettet i testen, ført i `korrigeringer.md`.
- Tester: `uv run pytest` 567 passed; `npm run test` 910 passed; `npx playwright test` 176 passed; brukerreisene 43 passed, flyt 1 og 2 96 av 96 med `--repeat-each=3`.

### Åpne punkter
- Flyt 1 steg 11 (sammendrag, epic 9) og flyt 2 steg 4–7 (modellkort epic 7, fritekst epic 8) og formelmerket (story 6.3) testes når de er bygd.
