# G91 — AIene

Gruppeprosjekt i **IBE160 Programmering med KI** ved Høgskolen i Molde, høsten 2026 (15 studiepoeng).

Repoet inneholder gruppens applikasjon, **Studiekamerat**, og dokumentasjon av utvikling, testing og kvalitetssikring med KI.

## Medlemmer

- Silje Krokdal Vikvald

## Studiekamerat

Studiekamerat lager øvingsstoff fra dine egne forelesningsnotater, med kilde på alt.

Appen består av tre deler som kjører i Docker:

| Tjeneste | Hva den gjør |
| --- | --- |
| `frontend` | Next.js. Viser sidene på <http://localhost:3000> og sender alle kall til `/api/*` videre til backenden. |
| `backend` | FastAPI. Eier all logikk og alle data. Kan bare nås gjennom frontenden. Opplastede PDF-er ligger i Docker-volumet `uploads` (montert på `/app/data/uploads`), så de blir liggende når backenden startes på nytt. |
| `db` | Postgres 16. Dataene ligger i Docker-volumet `pgdata`. |

Bare port 3000 er åpen ut av Docker.

### Programmer du trenger

| Program | Versjon | Trengs til |
| --- | --- | --- |
| Docker med Docker Compose | Docker Desktop 4 eller nyere (Compose v2) | Å starte appen |
| Node.js | 22 (se `.nvmrc`) | Frontend-testene og utviklingsmodus |
| Python | 3.12 | Backend-testene og utviklingsmodus |
| [uv](https://docs.astral.sh/uv/) | 0.12 eller nyere | Installerer Python-pakkene fra `backend/uv.lock` |

## Start appen

Du trenger verken nøkler, kontoer eller `.env`-fil. Uten `.env` starter appen i demomodus, der en innebygd demomodell lager innholdet uten nett (se «Bruk Gemini (Vertex AI)» for ekte språkmodell). Kjør fra rota i repoet:

```bash
docker compose up
```

Første oppstart tar noen minutter, fordi Docker bygger appen. Har du hentet nye endringer i koden, bygger du appen på nytt:

```bash
docker compose up --build
```

Åpne så <http://localhost:3000>. Helsesjekken ligger på <http://localhost:3000/api/health> og svarer `{"status": "ok"}` når databasen kan nås.

En adresse som ikke finnes, for eksempel <http://localhost:3000/finnes-ikke>, viser «Fant ikke siden» med lenken «Gå til forsiden».

Backenden kjører databaseendringene (`alembic upgrade head`) før den starter. Stopp appen med `Ctrl+C`. Kjører den i bakgrunnen (startet med `-d`), stopper du den slik:

```bash
docker compose down
```

### Testbruker og eksempelemne

Første gang appen starter med tom database, lager backenden en ferdig testbruker. Logg inn på <http://localhost:3000/logg-inn> med:

- E-post: `test@studiekamerat.no`
- Passord: `studiekamerat`

Testbrukeren har godtatt vilkårene og har emnet «Markedsføring» med eksamen tre uker etter den dagen databasen ble fylt. Emnet har tre forelesninger fra de siste ukene (Markedsmiksen, Segmentering og målgrupper, AIDA-modellen), med ett kort PDF-notat hver, ferdige flashcards og quiz, og to lagrede økter på den første forelesningen. Oversikten viser derfor både øvde og ikke øvde forelesninger, og du kan øve med en gang.

Innholdet er laget av demomodellen. Demoinnholdet er enkelt og mekanisk: det viser at funksjonene virker, ikke hvor godt en ekte språkmodell er.

Godt å vite:

- **Bare på tom database.** Testbrukeren lages bare når `APP_ENV=local` og databasen ikke har noen kontoer. Har du startet appen før og laget kontoer, lages hun ikke. Vil du begynne på nytt, sletter denne kommandoen databasen og de opplastede filene (alt forsvinner), og neste `docker compose up` lager testbrukeren:

  ```bash
  docker compose down -v
  ```

  En ny oppstart lager aldri en ekstra testbruker. Feiler fyllingen, slettes testbrukeren igjen, appen starter likevel, og neste oppstart prøver på nytt.
- **Notatene er plassholdere.** De tre notatene i `backend/app/seed/notater/` er laget av KI og merket «PLASSHOLDER – skrives av Silje» øverst. De byttes ut med notater Silje skriver eller godkjenner selv (issue #13).
- **Kilde og lisens.** Notatene bygger på OpenStax *Principles of Marketing*, som lastes ned gratis fra <https://openstax.org/details/books/principles-marketing>. Notatene krediterer boka nederst, sier at teksten er endret, og deles under CC BY-NC-SA 4.0, som boka (se `backend/app/seed/notater/LISENS.md`). Ingen PDF fra OpenStax ligger i repoet. Vil du prøve appen med et kapittel fra en OpenStax-bok, laster du ned PDF-en fra openstax.org selv, og krediterer OpenStax hvis du deler noe du har laget av den.
- **Principles of Economics.** OpenStax *Principles of Economics 3e* ble brukt til å måle regelen for formelsider i story 6.3. Den lastes ned gratis fra <https://openstax.org/details/books/principles-economics-3e> og krediteres OpenStax slik bokas egen lisensside sier. Ingen PDF fra den ligger i repoet.
- **Endre et notat.** PDF-ene lages fra kildeteksten (`*.md`) med denne kommandoen:

  ```bash
  cd backend
  uv run python -m app.seed.build_notes
  ```

  En test sjekker at teksten i PDF-ene er den samme som i kildeteksten. Et notat som erstatter et av dem, må følge disse reglene, ellers lager demomodellen feil kort eller testene blir røde:
  - Første linje er «PLASSHOLDER – skrives av Silje» så lenge notatet er en plassholder. Når Siljes egen tekst erstatter det, fjernes linja, og testen `test_nfr3_note_is_marked_placeholder` oppdateres.
  - Minst fire definisjonssetninger med «er» (for eksempel «Prisen er summen kunden betaler.»), og «er» ingen andre steder i teksten.
  - Minst én punktliste med tre eller flere linjer som begynner med «• ».
  - Notatet får plass på én side.
  - Krediteringen (`# Kilde`) står nederst.
  - `EXPECTED_FRONTS` i `backend/tests/test_seed.py` og `CARDS`/`QUESTIONS` i `frontend/e2e/testbruker.spec.ts` oppdateres til de nye kortene.
- **Datoene settes én gang**, når databasen fylles. Etter `docker compose down -v` og en ny oppstart får emnet nye datoer.
- **Feil i fyllingen** står som linja `Seed failed: <feiltype>` i backendloggen. Den ser du slik:

  ```bash
  docker compose logs backend
  ```

### Opprett en konto

Åpne <http://localhost:3000/registrer>, skriv inn en e-postadresse og et passord på minst 8 tegn, og trykk «Opprett konto». Du blir logget inn med en gang og kommer til forsiden. E-postadressen sjekkes ikke, så du kan bruke en oppdiktet adresse som `klara@eksempel.no`. Passordet lagres bare som en bcrypt-hash. Vil du ikke lage konto selv, kan du bruke testbrukeren (se «Testbruker og eksempelemne» under).

### Logg inn

Åpne <http://localhost:3000/logg-inn>, skriv inn e-postadressen og passordet du brukte da du opprettet kontoen, og trykk «Logg inn». Du kommer til forsiden. Er e-postadressen eller passordet feil, står «Feil e-post eller passord. Sjekk at Caps Lock er av.» under passordfeltet. Meldingen er den samme uansett hvilken av dem som er feil, slik at ingen kan bruke innloggingen til å finne ut hvilke adresser som har konto. Lenken «Opprett konto» på siden går til registreringen, og «Logg inn» der går tilbake.

Innloggingen varer i 30 dager. Alle sider i appen krever innlogging: åpner du <http://localhost:3000> uten å være logget inn, kommer du til «Logg inn». Går innloggingen ut mens du bruker appen i samme fane, står det «Du er logget ut. Logg inn igjen.» der.

### Logg ut

Trykk «Logg ut» øverst til høyre. Du kommer til «Logg inn» med en gang, uten spørsmål.

## Utviklingsmodus

I utviklingsmodus kjører databasen i Docker, mens backend og frontend kjører direkte på maskinen, slik at endringer i koden vises med en gang.

1. Åpne databaseporten for maskinen din (bare første gang):

   ```bash
   cp docker-compose.override.example.yml docker-compose.override.yml
   ```

   Docker Compose leser `docker-compose.override.yml` automatisk. Den åpner Postgres på `127.0.0.1:5432`, og ligger ikke i Git. Har du en annen Postgres som allerede bruker port 5432, stopper du den eller endrer porten i fila (og i `DATABASE_URL`).

2. Start databasen:

   ```bash
   docker compose up db
   ```

3. Start backenden i en ny terminal:

   ```bash
   cd backend
   uv sync
   uv run alembic upgrade head
   uv run uvicorn app.main:app --reload
   ```

4. Start frontenden i en ny terminal:

   ```bash
   cd frontend
   npm install
   API_INTERNAL_URL=http://localhost:8000 npm run dev
   ```

   Åpne <http://localhost:3000>.

## Bruk Gemini (Vertex AI)

Appen kjører i demomodus som standard og trenger da verken nøkkel, konto eller nett. Vil du ha innhold fra en ekte språkmodell, kan backenden bruke Gemini på Google Vertex AI. Notatene behandles da i EU: backenden bruker alltid EU-endepunktet `aiplatform.eu.rep.googleapis.com`, og det kan ikke endres i innstillingene. Prosjekt-ID og modellnavn blir på serveren og sendes aldri til nettleseren.

Du trenger et Google Cloud-prosjekt med fakturering og [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) (`gcloud`).

1. Logg inn og slå på Vertex AI i prosjektet. Bytt `DITT-PROSJEKT` med prosjekt-ID-en din:

   ```bash
   gcloud auth login
   gcloud services enable aiplatform.googleapis.com --project DITT-PROSJEKT
   gcloud auth application-default login
   gcloud auth application-default set-quota-project DITT-PROSJEKT
   ```

   Den tredje kommandoen lagrer innloggingen (Application Default Credentials) i `~/.config/gcloud`. Backenden bruker den i stedet for en nøkkelfil.

2. Slå av mellomlagring (caching) hos Google for prosjektet, så notatene ikke lagres hos Google mellom kallene:

   ```bash
   curl -X PATCH \
     -H "Authorization: Bearer $(gcloud auth print-access-token)" \
     -H "Content-Type: application/json" \
     https://aiplatform.googleapis.com/v1/projects/DITT-PROSJEKT/cacheConfig \
     -d '{"name": "projects/DITT-PROSJEKT/cacheConfig", "disableCache": true}'
   ```

   Dette er en innstilling for hele prosjektet, og den går til Googles felles adresse for prosjektinnstillinger (`aiplatform.googleapis.com`). Ingen notater sendes med. Backendens kall til modellen går alltid til EU-endepunktet.

   Sjekk at den er av. Svaret skal inneholde `"disableCache": true`:

   ```bash
   curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
     https://aiplatform.googleapis.com/v1/projects/DITT-PROSJEKT/cacheConfig
   ```

3. Lag `.env` i rotmappa (kopier `.env.example`) og sett:

   ```bash
   LLM_PROVIDER=vertex
   GOOGLE_CLOUD_PROJECT=DITT-PROSJEKT
   VERTEX_MODEL=gemini-3.5-flash
   VERTEX_THINKING=low
   ```

   Mangler `GOOGLE_CLOUD_PROJECT` eller `VERTEX_MODEL`, stopper backenden ved oppstart med en `CRITICAL`-logglinje som nevner innstillingen. `.env` ligger aldri i Git.

4. Lag `docker-compose.override.yml` i rotmappa, så backenden får lese innloggingen din (bare lese, `:ro`). Docker Compose leser fila automatisk, og den ligger i `.gitignore`, så den havner aldri i Git:

   ```yaml
   services:
     backend:
       volumes:
         - ~/.config/gcloud:/home/app/.config/gcloud:ro
   ```

   Har du allerede en `docker-compose.override.yml` fra utviklingsmodus, legger du `backend`-delen til i den samme fila. Backenden i Docker kjører som brukeren `app` (uid 1000). På Linux må den brukeren kunne lese `~/.config/gcloud/application_default_credentials.json`. På macOS med Docker Desktop går det av seg selv. Kjører du backenden rett på maskinen (utviklingsmodus), trengs ikke dette steget: den finner innloggingen i `~/.config/gcloud` selv.

5. Start appen på nytt:

   ```bash
   docker compose up --build
   ```

   Demomerket er borte, og kontosiden viser «Gemini fra Google, behandlet i EU». Feiler kallet til Gemini (for eksempel fordi innloggingen mangler), blir jobben merket som feilet, og appen viser «Prøv igjen». Backend-loggen viser da bare jobb-ID-en og typen feil, aldri notattekst eller svar fra modellen.

Tilbake til demomodus: sett `LLM_PROVIDER=mock` (eller fjern linja) og start appen på nytt.

Testene kaller aldri Vertex AI. De kjører alltid med `LLM_PROVIDER=mock`, og ekte kall til modellen er sperret i `backend/tests/conftest.py`.

## Testene

Det finnes tre sett med tester. Kommandoene kjøres fra rota i repoet.

**Backend** (pytest, med SQLite i minnet, trenger ikke Docker):

```bash
cd backend
uv sync
uv run pytest
```

**Frontend** (Vitest, trenger ikke Docker):

```bash
cd frontend
npm install
npm run test
```

**Ende-til-ende** (Playwright i nettleseren, med axe for universell utforming). Testene trenger at appen kjører. Start den i bakgrunnen:

```bash
docker compose up --build -d
```

Første gang må nettleseren til Playwright lastes ned:

```bash
cd frontend
npm install
npx playwright install chromium
```

Kjør så testene i `frontend/`:

```bash
npx playwright test
```

Testene av testbrukeren (`e2e/testbruker.spec.ts`) hopper over seg selv hvis databasen hadde kontoer fra før, siden testbrukeren da ikke lages. Vil du at de skal feile i stedet, slik at en ødelagt fylling ikke skjules:

```bash
E2E_REQUIRE_SEED=1 npx playwright test
```

Stopp appen etterpå:

```bash
docker compose down
```

Hver test har krav-ID-en den dekker i navnet, for eksempel `test_nfr1_health_svarer_ok` eller `FR-17: lager flashcards`.

### Testplan og testdekning

[`docs/testplan.md`](docs/testplan.md) viser hvilke tester som dekker hvert må ha-krav (FR-1–FR-41 og FR-56–FR-58), hvor suksesskriteriene SK-2–SK-22 kontrolleres, og hvilke krav som bare kan kontrolleres for hånd. En backend-test (`test_sk1_every_must_requirement_has_test_or_reason`) sjekker at hvert må ha-krav har en test med krav-ID-en i navnet eller en begrunnelse i testplanen.

[`docs/testing/brukerreiser.md`](docs/testing/brukerreiser.md) viser de fire brukerreisene fra start til slutt og hvilken Playwright-test som dekker hvert steg.

### Automatisk ved hver pull request

Backend-testene (pytest) og frontend-testene (Vitest) kjører automatisk i GitHub Actions ved hver pull request mot `main`, se [`.github/workflows/ci.yml`](.github/workflows/ci.yml). Sjekken vises som «CI / tests» i pull requesten. Feiler en test, blir pull requesten merket som feilet.

Playwright kjøres ikke automatisk, fordi den trenger hele appen i Docker. Den kjøres lokalt med kommandoen i tabellen over.

## Innstillinger

Alle innstillingene har standardverdier, så `.env` er valgfri. Vil du endre noe, kopierer du `.env.example` til `.env` og endrer verdiene der. `.env` ligger aldri i Git.

| Innstilling | Standardverdi | Hva den gjør |
| --- | --- | --- |
| `APP_ENV` | `local` | Miljøet appen kjører i. `local` er demo- og utviklingsmodus på egen maskin. |
| `DATABASE_URL` | `postgresql+asyncpg://studiekamerat:studiekamerat@localhost:5432/studiekamerat` | Databasen backenden bruker i utviklingsmodus. I Docker Compose kobler backenden seg til tjenesten `db`. |
| `POSTGRES_PASSWORD` | `studiekamerat` | Passordet til den lokale Postgres-databasen i Docker. Bare for lokal bruk. Postgres setter passordet bare første gang databasen lages. Endrer du det senere, må du endre det både her og i `DATABASE_URL`, og kjøre `docker compose down -v` (det sletter den lokale databasen). |
| `LLM_PROVIDER` | `mock` | Hvilken språkmodell appen bruker. `mock` og `mock-invalid` er demomodus med ferdige svar, uten nøkkel og uten nett. `mock` lager ett flashcard per definisjonssetning i notatene («X er …» eller «X is …»): ordene før «er»/«is» på forsiden og hele setningen på baksiden. `mock-invalid` lager de samme kortene, men ødelegger tre av fire med vilje. De ugyldige kortene forkastes og telles i jobben (`discarded`), og Flashcards-raden sier at det ble laget færre kort enn valgt. Demoinnholdet er enkelt og mekanisk: det viser at funksjonene virker, ikke hvor godt en ekte språkmodell er. `vertex` er Gemini på Google Vertex AI, behandlet i EU, og krever `GOOGLE_CLOUD_PROJECT` og `VERTEX_MODEL` (se «Bruk Gemini (Vertex AI)»). En annen verdi stopper også backenden ved oppstart, med en logglinje som nevner `LLM_PROVIDER`. |
| `GOOGLE_CLOUD_PROJECT` | tom | Bare med `LLM_PROVIDER=vertex`, og da påkrevd. ID-en til Google Cloud-prosjektet ditt. Mangler den, stopper backenden ved oppstart med en logglinje som nevner `GOOGLE_CLOUD_PROJECT`. Sendes aldri til nettleseren. |
| `VERTEX_MODEL` | tom (`gemini-3.5-flash` i `.env.example`) | Bare med `LLM_PROVIDER=vertex`, og da påkrevd. Hvilken Gemini-modell som brukes. Verdien i `.env.example` er foreløpig, til kvalitetstesten har avgjort valget. |
| `VERTEX_THINKING` | `low` | Bare med `LLM_PROVIDER=vertex`. Hvor mye modellen tenker før den svarer: `minimal`, `low`, `medium` eller `high`. Mer tenking er tregere og dyrere. |
| `FEATURE_MNEMONICS` | `true` | Slår huskeregler av (`false`) eller på (`true`). Når den er av, svarer API-et `404` med koden `FEATURE_DISABLED`. |
| `FEATURE_FREETEXT` | `true` | Slår spørsmål med fritekstsvar av eller på, på samme måte. |
| `FEATURE_SUMMARY` | `true` | Slår sammendrag av eller på, på samme måte. |
| `JWT_SECRET` | tom (innebygd lokal nøkkel) | Den hemmelige nøkkelen som signerer innloggingscookien `sk_session`. Med `APP_ENV=local` brukes en innebygd nøkkel som bare er ment for egen maskin. I alle andre miljøer må den settes til en lang, tilfeldig verdi (for eksempel fra `openssl rand -hex 32`), ellers stopper backenden ved oppstart med en logglinje som nevner `JWT_SECRET`. |
| `UPLOAD_DIR` | `data/uploads` | Mappa der backenden lagrer opplastede PDF-er, som `<bruker-id>/<fil-id>.pdf`. En relativ sti regnes fra mappa backenden startes i. I Docker Compose er det `/app/data/uploads`, der volumet `uploads` er montert. Docker Compose sender ikke `UPLOAD_DIR` videre, så der gjelder innstillingen bare når backenden kjøres utenfor Docker. |
| `MAX_UPLOAD_MB` | `20` | Største PDF som kan lastes opp, i MB (1 MB = 1024 × 1024 byte). Må være et positivt heltall. Større filer avvises med koden `FILE_TOO_LARGE`. |
| `API_INTERNAL_URL` | `http://backend:8000` | Hvor frontenden sender `/api/*`. Leses når frontenden bygges. I utviklingsmodus: `http://localhost:8000`. |

## Planleggingsdokumentene

- [Produktkrav (PRD)](_bmad-output/planning-artifacts/prds/prd-G91-vikvald-2026-11-09/prd.md)
- [Arkitektur](_bmad-output/planning-artifacts/architecture/architecture-G91-vikvald-2026-11-14/ARCHITECTURE-SPINE.md) og [faglærers technology.md](_bmad-output/planning-artifacts/architecture/technology.md)
- [UX: utseende (DESIGN.md)](_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md) og [oppførsel (EXPERIENCE.md)](_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/EXPERIENCE.md)
- [Epics og stories](_bmad-output/planning-artifacts/epics.md)
- [KI-prosessen](docs/ki-prosess/)
- [Testplanen](docs/testplan.md) og [brukerreisene](docs/testing/brukerreiser.md)

## Lisens og kreditering

Koden er lisensiert under **GNU Affero General Public License versjon 3 (AGPL-3.0)**, se [`LICENSE`](LICENSE). Grunnen er at backenden bruker [PyMuPDF](https://pymupdf.readthedocs.io/) til å lese PDF-er, og PyMuPDF er AGPL-3.0. Et offentlig repo som bruker PyMuPDF, må derfor dele koden sin under AGPL. Endrer du koden og lar andre bruke appen over nett, må du også tilby dem kildekoden til endringene.

Eksempelnotatene i `backend/app/seed/notater/` er ikke under AGPL. De bygger på OpenStax *Principles of Marketing* og deles under **CC BY-NC-SA 4.0**, som boka (se [`backend/app/seed/notater/LISENS.md`](backend/app/seed/notater/LISENS.md)). Ingen PDF fra OpenStax ligger i repoet.

Appen bygger på åpen kildekode, blant annet FastAPI, SQLAlchemy, PyMuPDF og pydantic-ai i backenden og Next.js og React i frontenden. Lisensene deres følger med pakkene (`backend/uv.lock` og `frontend/package-lock.json`).
