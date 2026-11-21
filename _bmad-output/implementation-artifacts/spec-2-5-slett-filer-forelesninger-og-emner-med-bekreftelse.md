---
title: 'Story 2.5: Slett filer, forelesninger og emner med bekreftelse'
type: 'feature'
created: '2026-11-21'
baseline_revision: 'a1b3c760ab5dcfa9216fe7e8180cff9c075f67e2'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Axe og tastaturflyten for slettebekreftelsen kjøres bare i Playwright, som CI ikke kjører.
    evidence: |-
      .github/workflows/ci.yml kjører bare pytest og vitest; e2e kjøres for hånd i hver story.
    location: >-
      frontend/e2e/slett.spec.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** Studenten kan ikke slette en fil, en forelesning eller et emne. Det finnes ingen `content`-modul med tellerregister, ingen `delete-preview`- eller `DELETE`-ruter, og ingen felles slettebekreftelse (story 2.5 i `epics.md`: FR-6, FR-7, FR-12, FR-14, FR-4, AR-7, AR-8, UX-DR16, UX-DR21, UX-DR22). PDF-ene på disken må også slettes (åpent punkt etter 2.3).

**Approach:** En ny modul `content` får et register for tellinger. `files`-modulen (som får kalle `subjects` og `content`) eier forhåndsvisning og sletting for fil, forelesning og emne: den samler fil-ID-ene, sletter raden i én transaksjon med `ON DELETE CASCADE`, og fjerner PDF-ene med `core/storage` etter commit. I frontend bygger én felles `DeleteConfirmDialog` på den felles `Dialog`, og én funksjon i `frontend/lib/` lager setningen «Dette sletter også …».

## Boundaries & Constraints

**Always:**
- **Register (`backend/app/modules/content/registry.py`, ny modul `content` med `__init__.py`):** `DeleteScope` (frozen dataclass: `file_ids: tuple[uuid.UUID, ...]`, `lecture_ids: tuple[uuid.UUID, ...]`; forelesningene er de som slettes helt), `register_counter(kind: str, count: async (session, scope) -> int)`, `unregister_counter(kind)`, og `async content_counts(session, scope) -> list[tuple[str, int]]` i innmeldingsrekkefølge, uten tellinger som er 0. To innmeldinger med samme `kind` gir `ValueError`. Ingen typer er registrert i epic 2. `content` importerer ingenting fra `files` eller `subjects`.
- **Svarform for alle tre forhåndsvisningene:** `200` med `{"counts": [{"kind": "lectures", "count": 8}, {"kind": "files", "count": 11}, …registerets tellinger]}`. Rekkefølge: `lectures`, `files`, så registeret. Tellinger på 0 er utelatt. Fil: bare registeret (`scope = ([fil], [])`). Forelesning: `files` + registeret (`scope = (filene, [forelesningen])`). Emne: `lectures`, `files` + registeret (`scope = (alle filene, alle forelesningene)`). Skjema `DeletePreview`/`DeleteCount` i `files/schemas.py`.
- **Ruter (alle med `current_user`, alle i `files/router.py`):** ny `files_router` (`/api/files`) med `GET /{file_id}/delete-preview` og `DELETE /{file_id}`; på `lectures_router` `GET /{lecture_id}/delete-preview` og `DELETE /{lecture_id}`; på `subjects_router` `GET /{subject_id}/delete-preview` og `DELETE /{subject_id}`. `files_router` tas med i `app/main.py`. `DELETE` svarer `204` uten kropp. Andres, ukjente og ugyldige ID-er gir `404 NOT_FOUND` (samme svar), også for `DELETE`.
- **Eierskap for fil:** `files/service.py:get_file(session, user_id, file_id: str)` slår opp fila sammen med forelesningen og emnet (`Subject.user_id == user_id`), slik `get_lecture` gjør; ugyldig UUID gir `404`.
- **Sletting:** fil-ID-ene samles før slettingen (`files/service.py:file_ids_for_lectures`). Selve raden slettes med én `DELETE`-setning (`sqlalchemy.delete`) i eiermodulen: `files/service.py:delete_file`, `subjects/service.py:delete_lecture` og `delete_subject` (de to siste kalles fra `files/router.py`; `subjects` importerer aldri `files`). Én `commit`. Alt under forsvinner med `ON DELETE CASCADE`; ingen kode sletter rad for rad.
- **Disk:** etter commit slettes hver PDF med `storage.delete_pdf(user.id, file_id)` i `asyncio.to_thread`. `OSError` for én fil logges med `logger.exception` og fil-ID (aldri filinnhold eller filnavn), og de andre slettes likevel; svaret er `204`.
- **Ingen jobber:** ingen `409`-sjekk i denne storien.
- **Tekster:** navnene på typene ligger i `frontend/lib/messages.ts` som en egen eksport `countNouns: Record<string, { one: string; other: string }>` med `lectures` («forelesning»/«forelesninger»), `files` («fil»/«filer»), `flashcards` («flashcard»/«flashcards»), `quiz_questions` («quizspørsmål»/«quizspørsmål») og `model_cards` («modellkort»/«modellkort»). Nøklene skrives med små bokstaver (backendtesten leser bare store).
- **Setningsfunksjon (`frontend/lib/delete-text.ts`):** `type DeleteCount = { kind: string; count: number }`, `type DeleteTarget = "file" | "lecture" | "subject"`, `UNDOABLE = "Det kan ikke angres."`, og `alsoDeletedSentence(counts, target): string | null`. Den tar med tellinger over 0 med kjent navn, i rekkefølgen den får, med entall for 1 og flertall ellers, skilt med «, » og «og» før den siste: «Dette sletter også 8 forelesninger og 11 filer.». For `file` legges « laget fra fila» til før punktumet. Ingen tellinger igjen → `null`.
- **Felles `Dialog`** (`frontend/components/dialog.tsx`): når `primaryAction.variant === "danger"`, får «Avbryt» alltid startfokus. Ny valgfri prop `returnFocus?: () => HTMLElement | null`: når den gir et element, får det fokus når dialogen lukkes, ellers åpneren som før. De andre dialogene endres ikke.
- **`DeleteConfirmDialog` (`frontend/components/delete-confirm-dialog.tsx`):** props `open`, `title`, `confirmLabel`, `item: { name: string; detail?: string; icon?: ReactNode }`, `target: DeleteTarget`, `previewKey: readonly unknown[]`, `loadCounts: () => Promise<DeleteCount[]>`, `remove: () => Promise<void>`, `onClose`, `onDeleted`, `focusAfterDelete?: () => HTMLElement | null`. Bredde 560. Innhold: boksen (`bg-paper`, `rounded-option`, kant `border-card`; ikonflis i `brand-tint` når `icon` finnes; navnet i `text-label`, `detail` i dempet `text-meta`), så setningen fra `alsoDeletedSentence` (når den ikke er `null`), så `UNDOABLE` i halvfet. Fareknappen har søppelbøtteikon (`Trash2`) og er `disabled` til tellingene er hentet. Tellingene hentes med `useQuery({ queryKey: ["delete-preview", ...previewKey], enabled: open, staleTime: 0 })`, og spørringen fjernes fra bufferen (`removeQueries`) når dialogen lukkes, så de alltid er ferske. Mens tellingene lastes, vises verken setningen eller `UNDOABLE`. Feiler hentingen eller slettingen (ikke 401), vises `FALLBACK_MESSAGE` i `role="alert"` i dialogen, og ingenting slettes. Svarer `DELETE` `404 NOT_FOUND`, regnes det som slettet. Mens slettingen pågår, er begge knappene `disabled`, og Avbryt, krysset og Esc gjør ingenting. Etter vellykket sletting: `onDeleted()`, så `onClose()`; `returnFocus` gir da `focusAfterDelete?.()`.
- **Fokus når åpneren er slettet (#75):** fil slettet → fokus på overskriften «Filer» (`h2`, `tabIndex={-1}`). Forelesning eller emne slettet → siden det navigeres til, setter fokus på sin `h1` (`tabIndex={-1}`): `frontend/lib/focus-heading.ts` har `focusHeadingAfterNavigation()` (setter et flagg) og `useFocusHeadingOnArrival(ref, ready)` (fokuserer og nullstiller flagget når `ready`). Brukes av `h1` på 02 (`Dine emner`) og 03 (emnenavnet).
- **Filrad (04):** rød tekstknapp «Slett» med `Trash2` (`variant="text"` med `text-danger hover:bg-danger-tint`), tilgjengelig navn «Slett <filnavn>» (filnavnet i `sr-only`). Åpner dialogen med tittel «Slette fila?», boks med filikon, filnavnet og «12 sider · <forelesningsnavn>», fareknapp «Slett fila». Etter sletting fjernes fila fra `filesQueryKey` i bufferen med en gang, og `["lectures", lectureId]` og `["subjects", subjectId]` invalideres (som i opplastingen).
- **Forelesningssiden (04):** omrissknapp «Slett forelesningen» med `Trash2` og rød tekst etter «Endre dato». Tittel «Slette forelesningen?», boks med navnet (uten ikon og detalj), fareknapp «Slett forelesningen». Etter sletting: `focusHeadingAfterNavigation()`, `router.push("/emner/<subjectId>")`, invalider `SUBJECTS_QUERY_KEY` (ikke den slettede forelesningens egne nøkler, så siden ikke viser «Fant ikke siden» før den forlates).
- **Emnesiden (03):** omrissknapp «Slett emnet» med samme stil etter «Endre eksamensdato». Tittel «Slette emnet?», navnet i boksen, fareknapp «Slett emnet». Etter sletting: `focusHeadingAfterNavigation()`, `router.push("/")`, invalider bare lista (`SUBJECTS_QUERY_KEY`, `exact: true`).
- **API i frontend:** `fetchFileDeletePreview`, `deleteFile` i `modules/files/api.ts`; `fetchLectureDeletePreview`, `deleteLecture`, `fetchSubjectDeletePreview`, `deleteSubject` i `modules/subjects/api.ts`. Forhåndsvisningene gir `DeleteCount[]` (`counts` fra svaret).
- Bare shadcn-komponenter som finnes (`Button`, felles `Dialog`); ingen nye pakker. Testnavn har krav-ID (`test_fr12_…`, `test_fr14_…`, `test_fr6_…`, `test_fr7_…`, `test_ar8_…`, `test_uxdr22_…`, «FR-12: …», «UX-DR22: …»). Kode og kommentarer på engelsk, synlig tekst på bokmål.

**Never:**
- Ikke rør planleggingsdokumentene, `CLAUDE.md`, `.claude/settings.json`, `.git/hooks/` eller `frontend/e2e/brukerreiser/`.
- Ingen erstatting (2.6), ingen kontosletting (2.7), ingen jobber eller `409`, ingen nye feilkoder, ingen «Er du sikker?».
- Ingen kode som sletter rad for rad, og ingen sletting av PDF-er før commit.
- `subjects`-modulen importerer aldri `files` eller `content`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Emne med innhold | 2 forelesninger, 3 filer | preview: `[{lectures,2},{files,3}]` | — |
| Forelesning med filer | 2 filer | preview: `[{files,2}]` | — |
| Tomt emne / tom forelesning / fil | ingenting under | preview: `{"counts": []}` | — |
| Registrert testtype | teller > 0 | med i alle tre forhåndsvisningene, sist; teller 0 utelatt | — |
| Andres eller ukjent ID | preview eller `DELETE` | ingenting slettes | `404 NOT_FOUND` |
| Slett emne | 2 forelesninger, filer | `204`; ingen rader i `lectures`, `files`, `file_pages` for emnet, ingen PDF-er på disk; andre brukeres data urørt | — |
| Slett forelesning | 2 filer | `204`; forelesningen, filene, sidene og PDF-ene borte; andre forelesninger urørt | — |
| Slett fil | 1 fil av 2 | `204`; bare den fila og PDF-en borte | — |
| Disken feiler | `delete_pdf` kaster `OSError` | `204`, raden er borte, feilen logget med fil-ID uten innhold | logges |
| Setning, flere | `[{lectures,8},{files,11}]`, emne | «Dette sletter også 8 forelesninger og 11 filer.» | — |
| Setning, fil | `[{flashcards,18},{quiz_questions,11},{model_cards,2}]`, fil | «Dette sletter også 18 flashcards, 11 quizspørsmål og 2 modellkort laget fra fila.» | — |
| Setning, entall | `[{lectures,1},{files,1}]` | «… 1 forelesning og 1 fil.» | — |
| Setning, ingenting (E16) | `[]`, eller bare 0 / ukjente typer | `null`; dialogen viser bare «Det kan ikke angres.» | — |
| Avbryt / kryss / Esc | dialog åpen | ingen `DELETE`, fokus tilbake til knappen | — |
| Preview feiler | 500 | `FALLBACK_MESSAGE`, fareknappen `disabled` | reservetekst |
| `DELETE` feiler | 500 | dialogen står, `FALLBACK_MESSAGE` | reservetekst |
| `DELETE` gir 404 | slettet i en annen fane | behandles som slettet | — |

</intent-contract>

## Code Map

- `backend/app/core/storage.py` -- `delete_pdf(user_id, file_id)` finnes (mangler = ikke feil).
- `backend/app/core/ownership.py` -- `get_owned`; filer har ingen `user_id`, så eierskap går via emnet som i `subjects/service.py:get_lecture`.
- `backend/app/modules/files/router.py` -- `lectures_router`, `subjects_router` (mønster for rute i `files` under `/api/subjects`, se `subject_file_counts`); `CurrentUser`, `Session`. Ny `files_router`.
- `backend/app/modules/files/service.py` -- `store_file` (mønster for `to_thread`, logging uten innhold), `file_counts`; legg til `get_file`, `file_ids_for_lectures`, `delete_file`.
- `backend/app/modules/files/schemas.py` -- legg til `DeleteCount`, `DeletePreview`.
- `backend/app/modules/subjects/service.py` -- `get_subject`, `get_lecture`, `list_lectures`; legg til `lecture_ids(session, subject_id)`, `delete_lecture`, `delete_subject`.
- `backend/app/main.py` -- ta med `files_router`. Starlette finner `DELETE /api/lectures/{id}` i `files` selv om `GET`/`PATCH` ligger i `subjects` (delvis treff går videre).
- `backend/app/modules/files/models.py`, `subjects/models.py` -- FK-er med `ondelete="CASCADE"` finnes; SQLite slår på `foreign_keys` i `core/db.py`.
- `backend/tests/test_files.py` -- `_log_in_new_user` (godtar vilkår), `_new_lecture`, `_upload`, `make_pdf`, `_counts`; `tests/test_lectures.py:_create_lecture`, `_new_subject`; `tests/test_subjects.py:NOT_FOUND`, `_code`. Fixturen `upload_dir` gir mappa på disk.
- `backend/tests/test_route_guard.py` -- dekker de nye rutene automatisk.
- `frontend/components/dialog.tsx` (+ `dialog.test.tsx`) -- startfokus og `returnFocus`.
- `frontend/components/ui/button.tsx` -- variantene `outline`, `text`, `danger`; `className` slås sammen med `cn`.
- `frontend/lib/messages.ts` (+ test) -- `countNouns`; `FALLBACK_MESSAGE`. `frontend/lib/api.ts` -- `apiFetch` gir `undefined` for `204`; `ApiError`, `isUnauthenticated`.
- `frontend/modules/files/components/{file-row,file-list}.tsx` -- «Slett» og `onDelete`.
- `frontend/modules/subjects/pages/{lecture-page,subject-page,home-page}.tsx` -- knappene, dialogene, `h1`/`h2` med `tabIndex={-1}`, navigasjon med `useRouter` fra `next/navigation`.
- `frontend/modules/subjects/format.ts` -- `pageCountLabel`, `fileCountLabel`, `lectureCountLabel`.
- `frontend/modules/subjects/{lecture-page,subject-page,home-page}.test.tsx` -- falsk backend i `fetchMock`; `next/navigation` er mocket (legg `push` i en `vi.fn` som testene kan lese).
- `frontend/e2e/filer.spec.ts` -- hjelpere `registerNewUser`, `createSubjectViaApi`, `createLectureViaApi`, `tabTo`, `expectNoAxeViolations`; `frontend/e2e/pdf.ts:makePdf`.

## Tasks & Acceptance

**Execution:**
- `backend/app/modules/content/{__init__,registry}.py` -- registeret -- AR-7, FR-12
- `backend/app/modules/files/{schemas,service,router}.py`, `backend/app/modules/subjects/service.py`, `backend/app/main.py` -- forhåndsvisning og sletting med disk etter commit -- FR-6, FR-7, FR-12, FR-14, AR-7, AR-8
- `backend/tests/test_delete.py` (ny) -- alle backendradene i matrisen, med registrert testtype (fjernes etter testen), disk sjekket i `upload_dir`, `OSError` med `monkeypatch` og `caplog` -- AR-17
- `frontend/lib/{messages,delete-text,focus-heading}.ts` + tester -- navn, setning, fokusflagg -- UX-DR22, E16
- `frontend/components/{dialog,delete-confirm-dialog}.tsx` + tester -- startfokus på Avbryt, `returnFocus`, lasting, feil, 404 som slettet, ingen lukking under sletting, registrert type i teksten (`FR-12`) -- UX-DR21, UX-DR22
- `frontend/modules/files/{api.ts,components/file-row.tsx,components/file-list.tsx}`, `frontend/modules/subjects/{api.ts,pages/*.tsx}` + sidetestene -- knappene, flytene og fokus etter sletting
- `frontend/e2e/slett.spec.ts` (ny) -- med bare tastatur på 04 (fil) og 03 (emne); axe med dialogen åpen på 03 og 04; Esc sletter ingenting (sjekket via API); fokus etter sletting -- NFR-8, FR-12

**Acceptance Criteria:**
- Given 04 med to filer, when hun trykker «Slett» på den første og bekrefter med «Slett fila», then er fila borte fra lista, linja viser «1 fil · … sider», PDF-en er borte, og fokus står på «Filer».
- Given 04 med to filer, when hun trykker «Slett forelesningen», then står «Dette sletter også 2 filer.» og «Det kan ikke angres.», og etter bekreftelse er hun på 03 med fokus på `h1`, og forelesningen er borte fra tabellen og sidemenyen.
- Given 03 med forelesninger og filer, when hun sletter emnet, then er hun på forsiden med fokus på «Dine emner», og emnet er borte fra lista.
- Given en dialog åpen, when den åpnes, then har «Avbryt» fokus; Esc lukker uten `DELETE`, og fokus går tilbake til knappen.
- Given 03 og 04 med bekreftelsen åpen, when axe kjøres, then finnes ingen brudd.

## Spec Change Log

## Review Triage Log

### 2026-11-21 — Review pass
- verdicts: 32 findings — high 0, medium 6, low 22, false 4, maybe-false 0
- findings:
  - `[medium]` `[patch]` (blind) En opplasting mellom innsamlingen av fil-ID-ene og slettingen etterlater en PDF uten rad — forelesningsradene låses nå med `with_for_update()` før ID-ene samles (`lock_lecture`, `lecture_ids`).
  - `[low]` `[reject]` (blind) Forhåndsvisningen og slettingen er ikke knyttet sammen (filer lastet opp i en annen fane slettes uten varsel) — krever versjonering av forhåndsvisningen; sjelden situasjon.
  - `[low]` `[patch]` (blind) `DeleteScope` sier ikke om `file_ids` dekker filene i `lecture_ids` — docstringen sier det nå.
  - `[low]` `[reject]` (blind) Registeret har ikke noe fast innmeldingssted, og testen for tomt register leser `_counters` — innmeldingen kommer med første innholdstype i epic 3; testen skal feile da, fordi registeret ikke lenger er tomt.
  - `[medium]` `[patch]` (blind) Ukjente typer forsvinner stille fra setningen — ny backendtest krever at hver registrert type har navn i `countNouns`.
  - `[medium]` `[patch]` (blind) 404 på forhåndsvisningen gir reservetekst og låst fareknapp — behandles nå som slettet, som 404 på `DELETE`; ny Vitest.
  - `[low]` `[reject]` (blind) Ingen «Prøv igjen»-knapp når forhåndsvisningen feiler — lukk og åpne henter på nytt; ny knapp er ny tekst og ny gren.
  - `[low]` `[patch]` (blind) Lukkekrysset er aktivt mens slettingen pågår — krysset er nå `disabled` sammen med «Avbryt».
  - `[low]` `[patch]` (blind) Fokusflagget kan bli hengende og stjele fokus senere — flagget utløper etter 5 sekunder, og testene nullstiller det.
  - `[low]` `[reject]` (blind) Bufferen for slettede ting fjernes ikke, så Tilbake viser dem kort — siden henter på nytt og viser «Fant ikke siden»; ingen data går tapt.
  - `[low]` `[reject]` (blind) Slettefunksjonene i servicelaget sjekker ikke eierskap selv — alle rutene sjekker eierskap først, som resten av modulene.
  - `[low]` `[reject]` (blind) En PDF som ikke kunne slettes, blir liggende — akseptkriteriet sier «logges, og svaret er likevel 204»; står som gjenværende risiko.
  - `[low]` `[reject]` (blind) Manglende tester (Esc og feil på forelesningsdialogen, 404 som navigerer, filtall på 03) — samme komponent er testet i `delete-confirm-dialog.test.tsx`; navigasjonen er testet i e2e.
  - `[false]` `[reject]` (blind) KI-sporet mangler — skrives og committes i samme økt etter gjennomgangen, før PR-en.
  - `[low]` `[patch]` (blind) Importrekkefølgen på forelesningssiden — rettet.
  - `[medium]` `[patch]` (edge) Samme kappløp som første rad — samme retting.
  - `[low]` `[reject]` (edge) En teller som kaster, gir 500 og stopper sletting — en feil i en teller skal synes; ingen tellere finnes ennå.
  - `[low]` `[patch]` (edge) `register_counter` godtar «lectures» og «files» — gir nå `ValueError`.
  - `[medium]` `[patch]` (edge) 404 på forhåndsvisningen — samme retting som blind-raden.
  - `[low]` `[patch]` (edge) Fokusflagget lekker — samme retting som blind-raden.
  - `[low]` `[patch]` (edge) Fokus faller til `body` når slettingen feiler — «Avbryt» får fokus når den blir aktiv igjen; ny Vitest.
  - `[low]` `[patch]` (edge) Den falske backenden i testen kunne slette feil forelesning med `splice(-1)` — sjekker nå indeksen.
  - `[medium]` `[patch]` (verification-gap) Commit-feil er bare testet på filruten — testen kjører nå for fil, forelesning og emne.
  - `[low]` `[defer]` (verification-gap) Axe og tastaturflyten kjøres bare i Playwright, som CI ikke kjører — prosjektvalg fra før; Playwright kjøres for hånd i hver story.
  - `[low]` `[reject]` (intent) FR-12 er testet i to deler (backend og komponent), ikke i én test — tellingen fra registeret og teksten er begge dekket.
  - `[low]` `[reject]` (intent) At avbryt ikke rører disken er ikke testet direkte — avbryt sender ingen forespørsel, og det er testet.
  - `[low]` `[reject]` (intent) Filtallene på 03 etter sletting av fil er ikke testet — samme invalidering som opplastingen fra 2.3.
  - `[low]` `[reject]` (intent) Sidemenyen etter sletting er ikke sjekket i e2e — den leser samme spørringer som tabellen og forsiden, som er sjekket.
  - `[low]` `[patch]` (intent) Sletting av forelesning i e2e brukte klikk og ingen axe — nå bare tastatur og axe.
  - `[false]` `[reject]` (intent) Komponenten brukes ikke av erstatning og konto ennå — det er story 2.6 og 2.7.
  - `[false]` `[reject]` (intent) Setningen er delt i to — slik skisse 14 viser den, med «Det kan ikke angres.» i halvfet.
  - `[false]` `[reject]` (intent) Tillegg utover storien (fokus etter navigasjon, 404 som slettet) — står i spesifikasjonen.

## Design Notes

- **Rutene ligger i `files`:** arkitekturgrafen lar `files` kalle `subjects` og `content`, men ikke omvendt. Sletting av forelesning og emne må kjenne filene for å fjerne PDF-ene og telle dem, så rutene ligger i `files`, som filtellingene fra 2.3 (#96). Hver tabell skrives fortsatt bare av eiermodulen. Kanttilfelle.
- **Svarform som liste:** komponenten tar imot tellingene som liste (AC), og rekkefølgen styrer setningen. Kanttilfelle.
- **Fokus når åpneren er slettet (#75):** fil → «Filer», forelesning/emne → `h1` på siden hun kommer til. Kanttilfelle.
- **«laget fra fila»** bare for fil, som i den godkjente setningen. Ukjente typer uten navn i meldingsfila utelates fra setningen. Typenavn for flashcards, quizspørsmål og modellkort legges inn nå (fra den godkjente setningen), entall valgt av KI. Kanttilfelle.
- **Knappene på 03/04** er omrissknapper med rød tekst og søppelbøtte, som «Slett kontoen …» i DESIGN.md (bare fareknappen i dialogen er rød fylt). Boksen for forelesning og emne har bare navnet. Kanttilfelle.
- **`404` på `DELETE`** regnes som slettet; fareknappen er av til tellingene er hentet, så hun alltid ser hva som forsvinner (FR-12). Kanttilfelle.
- **Kappløp:** en fil som lastes opp mellom innsamlingen av fil-ID-ene og commit, kan bli liggende som PDF uten rad. Godtatt; jobber og låser kommer i epic 3.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alle grønne
- `cd frontend && npm run test && npx tsc --noEmit` -- expected: alle grønne
- `docker compose up --build -d && cd frontend && npx playwright test` -- expected: alle grønne

## Auto Run Result

**Sammendrag:** Studenten kan slette en fil, en forelesning og et emne. Backend har en ny modul `content` med et register for tellinger (tomt i epic 2), forhåndsvisning (`GET …/delete-preview`) og `DELETE` for fil, forelesning og emne i `files`-modulen. Slettingen låser forelesningsradene, sletter raden i én transaksjon med `ON DELETE CASCADE` og fjerner PDF-ene med `core/storage` etter commit. En diskfeil logges med fil-ID, og svaret er likevel 204. Frontend har en felles `DeleteConfirmDialog` (560 px, «Avbryt» har startfokus) og én setningsfunksjon i `frontend/lib/delete-text.ts`. Filrader har rød «Slett», 04 har «Slett forelesningen», og 03 har «Slett emnet». Etter sletting går fokus til «Filer» eller til `h1` på siden hun kommer til (#75).

**Filer:**
- `backend/app/modules/content/{__init__,registry}.py` -- tellerregisteret
- `backend/app/modules/files/{router,schemas,service}.py`, `backend/app/modules/subjects/service.py`, `backend/app/main.py` -- forhåndsvisning, sletting, låsing og disk etter commit
- `backend/tests/test_delete.py` -- 31 tester
- `frontend/components/{dialog,delete-confirm-dialog}.tsx` + tester -- startfokus, `returnFocus`, `cancelDisabled`, felles bekreftelse
- `frontend/lib/{delete-text,focus-heading,messages}.ts` + tester -- setning, fokusflagg, `countNouns`
- `frontend/modules/files/{api.ts,components/file-row.tsx,components/file-list.tsx}`, `frontend/modules/subjects/{api.ts,pages/*.tsx}` + sidetestene -- knappene og flytene
- `frontend/e2e/slett.spec.ts` -- tastatur, axe, avbryt og fokus
- `docs/skjermbilder/story-2-5/` -- skjermbilder i 1280 og 768 px

**Gjennomgang:** 32 funn. Rettet: kappløpet med opplasting (medium), 404 på forhåndsvisningen (medium), navn for registrerte typer (medium), commit-feil på alle tre rutene (medium), og ni `low`. Utsatt: e2e i CI (fra før). Avvist: 4 `false` og 12 `low` med grunner i Review Triage Log.

**Ny gjennomgang anbefales:** ja. Rettet: high 0, medium 4 (grupper: kappløp, 404 på forhåndsvisning, typenavn, commit-feil), low 9. Uprøvd risiko: låsingen med `with_for_update()` mot kappløpet med opplasting virker bare på Postgres og er ikke testet, fordi testene bruker SQLite.

**Verifisering:** `uv run pytest` 284 grønne; `npm run test` 438 grønne og `tsc --noEmit` uten feil; `docker compose up --build` + `npx playwright test` 51 grønne.

**Gjenværende risiko:** låsingen virker bare på Postgres (SQLite i testene ignorerer den). En PDF som ikke kan slettes fra disken, blir liggende uten rad. Playwright kjøres ikke i CI.
