# Brukerreiser etter epic 7

## 2026-11-25 kl. 14:51 — Silje Krokdal Vikvald

### Oppgave
Utvide Playwright-testene av brukerreisene etter epic 7, særlig steg 4 i flyt 2 (modellkortet i flashcard-økten og «Endre huskeregel»), kjøre alle testene, og flette via PR. Økten ble stoppet før full Playwright-kjøring fordi ledig disk falt under 2 GB mens appen kjørte (Siljes diskregel).

### Plan
- Branch `brukerreiser/epic-7` fra oppdatert `main`.
- Gi `merkevare.pdf` i flyt 2 lista «AIDA-modellen» på side 6 og lage modellkortet i forutsetningen.
- Nye steg i flyt 2: «Steg 4 (modellkortet)» og «Steg 4 (Endre huskeregel)», og justere tellingene og feilveiene for det femte kortet.
- Oppdatere `docs/testing/brukerreiser.md` og `docs/testplan.md`.
- Kjøre alle testene, så KI-spor, PR og fletting.

### Resultat
- `04eee4a`: flyt 2 tester modellkortet midt i økten og «Endre huskeregel». Rekkefølgen i økten holdes fast ved å sette `Math.random` til 0,5 mens økten starter (modellkortet blir nr. 4 av 5).
- `2f86241`: oversikten viser steg 4 i flyt 2 som testet, nytt avsnitt «Det epic 7 har bygd som ingen flyt viser», og testplanen nevner flyttesten under FR-42, FR-43 og FR-46.
- Tester: `npx playwright test e2e/brukerreiser` mot `docker compose up --build -d` grønn (flyt 2: 14 av 14, også 42 av 42 med `--repeat-each 3`; flyt 1, 3 og 4 grønne i første kjøring). `uv run pytest`: 832 grønne. `npm run test`: grønt (exit 0).
- Ingen feil i appen funnet; ingen appretting.
- Full `npx playwright test` ble avbrutt: ledig disk var 1,9 GB mens appen kjørte (grensen er 2 GB). Appen er stoppet med `docker compose down` (uten `-v`). Etterpå 2,9 GB ledig.
- Ikke gjort: KI-sporet i `docs/ki-prosess/`, push, PR og fletting.

### Åpne punkter
- Frigjør diskplass, kjør hele `npx playwright test` mot appen, før KI-sporet (prompts, beslutningen om `Math.random`), push `brukerreiser/epic-7`, lag PR-en og flett.
