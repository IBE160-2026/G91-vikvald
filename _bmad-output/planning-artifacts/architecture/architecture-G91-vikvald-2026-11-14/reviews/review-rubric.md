# Gjennomgang av ARCHITECTURE-SPINE.md mot sjekklisten

Dato: 2026-11-14. Gjennomgått: `ARCHITECTURE-SPINE.md` (utkast), med `.memlog.md`, PRD 2026-11-09 og `../technology.md` som kontekst. Spinen er ikke endret.

## Konklusjon

Spinen er solid og nesten klar: de fleste reglene er konkrete og testbare, og avvikene fra technology.md er tydelige. Men **driftsrammen er delvis taus** (lokal utvikling, hvor testene kjøres, oppstartsrekkefølge i Compose), og noen regler har hull som lar to stories gjøre ting ulikt (SQLite-kaskade, én worker, avhengighetsgrafen for opptellinger). Rett de fem funnene under, så kan stories bygges trygt.

## Funn

Alvorlighet: **Høy** = to stories vil sannsynlig gjøre det ulikt eller noe feiler hos sensor. **Middels** = reell risiko, enkel å tette. **Lav** = pynt eller presisering.

### F1 (Høy): Driftsrammen er taus om lokal utvikling og hvor testene kjøres

Spinen sier hvordan sensor starter appen, men ikke hvordan Silje utvikler og tester:

- **Lokal utvikling / hot reload:** technology.md bygger frontend som `next build` → standalone. Uten en regel vil én story kjøre alt i Docker med ombygging etter hver endring, en annen kjøre `uvicorn --reload` og `next dev` på maskinen. Det er heller ikke sagt om `docker-compose.override.yml` (som allerede er reservert til gcloud-ADC) også skal montere kildekoden.
- **Next.js `rewrites` leses ved bygging.** `API_INTERNAL_URL` blir bakt inn ved `next build`. Kjøres frontend utenfor Docker, må verdien være `http://localhost:8000`. Dette må stå, ellers peker rewrites feil i ett av oppsettene.
- **Hvor testene kjøres:** pytest (uv på maskinen eller i containeren?), Vitest, og særlig Playwright + axe: mot hvilken stakk (`docker compose up` eller dev-servere), og hvem installerer nettleserne? NFR-1 krever at README sier hvordan testene kjøres, og SK-1/SK-9 forutsetter det.
- **Pakkebehandler i frontend** er ikke navngitt (technology.md bruker `npm ci`). Uten den kan ulike stories lage ulike låsefiler.

**Rettelse:** Legg til en kort seksjon «Utvikling og testing» under Strukturelt utgangspunkt: (a) dev = `db` i Compose + `uv run uvicorn --reload` og `npm run dev` på maskinen, med `API_INTERNAL_URL=http://localhost:8000` (eller tilsvarende bevisst valg), (b) pytest og Vitest kjøres på maskinen med `LLM_PROVIDER=mock`, (c) Playwright kjøres mot `docker compose up` (sensorens oppsett), (d) `npm` med `package-lock.json`, `uv.lock` for backend. CI kan fortsatt stå som utsatt, men da med «kjører samme kommandoer som (b) og (c)».

### F2 (Høy): Kaskadesletting virker ikke i SQLite uten `PRAGMA foreign_keys=ON`

AD-7 baserer all sletting på `ON DELETE CASCADE`, og AD-13 lar testene kjøre på SQLite. SQLite håndhever ikke fremmednøkler med mindre `PRAGMA foreign_keys=ON` settes på hver tilkobling. Da vil sletttestene (SK-6, FR-5, FR-12–FR-14) enten feile på SQLite eller, verre, bli skrevet om til å slette manuelt i koden, som er nøyaktig avviket AD-7 skal hindre.

**Rettelse:** Legg til i AD-13: «Testoppsettet slår på `PRAGMA foreign_keys=ON` for hver SQLite-tilkobling (SQLAlchemy `connect`-event). Sletting skjer bare via kaskade, aldri med manuelle `DELETE` per tabell.» Nevn også at den delvis unike indeksen i AD-5 må deklareres med både `postgresql_where` og `sqlite_where`.

### F3 (Middels): AD-5 forutsetter én backend-prosess og egen databasesesjon, men sier det ikke

- Asyncio-oppgaver og «sett `running` til `failed` ved oppstart» virker bare hvis Uvicorn kjører med **én** worker. Med flere workere vil en ny worker drepe jobbene til en annen.
- Bakgrunnsoppgaven lever lenger enn forespørselen og kan ikke bruke forespørselens sesjon. Konvensjonen om «den delte sesjonen» gjør det lett å gjøre feil.

**Rettelse:** Legg til i AD-5: «Backend kjører med én Uvicorn-worker. Jobben åpner sin egen sesjon og transaksjon (AD-4), og bruker aldri forespørselens sesjon.»

### F4 (Middels): Avhengighetsgrafen hindrer opptellingene som AD-7 og FR-16 krever

`GET …/delete-preview` for fil, forelesning og emne (AD-7, FR-12–FR-14) og tallene per forelesning (FR-16) må telle innhold. Men i grafen kan verken `files` eller `subjects` kalle `content`, og `practice` kan ikke kalle `generation` (der `jobs` ligger). Første story som trenger tellingen vil legge til en ny pil, og retningen blir tilfeldig (risiko for sykel `content → files → content`).

**Rettelse:** Bestem eieren: for eksempel at `content` eier en tellefunksjon per fil/forelesning/emne og at delete-preview-rutene ligger i `content` (eller i en egen lesemodul som får kalle alle). Oppdater grafen tilsvarende, og legg inn hvilken modul som eier `jobs`.

### F5 (Middels): Compose-oppstart og helse er tause

AD-13 kjører Alembic når backend starter, og AD-14 seeder da. Hvis `db` ikke er klar, feiler backend første gang sensor kjører `docker compose up`. Ingen helsesjekk eller `depends_on: condition: service_healthy` er nevnt, og ingen `/api/health`.

**Rettelse:** Under Kjøring: «`db` har `pg_isready`-helsesjekk; backend har `depends_on: db: service_healthy` og `GET /api/health`; frontend venter på backend.»

### F6 (Lav): Små hull i kravdekningen og porten

- **FR-41** (merket «Inneholder formel – sjekk mot kilden») trenger et felt på alt innhold (for eksempel `needs_source_check`). Det bør stå i AD-4/AD-6, siden alle innholdstyper må ha det likt.
- **FR-40:** Porten i AD-3 bør si at forespørselen kan ha sidebilder, slik at mock og Vertex har samme signatur, selv om regelen for når bilder sendes er utsatt.
- **FR-2** (norsk generert innhold) står i tabellen under frontend, men hører til `generation` (instruksene).
- **NFR-5/NFR-6, FR-11** (vilkårstekst og at den er godtatt) er ikke plassert i tabellen. Hvor godkjenningen lagres (felt på bruker), bør stå.
- **NFR-3:** Seed må gå gjennom `core/storage` og lage innhold via mock-porten (eller ferdige fikstur-rader). Én setning i AD-14 hindrer at seed skriver filer på egen hånd.
- **AD-9 / `sendBeacon`:** Si hvilket format kroppen har (for eksempel `Blob` med `application/json`, samme rute som vanlig avslutning), så frontend og backend ikke gjetter.

## Sjekkliste

| Punkt | Vurdering |
| --- | --- |
| Fastsetter de reelle avvikspunktene for stories | Stort sett ja (eierskap, port, genereringsløp, jobb, sidetekst, sletting, lagring, økter, auth, flagg, feilkoder). Mangler: dev-oppsett (F1), modulgrensen for opptellinger (F4). |
| Hver regel er håndhevbar og hindrer avviket | Ja for de fleste. Hull: AD-7 + AD-13 (F2), AD-5 (F3). |
| Ingenting under Utsatt kan føre til avvik | Modell, formelregel og instrukser er trygge. **CI** er trygt bare hvis testkommandoene er fastsatt (F1). Publisering er utenfor MVP. |
| Teknologi er sjekket og aktuell | Ja. Sjekket 2026-11-14 i memlog; stikkprøve mot PyPI i dag bekrefter PyMuPDF 2.1 og pydantic-ai-slim 2.68.0. TS 5.9.3 er et bevisst valg (begrunnet i memlog). Python 3.12 / Node 22 / Postgres 16 er arvet fra technology.md og fortsatt støttet. |
| Dekker PRD-ens funksjoner | Ja, med småhull (F6). |
| Hver dimensjon er avgjort, utsatt eller åpent spørsmål | Taus: lokal utvikling og hot reload, hvor testene kjøres, pakkebehandler (F1); oppstartsrekkefølge/helse (F5). Avgjort: miljøer (`APP_ENV`, `LLM_PROVIDER`), leverandør (Vertex EU), logging. Utsatt: drift i produksjon. |
| Mermaid-diagrammene er gyldige | Ja. Alle fire (to flowchart LR/TD, compose-flowchart, erDiagram) følger gyldig syntaks; etiketter med kolon og parentes står i hakeparentes eller anførselstegn. Ikke kjørt gjennom `mmdc` (ikke installert). |
| Spinen er slank | Ja. Ingen story-detaljer. Korte begrunnelser i AD-3, AD-6, AD-8 og AD-11 («fordi …», «på grunn av …») kunne vært flyttet til memlog, men er så korte at de er greie som avviksmerking. |
