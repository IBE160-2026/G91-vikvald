# Brukerreiser etter epic 4

## 2026-11-22 kl. 16:24 — Silje Krokdal Vikvald

### Oppgave
Den autonome kjøringen ba om å utvide Playwright-testene for brukerreisene (flyt 1–4 i `EXPERIENCE.md`) med quizstegene epic 4 har bygd, oppdatere `docs/testing/brukerreiser.md` og kjøre alle testene. #131 skulle få en kommentar om at bare modellkort gjenstår i flyt 3.

### Plan
- Lese flytene i `EXPERIENCE.md` og de vanlige quiztestene (`quiz*.spec.ts`, `slett-quizsporsmal.spec.ts`) for å finne tekster og valg.
- Legge felles hjelpere for quiz i `frontend/e2e/brukerreiser/felles.ts`.
- Flyt 1: steg 6 (Lag quiz venter, så «Lag quiz» med «Vanlig» og «Middels»), steg 7 (øver mens quizen lages), steg 9 (quizøkten) og steg 10 (resultatsiden).
- Flyt 2: steg 3 (quiz på hele emnet med forelesningen i kilden) og feilveien «slett et feil quizspørsmål».
- Flyt 3: quizspørsmål i slette- og erstattdialogen og i «Lag og øv».
- Oppdatere oversikten, KI-sporet og #131, kjøre alle testene og lage PR.

### Resultat
- Tester: `c1ff062` (flyt 1 og `felles.ts`), `faed0b9` (flyt 2), `935081e` (flyt 3). Oversikten: `c2d3534`. KI-sporet: `2fa7baa`.
- Testdataene er endret slik at demomodellen kan lage quiz (den krever minst fire definisjoner): flyt 1 har fire definisjoner (4 kort, 4 spørsmål). I flyt 2 har «Uke 37» og «Uke 38» fire hver (14 kort, 8 spørsmål). I flyt 3 slettes sju spørsmål gjennom API-et i forutsetningen, så det blir 11 fra den gamle fila, som i flyten. Valgene står i `beslutninger.md`.
- Testene holder igjen svaret om den ferdige jobben (`GET /api/jobs/{id}`), slik at de ser at «Lag quiz» venter og at quizen lages mens Klara øver.
- Flyttestene fant ingen feil i appen. Alle var grønne første gang.
- Testkjøringer: `uv run pytest` 545 passed. `npm run test` 801 passed (66 filer). `npx playwright test e2e/brukerreiser` 43 passed, og 129 av 129 med `--repeat-each=3`. Full `npx playwright test`: 154 passed i to kjøringer.
- De ustabile testene fra 4.5 (`vilkar.spec.ts:150`, `logg-inn.spec.ts:140`) feilet ikke: grønne i to fulle kjøringer og 88 av 88 med `--repeat-each=8`. Årsaken er ikke funnet, så punktet står fortsatt åpent.
- Kommentar lagt på #131: bare modellkort (epic 7) gjenstår i flyt 3.
- Observasjon, ikke endret: mens forespørselen «start flashcards-jobben» er underveis, er «Lag quiz» et øyeblikk aktiv. Backend avviser uansett en ny jobb mens en annen går (`JOB_ALREADY_RUNNING`).

### Åpne punkter
- Vurder om «Lag quiz» skal være sperret også mens forespørselen «start flashcards-jobben» er underveis (et kort vindu, se `beslutninger.md` 2026-11-22).
