## Epic 1: Kom i gang: appen starter og du kan logge inn

Sensor starter appen med én kommando uten nøkler, og studenten kan opprette konto, logge inn og logge ut. Epicen legger grunnmuren alle senere epics bygger på: prosjektskjelett, Docker Compose, CI, fellesmappene, designtokens, toppfelt, feilformat, innstillinger og «Fant ikke siden».

### Story 1.1: Sett opp skjelettet som starter med én kommando

Som sensor,
vil jeg starte hele appen med `docker compose up` uten nøkler eller `.env`,
slik at jeg kan prøve appen og kjøre testene ved å følge README.

**Krav:** NFR-1 (start), NFR-4, AR-1, AR-13, AR-14, AR-15, AR-16, AR-17, UX-DR45

**Akseptkriterier:**

**Gitt** et nytt klonet repo uten `.env`
**Når** sensor kjører `docker compose up`
**Så** starter tjenestene `db` (Postgres 16), `backend` og `frontend`
**Og** bare port 3000 er åpnet ut av Docker

**Gitt** at `docker compose up` kjører
**Når** `db` starter
**Så** har `db` en helsesjekk med `pg_isready`, og `backend` venter på den med `condition: service_healthy`

**Gitt** at backend-beholderen starter
**Når** oppstarten kjører
**Så** kjører den først `alembic upgrade head` og deretter Uvicorn med nøyaktig én prosess
**Og** Alembic er satt opp mot `core/db`, men det finnes ingen tabeller ennå (tabeller lages i storien som først trenger dem)

**Gitt** at appen kjører
**Når** nettleseren åpner `http://localhost:3000/api/health`
**Så** svarer backenden `200` med `{"status": "ok"}` gjennom Next.js `rewrites`
**Og** svaret er `200` bare når databasen kan nås

**Gitt** frontend
**Når** den bygges
**Så** bygges den i flere trinn med `output: 'standalone'`
**Og** `next.config` sender `/api/*` videre til `API_INTERNAL_URL`, som er `http://backend:8000` som standard og settes ved bygging
**Og** det finnes ingen `proxy.ts`, ingen Caddy og ingen CORS-oppsett

**Gitt** at appen kjører
**Når** nettleseren åpner `http://localhost:3000`
**Så** vises en enkel startside med `<html lang="nb">` og én h1 «Studiekamerat»
**Og** siden erstattes av innloggingen i story 1.4 og forsiden i story 1.5

**Gitt** backend
**Når** den bygges
**Så** bygges den med `uv sync --locked` fra `python:3.12-slim`, og pakkene er låst i `uv.lock`
**Og** frontendpakkene er låst i `package-lock.json`

**Gitt** mappestrukturen
**Når** skjelettet er ferdig
**Så** finnes `backend/app/core/`, `backend/app/modules/`, `backend/alembic/`, `backend/tests/`, `frontend/app/`, `frontend/modules/`, `frontend/lib/`, `frontend/components/` og `frontend/e2e/` som i arkitekturen
**Og** backend logger til stdout

**Gitt** `core/db`
**Når** pytest kjører
**Så** bruker testene SQLite i minnet med aiosqlite og `StaticPool`
**Og** hver tilkobling slår på `PRAGMA foreign_keys=ON`, og en test sjekker det

**Gitt** repoet
**Når** det sjekkes inn
**Så** finnes `.env.example` med alle innstillingene som finnes så langt, med standardverdier og en kort forklaring
**Og** `.gitignore` holder `.env`, `docker-compose.override.yml`, `data/`, `node_modules/`, `.next/` og Python-mellomfiler utenfor Git

**Gitt** de tre testkommandoene
**Når** utvikleren kjører `uv run pytest`, `npm run test` (Vitest) og `npx playwright test` mot `docker compose up`
**Så** går alle grønt med minst én test hver: helsesjekken i pytest, en enkel Vitest-test, og en Playwright-test som åpner startsiden og `/api/health` gjennom `rewrites`
**Og** Playwright-testen kjører axe på startsiden uten brudd

**Gitt** testene i denne storien
**Når** de leses
**Så** har hvert testnavn krav-ID-en det tester, for eksempel `test_nfr1_health_svarer_ok` og `test_ar13_sqlite_foreign_keys_er_paa` (AR-17)

**Gitt** README
**Når** sensor leser den
**Så** viser den programversjonene (Docker, Node 22, Python 3.12, uv), oppstart med `docker compose up` som kommando som kan kopieres, utvikling med `docker compose up db` + `uv run uvicorn app.main:app --reload` + `npm run dev` med `API_INTERNAL_URL=http://localhost:8000`, de tre testkommandoene, og lenker til planleggingsdokumentene

### Story 1.2: Kjør testene automatisk ved hver pull request *(Kan kuttes)*

Som sensor,
vil jeg se at backend- og frontendtestene kjører automatisk ved hver pull request,
slik at jeg kan stole på at det som flettes, er testet.

**Krav:** AR-20

**Akseptkriterier:**

**Gitt** en pull request mot `main`
**Når** den åpnes eller oppdateres
**Så** kjører en GitHub Actions-jobb `uv sync --locked` og `uv run pytest` i `backend/`
**Og** `npm ci` og `npm run test` i `frontend/`

**Gitt** CI-jobben
**Når** den kjører
**Så** trenger den ingen hemmeligheter og ingen database utover SQLite i minnet
**Og** Playwright er ikke med, fordi den krever hele appen i Docker

**Gitt** at en test feiler
**Når** CI-jobben er ferdig
**Så** er pull requesten merket som feilet

**Gitt** README
**Når** sensor leser avsnittet om testing
**Så** står det at pytest og Vitest kjører automatisk ved hver pull request, og at Playwright kjøres lokalt

### Story 1.3: Vis feil på norsk og les innstillinger fra ett sted

Som student,
vil jeg at alle feilmeldinger er på norsk og sier hva jeg kan gjøre,
slik at jeg forstår hva som gikk galt, uansett hvor i appen feilen kommer fra.

**Krav:** FR-1, NFR-4, AR-11, AR-12

**Akseptkriterier:**

**Gitt** `core/errors.py`
**Når** en rute kaster en appfeil med en kode
**Så** svarer API-et med `{"error": {"code": "<KODE>", "details": {…}}}` og riktig HTTP-status
**Og** alle kodene står i én liste i `core/errors.py`

**Gitt** de globale feilhåndtererne
**Når** FastAPI kaster `HTTPException` eller en valideringsfeil (`422`)
**Så** skrives feilen om til samme format, med koden `NOT_FOUND` for ukjente `/api/*`-stier og `VALIDATION_ERROR` med feltnavnene i `details` for valideringsfeil

**Gitt** en uventet feil i backenden
**Når** forespørselen svarer
**Så** får klienten `500` med koden `INTERNAL_ERROR` og ingen feiltekst eller stakkspor
**Og** feilen logges til stdout

**Gitt** frontend
**Når** en side kaller API-et
**Så** går kallet gjennom én fetch-transport i `frontend/lib/` som sender cookien (`credentials: 'same-origin'`) og gjør feilsvar om til en feil med `code` og `details`
**Og** TanStack Query er satt opp i rotlayouten

**Gitt** meldingsfila i `frontend/lib/`
**Når** en feil skal vises
**Så** hentes den norske teksten fra meldingsfila etter koden, og backenden sender aldri tekst som vises til brukeren
**Og** en ukjent kode gir en felles reservetekst (se spørsmål 3)

**Gitt** kodene i `core/errors.py` og nøklene i meldingsfila
**Når** testene kjører (`uv run pytest` eller `npm run test`, så CI fanger det)
**Så** feiler en test hvis en kode i backend mangler i meldingsfila

**Gitt** innstillingene i `core/config`
**Når** backenden starter uten `.env`
**Så** leses alle innstillinger med pydantic-settings fra miljøet, med `APP_ENV=local`, `LLM_PROVIDER=mock` og `FEATURE_MNEMONICS`, `FEATURE_FREETEXT` og `FEATURE_SUMMARY` på som standard
**Og** en ugyldig verdi for `LLM_PROVIDER` (ikke `mock`, `mock-invalid` eller `vertex`) stopper oppstarten med en tydelig logglinje

**Gitt** at appen kjører
**Når** frontend kaller `GET /api/config`
**Så** svarer backenden med bare `demo_mode` (sann når `LLM_PROVIDER` er `mock` eller `mock-invalid`) og de tre bryterne
**Og** en test sjekker at svaret ikke har andre felt, så ingen hemmelighet kan lekke

**Gitt** en bør ha-rute som er merket med bryteren sin
**Når** bryteren er av
**Så** svarer ruten `404 FEATURE_DISABLED` (testet med en rute som bare finnes i testen)
**Og** frontend leser bryterne og `demo_mode` fra én hook i `frontend/lib/` som senere epics bruker til å skjule knapper

**Gitt** repoet
**Når** en test søker gjennom `.env.example` og frontendkoden
**Så** finnes ingen variabel med `NEXT_PUBLIC_`-prefiks

**Gitt** testene i denne storien
**Når** de leses
**Så** har hvert testnavn krav-ID-en det tester, for eksempel `test_ar12_valideringsfeil_har_felles_format` og `test_ar11_config_har_bare_demo_mode_og_brytere`

**Gitt** README
**Når** sensor leser den
**Så** finnes en tabell over innstillingene (navn, standardverdi, hva den gjør), og `.env.example` har de samme

### Story 1.4: Opprett konto og logg inn

Som student,
vil jeg opprette en konto med e-post og passord og logge inn,
slik at notatene og øvingen min blir mine og ligger der neste gang.

**Krav:** FR-1, FR-3, NFR-7, NFR-9, NFR-11, NFR-12, AR-10, AR-13, AR-14, AR-15, AR-16, UX-DR1, UX-DR2, UX-DR4, UX-DR5, UX-DR6, UX-DR25, UX-DR40, UX-DR43, UX-DR45, UX-DR46

**Akseptkriterier:**

*Backend (`identity`)*

**Gitt** modulen `identity` med `router.py`, `service.py`, `models.py` og `schemas.py`
**Når** Alembic kjører
**Så** lages tabellen `users` med UUID-nøkkel, unik `email`, `password_hash` og `created_at` (UTC)
**Og** migreringen virker på både Postgres og SQLite

**Gitt** en ny e-postadresse og et gyldig passord
**Når** frontend kaller `POST /api/identity/register`
**Så** svarer API-et `201` med `{id, email}`, og passordet lagres som bcrypt-hash
**Og** e-postadressen lagres med små bokstaver og uten mellomrom foran og bak, slik at samme adresse ikke kan registreres to ganger med ulik skrivemåte
**Og** studenten er logget inn etterpå med cookien under (se spørsmål 1)

**Gitt** en e-postadresse som finnes fra før
**Når** studenten prøver å opprette konto med den
**Så** svarer API-et `409 EMAIL_ALREADY_REGISTERED`

**Gitt** et passord med færre enn 8 tegn eller over 72 byte
**Når** studenten prøver å opprette konto
**Så** svarer API-et `PASSWORD_TOO_SHORT` eller `PASSWORD_TOO_LONG`
**Og** grensen på 72 byte testes med norske bokstaver (36 «æ» = 72 byte godtas, 37 avvises)

**Gitt** en ugyldig e-postadresse
**Når** studenten prøver å opprette konto
**Så** svarer API-et `INVALID_EMAIL`

**Gitt** riktig e-post og passord
**Når** frontend kaller `POST /api/identity/login`
**Så** settes cookien `sk_session` med en HS256-JWT laget med PyJWT, `HttpOnly`, `SameSite=Lax`, `Path=/` og levetid 30 dager
**Og** JWT-en står aldri i svaret, og frontend leser den aldri

**Gitt** feil e-post eller feil passord
**Når** studenten prøver å logge inn
**Så** svarer API-et `401 INVALID_CREDENTIALS`, med likt svar i begge tilfeller

**Gitt** en gyldig cookie
**Når** frontend kaller `GET /api/identity/me`
**Så** svarer API-et `200` med `{id, email}`
**Og** uten cookie, med ugyldig eller utløpt JWT, eller når brukeren ikke finnes lenger, svarer API-et `401 UNAUTHENTICATED`

**Gitt** den felles avhengigheten `current_user` i `identity`
**Når** en rute trenger innlogget bruker
**Så** henter den brukeren bare gjennom `current_user`, og `/me` er den første ruten som bruker den

**Gitt** `JWT_SECRET`
**Når** backenden starter
**Så** har den en standardverdi bare når `APP_ENV=local`, og ellers nekter appen å starte uten nøkkel
**Og** `.env.example` og innstillingstabellen i README har `JWT_SECRET`

**Gitt** registrering og innlogging
**Når** loggene og databasen sjekkes i testene
**Så** står passordet aldri i klartekst, verken i `users` eller i loggen

*Designgrunnlag og felles komponenter*

**Gitt** DESIGN.md
**Når** Tailwind-temaet settes opp
**Så** finnes alle tokens derfra (farger, typografi, avstander inkludert målene for de tre sideoppsettene, hjørner og komponentverdier) som tema-variabler
**Og** en test sjekker at fargeverdiene i temaet er de samme som i DESIGN.md

**Gitt** skrifta
**Når** en side vises
**Så** brukes Inter fra `@fontsource-variable/inter` med reserven `system-ui, sans-serif`, bare vektene 400, 500 og 600, og tabulære tall (`tnum`) på all tekst
**Og** en Playwright-test sjekker at siden ikke henter noe utenfor `localhost` (fonter og ikoner følger med appen)

**Gitt** skygger, slør og ikoner
**Når** temaet er satt opp
**Så** finnes skyggene `lift` og `float` og sløret (42 %) som tokens, og ikoner kommer fra lucide-react med 1,5 px strek og ingen emoji

**Gitt** de felles komponentene i `frontend/components/`
**Når** de brukes
**Så** finnes knappene `button-primary`, `button-outline`, `button-text` og `button-danger` (40 px, og 48 px i stor variant), og skjemafeltet `text-field` med synlig etikett, 48 px høyde og feil med rød kant, ikon og tekst under feltet knyttet til feltet med `aria-describedby` og `aria-invalid`
**Og** passordfeltet har tekstknappen «Vis», som viser passordet og har `aria-pressed`

**Gitt** alt som kan få fokus
**Når** det får fokus med tastatur
**Så** vises den svarte fokusringen (2 px, 2 px luft), og den fjernes aldri
**Og** kontroller har kanten `border-control`, og `border-card` brukes aldri på noe man kan trykke på

**Gitt** komponentene
**Når** Vitest kjører
**Så** finnes tester for knappvariantene, feiltilstanden i skjemafeltet og «Vis» i passordfeltet

*Innloggingssiden (01)*

**Gitt** at studenten ikke er logget inn
**Når** hun åpner innloggingssiden
**Så** viser `(auth)`-layouten toppfeltet med bare logoen
**Og** kortet har h1 «Logg inn», undertittelen «Fra forelesningsnotat til eksamen.», feltene «E-post» og «Passord» (med «Vis»), hovedknappen «Logg inn» og «Ny her?» med «Opprett konto»
**Og** den grå, forenklede semesterlinja og setningen «Studiekamerat lager øvingsstoff fra dine egne forelesningsnotater, med kilde på alt.» står som i skisse 01, med linja skjult for skjermleser

**Gitt** innloggingskortet
**Når** studenten velger «Opprett konto»
**Så** byttes kortet til h1 «Opprett konto», samme felt og hovedknappen «Opprett konto», med en vei tilbake til «Logg inn»

**Gitt** feil e-post eller passord
**Når** studenten prøver å logge inn
**Så** står «Feil e-post eller passord. Sjekk at Caps Lock er av.» under feltet med feilkant, fokus flyttes til feltet, og meldingen leses opp av skjermleser

**Gitt** en e-postadresse som finnes fra før
**Når** studenten prøver å opprette konto
**Så** står «Det finnes allerede en konto med denne e-postadressen. Logg inn i stedet.» under e-postfeltet

**Gitt** et passord med færre enn 8 tegn, for langt passord eller ugyldig e-post
**Når** studenten sender skjemaet
**Så** står en melding fra meldingsfila under feltet som sier hva som er feil og hvordan det rettes (tekstene i spørsmål 2), og fokus flyttes til feltet
**Og** frontend sjekker de samme reglene med zod før kallet, men backenden avgjør

**Gitt** riktig e-post og passord
**Når** studenten logger inn eller oppretter konto
**Så** kommer hun til forsiden (`/`)

**Gitt** innloggingssiden i begge variantene og med feilmelding
**Når** Playwright kjører axe
**Så** er det ingen brudd
**Og** alt kan gjøres med bare tastatur i leserekkefølgen: E-post, Passord, Vis, Logg inn, Opprett konto, og Enter sender skjemaet

**Gitt** at appen kjører i Docker
**Når** Playwright oppretter en konto, logger ut ved å slette cookien og logger inn igjen
**Så** går alle kallene gjennom `rewrites`, og cookien `sk_session` er `HttpOnly`

**Gitt** testene i denne storien
**Når** de leses
**Så** har hvert testnavn krav-ID-en det tester, for eksempel `test_fr3_opprett_konto`, `test_nfr7_passord_lagres_som_hash` og `test_ar10_passord_over_72_byte_avvises`

**Gitt** README
**Når** sensor leser den
**Så** står det hvordan man oppretter en konto på `http://localhost:3000` (testbrukeren kommer i epic 6)

### Story 1.5: Bruk appen innlogget, logg ut og få «Fant ikke siden»

Som student,
vil jeg ha et toppfelt med «Logg ut», bli sendt til innloggingen når jeg ikke er innlogget, og se «Fant ikke siden» når noe ikke finnes,
slik at appen er trygg å bruke og ingen kan se mine data.

**Krav:** FR-1, FR-3, FR-4, NFR-11, NFR-12, AR-2, AR-10, AR-12, UX-DR4, UX-DR5, UX-DR6, UX-DR21 (felles komponent, se spørsmål 6), UX-DR40, UX-DR41, UX-DR43, UX-DR45

**Akseptkriterier:**

*Ramme og toppfelt*

**Gitt** en innlogget student
**Når** hun åpner en side i `(app)`
**Så** viser layouten toppfeltet (`top-bar`) med logoen som lenke til forsiden, initialsirkelen med første bokstav i e-postadressen, «Konto» og «Logg ut» med utgangsikon, uten understreking
**Og** «Konto» lenker til kontosiden, som lages i epic 2

**Gitt** forsiden (`/`) i `(app)`
**Når** en innlogget student åpner den
**Så** vises h1 «Dine emner» i forsideoppsettet uten sidemeny, med 80 px marg
**Og** innholdet på forsiden kommer i epic 2

**Gitt** sidene i `(app)`
**Når** skjermleseren leser dem
**Så** er toppfeltet og innholdet egne landemerker (`header` og `main`), hver side har én h1, og Tab-rekkefølgen følger leserekkefølgen

*Ikke innlogget, utlogging og utløpt innlogging*

**Gitt** at studenten ikke er innlogget
**Når** hun åpner en side i `(app)`
**Så** avgjør frontend det bare med `GET /api/identity/me`, og hun sendes til innloggingssiden uten melding

**Gitt** en innlogget student
**Når** hun trykker «Logg ut»
**Så** kaller frontend `POST /api/identity/logout`, som svarer `204` og sletter cookien
**Og** hun kommer til innloggingssiden uten bekreftelse og uten melding
**Og** går hun tilbake i nettleseren, sendes hun til innloggingssiden igjen

**Gitt** en student som har brukt appen innlogget i denne fanen
**Når** et API-kall svarer `401 UNAUTHENTICATED` (innloggingen er utløpt eller cookien borte)
**Så** sendes hun til innloggingssiden, og der står «Du er logget ut. Logg inn igjen.» i et levende område som leses opp (se spørsmål 4)

*Bare egne data og «Fant ikke siden»*

**Gitt** alle API-ruter i appen
**Når** testen går gjennom dem
**Så** bruker hver rute `current_user`, unntatt `/api/health`, `/api/config`, `register`, `login` og `logout`, og en test feiler hvis en ny rute mangler den
**Og** testen ligger der, så senere epics får den gratis

**Gitt** en felles hjelper i `backend/app/core/` for å hente en rad som tilhører brukeren
**Når** en annen brukers rad eller en ID som ikke finnes, etterspørres
**Så** svarer API-et `404 NOT_FOUND` med nøyaktig samme svar i begge tilfeller, aldri `403`
**Og** det testes med en tabell som bare finnes i testen, siden epic 1 ikke har innhold som eies av brukeren

**Gitt** en adresse i appen som ikke finnes
**Når** studenten åpner den
**Så** vises siden med h1 «Fant ikke siden» og en lenke til forsiden (se spørsmål 5)
**Og** fetch-transporten fra story 1.3 har en hjelper som viser samme side når API-et svarer `404 NOT_FOUND`, så senere sider bruker den både når innhold ikke finnes og når det tilhører en annen

*Felles dialog*

**Gitt** den felles dialogen i `frontend/components/`
**Når** den åpnes
**Så** ligger den over sløret (42 %) med `float`-skygge og `rounded.xl`, fokus flyttes inn og holdes der, Esc lukker uten endring, og fokus går tilbake til knappen som åpnet den
**Og** knappene står i rekkefølgen «Avbryt», så hovedhandlingen, og bredden kan være 560, 640 eller 720 px
**Og** oppførselen er testet med Vitest; første side som bruker den, kommer i epic 2

*Testing og README*

**Gitt** forsiden, «Fant ikke siden» og innloggingssiden med «Du er logget ut. Logg inn igjen.»
**Når** Playwright kjører axe
**Så** er det ingen brudd
**Og** toppfeltet og lenken på «Fant ikke siden» kan brukes med bare tastatur, med synlig fokusring

**Gitt** at appen kjører i Docker
**Når** Playwright oppretter en konto, kommer til forsiden, logger ut, prøver å åpne forsiden igjen, logger inn, sletter cookien og navigerer
**Så** havner studenten på innloggingssiden de riktige stedene, og meldingen om utløpt innlogging vises bare i det siste tilfellet

**Gitt** testene i denne storien
**Når** de leses
**Så** har hvert testnavn krav-ID-en det tester, for eksempel `test_fr4_andres_rad_gir_404`, `test_ar2_alle_ruter_krever_innlogging` og `test_fr3_logg_ut_sletter_cookien`

**Gitt** README
**Når** sensor leser den
**Så** står det hvordan man logger inn og ut, og at innloggingen varer i 30 dager

### Dekning

| Krav | Story |
|---|---|
| FR-1 | 1.3 (meldingsfil), 1.4, 1.5 |
| FR-3 | 1.4 (opprett konto, logg inn), 1.5 (logg ut) |
| FR-4 | 1.5 (`current_user` på alle ruter, 404 for andres data) |
| UX-DR1 | 1.4 |
| UX-DR2 | 1.4 |
| UX-DR4 | 1.4 (skygger, slør, ikoner), 1.5 (dialogen bruker dem) |
| UX-DR5 | 1.4 (målene som tokens), 1.5 (forsideoppsettet). Oppsettet med sidemeny tas i bruk i epic 2 og øvingsoppsettet i epic 3, der innholdet deres kommer |
| UX-DR6 | 1.4 (bare logo på innloggingen), 1.5 (fullt toppfelt) |
| UX-DR25 | 1.4 (skjemafelt og passord med «Vis»). Dialogene for emne og forelesning er epic 2 |
| UX-DR40 | 1.4 (innlogging og oppretting), 1.5 (utløpt innlogging) |
| UX-DR41 | 1.5 |
| UX-DR43 | 1.4 |
| UX-DR45 | 1.1 (`lang="nb"`), 1.4 (h1), 1.5 (landemerker, Tab-rekkefølge) |
| UX-DR46 | 1.4 |

Øvrige krav fra epicens linje: NFR-1 (1.1), NFR-4 (1.1, 1.3), NFR-7 (1.4), NFR-9 (1.4, axe måler kontrast), NFR-11 (1.4, 1.5), NFR-12 (1.1, 1.4, 1.5), AR-1 (1.1), AR-2 (1.5), AR-10 (1.4, 1.5), AR-11 (1.3), AR-12 (1.3, nye koder i 1.4 og 1.5), AR-13 (1.1, første migrering i 1.4), AR-14 (1.1; Inter i 1.4; `seed_if_empty` og jobbopprydding legges inn i oppstarten i epic 6 og 3), AR-15 (1.1, 1.4), AR-16 (1.1, 1.4), AR-17 (alle), AR-20 (1.2).

Kanttilfeller: ingen i tabellen hører til epic 1. E10 (jobb ved utlogging) handler om jobber, som kommer i epic 3, og bør avgjøres der.

### Spørsmål til Silje

1. **Innlogget etter oppretting:** Jeg foreslår at studenten er logget inn med en gang hun har opprettet konto, og kommer til forsiden. Dokumentene sier ikke noe om dette. Er det greit?
2. **Tekster som mangler i EXPERIENCE.md:** UX-DR40 sier bare «Minst 8 tegn.» Forslag: `PASSWORD_TOO_SHORT` «Passordet må ha minst 8 tegn.», `PASSWORD_TOO_LONG` «Passordet er for langt. Bruk færre tegn.», `INVALID_EMAIL` «Skriv inn en gyldig e-postadresse, for eksempel klara@eksempel.no.» Godkjenner du dem, eller vil du endre?
3. **Reservetekst for ukjente feil** (`INTERNAL_ERROR`, `VALIDATION_ERROR` og koder uten tekst): forslag «Noe gikk galt. Prøv igjen.»
4. **Når vises «Du er logget ut. Logg inn igjen.»?** Nettleseren sletter cookien selv når den går ut, så backenden kan ikke se forskjell på «aldri logget inn» og «utløpt». Forslaget er at meldingen vises når et kall får `401` etter at studenten har vært innlogget i samme fane. Åpner hun appen på nytt etter 30 dager, kommer hun til innloggingen uten melding. Er det greit?
5. **Lenketeksten på «Fant ikke siden»:** forslag «Gå til forsiden».
6. **Felles dialog i epic 1:** Kontrakten mellom epics sier at epic 1 leverer dialogen, men UX-DR21 står på epic 2 i `epics.md`, og ingen side i epic 1 bruker den. Jeg har lagt den i story 1.5 med Vitest-tester. Alternativet er å flytte den til den første storien i epic 2 som trenger den. Hva vil du?
