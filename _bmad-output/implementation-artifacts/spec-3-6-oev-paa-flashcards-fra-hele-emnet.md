---
title: 'Story 3.6: Øv på flashcards fra hele emnet'
type: 'feature'
created: '2026-11-22'
baseline_revision: '729050aea1d8905a7dfce7a25fdeab2bf44c3ada'
status: 'in-progress'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Studenten kan bare øve på flashcards fra én forelesning om gangen. Før eksamen vil hun repetere hele pensum, men emnesiden (03) har ikke kortet «Øv på hele emnet», og det finnes ingen API-rute eller side for en økt over alle forelesningene (story 3.6 i `epics.md`: FR-23, FR-56, UX-DR14 for flashcards).

**Approach:** Ny rute `GET /api/subjects/{id}/flashcards` i `content` som gir alle kortene i emnet med kilde og forelesningens navn. Emnesiden får `practice-all-card` med raden Flashcards («120 kort fra 6 forelesninger», «Øv på flashcards»). En ny side `/emner/<id>/flashcards` gjenbruker øktsiden fra 3.3–3.5 med emnet som omfang og `lecture_id` tom, og tilbakevalget går til emnesiden.

## Boundaries & Constraints

**Always:**
- **API (`backend/app/modules/content/{router,service,schemas}.py`):** `GET /api/subjects/{subject_id}/flashcards` med `current_user`; emnet hentes med `get_subject` (andres, ukjent eller ugyldig id → `404 NOT_FOUND`). Svarer med en liste av `SubjectFlashcardOut` = feltene i `FlashcardOut` pluss `lecture: {id, name}`. Bare `qa` og `concept` (`PLAIN_FLASHCARD_KINDS`). Rekkefølge: forelesningens dato, forelesningens `created_at`, deretter som for én forelesning (fil, side, laget). Emne uten kort → `[]`.
- **Spørring (`frontend/modules/practice/api.ts`):** `subjectFlashcardsQueryKey(id)` = `["subjects", id, "flashcards"]` og `fetchSubjectFlashcards`. Typen `SubjectFlashcard` = `Flashcard` + `lecture`.
- **Kortet «Øv på hele emnet» (`frontend/modules/practice/components/practice-all-card.tsx`):** generell komponent som tar en liste med rader (`title`, `scope`, `action`), slik at quiz og fritekst kan legge til rader senere. Seksjonen har `h2` «Øv på hele emnet» (`text-section-title`, som «Forelesninger») og et hvitt kort (`border-card`, `rounded-lg`, `shadow-lift`, `p-6`) med radene delt av hårlinje. Rad: tittel (`text-item-title`), omfang under (`text-body-sm text-ink-muted`), handling under (smalt kort) eller til høyre (bredt kort, container query). Ingen rader → ingenting vises (verken overskrift eller kort).
- **Emnesiden (`frontend/modules/subjects/pages/subject-page.tsx`):** henter emnets flashcards (bare når emnet er hentet). Raden Flashcards vises bare når listen har kort: omfang «N kort fra M forelesninger» (M = antall ulike forelesninger; entall «1 forelesning»), og hovedknappen «Øv på flashcards» som lenke til `/emner/<id>/flashcards` (full bredde i det smale kortet, som i skissen). Forelesningstabellen og kortet står side om side (kort 344 px) når innholdsområdet er bredt nok (container query, minst 1008 px), ellers under hverandre med kortet under tabellen. Feil i spørringen → reserveteksten i `role="alert"` i seksjonen.
- **Oppdatering:** jobbovervåkeren (`job-watcher.tsx`) ugyldiggjør i tillegg alle `["subjects", *, "flashcards"]` når en jobb er ferdig, så antallet på emnesiden stemmer uten ny innlasting.
- **Økten for hele emnet (`frontend/app/(app)/emner/[subjectId]/flashcards/page.tsx`, `flashcard-session-page.tsx`):** `FlashcardSessionPage` tar enten `lectureId` eller `subjectId`. Med `subjectId`: kortene fra `fetchSubjectFlashcards`, blandet med `shuffle` som før og låst ved start; panelet viser emneprikken og «<emnenavn> · hele emnet»; kilden på kortet er som før «fil, side N»; `useSessionSaver` får `lectureId: null` og emnets id; resultatsidens undertekst er «<emnenavn> · hele emnet»; tilbakevalget (knapp på resultatsiden, Esc, tom økt) går til `/emner/<id>` med teksten «Tilbake til emnet» og hintet «Esc tilbake til emnet»; «Avslutt økt» uten markering går til emnesiden. Sidetittel «Flashcards – <emnenavn> – Studiekamerat». «Øv igjen» bruker emnets kort nå. Tom økt: «Det finnes ingen flashcards her ennå.» + «Tilbake til emnet». Andres eller ukjent emne → «Fant ikke siden».
- Øktrammen for én forelesning oppfører seg som før.
- Testnavn har krav-ID (`test_fr23_…`, `test_fr56_…`, `test_fr4_…`; Vitest/Playwright «FR-23: …», «FR-56: …», «UX-DR14: …», «UX-DR34: …», «AR-9: …»). Kode og kommentarer på engelsk, synlig tekst på bokmål.

**Never:**
- Ikke rør planleggingsdokumentene, `CLAUDE.md`, `.claude/settings.json`, `.git/hooks/` eller `frontend/e2e/brukerreiser/`.
- Ingen ny økttype, ny tabell eller endring i `POST /api/practice-sessions`. Ingen «øvd»-funksjon eller SISTE ØKT (story 5.1). Ingen quiz- eller fritekstrader (epic 4 og 8). Ingen redigering/sletting av kort (3.7). Ingen nye npm- eller Python-pakker.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Kort i flere forelesninger | 2 forelesninger med 3 og 2 kort | API: 5 kort med `source` og `lecture`; emnesiden «5 kort fra 2 forelesninger» og «Øv på flashcards» | — |
| Emne uten kort | forelesninger uten kort (eller ingen) | API `[]`; ingen seksjon «Øv på hele emnet» | — |
| Ett kort | 1 kort i 1 forelesning | «1 kort fra 1 forelesning» | — |
| Andres/ukjent emne | `GET /api/subjects/<andres>/flashcards`, side `/emner/<andres>/flashcards` | `404 NOT_FOUND`; siden «Fant ikke siden» | — |
| Modellkort | `kind='model'` i emnet | ikke med | — |
| Emneøkt lagres | ≥ 1 markert, ferdig | én POST med `lecture_id: null`, `subject_id` satt, 204 | — |
| Tilbake | resultatsiden etter emneøkt, Esc eller «Tilbake til emnet» | `/emner/<id>` | — |
| Klokke | nettleserens klokke 5 min etter, kort laget rett før økten | kroppen har `duration_seconds` og ikke klokkeslett; serveren svarer 204 | — |

</intent-contract>

## Code Map

- `backend/app/modules/content/router.py` -- `lectures_router`; ny `subjects_router` (`/api/subjects`) med samme `CurrentUser`/`Session`-mønster; registreres i `backend/app/main.py` ved siden av `content_lectures_router`.
- `backend/app/modules/content/service.py` -- `lecture_flashcards` er mønsteret for `subject_flashcards` (join `File`, i tillegg `Lecture` fra `app.modules.subjects.models`).
- `backend/app/modules/content/schemas.py` -- `FlashcardOut`, `FlashcardSource`.
- `backend/app/modules/subjects/service.py:54` -- `get_subject(session, user_id, subject_id: str)` gir 404.
- `backend/tests/test_flashcards.py` -- hjelpere `_log_in_new_user`, `_new_lecture`, `_upload`, `_start`, `_finish_jobs`, `pdf_with_pages`, `definitions`, `NOT_FOUND`; `_new_lecture` lager nytt emne hver gang — trenger to forelesninger i samme emne (se `tests/test_files.py`).
- `backend/tests/test_route_guard.py` -- sjekker automatisk at den nye ruten har `current_user`.
- `frontend/modules/practice/api.ts`, `types.ts` -- nye funksjoner og typer.
- `frontend/modules/practice/pages/flashcard-session-page.tsx` -- `lecturePath`, `back`, `end`, `playAgain`, `ResultView` (`backHref`, knappeteksten), `BackToLecture`, `useDocumentTitle`, `useSessionSaver`-øyeblikksbildet; `SessionPanel` `scopeName`/`colorIndex`.
- `frontend/modules/practice/components/shortcut-hints.tsx` -- `RESULT_HINTS` blir avhengig av tilbaketeksten.
- `frontend/modules/practice/components/result-summary.tsx` -- `scopeName` brukes som undertekst (uendret komponent).
- `frontend/modules/subjects/pages/subject-page.tsx` -- seksjonen «Forelesninger»; ny layout med kortet.
- `frontend/modules/subjects/format.ts` -- `lectureCountLabel` (entall/flertall).
- `frontend/modules/generation/components/job-watcher.tsx:96` -- ugyldiggjøring etter jobb.
- `frontend/components/ui/button.tsx` -- `Button asChild` for lenkeknapp.
- `frontend/e2e/lagre-okt.spec.ts` -- mønster for e2e (`lectureWithThreeCards`, `captureSaves`, axe).
- Skisse `mockups/03-emne.svg`: tabell 664 px + 32 px luft + kort 344 px ved 1440; «Øv på hele emnet» 18 px/600 over kortet; rad med tittel 16/600, omfang 14 muted, hovedknapp 296×40.

## Tasks & Acceptance

**Execution:**
- `backend/app/modules/content/{schemas,service,router}.py`, `backend/app/main.py` -- `SubjectFlashcardOut`, `subject_flashcards`, ruten -- FR-23-data.
- `backend/tests/test_subject_flashcards.py` -- kort fra to forelesninger med kilde og forelesning i fast rekkefølge, tomt emne, modellkort utelatt, 404 for andres/ukjent/ugyldig, 401 uten innlogging.
- `frontend/modules/practice/{api,types}.ts` -- spørring og type.
- `frontend/modules/practice/components/practice-all-card.tsx` + test -- generelle rader, skjult uten rader.
- `frontend/modules/subjects/pages/subject-page.tsx` + `subject-page.test.tsx` -- raden Flashcards med antall, skjult uten kort, lenke, feil.
- `frontend/modules/generation/components/job-watcher.tsx` (+ test) -- ugyldiggjør emnets kort.
- `frontend/modules/practice/components/shortcut-hints.tsx` (+ test) -- `resultHints(backText)`.
- `frontend/modules/practice/pages/flashcard-session-page.tsx` (+ test) -- omfang forelesning/emne; tester for emneøkt: panelets omfang, `lecture_id: null`, tilbake til emnet, Esc uten markering, 404.
- `frontend/app/(app)/emner/[subjectId]/flashcards/page.tsx` -- ruten.
- `frontend/e2e/hele-emnet.spec.ts` -- emnesiden med to forelesninger viser raden og axe; emne uten kort uten raden; økten blander kort fra begge, panelet «Markedsføring · hele emnet», kilden «fil, side N», lagring med `lecture_id: null`, tilbake til emnesiden, axe på 1280 og 768 uten vannrett rulling; klokketesten (klokka 5 min etter med `page.clock`).

**Acceptance Criteria:**
- Given et emne med kort i flere forelesninger, when emnesiden vises, then står «Øv på hele emnet» med «N kort fra M forelesninger» og «Øv på flashcards», og axe finner ingen brudd på 1280 og 768 px.
- Given at studenten trykker «Øv på flashcards», when økten går, then får hun kortene fra alle forelesningene, panelet viser «<emne> · hele emnet», og en ferdig økt lagres med `lecture_id: null` og `subject_id` satt.
- Given resultatsiden etter en emneøkt, when hun trykker Esc eller «Tilbake til emnet», then kommer hun til emnesiden.

## Spec Change Log

## Review Triage Log

## Design Notes

- **Hvorfor én side med to omfang:** øktrammen (blanding, lagring, resultat, taster, smal skjerm) er den samme; bare kortkilde, navn og tilbakevei skiller. Et lite omfangsobjekt inne i siden gir én kodevei, så rettinger i økten gjelder begge.
- **Hvorfor antallet regnes ut fra kortlisten:** emnesiden trenger både antall kort og antall forelesninger; listen gir begge uten en egen tellerute, og ved 120 kort er den liten.
- **Valg tatt selv (kanttilfeller):** teksten «Tilbake til emnet» (og hintet «Esc tilbake til emnet») finnes ikke i EXPERIENCE.md, men er laget etter «Tilbake til forelesningen»; seksjonen «Øv på hele emnet» skjules helt når ingen rad har innhold; kortet står under tabellen når det ikke er plass side om side (smalere enn skissen på 1280 px); undertekst og panel bruker «<emne> · hele emnet»; sidetittelen bruker emnenavnet; adressen er `/emner/<id>/flashcards`.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- grønne
- `cd frontend && npm run test && npx tsc --noEmit` -- grønne
- `docker compose up --build -d && cd frontend && npx playwright test` -- grønne
