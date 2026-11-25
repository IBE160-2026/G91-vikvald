---
title: 'Story 8.3: Fritekst for hele emnet og slett dårlige spørsmål'
type: 'feature'
created: '2026-11-25'
status: 'blocked'
baseline_revision: '21f410dd5ff7e6915a449a86629c4af9e1fe4307'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/autonom-kjoring.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-8-2-ov-pa-fritekst-og-vurder-deg-selv.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Fritekst-økten fra 8.2 virker bare for én forelesning, og et dårlig spørsmål kan ikke fjernes. Studenten vil repetere fritekst for hele emnet før eksamen (FR-50) og slette spørsmål hun ikke stoler på (FR-52), og en emneøkt skal telle som «øvd» (FR-56).

**Approach:** Backend får `GET /api/subjects/{id}/freetext-questions` og `DELETE /api/freetext-questions/{id}` bak `FEATURE_FREETEXT`, bygd som quizrutene fra 4.4 og 4.5. Frontend får raden «Fritekstspørsmål» i `practice-all-card`, ruta `/emner/<id>/fritekst`, og `FreetextSessionPage` får et omfang (forelesning eller hele emnet) og «Slett» med slettebekreftelsen, slik `QuizSessionPage` har det.

## Boundaries & Constraints

**Always:**
- Begge rutene sjekker bryteren først og svarer `404 FEATURE_DISABLED` før noe slås opp. Andres, ukjent eller ugyldig emne eller spørsmål gir `404 NOT_FOUND`. Uten innlogging `401`. `DELETE` svarer `204` uten innhold.
- Emnelista har samme felt som forelesningslista, sortert som `subject_quiz_questions` (forelesningens dato, opprettet, så fil, side og rekkefølge).
- Emnesiden spør bare etter fritekstspørsmål når `config.feature_freetext === true`. Raden «Fritekstspørsmål» står under Quiz, med «N spørsmål fra M forelesninger» og tekstknappen «Start ›» (lest «Start fritekst på hele emnet»), og vises bare når emnet har spørsmål. Bryteren av: ingen rad, ingen henting og ingen feiltekst.
- Emneøkten: panelet og resultatet viser «<emne>, hele emnet» med emnets farge, modellsvaret viser spørsmålets egen forelesning, `missed-list` viser forelesningen under kilden, økten lagres med `lecture_id: null`, og alle veier tilbake («Tilbake til emnet», Esc på resultatsiden, «Avslutt økt» uten vurdering, tom tilstand) går til `/emner/<id>`. Dokumenttittelen er «Fritekst – <emne> – Studiekamerat».
- «Slett» er en rød tekstknapp med søppelbøtte i spørsmålets bunnfelt, både før modellsvaret (til venstre for «Vis modellsvar») og etter (i bunnfeltet til `model-answer`, ved kilden). Den åpner `DeleteConfirmDialog` med «Slette spørsmålet?», spørsmålsteksten, «Slett spørsmålet», ingen tellinger og «Avbryt» som startfokus. «Avbryt» og Esc sletter ingenting; hurtigtastene er av mens dialogen er åpen.
- Slettet (`204`, eller `404` fordi det alt var borte): spørsmålet tas ut av økten med `removeCard`, uten å telles som vurdert; det tas ut av øktens egen liste i hurtigbufferen, og forelesningen og alle emnenes øvingslister hentes på nytt. Neste spørsmål vises med tomt felt og fokus i «Ditt svar». Ingen spørsmål igjen: med noe vurdert er økten ferdig (lagres som ikke avbrutt, resultatsiden); uten noe vurdert går hun tilbake dit økten startet, og ingenting lagres.
- Slett virker likt i forelesningsøkten og emneøkten.
- `isSubjectPracticeQueryKey` dekker også `["subjects", id, "freetext-questions"]`, så jobbvakta oppdaterer emnesiden når en fritekstjobb er ferdig.
- «Øvd»-regelen fra 5.1 er uendret: en emneøkt med `kind: "freetext"` teller for forelesninger som hadde fritekstspørsmål da den startet (registeret har det fra 8.1). Det dekkes av en test.
- Tester har krav-ID i navnet (`test_fr50_subject_…`, `test_fr52_…`, `FR-52: …`). Ingen test kaller Vertex AI eller Gemini. Kode og kommentarer på engelsk, tekster på norsk bokmål.

**Never:**
- Ingen redigering av fritekstspørsmål, ingen hurtigtast for «Slett», ingen endring av `POST /api/practice-sessions` eller øvd-regelen.
- Ingen endring av brukerreisetestene i `e2e/brukerreiser/` (orkestratoren utvider dem når epicen er ferdig).
- Ikke endre planleggingsdokumentene, `CLAUDE.md`, `.claude/settings.json` eller `frontend/e2e-skjermbilder/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Emne med spørsmål | 7 spørsmål i én forelesning | Raden «7 spørsmål fra 1 forelesning», «Start ›» åpner `/emner/<id>/fritekst`, panelet «<emne>, hele emnet» | – |
| Emne uten spørsmål | Tom liste | Ingen rad | – |
| Bryter av | `FEATURE_FREETEXT=false` | Ingen rad, ingen henting; begge rutene `404 FEATURE_DISABLED`; `/emner/<id>/fritekst` viser «Fant ikke siden» | – |
| Andres | Annen bruker | `404 NOT_FOUND`; økten viser «Fant ikke siden» | – |
| Slett før modellsvar | «Slett» → «Slett spørsmålet» på spørsmål 1 av 3 | `DELETE` 204; «SPØRSMÅL 1 AV 2», tomt felt med fokus; ingenting vurdert | Feil (ikke 404): reserveteksten i dialogen, ingenting endres |
| Slett etter modellsvar | Modellsvar vist, «Slett» | Som over; selvvurderingen forsvinner | – |
| Avbryt | «Avbryt» eller Esc i dialogen | Ingen `DELETE`; fokus tilbake på «Slett» | – |
| Siste spørsmål slettes etter vurdering | 1 vurdert, slett det andre og siste | Resultatsiden, lagret med `aborted:false`, `answered 1` | – |
| Eneste spørsmål slettes | Ingenting vurdert, ingen igjen | Tilbake dit økten startet; ingenting lagres | – |
| Allerede borte | `DELETE` svarer 404 `NOT_FOUND` | Behandles som slettet | – |

</intent-contract>

## Code Map

- `backend/app/modules/content/service.py:193` `subject_quiz_questions` -- mal for `subject_freetext_questions`; `:618` `get_quiz_question`/`delete_quiz_question` -- mal for `get_freetext_question`/`delete_freetext_question`; `:462` `lecture_freetext_questions` -- feltene (cast til `FreetextKind`).
- `backend/app/modules/content/router.py` -- ny emnerute og ny `freetext_questions_router` (prefiks `/api/freetext-questions`); bryteren som i `lecture_freetext_question_list`. Oppdater modul-docstringen.
- `backend/app/main.py:82` -- registrer `freetext_questions_router`.
- `backend/app/modules/content/registry.py` -- leses bare: `first_freetext_question_times` er alt registrert for `freetext` (øvd-regelen).
- `backend/tests/test_freetext_practice.py` (`_made`, `_session_body`, `_overview_subject`), `test_subject_quiz_questions.py`, `test_delete_quiz_questions.py` -- mønster for ny `test_freetext_subject_and_delete.py`.
- `frontend/modules/practice/api.ts` -- `subjectFreetextQuestionsQueryKey`, `fetchSubjectFreetextQuestions`, `deleteFreetextQuestion`; `isSubjectPracticeQueryKey` får `freetext-questions`.
- `frontend/modules/practice/pages/quiz-session-page.tsx` -- mal: `ScopeProps`, `useQuizScope`, `questionDeleted`, `DeleteConfirmDialog`, `playAgain` med hurtigbufferen.
- `frontend/modules/practice/pages/freetext-session-page.tsx` -- får `useFreetextScope`, slett og emnetekster; `notFoundWhenMissingOrOff` brukes for eier og spørsmål.
- `frontend/modules/practice/components/freetext-question.tsx` -- `onDelete`; «Slett» før modellsvaret; tekstfeltet får `data-answer-field` (fokus etter sletting).
- `frontend/modules/practice/components/model-answer.tsx` -- valgfri `onDelete`, «Slett» i bunnfeltet ved kilden.
- `frontend/modules/practice/components/quiz-question.tsx:177` -- knappestilen for «Slett».
- `frontend/modules/practice/components/missed-list.tsx` -- `MissedFreetextItem.lecture?` vist under kilden som i `QuizMissedList`.
- `frontend/lib/delete-text.ts:9` -- `DeleteTarget` får `"freetext-question"`.
- `frontend/modules/subjects/pages/subject-page.tsx` -- `useAppConfig`, spørring med `enabled` på bryteren, `freetextRows` som `quizRows`.
- `frontend/app/(app)/emner/[subjectId]/quiz/page.tsx` -- mal for `emner/[subjectId]/fritekst/page.tsx`.
- `frontend/modules/practice/pages/freetext-session-page.test.tsx`, `quiz-session-page.test.tsx`, `frontend/modules/subjects/subject-page.test.tsx` -- testmønster (fetch-mock).
- `frontend/e2e/quiz-hele-emnet.spec.ts`, `slett-quizsporsmal.spec.ts`, `fritekst-okt.spec.ts` -- mønster for ny `e2e/fritekst-hele-emnet.spec.ts`.
- `docs/testplan.md:80` -- FR-50 utvides, FR-52 legges til, FR-56 får nye filer.

## Tasks & Acceptance

**Execution:**
- `backend/app/modules/content/service.py`, `router.py`, `backend/app/main.py` -- emnelista, oppslag og sletting med eierskap, rutene med bryter -- FR-50, FR-52, AR-2, AR-11.
- `backend/tests/test_freetext_subject_and_delete.py` -- emnelista (alle forelesninger, rekkefølge, felt, tom, annet emne), 404 for andres/ukjent/ugyldig, 401, bryter av før oppslag for begge rutene, sletting (204, borte fra lister og tellinger, andres/ukjent gir lik 404, kan slettes mens en jobb går), emneøkt med `lecture_id: null` teller som «øvd».
- `frontend/modules/practice/api.ts`, `frontend/lib/delete-text.ts` -- API og slettemål.
- `frontend/modules/practice/components/freetext-question.tsx`, `model-answer.tsx`, `missed-list.tsx` -- «Slett» og forelesningen i lista.
- `frontend/modules/practice/pages/freetext-session-page.tsx`, `frontend/app/(app)/emner/[subjectId]/fritekst/page.tsx` -- emneøkten og slettingen.
- `frontend/modules/subjects/pages/subject-page.tsx` -- raden.
- Vitest: `freetext-session-page.test.tsx` (emneøkt, lagring med `lecture_id: null`, veier tilbake, alle sletteradene i matrisen), `subject-page.test.tsx` (rad med antall, ingen rad uten spørsmål, ingen rad og ingen henting med bryteren av), `missed-list.test.tsx`, `api.test.ts` eller tilsvarende for `isSubjectPracticeQueryKey`.
- `frontend/e2e/fritekst-hele-emnet.spec.ts` -- med bare tastatur: emnesiden har raden, «Start ›», panelet «…, hele emnet», vurder, slett med Esc (ingenting slettes) og med bekreftelse (204, telleren går ned), lagret kropp med `lecture_id: null`, tilbake til emnet; axe på emnesiden, økten og slettebekreftelsen i 1280 og 768 px.
- `docs/testplan.md` -- FR-50, FR-52, FR-56.

**Acceptance Criteria:**
- Given et emne der minst én forelesning har fritekstspørsmål, when studenten åpner emnesiden, then har «Øv på hele emnet» raden «Fritekstspørsmål» med antallet og «Start ›».
- Given «Start ›», when økten starter, then hentes spørsmålene med `GET /api/subjects/{id}/freetext-questions` i tilfeldig rekkefølge, panelet viser «<emne>, hele emnet», økten lagres med `lecture_id: null`, og «Tilbake til emnet» går til emnesiden.
- Given et spørsmål i økten, when hun trykker «Slett» og bekrefter, then svarer `DELETE /api/freetext-questions/{id}` 204, og økten går videre uten at spørsmålet telles som vurdert.
- Given emnesiden og slettebekreftelsen, when axe kjøres i 1280 og 768 px, then er det ingen brudd, og «Start ›» og sletting kan gjøres med bare tastatur.

## Spec Change Log

## Review Triage Log

## Design Notes

- **Ett sideomfang:** `FreetextSessionPage` tar `{lectureId} | {subjectId}` og en `useFreetextScope` som speiler `useQuizScope`, så forelesning og emne deler all øktkode.
- **Slett før og etter modellsvaret:** storien sier «i bunnfeltet ved kilden», og kilden vises først med modellsvaret. Et spørsmål kan likevel være åpenbart dårlig før hun svarer, og quizen (4.5) har «Slett» både før og etter bekreftelsen. Derfor begge steder; ført som kanttilfelle.
- **Sletting teller aldri som vurdert:** i fritekst går en vurdering rett videre, så spørsmålet som vises, er aldri merket. `removeCard` tar det da ut av `order`, telleren og totalen.

## Verification

**Commands:**
- `cd backend && uv run pytest && uv run ruff check .` -- expected: alle grønne.
- `cd frontend && npm run test && npx tsc --noEmit` -- expected: alle grønne.
- `cd frontend && npx playwright test` mot `docker compose up --build -d` -- expected: alle grønne.

## Auto Run Result

**Status:** blocked

**Blokkerende vilkår:** For lite ledig disk. Etter implementeringen og Playwright-kjøringen var det bare 215 MB ledig på `/` mens appen kjørte. Diskregelen sier at kjøringen stopper under 2 GB. Appen er stoppet med `docker compose down` (uten `-v`).

**Hva som er gjort:** Backend, frontend og testene er bygd og committet lokalt på `story/8-3` (seks commits over `21f410d`). Implementeringsagenten rapporterte grønt: `uv run pytest` 930 bestått, Vitest 1050 bestått, `tsc` rent, og `npx playwright test` 206 tester der 4 er hoppet over og resten består.

**Gjenstår:** kontroll av diffen og gjennomgangen (steg 4), skjermbilder, KI-sporet, sprint-status, sesjonsloggen, issuer for kanttilfeller, push, PR og fletting.
