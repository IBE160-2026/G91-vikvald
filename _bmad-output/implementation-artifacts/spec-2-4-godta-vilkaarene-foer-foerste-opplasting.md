---
title: 'Story 2.4: Godta vilkårene før første opplasting'
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

**Problem:** Studenten kan laste opp notater uten å ha sett hvor de sendes og hva hun er ansvarlig for. Det finnes ikke noe `terms_accepted_at`, ingen vilkårsrute, ingen `TERMS_NOT_ACCEPTED` og ingen vilkårsdialog (story 2.4 i `epics.md`: FR-11, NFR-6, AR-6, UX-DR21, UX-DR23).

**Approach:** Migrering `0005` legger `terms_accepted_at` på `users`; `GET /api/identity/me` viser feltet, `POST /api/identity/terms` setter det én gang, og opplastingen avviser med `TERMS_NOT_ACCEPTED` når det er tomt. I frontend åpner opplastingsfeltet vilkårsdialogen (05) før første opplasting, og vilkårsteksten ligger i en felles komponent som kontosiden (2.7) kan bruke uten avkrysning.

## Boundaries & Constraints

**Always:**
- **Felt:** `users.terms_accepted_at` `DateTime(timezone=True)`, `nullable`, ingen standardverdi, lagt til i `0005_add_terms_accepted_at` (`down_revision = "0004_create_files"`, downgrade fjerner kolonnen; må virke på SQLite med `batch_alter_table`). Modellen i `identity/models.py`.
- **`UserOut`** får `terms_accepted_at: datetime | None` (UTC, ISO). Gjelder `me`, `register`, `login` og den nye ruten. SQLite gir tid uten sone; legg på UTC slik `_as_utc` gjør i `files/router.py`.
- **`POST /api/identity/terms`** (`current_user`) → `200` med `UserOut`. Setter `terms_accepted_at` til nå bare når feltet er tomt, med én `UPDATE … WHERE id = :id AND terms_accepted_at IS NULL`, så to samtidige kall eller et nytt kall aldri endrer tidspunktet. Ingen kropp.
- **Opplasting:** i `POST /api/lectures/{id}/files` kommer sjekken etter eierskapet (`get_lecture`, så andres forelesning fortsatt gir `404`) og før kroppen leses. Tomt felt → `TERMS_NOT_ACCEPTED`, ingenting lagres (rader eller disk).
- **Feilkode:** `TERMS_NOT_ACCEPTED` → `403` i `core/errors.py`. I `frontend/lib/messages.ts` peker den på `FALLBACK_MESSAGE`, fordi ingen godkjent tekst finnes (mønsteret i fila).
- **Vilkårstekst (`frontend/components/terms-text.tsx`):** felles komponent uten avkrysning. Overlinje «DITT ANSVAR» med punktene «Du er ansvarlig for materialet du laster opp.», «Last bare opp egne notater eller materiale du har rett til å bruke.», «Ikke last opp personopplysninger, for eksempel navn på medstudenter.»; overlinje «HVOR NOTATENE SENDES» med «Notatene sendes til språkmodellen hos Google, med behandling i EU, for å lage øvingsinnholdet.» og «Google kan logge forespørslene en periode for å oppdage misbruk.». Ordrett fra `epics.md` og skisse 05; teksten er lik i begge moduser. Når `useAppConfig().data?.demo_mode` er sann, står i tillegg «I demomodus sendes ingenting ut.» under punktene; ellers ikke. Overlinjene er overskrifter (`h3`) for skjermlesere, punktene er `ul`.
- **Vilkårsdialog (`frontend/modules/files/components/terms-dialog.tsx`):** felles `Dialog` med bredde 640, tittel «Før du laster opp», innledning «Du har valgt <filnavn>. Vi viser dette bare før den første opplastingen.» (én fil) eller «Du har valgt <N> filer. …» (flere), så `TermsText`, så en shadcn `Checkbox` med synlig etikett «Jeg har lest dette og laster bare opp materiale jeg har rett til å bruke.». «Godta og last opp» (med opplastingsikon) er `disabled` til boksen er krysset av. Avkrysningen nullstilles hver gang dialogen åpnes.
- **Felles `Dialog`** (`frontend/components/dialog.tsx`) får `primaryAction.disabled` og `primaryAction.icon`, uten å endre de andre dialogene.
- **Flyt i `UploadZone`:** filene fra «Velg PDF» eller dra og slipp går gjennom `requestUpload(files)`. Har `me` (`ME_QUERY_KEY`) `terms_accepted_at`, lastes de opp som før. Ellers lagres de som ventende og dialogen åpnes. «Godta og last opp» sender `POST /api/identity/terms`, oppdaterer `me` i spørringsbufferen med svaret, lukker dialogen og laster opp de ventende filene med `uploadAll` (samme meldinger som i 2.3). Feiler vilkårskallet (ikke 401), står dialogen åpen med `FALLBACK_MESSAGE` i en `role="alert"`, og ingenting lastes opp. «Avbryt», lukkekrysset og Esc tømmer de ventende filene uten noe kall. Fokus går tilbake til elementet som hadde fokus før dialogen åpnet (den felles dialogen gjør det).
- Testnavn har krav-ID (`test_fr11_…`, `test_nfr6_…`, `test_ar6_…`, `test_uxdr23_…`, «FR-11: …»). Kode og kommentarer på engelsk, synlig tekst på bokmål. axe uten brudd på 04 med dialogen åpen, med og uten demomodus.

**Never:**
- Ikke rør planleggingsdokumentene, `CLAUDE.md`, `.claude/settings.json`, `.git/hooks/` eller `frontend/e2e/brukerreiser/`.
- Ingen kontoside eller «Les vilkårene» (2.7), ingen erstatting (2.6), ingen ny tekst for `TERMS_NOT_ACCEPTED`, ingen juridisk tekst utover den ordrette teksten over.
- Ingen håndskrevet avkrysningsboks når shadcn har `checkbox`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ny bruker | `GET /api/identity/me` | `terms_accepted_at: null` | — |
| Godta | `POST /api/identity/terms` | `200`, `terms_accepted_at` ≈ nå (UTC); `me` viser samme verdi | — |
| Godta igjen | andre kall etter en stund | samme tidspunkt som første gang | — |
| Uten innlogging | `POST /api/identity/terms` | `401` | `UNAUTHENTICATED` |
| Opplasting uten vilkår | gyldig PDF, tomt felt | ingenting lagret (rader og disk) | `403 TERMS_NOT_ACCEPTED` |
| Opplasting etter vilkår | gyldig PDF | `201` som i 2.3 | — |
| Andres forelesning uten vilkår | `POST …/lectures/{olas}/files` | `404` (eierskap først) | `NOT_FOUND` |
| Én fil valgt, ikke godtatt | `notater.pdf` | dialogen åpnes, «Du har valgt notater.pdf. …», ingen opplasting | — |
| Tre filer valgt | 3 filer | «Du har valgt 3 filer. …» | — |
| Avbryt / kryss / Esc | dialog åpen | ingen kall, `terms_accepted_at` tomt, fokus tilbake | — |
| Godta og last opp | boksen krysset av | vilkår lagret, filene lastet opp, avviste filer får meldinger | — |
| Neste opplasting | godtatt | ingen dialog | — |
| Vilkårskall feiler | 500 | dialogen står, «Noe gikk galt. Prøv igjen.», ingenting lastet opp | `FALLBACK_MESSAGE` |

</intent-contract>

## Code Map

- `backend/app/modules/identity/models.py` -- `User`; legg til `terms_accepted_at`.
- `backend/app/modules/identity/schemas.py` -- `UserOut`; legg til feltet.
- `backend/app/modules/identity/service.py` -- legg til `accept_terms(session, user)` (betinget `UPDATE`, så `refresh`).
- `backend/app/modules/identity/router.py` -- `me`, `register`, `login` bygger `UserOut` for hånd; lag én hjelper `_user_out(user)` med UTC; ny rute `POST /terms`.
- `backend/app/modules/files/router.py:upload_file` -- sjekk `user.terms_accepted_at` etter `get_lecture`, før `_read_upload`.
- `backend/app/core/errors.py` -- `TERMS_NOT_ACCEPTED: 403`.
- `backend/alembic/versions/0004_create_files.py` -- mønster for `0005_add_terms_accepted_at.py`.
- `backend/tests/test_migrations.py` -- `test_ar13_migreringene_samsvarer_med_modellene` må gå; legg til test for kolonnen og downgrade til `0004`.
- `backend/tests/test_files.py` -- `_log_in_new_user` (fra `test_subjects.py`) gir en bruker uten vilkår; opplastingstestene trenger en bruker som har godtatt (`_new_lecture` eller en egen hjelper kaller `POST /api/identity/terms`).
- `backend/tests/test_identity.py` -- mønster for nye `test_fr11_…`-tester; ev. ny `test_terms.py`.
- `backend/tests/test_route_guard.py` -- dekker den nye ruten automatisk.
- `frontend/lib/messages.ts` (+ test) -- ny nøkkel.
- `frontend/modules/identity/{types,api}.ts` -- `User.terms_accepted_at: string | null`; `acceptTerms()`.
- `frontend/modules/identity/components/require-login.tsx` -- `ME_QUERY_KEY`; `UploadZone` leser samme spørring (alltid lastet når siden vises).
- `frontend/components/dialog.tsx` (+ `dialog.test.tsx`) -- `primaryAction.disabled`, `primaryAction.icon`.
- `frontend/components/ui/checkbox.tsx` (ny, `npx shadcn add checkbox`) -- tilpass til DESIGN.md: 20 px, `rounded-kbd`, kant `border-control`, avkrysset `bg-brand` med hvit hake. Sjekk `package.json` etterpå.
- `frontend/components/terms-text.tsx` (ny) -- felles vilkårstekst.
- `frontend/modules/files/components/{terms-dialog,upload-zone}.tsx` -- dialogen og flyten; tester i `frontend/modules/files/` eller i `lecture-page.test.tsx` (falsk backend i `fetchMock` må svare på `/api/identity/me` og `/api/identity/terms`).
- `frontend/e2e/filer.spec.ts` -- `registerNewUser`; eksisterende tester trenger godtatte vilkår (via API). Ny `frontend/e2e/vilkar.spec.ts` for dialogflyten.

## Tasks & Acceptance

**Execution:**
- `backend/alembic/versions/0005_add_terms_accepted_at.py`, `identity/{models,schemas,service,router}.py` -- felt, `me`, `POST /terms` -- FR-11
- `backend/app/core/errors.py`, `files/router.py` -- `TERMS_NOT_ACCEPTED` før kroppen leses -- AR-6
- `backend/tests/{test_terms,test_files,test_migrations}.py` -- matrisens backendrader, idempotens, ingenting lagret, eierskap først, migrering opp og ned -- AR-17
- `frontend/lib/messages.ts`, `frontend/modules/identity/{types,api}.ts` -- kode, type og kall
- `frontend/components/{dialog,terms-text,ui/checkbox}.tsx` + tester -- deaktivert hovedknapp, felles tekst med og uten demomodus -- NFR-6, UX-DR23
- `frontend/modules/files/components/{terms-dialog,upload-zone}.tsx` + tester -- dialog før første opplasting, godta, avbryt, feil i vilkårskallet, ingen dialog når godtatt -- FR-11, UX-DR21
- `frontend/e2e/filer.spec.ts`, `frontend/e2e/vilkar.spec.ts` -- godta via API i de gamle testene; ny e2e: dialogen med bare tastatur, fokus fanget, Esc lar fokus gå tilbake og laster ingenting opp, godta laster opp, ingen dialog neste gang, axe med dialogen åpen -- NFR-8, NFR-12

**Acceptance Criteria:**
- Given forelesningssiden og en student uten vilkår, when hun velger en PDF med «Velg PDF» med bare tastatur, then åpnes «Før du laster opp» med filnavnet før noe lastes opp, fokus står i dialogen, «Godta og last opp» er ikke aktiv før boksen krysses av, og etter «Godta og last opp» står fila i «Filer».
- Given dialogen åpen, when hun trykker Esc, then lukkes den, ingenting lastes opp, `GET /api/identity/me` viser fortsatt `terms_accepted_at: null`, og fokus står på «Velg PDF».
- Given at hun har godtatt, when hun laster opp igjen (også etter omlasting), then vises ikke dialogen.
- Given demomodus, when dialogen vises, then står «I demomodus sendes ingenting ut.» i den; uten demomodus står setningen ikke der (Vitest).
- Given 04 med dialogen åpen, when axe kjøres, then finnes ingen brudd.

## Spec Change Log

## Review Triage Log

## Design Notes

- **403 for `TERMS_NOT_ACCEPTED`:** studenten er innlogget, men mangler en forutsetning. `404` er forbeholdt andres data (AD-2), `422` er for innholdet i fila. Kanttilfelle.
- **Melding:** ingen godkjent tekst for `TERMS_NOT_ACCEPTED`. Frontend åpner dialogen før kallet, så koden når bare brukeren når bufferen og databasen er uenige. Reserveteksten brukes. Kanttilfelle.
- **Flere filer:** `epics.md` sier «antall filer»; teksten blir «Du har valgt 3 filer.» med resten av setningen uendret. Skisse 05 viser også «(12 sider)», men sidetallet er ukjent før fila er lest av backend, så det utelates som i `epics.md`. Kanttilfelle.
- **Demosetningen** står som et eget avsnitt under punktene om Google, ikke som et punkt, fordi den forteller om modusen og ikke er et vilkår. Kanttilfelle.
- **Betinget `UPDATE`** i stedet for «les, sjekk, skriv», så to samtidige kall ikke kan overskrive hverandre.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alle grønne
- `cd frontend && npm run test && npx tsc --noEmit` -- expected: alle grønne
- `docker compose up --build -d && cd frontend && npx playwright test` -- expected: alle grønne
