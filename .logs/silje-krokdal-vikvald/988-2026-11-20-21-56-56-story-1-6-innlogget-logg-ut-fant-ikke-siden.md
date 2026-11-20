# Story 1.6: Bruk appen innlogget, logg ut og få «Fant ikke siden»

## 2026-11-20 kl. 21:56 — Silje Krokdal Vikvald

### Oppgave
Den autonome kjøringen bygde story 1.6 (siste story i epic 1) med story-prompten i `autonom-kjoring.md`: toppfelt og forside for innloggede, vakt som sender til innloggingen, utlogging, «Du er logget ut» ved utløpt innlogging, «Fant ikke siden», felles hjelper for «bare egne rader», rutetest for `current_user` og felles dialog.

### Plan
- Branch `story/1-6`, `bmad-build-auto` med spesifikasjon på bokmål: [spec-1-6](../../_bmad-output/implementation-artifacts/spec-1-6-bruk-appen-innlogget-logg-ut-og-faa-fant-ikke-siden.md).
- Implementering i subagent, gjennomgang med fire uavhengige gjennomgåere, rettinger.
- Alle tester, skjermbilder i 1280 og 768 px, sprint-status, KI-spor, issues for kanttilfeller, PR og fletting.

### Resultat
- Backend (`d6dc5bc`): `POST /api/identity/logout` (204, sletter cookien), `get_owned` i `backend/app/core/ownership.py` (likt `404 NOT_FOUND` for andres rad og ukjent id), `test_route_guard.py` som krever `current_user` på alle ruter unntatt de fem offentlige.
- Frontend (`741f366`): route-gruppen `(app)` med vakt via `/me`, toppfelt (logo-lenke, initial + «Konto», «Logg ut»), forsiden «Dine emner», felles 401-håndtering med flagg per fane i `sessionStorage`, meldingen på innloggingssiden i `role="status"`, «Fant ikke siden» (`app/not-found.tsx`, `(app)/not-found.tsx`, `notFoundOnMissing`), dialogen `components/dialog.tsx`.
- E2E (`fbc780a`): `e2e/innlogget.spec.ts`; README (`90d098b`).
- Gjennomgang: 33 funn, 16 rettet i `86b3338` (blant annet tom side ved Tilbake etter utløp, løkkefare i 401-låsen, dialogtaster, `Mount`/websocket i rutetesten), krav-ID-er rettet i `83df39e`, 17 avvist med grunn i spesifikasjonen.
- Skjermbilder i `docs/skjermbilder/story-1-6/` (`1ee5f62`), sammenlignet med skisse 01 og 02. Avvik: forsiden mangler undertittel, «Nytt emne» og semesterlinje fra skisse 02 (kommer i epic 2).
- Tester: `uv run pytest` 126 passed, `npm run test` 241 passed, `npx tsc --noEmit` ok, `npx playwright test` 24 passed mot `docker compose up --build`.
- Sprint-status: story 1.6 og epic 1 `done`. KI-spor i `46a81a2`. Kanttilfeller lagt fram som #58–#64.

### Åpne punkter
- Se over kanttilfellene i story 1.6: flagget i `sessionStorage`, `push` ved utlogging, feilmelding ved mislykket utlogging, toppfelt på «Fant ikke siden», adressen `/konto` (#58–#62).
- Avgjør om utlogging skal trekke tilbake JWT-en (#63).
- Les over tekstene KI skrev i story 1.6 (fanetitler, «Lukk», README) (#64).
- Dialogen har ikke `inert` eller scroll-lås; vurderes når den tas i bruk i epic 2.
