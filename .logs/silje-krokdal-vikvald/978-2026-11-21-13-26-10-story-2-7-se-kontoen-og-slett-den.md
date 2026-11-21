# Story 2.7: Se kontoen og slett den

## 2026-11-21 kl. 13:26 — Silje Krokdal Vikvald

### Oppgave
Den autonome kjøringen bygde story 2.7 fra `epics.md`, siste story i epic 2: kontosiden (15), der studenten ser e-posten, når vilkårene ble godtatt, kan lese vilkårene igjen, logge ut og slette kontoen. Slettingen fjerner alle radene hennes og hele brukermappa med PDF-er.

### Plan
- Branch `story/2-7`, `bmad-build-auto` med spesifikasjon på norsk: [spec-2-7](../../_bmad-output/implementation-artifacts/spec-2-7-se-kontoen-og-slett-den.md).
- Implementering av en subagent, gjennomgang med fire gjennomgåere, retting.
- Alle tester (pytest, Vitest, Playwright mot `docker compose up --build`), skjermbilder i 1280 og 768 px.
- Sprintstatus (2.7 og epic 2 `done`), KI-spor, kanttilfelle-issues, sesjonslogg, PR og fletting.

### Resultat
- Backend: `GET /api/identity/me/delete-preview` (emner, forelesninger, filer, registerets tellinger og `content_kinds`) og `DELETE /api/identity/me`, som sletter brukerraden i én transaksjon (resten går med `ON DELETE CASCADE`), fjerner brukermappa med `core/storage` etter commit og sletter cookien. Rutene ligger i `files`-modulen (#123). Commit `8c8e227`.
- Frontend: kontosiden med sidemenyen, demomerket og kortene Innlogging, Vilkår og personvern og Slett kontoen. «Les vilkårene» viser den felles vilkårsteksten i en dialog med bare «Lukk». Utloggingen er flyttet til en felles hook `useLogout`. Slettingen bruker den felles bekreftelsen fra 2.5. Commit `7f777c7`, e2e i `ef1e08c`.
- Gjennomgang: 30 funn. 1 medium og 2 low rettet i `a20f519` («slettes for godt» i bekreftelsen, e2e uten fast pause, tastatur for «Logg ut» og «Avbryt»), 1 utsatt (e2e i CI), 26 avvist med begrunnelse i spesifikasjonen.
- Skjermbilder i `docs/skjermbilder/story-2-7/` (`0b4b90f`). De stemmer med skisse 15, bortsett fra de beskrevne valgene.
- Tester: `uv run pytest` 313 grønne, `npm run test` 471 grønne, `tsc --noEmit` uten feil, `npx playwright test` 60 grønne.
- Sprintstatus: 2.7 og epic 2 `done` (`e7662ff`). KI-spor i `08de1d0`. Kanttilfellene er #123–#129.
- Lukket punktene fra 2.4 (vilkårsteksten på kontosiden) og 2.5 (brukermappa ved kontosletting).

### Åpne punkter
- Vurder kanttilfellene fra story 2.7 (#123–#129), særlig dialogen «Les vilkårene» (#125) og teksten i slettebekreftelsen (#129).
- En opplasting samtidig med kontoslettingen kan etterlate en tom brukermappe på disken.
