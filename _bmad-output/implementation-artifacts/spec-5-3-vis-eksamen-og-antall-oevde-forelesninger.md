---
title: 'Story 5.3: Vis «Eksamen 04.12, om 3 uker · 4 av 8 forelesninger øvd» på forsiden og emnesiden'
type: 'feature'
created: '2026-11-22'
baseline_revision: '5b4d944662a46710e92d0e632cbb898b155397cc'
status: 'in-progress'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Studenten ser ikke hvor lenge det er til eksamen eller hvor mange forelesninger hun har øvd på. Forsiden (02) viser bare «Eksamen 04.12.2026», og emnesiden (03) bare «eksamen fredag 04.12.2026» (story 5.3 i `epics.md`: FR-57 (reserven), SK-22, AR-15, AR-17).

**Approach:** Én modul i `frontend/lib/` regner ut dager og uker til eksamen fra eksamensdatoen og dagens lokale dato (argument), og lager teksten «Eksamen 04.12, om 3 uker · 4 av 8 forelesninger øvd». N og M telles fra forelesningene i `GET /api/overview` (`practiced` fra `practiced_lectures`, 5.1). Teksten vises per emne på 02 og under overskriften på 03.

## Boundaries & Constraints

**Always:**
- **Uker:** `weeksUntilExam(examDate, today)` = antall hele kalenderdager fra `today` (lokal dato) til `examDate` («åååå-mm-dd», lokal dato) delt på 7 og avrundet til nærmeste hele tall (24 → 3, 34 → 5, 21 → 3, 10 → 1, 11 → 2). Dagene regnes på kalenderdatoene, ikke millisekunder, så sommertid og årsskifte ikke gir feil.
- **Eksamensdelen:** ≥ 7 dager «Eksamen dd.mm, om N uker» («om 1 uke» i entall); 2–6 dager «Eksamen dd.mm, om N dager»; 1 dag «Eksamen dd.mm, i morgen»; 0 «Eksamen i dag»; passert «Eksamen var dd.mm». dd.mm med `formatDayMonth`.
- **Tellingsdelen:** M = antall forelesninger i emnet i oversikten (også de uten filer), N = antall av dem med `practiced: true`. M = 0 → «Ingen forelesninger ennå»; ellers «N av M forelesninger øvd», med «forelesning» i entall når M = 1 («0 av 1 forelesning øvd», UX-DR25). Frontend teller bare; den avgjør aldri «øvd».
- Hele teksten = eksamensdelen + « · » + tellingsdelen. Er oversikten ikke lastet ennå eller feilet, vises bare eksamensdelen (aldri et gjettet tall), uten egen feilmelding.
- Eksamensdatoen og emnenavnet tas fra emnedataene siden allerede har (`GET /api/subjects` på 02, `GET /api/subjects/{id}` på 03), så endret eksamensdato vises med en gang. Dagens dato er `new Date()` i nettleseren når siden tegnes.
- **02:** en liste med én linje per emne, i emnelistens rekkefølge, mellom undertittelen og emnelista (der semesterlinja står i skisse 02): emnenavnet (`text-item-title`) og teksten (`text-meta text-ink-muted`). Emnelista fra epic 2 er uendret. Ingen linjer uten emner.
- **03:** teksten som eget avsnitt rett under linja «8 forelesninger · 11 filer · eksamen fredag 04.12.2026», som er uendret.
- Vanlig tekst (ingen `aria-hidden`, ingen live-region). Etter en lagret økt viser 02 og 03 nytt antall uten omlasting (oversikten invalideres alt i `useSessionSaver`). axe uten brudd på 02 og 03 i 1280 og 768 px.
- Testnavn med krav-ID («SK-22: …», «FR-57: …»). E2e styrer nettleserens klokke og tidssone (`timezoneId: "Europe/Oslo"`, `page.clock`), så forventet tekst aldri avhenger av når testen kjøres.

**Never:** Ingen backend-endring, ny rute, regel for «øvd», migrering eller pakke. Ingen emnekort (5.4) eller semesterlinje (5.5). Ingen endring i `e2e/brukerreiser/`, `CLAUDE.md`, planleggingsdokumentene eller `.claude/settings.json`. Ingen kall til Gemini.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Skisse 02 | i dag 10.11.2026, eksamen 2026-12-04, 8 forelesninger, 4 øvd | «Eksamen 04.12, om 3 uker · 4 av 8 forelesninger øvd» | — |
| 34 / 21 dager | eksamen 14.12 / 01.12 fra 10.11 | «om 5 uker» / «om 3 uker» | — |
| 7–10 dager | eksamen 17.11 fra 10.11 | «Eksamen 17.11, om 1 uke · …» | — |
| Dager | 3 dager / 1 dag | «Eksamen 13.11, om 3 dager · …» / «Eksamen 11.11, i morgen · …» | — |
| I dag | eksamen = i dag | «Eksamen i dag · 4 av 8 forelesninger øvd» | — |
| Passert | eksamen i går | «Eksamen var 09.11 · 4 av 8 forelesninger øvd» | — |
| Ingen forelesninger | M = 0 | «Eksamen 04.12, om 3 uker · Ingen forelesninger ennå» | — |
| Én forelesning | M = 1, N = 0 | «… · 0 av 1 forelesning øvd» | — |
| Midnatt / sommertid / årsskifte | i dag 31.12.2026 23:59, eksamen 2027-01-01; i dag 24.10.2026, eksamen 2026-10-31 (sommertid slutter 25.10) | «i morgen»; «om 1 uke» | — |
| Oversikten feiler | `GET /api/overview` 500 | bare «Eksamen 04.12, om 3 uker» | ingen egen feilmelding |

</intent-contract>

## Code Map

- `frontend/lib/dates.ts` -- `formatDayMonth` gjenbrukes for dd.mm; mønster for håndskrevne datohjelpere uten Intl.
- `frontend/lib/exam.ts` (ny) -- `daysUntilExam`, `weeksUntilExam`, `examCountdownText`, `practicedText`, `examLine`. Delt med 5.4 og 5.5.
- `frontend/modules/practice/api.ts` (`OVERVIEW_QUERY_KEY`, `fetchOverview`) og `types.ts` (l. 46–80 `OverviewLecture`, `OverviewSubject`) -- kilden til N og M.
- `frontend/modules/practice/use-session-saver.ts` l. 107 -- invaliderer oversikten etter lagret økt (SK-22); uendret.
- `frontend/modules/subjects/pages/home-page.tsx` (l. 26 `subjects`-spørringen, l. 55 `SubjectList`) -- ny liste med eksamenslinjer over emnelista.
- `frontend/modules/subjects/pages/subject-page.tsx` (l. 83 `overview`, l. 133–137 undertittelen) -- nytt avsnitt under undertittelen.
- `frontend/modules/subjects/components/subject-form-dialog.tsx` l. 53–56 -- oppdaterer emnet og emnelista i hurtigbufferen ved ny eksamensdato; derfor tas datoen fra emnedataene.
- `frontend/modules/subjects/home-page.test.tsx` (`respond`, falsk `Date` 21.11.2026 kl. 12) og `subject-page.test.tsx` (`respond`-hjelperen) -- utvides; `respond` på forsiden må svare på `/api/overview`.
- `frontend/vitest.config.ts` -- vitest kjører i `Europe/Oslo`.
- `frontend/e2e/ovd.spec.ts` (`subjectWithCards`, `mark`, `SAVE_PATH`) -- mønster for ny e2e-fil; `e2e/hele-emnet.spec.ts` l. 238 bruker `page.clock`.

## Tasks & Acceptance

**Execution:**
- `frontend/lib/exam.ts` -- funksjonene over -- én regel for tid til eksamen og teksten.
- `frontend/lib/exam.test.ts` -- alle radene i matrisen, med navn som «SK-22: uker til eksamen …», «FR-57: eksamen i dag …», «SK-22: antall øvd …».
- `frontend/modules/subjects/pages/home-page.tsx` -- henter oversikten, viser linjene over emnelista.
- `frontend/modules/subjects/pages/subject-page.tsx` -- avsnittet under undertittelen.
- `frontend/modules/subjects/home-page.test.tsx`, `subject-page.test.tsx` -- teksten per emne, bare eksamensdelen før/uten oversikt, «Ingen forelesninger ennå», ny eksamensdato vises med en gang på 03.
- `frontend/e2e/eksamenslinje.spec.ts` (ny) -- klokke 10.11.2026 i Oslo, eksamen 04.12: 02 og 03 viser «Eksamen 04.12, om 3 uker · 0 av 2 forelesninger øvd»; etter en flashcard-økt i nettleseren viser 03 og 02 «1 av 2» uten omlasting; emne uten forelesninger; axe på 02 og 03 i 1280 og 768.

**Acceptance Criteria:**
- Given forsiden med to emner, when siden vises, then står det for hvert emne en linje med emnenavnet og teksten ordrett etter mønsteret, og emnelista under er som før.
- Given emnesiden, when siden vises, then står samme tekst for emnet under linja under overskriften.
- Given en flashcard-økt som nettopp er lagret, when studenten går tilbake til emnesiden og forsiden, then viser teksten det nye antallet uten omlasting, og axe finner ingen brudd på 02 og 03.

## Spec Change Log

## Review Triage Log

## Design Notes

Linjene på 02 står der semesterlinja står i skisse 02, over emnelista: 5.4 bytter emnelista med emnekort og beholder linjene over, og 5.5 bytter linjene med semesterlinja. Derfor er de en egen liste og ikke en del av radene i emnelista.

Kanttilfeller avgjort her (egne issues): bare eksamensdelen før oversikten er lastet eller når den feiler; «forelesning» i entall når M = 1; linjene som egen liste over emnelista på 02; egen linje under undertittelen på 03; dagens dato hentes på nytt hver gang siden tegnes.

## Verification

**Commands:**
- `cd frontend && npm run test && npx tsc --noEmit` -- expected: alt grønt
- `cd backend && uv run pytest` -- expected: alt grønt (ingen endring)
- `cd frontend && npx playwright test` mot `docker compose up --build` -- expected: alt grønt
