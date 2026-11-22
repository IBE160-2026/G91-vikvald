---
title: 'Story 4.5: Slett et dårlig spørsmål under quizen'
type: 'feature'
created: '2026-11-22'
baseline_revision: 'cb1999935fe835bc7c572fb46a948659059da9af'
status: 'in-progress'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Studenten kan ikke fjerne et dårlig quizspørsmål mens hun tar quizen, så det kommer igjen neste gang (story 4.5 i `epics.md`: FR-37, AR-2, AR-17, UX-DR22, UX-DR29; E22 for quiz).

**Approach:** Ny rute `DELETE /api/quiz-questions/{id}` i `content`, bygd som `DELETE /api/flashcards/{id}` fra story 3.7. Quizøkten får tekstknappen «Slett» i bunnfeltet under spørsmålet (før og etter bekreftelse), med den felles slettebekreftelsen; et slettet spørsmål tas ut av økten med den samme rene funksjonen `removeCard` som flashcards bruker (E22).

## Boundaries & Constraints

**Always:**
- **API (`content`):** `DELETE /api/quiz-questions/{id}` → `204` uten innhold, med `current_user`. Eierskap via fil → forelesning → emne; andres, ukjent og ugyldig id gir lik `404 NOT_FOUND`; uten innlogging `401`. Ny `quiz_questions_router` registreres i `backend/app/main.py`; `test_route_guard.py` skal være grønn uten endring.
- **Jobb pågår:** samme regel som sletting av kort i 3.7 (#191): sletting av ett spørsmål stoppes ikke av en jobb som pågår (spørsmålene hører til fila, ikke jobben). Testet med en `Job(status="running")`-rad.
- **Tellingene:** etter sletting er spørsmålet borte fra `GET /api/lectures/{id}/content-counts`, `…/quiz-questions` og `GET /api/subjects/{id}/quiz-questions`.
- **«Slett» i økten (UX-DR29):** tekstknapp (`Button variant="text"`, rød som i `flashcard.tsx`, `Trash2`-ikon) i bunnfeltet til `QuizQuestion` (raden med hintlinja og «Bekreft svar»/«Neste spørsmål»), synlig både før og etter bekreftelse, rett til venstre for hovedknappen. Ingen «Rediger». Kilden står som før i forklaringskortet etter bekreftelse. Klikk på «Slett» endrer ikke valget eller bekreftelsen.
- **Bekreftelsen:** `DeleteConfirmDialog` med tittel «Slette spørsmålet?», boksen med spørsmålsteksten, ingen telling (bare «Det kan ikke angres.»), fareknappen «Slett spørsmålet», `target="quiz-question"` (ny verdi i `DeleteTarget`). «Avbryt» har startfokus; «Avbryt»/Esc sletter ingenting og gir fokus tilbake til «Slett». `A`–`D` og Enter gjør ingenting mens dialogen er åpen (`usePracticeShortcuts` er av når `[role="dialog"]` finnes).
- **E22 i økten:** `204` eller `404` → `removeCard(state, id)`. Ubekreftet spørsmål: ut av rekkefølgen, ruten og totalen (f.eks. «4 / 15» → «4 / 14»), neste spørsmål vises. Bekreftet spørsmål: svaret står i poengsummen, ruten og lista over feil, og neste spørsmål vises. Tom kø etterpå: noe besvart → økten er ferdig (lagres som ikke avbrutt, resultatsiden); ingenting besvart → tilbake dit økten startet, ingenting lagres. Valget nullstilles; fokus går til neste spørsmåls tittel eller resultatets tittel.
- **Cache:** etter sletting fjernes spørsmålet fra øktens egen spørsmålsliste i cachen (`setQueryData`), og `["lectures", <spørsmålets forelesning>]` og alle emners øvingslister (`isSubjectPracticeQueryKey`) ugyldiggjøres, så forelesningssiden, emnesiden og «Ta quizen igjen» viser riktig tall.
- Testnavn med krav-ID: `test_fr37_slett_quizspormaal`, `test_fr37_…`, `test_sk6_…`/`test_ar2_…`; Vitest/Playwright «FR-37: …», inkludert «FR-37: avbryt sletter ingenting». axe uten brudd på quizsiden med slettebekreftelsen åpen (1280 og 768 px), og sletting med bare tastatur.

**Never:** Ingen redigering av quizspørsmål, ingen ny tabell, migrasjon eller pakke, ingen egen listeside. Ingen endring i brukerreisetestene i `e2e/brukerreiser/`, `CLAUDE.md`, planleggingsdokumentene eller `.claude/settings.json`. Ingen endring i flashcards-økten utover delte typer. Ingen kall til Gemini.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Slett ubekreftet | 3 spørsmål, spm. 1 vist, valgt B, slett | «1 / 2», ruten borte, nytt spørsmål uten valg | — |
| Slett bekreftet riktig | spm. 1 bekreftet riktig, slett | «2 / 3», rute 1 ✓ står, «1 riktige · 0 feil» | — |
| Slett bekreftet feil | spm. 1 bekreftet feil, slett, resten riktig | resultatet teller feilen, lista viser spørsmålet | — |
| Siste spørsmål, noe besvart | to bekreftet, det siste slettes ubekreftet | økten ferdig, lagres `aborted:false`, `answered:2`, resultatside | — |
| Eneste spørsmål | 1 spørsmål, slett ubekreftet | tilbake til forelesningen/emnet, ingenting lagret | — |
| Avbryt / Esc | dialogen åpen | spørsmålet står i økten og i API-et; fokus på «Slett» | — |
| Allerede borte | DELETE gir 404 | regnes som slettet (felles dialog) | — |
| Andres spørsmål | DELETE andres, ukjent, ugyldig id | `404 NOT_FOUND`, ingenting slettet | — |
| Jobb pågår | jobb `running` på forelesningen | `204`, spørsmålet slettet | — |
| Annen feil | 500 | dialogen viser reserveteksten, spørsmålet står | — |

</intent-contract>

## Code Map

- `backend/app/modules/content/service.py:291-357` -- `get_flashcard`/`delete_flashcard`: mønster for `get_quiz_question` (join `File`, `Lecture`, `Subject`; ugyldig uuid → 404) og `delete_quiz_question`.
- `backend/app/modules/content/router.py` -- `flashcards_router`; ny `quiz_questions_router = APIRouter(prefix="/api/quiz-questions")`.
- `backend/app/main.py:79` -- `include_router(flashcards_router)`; legg til den nye.
- `backend/tests/test_edit_flashcards.py:125-170` -- mønster for 204, 404 andres/ukjent/ugyldig, jobb som pågår, 401.
- `backend/tests/test_quiz.py` (`_start_quiz`, `lecture`), `test_quiz_questions.py` (`_quiz_questions`), `test_jobs.py` (`_finish_jobs`, `no_jobs_left`), `test_files.py` (`_log_in_new_user`), `test_subjects.py` (`NOT_FOUND`).
- `frontend/modules/practice/api.ts:93` -- `deleteFlashcard`; ny `deleteQuizQuestion`.
- `frontend/lib/delete-text.ts` -- `DeleteTarget` får `"quiz-question"`.
- `frontend/modules/practice/session.ts:73` -- `removeCard` gjenbrukes uendret (dekker E22 for quiz).
- `frontend/modules/practice/components/quiz-question.tsx` -- bunnfeltet; ny valgfri `onDelete`, «Slett»-knapp; `data-question-title` på h2 for fokus etter sletting.
- `frontend/modules/practice/components/flashcard.tsx:123-135` -- stil på «Slett» (`variant="text"`, `text-danger hover:bg-danger-tint`, `Trash2`).
- `frontend/modules/practice/pages/quiz-session-page.tsx` -- ny tilstand `deleting`/`deleteTarget`, `questionDeleted`, `DeleteConfirmDialog`; mønster i `flashcard-session-page.tsx:283-330,430-450`.
- `frontend/components/delete-confirm-dialog.tsx` -- felles dialog (404 = slettet, `focusAfterDelete`).
- `frontend/lib/practice-shortcuts.ts:85` -- tastene er av mens `[role="dialog"]` finnes.
- `frontend/e2e/quiz-okt.spec.ts`, `frontend/e2e/rett-og-slett-kort.spec.ts` -- hjelpere og mønster for ny `frontend/e2e/slett-quizsporsmal.spec.ts`.

## Tasks & Acceptance

**Execution:**
- `backend/app/modules/content/service.py`, `router.py`, `backend/app/main.py` -- `get_quiz_question`, `delete_quiz_question`, ruten -- FR-37, AR-2.
- `backend/tests/test_delete_quiz_questions.py` (ny) -- 204 og borte fra DB, lista og tellingene (forelesning og emne); 404 ved ny sletting; andres/ukjent/ugyldig → 404 og ingenting slettet; 401; jobb som pågår → 204.
- `frontend/lib/delete-text.ts` -- `"quiz-question"`.
- `frontend/modules/practice/api.ts` -- `deleteQuizQuestion`.
- `frontend/modules/practice/components/quiz-question.tsx` + test -- «Slett» før og etter bekreftelse, ingen «Rediger», klikk kaller bare `onDelete`.
- `frontend/modules/practice/session.test.ts` -- quiz-tilfellene av `removeCard` (bekreftet uten å gå videre, ubekreftet).
- `frontend/modules/practice/pages/quiz-session-page.tsx` + test -- dialogen, E22 (alle radene i matrisen), cache, tastene av i dialogen, fokus.
- `frontend/e2e/slett-quizsporsmal.spec.ts` (ny) -- slett ubekreftet og bekreftet, Avbryt og Esc, bare tastatur, axe med dialogen åpen 1280/768, tellingen på forelesningssiden går ned.

**Acceptance Criteria:**
- Given et spørsmål i quizøkten, when det vises før og etter bekreftelse, then står «Slett» i bunnfeltet, og det finnes ingen «Rediger».
- Given slettebekreftelsen, when hun trykker «Avbryt» eller Esc, then er spørsmålet fortsatt i økten og API-et, og fokus er på «Slett».
- Given at hun bekrefter, when økten fortsetter, then er spørsmålet borte fra økten etter E22, og forelesningssiden viser ett spørsmål færre.

## Spec Change Log

## Review Triage Log

## Design Notes

- **Plassering av «Slett»:** skisse 09 tegner ikke knappen, og kilden står bare i forklaringskortet etter bekreftelse. Storien krever «Slett» også før bekreftelse, så knappen står fast i bunnfeltet under spørsmålet (raden med hintlinja og hovedknappen), samme sted før og etter, i stedet for å flytte seg inn i forklaringskortet. Kanttilfelle.
- **`removeCard` gjenbrukes:** quizen bruker `firstMarks` for bekreftede svar, så regelen for markerte kort (bli i rekkefølgen, ut av køen) gir akkurat E22 for bekreftede spørsmål, og regelen for umarkerte gir E22 for ubekreftede. Ingen ny øktfunksjon trengs.
- **Tekster:** «Slette spørsmålet?» og «Slett spørsmålet» er laget etter mønsteret «Slette kortet?»/«Slett kortet» fra 3.7. Kanttilfelle.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alt grønt
- `cd frontend && npm run test && npx tsc --noEmit && npm run lint` -- expected: alt grønt
- `cd frontend && npx playwright test` mot `docker compose up --build` -- expected: alt grønt
