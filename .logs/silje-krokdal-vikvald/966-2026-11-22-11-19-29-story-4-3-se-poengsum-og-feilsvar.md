# Story 4.3: Se poengsum og feilsvar etter quizen

## 2026-11-22 kl. 11:19 — Silje Krokdal Vikvald

### Oppgave
Bygg story 4.3 «Se poengsum og feilsvar etter quizen» fra `epics.md` i den autonome kjøringen, med story-prompten i `autonom-kjoring.md`: resultatsiden fra skisse 10 i stedet for den enkle visningen fra 4.2, med spesifikasjon, kode, gjennomgang, tester, skjermbilder, KI-spor, kanttilfelle-issues og PR som flettes når alt er grønt.

### Plan
- `bmad-build-auto` med hensikten fra story-prompten: [spesifikasjonen](../../_bmad-output/implementation-artifacts/spec-4-3-se-poengsum-og-feilsvar-etter-quizen.md).
- Gjenbruk `result-summary` og `missed-list` fra 3.5 med en quizvariant, ikke nye komponenter.
- Gjennomgang med fire lag, retting, alle tester, skjermbilder, KI-spor, issues og PR.

### Resultat
- Quizvariant av `result-summary` og `missed-list` (`51f758e`): «QUIZ FERDIG», «N av M riktige» / «Avbrutt etter A av N», undertittel med antall feil, og lista med ditt svar, riktig svar, forklaring og kilde.
- Quizsiden husker valgt svar og har «Ta quizen igjen» med Enter: ny henting, ny `session_id`, ny rekkefølge (`54e701c`). Hurtigtastdialogen sier «Øv igjen / Ta quizen igjen» (`b431b0f`, løser #212). Ny Playwright-test `quiz-resultat.spec.ts` (`8c55520`).
- Gjennomgangen fant 31 funn: 2 rettet (beskrivelsesliste for svarene, en dobbel test og eksport fjernet), 29 avvist med begrunnelse i spesifikasjonen (`1b0a99d`).
- Tester: `uv run pytest` 530 bestått, `npm run test` 768 bestått, `npx tsc --noEmit` rent, `npx playwright test` 139 bestått mot `docker compose up --build` (første kjøring hadde to tidsavbrudd i `erstatt.spec.ts`, grønne ved ny kjøring).
- Skjermbilder i `docs/skjermbilder/story-4-3/` (`d49b8ad`). De stemmer med skisse 10, bortsett fra at tittelen er 40 px (DESIGN.md-tokenet), mens skissen tegner 32 px.
- Et gammelt skjermbildeskript for 4.2 i den midlertidige mappa overskrev 4.2-skjermbildene. De ble satt tilbake med `git restore` før commit.
- Sprintstatus `done` (`3238b04`), KI-spor (`e5377f8`), kanttilfellene #214–#217.
- Lukket punktet fra 4.2 om at 4.3 bygger videre på resultatvisningen.

### Åpne punkter
- Vurder kanttilfellene fra story 4.3 (#214–#217), særlig poengsummen i undertittelen for avbrutt quiz (#214).
- `erstatt.spec.ts` (story 2.6) feilet igjen én gang med tidsavbrudd på filvelgeren og ser ustabil ut under last.
