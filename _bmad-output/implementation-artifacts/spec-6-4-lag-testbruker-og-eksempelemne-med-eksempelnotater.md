---
title: 'Story 6.4: Lag testbruker og eksempelemne med eksempelnotater'
type: 'feature'
created: '2026-11-23'
status: 'done'
baseline_revision: '547d327003eee3b49b995e4930c935af97ac1463'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/autonom-kjoring.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Notatene er KI-laget plassholdere; akseptkriteriet «Silje har lest dem faglig» er ikke oppfylt.
    evidence: |-
      Instruksen for den autonome kjøringen (punkt 5) sier at story 6.4 bygges med merkede plassholdernotater og at issue #13 står åpent. Silje skriver eller godkjenner de endelige notatene selv.
    location: >-
      backend/app/seed/notater/
    severity: medium
  - summary: >-
      Krediteringen av OpenStax nevner ikke forfatterne av Principles of Marketing.
    evidence: |-
      KI-en navngir ikke forfattere den ikke kan sjekke. Silje bør legge dem til fra bokas egen side når hun skriver notatene (#13).
    location: >-
      backend/app/seed/notater/LISENS.md
    severity: low
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

### 2026-11-23 — Review pass
- verdicts: 31 findings — high 0, medium 3, low 19, false 3, maybe-false 0 (6 av de lave er avvist som sjeldne; 2 er utsatt)
- findings:
  - `[medium]` `[patch]` (verification) `python -m app.seed` var aldri prøvd mot en database: testen av `main()` ville bestått selv om seed ikke ble kalt — ny test `test_ar14_seed_main_seeds_the_database` kjører `main()` mot testdatabasen og logger inn som testbrukeren; testen av avslutningskoden sjekker nå at seed ble kalt.
  - `[low]` `[patch]` (verification, annet) Testen av `main()` rørte appens ekte motor og global logging — samme fikstur bruker nå en stand-in-motor og slår av `basicConfig`.
  - `[medium]` `[defer]` (intent) Notatene er KI-laget og ikke lest faglig av Silje — bestemt av instruksen (punkt 5); ført som utsatt, i PR-en og på #13.
  - `[false]` `[reject]` (intent) `docs/ki-prosess/` er ikke oppdatert — skrives etter byggeløpet i samme økt, før PR.
  - `[medium]` `[patch]` (intent) README nevnte ikke *Principles of Economics 3e* — nytt punkt med nedlastingslenke og kreditering, uten å gjette lisensen.
  - `[low]` `[reject]` (intent) NFR-2a-setningen i README er ikke ordrett — NFR-2a har ingen slik setning; meningen fra akseptkriteriet er gjengitt.
  - `[low]` `[patch]` (intent) Playwright-testen hopper over seg selv i stedet for å feile — med `E2E_REQUIRE_SEED=1` feiler den nå når testbrukeren mangler; uten hopper den over (kanttilfelle-issue).
  - `[low]` `[reject]` (intent) Modellkort testes ikke — ikke bygd ennå (epic 7); registertesten med ekstra type viser at de kommer med.
  - `[low]` `[reject]` (intent) Kontoslettingen ble flyttet, ikke bare gjenbrukt — nødvendig for å kalle den fra seed uten ruten; atferden er uendret og dekket av `test_account_delete.py`.
  - `[low]` `[patch]` (intent) Regex-en i AR-9-testen slapp gjennom alle navn som begynner med `PracticeSession` — tillater nå bare `PracticeSessionIn`.
  - `[low]` `[reject]` (edge) Feiler oppryddingen, blir en halv testbruker stående — krever at både jobbmerkingen og slettingen feiler (databasen nede); da vises «Seed clean-up failed» i loggen, og `down -v` står i README.
  - `[low]` `[patch]` (edge) Avbrudd (BaseException) hopper over oppryddingen — `main()` fanger nå bare `Exception` og `SystemExit`, så Ctrl+C stopper oppstarten i stedet for å starte appen med halv seed.
  - `[false]` `[reject]` (edge) To oppstarter samtidig gir falsk «Seed failed» — backenden kjører i én prosess, og `start.sh` kjører seed én gang.
  - `[low]` `[patch]` (edge) `plain_text` og `build_pdf` stripper linjer ulikt — `plain_text` stripper nå også.
  - `[low]` `[reject]` (edge) For lang tekst gir PyMuPDF-feil i stedet for `NoteTooLongError` — bare for utviklere, og feilen er like synlig.
  - `[low]` `[patch]` (edge) AR-9-regex — samme som intent-funnet.
  - `[low]` `[patch]` (edge) `main()`-testen endrer global logging og motor — samme som verifiseringsfunnet.
  - `[low]` `[reject]` (edge, påstand) README lover nytt forsøk også når oppryddingen feiler — samme sjeldne tilfelle som over.
  - `[low]` `[reject]` (blind) Halv testbruker ved feilet opprydding — samme som edge-funnet.
  - `[low]` `[patch]` (blind) Ctrl+C under seed stopper ikke containeren — samme rettelse som edge-funnet.
  - `[low]` `[patch]` (blind) LISENS.md sa både «skrevet om» og «ingen tekst fra boka», og manglet vanlig OpenStax-ordlyd — nå «Ingen PDF fra boka» og «Tilgjengelig gratis på …»; forfatterne er utsatt til Silje.
  - `[medium]` `[patch]` (blind) Reglene for notatene som skal erstatte plassholderne, sto ingen steder — README («Endre et notat») lister reglene og testene som må oppdateres.
  - `[low]` `[reject]` (blind) Byte-sjekken av PDF-ene feiler ved ny PyMuPDF — versjonen er låst i `uv.lock`, og feilen sier at PDF-ene må bygges på nytt.
  - `[low]` `[reject]` (blind) `feature`-feltet brukes ikke av noen innebygd type — det er for epic 7–9, slik akseptkriteriet krever.
  - `[low]` `[patch]` (blind) Playwright-testen skjuler en ødelagt seed — samme som intent-funnet.
  - `[low]` `[patch]` (blind) Datoene blir gamle i en database som ble fylt for lenge siden — README sier nå at datoene settes én gang og at `down -v` gir nye.
  - `[low]` `[reject]` (blind) Samme konstanter står flere steder — testene skal feile når teksten endres; README sier hvilke.
  - `[low]` `[patch]` (blind) README sa ikke hvordan en feilet seed ses — `Seed failed: <feiltype>` i `docker compose logs backend`.
  - `[false]` `[reject]` (blind) Kontoslettingen havner i feil modul — `files` eide allerede kontoslettingen (ruten lå der), og modulkommentaren sier at `files` kan kalle `identity`.
  - `[low]` `[patch]` (blind) AR-9-testen er svakere — samme som intent-funnet.
  - `[low]` `[patch]` (blind) Testnavnet `…_with_vertex` var misvisende — nå `test_ar14_seed_uses_mock_model_even_with_vertex`.

## Design Notes

**Plassholdere, ikke Siljes notater.** Akseptkriteriet «Silje har lest dem faglig» er ikke oppfylt i denne storien. Det står i PR-en, i `docs/ki-prosess/` og som kommentar på #13.

**Playwright mot en eldre database.** Seed kjører bare på tom database. Volumet `pgdata` som allerede finnes lokalt, har brukere fra tidligere testkjøringer og får derfor ingen testbruker. Testen hopper over seg selv med en forklaring når testbrukeren ikke kan logge inn, slik at de andre storiene ikke blir røde av en gammel database. Den kjøres grønt mot et nytt Compose-prosjekt med tom database. Valget føres som kanttilfelle.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- alle grønne.
- `cd frontend && npm run test` -- alle grønne.
- `docker compose -p sk-seedtest up --build -d && cd frontend && npx playwright test` -- alle grønne, også `testbruker.spec.ts`.

## Auto Run Result

Status: done

**Hva som er bygd:** `python -m app.seed` kjører mellom Alembic og Uvicorn og lager, bare på tom lokal database, testbrukeren `test@studiekamerat.no`, emnet «Markedsføring» med tre forelesninger og ett PDF-notat hver, flashcards og quiz fra mock-modellen (ventet ferdig, alle jobber `done`) og to økter på første forelesning. Feiler noe, slettes testbrukeren med den vanlige kontoslettingen, og appen starter likevel. Notatene er KI-laget og tydelig merket «PLASSHOLDER – skrives av Silje» (#13 står åpent).

**Filer:**
- `backend/app/seed/service.py` -- `seed_if_empty` og opprydding ved feil.
- `backend/app/seed/__main__.py`, `__init__.py` -- kjører seed fra `start.sh`, avslutter alltid med 0 (men ikke ved Ctrl+C).
- `backend/app/seed/build_notes.py` -- lager PDF-ene fra kildeteksten med PyMuPDF TextWriter.
- `backend/app/seed/notater/` -- tre plassholdernotater (`.md` + `.pdf`) og `LISENS.md`.
- `backend/start.sh` -- Alembic → seed → Uvicorn.
- `backend/app/modules/generation/registry.py` -- `ContentType.feature`, `enabled_content_types`, `unregister_content_type`.
- `backend/app/modules/files/service.py`, `router.py` -- kontoslettingen som tjeneste (`delete_account`), ruten uendret utad.
- `backend/app/modules/identity/service.py` -- `any_user_exists`.
- `backend/tests/test_seed.py` -- testene med krav-ID; `backend/tests/test_overview.py` -- AR-9-testen tillater bare `PracticeSessionIn`.
- `frontend/e2e/testbruker.spec.ts` -- innlogging som testbrukeren, emnet og flashcardøkt med axe.
- `README.md` -- avsnittet «Testbruker og eksempelemne».

**Gjennomgang:** 31 funn. 17 rettet (3 middels, 14 lave), 2 utsatt (Siljes faglige lesing og forfatterne i krediteringen), 12 avvist med begrunnelse i triageloggen over.

**Ny gjennomgang anbefales:** nei. Tre middels funn ble rettet, men alle rettelsene er verifisert av hele testpakken etterpå, og ingen konkret uverifisert risiko gjenstår (patchet: high 0, medium 3, low 14).

**Verifisering:**
- `uv run pytest` i `backend/`: 706 passed.
- `npm run test` i `frontend/`: 918 passed (73 filer).
- `E2E_REQUIRE_SEED=1 npx playwright test` mot `docker compose -p sk-seedtest up --build -d` (tom database, seed kjørt): 179 passed, også `testbruker.spec.ts`. Backend-loggen viste «Seed done».

**Gjenværende risiko:**
- Notatene er ikke lest faglig av Silje, og krediteringen mangler forfatternavn (utsatt, #13).
- Mot et eldre `pgdata`-volum med kontoer lages ingen testbruker, og Playwright-testen hopper da over seg selv (kanttilfelle).

