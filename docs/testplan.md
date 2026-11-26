# Testplan for Studiekamerat

Denne planen viser hvordan kravene i [PRD-en](../_bmad-output/planning-artifacts/prds/prd-G91-vikvald-2026-11-09/prd.md) kontrolleres: hvilke automatiske tester som dekker hvert må ha-krav, hvor suksesskriteriene SK-2–SK-22 kontrolleres, og hva som bare kan kontrolleres for hånd. Hvordan testene kjøres, står i [README](../README.md#testene).

## Slik leses planen

- **Automatiske tester** er testfilene som har krav-ID-en i et testnavn. I backenden er det pytest-tester som `test_fr17_…` (alle `fr<n>`-ledd i navnet teller). I frontenden er det Vitest- og Playwright-tester med `FR-17` i tittelen til `it`, `test` eller `describe`, også tabelltester (`it.each`).
- **Manuell kontroll** er `–` når de automatiske testene er nok, ellers en begrunnelse for hvorfor kravet også, eller bare, må kontrolleres for hånd.
- **SK-1 håndheves av en test.** `test_sk1_every_must_requirement_has_test_or_reason` i [`backend/tests/test_testplan.py`](../backend/tests/test_testplan.py) leser testnavnene i backenden, Vitest og Playwright og feiler med en liste over kravene som verken har en test eller en begrunnelse her. Andre tester i samme fil sjekker at hvert må ha-krav har nøyaktig én rad, at filene i tabellen finnes og er nøyaktig de filene som har krav-ID-en i et testnavn, og at SK-2–SK-22 står i planen. Endres et testnavn, må tabellen oppdateres.
- **Testen måler navn, ikke innhold.** At et krav har en test med ID-en i navnet, viser ikke at testen dekker hele kravet. Det har gjennomgangen av hver story sjekket, ikke denne testen.
- **Brukerreisene** (de fire flytene i EXPERIENCE.md) er testet fra start til slutt med Playwright. Oversikten per steg står i [`docs/testing/brukerreiser.md`](testing/brukerreiser.md).
- **Bør ha-kravene** (FR-42–FR-55) er ikke med i SK-1. De får sine tester når epic 7–9 bygges, og står i avsnittet [Bør ha-kravene](#bør-ha-kravene) under.

## Må ha-kravene (SK-1)

| Krav | Hva | Automatiske tester | Manuell kontroll |
| --- | --- | --- | --- |
| FR-1 | Grensesnittet er på norsk bokmål | `backend/tests/test_errors.py`, `frontend/lib/messages.test.ts`, `frontend/modules/identity/login-page.test.tsx`, `frontend/modules/identity/register-page.test.tsx`, `frontend/modules/identity/require-login.test.tsx`, `frontend/modules/subjects/home-page.test.tsx`, `frontend/modules/subjects/subject-page.test.tsx` | – |
| FR-2 | Generert innhold er på norsk bokmål, med fagbegrepene fra notatene | `backend/tests/test_instructions.py`, `backend/tests/test_summary.py` | Språket og fagbegrepene i innhold fra Gemini kan bare vurderes av et menneske mot notatene. Testene sjekker instruksene til modellen og demomodellen, ikke hva Gemini faktisk skriver. Kontrolleres i stikkprøven i SK-13 og SK-15 (story 6.6). |
| FR-3 | Opprette konto, logge inn og logge ut | `backend/tests/test_identity.py`, `backend/tests/test_login.py`, `backend/tests/test_logout.py`, `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/brukerreiser/flyt-4-avslutter-etter-semesteret.spec.ts`, `frontend/e2e/innlogget.spec.ts`, `frontend/e2e/logg-inn.spec.ts`, `frontend/e2e/opprett-konto.spec.ts`, `frontend/lib/messages.test.ts`, `frontend/modules/identity/login-page.test.tsx`, `frontend/modules/identity/register-page.test.tsx`, `frontend/modules/identity/require-login.test.tsx`, `frontend/modules/identity/use-logout.test.tsx`, `frontend/modules/identity/validation.test.ts` | – |
| FR-4 | Studenten ser og endrer bare sitt eget innhold | `backend/tests/test_account_delete.py`, `backend/tests/test_delete.py`, `backend/tests/test_files.py`, `backend/tests/test_flashcards.py`, `backend/tests/test_freetext_practice.py`, `backend/tests/test_freetext_subject_and_delete.py`, `backend/tests/test_jobs.py`, `backend/tests/test_lectures.py`, `backend/tests/test_ownership.py`, `backend/tests/test_quiz.py`, `backend/tests/test_quiz_questions.py`, `backend/tests/test_replace.py`, `backend/tests/test_subject_flashcards.py`, `backend/tests/test_subject_quiz_questions.py`, `backend/tests/test_subjects.py`, `frontend/components/delete-confirm-dialog.test.tsx`, `frontend/e2e/emner.spec.ts`, `frontend/e2e/filer.spec.ts`, `frontend/e2e/flashcard-okt.spec.ts`, `frontend/e2e/forelesninger.spec.ts`, `frontend/e2e/hele-emnet.spec.ts`, `frontend/e2e/quiz-hele-emnet.spec.ts`, `frontend/lib/api-helpers.test.ts`, `frontend/modules/practice/pages/flashcard-session-page.test.tsx`, `frontend/modules/practice/pages/freetext-session-page.test.tsx`, `frontend/modules/practice/pages/quiz-session-page.test.tsx`, `frontend/modules/subjects/lecture-page.test.tsx`, `frontend/modules/subjects/subject-page.test.tsx` | – |
| FR-5 | Slette kontoen med bekreftelse | `backend/tests/test_account_delete.py`, `backend/tests/test_delete_flashcards_counts.py`, `backend/tests/test_summary.py`, `frontend/e2e/brukerreiser/flyt-4-avslutter-etter-semesteret.spec.ts`, `frontend/e2e/konto.spec.ts`, `frontend/lib/delete-text.test.ts`, `frontend/modules/identity/account-page.test.tsx` | – |
| FR-6 | Opprette, gi nytt navn til og slette emner med eksamensdato | `backend/tests/test_delete.py`, `backend/tests/test_subjects.py`, `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts`, `frontend/e2e/emner.spec.ts`, `frontend/e2e/slett.spec.ts`, `frontend/lib/use-document-title.test.tsx`, `frontend/modules/subjects/format.test.ts`, `frontend/modules/subjects/home-page.test.tsx`, `frontend/modules/subjects/subject-page.test.tsx`, `frontend/modules/subjects/validation.test.ts` | – |
| FR-7 | Opprette, gi nytt navn til og slette forelesninger | `backend/tests/test_delete.py`, `backend/tests/test_lectures.py`, `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts`, `frontend/e2e/forelesninger.spec.ts`, `frontend/e2e/slett.spec.ts`, `frontend/lib/messages.test.ts`, `frontend/modules/subjects/format.test.ts`, `frontend/modules/subjects/lecture-page.test.tsx`, `frontend/modules/subjects/subject-page.test.tsx` | – |
| FR-8 | Laste opp én eller flere PDF-er | `backend/tests/test_files.py`, `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/brukerreiser/flyt-3-rydder-i-filene.spec.ts`, `frontend/e2e/filer.spec.ts`, `frontend/modules/subjects/lecture-page.test.tsx` | – |
| FR-9 | Word og andre filtyper avvises med beskjed | `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/filer.spec.ts`, `frontend/lib/messages.test.ts`, `frontend/modules/subjects/lecture-page.test.tsx` | – |
| FR-10 | PDF uten lesbar tekst gir beskjed | `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/lib/messages.test.ts` | – |
| FR-11 | Godta vilkårene før første opplasting | `backend/tests/test_migrations.py`, `backend/tests/test_terms.py`, `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/brukerreiser/flyt-4-avslutter-etter-semesteret.spec.ts`, `frontend/e2e/vilkar.spec.ts`, `frontend/lib/messages.test.ts`, `frontend/modules/subjects/lecture-page.test.tsx` | – |
| FR-12 | Slette en fil med bekreftelse som viser hva som slettes | `backend/tests/test_delete.py`, `backend/tests/test_delete_flashcards_counts.py`, `backend/tests/test_freetext.py`, `backend/tests/test_models.py`, `backend/tests/test_quiz.py`, `frontend/components/delete-confirm-dialog.test.tsx`, `frontend/e2e/brukerreiser/flyt-3-rydder-i-filene.spec.ts`, `frontend/e2e/fritekst.spec.ts`, `frontend/e2e/modellkort.spec.ts`, `frontend/e2e/rett-og-slett-kort.spec.ts`, `frontend/e2e/sammendrag.spec.ts`, `frontend/lib/delete-text.test.ts` | – |
| FR-13 | Erstatte en fil med en ny | `backend/tests/test_replace.py`, `frontend/components/delete-confirm-dialog.test.tsx`, `frontend/e2e/brukerreiser/flyt-3-rydder-i-filene.spec.ts`, `frontend/e2e/erstatt.spec.ts`, `frontend/modules/subjects/lecture-page.test.tsx` | – |
| FR-14 | Slette forelesning eller emne med alt som hører til | `backend/tests/test_delete.py`, `backend/tests/test_summary.py`, `frontend/components/delete-confirm-dialog.test.tsx`, `frontend/e2e/slett.spec.ts`, `frontend/lib/delete-text.test.ts`, `frontend/modules/subjects/lecture-page.test.tsx` | – |
| FR-15 | Forelesning har navn og dato, sortert etter dato | `backend/tests/test_lectures.py`, `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts`, `frontend/e2e/forelesninger.spec.ts`, `frontend/modules/subjects/lecture-page.test.tsx`, `frontend/modules/subjects/subject-page.test.tsx` | – |
| FR-16 | Tellinger og sist øvd per forelesning | `backend/tests/test_files.py`, `frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts`, `frontend/e2e/brukerreiser/flyt-3-rydder-i-filene.spec.ts`, `frontend/e2e/forelesningstabell.spec.ts`, `frontend/modules/subjects/subject-page.test.tsx` | – |
| FR-17 | Lage flashcards med valgt omfang (10, 20 eller 30) | `backend/tests/test_jobs.py`, `backend/tests/test_quiz.py`, `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/flashcards.spec.ts`, `frontend/modules/generation/components/scope-dialog.test.tsx`, `frontend/modules/subjects/lecture-page.test.tsx` | – |
| FR-18 | Kort bare fra stoffet, og beskjed når det blir færre | `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/flashcards.spec.ts`, `frontend/modules/generation/texts.test.ts`, `frontend/modules/subjects/lecture-page.test.tsx` | – |
| FR-19 | To typer kort: spørsmål med svar og begrepskort | `backend/tests/test_flashcards.py` | – |
| FR-20 | Hvert kort viser kilden (fil og side) | `backend/tests/test_flashcards.py`, `frontend/components/source-link.test.tsx`, `frontend/modules/practice/components/flashcard.test.tsx`, `frontend/modules/practice/pages/flashcard-session-page.test.tsx` | – |
| FR-21 | Venting, feil og «Prøv igjen» uten at noe lagres | `backend/tests/test_freetext.py`, `backend/tests/test_jobs.py`, `backend/tests/test_models.py`, `backend/tests/test_quiz.py`, `backend/tests/test_summary.py`, `backend/tests/test_vertex.py`, `frontend/components/create-row.test.tsx`, `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/flashcards.spec.ts`, `frontend/lib/messages.test.ts`, `frontend/modules/generation/components/job-watcher.test.tsx`, `frontend/modules/generation/texts.test.ts`, `frontend/modules/subjects/lecture-page.test.tsx` | – |
| FR-22 | Nye kort legges til de gamle | `backend/tests/test_freetext.py`, `backend/tests/test_jobs.py`, `backend/tests/test_models.py`, `frontend/modules/subjects/lecture-page.test.tsx` | – |
| FR-23 | Øve på kort fra én forelesning eller hele emnet, i tilfeldig rekkefølge | `backend/tests/test_content_order.py`, `backend/tests/test_subject_flashcards.py`, `frontend/components/create-row.test.tsx`, `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts`, `frontend/e2e/flashcard-okt.spec.ts`, `frontend/e2e/hele-emnet.spec.ts`, `frontend/e2e/modellkort.spec.ts`, `frontend/modules/generation/components/job-watcher.test.tsx`, `frontend/modules/practice/components/practice-all-card.test.tsx`, `frontend/modules/practice/components/shortcut-hints.test.tsx`, `frontend/modules/practice/pages/flashcard-session-page.test.tsx`, `frontend/modules/practice/session.test.ts`, `frontend/modules/subjects/lecture-page.test.tsx`, `frontend/modules/subjects/subject-page.test.tsx` | – |
| FR-24 | Forsiden først, baksiden når kortet snus | `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts`, `frontend/e2e/flashcard-okt.spec.ts`, `frontend/modules/practice/components/flashcard.test.tsx`, `frontend/modules/practice/pages/flashcard-session-page.test.tsx` | – |
| FR-25 | «Kunne» og «Kunne ikke», og «Kunne ikke» kommer igjen | `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts`, `frontend/e2e/flashcard-okt.spec.ts`, `frontend/modules/practice/components/session-panel.test.tsx`, `frontend/modules/practice/pages/flashcard-session-page.test.tsx`, `frontend/modules/practice/session.test.ts` | – |
| FR-26 | Resultatet når økten er ferdig | `backend/tests/test_practice_sessions.py`, `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/lagre-okt.spec.ts`, `frontend/modules/practice/components/missed-list.test.tsx`, `frontend/modules/practice/components/result-summary.test.tsx`, `frontend/modules/practice/pages/flashcard-session-page.test.tsx` | – |
| FR-27 | Redigere og slette kort under øving | `backend/tests/test_edit_flashcards.py`, `frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts`, `frontend/e2e/rett-og-slett-kort.spec.ts`, `frontend/modules/practice/components/edit-flashcard-dialog.test.tsx`, `frontend/modules/practice/components/flashcard.test.tsx`, `frontend/modules/practice/pages/flashcard-session-page.test.tsx`, `frontend/modules/practice/session.test.ts` | – |
| FR-28 | Lage quiz med omfang og vanskelighetsgrad | `backend/tests/test_instructions.py`, `backend/tests/test_quiz.py`, `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/quiz.spec.ts`, `frontend/modules/subjects/lecture-page.test.tsx` | – |
| FR-29 | Spørsmål bare fra stoffet, med samme venting og feil som FR-21 | `backend/tests/test_quiz.py`, `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/quiz.spec.ts`, `frontend/modules/generation/components/scope-dialog.test.tsx`, `frontend/modules/subjects/lecture-page.test.tsx` | – |
| FR-30 | Fire alternativer, nøyaktig ett riktig, riktig svar på ulike plasser | `backend/tests/test_quiz.py`, `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/quiz.spec.ts`, `frontend/modules/generation/texts.test.ts`, `frontend/modules/subjects/lecture-page.test.tsx` | – |
| FR-31 | Alternativene er omtrent like lange og troverdige | `backend/tests/test_instructions.py`, `backend/tests/test_quiz.py`, `backend/tests/test_vertex.py` | Om alternativene fra Gemini er like lange og troverdige, kan bare måles på ekte svar. Testene sjekker instruksene og kontrollen av fire alternativer. Måles i SK-15 (story 6.6). |
| FR-32 | Hvert spørsmål viser kilden | `backend/tests/test_quiz_questions.py`, `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts`, `frontend/e2e/quiz-okt.spec.ts`, `frontend/modules/practice/components/quiz-question.test.tsx`, `frontend/modules/practice/pages/quiz-session-page.test.tsx`, `frontend/modules/subjects/lecture-page.test.tsx` | – |
| FR-33 | Nye spørsmål legges til de gamle | `backend/tests/test_quiz.py` | – |
| FR-34 | Quiz på én forelesning eller hele emnet, i tilfeldig rekkefølge | `backend/tests/test_content_order.py`, `backend/tests/test_subject_quiz_questions.py`, `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts`, `frontend/e2e/quiz-hele-emnet.spec.ts`, `frontend/e2e/quiz-okt.spec.ts`, `frontend/modules/generation/components/job-watcher.test.tsx`, `frontend/modules/practice/components/missed-list.test.tsx`, `frontend/modules/practice/pages/quiz-session-page.test.tsx`, `frontend/modules/practice/session.test.ts`, `frontend/modules/subjects/subject-page.test.tsx` | – |
| FR-35 | Riktig svar og forklaring vises først etter at svaret er bekreftet | `frontend/components/shortcuts-dialog.test.tsx`, `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/quiz-okt.spec.ts`, `frontend/modules/practice/components/explanation-card.test.tsx`, `frontend/modules/practice/components/quiz-option.test.tsx`, `frontend/modules/practice/components/quiz-question.test.tsx`, `frontend/modules/practice/pages/quiz-session-page.test.tsx`, `frontend/modules/practice/session.test.ts` | – |
| FR-36 | Poengsum og liste over feilsvar | `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts`, `frontend/e2e/quiz-resultat.spec.ts`, `frontend/modules/practice/components/missed-list.test.tsx`, `frontend/modules/practice/components/result-summary.test.tsx`, `frontend/modules/practice/components/shortcut-hints.test.tsx`, `frontend/modules/practice/pages/quiz-session-page.test.tsx` | – |
| FR-37 | Slette spørsmål under quizen | `backend/tests/test_delete_quiz_questions.py`, `frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts`, `frontend/e2e/slett-quizsporsmal.spec.ts`, `frontend/modules/practice/components/quiz-question.test.tsx`, `frontend/modules/practice/pages/quiz-session-page.test.tsx`, `frontend/modules/practice/session.test.ts` | – |
| FR-38 | Alt fra språkmodellen kontrolleres før det lagres | `backend/tests/test_jobs.py` | – |
| FR-39 | Sidetall er sidenummeret i PDF-fila | `backend/tests/test_files.py`, `backend/tests/test_summary.py` | – |
| FR-40 | Sider med formler sendes også som bilde | `backend/tests/test_formula.py`, `frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts`, `frontend/e2e/formelmerke.spec.ts` | Testene sjekker regelen på kjente sider. Om formlene kommer riktig fram med Gemini, kontrolleres i SK-16 (story 6.6). |
| FR-41 | Innhold fra slike sider merkes «Inneholder formel – sjekk mot kilden» | `backend/tests/test_formula.py`, `backend/tests/test_freetext_practice.py`, `frontend/components/formula-flag.test.tsx`, `frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts`, `frontend/e2e/formelmerke.spec.ts`, `frontend/modules/practice/components/explanation-card.test.tsx`, `frontend/modules/practice/components/flashcard.test.tsx`, `frontend/modules/practice/components/missed-list.test.tsx`, `frontend/modules/practice/pages/freetext-session-page.test.tsx` | Testene sjekker merket. Om formlene er riktige, kontrolleres i SK-16 (story 6.6). |
| FR-56 | Økten lagres når minst ett kort er markert eller ett spørsmål besvart | `backend/tests/test_flashcards.py`, `backend/tests/test_freetext_practice.py`, `backend/tests/test_freetext_subject_and_delete.py`, `backend/tests/test_model_card_practice.py`, `backend/tests/test_models.py`, `backend/tests/test_overview.py`, `backend/tests/test_practice_sessions.py`, `backend/tests/test_subject_flashcards.py`, `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts`, `frontend/e2e/fritekst-hele-emnet.spec.ts`, `frontend/e2e/fritekst-okt.spec.ts`, `frontend/e2e/hele-emnet.spec.ts`, `frontend/e2e/lagre-okt.spec.ts`, `frontend/e2e/modellkort.spec.ts`, `frontend/e2e/ovd.spec.ts`, `frontend/e2e/quiz-hele-emnet.spec.ts`, `frontend/e2e/quiz-okt.spec.ts`, `frontend/lib/before-logout.test.ts`, `frontend/modules/identity/use-logout.test.tsx`, `frontend/modules/practice/components/result-summary.test.tsx`, `frontend/modules/practice/pages/flashcard-session-page.test.tsx`, `frontend/modules/practice/pages/freetext-session-page.test.tsx`, `frontend/modules/practice/pages/quiz-session-page.test.tsx`, `frontend/modules/practice/save.test.ts`, `frontend/modules/practice/session.test.ts`, `frontend/modules/practice/use-session-saver.test.tsx`, `frontend/modules/subjects/lecture-page.test.tsx`, `frontend/modules/subjects/next-step.test.ts`, `frontend/modules/subjects/subject-page.test.tsx` | – |
| FR-57 | Semesterlinja med øvd, ikke øvd og uker til eksamen | `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts`, `frontend/e2e/semesterlinje.spec.ts`, `frontend/lib/exam.test.ts`, `frontend/modules/subjects/home-page.test.tsx`, `frontend/modules/subjects/lecture-page.test.tsx`, `frontend/modules/subjects/semester-timeline.test.tsx`, `frontend/modules/subjects/subject-page.test.tsx`, `frontend/modules/subjects/timeline.test.ts` | – |
| FR-58 | «Neste å øve på» på forsiden | `frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`, `frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts`, `frontend/e2e/emnekort.spec.ts`, `frontend/modules/subjects/home-page.test.tsx`, `frontend/modules/subjects/next-step.test.ts` | – |

## Bør ha-kravene

Disse kravene er ikke med i SK-1, så de står som en liste og ikke i tabellen over (testen i `test_testplan.py` sjekker bare må ha-kravene). Alt bak bryterne `FEATURE_*` testes med bryteren på, og bryteren av har egne tester.

**Epic 7, huskeregler (`FEATURE_MNEMONICS`).** Story 7.1 og 7.2 er bygd.

- **FR-42** Modellkort fra modeller og lister, «Lag modellkort», visningen i økten og retting av punktene: `backend/tests/test_instructions.py`, `backend/tests/test_model_card_practice.py`, `backend/tests/test_models.py`, `backend/tests/test_seed.py`, `frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts`, `frontend/e2e/brukerreiser/flyt-3-rydder-i-filene.spec.ts`, `frontend/e2e/modellkort.spec.ts`, `frontend/modules/generation/texts.test.ts`, `frontend/modules/practice/components/edit-flashcard-dialog.test.tsx`, `frontend/modules/practice/components/flashcard.test.tsx`, `frontend/modules/practice/components/model-card-back.test.tsx`, `frontend/modules/practice/pages/flashcard-session-page.test.tsx`, `frontend/modules/subjects/lecture-page.test.tsx`. Hvor godt Gemini finner modellene, kan bare vurderes for hånd mot notatene.
- **FR-43** Huskeregelen er forbokstavene i rekkefølge: `backend/tests/test_instructions.py`, `backend/tests/test_models.py`, `frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts`.
- **FR-44** Ingen huskeregel når alle punktene har samme forbokstav: `backend/tests/test_instructions.py`, `backend/tests/test_models.py`.
- **FR-45** Modellkort med feil huskeregel eller for få punkter forkastes: `backend/tests/test_models.py`.
- **FR-46** Endre eller legge til huskeregel: `backend/tests/test_model_card_practice.py`, `frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts`, `frontend/e2e/modellkort.spec.ts`, `frontend/modules/practice/components/flashcard.test.tsx`, `frontend/modules/practice/components/mnemonic-dialog.test.tsx`, `frontend/modules/practice/pages/flashcard-session-page.test.tsx`. Studentens egen huskeregel sjekkes bare for tomt felt, aldri mot forbokstavene (AR-4).
- **FR-47** «Vi fant ingen modeller eller lister i denne forelesningen.»: `backend/tests/test_models.py`, `frontend/e2e/modellkort.spec.ts`, `frontend/modules/generation/texts.test.ts`, `frontend/modules/subjects/lecture-page.test.tsx`.

**Epic 8, fritekstspørsmål (`FEATURE_FREETEXT`).** Story 8.1, 8.2 og 8.3 er bygd: raden «Fritekstspørsmål», dialogen «Lag fritekstspørsmål», fritekst-økten for én forelesning og for hele emnet med selvvurdering, og sletting av dårlige spørsmål.

- **FR-48** Fritekstspørsmål av to typer, kortsvar og langsvar, med omfanget 5, 10 eller 15: «Lag fritekstspørsmål», typen og omfanget i dialogen (sendt som `question_kind` og `requested`, og typen lagres slik studenten valgte), jobben, tellingene, slettebekreftelsen og seed: `backend/tests/test_freetext.py`, `backend/tests/test_seed.py`, `frontend/e2e/fritekst.spec.ts`, `frontend/lib/delete-text.test.ts`, `frontend/modules/generation/components/scope-dialog.test.tsx`, `frontend/modules/generation/texts.test.ts`, `frontend/modules/subjects/lecture-page.test.tsx`. Hvor gode spørsmålene fra Gemini er, kan bare vurderes for hånd mot notatene.
- **FR-49** Hvert spørsmål har et modellsvar og en kilde: hvert spørsmål lagres med modellsvar og kildeside, `validate_item` forkaster et tomt modellsvar eller en side som ikke finnes, `GET /api/lectures/{id}/freetext-questions` sender modellsvaret med kilden (`file_id`, `file_name`, `page_no`), og økten viser modellsvaret med filnavn og side: `backend/tests/test_freetext.py`, `backend/tests/test_freetext_practice.py`, `frontend/modules/practice/pages/freetext-session-page.test.tsx`.
- **FR-50** Fritekst-økten for en forelesning: «Øv nå» på raden åpner `/forelesninger/<id>/fritekst`, spørsmålene stokkes og vises én gang hver, ruta svarer `404 FEATURE_DISABLED` med bryteren av og `404 NOT_FOUND` for andres forelesning, «Øv igjen» starter på nytt i ny rekkefølge: `backend/tests/test_freetext_practice.py`, `frontend/e2e/fritekst-okt.spec.ts`, `frontend/e2e/fritekst.spec.ts`, `frontend/modules/practice/pages/freetext-session-page.test.tsx`, `frontend/modules/practice/session.test.ts`, `frontend/modules/subjects/lecture-page.test.tsx`. Fritekst for hele emnet (story 8.3): emnesiden har raden «Fritekstspørsmål» med «N spørsmål fra M forelesninger» og «Start ›» bare når bryteren er på og emnet har spørsmål (ingen henting med bryteren av), `GET /api/subjects/{id}/freetext-questions` gir spørsmålene fra alle forelesningene sortert etter forelesningens dato, fil og side, med `404 FEATURE_DISABLED` før oppslag og `404 NOT_FOUND` for andres emne, og `/emner/<id>/fritekst` viser «<emne>, hele emnet», forelesningen ved modellsvaret og i lista, og går tilbake til emnesiden: `backend/tests/test_freetext_subject_and_delete.py`, `frontend/e2e/fritekst-hele-emnet.spec.ts`, `frontend/modules/practice/api.test.ts`, `frontend/modules/practice/components/missed-list.test.tsx`, `frontend/modules/practice/pages/freetext-session-page.test.tsx`, `frontend/modules/subjects/subject-page.test.tsx`.
- **FR-51** Skriv svaret, se modellsvaret og vurder deg selv: «Vis modellsvar» er ikke aktiv uten tekst (E28), feltet låses med «Levert · N ord», fokus går til «Modellsvar», selvvurderingen Feil/Delvis riktig/Riktig (også `1`/`2`/`3`, bare når den vises, E27) gir ✗/◐/✓ i rutenettet og går rett videre, og resultatsiden viser tre tall og spørsmålene vurdert som Feil eller Delvis riktig uten studentens svar: `backend/tests/test_freetext_practice.py`, `frontend/components/shortcuts-dialog.test.tsx`, `frontend/e2e/fritekst-okt.spec.ts`, `frontend/modules/practice/components/answer-grid.test.tsx`, `frontend/modules/practice/components/missed-list.test.tsx`, `frontend/modules/practice/components/result-summary.test.tsx`, `frontend/modules/practice/components/shortcut-hints.test.tsx`, `frontend/modules/practice/pages/freetext-session-page.test.tsx`, `frontend/modules/practice/session.test.ts`. Studentens svar sendes aldri; testene sjekker kroppen til `POST /api/practice-sessions`.
- **FR-52** Slette et dårlig fritekstspørsmål: `DELETE /api/freetext-questions/{id}` svarer `204` og tar spørsmålet ut av forelesningens og emnets liste og av tellingene, gir lik `404 NOT_FOUND` for andres, ukjent og ugyldig id, `404 FEATURE_DISABLED` med bryteren av og virker mens en jobb går; i økten står «Slett» før modellsvaret og i modellsvarets bunnfelt, slettebekreftelsen har «Avbryt» som startfokus, «Avbryt» og Esc sletter ingenting, og et slettet spørsmål tas ut av økten uten å telles som vurdert (siste spørsmål etter en vurdering gir resultatsiden, eneste spørsmål går tilbake uten lagring, og `404` behandles som slettet): `backend/tests/test_freetext_subject_and_delete.py`, `frontend/e2e/fritekst-hele-emnet.spec.ts`, `frontend/modules/practice/pages/freetext-session-page.test.tsx`.

**Epic 9, sammendrag (`FEATURE_SUMMARY`).** Story 9.1 er bygd: raden «Sammendrag» med «Lag sammendrag», jobben som erstatter det gamle sammendraget, og sletting av sammendraget når en fil slettes eller erstattes. Sammendragssiden kommer i story 9.2.

- **FR-53** Sammendrag med 5 til 15 hovedpunkter ordnet etter tema: «Lag sammendrag» starter jobben uten dialog, demomodellen lager ett punkt per side, punkter med tomt tema eller tom tekst, over 50 ord eller en side som ikke finnes, forkastes og telles, over 15 gyldige gir de 15 første, under 5 gir `TOO_FEW_SUMMARY_POINTS` uten at noe lagres, raden viser «N punkter», og seed lager et sammendrag for «AIDA-modellen»: `backend/tests/test_seed.py`, `backend/tests/test_summary.py`, `frontend/e2e/sammendrag.spec.ts`, `frontend/lib/delete-text.test.ts`, `frontend/modules/generation/texts.test.ts`, `frontend/modules/subjects/lecture-page.test.tsx`. Hvor gode sammendragene fra Gemini er, kan bare vurderes for hånd mot notatene.
- **FR-54** Hvert punkt har fil og side som kilde: punktene lagres med `file_id` og `page_no`, og instruksen ber om kilden fra sidemerket: `backend/tests/test_summary.py`, `frontend/e2e/sammendrag.spec.ts`. Visningen av kilden kommer i story 9.2.
- **FR-55** Et nytt sammendrag erstatter det gamle i én transaksjon, og det gamle står når en ny jobb feiler: `backend/tests/test_summary.py`.

## Suksesskriteriene SK-2–SK-22

Resultatkolonnen fylles ut i story 6.6 (den avsluttende kontrollen) og når rapporten skrives. SK-11 er kjørt i story 6.5, se avsnittet under tabellen.

| Kriterium | Hva | Hvor det kontrolleres | Resultat |
| --- | --- | --- | --- |
| SK-2 | Studenten ser og endrer bare sitt eget innhold (FR-4) | Automatisk: testene for FR-4, særlig `backend/tests/test_ownership.py` | |
| SK-3 | Alle sidetall i kildene finnes i fila (FR-20, FR-32, FR-39) | Automatisk: testene for FR-20, FR-32 og FR-39, og for FR-38, som forkaster innhold med sidetall som ikke finnes i fila | |
| SK-4 | Ugyldig innhold forkastes, og studenten får beskjed om færre (FR-38, FR-18) | Automatisk: `test_sk4_…` i `backend/tests/test_jobs.py`, `backend/tests/test_quiz.py` og `backend/tests/test_generation.py`, med `mock-invalid` | |
| SK-5 | Forklaringen i quizen vises først etter bekreftet svar (FR-35) | Automatisk: testene for FR-35 | |
| SK-6 | Redigere og slette kort, og bekreftelse før sletting (FR-5, FR-12, FR-14, FR-27) | Automatisk: testene for FR-5, FR-12, FR-14 og FR-27 | |
| SK-7 | Word, for store filer og PDF uten tekst avvises med riktig beskjed (FR-9, FR-10, NFR-16) | Automatisk: testene for FR-9 og FR-10 (se radene over), og `test_nfr16_…` i `backend/tests/test_files.py` | |
| SK-8 | Feiler genereringen, lagres ingenting halvferdig (FR-21) | Automatisk: testene for FR-21 og `test_sk8_…` i `backend/tests/test_jobs.py` | |
| SK-9 | Universell utforming kontrolleres automatisk på alle sider (NFR-13) | Automatisk: axe i Playwright-testene, blant annet brukerreisene, og `frontend/e2e/universell-utforming.spec.ts` på alle sidene og tilstandene story 6.6 lister | Bestått 2026-11-23 (KI, autonom kjøring): ingen axe-brudd på sidene og tilstandene story 6.6 lister, i 1280 og 768 px, heller ikke med eksempelemnet. Jobbstatus, feilet generering og avviste opplastinger er sjekket med axe i brukerreisetestene (`e2e/brukerreiser/`). Se «Resultater fra den avsluttende kontrollen» |
| SK-10 | Huskeregelen stemmer med forbokstavene (FR-44, FR-45) | Automatisk: testene for FR-43, FR-44 og FR-45 i `backend/tests/test_models.py` (genererte modellkort med feil huskeregel forkastes). Huskeregelen studenten skriver selv (FR-46), sjekkes bare for tomt felt (AR-4) | |
| SK-11 | Appen starter etter README fra en ren kopi, uten nøkler eller kontoer (NFR-1, NFR-2) | Manuelt: se «SK-11: ren kopi» under | |
| SK-12 | Hele kjerneflyten med bare tastatur (NFR-8, NFR-13) | Manuelt i story 6.6, av Silje ([#295](https://github.com/IBE160-2026/G91-vikvald/issues/295)). Se «SK-12: bare tastatur» under | |
| SK-13 | Under 5 % faglige feil i 50 flashcards fra Gemini | Manuelt i story 6.6, av Silje mot læreboka. Resultat som CSV i `docs/kvalitet/`, se [`docs/kvalitet/README.md`](kvalitet/README.md) ([#299](https://github.com/IBE160-2026/G91-vikvald/issues/299)) | |
| SK-14 | Minst 95 % av kortene viser til riktig side | Manuelt i story 6.6, samme stikkprøve som SK-13, se [`docs/kvalitet/README.md`](kvalitet/README.md) ([#299](https://github.com/IBE160-2026/G91-vikvald/issues/299)) | |
| SK-15 | 20 quizspørsmål: ett riktig alternativ, det riktige er det lengste i høyst 35 % (FR-31) | Manuelt i story 6.6, av Silje, se [`docs/kvalitet/README.md`](kvalitet/README.md) ([#299](https://github.com/IBE160-2026/G91-vikvald/issues/299)) | |
| SK-16 | Formlene fra *Principles of Economics 3e* side 127–128 gjengis riktig (FR-40) | Manuelt i story 6.6, av Silje, se [`docs/kvalitet/README.md`](kvalitet/README.md) ([#300](https://github.com/IBE160-2026/G91-vikvald/issues/300)) | |
| SK-17 | Minst 80 % av overskriftene i notatene har minst ett kort | Manuelt i story 6.6. Instruksen ber om spredning over overskriftene (`backend/tests/test_instructions.py`). Se [`docs/kvalitet/README.md`](kvalitet/README.md) ([#299](https://github.com/IBE160-2026/G91-vikvald/issues/299)) | |
| SK-18 | Repetisjonsøkt med eget stoff og egenrefleksjon | Manuelt, av Silje, i rapporten | |
| SK-19 | KI-bruken er dokumentert | `docs/ki-prosess/` og sesjonsloggene i `.logs/` | |
| SK-20 | Resultatet av en økt lagres, også avbrutt, og «Neste å øve på» følger FR-58 (FR-56, FR-58) | Automatisk: testene for FR-56 og FR-58 og `test_sk20_…`/`SK-20` | |
| SK-21 | Demomodellen gir samme innhold to ganger og følger NFR-2a | Automatisk: `test_sk21_…`/`test_nfr2a_…` i `backend/tests/test_generation.py`, `backend/tests/test_jobs.py` og `backend/tests/test_quiz.py` | |
| SK-22 | Semesterlinja viser øvd, ikke øvd og uker til eksamen (FR-57) | Automatisk: testene for FR-57 og `SK-22` | |

## SK-11: ren kopi

Akseptkriteriet sier at Silje følger README ordrett. Kjøringen under er gjort av KI i den autonome kjøringen, som en første kontroll. **Silje skal gjenta den selv** og føre sin egen kjøring som en ny rad ([#290](https://github.com/IBE160-2026/G91-vikvald/issues/290)).

| Dato | Commit | Hvem | Resultat |
| --- | --- | --- | --- |
| 2026-11-23 | `c394228` | KI (autonom kjøring) | Bestått, med avvikene under |

**Slik ble det gjort.** Repoet ble klonet til en ny mappe (`git clone`), uten `.env`, uten `docker-compose.override.yml` og uten gcloud-innlogging. Maskinen hadde Docker Desktop (Docker 29.8, Compose v5.5), Node 22, Python 3.12 og uv 0.12 fra før. Deretter ble kommandoene i README kjørt:

- `docker compose up --build`: appen startet. Helsesjekken svarte `{"status":"ok"}`, og `GET /api/config` svarte `"demo_mode": true`.
- Testbrukeren (`test@studiekamerat.no` / `studiekamerat`) logget inn og hadde emnet «Markedsføring» med tre forelesninger.
- `uv sync` og `uv run pytest` i `backend/`: 713 tester bestått.
- `npm install` og `npm run test` i `frontend/`: 918 tester i 73 filer bestått.
- `npx playwright install chromium` og `E2E_REQUIRE_SEED=1 npx playwright test` i `frontend/`: 179 tester bestått, også testene av testbrukeren, som logger inn i nettleseren.
- `docker compose logs backend` viste loggen, og `uv run python -m app.seed.build_notes` laget PDF-ene på nytt uten endringer.
- `docker compose down -v` ryddet bort alt.

**Avvik fra README ordrett:**

- Appen ble startet med et eget prosjektnavn (`docker compose -p sk-renkopi up --build -d`) og ryddet med `docker compose -p sk-renkopi down -v`, slik at databasen til den vanlige utgaven på samme maskin (volumet `pgdata`) ikke ble rørt. README bruker `docker compose up` uten `-p`.
- Innloggingen som testbruker ble gjort av Playwright-testen og med et kall til API-et, ikke av et menneske i nettleseren.
- `npx playwright test` ble kjørt med `E2E_REQUIRE_SEED=1`. Det er de samme testene, men testene av testbrukeren feiler i stedet for å hoppe over seg selv.
- Maskinen var ikke ny: programmene var installert fra før, og Playwright-nettleseren kan ha vært lastet ned tidligere.

**Rettet i README etter kjøringen:** ingenting. Kommandoene virket slik de står. Under arbeidet med storien fikk README kodeblokker for kommandoer som før bare sto i teksten eller i en tabell (issue #27).

## Resultater fra den avsluttende kontrollen (story 6.6)

Kontrollene som kan automatiseres, er kjørt av KI i den autonome kjøringen. Kontrollene som er Siljes, har en tom tabell og en framgangsmåte her, og et GitHub-issue hver. Kvaliteten med Gemini (SK-13–SK-17) står i [`docs/kvalitet/README.md`](kvalitet/README.md).

### Universell utforming med axe (SK-9, NFR-13)

`frontend/e2e/universell-utforming.spec.ts` går gjennom alle sidene og tilstandene story 6.6 lister, og kjører axe på hver av dem i 1280 og 768 px:

- innloggingen og oppretting av konto, tomme og med feilmelding
- forsiden uten og med emner, og dialogen «Nytt emne»
- emnesiden og dialogen «Ny forelesning»
- forelesningssiden uten og med filer, vilkårsdialogen, dialogene «Lag flashcards» og «Lag quiz», og slettebekreftelsen for en fil
- flashcardøkten (forside og snudd kort), hurtigtastdialogen og flashcardresultatet
- quizøkten før og etter svar, og quizresultatet
- kontosiden med slettebekreftelsen for kontoen
- «Fant ikke siden», innlogget og utlogget
- bør ha-sidene (modellkort, fritekst og sammendrag) når bryteren er på i `GET /api/config`. Testen leter etter inngangen i appen. Så lenge epic 7–9 ikke er bygd, finner den ingen og fører «ikke bygd ennå» på testen
- forelesningssiden, flashcardøkten og quizøkten med eksempelemnet til testbrukeren, uten å lagre en økt

Tilstander som ikke står i lista, for eksempel jobbstatus mens innhold lages, feilet generering og avviste opplastinger, er sjekket med axe i brukerreisetestene (`e2e/brukerreiser/`).

| Dato | Commit | Hvem | Kommando | Resultat |
| --- | --- | --- | --- | --- |
| 2026-11-23 | `c51bfa2` | KI (autonom kjøring) | `E2E_REQUIRE_SEED=1 npx playwright test` mot `docker compose -p sk-seedtest up --build` | Bestått: 189 tester, ingen axe-brudd, også de 9 testene i `universell-utforming.spec.ts`. Ingen feil i appen måtte rettes |

### Skjermbredde 768 px (NFR-14)

Den samme testen sjekker de samme sidene og tilstandene i 768 px: siden er ikke bredere enn vinduet (`scrollWidth <= innerWidth`), sidene med sidemeny har knappen «Meny» og ingen synlig navigasjon «Emner», og i øktene ligger øktpanelet bak «Meny».

| Dato | Commit | Hvem | Resultat |
| --- | --- | --- | --- |
| 2026-11-23 | `c51bfa2` | KI (autonom kjøring) | Bestått: ingen vannrett rulling på sidene og tilstandene i lista over i 768 px, sidemenyen og øktpanelet bak «Meny» |

### NFR-14: tekst forstørret til 200 %

Kontrolleres for hånd av Silje ([#296](https://github.com/IBE160-2026/G91-vikvald/issues/296)).

**Framgangsmåte.** Start appen med `docker compose up` og åpne http://localhost:3000 i Chrome. Gjør vinduet 1280 px bredt. Zoom siden til 200 % med Cmd/Ctrl og + til Chrome viser 200 % (WCAG 1.4.4 godtar zoom av hele siden som måte å forstørre teksten på). Gå gjennom kjerneflyten: logg inn → nytt emne og forelesning → last opp PDF og godta vilkår → lag og øv på flashcards → lag og ta quiz → logg ut. Sjekk på hver side om den får vannrett rulling, og om tekst eller knapper blir skjult eller overlapper. Noter det du finner.

| Dato | Nettleser og versjon | Hvem | Resultat | Funn (issue) |
| --- | --- | --- | --- | --- |
| | | | | |

### NFR-15: nettlesere

`frontend/e2e/kjerneflyt.spec.ts` går gjennom kjerneflyten i nettleseren og fører navnet og versjonen på nettleseren på testen. Den kjøres i en installert nettleser med `E2E_BROWSERS`, for eksempel `E2E_BROWSERS=chrome npx playwright test --project=chrome` i `frontend/`. Edge fantes ikke på maskinen, og Safari skal kontrolleres i selve Safari, ikke i WebKit-motoren til Playwright. Begge er Siljes ([#297](https://github.com/IBE160-2026/G91-vikvald/issues/297) og [#298](https://github.com/IBE160-2026/G91-vikvald/issues/298)). Safari kan kuttes (kuttrekkefølge punkt 3 i PRD-en).

**Framgangsmåte for Edge og Safari.** Start appen med `docker compose up` og åpne http://localhost:3000 i nyeste Edge eller Safari. Gå gjennom kjerneflyten for hånd: logg inn → nytt emne og forelesning → last opp PDF og godta vilkår → lag og øv på flashcards → lag og ta quiz → logg ut. Er Edge installert, kan du i stedet kjøre `E2E_BROWSERS=msedge npx playwright test --project=msedge` i `frontend/`. Finn versjonsnummeret i «Om»-menyen (Edge: Innstillinger → Om Microsoft Edge; Safari: Safari → Om Safari), og før versjon, dato, commit og funn i tabellen.

| Nettleser | Versjon | Dato | Commit | Hvem | Hvordan | Resultat |
| --- | --- | --- | --- | --- | --- | --- |
| Chrome | 158.0.8127.37 | 2026-11-23 | `c51bfa2` | KI (autonom kjøring) | `E2E_BROWSERS=chrome npx playwright test --project=chrome` | Bestått |
| Edge | | | | | | |
| Safari | | | | | | |

### SK-12: bare tastatur

Kontrolleres for hånd av Silje ([#295](https://github.com/IBE160-2026/G91-vikvald/issues/295)).

**Framgangsmåte.** Start appen med `docker compose up` og åpne http://localhost:3000. Legg bort musa. Gå gjennom kjerneflyten med Tab, Shift+Tab, Enter, Mellomrom, piltastene, Esc og hurtigtastene i øktene (se «?»): logg inn → nytt emne og forelesning → last opp PDF med «Velg PDF» og godta vilkår → lag og øv på flashcards → lag og ta quiz → logg ut. Sjekk ved hvert steg at fokusringen synes, og at fokus går dit EXPERIENCE.md sier (for eksempel til første felt i en dialog, og tilbake til knappen som åpnet den). Feil rettes eller føres som GitHub-issue og i `issues.md`.

| Dato | Nettleser og versjon | Hvem | Steg | Resultat | Funn (issue) |
| --- | --- | --- | --- | --- | --- |
| | | | Logg inn | | |
| | | | Nytt emne og forelesning | | |
| | | | Last opp PDF og godta vilkår | | |
| | | | Lag og øv på flashcards | | |
| | | | Lag og ta quiz | | |
| | | | Logg ut | | |
