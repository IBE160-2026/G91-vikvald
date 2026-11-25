---
title: 'Story 8.2: Øv på fritekst og vurder deg selv'
type: 'feature'
created: '2026-11-25'
status: 'done'
baseline_revision: '5aa7e88438224c211bd88991bdd770d29d3f547f'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/autonom-kjoring.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-8-1-lag-fritekstsporsmal.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Fritekstspørsmålene fra story 8.1 kan lages, men ikke øves på. Studenten trenger en økt der hun skriver svaret selv, ser modellsvaret med kilde og vurderer seg selv som Feil, Delvis riktig eller Riktig (FR-50, FR-51), og der resultatet lagres og teller som «øvd» (FR-56).

**Approach:** Backend får `GET /api/lectures/{id}/freetext-questions` bak `FEATURE_FREETEXT`. Frontend får fritekst-økten på `/forelesninger/<id>/fritekst` (skisse 12), bygd på øktrammen fra epic 3–4: `SessionPanel` med en ny `freetextAdapter`, `SessionState` med et tredje merke `partial` (◐), `useSessionSaver` med `kind: "freetext"`, hurtigtastene og en resultatside med tre tall og en liste over Feil og Delvis riktig. «Øv nå» kommer på Fritekstspørsmål-raden.

## Boundaries & Constraints

**Always:**
- Ruta svarer `404 FEATURE_DISABLED` når bryteren er av, før forelesningen slås opp. Andres eller ukjent forelesning gir `404 NOT_FOUND`. Svaret har `id`, `kind`, `question`, `model_answer`, `formula_flag`, `source {file_id, file_name, page_no}` og `lecture {id, name}`, sortert som quizspørsmålene (fil, side, rekkefølge).
- Spørsmålene kopieres én gang inn i økten og stokkes; hvert vises én gang (FR-50). En ny henting endrer aldri en økt som går.
- Under et spørsmål: «SPØRSMÅL N AV M», spørsmålet (h2), tekstfeltet med synlig etikett «Ditt svar» og fokus i feltet. «Vis modellsvar» er ikke aktiv før feltet har et tegn som ikke er mellomrom eller linjeskift (E28).
- «Vis modellsvar»: feltet låses (`readOnly`), «Levert · N ord» står til høyre for etiketten (N = ord skilt med mellomrom), `model-answer` vises med h3 «Modellsvar» (`tabindex="-1"`, får fokus, A8), teksten, formelmerket når spørsmålet har det, kilden og forelesningen. Under står selvvurderingen: h3 «Hvordan gikk det?», «Vurder selv mot modellsvaret.» og tre like omrissknapper «Feil», «Delvis riktig», «Riktig» (✗, ◐, ✓ som pynt) uten forhåndsvalg.
- `1`/`2`/`3` = Feil/Delvis riktig/Riktig virker bare når selvvurderingen er synlig (E27), aldri i et tekstfelt, og bare med bryteren «Bruk hurtigtaster» på. Esc avslutter økten (ikke mens fokus står i tekstfeltet, som er den felles regelen). `?` åpner hurtigtastdialogen, som får gruppa «Fritekst».
- En vurdering gir ruta ✓, ◐ eller ✗ (lest «Spørsmål 2: delvis riktig»), øker tellingen og går rett videre til neste spørsmål med fokus i «Ditt svar». Svaret hennes ligger bare i komponenten og sendes aldri.
- Øktpanelet: «Fritekst», forelesningen, «2 / 10», stolpen, tellelinja (bare tallene som ikke er null, i rekkefølgen riktig, delvis riktig, feil, for eksempel «1 delvis riktig»; «Ingen vurdert ennå» når alt er null), rutenettet med forklaringen Riktig / Delvis riktig / Feil / Ikke besvart ennå, og «Avslutt økt».
- Lagring med `useSessionSaver`: `kind: "freetext"`, `shown`, `answered`, `correct`, `partial`, `wrong`, `aborted`, én gang, ved ferdig økt, «Avslutt økt»/Esc, navigering, utlogging og `pagehide`. Ingenting vurdert: ingenting lagres, og hun går rett tilbake til forelesningen.
- Resultatsiden (832 px): overlinja «ØKT FERDIG», tittelen «Du har gått gjennom alle N spørsmålene» («… 1 spørsmål») eller «Avbrutt etter A av N» (h2 med fokus), forelesningen, og tre felt «Riktig», «Delvis riktig», «Feil» uten feiring. `missed-list` med h3 «Feil og delvis riktig» og «N spørsmål» viser hvert slikt spørsmål med nummer, merket (✗ Feil / ◐ Delvis riktig i tekst), spørsmålet, modellsvaret, formelmerket og kilden, aldri hennes svar. Knappene «Tilbake til forelesningen» og «Øv igjen» (Enter), Esc går tilbake. «✓ Økten er ferdig og lagret» i panelet og i et levende område.
- Delvis riktig vises med ◐ på `surface-partial` i blekk (DESIGN.md), aldri med emnefarge.
- Bryteren av: «Øv nå» vises ikke (raden er skjult fra 8.1), og økten viser «Fant ikke siden».
- Tester har krav-ID i navnet. Ingen test kaller Vertex AI eller Gemini. Kode og kommentarer på engelsk, tekster på norsk bokmål.

**Never:**
- Ingen emneøkt, `GET /api/subjects/{id}/freetext-questions`, «Start ›» på emnesiden eller sletting (story 8.3).
- Ingen lagring eller sending av studentens svar, og ingen endring av `POST /api/practice-sessions` (støtter alt fra før).
- Ikke endre planleggingsdokumentene, `CLAUDE.md`, `.claude/settings.json` eller `frontend/e2e-skjermbilder/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tomt svar (E28) | Feltet er tomt, «   », «\n\n» | «Vis modellsvar» er ikke aktiv | – |
| Taster før modellsvar (E27) | `1`/`2`/`3` før «Vis modellsvar», eller i feltet | Ingenting skjer; tallet skrives i feltet | – |
| Vurdering | `2` etter modellsvaret | ◐ i ruta, «1 delvis riktig», neste spørsmål, fokus i «Ditt svar» | – |
| Ordtelling | «  To  ord\nher » | «Levert · 3 ord» | – |
| Ferdig | Alle vurdert (1 riktig, 1 delvis, 1 feil) | Lagres med `aborted:false`, `answered 3, correct 1, partial 1, wrong 1`; resultatsiden | Lagring feiler: reserveteksten i `role="alert"` |
| Avbrutt | Esc/«Avslutt økt» etter 1 av 3 vurdert | «Avbrutt etter 1 av 3», lagres som avbrutt | – |
| Ingenting vurdert | «Avslutt økt» før første vurdering | Tilbake til forelesningen, ingenting lagres | – |
| Ingen spørsmål | Tom liste | «Det finnes ingen fritekstspørsmål her ennå.» og «Tilbake til forelesningen» | – |
| Bryter av | `FEATURE_FREETEXT=false` | API `404 FEATURE_DISABLED`; siden viser «Fant ikke siden» | – |
| Andres forelesning | Annen bruker | `404 NOT_FOUND`; «Fant ikke siden» | – |

</intent-contract>

## Code Map

- `backend/app/modules/content/schemas.py` -- ny `FreetextQuestionOut` (mal: `QuizQuestionOut`).
- `backend/app/modules/content/service.py:164` `lecture_quiz_questions` -- mal for `lecture_freetext_questions`.
- `backend/app/modules/content/router.py` -- ny rute; bryteren sjekkes med `get_settings().FEATURE_FREETEXT` og `AppError(ErrorCode.FEATURE_DISABLED)` før `get_lecture` (som `generation/router.py` gjør).
- `backend/app/modules/practice/*` -- tar allerede imot `kind="freetext"` og `partial`, og «øvd» teller forelesningsøkter for alle typer. Bare tester.
- `backend/tests/test_freetext.py` (fixture `lecture`, `_start`, `_finish_jobs`), `test_quiz_questions.py`, `test_overview.py` -- mønster for den nye `test_freetext_practice.py`.
- `frontend/modules/practice/types.ts:48` `Mark` -- legg til `"partial"`; ny `FreetextQuestion`.
- `frontend/modules/practice/session.ts` `sessionCounts` -- regn `wrong` som antall `missed` og legg til `partial`; `answerCurrent` + `advance` brukes for vurdering.
- `frontend/modules/practice/adapter.ts` -- `countsText` får `partial`; `CELL_TEXT`-postene får `partial`; ny `freetextAdapter`.
- `frontend/modules/practice/components/answer-grid.tsx` -- `MARK_CLASSES.partial = bg-surface-partial text-ink`, `MarkIcon` får halvfylt sirkel (egen SVG, som skissen).
- `frontend/modules/practice/components/result-summary.tsx` -- `kind="freetext"` med tre felt.
- `frontend/modules/practice/components/missed-list.tsx` -- `kind="freetext"`.
- `frontend/modules/practice/components/shortcut-hints.tsx` -- `freetextHints`, `align="end"`.
- `frontend/modules/practice/components/explanation-card.tsx` -- mal for ny `model-answer.tsx`.
- `frontend/modules/practice/pages/quiz-session-page.tsx` -- mal for ny `freetext-session-page.tsx` (lagring, `end`, `playAgain`, bindinger, tom tilstand, feil, sr-only status).
- `frontend/modules/practice/api.ts` -- `lectureFreetextQuestionsQueryKey`, `fetchLectureFreetextQuestions`.
- `frontend/lib/api.ts:80` `notFoundOnMissing` -- siden kaller `notFound()` også for `FEATURE_DISABLED`.
- `frontend/components/shortcuts-dialog.tsx` -- gruppa «Fritekst».
- `frontend/modules/generation/components/freetext-row.tsx` -- `onPractice` til `/forelesninger/<id>/fritekst`; `showPractice` fjernes fra `GenerationRow` og `CreateRow` (ingen andre brukere).
- `frontend/app/(app)/forelesninger/[lectureId]/quiz/page.tsx` -- mal for `fritekst/page.tsx`.
- `frontend/e2e/quiz-okt.spec.ts`, `e2e/fritekst.spec.ts`, `e2e/brukerreiser/felles.ts` -- mønster og hjelpere.
- `docs/testplan.md:78-79` -- FR-49 oppdateres, FR-50 og FR-51 legges til, FR-56 får de nye filene.

## Tasks & Acceptance

**Execution:**
- `backend/app/modules/content/schemas.py`, `service.py`, `router.py` -- `FreetextQuestionOut`, `lecture_freetext_questions`, ruta med bryter -- FR-50, AR-2, AR-11, AR-15.
- `backend/tests/test_freetext_practice.py` -- felt og rekkefølge, tom liste, andre forelesninger, 404 for andres/ukjent, 401, bryter av (også før oppslag), økt med `partial` lagres og vises i `last_session`, forelesningsøkt teller som «øvd».
- `frontend/modules/practice/types.ts`, `session.ts`, `adapter.ts`, `api.ts` -- merket `partial`, tellinger, adapteren, API-et.
- `frontend/modules/practice/components/answer-grid.tsx`, `result-summary.tsx`, `missed-list.tsx`, `shortcut-hints.tsx`, `model-answer.tsx`, `freetext-question.tsx` -- komponentene.
- `frontend/modules/practice/pages/freetext-session-page.tsx`, `frontend/app/(app)/forelesninger/[lectureId]/fritekst/page.tsx` -- økten.
- `frontend/components/shortcuts-dialog.tsx`, `frontend/modules/generation/components/freetext-row.tsx`, `generation-row.tsx`, `frontend/components/create-row.tsx` -- tastene og «Øv nå».
- Vitest: `session.test.ts`, `answer-grid.test.tsx`, `result-summary.test.tsx`, `missed-list.test.tsx`, `shortcut-hints.test.tsx`, `shortcuts-dialog.test.tsx`, ny `freetext-session-page.test.tsx`, `lecture-page.test.tsx` (raden har «Øv nå»), `create-row.test.tsx` -- med FR-50/FR-51/FR-56 i navnene og alle radene i matrisen.
- `frontend/e2e/fritekst-okt.spec.ts` -- med bare tastatur: «Øv nå», skriv, «Vis modellsvar», fokus på «Modellsvar», `2` gir ◐, ferdig økt med resultat, lagret kropp, axe på økten og resultatsiden i 1280 og 768 px; avbrudd med Esc; ingenting vurdert. `e2e/fritekst.spec.ts` oppdateres (raden har nå «Øv nå»).
- `docs/testplan.md` -- FR-49, FR-50, FR-51, FR-56.

**Acceptance Criteria:**
- Given en forelesning med fritekstspørsmål og bryteren på, when studenten trykker «Øv nå» på raden, then åpnes `/forelesninger/<id>/fritekst` med øktpanelet «Fritekst», «1 / N» og fokus i «Ditt svar».
- Given at hun har vurdert alle spørsmålene, when økten er ferdig, then sendes én `POST /api/practice-sessions` med `kind:"freetext"` og riktige tall, og forelesningen er «øvd» i `GET /api/overview`.
- Given resultatsiden, when hun trykker Enter, then starter en ny økt med samme spørsmål i ny rekkefølge; Esc går til forelesningen.
- Given fritekst-økten og resultatsiden, when axe kjøres i 1280 og 768 px, then er det ingen brudd.

## Spec Change Log

## Review Triage Log

### 2026-11-25 — Review pass
- verdicts: 27 findings — high 0, medium 0, low 22, false 5, maybe-false 0
- findings:
  - Verification Gap
    - `[low]` `[patch]` `formula_flag: true` gjennom `GET …/freetext-questions` var ikke testet — ny backendtest med falsk generator som melder `formula_missing`.
    - `[low]` `[patch]` «Øv igjen» når hentingen feiler var ikke testet — ny sidetest med `questionsStatus = 500` etter ferdig økt.
  - Intent Alignment
    - `[low]` `[reject]` Esc virker ikke mens fokus står i «Ditt svar» — den felles regelen (NFR-8, EXPERIENCE.md «aldri mens fokus står i et tekstfelt»); ført som kanttilfelle.
    - `[low]` `[reject]` Tellelinja viser bare tall som ikke er null — følger skisse 12 («1 delvis riktig»); ført som kanttilfelle.
    - `[low]` `[patch]` Akseptkriteriet ber om navn som `test_fr56_freetext_…` — de to backendtestene er omdøpt.
    - `[low]` `[reject]` Utlogging og `pagehide` er ikke testet for fritekst — samme `useSessionSaver` som er testet for begge veiene siden epic 3; siden sender bare et annet `kind`.
    - `[false]` `[reject]` Ingen ny test for at «Øv nå» er skjult når bryteren er av — hele raden er skjult, testet i `lecture-page.test.tsx` fra 8.1.
  - Blind Hunter
    - `[false]` `[reject]` KI-sporet mangler — føres i samme økt etter gjennomgangen, før PR-en.
    - `[low]` `[reject]` `POST /api/practice-sessions` godtar `freetext` med bryteren av — storien krever bryteren på lista og økten, ikke på lagringen; flashcards og quiz har heller ingen bryter der, og spesifikasjonen sier at lagringen ikke endres.
    - `[low]` `[patch]` Testplanen påstår ny rekkefølge uten test — ny sidetest med `Math.random` = 0 viser at rekkefølgen stokkes.
    - `[false]` `[reject]` `formula_flag` sendes aldri som true — samme funn som Verification Gap over, rettet der.
    - `[low]` `[reject]` Spørsmål fra flere jobber blandes etter side — samme rekkefølge som quizspørsmålene har hatt siden 4.2; ingen feil for studenten, siden økten stokker uansett.
    - `[low]` `[patch]` «Levert · N ord» var ikke knyttet til det låste feltet — `aria-describedby` peker nå på teksten.
    - `[low]` `[patch]` `model-answer` hadde ikke tilgjengelig navn — seksjonen peker nå på overskriften «Modellsvar».
    - `[false]` `[reject]` Ulik strekbredde på ikonene — skisse 12 har 1,5 på knappene, 1,75 på ◐ og 2 på ✓/✗ i rutenettet; koden følger skissen.
    - `[low]` `[reject]` `CELL_TEXT.partial` finnes for flashcards uten å brukes — prisen for ett felles `Mark`; en egen type ville gitt mer kode uten feil å rette.
    - `[low]` `[reject]` `partial` er valgfri der den alltid finnes — `?? 0` gir riktig tall; ingen feil oppstår.
    - `[low]` `[patch]` Rutelista i docstringen i `content/router.py` var i feil rekkefølge — flyttet til de andre forelesningsrutene.
    - `[low]` `[reject]` E2E-sjekken «ingenting lagres» kan komme for tidlig — samme mønster som quiz- og flashcardtestene; jsdom-testene dekker også at ingenting sendes.
    - `[low]` `[reject]` Hurtigtastdialogen sier ikke at Esc ikke virker i feltet, og tastene virker ikke i det låste feltet — den felles regelen for tekstfelt; kanttilfellet føres for Silje.
    - `[low]` `[reject]` Ingen `aria-keyshortcuts` på vurderingsknappene — ingen av de andre øktene har det; knappene virker med Tab og Enter.
    - `[false]` `[reject]` Arbeid utenfor diffen er ikke committet — spesifikasjonen committes ved avslutningen; `frontend/e2e-skjermbilder/` er ikke denne storiens og skal ikke røres.
    - `[low]` `[reject]` Ordtellingen har bare to testtilfeller — «skilt med mellomrom» er oppfylt; «-» som ord er et lite kosmetisk avvik.
  - Edge Case Hunter
    - `[low]` `[reject]` Gamle spørsmål i hurtigbufferen og feil ved ny henting starter økten på gamle data — samme mønster som quiz-økten; krever et tidligere besøk og en serverfeil samtidig.
    - `[low]` `[patch]` «Øv igjen» med tom liste fra serveren erstatter resultatsiden med tom tilstand — bruker øktens egne spørsmål når lista er tom.
    - `[low]` `[reject]` «Øv igjen» etter at bryteren er slått av starter en ny økt — bryteren endres bare ved omstart av backend; svært lite sannsynlig midt i en økt.
    - `[low]` `[reject]` `create-row.test.tsx` står i oppgavelista uten å være endret — ingen test brukte `showPractice`, så fjerningen trengte ingen endring der (`tsc` og Vitest er grønne).

## Design Notes

- **Tredje merke:** `Mark` får `"partial"`. Flashcards og quiz bruker det aldri, men postene som slår opp merket, må ha det. `sessionCounts.wrong` blir antall `missed` (ikke «alt som ikke er riktig»), så tallene stemmer for fritekst og er uendret for de andre.
- **Vurdering = svar + videre:** `assess(mark)` kjører `answerCurrent` og `advance` i én oppdatering, slik Silje avgjorde 2026-11-14 (punkt 2).
- **Svaret i komponenten:** teksten ligger i `FreetextQuestion` sin egen tilstand, og komponenten får ny `key` per spørsmål. Siden vet bare om modellsvaret er vist.

## Verification

**Commands:**
- `cd backend && uv run pytest && uv run ruff check . && uv run mypy app` -- expected: alle grønne.
- `cd frontend && npm run test && npm run lint && npx tsc --noEmit` -- expected: alle grønne.
- `cd frontend && npx playwright test` mot `docker compose up --build -d` -- expected: alle grønne.

## Auto Run Result

**Status:** done

**Hva som er bygd:** fritekst-økten på `/forelesninger/<id>/fritekst`, åpnet med «Øv nå» på Fritekstspørsmål-raden. Studenten skriver svaret, trykker «Vis modellsvar», ser modellsvaret med kilde og forelesning, og vurderer seg selv som Feil, Delvis riktig eller Riktig (knapp eller 1/2/3). Rutenettet viser ✗, ◐ eller ✓, og økten går rett videre. Resultatsiden har tre tall og lista «Feil og delvis riktig» uten studentens svar. Økten lagres med `kind: "freetext"` og teller som «øvd». Backend har ruta `GET /api/lectures/{id}/freetext-questions` bak `FEATURE_FREETEXT`.

**Filer:**
- `backend/app/modules/content/schemas.py`, `service.py`, `router.py` -- `FreetextQuestionOut`, `lecture_freetext_questions` og ruta med bryter.
- `backend/tests/test_freetext_practice.py` -- ruta, bryteren, eierskap, formelmerket, lagring med `partial` og «øvd».
- `frontend/modules/practice/types.ts`, `session.ts`, `adapter.ts`, `api.ts` -- merket `partial`, `assessCurrent`, `freetextAdapter`, API-et.
- `frontend/modules/practice/components/answer-grid.tsx`, `result-summary.tsx`, `missed-list.tsx`, `shortcut-hints.tsx`, `model-answer.tsx`, `freetext-question.tsx` -- ◐, resultatet, lista, hintene, modellsvaret og spørsmålet.
- `frontend/modules/practice/pages/freetext-session-page.tsx`, `frontend/app/(app)/forelesninger/[lectureId]/fritekst/page.tsx` -- økten.
- `frontend/components/shortcuts-dialog.tsx`, `create-row.tsx`, `frontend/modules/generation/components/freetext-row.tsx`, `generation-row.tsx` -- gruppa «Fritekst» og «Øv nå».
- Vitest-filene, `frontend/e2e/fritekst-okt.spec.ts`, `frontend/e2e/fritekst.spec.ts`, `docs/testplan.md`.

**Gjennomgang:** 27 funn. 8 rettet (alle lave): tester for formelmerket, «Øv igjen» ved feil og tom liste og stokking; testnavn med `test_fr56_freetext_`; «Levert · N ord» og modellsvaret koblet for skjermleser; rutelista i docstringen. 5 var feilaktige, og 14 lave ble avvist med grunn i loggen over. Ingen utsatt.

**followup_review_recommended:** false. Ingen rettede funn var `high` eller `medium` (8 `low`).

**Verifisering:** `uv run pytest` 916 bestått, `uv run ruff check .` rent, `npm run test` 1021 bestått, `npx tsc --noEmit` rent, `npx playwright test` mot `docker compose up --build -d` (se PR-en). `npm run lint` finnes ikke i `package.json`, og `mypy` er ikke installert i prosjektet (med `uv run --with mypy` gir den de samme 13 feilene som før storien).

**Gjenstående risiko:** Esc virker ikke mens fokus står i svarfeltet (#337). `POST /api/practice-sessions` godtar `freetext` også med bryteren av, som før storien.
