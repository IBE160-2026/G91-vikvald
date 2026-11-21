# Brukerreiser etter epic 2

## 2026-11-21 kl. 13:43 — Silje Krokdal Vikvald

### Oppgave
Den autonome kjøringen ba om å utvide brukerreisetestene etter at epic 2 er ferdig: flyt 3 og 4 i `EXPERIENCE.md` skal testes fra start til slutt, og flyt 1 og 2 skal få stegene epic 2 har gjort mulige. Oversikten i `docs/testing/brukerreiser.md` skal vise status for hvert steg.

### Plan
- Leste flytene i `EXPERIENCE.md` og de eksisterende e2e-testene for epic 2, og la felles hjelpefunksjoner i `frontend/e2e/brukerreiser/felles.ts` (PDF-er laget av testen, dra og slipp, oppsett gjennom API-et).
- Skrev én fil per flyt, kjørte dem mot `docker compose up --build`, og oppdaterte oversikten og KI-sporet.
- Instruksen står i `_bmad-output/implementation-artifacts/autonom-kjoring.md` (avsnittet «Brukerreiser»). Forrige utvidelse: [987-…-brukerreiser-etter-epic-1](987-2026-11-20-22-06-17-brukerreiser-etter-epic-1.md).

### Resultat
- Flyt 1 (`4541128`): emnet opprettes og åpnes fra forsiden, ny forelesning med dagens dato, PDF dras inn med vilkårsdialogen, fila i lista, utlogging, forelesningen fra sidemenyen, og feilveiene Word-fil, skannet PDF og over 50 sider. 13 steg.
- Flyt 2 (`9e852c7`): forsiden med emnet, emnesiden med åtte forelesninger og status, og «Uke 37: Merkevare» fra sidemenyen. 3 steg.
- Flyt 3 (`03de7ff`): alle fem stegene (slettedialogen, Esc uten sletting, erstatning og den nye fila i lista). Tallene for generert innhold står som `ikke bygd ennå` (story 3.1, 3.7, 4.1, 7.1).
- Flyt 4 (`5f4ef9c`): hele flyten med 3 emner, 15 forelesninger og 18 filer, feilveien «avbryter» og sletting av kontoen.
- Oversikten (`dcf0493`) og KI-sporet (`21471bb`). Issue #131 for valget om flyt 3.
- Tester: `uv run pytest` 313 bestått, `npm run test` 471 bestått, `npx playwright test` 83 bestått, brukerreisene tre ganger på rad uten feil. Flyttestene fant ingen feil i appen.

### Åpne punkter
- Se over valget om at flyt 3 regnes som ferdig testet, mens tallene for generert innhold venter på epic 3, 4 og 7 (#131).
