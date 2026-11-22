---
title: 'Story 5.3: Vis «Eksamen 04.12, om 3 uker · 4 av 8 forelesninger øvd» på forsiden og emnesiden'
type: 'feature'
created: '2026-11-22'
baseline_revision: '5b4d944662a46710e92d0e632cbb898b155397cc'
status: 'done'
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

### 2026-11-22 — Review pass
- verdicts: 22 findings — high 0, medium 0, low 11, false 11, maybe-false 0
- findings:
  - `[low]` `[patch]` (blind) M goes stale after a lecture is added or deleted: only `SUBJECTS_QUERY_KEY` was invalidated, so 03 could briefly show «2 forelesninger» above «0 av 1 forelesning øvd» — lecture create, lecture delete and subject create now also invalidate `OVERVIEW_QUERY_KEY` (`060bff9`).
  - `[low]` `[patch]` (blind) a new subject shows only the exam part on 02 until the overview is refetched — same root cause and fix (`060bff9`).
  - `[low]` `[reject]` (blind) e2e helper `homeLine` also matches the subject-list row — the exact `getByText` inside it picks the right element; the test asserts the right thing.
  - `[false]` `[reject]` (blind) `div role="list"` shaped to fit tests; names read twice — valid ARIA list; the locked user-journey tests may not change, and the duplicate names are the planned interim state (Design Notes: the lines stand where the timeline goes, 5.4/5.5 replace the list and the lines).
  - `[false]` `[reject]` (blind) exam date shown twice on 02 — deliberate: the epic-2 list is unchanged by the spec, the lines are the timeline fallback.
  - `[low]` `[reject]` (blind) today read two ways; tab open over midnight keeps yesterday's countdown — any refetch (window focus, navigation) redraws with a fresh date; a midnight timer adds state for a rare case.
  - `[false]` `[reject]` (blind) malformed `exam_date` gives NaN — the backend validates `exam_date` as a date; the API never sends another shape.
  - `[false]` `[reject]` (blind) past exam from an earlier year is ambiguous — «Eksamen var 04.12» is the exact text the story asks for.
  - `[low]` `[reject]` (blind) no test pins 17 vs 18 days — rounding is tested at 10/11, 21, 24 and 34 days; the rule is one `Math.round`.
  - `[low]` `[patch]` (blind) no front-page unit test for a new count after refetch — added «SK-22: når oversikten ugyldiggjøres …» (`5e955d7`).
  - `[low]` `[reject]` (blind) e2e setup does not check status of subject/lecture POSTs — follows the pattern in `ovd.spec.ts`; a failure still fails the test.
  - `[false]` `[reject]` (blind) KI-spor and session log missing — written later in the same run, before the PR.
  - `[false]` `[reject]` (blind) rounding and fallback not explained in code — `frontend/lib/exam.ts` comments state both; the story fixes the rounding (24 → 3, 34 → 5).
  - `[low]` `[patch]` (edge) lecture added on 03 leaves the overview stale — same as the first row (`060bff9`).
  - `[low]` `[patch]` (edge) new subject on 02 lacks its count — same as the first row (`060bff9`).
  - `[false]` `[reject]` (edge) NaN for an empty `exam_date` — same refutation as above.
  - `[low]` `[reject]` (edge) page open across midnight — same as the «today» row above.
  - `[low]` `[patch]` (verification-gap) the front page's refresh after a saved session is only checked in Playwright, which CI does not run — Vitest test added (`5e955d7`).
  - `[false]` `[reject]` (verification-gap, other) lecture/subject create does not refresh the overview — duplicate of the first row, already patched.
  - `[false]` `[reject]` (intent) the today/tomorrow/days/past variants are only tested on the pure function — both pages render `examLine` directly; the one function is what the story requires (`weeksUntilExam` in `frontend/lib/`).
  - `[false]` `[reject]` (intent) test names «SK-22: …» instead of `test_sk22_…` — the frontend suite's convention (5.1, 5.2); the requirement ID is in every name.
  - `[false]` `[reject]` (intent) a subject missing from a loaded overview shows only the exam part — covered by the invalidation fix; otherwise a moment until refetch.

## Design Notes

Linjene på 02 står der semesterlinja står i skisse 02, over emnelista: 5.4 bytter emnelista med emnekort og beholder linjene over, og 5.5 bytter linjene med semesterlinja. Derfor er de en egen liste og ikke en del av radene i emnelista.

Kanttilfeller avgjort her (egne issues): bare eksamensdelen før oversikten er lastet eller når den feiler; «forelesning» i entall når M = 1; linjene som egen liste over emnelista på 02; egen linje under undertittelen på 03; dagens dato hentes på nytt hver gang siden tegnes.

## Verification

**Commands:**
- `cd frontend && npm run test && npx tsc --noEmit` -- expected: alt grønt
- `cd backend && uv run pytest` -- expected: alt grønt (ingen endring)
- `cd frontend && npx playwright test` mot `docker compose up --build` -- expected: alt grønt

## Auto Run Result

Status: done

**Summary:** `frontend/lib/exam.ts` holds the one rule for time to the exam (calendar days, nearest whole week, «om 1 uke», days under seven, «i morgen», «i dag», «var») and the line «Eksamen 04.12, om 3 uker · 4 av 8 forelesninger øvd». N and M are counted from `GET /api/overview`. The front page shows one line per subject above the epic-2 list; the subject page shows the line under the subtitle. Before the overview is loaded, or if it fails, only the exam part is shown. Creating or deleting a lecture and creating a subject now refetch the overview.

**Files changed:**
- `frontend/lib/exam.ts` (+ `exam.test.ts`) -- the rule and the text, every matrix row tested.
- `frontend/modules/subjects/pages/home-page.tsx` (+ test) -- exam lines on 02 (`div role="list"`, so the locked `main li` locators in `e2e/brukerreiser/` stay unchanged).
- `frontend/modules/subjects/pages/subject-page.tsx` (+ test) -- the line on 03.
- `frontend/modules/subjects/components/lecture-form-dialog.tsx`, `subject-form-dialog.tsx`, `pages/lecture-page.tsx` -- invalidate the overview.
- `frontend/e2e/eksamenslinje.spec.ts` (new) -- fixed Oslo clock, new count after a session without reload, axe on 02 and 03 at 1280 and 768.

**Review:** 22 findings: patched 6 rows in 2 entries (all low), 0 deferred, 5 low rejected and 11 false, reasons above.

**Follow-up review recommended:** false (patched: high 0, medium 0, low 2 entries).

**Verification:** `npm run test` 853 passed; `npx tsc --noEmit` clean; `uv run pytest` 567 passed; `npx playwright test` 168 passed against `docker compose up --build` (a first run in parallel with pytest had 4 unrelated timing failures; all passed alone and in a full rerun).

**Residual risks:** a tab left open over midnight shows yesterday's countdown until the page redraws.
