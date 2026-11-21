---
title: 'Story 2.6: Erstatt en fil med en ny versjon'
type: 'feature'
created: '2026-11-21'
baseline_revision: '133f5226a86cd3fae708df68812c4b73a798e9d5'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Studenten kan ikke erstatte en gammel opplasting med en ny versjon uten å slette fila og laste opp på nytt (story 2.6 i `epics.md`: FR-13, FR-9, FR-10, AR-7, AR-8, UX-DR16, UX-DR22, UX-DR42). Det finnes ingen `POST /api/files/{id}/replace` og ingen «Erstatt» på filraden.

**Approach:** En ny rute i `files` gjenbruker lesingen og sjekkene fra opplastingen (2.3), sletter den gamle raden og lagrer den nye i én transaksjon, og fjerner den gamle PDF-en med `core/storage` etter commit (som 2.5). I frontend får filraden «Erstatt», som åpner filvelgeren og deretter den felles `DeleteConfirmDialog` fra 2.5 med tittelen «Erstatte fila?».

## Boundaries & Constraints

**Always:**
- **Rute:** `POST /api/files/{file_id}/replace` på `files_router` med `current_user`, multipart-feltet `file` (som opplasting). Rekkefølge: `get_file` (andres/ukjent/ugyldig → `404 NOT_FOUND` før kroppen leses) → `TERMS_NOT_ACCEPTED` (403) → `_read_upload` (FILE_TOO_LARGE, VALIDATION_ERROR) → `pdf.read_pages` i `asyncio.to_thread` (NOT_PDF, NO_READABLE_TEXT, TOO_MANY_PAGES, PDF_UNREADABLE). Ingenting i databasen eller på disken endres før alle sjekkene er bestått. Svar `201` med `FileOut` for den nye fila.
- **Lagring (`files/service.py`):** `store_file` får en valgfri `replaces: uuid.UUID | None = None`. Når den er satt, slettes den gamle raden først med én `DELETE`-setning i samme transaksjon (sider og innhold går med `ON DELETE CASCADE`). Treffer den 0 rader (slettet i en annen fane eller samtidig erstatning), rulles det tilbake og svaret er `404 NOT_FOUND`, uten at ny PDF blir liggende. Den nye fila får ny `file_id`, samme `lecture_id`, sitt eget `original_name` og `uploaded_at` = nå. Én `commit`. Feiler commit, fjernes den nye PDF-en som før.
- **Disk etter commit:** den gamle PDF-en slettes med `delete_pdfs(owner_id, [old_id])` etter commit; `OSError` logges med fil-ID og svaret er likevel `201`.
- **Frontend-API (`modules/files/api.ts`):** `replaceFile(fileId, file): Promise<UploadedFile>` (multipart `file`, `POST`).
- **Filrad (`file-row.tsx`):** tekstknappen «Erstatt» (ultramarin, `RotateCw`, standard `variant="text"`) står foran «Slett», som i skisse 04. Tilgjengelig navn «Erstatt <filnavn>» (filnavnet i `sr-only`). Den åpner en skjult `<input type="file">` uten `multiple` (og uten `accept`, som opplastingsfeltet, så en ikke-PDF får sin melding). Tom velger (avbrutt) gjør ingenting (E18); fokus står da på «Erstatt». Raden har under seg et `aria-live="polite"`-område som alltid finnes, og som viser avvisningsmeldingen for raden (samme stil som i opplastingsfeltet).
- **Bekreftelsen:** `DeleteConfirmDialog` med tittel «Erstatte fila?», boks med den gamle fila (filikon, navn, «N sider · <forelesning>»), linja «Erstattes med <nytt filnavn>.» under boksen, setningen fra `alsoDeletedSentence(counts, "file")` (med «sletter», fordi innholdet slettes), «Det kan ikke angres.» og fareknappen «Erstatt fila» med `RotateCw`. Tellingene fra `GET /api/files/{id}/delete-preview`. «Avbryt» har startfokus; Avbryt/Esc/kryss sender ingen forespørsel.
- **`DeleteConfirmDialog` utvides bakoverkompatibelt:** `confirmIcon?: ReactNode` (standard `Trash2`), `note?: ReactNode` (vises rett under boksen), `remove: () => Promise<unknown>`, og `onRemoveError?: (error: unknown) => boolean`. Gir `onRemoveError` `true`, lukkes dialogen uten `onDeleted`, og fokus går tilbake til åpneren. Ellers som før (404 = ferdig, 401 til appens handler, annet → `FALLBACK_MESSAGE` i dialogen).
- **Avvist erstatning (E17):** `ApiError` med `NOT_PDF`, `NO_READABLE_TEXT`, `TOO_MANY_PAGES`, `FILE_TOO_LARGE`, `PDF_UNREADABLE`, `TERMS_NOT_ACCEPTED` eller `VALIDATION_ERROR` lukker dialogen og viser «<nytt filnavn>: <melding>» (samme tekst som 2.3, via `messageWithDetails`) i radens levende område; fokus tilbake på «Erstatt». Meldingen for en rad fjernes når hun velger en ny fil på den raden. Andre feil gir reserveteksten i dialogen.
- **Godtatt erstatning:** i bufferen fjernes den gamle fila og den nye legges sist (nyeste opplasting), så `["lectures", lectureId]` og `["subjects", subjectId]` invalideres (linja på 04 og tellingene på 03 oppdateres). Fokus går til overskriften «Filer», som etter sletting (#75).
- Testnavn har krav-ID (`test_fr13_…`, `test_fr4_…`, `test_ar7_…`, «FR-13: …», «UX-DR22: …»). Testfiler lages av testene. Kode og kommentarer på engelsk, synlig tekst på bokmål. Ingen nye pakker, ingen nye feilkoder.

**Never:**
- Ikke rør planleggingsdokumentene, `CLAUDE.md`, `.claude/settings.json`, `.git/hooks/` eller `frontend/e2e/brukerreiser/`.
- Ingen vilkårsdialog ved erstatning (en bruker med filer har alltid godtatt vilkårene; backend sjekker likevel).
- Ingen sletting av noe før den nye fila er sjekket, og ingen sletting av den gamle PDF-en før commit.
- Ingen kontosletting (2.7), ingen jobber eller `409`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Godtatt | egen fil (2 sider), ny gyldig PDF (3 sider) | `201`, ny `id` ≠ gammel, samme `lecture_id`, nytt navn, `page_count` 3; gammel rad, sider og PDF borte; ny PDF på disk | — |
| Avvist fil | ikke PDF / ingen tekst / 51 sider / for stor / låst | `422` med samme kode og `details` som opplasting; gammel rad, sider og PDF urørt; ingen ny PDF | koden |
| Vilkår mangler | `terms_accepted_at` er null | `403 TERMS_NOT_ACCEPTED`; ingenting endret | koden |
| Andres / ukjent / ugyldig ID | — | `404 NOT_FOUND`; ingenting endret | koden |
| Mangler felt | ingen `file` i kroppen | `422 VALIDATION_ERROR` | koden |
| Gammel rad borte før commit | slettet mellom oppslag og lagring | `404 NOT_FOUND`, ingen ny rad eller PDF | koden |
| Diskfeil på gammel PDF | `delete_pdf` kaster `OSError` | `201`, feilen logget med fil-ID | logges |
| Velger avbrutt (E18) | ingen fil valgt | ingen dialog, ingen forespørsel | — |
| Avbryt i dialogen | dialog åpen | ingen `POST` | — |
| Avvist etter bekreftelse (E17) | `422 NOT_PDF` | dialogen lukkes, «ny.pdf: <melding>» ved raden, fila står | melding ved raden |
| Serverfeil | `500` | dialogen står med `FALLBACK_MESSAGE` | reservetekst |

</intent-contract>

## Code Map

- `backend/app/modules/files/router.py` -- `upload_file` (mønster: `get_lecture` → vilkår → `_read_upload` → `pdf.read_pages`), `_file_out`, `delete_one_file` (mønster: commit så `delete_pdfs`). Legg `replace_file` på `files_router`.
- `backend/app/modules/files/service.py` -- `store_file` (legg til `replaces`), `delete_file`, `delete_pdfs`, `get_file`.
- `backend/tests/test_files.py` -- `_log_in_new_user` (godtar vilkår), `_new_lecture`, `_upload`, `make_pdf` og hjelpere for ugyldige PDF-er (bruk de samme for avvisningene); fixturen `upload_dir`. `tests/test_delete.py` -- `_upload_file`, `_pdf_path`, `_row_counts`, `NOT_FOUND`, `_code`. `tests/test_terms.py` -- hvordan en bruker uten vilkår lages.
- `backend/tests/test_route_guard.py` -- dekker den nye ruten automatisk.
- `frontend/components/delete-confirm-dialog.tsx` (+ test) -- nye valgfrie props.
- `frontend/modules/files/api.ts` -- `uploadFile` er mønsteret for `replaceFile`.
- `frontend/modules/files/components/{file-row,file-list}.tsx` -- «Erstatt», skjult input, levende område; `upload-zone.tsx:rejectionText` er mønsteret for meldingen.
- `frontend/modules/subjects/pages/lecture-page.tsx` (+ `lecture-page.test.tsx`) -- erstatningsdialogen, avvisninger per fil-ID, buffer og fokus.
- `frontend/lib/messages.ts` -- `messageWithDetails`, `FALLBACK_MESSAGE`. `frontend/lib/api.ts` -- `ApiError`, `isUnauthenticated`.
- `frontend/e2e/slett.spec.ts` -- hjelpere å kopiere (`registerNewUser`, `uploadViaApi`, `tabTo`, `expectNoAxeViolations`, `fileRows`); `frontend/e2e/pdf.ts:makePdf`.

## Tasks & Acceptance

**Execution:**
- `backend/app/modules/files/{service,router}.py` -- `replaces` i `store_file` og ruten `replace_file` -- FR-13, FR-9, FR-10, AR-7, AR-8
- `backend/tests/test_replace.py` (ny) -- alle backendradene i matrisen, med sjekk av rader og disk i `upload_dir`, `OSError` med `monkeypatch`/`caplog`, og 0-rader-tilfellet ved å slette raden med `monkeypatch` mellom oppslag og lagring -- AR-17
- `frontend/components/delete-confirm-dialog.tsx` + test -- `confirmIcon`, `note`, `onRemoveError` -- UX-DR22
- `frontend/modules/files/{api.ts,components/file-row.tsx,components/file-list.tsx}` -- `replaceFile`, «Erstatt», input, levende område -- UX-DR16, UX-DR42
- `frontend/modules/subjects/pages/lecture-page.tsx` + `lecture-page.test.tsx` -- flyten: velger avbrutt, avbryt, godtatt (liste og linje oppdatert, fokus på «Filer»), avvist (melding ved raden, fokus på «Erstatt»), 500 -- FR-13, E17, E18
- `frontend/e2e/erstatt.spec.ts` (ny) -- erstatning med bare tastatur; axe med bekreftelsen åpen og med avvist erstatning; avvist fil lar den gamle stå (sjekket via API); tom velger åpner ingen dialog -- NFR-8, FR-13

**Acceptance Criteria:**
- Given 04 med `merkevare.pdf` (2 sider), when hun trykker «Erstatt», velger `ny.pdf` (3 sider) og bekrefter med «Erstatt fila», then står `ny.pdf` med «3 sider · lastet opp dd.mm» i lista, `merkevare.pdf` er borte, linja viser de nye tallene, og fokus står på «Filer».
- Given 04, when hun velger en ikke-PDF og bekrefter, then står den gamle fila, «<navn>: <melding for NOT_PDF>» vises ved raden i et levende område, og fokus står på «Erstatt».
- Given bekreftelsen åpen og avvist erstatning, when axe kjøres, then finnes ingen brudd.

## Design Notes

- **Ny fil sist:** den nye fila får `uploaded_at` = nå, så den flytter seg sist i lista, og «lastet opp dd.mm» viser dagens dato. Kanttilfelle.
- **«sletter» i setningen:** EXPERIENCE sier «erstatter» i stedet for «sletter». Det er brukt i tittel og knapp («Erstatte fila?», «Erstatt fila»). Setningen om innholdet beholder «sletter», fordi flashcards og quizspørsmål fra den gamle fila slettes, ikke erstattes (flyt 3: «Bekreftelsen sier hva som slettes fra den gamle fila»). I epic 2 er registeret tomt, så bare «Det kan ikke angres.» vises. Kanttilfelle.
- **«Erstattes med <filnavn>.»** er ny tekst laget av KI, fordi AC krever at bekreftelsen viser hvilken fil den erstattes med. Kanttilfelle.
- **Fokus etter erstatning:** den gamle raden er borte, så fokus går til «Filer», som etter sletting (#75). Kanttilfelle.
- **404 midt i (0 rader):** samme svar som andres fil; i dialogen regnes 404 som «borte» (som 2.5), og lista hentes på nytt.
- **`201`** fordi en ny fil (ny ID) lages, som ved opplasting.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alle grønne
- `cd frontend && npm run test && npx tsc --noEmit` -- expected: alle grønne
- `docker compose up --build -d && cd frontend && npx playwright test` -- expected: alle grønne
