# Story 2.5: Slett filer, forelesninger og emner med bekreftelse

## 2026-11-21 kl. 08:46 — Silje Krokdal Vikvald

### Oppgave
Den autonome kjøringen bygde story 2.5 fra `epics.md`: studenten kan slette en fil, en forelesning og et emne etter å ha sett hva som forsvinner sammen med det. PDF-ene på disken skal også slettes, og punktet i #75 om fokus når åpneren er slettet, skulle avgjøres.

### Plan
- Branch `story/2-5`, `bmad-build-auto` med spesifikasjon på norsk: [spec-2-5](../../_bmad-output/implementation-artifacts/spec-2-5-slett-filer-forelesninger-og-emner-med-bekreftelse.md).
- Implementering av en subagent, gjennomgang med fire gjennomgåere, retting.
- Alle tester (pytest, Vitest, Playwright mot `docker compose up --build`), skjermbilder i 1280 og 768 px.
- KI-spor, kanttilfelle-issues, sesjonslogg, PR og fletting.

### Resultat
- Backend: ny modul `content` med tellerregister (tomt i epic 2). `GET …/delete-preview` og `DELETE` for fil, forelesning og emne i `files`-modulen. Forelesningsradene låses, raden slettes i én transaksjon med `ON DELETE CASCADE`, og PDF-ene fjernes med `core/storage` etter commit. Commit `15735f5`.
- Frontend: felles `DeleteConfirmDialog` (560 px, «Avbryt» har startfokus), setningsfunksjonen i `frontend/lib/delete-text.ts`, «Slett» på filradene, «Slett forelesningen» på 04 og «Slett emnet» på 03. Fokus etter sletting går til «Filer» eller `h1` på siden hun kommer til, og det løser #75. Commit `a8656f8`, e2e `d37ff52`.
- Gjennomgang: 32 funn. 4 medium og 9 low rettet i `73113e6`, 1 utsatt (e2e i CI), 16 avvist med begrunnelse i spesifikasjonen.
- Tester: `uv run pytest` 284 grønne, `npm run test` 438 grønne, `tsc --noEmit` uten feil, `npx playwright test` 51 grønne.
- Skjermbilder i `docs/skjermbilder/story-2-5/` (commit `50859fb`). De stemmer med skisse 14.
- Sprintstatus: 2.5 `done`, epic 2 fortsatt `in-progress`. KI-spor i `d0bd3a0`. Kanttilfellene er #109–#115.

### Åpne punkter
- Vurder kanttilfellene fra story 2.5 (#109–#115), særlig fokus etter sletting (#111) og tekstene i bekreftelsen (#112).
- Låsingen mot opplasting under sletting virker bare på Postgres og er ikke testet (testene bruker SQLite).
- En PDF som ikke kan slettes fra disken, blir liggende uten opprydding (logges med fil-ID).
- Brukermappa med PDF-er må slettes når kontoen slettes i 2.7.
