---
title: 'Story 2.3: Last opp PDF-notater til en forelesning'
type: 'feature'
created: '2026-11-21'
baseline_revision: '51a3e2a17587b06002748fd58ba9b3b18d04ec7f'
status: 'in-progress'
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

**Problem:** En forelesning kan ikke ha notater. Det finnes ingen filtabeller, ingen lagringsmodul, ingen opplastingsrute og ingen filer på forelesningssiden (04), og forelesningstabellen på 03 mangler kolonnene Filer og Status (story 2.3 i `epics.md`: FR-8, FR-9, FR-10, FR-39, FR-4, NFR-16, AR-6, AR-8, UX-DR13, UX-DR16, UX-DR17, UX-DR20, UX-DR42).

**Approach:** Ny backendmodul `files` (tabellene `files` og `file_pages`, migrering `0004`), `core/storage` for disken, rutene `POST/GET /api/lectures/{id}/files` og `GET /api/subjects/{id}/file-counts`, og et Docker-volum `uploads`. I frontend: filliste (`file-row`), opplastingsfelt (`upload-zone`) med meldinger per avvist fil, felles `note-surface`, tellinger under h1 på 03 og 04, og kolonnene Filer og Status i `lecture-table`.

## Boundaries & Constraints

**Always:**
- **Lagring (AR-8):** bare `backend/app/core/storage.py` rører disken. Sti `<UPLOAD_DIR>/<user_id>/<file_id>.pdf`; originalnavnet aldri i stien. Funksjoner: lagre (skriv til midlertidig fil og gi nytt navn), lese, slette én fil, slette hele brukermappa. `UPLOAD_DIR` (standard `data/uploads`) og `MAX_UPLOAD_MB` (standard 20) i `core/config`. Testene bruker en midlertidig mappe (autouse-fixture i `conftest.py`).
- **Tabeller (migrering `0004_create_files`, modeller i `app/modules/files/models.py`):** `files`: `id` UUID, `lecture_id` (FK `lectures.id` `ON DELETE CASCADE`, indeks), `original_name` `String(255)`, `page_count` int, `uploaded_at` UTC. `file_pages`: `file_id` (FK `files.id` `ON DELETE CASCADE`), `page_no` int, `text` Text, `needs_image` bool (alltid `false`), primærnøkkel `(file_id, page_no)`. Må kjøre på Postgres og SQLite.
- **Moduler:** `files` kan kalle `subjects` (eierskap via `get_lecture`/`get_subject`), aldri omvendt. Tellingene til 03 kommer derfor fra en rute i `files`.
- **`POST /api/lectures/{id}/files`** (multipart, feltet `file`, én fil per kall) → `201` `{id, lecture_id, original_name, page_count, uploaded_at}`. Rekkefølge: `current_user` → forelesningen må være hennes (ellers `404 NOT_FOUND` før kroppen leses) → størrelse → innhold. Ved avvisning lagres ingenting, verken rader eller fil på disk.
- **Størrelse:** kroppen leses i biter; passerer fila `MAX_UPLOAD_MB` MiB (pluss litt slingringsmonn for multipart-hoder), slutter backend å lese og svarer `FILE_TOO_LARGE` med `details.size_mb` og `details.limit_mb`. `size_mb` er filstørrelsen i MiB rundet **opp** til helt tall (fra `Content-Length` når lesingen stoppes tidlig), så den alltid er større enn grensen. PyMuPDF åpnes aldri for en for stor fil. Fil på nøyaktig grensen godtas.
- **Innhold (i denne rekkefølgen):** starter ikke bytene med `%PDF-` (innenfor de første 1024 bytene) → `NOT_PDF` (filendelsen betyr ingenting); PyMuPDF klarer ikke åpne, trenger passord eller gir 0 sider → `PDF_UNREADABLE`; over 50 sider → `TOO_MANY_PAGES` med `details.page_count` (50 godtas); ingen side har tekst etter at mellomrom er fjernet → `NO_READABLE_TEXT`. PyMuPDF kjøres i en tråd (`asyncio.to_thread`), ikke i hendelsesløkka.
- **Lagring av godkjent fil:** én rad i `files`, én rad i `file_pages` per side med `page_no` fra 1 og teksten fra `page.get_text()` (NUL-tegn fjernet), lagret i én transaksjon; PDF-en skrives via `core/storage`. Feiler commit, slettes fila fra disken igjen. Samme filnavn to ganger gir to filer.
- **`original_name`:** bare filnavnet (uten mappe), trimmet, kuttet til 255 tegn. Mangler feltet `file` eller filnavnet → `422 VALIDATION_ERROR` med `fields.file`.
- **`GET /api/lectures/{id}/files`** → filene sortert på `uploaded_at`, så `id`. **`GET /api/subjects/{id}/file-counts`** → `{"file_count": 11, "lectures": [{"lecture_id", "file_count", "page_count"}]}` (bare forelesninger med filer, én `GROUP BY`-spørring). Begge med samme 404-regel.
- **Nye feilkoder** i `core/errors.py` (alle `422`) og i `frontend/lib/messages.ts`, tekstene ordrett fra `epics.md`/EXPERIENCE.md: `NOT_PDF` «Bare PDF-filer kan lastes opp. Lagre Word-dokumentet som PDF (Fil → Lagre som → PDF) og prøv igjen.», `NO_READABLE_TEXT` «Vi fant ingen tekst i denne PDF-en. Den kan være skannet. Last opp en PDF der teksten kan merkes.», `TOO_MANY_PAGES` «Fila har {page_count} sider. Grensen er 50 sider. Del den opp og last opp delene hver for seg.», `FILE_TOO_LARGE` «Fila er på {size_mb} MB. Grensen er {limit_mb} MB. Lagre den på nytt med mindre bilder, eller del den opp.», `PDF_UNREADABLE` «Vi klarte ikke å åpne denne PDF-en. Den kan være låst med passord eller skadet. Lagre den på nytt som PDF uten passord og prøv igjen.». En ny funksjon fyller inn `{…}` fra `details`; mangler en verdi, brukes reserveteksten. `messageFor` viser aldri en uutfylt mal.
- **Docker:** backend får volumet `uploads` montert på `/app/data/uploads`; mappa lages i `backend/Dockerfile` og eies av brukeren `app` før `USER app`, så volumet blir skrivbart. `README.md` (tjenestetabellen og innstillingene) og `.env.example` nevner `UPLOAD_DIR`, `MAX_UPLOAD_MB` og volumet.
- **Forelesningssiden (04):** linja under h1 blir «Forelesning fredag 11.09.2026 · 2 filer · 18 sider» (entall «1 fil», «1 side»; også «0 filer · 0 sider»). Seksjonen h2 «Filer» med én `file-row` per fil i API-rekkefølge: filikon på `brand-tint`-flis, filnavn (15 px/600, avkortet med «…», hele navnet tilgjengelig), «12 sider · lastet opp 11.09» i dempet grå, høyde `file-row`. Ingen «Slett»/«Erstatt» ennå.
- **Opplastingsfelt (`upload-zone`):** stiplet kant i `border-control`, opplastingsikon, «Dra og slipp PDF-filer hit», «Bare PDF. Hver fil får sin egen kilde med sidetall.» og omrissknappen «Velg PDF» (åpner en skjult `<input type="file" multiple>`, virker med bare tastatur). Dra og slipp og «Velg PDF» tar imot flere filer; frontend sender dem én og én i hvert sitt kall. Mens det lastes opp, står «Laster opp …» i et levende område (`role="status"`), og «Velg PDF» er ikke aktiv. Hver avvist fil får sin egen linje «<filnavn>: <melding>» i et levende område ved feltet; meldingene står til neste opplasting starter eller hun forlater siden. Godtatte filer vises i lista uten omlasting (invalider fillista, `file-counts` og forelesningen/emnet).
- **Merknadsflate (`note-surface`):** felles komponent i `frontend/components/note-surface.tsx` (`surface-note`, `rounded-option`, låseikon, dempet tekst; aldri for feil). Under opplastingsfeltet i demomodus (`useAppConfig().data.demo_mode`): «I demomodus sendes ingenting ut.». Utenfor demomodus vises ingen merknad ennå (teksten avgjøres i epic 6).
- **Emnesiden (03):** linja under h1 blir «8 forelesninger · 11 filer · eksamen fredag 04.12.2026» (entall/flertall). `lecture-table` får kolonnene Filer (høyrejustert, tabulære siffer, «–» for 0) og Status: hul prikk (`aria-hidden`) + «Ikke øvd ennå» når forelesningen har filer, ellers «Ingen filer ennå». Pila og «hele raden er lenke» beholdes.
- Testnavn har krav-ID (`test_fr8_…`, `test_fr39_…`, `test_nfr16_…`, «FR-8: …»). Test-PDF-er lages av testene selv (PyMuPDF i pytest, en liten PDF-bygger i `frontend/e2e/`); aldri ekte notater. Kode og kommentarer på engelsk, synlig tekst på bokmål. axe uten brudd på 03 og 04.

**Never:**
- Ikke rør planleggingsdokumentene, `CLAUDE.md`, `.claude/settings.json`, `.git/hooks/` eller `frontend/e2e/brukerreiser/`.
- Ingen vilkårsdialog eller `TERMS_NOT_ACCEPTED` (2.4), ingen sletting eller erstatting (2.5, 2.6), ingen «Lag og øv», ingen `needs_image`-regel (epic 6), ingen endring på forsiden.
- Ingen filsti på disken uten `core/storage`; ingen håndlagd erstatning for shadcn-komponenter som finnes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tre sider | PDF med «Side én/to/tre» | `201`, `page_count` 3; `file_pages` 1, 2, 3 med riktig tekst; fil på disk under `<user_id>/<file_id>.pdf` | — |
| Word-fil | `.docx`-bytes (også med navnet `x.pdf`) | ingenting lagret | `422 NOT_PDF` |
| Uten tekst | PDF med bare tomme sider / bare mellomrom | ingenting lagret | `422 NO_READABLE_TEXT` |
| 51 / 50 sider | PDF med 51 sider; PDF med 50 | 51 avvises, 50 godtas | `422 TOO_MANY_PAGES`, `details.page_count` 51 |
| For stor | fil over `MAX_UPLOAD_MB` (satt lavt i testen) | PyMuPDF kalles ikke, lesingen stopper, ingenting lagret | `422 FILE_TOO_LARGE`, `size_mb` > `limit_mb` |
| Låst / skadet | PDF med passord; `%PDF-` + søppel | ingenting lagret | `422 PDF_UNREADABLE` |
| Samme navn | to opplastinger av `a.pdf` | to filer, begge i lista | — |
| Andres forelesning | `POST/GET …/lectures/{olas}/files`, ukjent, `ikke-en-id`; `GET …/subjects/{olas}/file-counts` | lik `404`, ingenting lagret | `NOT_FOUND` |
| Mangler fil | multipart uten `file` | ingenting lagret | `422 VALIDATION_ERROR` `fields.file` |
| Tellinger | 2 forelesninger, 3 filer på den ene | `file_count` 3, én rad i `lectures` med riktige tall | — |
| Slett forelesning | rad i `lectures` slettes | `files` og `file_pages` slettes (cascade) | — |
| Uten innlogging | alle nye ruter | `401` | `UNAUTHENTICATED` |
| Flere filer i frontend | `notater.pdf` + `notater.docx` | pdf-en i lista; «notater.docx: Bare PDF-filer …» ved feltet | meldingen står til neste opplasting |

</intent-contract>

## Code Map

- `backend/app/core/config.py` -- `Settings`; legg til `UPLOAD_DIR: Path` og `MAX_UPLOAD_MB: int` (positiv).
- `backend/app/core/storage.py` (ny) -- eneste modul som rører disken; leser `get_settings()` ved hvert kall (testene endrer miljøet).
- `backend/app/core/errors.py` -- `ErrorCode` + `ERROR_STATUS`; `test_errors.py::test_fr1_alle_koder_finnes_i_meldingsfila` krever nøkkel i `messages.ts`.
- `backend/app/modules/subjects/service.py` -- `get_lecture(session, user_id, lecture_id: str)` og `get_subject(...)` gir 404 for andres/ukjente/ugyldige id-er; gjenbruk dem.
- `backend/app/modules/subjects/models.py` -- `_utc_now`, mønster for modeller; `Lecture` er FK-mål.
- `backend/app/modules/subjects/router.py` -- `_as_utc` (SQLite gir tid uten sone); mønster for router og `CurrentUser`/`Session`.
- `backend/app/modules/files/{__init__,models,schemas,service,pdf,router}.py` (ny) -- `pdf.py` har PyMuPDF-lesingen (ren funksjon, bytes → sider/feil), `service.py` lagring og tellinger, `router.py` strømlesingen av multipart med grense.
- `backend/app/main.py` -- inkluder files-routeren.
- `backend/alembic/env.py`, `backend/tests/conftest.py` -- importer `files.models` så tabellene registreres; conftest får autouse `UPLOAD_DIR=tmp_path`.
- `backend/alembic/versions/0003_create_lectures.py` -- mønster for `0004_create_files.py` (`down_revision = "0003_create_lectures"`).
- `backend/tests/test_migrations.py` -- legg til test for `files`/`file_pages` (kolonner, cascade, indeks) og downgrade til `0003`; `test_ar13_migreringene_samsvarer_med_modellene` må fortsatt gå.
- `backend/tests/test_lectures.py` / `test_subjects.py` -- hjelpere `_log_in_new_user`, `_create`, `_create_lecture`, `NOT_FOUND`.
- `backend/tests/test_route_guard.py` -- dekker nye ruter automatisk.
- `backend/pyproject.toml`, `backend/uv.lock` -- legg til `pymupdf` og `python-multipart` (låste versjoner, `uv add`).
- `backend/Dockerfile`, `docker-compose.yml`, `.env.example`, `README.md` -- volumet `uploads`, mappe eid av `app`, innstillingene.
- `frontend/lib/api.ts` -- `apiFetch` setter bare `Content-Type` for strenger, så `FormData` går rett gjennom.
- `frontend/lib/messages.ts` (+ `messages.test.ts`) -- nye koder og utfylling av `{…}`.
- `frontend/lib/config.ts` -- `useAppConfig()` gir `demo_mode`.
- `frontend/components/icon.ts` -- `iconProps` for lucide-ikoner (`FileText`, `Upload`, `Lock`).
- `frontend/components/note-surface.tsx` (ny) -- felles merknadsflate.
- `frontend/modules/files/{types,api}.ts`, `components/{file-row,file-list,upload-zone}.tsx` (ny) -- spørringsnøkler `["lectures", id, "files"]` og `["subjects", id, "file-counts"]`.
- `frontend/modules/subjects/format.ts` -- legg til `fileCountLabel`, `pageCountLabel` (entall/flertall) ved siden av `lectureCountLabel`.
- `frontend/modules/subjects/pages/{lecture-page,subject-page}.tsx` -- linjene under h1, «Filer»-seksjonen og opplastingsfeltet.
- `frontend/modules/subjects/components/lecture-table.tsx` -- tar imot tellingene og viser Filer og Status.
- `frontend/modules/subjects/{lecture-page,subject-page}.test.tsx` -- falsk backend i `fetchMock`; må svare på de nye rutene.
- `frontend/e2e/forelesninger.spec.ts` -- mønster (hjelpere, axe, `tabTo`, fokusring) for ny `frontend/e2e/filer.spec.ts` og `frontend/e2e/pdf.ts` (PDF-bygger).
- `frontend/next.config.ts` -- `rewrites` sender `/api/*` videre; må slippe gjennom ~20 MB.

## Tasks & Acceptance

**Execution:**
- `backend/pyproject.toml`, `uv.lock` -- `pymupdf`, `python-multipart` -- AR-6
- `backend/app/core/{config,storage,errors}.py` -- innstillinger, lagring, feilkoder -- AR-8, NFR-16
- `backend/app/modules/files/*`, `backend/app/main.py`, `backend/alembic/env.py`, `backend/alembic/versions/0004_create_files.py` -- modeller, PDF-lesing, rutene, migrering -- FR-8, FR-9, FR-10, FR-39, FR-4
- `backend/tests/{conftest,test_files,test_storage,test_migrations}.py` -- hele matrisen, lagringsfunksjonene, at for stor fil ikke åpnes og at lesingen stopper, at ingenting lagres ved avvisning (rader og disk), cascade fra forelesning -- AR-17
- `backend/Dockerfile`, `docker-compose.yml`, `.env.example`, `README.md` -- volum og innstillinger -- AR-8
- `frontend/lib/messages.ts` + test, `frontend/components/note-surface.tsx`, `frontend/modules/files/*` + tester -- meldinger, merknadsflate, filrad, opplastingsfelt (flere filer, én per kall, meldinger per fil, levende område, tastatur) -- UX-DR16, UX-DR17, UX-DR20, UX-DR42
- `frontend/modules/subjects/{format.ts,components/lecture-table.tsx,pages/*.tsx}` + tester -- linjene under h1 og kolonnene -- UX-DR13
- `frontend/e2e/pdf.ts`, `frontend/e2e/filer.spec.ts` -- opplasting med «Velg PDF» og bare tastatur, flere filer der én avvises, melding står til neste opplasting, fil like under grensen kommer fram gjennom frontend og fil like over gir `FILE_TOO_LARGE`-teksten, tabell og linjer på 03, axe på 03 og 04 -- NFR-8, NFR-12, SK-7

**Acceptance Criteria:**
- Given forelesningssiden, when hun velger to PDF-er med «Velg PDF» med bare tastatur, then står «Laster opp …» i et levende område mens de lastes opp, og etterpå står begge i «Filer» med «N sider · lastet opp dd.mm» og linja under h1 viser «· 2 filer · N sider» uten omlasting.
- Given flere filer der noen avvises, when opplastingen er ferdig, then står én linje per avvist fil med filnavnet foran den ordrette meldingen, og linjene forsvinner først når hun starter en ny opplasting.
- Given en fil like under `MAX_UPLOAD_MB`, when den lastes opp gjennom frontend (Next.js `rewrites`), then kommer den fram og står i lista; en fil like over gir «Fila er på 21 MB. Grensen er 20 MB. …».
- Given demomodus, when 04 vises, then står «I demomodus sendes ingenting ut.» i merknadsflaten under opplastingsfeltet.
- Given et emne der én forelesning har filer og én ikke, when 03 vises, then viser linja under h1 antall forelesninger og filer, og tabellen viser tallet og «Ikke øvd ennå» for den ene og «–» og «Ingen filer ennå» for den andre.
- Given `docker compose up`, when backend startes på nytt, then ligger opplastede filer fortsatt i volumet `uploads`.
- Given 03 og 04 med filer og meldinger, when axe kjøres, then finnes ingen brudd.

## Spec Change Log

## Review Triage Log

## Design Notes

- **Tellinger fra `files`:** arkitekturen lar `files` kalle `subjects`, ikke omvendt. Derfor egen rute `GET /api/subjects/{id}/file-counts` i `files` i stedet for et felt i emne- eller forelesningssvarene. Kanttilfelle.
- **Strømlesing:** FastAPIs `UploadFile` leser hele kroppen før koden vår kjører. Ruten tar derfor `Request`, leser `request.stream()` selv med en teller og bruker `python-multipart` (eller Starlettes `MultiPartParser` på bytene som er lest) til å hente fila. Grensen sjekkes mens det leses.
- **MB:** grensen er `MAX_UPLOAD_MB × 1024 × 1024` byte, og størrelsen i meldingen rundes opp, så «Fila er på 20 MB. Grensen er 20 MB.» aldri kan stå. Kanttilfelle.
- **Opplastingsstatus:** ingen godkjent tekst finnes; «Laster opp …» følger mønsteret «Lager quizspørsmål …» i EXPERIENCE.md. Meldingen per fil er «<filnavn>: <melding>». Kanttilfeller.
- **PDF-bygger i e2e:** en håndskrevet minimal PDF (Helvetica, én tekstlinje per side, riktig xref) med et ekstra ubrukt strømobjekt som fyll gir eksakt størrelse uten tredjepartsfiler.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alle grønne
- `cd frontend && npm run test && npx tsc --noEmit` -- expected: alle grønne
- `docker compose up --build -d && cd frontend && npx playwright test` -- expected: alle grønne
