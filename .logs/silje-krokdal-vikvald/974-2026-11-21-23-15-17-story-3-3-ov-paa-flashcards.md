# Story 3.3: Øv på flashcards fra én forelesning

## 2026-11-21 kl. 23:15 — Silje Krokdal Vikvald

### Oppgave
Bygg story 3.3 «Øv på flashcards fra én forelesning» fra `epics.md` i den autonome kjøringen, med story-prompten i `autonom-kjoring.md`: spesifikasjon, kode, gjennomgang, tester, skjermbilder, KI-spor, kanttilfelle-issues og PR som flettes når alt er grønt.

### Plan
- `bmad-build-auto` med spesifikasjonen [spec-3-3-oev-paa-flashcards-fra-en-forelesning.md](../../_bmad-output/implementation-artifacts/spec-3-3-oev-paa-flashcards-fra-en-forelesning.md): implementering av en subagent, gjennomgang med fire uavhengige gjennomgåere, rettinger.
- Alle tester (pytest, Vitest, Playwright mot `docker compose up --build`), skjermbilder i 1280 og 768 px, sprintstatus, KI-spor, kanttilfelle-issues, PR.
- Kjøringen ble avbrutt én gang av bruksgrensen til API-et (HTTP 429) etter implementeringen, og fortsatte der den stoppet.

### Resultat
- **Backend:** `GET /api/lectures/{id}/flashcards` gir forelesningens spørsmåls- og begrepskort med kilde (`file_id`, `file_name`, `page_no`), bare egne forelesninger (`7fe1d28`).
- **Frontend:** modulen `practice` med øktlogikken som rene funksjoner (blanding, «Kunne ikke» bakerst, første markering teller, teller og repetisjon) og flashcard-adapter (`b83c760`), øktpanel, svarrutenett og flashcard (`8f8becc`), felles `source-link` (`427ee76`), shadcn `progress` (`5801741`), økten på `/forelesninger/<id>/flashcards` (`6699c64`), og «Øv nå» er aktiv (`1c33669`, løser #135). E2E: `dc9b5c4`.
- **Gjennomgang:** 31 funn, 9 rettet (`167a895`): økten låses bare på ferske kort, tåler feilet henting i bakgrunnen, ett klikk snur én gang, stolpen leses som «7 / 24», strammere skjema, riktige krav-ID-er. Resten avvist med begrunnelse i spesifikasjonen (`ad73579`).
- **Tester:** `uv run pytest` 391 bestått, `ruff` rent, `npm run test` 561 bestått, `tsc` rent, `npx playwright test` 92 bestått.
- **Skjermbilder:** `docs/skjermbilder/story-3-3/` (`5fa2e4b`). De stemmer med skisse 07 og 08, bortsett fra det som hører til 3.4 (hint-linje, smal skjerm) og 3.5 (resultatside, «lagret»), og at kilden står uten ordet «Kilde» slik storien sier.
- **Sprintstatus:** 3.3 `done` (`9bf603d`). **KI-spor:** `68e8e7e`. **Kanttilfeller:** #153–#160.

### Åpne punkter
- Vurder kanttilfellene fra story 3.3 (#153–#160), særlig «Avslutt økt» uten lagring (#153) og ferdigvisningen før resultatsiden (#154).
- Rettelsene i `flashcard-session-page.tsx` (låsing på ferske data, feil i bakgrunnen) er ikke gjennomgått av et uavhengig lag (oppfølging anbefalt).
