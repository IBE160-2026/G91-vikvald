---
title: 'Story 2.7: Se kontoen og slett den'
type: 'feature'
created: '2026-11-21'
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

**Problem:** «Konto» i toppfeltet går til `/konto`, som viser «Fant ikke siden». Studenten kan ikke se hva appen har om henne, lese vilkårene igjen eller slette kontoen (story 2.7 i `epics.md`: FR-5, FR-4, AR-7, AR-8, UX-DR7, UX-DR21, UX-DR22, UX-DR39).

**Approach:** Backend får `GET /api/identity/me/delete-preview` og `DELETE /api/identity/me`. Slettingen er én `DELETE` av brukerraden (alt under går med `ON DELETE CASCADE`), og etter commit fjerner `core/storage` hele brukermappa. Frontend får kontosiden (15) med sidemenyen, tre kontokort, vilkårsteksten fra 2.4 i en dialog uten avkrysning og den felles slettebekreftelsen fra 2.5.

## Boundaries & Constraints

**Always:**
- **Modulgrenser:** bare `identity` skriver `users`, så `identity/service.py` får `delete_user(session, user_id)` (én `DELETE`, uten commit). Rutene trenger tellinger fra `subjects`, `files` og `content`, og `identity` kan ikke kalle dem. Derfor ligger de i `files/router.py` på en ny `account_router = APIRouter(prefix="/api/identity")`, som slette-rutene for forelesning og emne i 2.5. Den tas med i `main.py`.
- **Forhåndsvisning:** `GET /api/identity/me/delete-preview` (med `current_user`) svarer `{"counts": [...], "content_kinds": [...]}`. `counts` er `subjects`, `lectures`, `files` og så registerets tellinger, uten nuller. `DeleteScope` har alle hennes fil-ID-er og forelesnings-ID-er. `content_kinds` er alle registrerte typer i innmeldingsrekkefølge (ny `registered_kinds()` i `content/registry.py`, tom i epic 2). `subjects` legges til i `RESERVED_KINDS`.
- **Sletting:** `DELETE /api/identity/me` (med `current_user`): `delete_user` → `commit` → `storage.delete_user_dir(user_id)` i `asyncio.to_thread`. `OSError` fra disken logges med bruker-ID (aldri e-post eller filnavn), og svaret er likevel `204`. Svaret fjerner `sk_session` med `clear_session_cookie`. Andre brukeres rader og mapper er urørt.
- **Frontend-API (`modules/identity/api.ts`):** `fetchAccountDeletePreview()` og `deleteAccount()`. Typen `AccountDeletePreview` i `types.ts`.
- **Felles tekst (`lib/delete-text.ts`):** `DeleteTarget` får `"account"` (ingen ending). Ny `accountCountsSentence(counts)` gir «Du har nå 3 emner, 15 forelesninger og 18 filer.» av `subjects`, `lectures` og `files` (entall/flertall, komma og «og»), eller `null` når alt er 0. Ny `accountDeletedText(kinds)` gir «Alle emner, filer og alt generert innhold slettes for godt.» og, når det finnes kjente typer, «… slettes for godt: flashcards og quizspørsmål.» (flertallsnavnet fra `countNouns`, ukjente hoppes over). `countNouns` får `subjects: emne/emner`.
- **Utlogging:** flyten i `AccountLinks` flyttes til en hook `useLogout` i `modules/identity/use-logout.ts` (samme oppførsel: `clearSignedIn`, `queryClient.clear()`, `/logg-inn`, ett klikk om gangen). Toppfeltet og kontosiden bruker begge den. Feiler utloggingen på kontosiden, vises reserveteksten i et `role="alert"` i kortet.
- **Kontosiden (`/konto`, `modules/identity/pages/account-page.tsx`):** `SubjectSidebar` uten valgt emne eller forelesning; h1 «Konto» (fokus ved ankomst, tittel «Konto – Studiekamerat»), undertittel «Innlogging, vilkår og sletting av kontoen»; demomerket (pille på `surface-note`, dempet tekst, info-ikon) «Demomodus: innholdet lages av en testmodell» bare i demomodus. Tre seksjoner med h2 og hvitt kort (`account-card`, maks 760 px, rader med hårlinje som filkortet):
  - **Innlogging:** E-post med adressen fra `/me`; Passord med «Lagret kryptert, aldri i klartekst»; «Logg ut» (omrissknapp med utgangsikon) til høyre nederst i kortet.
  - **Vilkår og personvern:** Vilkår med «Godtatt dd.mm.åååå, før første opplasting» (lokal dato fra `terms_accepted_at`) eller «Ikke godtatt ennå. Du får se dem før første opplasting.», og tekstknappen «Les vilkårene». Språkmodell med «Testmodell i demomodus (ellers Google, i EU)» i demomodus, ellers «Google, i EU».
  - **Slett kontoen:** `accountDeletedText` + « Det kan ikke angres.», linja fra `accountCountsSentence` (utelatt når `null`), og omrissknappen «Slett kontoen …» med rød tekst og søppelkasse.
- **«Les vilkårene»:** felles `Dialog` (640 px) med tittelen «Vilkår og personvern» og `TermsText`. `Dialog` får valgfri `primaryAction`; uten den har foten bare én omrissknapp «Lukk», som har startfokus. Esc, krysset og «Lukk» lukker, fokus tilbake til «Les vilkårene».
- **Slettebekreftelsen:** `DeleteConfirmDialog` med tittel «Slette kontoen?», boksen med e-postadressen, `target="account"`, `previewKey=["account"]`, tellinger fra forhåndsvisningen, fareknappen «Slett kontoen». Etter `204`: `clearSignedIn`, `queryClient.clear()` og `router.push("/logg-inn")`. Avbryt/Esc/kryss sender ingen `DELETE`.
- Testnavn har krav-ID (`test_fr5_…`, `test_fr4_…`, `test_ar8_…`, «FR-5: …», «UX-DR39: …»). Kode og kommentarer på engelsk, synlig tekst på bokmål. Ingen nye pakker, ingen nye feilkoder, ingen migrasjon.

**Never:**
- Ikke rør planleggingsdokumentene, `CLAUDE.md`, `.claude/settings.json`, `.git/hooks/` eller `frontend/e2e/brukerreiser/`.
- Ingen rad-for-rad-sletting, ingen sletting på disk før commit.
- Ingen endring av e-post eller passord, ingen rad «Økt: logget inn siden …» (droppet av Silje).
- `identity` importerer aldri `subjects`, `files` eller `content`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Forhåndsvisning | 2 emner, 3 forelesninger, 4 filer | `200`, `counts` subjects 2, lectures 3, files 4; `content_kinds` [] | — |
| Tom konto | ingen emner | `200`, `counts` [] | — |
| Registrert type | testtype registrert | med i `content_kinds`; telling med når > 0 | — |
| Sletting | bruker med emner, filer og PDF-er | `204`, `sk_session` fjernet; ingen rader i users/subjects/lectures/files/file_pages for henne; mappa borte | — |
| Annen bruker | to brukere med filer | den andres rader og PDF-er urørt | — |
| Etter sletting | gammel cookie | `GET /me` → `401`; innlogging → `INVALID_CREDENTIALS`; ny registrering med samme e-post → `201` | — |
| Diskfeil | `delete_user_dir` kaster `OSError` | `204`, feilen logget med bruker-ID | logges |
| Uten mappe | ingen opplastinger | `204` | — |
| Ikke innlogget | ingen cookie | `401 UNAUTHENTICATED` (rutevakttesten) | koden |
| Avbryt | bekreftelsen åpen | ingen `DELETE` | — |
| Serverfeil | `DELETE` gir `500` | dialogen står med reserveteksten | reservetekst |

</intent-contract>

## Code Map

- `backend/app/modules/files/router.py` -- `_preview`, `delete_one_subject` (mønster: samle, slett, commit, disk). Legg `account_router` her.
- `backend/app/modules/files/service.py:file_ids_for_lectures`; `backend/app/modules/subjects/service.py` -- legg til `subject_ids_for_user` og `lecture_ids_for_subjects` (ikke låst).
- `backend/app/modules/files/schemas.py:DeletePreview` -- ny `AccountDeletePreview` med `content_kinds`.
- `backend/app/modules/content/registry.py` -- `RESERVED_KINDS`, `_counters`; legg til `registered_kinds()`.
- `backend/app/modules/identity/service.py` -- legg til `delete_user`. `backend/app/core/security.py:clear_session_cookie`. `backend/app/core/storage.py:delete_user_dir` (finnes, testet i `test_storage.py`).
- `backend/app/main.py` -- ta med `account_router`.
- `backend/tests/test_delete.py` -- `_upload_file`, `_pdf_path`, `_row_counts`, `test_kind`-fixturen; `tests/test_files.py:_log_in_new_user`; `tests/test_route_guard.py` dekker nye ruter automatisk. `tests/test_delete.py::test_ar7_registeret_er_tomt_i_epic_2` må fortsatt stå.
- `frontend/modules/identity/components/account-links.tsx` -- logger ut; flyttes til `use-logout.ts`. `require-login.tsx:ME_QUERY_KEY`, `ErrorAlert`-stilen.
- `frontend/components/dialog.tsx` (+ test) -- valgfri `primaryAction`. `frontend/components/delete-confirm-dialog.tsx` -- brukes som den er. `frontend/components/terms-text.tsx` -- brukes som den er.
- `frontend/lib/delete-text.ts` (+ test), `frontend/lib/messages.ts:countNouns`.
- `frontend/modules/subjects/pages/subject-page.tsx` -- sidelayout med `SubjectSidebar`, `useFocusHeadingOnArrival`, `useDocumentTitle`. `frontend/modules/subjects/format.ts:pad`-mønster for datoen.
- `frontend/app/(app)/emner/[subjectId]/page.tsx` -- mønster for `app/(app)/konto/page.tsx`.
- `frontend/e2e/slett.spec.ts`, `e2e/vilkar.spec.ts` -- hjelpere (`tabTo`, `expectNoAxeViolations`, ruting av `/api/config` for demo_mode false).

## Tasks & Acceptance

**Execution:**
- `backend/app/modules/{content/registry.py,subjects/service.py,identity/service.py,files/schemas.py,files/router.py}`, `backend/app/main.py` -- forhåndsvisning og sletting -- FR-5, AR-7, AR-8
- `backend/tests/test_account_delete.py` (ny) -- alle backendradene i matrisen, med rader i alle tabeller og disk i `upload_dir`, `OSError` med `monkeypatch`/`caplog`, ny registrering og innlogging etterpå -- FR-5, FR-4, AR-17
- `frontend/lib/{delete-text.ts,messages.ts}` + test -- `account`, `accountCountsSentence`, `accountDeletedText`, `subjects`
- `frontend/components/dialog.tsx` + test -- dialog uten hovedhandling («Lukk»)
- `frontend/modules/identity/{use-logout.ts,components/account-links.tsx,api.ts,types.ts}` -- felles utlogging, API -- UX-DR39
- `frontend/modules/identity/pages/account-page.tsx` + `account-page.test.tsx`, `frontend/app/(app)/konto/page.tsx` -- siden, dialogene, sletting og utlogging -- FR-5, UX-DR7, UX-DR21, UX-DR22, UX-DR39
- `frontend/e2e/konto.spec.ts` (ny) -- fra «Konto» i toppfeltet; axe med og uten demomodus og med begge dialogene åpne; slett kontoen med bare tastatur → innloggingen, og innlogging med gammel e-post gir feilmeldingen; avbryt sletter ingenting; «Logg ut» fra kontosiden -- FR-5, NFR-8

**Acceptance Criteria:**
- Given innlogget student med 3 emner, 15 forelesninger og 18 filer, when hun trykker «Konto», then ser hun h1 «Konto», demomerket, e-posten, «Du har nå 3 emner, 15 forelesninger og 18 filer.» og «Slett kontoen …».
- Given kontosiden, when hun trykker «Les vilkårene», then vises vilkårsteksten uten avkrysning, med «I demomodus sendes ingenting ut.» i demomodus, og «Lukk» gir fokus tilbake til «Les vilkårene».
- Given bekreftelsen «Slette kontoen?» åpen med «Avbryt» i fokus, when hun bekrefter med «Slett kontoen», then er hun på innloggingen, og innlogging med samme e-post og passord gir «Feil e-post eller passord. Sjekk at Caps Lock er av.».
- Given kontosiden, when hun trykker «Logg ut» i Innlogging-kortet, then er hun logget ut og på innloggingen uten melding.

## Spec Change Log

## Review Triage Log

## Design Notes

- **Rutene i `files`:** `identity` er nederst i modulgrafen og kan ikke telle emner og filer. Rutene ligger derfor i `files`, som allerede eier slettingen av forelesning og emne av samme grunn. Selve raden slettes av `identity.service.delete_user`. Kanttilfelle.
- **«Logg ut» nederst i kortet:** i skissen står knappen i raden «Økt», som er droppet. Den står nå alene til høyre nederst i Innlogging-kortet. Kanttilfelle.
- **«Les vilkårene»-dialogen:** tittelen «Vilkår og personvern» (kortets godkjente navn) og én knapp «Lukk», fordi «Avbryt» ikke gir mening når ingenting kan endres. Kanttilfelle.
- **Språkmodell uten demomodus:** «Google, i EU», tatt fra den godkjente demoteksten. Kanttilfelle.
- **Tom konto:** linja «Du har nå …» utelates når alt er 0 (aldri «0 …», som E16). Kanttilfelle.
- **Innholdstypenes navn** er flertallsformene i `countNouns`; i epic 2 er registeret tomt.
- **Samtidig opplasting:** en opplasting som skriver PDF etter at mappa er fjernet, feiler på fremmednøkkelen og fjerner PDF-en igjen, men en tom mappe kan bli stående. Gjenværende risiko.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alle grønne
- `cd frontend && npm run test && npx tsc --noEmit` -- expected: alle grønne
- `docker compose up --build -d && cd frontend && npx playwright test` -- expected: alle grønne
