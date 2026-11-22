---
title: 'Story 5.4: Vis emnekort med «Neste å øve på» på forsiden'
type: 'feature'
created: '2026-11-22'
baseline_revision: '3f9c5c39dbf423736fb4f134d85694e4f07b7510'
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

**Problem:** Forsiden (02) viser emnene som en enkel liste, og navn og eksamensdato står to ganger fordi eksamenslinjene fra 5.3 står i en egen liste over den (#244). Studenten ser ikke hva hun bør øve på nå, og må lete (story 5.4 i `epics.md`: FR-58, SK-20, UX-DR12, UX-DR10, AR-17).

**Approach:** Emnelista fra epic 2 byttes med ett emnekort (`subject-card`) per emne i et rutenett. Kortet bygges av tre kilder siden allerede har eller kan hente: emnet (`GET /api/subjects`), oversikten (`GET /api/overview`: forelesningene i datorekkefølge med `practiced`/`last_practiced_at` fra 5.1) og tellingene per forelesning (`GET /api/subjects/{id}/file-counts`, samme register som tabellen i 5.2). En ren funksjon velger «Neste å øve på» / NESTE STEG. Eksamenslinjene fra 5.3 står uendret over kortene.

## Boundaries & Constraints

**Always:**
- **Kortet:** emneprikk + emnenavnet som overskrift (`h2`); tekstknappen «Åpne ›» (lenke til `/emner/{id}`, tilgjengelig navn «Åpne Markedsføring»); tellingslinja; hårlinje; overlinja NESTE Å ØVE PÅ eller NESTE STEG (som `h3` for skjermleser, slik SISTE ØKT gjør); forelesningsnavn, grunn og én knapp; nederst fremdriften.
- **Tellingslinja:** summen over forelesningene av `flashcards` og `quiz_questions` fra file-counts: «120 kort · 64 quizspørsmål». En type med 0 utelates («16 kort», «12 quizspørsmål»). Begge 0 → «Ingen øvingsinnhold ennå».
- **«Øvd»** kommer bare fra oversikten (`practiced`, `last_practiced_at`). Frontend avgjør aldri «øvd» selv (SK-20).
- **Valget (`nextStep`)**, forelesningene i oversiktens rekkefølge (dato, så opprettet):
  1. «Har innhold» = minst én av typene i rekkefølgen flashcards → quiz har antall > 0. Den første typen med innhold er den som startes, og grunnen nevner den: «16 kort, …» / «12 quizspørsmål, …». Fritekst finnes ikke ennå (epic 8) og legges til i den samme rekkefølgelista.
  2. Finnes en forelesning med innhold som ikke er øvd → den første av dem, grunn «N kort, ikke øvd ennå».
  3. Ellers, finnes forelesninger med innhold (alle øvd) → den med eldst `last_practiced_at` (lik tid: den første i rekkefølgen), grunn «N kort, sist øvd dd.mm» (`formatDayMonth`, lokal dato).
  4. Ellers, finnes forelesninger med filer → NESTE STEG, den første med filer, grunn «2 filer lastet opp, klare til bruk» («1 fil lastet opp, klar til bruk» i entall), omrissknappen «Lag flashcards» → `/forelesninger/{id}`.
  5. Ellers, finnes forelesninger → NESTE STEG, den første, grunn «Ingen filer ennå», omrissknappen «Last opp PDF» → `/forelesninger/{id}`.
  6. Ellers → NESTE STEG, «Ingen forelesninger ennå», omrissknappen «Ny forelesning» → `/emner/{id}`.
- **«Øv nå»** (hovedknapp) er en lenke til `/forelesninger/{id}/flashcards` eller `/forelesninger/{id}/quiz` etter typen i punkt 1; den peker aldri på en type uten innhold. Knappene er lenker med knappeutseende (`Button asChild` + `Link`), fordi de bytter side.
- **Fremdrift:** én stolpe per forelesning (4 px høy, `rounded-xs`, `bg-brand` når øvd, ellers `bg-progress-track`), i en beholder med `aria-hidden="true"`, og teksten `practicedText` fra `frontend/lib/exam.ts` («4 av 8 forelesninger øvd»). Uten forelesninger vises ingen fremdrift (NESTE STEG sier det allerede).
- **Lasting og feil:** til oversikten og emnets file-counts er lastet, viser kortet bare prikk, navn og «Åpne ›» (aldri gjettede tall). Feiler en av dem, står reserveteksten (`FALLBACK_MESSAGE`) i `role="alert"` i kortet i stedet for resten.
- **Rutenett:** kortene i en `ul` (én `li` per kort, i emnelistens rekkefølge) med `gap-card-gap`; tre kolonner når innholdsbredden er minst 768 px, to fra 576 px, ellers én (containerspørring). Kortene er hvite (`bg-surface`, `border-border-card`, `shadow-lift`, `rounded-lg`). shadcn `card` legges til med CLI og tilpasses tokenene; `package.json` sjekkes etterpå.
- Tab-rekkefølgen følger leserekkefølgen: «Åpne ›», så knappen i NESTE-delen, kort for kort. axe uten brudd på 02 i 1280 og 768 px.
- Etter en lagret økt viser kortene ny status uten omlasting (oversikten invalideres alt; file-counts hentes på nytt ved visning).
- Testnavn med krav-ID («FR-58: …», «SK-20: …», «UX-DR12: …»). E2e styrer klokka (`timezoneId: "Europe/Oslo"`, `page.clock`) som `e2e/eksamenslinje.spec.ts`.

**Never:** Ingen backend-endring, ny rute, migrering eller ny pakke (shadcn `card` er bare en fil). Ingen egen regel for «øvd». Ingen semesterlinje (5.5). Ingen endring i `CLAUDE.md`, planleggingsdokumentene eller `.claude/settings.json`. Brukerreisetestene endres bare så de finner samme innhold i kortene, aldri svakere. Ingen kall til Gemini.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Eldste ikke øvd | U37 (øvd, 10 kort), U38 (16 kort), U39 (8 kort) | NESTE Å ØVE PÅ «Uke 38: …», «16 kort, ikke øvd ennå», «Øv nå» → `/forelesninger/U38/flashcards` | — |
| Bare quiz | U38 med 0 kort og 12 quizspørsmål, ikke øvd | «12 quizspørsmål, ikke øvd ennå», «Øv nå» → `/quiz` | — |
| Alle øvd | U37 sist øvd 05.11, U38 sist øvd 03.11 | «Uke 38», «16 kort, sist øvd 03.11» | — |
| Øvd uten innhold | U37 øvd, innhold slettet; U38 har kort, ikke øvd | U38 velges; U37 aldri | — |
| Filer, ikke innhold | U44 uten filer, U45 med 2 filer | NESTE STEG «Uke 45», «2 filer lastet opp, klare til bruk», «Lag flashcards» → 04; tellingslinja «Ingen øvingsinnhold ennå» | — |
| Ingen filer | to forelesninger uten filer | NESTE STEG eldste, «Ingen filer ennå», «Last opp PDF» → 04 | — |
| Ingen forelesninger | 0 forelesninger | NESTE STEG «Ingen forelesninger ennå», «Ny forelesning» → 03; ingen stolper | — |
| Tellinger | 120 kort, 64 quiz / 16 kort, 0 quiz | «120 kort · 64 quizspørsmål» / «16 kort» | — |
| Feil | file-counts eller oversikten svarer 500 | navn og «Åpne ›», så reserveteksten i `role="alert"` | ingen tall |

</intent-contract>

## Code Map

- `frontend/modules/subjects/pages/home-page.tsx` (l. 63 `ExamLines`, l. 65 `SubjectList`, l. 108–131 `SubjectList`) -- `SubjectList` byttes med rutenettet av emnekort; `ExamLines` og kommentaren om `main li` beholdes/oppdateres.
- `frontend/modules/practice/types.ts` (`OverviewSubject`, `OverviewLecture`) og `api.ts` (`OVERVIEW_QUERY_KEY`, `fetchOverview`) -- «øvd» og rekkefølgen.
- `frontend/modules/files/api.ts` (`fileCountsQueryKey`, `fetchFileCounts`) og `types.ts` (`SubjectFileCounts`, `LectureFileCount.content_counts`) -- tellingene per forelesning; nøkkelen deles med emnesiden, og jobbvakta/opplasting invaliderer den alt.
- `frontend/modules/subjects/components/lecture-table.tsx` l. 13–20 -- hvordan registerets `kind` (`flashcards`, `quiz_questions`) leses; mønster.
- `frontend/lib/exam.ts` (`practicedText`) og `frontend/lib/dates.ts` (`formatDayMonth`) -- gjenbrukes, aldri kopieres.
- `frontend/modules/practice/components/practice-all-card.tsx` -- mønster for kort, hårlinje, overlinje med skjult `h3` og feiltekst.
- `frontend/components/ui/button.tsx` (`asChild`), `frontend/modules/subjects/components/subject-dot.tsx` -- gjenbrukes.
- `frontend/modules/subjects/home-page.test.tsx` (`respond`, `overviewFor`, `subjectList`) -- `respond` må svare på `/api/subjects/{id}/file-counts`; testen for den gamle lista skrives om til kort.
- `frontend/e2e/emner.spec.ts` l. 145–157, `forelesninger.spec.ts` l. 77/126/167, `brukerreiser/flyt-1-etter-forelesning.spec.ts` l. 155–158 og 231, `brukerreiser/flyt-2-for-eksamen.spec.ts` l. 128–131 -- bruker `main li` med «N forelesninger» og «Eksamen dd.mm.åååå»; oppdateres til kortets innhold («av N forelesninger øvd») og eksamenslinja.
- `frontend/e2e/eksamenslinje.spec.ts` og `e2e/ovd.spec.ts` (`subjectWithCards`, `SAVE_PATH`) -- mønster for ny e2e-fil med klokke og innhold i demomodus.

## Tasks & Acceptance

**Execution:**
- `frontend/components/ui/card.tsx` (ny, shadcn CLI) -- tilpasset tokenene.
- `frontend/modules/subjects/next-step.ts` (ny) -- `subjectContentCounts`, `contentCountText`, `nextStep` (punkt 1–6 over) som rene funksjoner.
- `frontend/modules/subjects/next-step.test.ts` -- alle radene i matrisen, med navn som «FR-58: eldste ikke øvd …», «FR-58: alle øvd gir lengst siden …», «SK-20: …», «UX-DR12: neste steg …».
- `frontend/modules/subjects/components/subject-card.tsx` (ny) -- kortet.
- `frontend/modules/subjects/pages/home-page.tsx` -- rutenettet med kort; henter file-counts per emne (`useQueries`).
- `frontend/modules/subjects/home-page.test.tsx` -- kort per emne, Øv nå-lenke for bare quiz, NESTE STEG-variantene, lasting og feil, ny status etter invalidert oversikt.
- `frontend/e2e/emnekort.spec.ts` (ny) -- klokke i Oslo; emne med kort og quiz, bare quiz, filer uten innhold, ingen forelesninger; «Øv nå» starter quiz for bare-quiz-forelesningen; etter en økt viser kortet neste forelesning uten omlasting; Tab-rekkefølge; axe i 1280 og 768.
- `frontend/e2e/emner.spec.ts`, `forelesninger.spec.ts`, `brukerreiser/flyt-1-etter-forelesning.spec.ts`, `brukerreiser/flyt-2-for-eksamen.spec.ts` -- finner samme innhold i kortene og eksamenslinja.

**Acceptance Criteria:**
- Given forsiden med emner, when siden vises, then står eksamenslinjene over et rutenett med ett kort per emne, og den gamle lista med navn og eksamensdato finnes ikke lenger (#244).
- Given et kort med «Øv nå», when studenten trykker på den, then åpnes økten for typen grunnen nevner, aldri en tom økt.
- Given en økt som nettopp er lagret, when studenten går tilbake til forsiden, then viser kortet den nye neste forelesningen og fremdriften uten omlasting.

## Spec Change Log

## Review Triage Log

### 2026-11-22 — Review pass
- verdicts: 25 findings — high 0, medium 0, low 19, false 6, maybe-false 0
- findings:
  - `[low]` `[patch]` (verification-gap) no test that one subject's failing file-counts hits only that card — added «FR-58: når file-counts feiler for ett emne, står reserveteksten bare i det kortet» (`2e8e32b`).
  - `[low]` `[reject]` (verification-gap, other) `last_practiced_at === null` on a practised lecture gives «N kort, øvd», untested — `_practiced` in `practice/service.py` always sets the time when `practiced` is true; the branch only avoids a crash.
  - `[low]` `[reject]` (blind) a card stays header-only when the loaded overview lacks the subject — creating a subject invalidates the overview (5.3, `060bff9`), so this lasts until that refetch; no state is lost.
  - `[low]` `[reject]` (blind) a failed overview puts one alert in every card — only on a server failure; the fallback text is the app's one approved error text (EXPERIENCE.md), and the spec places it per card.
  - `[low]` `[reject]` (blind) e2e checks weaker: year gone, `(var )?`, `slice(0, 5)` — the year is no longer on 02 by design (#244, the line shows dd.mm); `emner.spec.ts` and flyt 1 run on the real clock, so the line can truthfully be «var» later; flyt 2 is now stricter (exact «om 3 uker»). `emner.spec.ts` never checked the second subject's lecture count (only the first's, still checked as «Ingen forelesninger ennå»).
  - `[false]` `[reject]` (blind) KI trail missing — written later in the same run, before the PR.
  - `[false]` `[reject]` (blind) the diff does not show that `package.json` is unchanged — no `package.json`, lockfile or `components.json` change since the baseline is exactly what proves it; the CLI's «cn» package was reverted before commit (logged in `korrigeringer.md`).
  - `[low]` `[reject]` (blind) «N kort, øvd» wording untested — same as the row above about `last_practiced_at === null`.
  - `[low]` `[reject]` (blind) no test that file-counts are refetched when 02 is shown again — the query client has no `staleTime` (`lib/query-client.ts`), and the job watcher invalidates every file-counts key when a job ends.
  - `[low]` `[reject]` (blind) several links named «Øv nå» — each sits in a list item whose heading is the subject name (programmatic context, WCAG 2.4.4); the sketch's text is the approved one.
  - `[low]` `[reject]` (blind) no loading cue and the card grows when data arrives — two quick local requests; a skeleton adds state for a moment's jump.
  - `[low]` `[reject]` (blind) «klare til bruk» while a job runs — «Lag flashcards» opens 04, which shows the job status; rare and harmless.
  - `[false]` `[reject]` (blind) spec line numbers and status — the Code Map refers to the baseline; status is set at finalize; fixing it edits the spec.
  - `[low]` `[reject]` (intent) columns follow the list's width, not the window — gives three at 1280 and two at 768 as the sketch and UX-DR10's end points; browser zoom shrinks the CSS width, so 200 % also drops columns.
  - `[false]` `[reject]` (intent) «eldste etter dato» relies on the overview order — that order is the API contract (date, created, id; `list_lectures`, tested in the backend); sorting again would be a second rule.
  - `[low]` `[reject]` (intent) «sist øvd» only tested on the pure function — the card renders `nextStep` directly, and the function test covers it.
  - `[false]` `[reject]` (intent) SK-20 only checked in the frontend — the e2e session test runs the real 5.1 function through the card.
  - `[low]` `[reject]` (intent) «Øv nå» relies on fresh counts — see the stale-counts row below.
  - `[low]` `[reject]` (intent) the 5.3 test no longer says «no alert on the page» — the spec now wants the fallback in the card when the overview fails; the exam lines still have none.
  - `[low]` `[reject]` (intent) older tests now check the card text — same as the e2e row above.
  - `[low]` `[reject]` (edge) overview lacks the subject — same as the first blind row.
  - `[false]` `[reject]` (edge) unparseable `last_practiced_at` gives NaN — the API sends an ISO datetime (pydantic `datetime`).
  - `[low]` `[reject]` (edge) cached file-counts may be stale for a moment — refetched on every mount; content is only deleted in sessions or on 03/04, and a click within that moment is unlikely.
  - `[low]` `[patch]` (edge) a failed background refetch replaced a loaded card with the fallback — the error now only wins when there is no data (`2e8e32b`).
  - `[low]` `[reject]` (edge) the 5.3 test lost its page-wide alert check — same as the 5.3 row above.

## Design Notes

file-counts hentes per emne fra forsiden i stedet for å utvide oversikten: tallene kommer da fra samme register og samme spørring som tabellen på 03 (samme hurtigbuffernøkkel), og `practice` trenger ikke lese `files`. Noen få emner gir noen få kall.

## Verification

**Commands:**
- `cd frontend && npm run test && npx tsc --noEmit` -- expected: alt grønt
- `cd backend && uv run pytest` -- expected: alt grønt (ingen endring)
- `cd frontend && npx playwright test` mot `docker compose up --build` -- expected: alt grønt

## Auto Run Result

Status: done

**Summary:** The front page (02) shows one subject card per subject in a grid under the exam lines from 5.3, instead of the epic-2 list (so the doubled name and date from #244 are gone). A card has the dot and name (h2), «Åpne ›», the counts line («120 kort · 64 quizspørsmål»), NESTE Å ØVE PÅ / NESTE STEG with lecture, reason and one button, and the progress bars with «N av M forelesninger øvd». The choice is one pure function, `nextStep`, built on `GET /api/overview` («øvd» from 5.1) and the per-subject file counts. «Øv nå» links to the first kind with content (flashcards, then quiz), never an empty session. No backend change.

**Files changed:**
- `frontend/components/ui/card.tsx` (new) -- shadcn card adapted to the tokens.
- `frontend/modules/subjects/next-step.ts` (+ test) -- counts line and «Neste å øve på» / NESTE STEG, every matrix row tested.
- `frontend/modules/subjects/components/subject-card.tsx` (new) -- the card.
- `frontend/modules/subjects/pages/home-page.tsx` (+ test) -- the grid, file counts per subject with `useQueries`.
- `frontend/e2e/emnekort.spec.ts` (new) -- four card variants, quiz-only starts quiz, new status after a session, Tab order, axe and columns at 1280 and 768.
- `frontend/e2e/emner.spec.ts`, `forelesninger.spec.ts`, `brukerreiser/flyt-1-…`, `brukerreiser/flyt-2-…` -- find the same content in the cards and the exam lines.

**Review:** 25 findings: 2 patched (both low, `2e8e32b`), 0 deferred, 17 low rejected and 6 false, reasons in the triage log.

**Follow-up review recommended:** false (patched: high 0, medium 0, low 2).

**Verification:** `npm run test` 878 passed; `npx tsc --noEmit` clean; `uv run pytest` 567 passed; `npx playwright test` 174 passed against `docker compose up --build` (one run after the rebuild had one unrelated failure in `vilkar.spec.ts`, which passed alone and in a full rerun).

**Residual risks:** the cards' counts only cover flashcards and quiz; model cards (epic 7) and free text (epic 8) must be added to `PRACTICE_KINDS`.
