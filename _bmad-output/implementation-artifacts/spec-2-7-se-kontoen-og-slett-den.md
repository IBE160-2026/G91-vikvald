---
title: 'Story 2.7: Se kontoen og slett den'
type: 'feature'
created: '2026-11-21'
baseline_revision: 'ba74d84826cb1dcfcb6a4fe6e96bc76482327c33'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Ruten /konto og hele kontoflyten kontrolleres bare av Playwright, som CI ikke kjører.
    evidence: |-
      .github/workflows/ci.yml kjører bare pytest og vitest; e2e kjøres for hånd i hver story (utsatt også i 2.5 og 2.6).
    location: >-
      frontend/e2e/konto.spec.ts
    severity: low
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

### 2026-11-21 — Review pass
- verdicts: 30 findings — high 0, medium 1, low 18, false 11, maybe-false 0
- findings:
  - `[false]` `[reject]` (blind) Tellingen på kontosiden blir utdatert — `staleTime` er standard 0 i `lib/query-client.ts`, så forhåndsvisningen hentes på nytt hver gang siden åpnes; bekreftelsen henter alltid ferske tall.
  - `[false]` `[reject]` (blind) Ingen feiltilstand for `me` — siden vises bare inne i `RequireLogin`, som selv viser reserveteksten ved feil på `/me` og ikke viser barna; dataene er alltid i bufferen her.
  - `[low]` `[reject]` (blind) `router.push` i stedet for `replace` etter utlogging/sletting — samme flyt som i 1.6 (spesifikasjonen krever samme flyt); Tilbake gir 401 og sender til innloggingen igjen.
  - `[low]` `[reject]` (blind) To knapper heter «Lukk» i visningsdialogen — valgt i Design Notes (kanttilfelle); axe finner ingen brudd.
  - `[false]` `[reject]` (blind) Teksten nevner ikke forelesningene — teksten er ordrett fra akseptkriteriet.
  - `[false]` `[reject]` (blind) `DeleteScope` mangler emne-ID-er — AD-7 lar sammendraget høre til forelesningen; ingen innholdstype hører til et emne.
  - `[low]` `[reject]` (blind) Forhåndsvisningen henter ID-lister for å telle — listene trengs som `DeleteScope` for registeret; mengdene er små (én students semester).
  - `[low]` `[reject]` (blind) `test_ar7_registered_kinds_er_tom_i_epic_2` feiler i epic 3 — bevisst epic-markør, samme mønster som `test_ar7_registeret_er_tomt_i_epic_2` fra 2.5.
  - `[low]` `[patch]` (blind) Fast pause `waitForTimeout(300)` i e2e — byttet med sjekk av at forhåndsvisningen gir de samme tellingene etter avbrudd.
  - `[false]` `[reject]` (blind) Svak påstand om omrissknappen i `dialog.test.tsx` — `Button` setter alltid `data-variant`, så reserven `className` brukes aldri, og verdien er nøyaktig «outline».
  - `[low]` `[reject]` (blind) Ingen infologg om slettet konto — ikke krav; ville legge til ny logging uten nytte for studenten.
  - `[low]` `[reject]` (blind) «Logg ut» viser ikke at noe skjer — samme oppførsel som toppfeltet fra 1.6.
  - `[false]` `[reject]` (blind) `formatLocalDate` gir NaN ved ugyldig dato — backend gir alltid en gyldig ISO-tid (Pydantic `datetime`); tilfellet kan ikke nås.
  - `[false]` `[reject]` (blind) KI-sporet mangler — skrives i samme økt etter gjennomgangen, før PR-en.
  - `[low]` `[defer]` (verification-gap) `/konto`-ruten testes bare av Playwright, som CI ikke kjører — prosjektvalg fra før (utsatt også i 2.5 og 2.6); Playwright kjøres for hånd i hver story.
  - `[low]` `[reject]` (verification-gap) Konto slettet i en annen fane gir 401 og «Du er logget ut» — skjer bare med to faner; meldingen er sann (hun er logget ut), og en egen gren gir mer kode.
  - `[false]` `[reject]` (edge) Feil på `/me` gir tom side — samme som andre rad: `RequireLogin` tar feilen.
  - `[low]` `[reject]` (edge) `queryClient.clear()` før navigasjon gir nye kall og 401 — samme rekkefølge som utloggingen fra 1.6; flagget er fjernet først, så ingen melding vises, og begge veier går til `/logg-inn` (testet i e2e).
  - `[low]` `[reject]` (edge) 401 ved sletting fra en annen fane — samme rotårsak som verification-gap-raden om to faner.
  - `[low]` `[reject]` (edge) Tom mappe kan bli igjen ved samtidig opplasting — gjenværende risiko i Design Notes; en lås krever endringer i opplastingen.
  - `[false]` `[reject]` (edge) Annen unntakstype enn `OSError` fra `rmtree` — `shutil.rmtree` kaster bare `OSError` og underklasser.
  - `[false]` `[reject]` (edge) Ugyldig `terms_accepted_at` gir NaN — samme som blind-raden; kan ikke nås.
  - `[low]` `[reject]` (edge) To «Logg ut»-knapper kan gi to samtidige utlogginger — utlogging er idempotent, og begge går til `/logg-inn`.
  - `[medium]` `[patch]` (intent) Bekreftelsen sier ikke at alt slettes for godt — `note` med `accountDeletedText` lagt til i bekreftelsen, med test i Vitest og Playwright.
  - `[low]` `[reject]` (intent) Uten demomodus testes bare i nettleseren — samme metode som 2.4; backend har ingen egen kontooppførsel for modusen.
  - `[low]` `[patch]` (intent) «Logg ut» i kortet og «Avbryt» bare klikket i e2e — nå med tastaturet (`tabTo` og Enter).
  - `[low]` `[reject]` (intent) Fast liste over tabeller i backendtesten — dekker alle tabellene appen har; nye tabeller i senere epics får egne tester.
  - `[low]` `[reject]` (intent) Rød omrissknapp og sidemeny uten valg er ikke påstått — dekket av skjermbildene og sammenligningen med skisse 15.
  - `[false]` `[reject]` (intent) Registerteksten bare enhetstestet — registeret er tomt i epic 2, så nettleseren kan ikke vise den.
  - `[low]` `[reject]` (intent) Testnavn med E16 og NFR-8 — E16 er kanttilfellet fra epics.md og NFR-8 kravet om tastatur og axe; begge er sporbare ID-er.

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

## Auto Run Result

**Sammendrag:** Studenten har en kontoside (`/konto`) med sidemenyen, h1 «Konto», undertittelen og demomerket i demomodus. Det er tre kort. Innlogging viser e-posten, «Lagret kryptert, aldri i klartekst» og «Logg ut» (samme flyt som toppfeltet, nå i hooken `useLogout`). Vilkår og personvern viser når vilkårene ble godtatt eller «Ikke godtatt ennå …», språkmodellen og «Les vilkårene», som åpner den felles vilkårsteksten i en dialog med bare «Lukk». Slett kontoen viser hva som slettes, «Du har nå …» med tellingene og «Slett kontoen …». Bekreftelsen er den felles fra 2.5, med e-posten, «… slettes for godt.», tellingene og «Det kan ikke angres.». Backend har `GET /api/identity/me/delete-preview` og `DELETE /api/identity/me`, som sletter brukerraden i én transaksjon (alt annet går med `ON DELETE CASCADE`), fjerner hele brukermappa med `core/storage` etter commit og sletter cookien.

**Filer:**
- `backend/app/modules/files/{router,schemas}.py`, `backend/app/main.py` -- `account_router` med forhåndsvisning og sletting
- `backend/app/modules/identity/service.py` -- `delete_user`
- `backend/app/modules/subjects/service.py` -- `subject_ids_for_user`, `lecture_ids_for_subjects`
- `backend/app/modules/content/registry.py` -- `registered_kinds()`, `subjects` reservert
- `backend/tests/test_account_delete.py` -- 14 tester for alle backendradene i matrisen
- `frontend/lib/{delete-text,messages}.ts` + tester -- `account`, `accountCountsSentence`, `accountDeletedText`, `subjects`
- `frontend/components/dialog.tsx` + test -- dialog uten hovedhandling («Lukk»)
- `frontend/modules/identity/{use-logout.ts,api.ts,types.ts,components/account-links.tsx}` -- felles utlogging og API
- `frontend/modules/identity/pages/account-page.tsx` + `account-page.test.tsx`, `frontend/app/(app)/konto/page.tsx` -- kontosiden
- `frontend/e2e/konto.spec.ts` -- 6 tester: axe med og uten demomodus og med begge dialogene, tastatur, avbryt, sletting, utlogging
- `docs/skjermbilder/story-2-7/` -- skjermbilder i 1280 og 768 px

**Gjennomgang:** 30 funn. Rettet: «slettes for godt» i bekreftelsen (medium), fast pause byttet med tellingssjekk i e2e og tastatur for «Logg ut» og «Avbryt» (low). Utsatt: e2e i CI (fra før). Avvist: 11 `false` og 15 `low` med grunner i Review Triage Log.

**Ny gjennomgang anbefales:** nei. Rettet: high 0, medium 1, low 2.

**Verifisering:** `uv run pytest` 313 grønne; `npm run test` 471 grønne og `tsc --noEmit` uten feil; `docker compose up --build` + `npx playwright test` 60 grønne.

**Gjenværende risiko:** en opplasting samtidig med kontoslettingen kan etterlate en tom mappe. Er kontoen slettet i en annen fane, gir slettingen 401 og «Du er logget ut». Playwright kjøres ikke i CI.
