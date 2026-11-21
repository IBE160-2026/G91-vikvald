# Story 3.4: Hurtigtaster, fokus og smal skjerm i økten

## 2026-11-21 kl. 23:58 — Silje Krokdal Vikvald

### Oppgave
Bygge story 3.4 i den autonome kjøringen. Den skulle gi hurtigtastene Mellomrom, `1`, `2`, Esc og `?` i flashcard-økten, hint-linjen, hurtigtastdialogen med bryteren «Bruk hurtigtaster», og smal skjerm (≤ 768 px eller 200 % tekst) der sidemenyen og øktpanelet ligger bak en menyknapp.

### Plan
- `bmad-build-auto` med hensikten «Story 3.4 fra `epics.md`: Hurtigtaster, fokus og smal skjerm i økten»: spesifikasjon, koding, gjennomgang med fire lag. Se [spesifikasjonen](../../_bmad-output/implementation-artifacts/spec-3-4-hurtigtaster-fokus-og-smal-skjerm-i-oekten.md).
- Alle testene, skjermbilder i 1280 og 768 px, sprintstatus, KI-spor, issues for kanttilfellene, og en PR.

### Resultat
- Felles tastefunksjon i `frontend/lib/practice-shortcuts.ts`. Den følger bryteren i `localStorage` (`sk_shortcuts`). Esc virker også med bryteren av.
- Hint-linjen under kortknappene.
- Hurtigtastdialogen (`components/shortcuts-dialog.tsx`), som åpnes fra «? Hurtigtaster» nederst i sidemenyen og med `?` i økten.
- Sidemeny-rammen (`components/side-menu.tsx`, shadcn `sheet`): på smal skjerm ligger sidemenyen og øktpanelet bak «Meny» i toppfeltet. Det dekker også punktet fra 2.1 om sidemenyen ved 768 px.
- Commits fra `e405f21` til `d5cfdd8`. Spesifikasjonen ligger i `ddbcb10`.
- Gjennomgangen fant 33 funn, og 6 ble rettet. De viktigste: bryteren hoppet tilbake til «på» når lagringen ikke kunne skrives, og krav-ID-ene i testnavnene var byttet om.
- Tester:
  - `npm run test`: 605 bestått
  - `npx tsc --noEmit`: rent
  - `uv run pytest`: 391 bestått
  - `npx playwright test`: 103 bestått mot `docker compose up --build`
- Skjermbildene ligger i `docs/skjermbilder/story-3-4/` (`c7a24e0`).
- Sprintstatusen er oppdatert, og KI-sporet står i `docs/ki-prosess/`. Kanttilfellene er issue #162–#168.

### Åpne punkter
- Vurder kanttilfellene #162–#168, særlig Esc med bryteren av (#163) og Mellomrom på «Kunne» etter snuing (#168).
- Hurtigtastene og panelet er bare prøvd i Chromium. 200 % tekst er bare prøvd via 640 px bredde.
