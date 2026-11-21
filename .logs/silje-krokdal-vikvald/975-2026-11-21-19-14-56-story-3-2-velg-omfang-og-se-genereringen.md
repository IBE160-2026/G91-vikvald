# Story 3.2: velg omfang og se hvordan genereringen gikk

## 2026-11-21 kl. 19:14 — Silje Krokdal Vikvald

### Oppgave
Bygge story 3.2 i den autonome kjøringen. Studenten skal kunne velge hvor mange flashcards som lages (Rask/Vanlig/Dyp), og få beskjed når kortene er ferdige, når det ble færre enn valgt, eller når noe gikk galt. Arbeidet gikk på egen branch med PR, og PR-en ble flettet når testene var grønne.

### Plan
- `bmad-build-auto` med hensikten «Story 3.2 fra `epics.md`: Velg omfang og se hvordan genereringen gikk»: spesifikasjon, koding, gjennomgang med fire lag, rettelser.
- Spesifikasjon: [spec-3-2-velg-omfang-og-se-hvordan-genereringen-gikk.md](../../_bmad-output/implementation-artifacts/spec-3-2-velg-omfang-og-se-hvordan-genereringen-gikk.md).
- Alle tester (pytest, vitest, Playwright mot `docker compose up --build`), skjermbilder i 1280 og 768 px, sprintstatus, KI-spor, kanttilfelle-issues, PR.

### Resultat
- **Backend:**
  - tidsgrensen `GENERATION_TIMEOUT` (3 min, bare rundt modellkallet, eget unntak)
  - rutene `GET /api/jobs/active` og `GET /api/jobs/{id}` (bare egne jobber)
  - testnavn med krav-ID (`35a68dd`, `698b39f`)
- **Frontend:**
  - dialogen «Lag flashcards» med valgkort (shadcn `radio-group`)
  - meldingene for færre, ingenting og feil med «Prøv igjen» på Flashcards-raden, lest fra siste jobb
  - jobbvakten i `(app)`-layouten med ferdigmelding via sonner 2.0.8
  - merknadsflaten med ikon
  - én felles feilmal i `messages.ts` (`f473103`, `c5898a8`, `da786dc`, `eb0c1c0`, `0c54ac9`, `2f9c01a`)
- **Gjennomgangen:** 28 funn, 7 rettet. Viktigst: sonner viste en melding fra før utlogging igjen ved neste innlogging. Logget i spesifikasjonen (`a04f9c0`).
- **Tester:**
  - `uv run pytest`: 386 bestått
  - `ruff`: rent
  - `npm run test`: 524 bestått
  - `tsc`: rent
  - `npx playwright test`: 88 bestått, også `vilkar.spec.ts`
- **Skjermbilder:** `docs/skjermbilder/story-3-2/` (`1f8674a`).
- **Annet:**
  - README er rettet (`afaef84`).
  - Sprintstatus er satt til `done` (`8e91f57`).
  - KI-sporet er oppdatert (`42a59a1`).
  - Kanttilfelle-issuene er #143–#151, og #140 har fått en kommentar om at 3.2 har tatt over meldingene.
- **CI:** CI på PR #152 feilet først i teardown av `test_ar14_…`. En `autouse`-fixture fra 3.1 ventet på jobbene etter at testdatabasen var lukket. Rettet ved at fixturen avhenger av `engine` (`4db0564`).
- **Disk:** under 5 GB ledig etter bygget. `docker builder prune -f` ga 8,0 GB ledig.

### Åpne punkter
- Vurder kanttilfellene fra story 3.2 (#143–#151), særlig sonner uten `next-themes` (#150, avvik fra arkitekturen) og at jobbvakten bare spør mens den følger en jobb (#145).
- Gjennomgangen anbefaler en ny runde på oppryddingen i jobbvakten ved utlogging og på layouttesten. Begge er testet, men ikke gjennomgått av et uavhengig lag.
