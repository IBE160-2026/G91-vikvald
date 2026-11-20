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
| `backend` | FastAPI. Eier all logikk og alle data. Kan bare nås gjennom frontenden. |
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

Backenden kjører databaseendringene (`alembic upgrade head`) før den starter. Stopp appen med `Ctrl+C`, eller med `docker compose down` hvis den kjører i bakgrunnen (`-d`).

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

## Innstillinger

Alle innstillingene har standardverdier, så `.env` er valgfri. Vil du endre noe, kopierer du `.env.example` til `.env` og endrer verdiene der. `.env` ligger aldri i Git.

| Innstilling | Standardverdi | Hva den gjør |
| --- | --- | --- |
| `APP_ENV` | `local` | Miljøet appen kjører i. `local` er demo- og utviklingsmodus på egen maskin. |
| `DATABASE_URL` | `postgresql+asyncpg://studiekamerat:studiekamerat@localhost:5432/studiekamerat` | Databasen backenden bruker i utviklingsmodus. I Docker Compose kobler backenden seg til tjenesten `db`. |
| `POSTGRES_PASSWORD` | `studiekamerat` | Passordet til den lokale Postgres-databasen i Docker. Bare for lokal bruk. Postgres setter passordet bare første gang databasen lages. Endrer du det senere, må du endre det både her og i `DATABASE_URL`, og kjøre `docker compose down -v` (det sletter den lokale databasen). |
| `API_INTERNAL_URL` | `http://backend:8000` | Hvor frontenden sender `/api/*`. Leses når frontenden bygges. I utviklingsmodus: `http://localhost:8000`. |

## Planleggingsdokumentene

- [Produktkrav (PRD)](_bmad-output/planning-artifacts/prds/prd-G91-vikvald-2026-11-09/prd.md)
- [Arkitektur](_bmad-output/planning-artifacts/architecture/architecture-G91-vikvald-2026-11-14/ARCHITECTURE-SPINE.md) og [faglærers technology.md](_bmad-output/planning-artifacts/architecture/technology.md)
- [UX: utseende (DESIGN.md)](_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md) og [oppførsel (EXPERIENCE.md)](_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/EXPERIENCE.md)
- [Epics og stories](_bmad-output/planning-artifacts/epics.md)
- [KI-prosessen](docs/ki-prosess/)
