---
title: 'Story 6.4: Lag testbruker og eksempelemne med eksempelnotater'
type: 'feature'
created: '2026-11-23'
status: 'in-progress'
baseline_revision: '547d327003eee3b49b995e4930c935af97ac1463'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/autonom-kjoring.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Sensor må i dag lage konto, emne, forelesninger og PDF-er selv før hun kan prøve noe. NFR-3 og AR-14 krever en ferdig testbruker med emnet «Markedsføring», forelesninger, filer, generert innhold og noen økter, laget automatisk når databasen er tom.

**Approach:** En ny pakke `app/seed` med `seed_if_empty`, som `start.sh` kjører mellom Alembic og Uvicorn (`python -m app.seed`). Den bruker bare de vanlige tjenestene (`identity`, `subjects`, `files`, `generation`, `practice`) og mock-modellen. Tre korte notater ligger som kildetekst (Markdown) og PDF i `app/seed/notater/`. Etter instruksen for den autonome kjøringen (punkt 5) er notatene **tydelig merkede plassholdere** («PLASSHOLDER – skrives av Silje»), laget av KI. Issue #13 står åpent til Silje har skrevet eller godkjent de endelige notatene.

## Boundaries & Constraints

**Always:**
- Seed kjører bare når `APP_ENV=local` og tabellen `users` er tom. Ellers gjør den ingenting, så en ny oppstart aldri lager dobbelt testbruker eller emne.
- Testbruker `test@studiekamerat.no` / `studiekamerat` gjennom `register_user`; vilkårene godtas med `accept_terms`.
- Emnet «Markedsføring» med eksamen 21 dager etter seed-dagen. Én forelesning per notat, datert 21, 14 og 7 dager før seed-dagen. PDF-ene lastes opp med `pdf.read_pages` og `store_file`.
- Genereringen går gjennom `create_job` + `run_job` (det samme som `POST /api/lectures/{id}/jobs`), med `MockGenerator()` uansett `LLM_PROVIDER`, og med `await` (ingen bakgrunnsoppgave). Parametrene lages med `JobCreate(kind=...)`, slik ruten gjør.
- Typene hentes fra registeret: alle registrerte typer uten bryter, og typer med bryter (`ContentType.feature`) bare når `FEATURE_*` er på.
- En jobb som ikke ender som `done`, regnes som feil i seed.
- To økter lagres med `practice.save_session` (flashcards og quiz) på første forelesning, så de to andre står som ikke øvd.
- Feiler seed, logges bare feiltypen, og testbrukeren slettes med den vanlige kontoslettingen (flyttet fra `files/router.py` til `files/service.delete_account`, som ruten også bruker). Backenden starter likevel, og seed prøves igjen ved neste oppstart.
- Hvert notat har øverst «PLASSHOLDER – skrives av Silje», minst fire definisjonssetninger med «er» og én punktliste med minst tre punkter (linjer som begynner med «• »). Nederst krediteres OpenStax *Principles of Marketing* med lenke, at teksten er endret, og CC BY-NC-SA 4.0. `notater/LISENS.md` gjelder for notatene.
- PDF-ene lages fra kildeteksten med et skript (`python -m app.seed.build_notes`), og en test sjekker at PDF-teksten stemmer med kildeteksten.
- README: testbrukerens e-post og passord, setningen om at demoinnholdet er enkelt og mekanisk (NFR-2a), hvor OpenStax-bøkene lastes ned og krediteres, at notatene er plassholdere, og at seed bare kjører på tom database.
- Testnavn har krav-ID (`test_nfr3_…`, `test_ar14_…`).

**Never:**
- Ingen egne SQL-setninger i seed, ingen ny migrering, ingen OpenStax-PDF i repoet, ingen kall til Vertex.
- Ingen KI-tekst som ser ut som Siljes egne notater. #13 lukkes ikke.
- Seed sletter aldri noe annet enn testbrukeren den selv laget.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tom database | `APP_ENV=local`, ingen brukere | Testbruker, emne, 3 forelesninger, 3 filer, jobber `done` for hver aktiv type, 2 økter | – |
| Ikke tom | Minst én bruker finnes | Ingenting skjer | INFO-linje |
| Ikke lokal | `APP_ENV=production` | Ingenting skjer | INFO-linje |
| `LLM_PROVIDER=vertex` | Tom database | Seed bruker likevel mock-modellen | – |
| Feil underveis | F.eks. `save_session` kaster | Testbrukeren og mappa hennes slettes; databasen tom | ERROR med feiltypen, prosessen avslutter med 0 |
| Jobb feiler | `run_job` gir `failed` | Behandles som feil over | Som over |
| Ekstra type på | Ny type med `feature="summary"`, bryter på | Jobb `done` og rader av typen | – |
| Ekstra type av | Samme type, bryter av | Ingen jobb og ingen rader av typen | – |

</intent-contract>

## Code Map

- `backend/start.sh` -- legg `python -m app.seed` mellom `alembic upgrade head` og `uvicorn`.
- `backend/app/main.py:46-60` -- `lifespan` kjører `fail_interrupted_jobs` (jobboppryddingen); kommentaren nevner allerede seed i `start.sh`.
- `backend/app/core/config.py` -- `APP_ENV`, `FEATURE_*`, `LLM_PROVIDER`.
- `backend/app/core/features.py` -- `Feature`-typen gjenbrukes på `ContentType.feature`.
- `backend/app/core/db.py` -- `SessionLocal` brukes av `__main__`; tester sender egen sessionmaker.
- `backend/app/modules/identity/service.py` -- `register_user`, `accept_terms`, `delete_user`.
- `backend/app/modules/subjects/service.py` -- `create_subject(session, user_id, name, exam_date)`, `create_lecture(session, user_id, subject_id: str, name, date)`.
- `backend/app/modules/files/pdf.py` -- `read_pages(data)`; `service.py` -- `store_file(...)`. Ny `delete_account(session, user_id)` her.
- `backend/app/modules/files/router.py:363-383` -- `delete_account`-ruten: kjernen flyttes til service, ruten beholder cookie og 204.
- `backend/app/modules/generation/registry.py` -- `ContentType` får `feature: Feature | None = None`; ny `enabled_content_types()`.
- `backend/app/modules/generation/service.py:94,165` -- `create_job`, `run_job` (svelger feil og lagrer dem på jobben).
- `backend/app/modules/generation/schemas.py` -- `JobCreate` gir parametrene (quiz får `difficulty: medium`).
- `backend/app/modules/generation/mock.py` -- `MockGenerator`.
- `backend/app/modules/generation/flashcards.py:23-50` -- regelen for definisjonssetninger: 1–6 ord før første frittstående «er»; setninger deles på «. ». Overskrifter uten punktum smelter sammen med neste setning, så første setning etter en overskrift må ikke være en definisjon, og «er» brukes ikke utenfor definisjoner.
- `backend/app/modules/practice/service.py:27` -- `save_session(session, user_id, PracticeSessionIn)`.
- `backend/tests/conftest.py` -- `engine`, `session`, `upload_dir`-fiksturene.
- `frontend/e2e/hele-emnet.spec.ts` -- mønster for «Øv på hele emnet» og axe.
- `README.md:50-52` -- «En ferdig testbruker kommer i en senere versjon.» erstattes.

## Tasks & Acceptance

**Execution:**
- `backend/app/seed/notater/*.md`, `*.pdf`, `LISENS.md` -- tre plassholdernotater (markedsmiksen, segmentering, AIDA) og lisensfila -- NFR-3.
- `backend/app/seed/build_notes.py` -- lager PDF-ene fra kildeteksten med PyMuPDF.
- `backend/app/seed/service.py` -- `seed_if_empty(sessionmaker, settings)` og opprydding ved feil -- AR-14.
- `backend/app/seed/__main__.py`, `__init__.py` -- kjører seed med `SessionLocal`, avslutter alltid med 0.
- `backend/start.sh` -- rekkefølgen Alembic → seed → Uvicorn.
- `backend/app/modules/generation/registry.py` -- `feature` og `enabled_content_types`.
- `backend/app/modules/files/service.py`, `router.py` -- `delete_account` som tjeneste.
- `backend/tests/test_seed.py` -- `test_nfr3_seed_creates_test_user_and_subject`, `test_ar14_seed_only_when_empty_and_local`, mock ved vertex, ingen `failed`, feil gir tom database, ekstra type på/av, øvd/ikke øvd i oversikten, rekkefølgen i `start.sh`, notatene (plassholder, definisjoner, punktliste, kreditering, PDF = kildetekst, lisensfil, ingen andre PDF-er).
- `frontend/e2e/testbruker.spec.ts` -- logger inn som testbrukeren, åpner «Markedsføring», starter flashcardøkt; axe på hver side.
- `README.md` -- avsnittet om testbrukeren og eksempelemnet.

**Acceptance Criteria:**
- Given en tom database og `APP_ENV=local`, when backend starter i Docker, then kan sensor logge inn som `test@studiekamerat.no` og se «Markedsføring» med tre forelesninger, filer og ferdige flashcards og quiz, og øve med en gang.
- Given en database som ikke er tom, when backend starter på nytt, then finnes testbrukeren og emnet fortsatt bare én gang.
- Given notatmappa, when den leses, then har hvert notat plassholdermerket, krediteringen og lisensen, og ingen OpenStax-PDF ligger i repoet.

## Spec Change Log

## Review Triage Log

## Design Notes

**Plassholdere, ikke Siljes notater.** Akseptkriteriet «Silje har lest dem faglig» er ikke oppfylt i denne storien. Det står i PR-en, i `docs/ki-prosess/` og som kommentar på #13.

**Playwright mot en eldre database.** Seed kjører bare på tom database. Volumet `pgdata` som allerede finnes lokalt, har brukere fra tidligere testkjøringer og får derfor ingen testbruker. Testen hopper over seg selv med en forklaring når testbrukeren ikke kan logge inn, slik at de andre storiene ikke blir røde av en gammel database. Den kjøres grønt mot et nytt Compose-prosjekt med tom database. Valget føres som kanttilfelle.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- alle grønne.
- `cd frontend && npm run test` -- alle grønne.
- `docker compose -p sk-seedtest up --build -d && cd frontend && npx playwright test` -- alle grønne, også `testbruker.spec.ts`.
