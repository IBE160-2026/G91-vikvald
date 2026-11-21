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

Du trenger verken nøkler eller `.env`-fil. Kjør fra rota i repoet:

```bash
docker compose up
```

Har du hentet nye endringer i koden, bruker du `docker compose up --build`, slik at appen bygges på nytt.

Åpne så <http://localhost:3000>. Helsesjekken ligger på <http://localhost:3000/api/health> og svarer `{"status": "ok"}` når databasen kan nås.

En adresse som ikke finnes, for eksempel <http://localhost:3000/finnes-ikke>, viser «Fant ikke siden» med lenken «Gå til forsiden».

Backenden kjører databaseendringene (`alembic upgrade head`) før den starter. Stopp appen med `Ctrl+C`, eller med `docker compose down` hvis den kjører i bakgrunnen (`-d`).

### Opprett en konto

Åpne <http://localhost:3000/registrer>, skriv inn en e-postadresse og et passord på minst 8 tegn, og trykk «Opprett konto». Du blir logget inn med en gang og kommer til forsiden. E-postadressen sjekkes ikke, så du kan bruke en oppdiktet adresse som `klara@eksempel.no`. Passordet lagres bare som en bcrypt-hash. En ferdig testbruker kommer i en senere versjon.

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

## Testene

| Hva | Kommando | Hvor |
| --- | --- | --- |
| Backend (pytest, SQLite i minnet) | `uv run pytest` | `backend/` |
| Frontend (Vitest) | `npm run test` | `frontend/` |
| Ende-til-ende (Playwright og axe) | `npx playwright test` | `frontend/`, mens appen kjører med `docker compose up --build` |

Første gang Playwright kjøres, må nettleseren lastes ned:

```bash
cd frontend
npm install
npx playwright install chromium
```

Hver test har krav-ID-en den dekker i navnet, for eksempel `test_nfr1_health_svarer_ok`.

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
| `LLM_PROVIDER` | `mock` | Hvilken språkmodell appen bruker. `mock` og `mock-invalid` er demomodus med ferdige svar, uten nøkkel og uten nett. `mock` lager ett flashcard per definisjonssetning i notatene («X er …» eller «X is …»): ordene før «er»/«is» på forsiden og hele setningen på baksiden. `mock-invalid` lager de samme kortene, men ødelegger tre av fire med vilje, så du kan se at ugyldige kort blir forkastet. Demoinnholdet er enkelt og mekanisk: det viser at funksjonene virker, ikke hvor godt en ekte språkmodell er. `vertex` (Google Vertex AI) støttes ikke ennå (kommer i epic 6) og stopper backenden ved oppstart med en `CRITICAL`-logglinje. En annen verdi stopper også backenden ved oppstart, med en logglinje som nevner `LLM_PROVIDER`. |
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
