# Brukerreiser etter epic 6

## 2026-11-23 kl. 21:12 — Silje Krokdal Vikvald

### Oppgave
Utvide Playwright-testene av brukerreisene (flyt 1–4 i EXPERIENCE.md) med det epic 6 har bygd, etter avsnittet «Brukerreiser» i `autonom-kjoring.md`. Særlig feilveien «Inneholder formel – sjekk mot kilden» i flyt 2.

### Plan
- Gå gjennom epic 6 (6.1–6.6) og finne hva som er steg i en flyt. Bare formelmerket (6.3) er det.
- Bruke PDF-hjelperen fra story 6.3 (`e2e/pdf.ts`, `formulaPages`) til å gi side 5 i `prising.pdf` i flyt 2 en formel.
- Ny feilvei-test sist i flyt 2, og sjekk i steg 2 og 3 av at bare innhold fra formelsiden er merket.
- Oppdatere `docs/testing/brukerreiser.md`, kjøre alle testene, KI-sporet, PR og fletting.

### Resultat
- `frontend/e2e/brukerreiser/felles.ts`: `pdfFile` tar `formulaPages`; nye hjelpere `formulaFlag` og `expectFormulaFlagAboveSource`.
- `flyt-2-for-eksamen.spec.ts`: «Feilvei (formelmerke) – FR-40, FR-41, UX-DR37»: hun øver på «Uke 38: Prising», kortet om margin har merket rett over «prising.pdf, side 5», også når det kommer igjen og i feillista (08), og fila står i fillista med 5 sider. Steg 2 og 3 sjekker at bare margin-innholdet er merket. Commit `4a6ba32`.
- `docs/testing/brukerreiser.md`: feilveien står som testet, nytt avsnitt «Det epic 6 har bygd som ingen flyt viser». Commit `75a0149`.
- `docs/testplan.md`: flyt 2 lagt inn for FR-40 og FR-41, siden `test_sk1_testplan_files_match_test_names` feilet. Commit `7e013ef`.
- KI-sporet (prompts, beslutninger, korrigeringer): `63dea03`.
- Ingen feil i appen funnet.
- Tester: `uv run pytest` 732 passed; `npm run test` 918 passed; `npx playwright test` 186 passed, 4 skipped (seed-testene som hopper over seg selv når databasen ikke var tom); brukerreisene alene 88 av 88 med `--repeat-each=2`. Én kjøring mens pytest gikk samtidig ga `ECONNRESET` i flyt 3 steg 4 (filen ikke endret); grønn når den ble kjørt alene.
- Lukket delvis: formelmerket i punktet fra brukerreiser etter epic 5.

### Åpne punkter
- Flyttestene utvides med modellkort (epic 7), fritekst (epic 8) og sammendrag (epic 9) når de er bygd.
