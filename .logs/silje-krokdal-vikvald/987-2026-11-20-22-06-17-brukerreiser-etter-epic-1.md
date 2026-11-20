# Brukerreiser etter epic 1

## 2026-11-20 kl. 22:06 — Silje Krokdal Vikvald

### Oppgave
Den autonome kjøringen ba om å utvide brukerreisetestene etter at epic 1 er ferdig: én Playwright-fil per flyt i `EXPERIENCE.md`, med bare de stegene som er bygd, og en oversikt i `docs/testing/brukerreiser.md`.

### Plan
- Delte de fire flytene i `EXPERIENCE.md` inn i steg og fant krav-ID-ene i `EXPERIENCE.md`, PRD-en og dekningstabellene i `epics.md`.
- Skrev testene i `frontend/e2e/brukerreiser/` etter mønsteret i de eksisterende e2e-testene, med axe på hver side.
- Kjørte alle testene mot `docker compose up --build`, oppdaterte KI-sporet og laget PR på branchen `test/brukerreiser-epic-1`.
- Instruksen står i `_bmad-output/implementation-artifacts/autonom-kjoring.md` (avsnittet «Brukerreiser»).

### Resultat
- `frontend/e2e/brukerreiser/felles.ts` med felles hjelpere, og fire testfiler (`29868c6`). Flyt 1 har fire steg som kjører i rekkefølge i samme nettleser: forutsetning (oppretter konto), steg 1 (logger inn), steg 2 (forsiden «Dine emner») og steg 5 (logger ut). Flyt 2, 3 og 4 har bare `describe`, fordi første steg trenger epic 2 og ingen av dem har et eget innloggingssteg.
- `docs/testing/brukerreiser.md` med én tabell per flyt (`5a79705`, rettet i `b2048f9`). Ingen steg er kuttet.
- «Fant ikke siden» og «Du er logget ut» står ikke i noen flyt og testes fortsatt i `innlogget.spec.ts`.
- KI-spor i `beslutninger.md`, `korrigeringer.md` og `prompts.md` (`fc8b0f4`).
- Tester: `uv run pytest` 126 bestått, `npm run test` 241 bestått (21 filer), `npx playwright test` 28 bestått, med de 4 nye. Ingen feil i appen ble funnet.

### Åpne punkter
- Ingen. Flyttestene utvides etter hver epic etter planen i `autonom-kjoring.md`.
