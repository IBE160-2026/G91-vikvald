---
title: 'Story 6.5: Fullfør README, legg til lisens og vis testdekningen'
type: 'chore'
created: '2026-11-23'
status: 'done'
baseline_revision: '47d722381a1c9ced8060d9d98c2a4578a16ea00b'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/autonom-kjoring.md'
warnings: ['oversized']
deferred:
  - summary: >-
      SK-11 er kjørt av KI, ikke av Silje som akseptkriteriet sier.
    evidence: |-
      Kjøringen brukte eget Compose-prosjektnavn, innlogging med Playwright og en maskin med programmene installert fra før. Silje må følge README ordrett selv og føre en ny rad i testplanen (issue #290).
    location: >-
      docs/testplan.md (SK-11: ren kopi)
    severity: medium
  - summary: >-
      Lisensvarianten (AGPL-3.0-only eller -or-later) er ikke valgt, og appen har ingen lenke til kildekoden (AGPL §13).
    evidence: |-
      Storien og #25 sier bare «AGPL-3.0». Varianten avgjør merknaden i kildefilene og et eventuelt license-felt i package.json og pyproject.toml. §13 gjelder først når andre bruker en endret utgave over nett. Begge er Siljes valg (kanttilfelle-issue).
    location: >-
      LICENSE, README.md (Lisens og kreditering)
    severity: low
---

<intent-contract>

## Intent

**Problem:** Sensor skal kunne starte appen fra en ren kopi, se lisensen og se hvilke krav som er testet (NFR-1, AR-19, SK-1, SK-11). Repoet har ingen `LICENSE` (issue #25), README mangler lisens, kreditering, lenke til testplanen og kopierbare kodeblokker for flere kommandoer (issue #27), og `docs/testplan.md` finnes ikke. Story 6.2 utsatte hit at FR-2 og FR-31 med ekte modell bare kan måles manuelt.

**Approach:** Legg den offisielle AGPL-3.0-teksten fra gnu.org uendret i `LICENSE`. Skriv `docs/testplan.md` med én rad per må ha-krav og én per SK-2–SK-22, og en pytest-test som håndhever SK-1 ved å lese testnavnene i backend, Vitest og Playwright. Fullfør README. Prøv README fra en ren klone uten `.env` (SK-11), og før resultatet i testplanen.

## Boundaries & Constraints

**Always:**
- `LICENSE` er byte for byte lik <https://www.gnu.org/licenses/agpl-3.0.txt> (SHA-256 `0d96a4ff68ad6d4b6f1f30f713b18d5184912ba8dd389f86aa7710db079abcb0`), og en test sjekker det.
- README nevner, fra toppen: programmer med versjon, `docker compose up` og <http://localhost:3000>, demomodus uten `.env`, testbrukeren, pytest/Vitest/Playwright, Gemini, demotekst og OpenStax, lenker til planleggingsdokumentene, `docs/testplan.md` og `docs/testing/brukerreiser.md`, og et avsnitt om lisens og kreditering: koden er AGPL-3.0 fordi PyMuPDF er AGPL og repoet er offentlig, eksempelnotatene er CC BY-NC-SA 4.0.
- Hver kommando leseren skal kjøre, står i en kodeblokk (```` ```bash ````). Innebygd kode er greit for navn på filer, innstillinger og verdier.
- `docs/testplan.md` har én tabellrad per må ha-krav (FR-1–FR-41, FR-56–FR-58) med kolonnene Krav | Hva | Automatiske tester | Manuell kontroll. Automatiske tester er testfiler i backticks. Manuell kontroll er `–` eller en begrunnelse. FR-2 og FR-31 har begrunnelse (ekte modell, SK-13/SK-15), i tillegg til testene av instruksene. FR-40/FR-41 viser til SK-16.
- Testplanen har én rad per SK-2–SK-22 med hvor det kontrolleres og en tom resultatkolonne for story 6.6, og et avsnitt for SK-11-kjøringen med dato, commit, hvem som kjørte og avvik. Kjøringen er gjort av KI, og Silje skal gjenta den selv (akseptkriteriet sier «Silje følger README»).
- `test_sk1_every_must_requirement_has_test_or_reason` finner krav-ID-er i testnavn: backend `test_fr<n>_…` (alle `fr<n>`-ledd i navnet), Vitest/Playwright `FR-<n>` i tittelen til `it`/`test`/`describe`. Mangler et krav både test og begrunnelse, feiler testen med lista over kravene. En egen test sjekker at hjelpefunksjonen faktisk lister manglende krav.
- `test_nfr4_env_example_lists_all_settings` (erstatter `test_nfr4_alle_innstillinger_staar_i_env_example`): alle felt i `Settings` står i `.env.example` med en kommentarlinje rett over, de hemmelige (`JWT_SECRET`, `GOOGLE_CLOUD_PROJECT`) er tomme, og backend kan importeres i en underprosess med tomt miljø (bare `PATH` og `APP_ENV=local`) uten å lese noen `.env`.
- Feilmerkede testnavn som hindrer at SK-1-testen måler riktig, rettes: FR-22-testene i `test_jobs.py` het `test_fr19_…`, FR-19-testen i `test_flashcards.py` het `test_fr20_…`, og Vitest-testen «FR-19, UX-DR44» i `lecture-page.test.tsx` handler om FR-18/FR-22.
- SK-11 kjøres i en klone under scratchpad med eget Compose-prosjekt (`-p sk-renkopi`) og ryddes med `down -v`. Hovedprosjektets volum `pgdata` røres ikke.

**Never:**
- Ingen endring i lisensteksten, ingen lisenshoder i kildefilene, og ingen `license`-felt i `package.json`/`pyproject.toml` (valget «only» eller «or later» er Siljes, se Design Notes).
- Ikke rør planleggingsdokumentene, `CLAUDE.md`, `.claude/settings.json` eller `frontend/e2e-skjermbilder/`.
- Ikke skriv resultater fra story 6.6 (kvalitet, nettlesere) i testplanen; bare plassen til dem.
- Ingen personopplysninger i testplanen (SK-11 føres som «KI (autonom kjøring)»).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Alle dekket | Hvert må ha-krav har test eller begrunnelse | SK-1-testen er grønn | – |
| Krav mangler | Et krav uten test og med `–` i testplanen | Testen feiler | Melding lister f.eks. `FR-22` |
| Rad mangler | Et må ha-krav har ingen rad i testplanen | Testen feiler | Melding lister kravet |
| Bare manuelt | Krav uten test, med begrunnelse | Regnes som dekket | – |
| Fil i testplanen finnes ikke | Testfil omdøpt eller slettet | Testen feiler | Melding lister fila |
| Endret lisens | `LICENSE` endret | Testen feiler | Viser forventet hash |
| `.env` i rota | Silje har egen `.env` | Miljøtesten leser den ikke | – |

</intent-contract>

## Code Map

- `README.md` -- finnes og dekker det meste (programmer, oppstart, testbruker, Gemini, innstillinger, planleggingsdokumenter). Mangler: lisens/kreditering, lenke til testplan og brukerreiser, kodeblokker for testkommandoene (står bare i tabell), `docker compose up --build`, `docker compose down`, `docker compose down -v`, `docker compose logs backend`, `uv run python -m app.seed.build_notes`, og `E2E_REQUIRE_SEED=1` for `testbruker.spec.ts`.
- `.env.example` -- har alle innstillingene med kommentar over; `POSTGRES_PASSWORD` og `API_INTERNAL_URL` er Compose-/frontend-innstillinger, ikke felt i `Settings`.
- `backend/app/core/config.py` -- `Settings` (felt: APP_ENV, DATABASE_URL, LLM_PROVIDER, GOOGLE_CLOUD_PROJECT, VERTEX_MODEL, VERTEX_THINKING, FEATURE_*, JWT_SECRET, UPLOAD_DIR, MAX_UPLOAD_MB); `model_config["env_file"]` leser rot-`.env` og `./.env`.
- `backend/tests/test_config.py:118` -- `test_nfr4_alle_innstillinger_staar_i_env_example` byttes ut; `_start_backend` er mønster for underprosess.
- `backend/tests/test_jobs.py:257,271` -- `test_fr19_…` → `test_fr22_…`.
- `backend/tests/test_flashcards.py:52` -- `test_fr20_bare_sporsmal_og_begrepskort_kommer_med` → `test_fr19_…`.
- `frontend/modules/subjects/lecture-page.test.tsx:1163` -- tittel «FR-19, UX-DR44» → «FR-18, FR-22, UX-DR44».
- `frontend/vitest.config.ts` -- Vitest-filer: `{app,lib,modules,components}/**/*.test.{ts,tsx}`; `frontend/playwright.config.ts` -- `e2e/**/*.spec.ts`.
- `docs/testing/brukerreiser.md` -- testplanen lenker hit for flytene.
- `.github/workflows/ci.yml` -- pytest kjører med hele repoet sjekket ut, så SK-1-testen kan lese `frontend/`.
- `_bmad-output/implementation-artifacts/spec-6-2-…md` -- utsatt punkt om FR-2/FR-31 manuelt.

## Tasks & Acceptance

**Execution:**
- `LICENSE` -- offisiell AGPL-3.0 fra gnu.org, uendret -- AR-19, #25.
- `backend/tests/test_testplan.py` -- `test_sk1_every_must_requirement_has_test_or_reason`, `test_sk1_testplan_has_one_row_per_must_requirement`, `test_sk1_testplan_files_exist`, `test_sk1_missing_requirements_are_listed` (hjelpefunksjonen med falske data), `test_sk1_testplan_lists_sk2_to_sk22`, `test_ar19_license_is_unmodified_agpl3`, `test_nfr1_readme_has_required_sections` (lisens, testplan, brukerreiser, testbruker, `http://localhost:3000`, kodeblokk med `docker compose up`).
- `backend/tests/test_config.py` -- `test_nfr4_env_example_lists_all_settings`.
- `backend/tests/test_jobs.py`, `test_flashcards.py`, `frontend/modules/subjects/lecture-page.test.tsx` -- rett feilmerkede krav-ID-er.
- `docs/testplan.md` -- FR-tabellen, SK-tabellen, SK-11-kjøringen, plass til resultatene fra 6.6, lenke til brukerreisene.
- `README.md` -- lisens og kreditering, lenker, kodeblokker, retting etter SK-11.

**Acceptance Criteria:**
- Given repoet, when `LICENSE` leses, then er det AGPL-3.0 uendret, og README sier at koden er AGPL-3.0, at eksempelnotatene er CC BY-NC-SA 4.0 og at PyMuPDF er AGPL.
- Given testplanen, when `uv run pytest` kjøres, then er SK-1-testen grønn, og den feiler med lista over krav hvis et krav mister både test og begrunnelse.
- Given en ren klone uten `.env`, when README følges ordrett, then starter appen i demomodus, testbrukeren logger inn, og testkommandoene virker; dato, commit og avvik står i testplanen.

## Spec Change Log

## Review Triage Log

### 2026-11-23 — Review pass
- verdicts: 36 findings — high 0, medium 4, low 24, false 7, maybe-false 0 (1 utsatt i tillegg til medium-funnet om SK-11)
- findings:
  - `[medium]` `[defer]` (intent) SK-11 er gjort av KI med avvik, ikke av Silje ordrett — krever Silje; ført som utsatt, i testplanen og som issue #290.
  - `[low]` `[reject]` (intent) SK-1-testen måler navn, ikke innhold — valgt i spesifikasjonen og sagt rett ut i testplanen.
  - `[false]` `[reject]` (intent) Omdøpingene flytter bare målet — testene var feilmerket mot PRD-en: `test_fr19_nye_kort_legges_til_de_gamle` er FR-22 («nye kort legges til»), begrepskort-testen er FR-19.
  - `[low]` `[reject]` (intent) README-testen sjekker bare noen av punktene — akseptkriteriet krever ingen test av README; innholdet er lest mot sjekklista.
  - `[low]` `[reject]` (intent) Miljøtesten starter ikke serveren — akseptkriteriet sier at appen kan *lages*; importen kjører `create_app()`.
  - `[false]` `[reject]` (intent) README ble ikke rettet etter SK-11 — kjøringen fant ingenting å rette.
  - `[medium]` `[patch]` (verification) Kolonnen «Automatiske tester» kontrolleres ikke mot testnavnene — ny `test_sk1_testplan_files_match_test_names`; den fant to manglende filer (FR-1, FR-21), som er lagt til.
  - `[low]` `[patch]` (verification) `it.each`-titler telles ikke — ny regex for tabelltester, dekket i testen med falske data.
  - `[low]` `[reject]` (verification) Tester som hopper over seg selv telles — ingen slik test har FR-ID i dag; dekket av «måler navn»-forbeholdet.
  - `[low]` `[patch]` (edge) `regex.test("FR-…")` kunne telles som test — regexen krever nå at navnet ikke står etter punktum eller bokstav; dekket i testen med falske data. Utkommenterte tester avvist som sjeldne.
  - `[low]` `[patch]` (edge) `it.each` — samme som verifiseringsfunnet.
  - `[low]` `[reject]` (edge) Playwright-filer med andre endelser — ingen finnes, og prosjektet bruker bare `*.spec.ts`.
  - `[low]` `[reject]` (edge) pytest-filer som `*_test.py` — ingen finnes; konvensjonen er `test_*.py`.
  - `[low]` `[patch]` (edge) Tankestrek (—) eller «N/A» regnes som begrunnelse — lagt til i `NO_REASON`, sammenlignet uten store bokstaver.
  - `[low]` `[reject]` (edge) Escapet `|` i en celle forskyver kolonnene — sjeldent; testplanen har ingen.
  - `[medium]` `[patch]` (edge) Kolonnen kan drive fra testene — samme som verifiseringsfunnet.
  - `[low]` `[reject]` (edge) KeyError hvis en hemmelig innstilling fjernes — testen feiler fortsatt tydelig på linja; sjeldent.
  - `[low]` `[reject]` (edge) Samme nøkkel to ganger i `.env.example` — sjeldent, og fila leses av mennesker.
  - `[low]` `[reject]` (edge) Utkommentert tildeling regnes som forklaring — sjeldent; fila har ingen.
  - `[medium]` `[patch]` (edge) `cd frontend` feiler når blokkene kjøres etter hverandre — README sier nå at hver blokk starter i rota, og Playwright-blokkene har egen `cd frontend`.
  - `[medium]` `[defer]` (edge, påstand) Ordrett README er ikke vist — samme som intent-funnet om SK-11.
  - `[false]` `[reject]` (blind) KI-sporet er ikke oppdatert — skrives etter byggeløpet i samme økt, før PR.
  - `[low]` `[reject]` (blind) Ingen `license`-felt i pakkebeskrivelsene — henger på valget only/or-later, som er Siljes (kanttilfelle).
  - `[low]` `[defer]` (blind) Only eller or-later er ikke valgt — Siljes valg; utsatt og kanttilfelle-issue.
  - `[low]` `[defer]` (blind) AGPL §13: appen lenker ikke til kildekoden — gjelder først ved drift for andre; utsatt sammen med lisensvarianten.
  - `[medium]` `[patch]` (blind) Lisensbegrunnelsen knyttet plikten til at repoet er offentlig — README sier nå at deling eller bruk over nett utløser AGPL.
  - `[low]` `[patch]` (blind) Låsefilene inneholder ikke lisenstekstene — README sier nå at lisensen følger med hver pakke ved installasjon.
  - `[medium]` `[patch]` (blind) Testplankolonnen kan bli utdatert — samme som verifiseringsfunnet.
  - `[low]` `[patch]` (blind) SK-7 viste til backend-tester for FR-9/FR-10 som ikke finnes — raden viser nå til radene for FR-9/FR-10 og `test_nfr16_…`.
  - `[low]` `[patch]` (blind) SK-3 nevnte FR-38 uten forklaring — raden sier nå at FR-38 forkaster innhold med sidetall som ikke finnes.
  - `[low]` `[patch]` (blind) SK-11-oppfølgingen hadde ikke issue — issue #290 laget og lenket fra testplanen.
  - `[low]` `[patch]` (blind) Regexen har hull (`it.each`) — samme som verifiseringsfunnet; titler over flere linjer avvist som sjeldne.
  - `[low]` `[reject]` (blind) `GOOGLE_CLOUD_PROJECT` er ikke hemmelig — `.env.example` sier «Never commit the real value»; å kreve den tom er det trygge valget.
  - `[low]` `[reject]` (blind) Kommentarkravet er svakt, og testnavnet er engelsk — navnet er gitt av akseptkriteriet; kommentarene er lest.
  - `[low]` `[patch]` (blind) Arbeidsmappa i testkommandoene — samme som edge-funnet om `cd frontend`.
  - `[false]` `[reject]` (blind) Usporede filer og spesifikasjonen utenfor diffen — `frontend/e2e-skjermbilder/` skal ikke røres etter instruksen; spesifikasjonen committes med storien.

## Design Notes

**Lisensvarianten.** GNU skiller mellom «AGPL-3.0-only» og «AGPL-3.0-or-later» i merknaden i kildefilene, ikke i selve lisensteksten. Storien og #25 sier bare «AGPL-3.0». Kjøringen legger inn lisensteksten og skriver «AGPL-3.0» i README, men velger ikke variant. Det føres som kanttilfelle.

**SK-1-testen måler navn, ikke innhold.** Den viser at hvert krav har minst én test med ID-en i navnet, ikke at testen faktisk dekker kravet. Testplanen sier det.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- alle grønne.
- `cd frontend && npm run test` -- alle grønne.
- `docker compose up --build -d && cd frontend && npx playwright test` -- alle grønne.
- SK-11: `git clone` til scratchpad, `docker compose -p sk-renkopi up --build -d`, logg inn som testbrukeren, kjør testkommandoene i README, `docker compose -p sk-renkopi down -v`.

## Auto Run Result

Status: done

**Hva som er bygd:** `LICENSE` med den offisielle AGPL-3.0-teksten fra gnu.org, uendret og låst med en SHA-256-test. `docs/testplan.md` med én rad per må ha-krav (FR-1–FR-41, FR-56–FR-58), én rad per SK-2–SK-22 med plass til resultatene fra 6.6, og SK-11-kjøringen. `backend/tests/test_testplan.py` håndhever SK-1 og at tabellen stemmer med testnavnene. README har lisens og kreditering, lenker til testplanen og brukerreisene, og kodeblokker for alle kommandoer (#27).

**Filer:**
- `LICENSE` -- AGPL-3.0 fra gnu.org, uendret.
- `.gitattributes` -- `LICENSE -text`, så Git ikke endrer linjeskift i lisensen.
- `.env.example` -- egen kommentarlinje over hver funksjonsbryter.
- `README.md` -- lisens og kreditering, testplan, kodeblokker, demomodus uten `.env`.
- `docs/testplan.md` -- testplanen.
- `backend/tests/test_testplan.py` -- SK-1, lisensen (AR-19) og README (NFR-1).
- `backend/tests/test_config.py` -- `test_nfr4_env_example_lists_all_settings`.
- `backend/tests/test_jobs.py`, `test_flashcards.py`, `frontend/modules/subjects/lecture-page.test.tsx` -- feilmerkede krav-ID-er rettet.

**Gjennomgang:** 36 funn. 15 rader rettet (4 middels, 11 lave, ulike rotårsaker slått sammen: 9 rettelser), 4 rader utsatt (SK-11 av Silje, lisensvarianten og §13), 17 avvist med begrunnelse i triageloggen.

**Ny gjennomgang anbefales:** nei. Fire middels rader ble rettet (testplankolonnen, `cd` i README, lisensbegrunnelsen), og testplanrettelsen er verifisert av den nye testen. README-rettelsene er tekst og lest etter endringen. Ingen konkret uverifisert risiko gjenstår (patchet: high 0, medium 4, low 11).

**Verifisering:**
- `uv run pytest` i `backend/`: 714 passed.
- `npm run test` i `frontend/`: 918 passed (73 filer).
- `npx playwright test` mot `docker compose up --build -d`: 178 passed, 1 skipped (testbrukertesten hopper over seg selv mot det eldre `pgdata`-volumet, som i 6.4).
- SK-11 i ren klone (`-p sk-renkopi`): pytest 713, Vitest 918, `E2E_REQUIRE_SEED=1 npx playwright test` 179 passed; ryddet med `down -v`.

**Gjenværende risiko:**
- SK-11 er ikke gjort av Silje (#290).
- Lisensvarianten og AGPL §13 er ikke avgjort (kanttilfelle).
