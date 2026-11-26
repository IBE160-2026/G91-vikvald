---
title: 'Story 9.2: Les sammendraget og lag et nytt'
type: 'feature'
created: '2026-11-26'
status: 'done'
baseline_revision: '0de869f3a8456715952dedfa1b32f4b3a040d502'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/autonom-kjoring.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-9-1-lag-sammendrag-av-en-forelesning.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Ruten /forelesninger/<id>/sammendrag sjekkes bare av Playwright, som CI ikke kjører.
    evidence: |-
      .github/workflows/ci.yml kjører bare pytest og vitest; Playwright kjøres for hånd før fletting.
    location: >-
      .github/workflows/ci.yml
    severity: low
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

### 2026-11-26 — Review pass
- verdicts: 35 findings — high 0, medium 0, low 22, false 11, maybe-false 2
- findings:
  - Verification Gap
    - `[low]` `[patch]` Sorteringen av `files` i opplastingsrekkefølge var ikke testet (første fil ga også første punkt) — ny `test_fr54_filer_staar_i_opplastingsrekkefolge_ikke_punktenes` (`631eb38`).
    - `[low]` `[defer]` Ruten `/forelesninger/<id>/sammendrag` sjekkes bare av Playwright, som CI ikke kjører — gjelder hele repoet fra før; Playwright kjøres for hånd før fletting, og det nevnes i PR-en.
  - Intent Alignment
    - `[low]` `[reject]` (1) Undertekst med flere temaer vises i e2e bare med demodata (1 og 2 temaer) — demomodellen gir ett tema per fil (Siljes avgjørelse 2026-11-14); flere temaer er testet i vitest og backend.
    - `[low]` `[reject]` (2) 568 px er sjekket som klasse, ikke målt — skjermbildene i 1280 og 768 px sammenlignes med skisse 13.
    - `[low]` `[reject]` (3) Valgt forelesning i sidemenyen er ikke testet på siden — `SubjectSidebar` med `currentLectureId` er testet fra før og brukes likt som på forelesningssiden; synlig i skjermbildene.
    - `[low]` `[reject]` (4) Formelmerket på et punkt er bare testet i vitest — demomodellen setter aldri merket; `FormulaFlag` er delt og testet.
    - `[false]` `[reject]` (5) INNHOLD/KILDER — vist med store bokstaver gjennom CSS, som overlinjene ellers i appen; skjermlesere leser ordet.
    - `[low]` `[reject]` (6) For få punkter er spilt av i nettleseren — mock gir alltid samme sammendrag, så ekte TOO_FEW etter et sammendrag går ikke; backend-testen dekker bevaringen. Ført i beslutninger.md.
    - `[false]` `[reject]` (7) FR-56 «når hun forlater siden» — siden har ingen skrivende kall og ingen økt-lagrer; e2e teller kall til lagring av økt og sjekker øvd.
    - `[low]` `[reject]` (8) 404 for annens forelesning og bryter av er bare testet i API og vitest — samme rute og samme `notFound` som tilfellet som er testet i nettleseren.
    - `[false]` `[reject]` (9) Meldingen dempes på sammendragssiden — bevisst, så resultatet ikke leses opp to ganger; testet.
    - `[false]` `[reject]` (10) Tillegg utover storien (brødsmuler, venting, feil etter innlasting) — følger skisse 13 og radens oppførsel; ingen motsier storien.
    - `[low]` `[reject]` (11) Full tab-rekkefølge er ikke testet — DOM-rekkefølgen følger leserekkefølgen (testet), og e2e bruker tastaturet.
    - `[false]` `[reject]` (12) Spesifikasjonen og `frontend/e2e-skjermbilder/` er utenfor diffen — med vilje.
  - Blind Hunter
    - `[low]` `[patch]` Blank side når forelesningen feiler med noe annet enn 404 mens sammendraget lastes — `loadError` regnes per spørring; vitest-test (`631eb38`).
    - `[low]` `[reject]` Ingen lastetilstand — som forelesningssiden og de andre sidene; svaret kommer raskt.
    - `[low]` `[reject]` Brødsmulen viser «Emnet» hvis emnet ikke lastes — sjelden, og lenken virker likevel.
    - `[maybe-false]` `[reject]` Knappen er aktiv før `jobs/latest` er lastet — en start da gir 409 med norsk melding; ville bare vært lav, og krever en ekstra vakt.
    - `[low]` `[reject]` En gammel feilet jobb vises over sammendraget — samme kilde som raden (valgt i spesifikasjonen), forsvinner ved neste jobb.
    - `[low]` `[reject]` Sammendraget hentes to ganger når jobben er ferdig — ufarlig, og tilbakekallet sikrer oppdatering uten jobbvakt.
    - `[low]` `[patch]` Hvert tema ble et eget landemerke — `aria-labelledby` fjernet (`631eb38`).
    - `[low]` `[reject]` Formelmerket i lesesvaret er ikke testet i backend — feltet kopieres rett; FR-41 er testet i løpet fra 9.1.
    - `[false]` `[reject]` Importrekkefølgen i testfila — `ruff check` er rent.
    - `[false]` `[reject]` Lange linjer — `ruff check` er rent; ESLint finnes ikke i frontenden.
    - `[low]` `[reject]` Egen `SummarySource`-type — strukturelt lik `Source`; TypeScript sjekker begge.
    - `[false]` `[reject]` Avhengighet mellom modulene — forelesningssiden importerer `generation` og `subjects` på samme måte.
    - `[low]` `[reject]` Tallet 9 i axe-testen — mock-regelen er fast (3 + 6 sider); en endring gir en tydelig feil i testen.
    - `[false]` `[reject]` KI-sporet mangler — føres i samme økt etter gjennomgangen, før PR-en.
    - `[false]` `[reject]` `frontend/e2e-skjermbilder/` — fantes fra før, skal ikke røres.
  - Edge Case Hunter
    - `[low]` `[patch]` Samme som første Blind Hunter-funn (blank side) — rettet i `631eb38`.
    - `[false]` `[reject]` En ny henting som gir 404, viser «Fant ikke siden» — riktig: sammendraget finnes ikke lenger (f.eks. fila slettet i en annen fane).
    - `[maybe-false]` `[reject]` Kappløp mellom `jobs/latest` og `setQueryData` — samme mønster som raden fra epic 3; verste utfall er en 409 med melding.
    - `[low]` `[reject]` Fokus blir på området når startkallet feiler — området er fokuserbart og navngitt, og feilen leses av `role="alert"`.
    - `[false]` `[reject]` Ugyldig dato gir NaN — backend sender alltid en gyldig tid.
    - `[low]` `[reject]` Temaer som bare skiller seg i store bokstaver eller mellomrom — utenfor kontrollreglene i FR-53.

## Design Notes

- **Kilder:** `files` er filene punktene kommer fra, ikke alle filene i forelesningen. En fil som lastes opp etter sammendraget, er ikke en kilde, og sletting eller erstatting av en fil sletter uansett sammendraget. Undertekstens «fra N filer» bruker samme tall.
- **Feil på siden:** samme kilde som raden (siste jobb av typen `summary` fra `jobs/latest`), så feilen står også etter en ny innlasting, til neste jobb starter.

## Verification

**Commands:**
- `cd backend && uv run pytest && uv run ruff check .` -- expected: alle grønne.
- `cd frontend && npm run test && npx tsc --noEmit` -- expected: alle grønne.
- `cd frontend && npx playwright test` mot `docker compose up --build -d` -- expected: alle grønne.

## Auto Run Result

**Status:** done

**Hva som er bygd:** `GET /api/lectures/{id}/summary` bak `FEATURE_SUMMARY` (temaer i rekkefølgen de først dukker opp, punktene i lagret rekkefølge med kilde, og filene punktene kommer fra). Raden har omrissknappen «Les sammendrag», som åpner `/forelesninger/<id>/sammendrag`. Siden har sidemeny, brødsmuler, h1 «Sammendrag», underteksten, artikkelen på høyst 568 px, innholdskortet (INNHOLD, KILDER, «Lag nytt sammendrag») og merknaden. «Lag nytt sammendrag» starter jobben. Det gamle sammendraget står mens jobben går, og en feilet jobb gir feilteksten og «Prøv igjen». Jobbvakten viser ikke den korte meldingen på sammendragssiden. Axe-testen krever sammendragssiden (#301).

**Filer:**
- `backend/app/modules/content/{schemas,service,router}.py` -- lesefunksjonen og ruten.
- `backend/tests/test_summary.py` -- lesetestene (FR-54, FR-55, FR-56, AR-11).
- `frontend/components/create-row.tsx` -- `contentAction` i stedet for `contentActions`.
- `frontend/modules/generation/components/{generation-row,summary-row,summary-remake,job-watcher}.tsx` -- knappen, «Lag nytt sammendrag» og meldingen.
- `frontend/modules/content/*`, `frontend/app/(app)/forelesninger/[lectureId]/sammendrag/page.tsx` -- siden.
- `frontend/lib/dates.ts` -- `formatLocalDate`.
- `frontend/e2e/sammendrag.spec.ts`, `universell-utforming.spec.ts` -- nettlesertestene og #301.
- `docs/testplan.md` -- kravene.

**Gjennomgang:** 35 funn. 3 rettet (alle lav: blank side ved feil i forelesningen, ett landemerke per tema, test av filrekkefølgen; `631eb38`), 1 utsatt (Playwright kjøres ikke i CI), resten avvist med grunn i loggen over. Etter gjennomgangen viste skjermbildene at «Les sammendrag» var fylt, mot Siljes avgjørelse om at bare «Øv nå» er fylt; rettet til omriss (`5e08fc9`).

**followup_review_recommended:** false. Ingen høy eller middels retting; endringene er dekket av tester og en ny full kjøring.

**Verifisering:** `uv run pytest` 1008 bestått, `ruff check .` rent; `npm run test` 1086 bestått, `npx tsc --noEmit` rent (før omriss-rettingen; de berørte filene 103 bestått etterpå); `npx playwright test` mot `docker compose up --build -d` etter alle rettinger: 211 bestått og 4 hoppet over (seed-testene); seed-testene med `E2E_REQUIRE_SEED=1` mot `sk-seedtest` med de samme bildene: 10 bestått.

**Gjenstående risiko:** Kildeteksten har ikke strek under som i skisse 13 (delt komponent, med vilje uten lenke i MVP). Ruten testes bare av Playwright, som CI ikke kjører.
