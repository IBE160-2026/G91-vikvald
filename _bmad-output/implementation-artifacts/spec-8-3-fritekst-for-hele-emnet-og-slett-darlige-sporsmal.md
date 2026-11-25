---
title: 'Story 8.3: Fritekst for hele emnet og slett dårlige spørsmål'
type: 'feature'
created: '2026-11-25'
status: 'done'
baseline_revision: '21f410dd5ff7e6915a449a86629c4af9e1fe4307'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/autonom-kjoring.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-8-2-ov-pa-fritekst-og-vurder-deg-selv.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Sletting av alle spørsmålene fra en forelesnings første jobb kan flytte «første innhold» fram i tid, slik at en tidligere emneøkt slutter å telle som «øvd».
    evidence: |-
      first_freetext_question_times (og quiz/flashcards) bruker min(created_at) av spørsmålene som finnes nå. Regelen er fra story 5.1 (#236) og gjelder alle typer; oversikten hentes heller ikke på nytt rett etter sletting.
    location: >-
      backend/app/modules/content/registry.py
    severity: low
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

### 2026-11-25 — Review pass
- verdicts: 24 findings — high 0, medium 0, low 14, false 10, maybe-false 0
- findings:
  - Intent Alignment
    - `[low]` `[reject]` E2E-testen for emneøkten sletter med «Slett» før modellsvaret; knappen ved kilden prøves i nettleseren bare i forelesningsøkten — samme komponent og samme side i begge omfang, og Vitest dekker sletting etter modellsvaret; en ekstra e2e-flyt gir ingen ny dekning.
    - `[low]` `[reject]` Raden sier «N spørsmål fra M forelesninger», ikke bare «10 spørsmål» — samme form som Quiz-raden (4.4) i samme kort; antallet står først. Ført som kanttilfelle.
    - `[low]` `[reject]` Ingen e2e-test med `FEATURE_FREETEXT=false` — bryteren leses ved oppstart av backend; pytest dekker 404 FEATURE_DISABLED mot ekte backend, og jsdom dekker at raden og hentingen er borte. Samme mønster som 8.1 og 8.2.
    - `[false]` `[reject]` AR-2 for «forelesning» er ikke testet på nytt — forelesningsruta er fra 8.2 og har `test_fr4_andres_ukjent_eller_ugyldig_forelesning_gir_404`; storien legger ikke til noen ny forelesningsrute.
    - `[false]` `[reject]` Diffen gjør mer enn akseptkriteriene (forelesningen i lista, 404 som slettet, tilbake uten lagring) — alt står i spesifikasjonen og følger quizen fra 4.4/4.5.
    - `[false]` `[reject]` Arbeidet er ikke gjennomgått og spesifikasjonen er ikke committet — denne gjennomgangen er nettopp det; spesifikasjonen committes ved avslutningen.
  - Verification Gap
    - `[low]` `[patch]` Fil- og siderekkefølgen i emnelista var ikke testet med to filer i samme forelesning — ny test `test_fr50_subject_sporsmalene_i_en_forelesning_kommer_i_fil_og_siderekkefolge` (`aa4aacf`).
    - `[low]` `[reject]` Ruta `/emner/<id>/fritekst` prøves bare av Playwright, som CI ikke kjører — prosjektets valg fra story 1.2; hele Playwright-suiten kjøres før fletting.
    - `[false]` `[reject]` Endrede e2e-filer er ikke kjørt — hele suiten kjøres etter rettingene.
  - Blind Hunter
    - `[false]` `[reject]` KI-sporet mangler — føres i samme økt etter gjennomgangen, før PR-en.
    - `[false]` `[reject]` Ucommittet spesifikasjon og `frontend/e2e-skjermbilder/` — spesifikasjonen committes ved avslutningen; mappa er ikke denne storiens og skal ikke røres.
    - `[low]` `[defer]` Oversikten hentes ikke på nytt etter sletting, og «øvd» bygger på tidspunktet for første spørsmål — se samlet utsatt punkt under Edge Case Hunter.
    - `[low]` `[reject]` Slettelogikken er kopiert fra quizen — bevisst speiling av `quiz-session-page.tsx`; en felles hjelper betyr å endre to ferdige økter uten feil å rette.
    - `[false]` `[reject]` `deleteTarget` nullstilles aldri — dialogen er lukket (`open=false`) og henter ingenting; målet beholdes med vilje mens dialogen lukker seg, som i quizen.
    - `[false]` `[reject]` `useFreetextScope` lager spøkelsesspørringer og kan gi `/forelesninger/undefined` — deaktiverte spørringer henter ingenting, og forelesningsgrenen brukes bare når `lectureId` finnes (typen krever det).
    - `[low]` `[reject]` Kommentaren over siden ber leseren lese «forelesning» som «emne» — samme formulering som i `quiz-session-page.tsx`; ingen feil for brukeren.
    - `[low]` `[patch]` E2E-kommentaren påsto at øktens taster er av mens dialogen er åpen, uten å sjekke det — omskrevet til det linjene sjekker (`aa4aacf`).
    - `[false]` `[reject]` Rekkefølgetestene kan bli ustabile ved like `created_at` — forelesningene lages i hver sin HTTP-forespørsel med mikrosekundtid; samme test har gått grønt for quizen siden 4.4.
    - `[low]` `[reject]` «Slett» har ikke skjult tekst for skjermleser — bare én «Slett» vises om gangen, inne i spørsmålet; quizen og flashcards bruker samme navn, og e2e-testene finner knappen på det.
    - `[low]` `[reject]` Feiler `GET /api/config`, forsvinner raden uten feiltekst — samme regel som raden på forelesningssiden (8.1); config er hurtigbufret og feiler i praksis bare når backend er nede, og da viser de andre radene feilen.
    - `[low]` `[reject]` En test skriver reserveteksten rett inn — hele `subject-page.test.tsx` gjør det slik; endres teksten, endres alle samtidig.
    - `[false]` `[reject]` `setQueryData` overkjøres av ny henting — hentingen skjer etter at serveren har svart 204, så den nye lista har heller ikke spørsmålet.
  - Edge Case Hunter
    - `[low]` `[reject]` Når det eneste spørsmålet slettes, prøver fokus å gå til det gamle svarfeltet mens siden navigerer bort — siden byttes uansett, og den nye siden setter fokus på sin overskrift; å rette det krever en ekstra ref og vakt for et sjeldent tilfelle.
    - `[low]` `[defer]` Sletter studenten alle spørsmålene fra en forelesnings første jobb, flyttes «første fritekstspørsmål» fram i tid, og en tidligere emneøkt kan slutte å telle som «øvd» — regelen er fra 5.1/#236 og gjelder quiz og flashcards likt; ikke forårsaket av denne storien.

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

**Status:** done

**Hva som er bygd:** Fritekst for hele emnet og sletting av dårlige fritekstspørsmål. Emnesiden har raden «Fritekstspørsmål» («4 spørsmål fra 2 forelesninger», «Start ›») i «Øv på hele emnet» når bryteren er på og emnet har spørsmål. «Start ›» åpner `/emner/<id>/fritekst`, der økten henter spørsmålene fra alle forelesningene i tilfeldig rekkefølge, viser «<emne>, hele emnet», lagres med `lecture_id: null` og går tilbake til emnesiden. «Slett» står før modellsvaret og ved kilden etter det, i både forelesnings- og emneøkten, og bruker den felles slettebekreftelsen. Backend har `GET /api/subjects/{id}/freetext-questions` og `DELETE /api/freetext-questions/{id}` bak `FEATURE_FREETEXT`.

**Filer:**
- `backend/app/modules/content/service.py`, `router.py`, `backend/app/main.py` -- emnelista, oppslag og sletting med eierskap, rutene med bryter.
- `backend/tests/test_freetext_subject_and_delete.py` -- emnelista, rekkefølge, eierskap, bryter, sletting og «øvd» for emneøkter.
- `frontend/modules/practice/api.ts`, `frontend/lib/delete-text.ts` -- API, spørringsnøkkel og slettemål.
- `frontend/modules/practice/components/freetext-question.tsx`, `model-answer.tsx`, `missed-list.tsx` -- «Slett» og forelesningen i lista.
- `frontend/modules/practice/pages/freetext-session-page.tsx`, `frontend/app/(app)/emner/[subjectId]/fritekst/page.tsx` -- emneøkten og slettingen.
- `frontend/modules/subjects/pages/subject-page.tsx` -- raden på emnesiden.
- Vitest-filene, `frontend/e2e/fritekst-hele-emnet.spec.ts`, `frontend/e2e/fritekst-okt.spec.ts` (tabber forbi «Slett»), `docs/testplan.md`.

**Gjennomgang:** 24 funn. 2 rettet (begge lave, `aa4aacf`): ny test for fil- og siderekkefølgen i emnelista, og en misvisende kommentar i e2e-testen. 1 utsatt (lav, eksisterende regel fra 5.1: sletting kan flytte «første innhold» fram i tid). 10 var feilaktige, og 11 lave ble avvist med grunn i loggen over.

**followup_review_recommended:** false. Ingen rettede funn var `high` eller `medium` (2 `low`).

**Verifisering:** `uv run pytest` 931 bestått, `uv run ruff check .` rent, `npm run test` 1050 bestått, `npx tsc --noEmit` rent, `npx playwright test` mot `docker compose up --build -d`: 202 bestått, 4 hoppet over (testbrukeren finnes bare med tom database), 0 feilet.

**Gjenstående risiko:** `DELETE /api/freetext-questions/{id}` svarer `404 FEATURE_DISABLED` når bryteren er av, så spørsmål kan da ikke slettes enkeltvis (de slettes fortsatt med fila). Det utsatte punktet om «øvd» etter sletting.
