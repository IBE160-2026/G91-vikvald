# Story 4.4: Ta quiz på hele emnet

## 2026-11-22 kl. 12:06 — Silje Krokdal Vikvald

### Oppgave
Bygge story 4.4 i den autonome kjøringen: quiz på spørsmålene fra alle forelesningene i et emne, startet fra kortet «Øv på hele emnet» på emnesiden. I tillegg skulle årsaken til den ustabile `erstatt.spec.ts` finnes og rettes.

### Plan
- Branch `story/4-4`, `bmad-build-auto` med hensikten «Story 4.4 fra `_bmad-output/planning-artifacts/epics.md`: Ta quiz på hele emnet».
- Spesifikasjon: [spec-4-4-ta-quiz-paa-hele-emnet.md](../../_bmad-output/implementation-artifacts/spec-4-4-ta-quiz-paa-hele-emnet.md).
- Gjenbruke mønsteret fra story 3.6 (én økt-side med to omfang) og quizøkten fra 4.2–4.3.
- Finne årsaken til de ustabile testene med en belastningskjøring og loggen til frontenden.

### Resultat
- Backend: `GET /api/subjects/{id}/quiz-questions` (`1ba8c64`), med tester for rekkefølge, eierskap (404) og innlogging, og en test som lagrer en quizøkt uten forelesning (`e563270`).
- Emnesiden: Quiz-raden under Flashcards, «N spørsmål fra M forelesninger» og «Start →» (`92595a4`, `e0d9f25`). Jobbvakta frisker opp emnets quizspørsmål (`90de5de`).
- Økten: `/emner/<id>/quiz` med «<emne>, hele emnet», forelesningen i forklaringskortet og i lista over feilsvar, lagring med `lecture_id: null`, og alle veier tilbake til emnesiden (`85903d0`, `7f7344b`). Playwright: `frontend/e2e/quiz-hele-emnet.spec.ts` (`342d82f`).
- Ustabile tester: proxyen i Next.js og Uvicorn lukket begge ledige tilkoblinger etter 5 sekunder, så proxyen av og til brukte en lukket tilkobling (ECONNRESET). Uvicorn holder dem nå i 65 sekunder (`03ac713`). Under last: 1 feil av 60 før, 60 av 60 etter. Lukker de to punktene om `erstatt.spec.ts` i `issues.md`.
- Gjennomgang med fire gjennomgåere: 19 funn, 5 rettet, 1 utsatt, 13 avvist med begrunnelse i spesifikasjonen.
- Skjermbilder i `docs/skjermbilder/story-4-4/` (`464ff72`). KI-spor i `docs/ki-prosess/` (`f5ba8fe`). Sprintstatus: 4.4 er `done`.
- Tester: `uv run pytest` 538 bestått, `npm run test` 783 bestått, `npx tsc --noEmit` rent, `npx playwright test` 145 bestått mot `docker compose up --build`. Én pytest-kjøring mens Docker bygde på nytt hadde 1 feil som besto alene og i neste fulle kjøring.
- Kanttilfeller: #219–#222.

### Åpne punkter
- Vurder kanttilfellene fra story 4.4 (#219–#222), særlig at quiz skriver «<emne>, hele emnet» med komma mens flashcards bruker « · » (#219).
- Omfanget i Quiz-raden brytes over to linjer i kortet på 1440 piksler, fordi teksten er 15 px (DESIGN.md) mot 14 px i skisse 03.
- Spørsmål på samme side ordnes etter `created_at`; like tidsstempler gir tilfeldig rekkefølge (utsatt i spesifikasjonen, lav).
