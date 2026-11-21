# Story 2.2: forelesninger og sidemeny

## 2026-11-21 kl. 03:34 — Silje Krokdal Vikvald

### Oppgave
Bygg story 2.2 «Legg til forelesninger og finn dem i sidemenyen» fra `epics.md` i den autonome kjøringen, med story-prompten i `autonom-kjoring.md`: spesifikasjon, kode, gjennomgang, tester, skjermbilder, KI-spor, kanttilfelle-issues og PR som flettes når alt er grønt.

### Plan
- `bmad-build-auto` med hensikten fra story-prompten. Spesifikasjon: [spec-2-2](../../_bmad-output/implementation-artifacts/spec-2-2-legg-til-forelesninger-og-finn-dem-i-sidemenyen.md).
- Implementering i en subagent, så gjennomgang med fire gjennomgåere og retting.
- Alle testene (pytest, Vitest, Playwright mot `docker compose up --build`), skjermbilder i 1280 og 768 px sammenlignet med skisse 03 og 04.

### Resultat
- Backend: tabellen `lectures` (migrering `0003_create_lectures`, cascade fra `subjects`), rutene `POST/GET /api/subjects/{id}/lectures` og `GET/PATCH /api/lectures/{id}`, ekte `lecture_count` (`688f3f6`).
- Frontend: felles navn/dato-dialog, «Ny forelesning» med dagens dato, forelesningstabellen på 03, forelesningssiden `/forelesninger/[id]`, sidemeny med pilknapp (shadcn `Collapsible`), ukenummer og hul statusprikk (`d5f41d9`); e2e `forelesninger.spec.ts` (`f3438fb`).
- Etter skjermbildene: sidemenyens rader følger skisse 03, og lange navn kortes av i tabellen (`38cfa5e`). Rettinger fra gjennomgangen (30 funn, 7 grupper rettet): `e728ee5`. Skjermbilder: `a2aebc8`. KI-spor: `docs/ki-prosess/`.
- Tester: `uv run pytest` 203 grønne, `npm run test` 356 grønne, `npx playwright test` 39 grønne.
- Kanttilfeller lagt fram som #90–#94; kommentar på #85 om shadcn `Sidebar`.

### Åpne punkter
- Vurder kanttilfellene fra story 2.2 (#90–#94).
- Brødsmuler på forelesningssiden (skisse 04) er ikke i noen story (#93).
