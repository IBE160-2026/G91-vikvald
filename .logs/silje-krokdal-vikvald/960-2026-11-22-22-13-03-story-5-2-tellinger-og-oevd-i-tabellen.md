# Story 5.2: tellinger og «Øvd 03.11» i forelesningstabellen

## 2026-11-22 kl. 22:13 — Silje Krokdal Vikvald

### Oppgave
Bygge story 5.2 i den autonome kjøringen. Forelesningstabellen på emnesiden skal vise antall kort og quizspørsmål og «Øvd 03.11» for øvde forelesninger, med «øvd» fra regelen i story 5.1.

### Plan
- `bmad-build-auto` med story-prompten fra `autonom-kjoring.md`: spesifikasjon, koding, gjennomgang med fire gjennomgåere.
- Spesifikasjon: [spec-5-2](../../_bmad-output/implementation-artifacts/spec-5-2-vis-tellinger-og-oevd-i-forelesningstabellen.md).
- Alle tester, skjermbilder, KI-spor, issues, PR.

### Resultat
- Backend: `GET /api/subjects/{id}/file-counts` gir `content_counts` per forelesning fra registeret i `content` (`0d19383`).
- Frontend: kolonnene Dato, Forelesning, Filer, Kort, Quiz, Status. Status fra `GET /api/overview` («Øvd dd.mm», «Ikke øvd ennå», «Ingen filer ennå») (`d54a017`). Bredere statuskolonne (`3401545`). En ferdig jobb henter filtellingene på nytt (`85967f0`).
- Tester: ny `e2e/forelesningstabell.spec.ts`; `filer.spec.ts`, `forelesninger.spec.ts` og kolonneindeksen i flyt 2 følger de nye kolonnene (`a0872e7`, `985d4fb`, `666cbdf`).
- Gjennomgang: 33 funn, 3 rettet, resten avvist med begrunnelse. Den ble avbrutt av bruksgrensen (429) én gang og kjørt på nytt.
- `uv run pytest` 567 passed, `npm run test` 828 passed, `npx tsc --noEmit` rent, `npx playwright test` 164 passed.
- Skjermbilder i `docs/skjermbilder/story-5-2/` (`d03fdb0`). KI-spor (`700fb24`). Kanttilfeller #238–#240. Sprintstatus: 5.2 `done`.
- Lukket åpent punkt fra 5.1: tabellen viser nå «Øvd» for øvde forelesninger.

### Åpne punkter
- Vurder kanttilfellene fra story 5.2 (#238–#240), særlig at en øvd forelesning uten filer viser «Øvd» (#238).
- Avvik fra skisse 03: raden «Ingen filer ennå» har ingen hul prikk (uendret fra epic 2).
