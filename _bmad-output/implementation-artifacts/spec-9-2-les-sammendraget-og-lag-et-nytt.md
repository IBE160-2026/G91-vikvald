---
title: 'Story 9.2: Les sammendraget og lag et nytt'
type: 'feature'
created: '2026-11-26'
status: 'in-progress'
baseline_revision: '0de869f3a8456715952dedfa1b32f4b3a040d502'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/autonom-kjoring.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-9-1-lag-sammendrag-av-en-forelesning.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Etter story 9.1 kan studenten lage et sammendrag, men ikke lese det: raden viser bare «N punkter» uten knapp (#353), og et nytt sammendrag kan bare startes gjennom API-et. Story 9.2 krever `GET /api/lectures/{id}/summary`, sammendragssiden (skisse 13) og «Lag nytt sammendrag» (FR-53–FR-56, UX-DR38).

**Approach:** `content` får en lesefunksjon og ruten `GET /api/lectures/{id}/summary` bak `FEATURE_SUMMARY`. Frontenden får modulen `modules/content/` med typer, API og siden `/forelesninger/<id>/sammendrag`, som viser artikkelen og innholdskortet. Raden får knappen «Les sammendrag». «Lag nytt sammendrag» starter den vanlige sammendragsjobben og følger den med det samme jobbløpet som raden.

## Boundaries & Constraints

**Always:**
- `GET /api/lectures/{id}/summary`: bryteren sjekkes først (`404 FEATURE_DISABLED`), så forelesningen (`404 NOT_FOUND` for en annens eller manglende), så sammendraget (`404 NOT_FOUND` uten). Svaret: `created_at`, `point_count`, `themes` (hvert med `title` og `points` i lagret rekkefølge; temaene i rekkefølgen de først dukker opp), hvert punkt med `id`, `text`, `formula_flag` og `source` (`file_id`, `file_name`, `page_no`), og `files` (filene punktene kommer fra, i opplastingsrekkefølge, med `file_id`, `file_name`, `page_count`). Ruten skriver ingenting.
- Siden: `SubjectSidebar` med forelesningen valgt, brødsmulene «<emne> › <forelesning>» som lenker, én h1 «Sammendrag», undertekst «7 punkter i 3 temaer · laget 10.11.2026 fra 2 filer» (entall: «1 punkt», «1 tema», «1 fil»; datoen i lokal tid). Artikkelkolonnen er høyst 568 px (`max-w-article-width`), temaene er h2, punktene en liste med `FormulaFlag` og `SourceLink` under hver tekst. Generert tekst vises som ren tekst.
- Innholdskortet etter artikkelen i DOM: h2 «INNHOLD» (overlinje) med tema og «N punkter», h2 «KILDER» med filikon, filnavn og «N sider», knappen «Lag nytt sammendrag» (omriss, `RotateCw`) og teksten «Det nye sammendraget erstatter dette. Det gamle blir ikke lagret.». Under kortet `NoteSurface` med info-ikonet: «Sammendraget er laget av en språkmodell. Sjekk viktige punkter mot kilden.».
- «Lag nytt sammendrag» sender `POST …/jobs` med `{kind: "summary", params: {requested: 15}}`. Mens jobben går, står det gamle sammendraget, og knappen er byttet med `JobStatus` («Lager sammendrag …»). En alltid montert `role="status"` leser starten og slutten («Sammendraget er ferdig: N punkter i <forelesning>.»). Fokus går til kortets område når knappen forsvinner. Når jobben er ferdig, hentes sammendraget på nytt.
- Feiler den siste sammendragsjobben (også `TOO_FEW_SUMMARY_POINTS`), står det gamle sammendraget, feilteksten fra `generationTexts.summary.failed` vises med `role="alert"`, og «Prøv igjen» står i stedet for «Lag nytt sammendrag». En annen types jobb i forelesningen gjør knappen inaktiv med ventetekst. En feil fra selve startkallet vises med `messageFor`.
- Raden: med sammendrag hovedknappen «Les sammendrag» (samme plass og bredde som «Øv nå»), som går til sammendragssiden. Uten sammendrag som i 9.1. `CreateRow.contentActions` byttes med `contentAction` (`{label, onClick}`).
- Jobbvakten viser ikke den korte meldingen for en sammendragsjobb mens studenten står på sammendragssiden for samme forelesning (siden leser selv opp resultatet).
- Siden lagrer ingen økt og gjør ikke forelesningen øvd (FR-56). Manglende sammendrag, en annens forelesning eller bryteren av gir «Fant ikke siden».
- Tester har krav-ID i navnet (`test_fr54_…`, `test_fr55_…`, `test_fr56_summary_not_session_…`). Ingen test kaller Vertex AI eller Gemini. Kode og kommentarer på engelsk, tekst i appen på bokmål.
- #301: axe-testen for bør ha-sidene krever «Les sammendrag» og sammendragssiden når bryteren er på.

**Never:**
- Ikke endre teksten for `TOO_FEW_SUMMARY_POINTS` (Siljes, #357), jobbløpet eller lagringen fra 9.1.
- Ingen endring i «øvd» eller økter.
- Ikke rør planleggingsdokumentene, `CLAUDE.md`, `.claude/settings.json` eller `frontend/e2e-skjermbilder/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Les | Sammendrag med 2 filer, 3 temaer, 7 punkter | 200, temaene i rekkefølge, `files` med 2 filer | – |
| Uten sammendrag | Egen forelesning uten | `404 NOT_FOUND`, siden «Fant ikke siden» | – |
| Annens forelesning | Annen brukers id | `404 NOT_FOUND` | – |
| Bryter av | `FEATURE_SUMMARY=false` | `404 FEATURE_DISABLED` før oppslag, «Fant ikke siden» | – |
| Nytt sammendrag | Trykk «Lag nytt sammendrag» | Gammelt står, `JobStatus`, deretter det nye | – |
| For få punkter | Jobben gir `TOO_FEW_SUMMARY_POINTS` | Gammelt står, feiltekst, «Prøv igjen» | `role="alert"` |
| Annen jobb | Flashcards-jobb kjører | Knappen inaktiv, «Venter til flashcardene er ferdige» | – |
| Lesing | GET summary | Ingen økt lagret, forelesningen ikke øvd | – |

</intent-contract>

## Code Map

- `backend/app/modules/content/service.py` (~l. 715–790) -- `replace_summary`, `summary_point_count`; ny `lecture_summary(session, lecture_id) -> SummaryOut | None`.
- `backend/app/modules/content/schemas.py` -- `FlashcardSource` gjenbrukes; nye `SummaryPointOut`, `SummaryThemeOut`, `SummaryFileOut`, `SummaryOut`.
- `backend/app/modules/content/router.py` -- mønster: `lecture_freetext_question_list` (bryter før oppslag).
- `backend/tests/test_summary.py` -- fixtures `lecture`, `_start`, `_finish_jobs`, `_model`; nye lesetester.
- `docs/testplan.md` -- FR-54, FR-55, FR-56 og avsnittet om epic 9; `backend/tests/test_testplan.py` sjekker filene i FR-56-raden.
- `frontend/components/create-row.tsx`, `create-row.test.tsx` -- `contentActions` → `contentAction`.
- `frontend/modules/generation/components/generation-row.tsx`, `summary-row.tsx` -- send `contentAction`; `useRouter` i `SummaryRow`.
- `frontend/modules/generation/components/job-watcher.tsx` (`check`, pathname-sjekken) -- ingen melding for sammendrag på sammendragssiden.
- `frontend/modules/generation/{api,texts,types}.ts` -- `startJob`, `latestJobsQueryKey`, `generationTexts.summary`, `jobOutcome`.
- Ny `frontend/modules/generation/components/summary-remake.tsx` -- knappen, jobbstatus, feil og «Prøv igjen».
- Ny `frontend/modules/content/{types,api}.ts`, `pages/summary-page.tsx` (+ test), `app/(app)/forelesninger/[lectureId]/sammendrag/page.tsx`.
- `frontend/modules/practice/pages/freetext-session-page.tsx` `notFoundWhenMissingOrOff` -- mønster for «Fant ikke siden».
- `frontend/modules/subjects/pages/lecture-page.tsx` -- layoutmønster (sidemeny, `pt-7 pr-content-margin-right pl-content-inset`); `subjects/api.ts` `fetchLecture`, `fetchSubject`; `subjects/format.ts` `fileCountLabel`, `pageCountLabel`.
- `frontend/components/{source-link,formula-flag,note-surface,job-status}.tsx` -- gjenbrukes.
- `frontend/lib/dates.ts` -- ny `formatLocalDate(iso)` («10.11.2026» i lokal tid).
- `frontend/e2e/sammendrag.spec.ts` -- utvides; `e2e/universell-utforming.spec.ts:305` -- #301.
- `frontend/modules/subjects/lecture-page.test.tsx` -- raden med sammendrag.

## Tasks & Acceptance

**Execution:**
- `backend/app/modules/content/{schemas,service,router}.py` -- lesefunksjon og rute -- FR-53, FR-54, AR-2, AR-11.
- `backend/tests/test_summary.py` -- 200 med temaer, rekkefølge, kilde og filer; 404 uten, for annens og ukjent forelesning; `FEATURE_DISABLED` før oppslag; nytt sammendrag gir nytt svar; ingen økt og ikke øvd etter lesing.
- `frontend/components/create-row.tsx` (+ test), `generation-row.tsx`, `summary-row.tsx` -- «Les sammendrag».
- `frontend/modules/generation/components/summary-remake.tsx`, `job-watcher.tsx` (+ test) -- nytt sammendrag og meldingen.
- `frontend/lib/dates.ts` (+ test), `frontend/modules/content/*`, ruten -- siden.
- Vitest: siden (overskrift, undertekst, temaer, kilde, formelmerke, kort, merknad, «Fant ikke siden» for 404 og `FEATURE_DISABLED`), «Lag nytt sammendrag» (start, jobbstatus, gammelt står, feil og «Prøv igjen», venting), raden med «Les sammendrag».
- `frontend/e2e/sammendrag.spec.ts` -- med bare tastatur: «Les sammendrag» åpner siden, siden viser punktene med kilde, «Lag nytt sammendrag» gir jobbstatus og det nye sammendraget, ingen økt lagres; for få punkter beholder det gamle med «Prøv igjen»; adresse uten sammendrag gir «Fant ikke siden»; axe i 1280 og 768 px.
- `frontend/e2e/universell-utforming.spec.ts` -- #301.
- `docs/testplan.md` -- kravene og at siden er bygd.

**Acceptance Criteria:**
- Given en forelesning med sammendrag, when studenten trykker «Les sammendrag» i raden, then åpnes `/forelesninger/<id>/sammendrag` med h1 «Sammendrag», temaene som h2 og «<fil>, side N» under hvert punkt.
- Given sammendragssiden, when hun trykker «Lag nytt sammendrag» med bare tastaturet, then står de gamle punktene mens «Lager sammendrag …» vises, og etterpå viser siden det nye sammendraget.
- Given at jobben gir `TOO_FEW_SUMMARY_POINTS`, then står det gamle sammendraget med Siljes tekst og «Prøv igjen».
- Given at hun leser sammendraget og går, then er ingen økt lagret.

## Spec Change Log

## Review Triage Log

## Design Notes

- **Kilder:** `files` er filene punktene kommer fra, ikke alle filene i forelesningen. En fil som lastes opp etter sammendraget, er ikke en kilde, og sletting eller erstatting av en fil sletter uansett sammendraget. Undertekstens «fra N filer» bruker samme tall.
- **Feil på siden:** samme kilde som raden (siste jobb av typen `summary` fra `jobs/latest`), så feilen står også etter en ny innlasting, til neste jobb starter.

## Verification

**Commands:**
- `cd backend && uv run pytest && uv run ruff check .` -- expected: alle grønne.
- `cd frontend && npm run test && npx tsc --noEmit` -- expected: alle grønne.
- `cd frontend && npx playwright test` mot `docker compose up --build -d` -- expected: alle grønne.
