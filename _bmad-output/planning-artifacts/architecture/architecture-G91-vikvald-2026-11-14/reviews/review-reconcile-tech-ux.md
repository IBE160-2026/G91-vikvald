---
title: 'Gjennomgang: arkitekturen mot technology.md og UX'
reviewed: ARCHITECTURE-SPINE.md (2026-11-14, draft) + .memlog.md
inputs:
  - ../../technology.md
  - ../../../ux-designs/ux-G91-vikvald-2026-11-10/EXPERIENCE.md
  - ../../../ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md
created: '2026-11-14'
---

# Gjennomgang: arkitekturen mot technology.md og UX

## Konklusjon

Arkitekturen følger technology.md godt, og de store avvikene (Caddy, Supabase Storage, OpenRouter, pypdf, brytere) er begrunnet og godkjent i memlog. Men noen mønstre er endret eller utelatt uten at det står, og flere UX-krav trenger data eller regler i backend som arkitekturen ikke fastsetter. Det gjelder særlig jobbstatus på tvers av sider, oppstart i Docker og testdatabasen. Byggere vil her kunne gjøre ulikt. Ingen funn krever ny retning, bare presiseringer i eksisterende AD-er.

Alvorlighetsgrad: **Høy** = et krav brytes eller byggere vil nesten sikkert gjøre ulikt. **Middels** = reell risiko for ulik bygging. **Lav** = bør nevnes for sporbarhet.

---

## Del A: Avvik fra technology.md som ikke er nevnt

### A1. SQLite i tester håndhever ikke kaskadesletting og delvis indeks av seg selv (Høy)

- **technology.md:** pytest med aiosqlite, in-memory SQLite per test. Spine (AD-13) tar dette inn.
- **Problem:** SQLite slår ikke på fremmednøkler uten `PRAGMA foreign_keys=ON` for hver tilkobling. Da sletter ikke `ON DELETE CASCADE` (AD-7) noe i testene, og SK-6 / FR-5 testes mot en annen oppførsel enn Postgres. Den delvise unike indeksen i AD-5 må også oppgis for begge dialekter (`postgresql_where` og `sqlite_where` i SQLAlchemy), ellers finnes den bare i den ene databasen. In-memory SQLite deles heller ikke mellom tilkoblinger uten `StaticPool`, og AD-5 kjører jobben i en egen sesjon.
- **Fiks:** Legg til i AD-13: «Testoppsettet slår på `PRAGMA foreign_keys=ON` ved hver tilkobling og bruker `StaticPool`. Delvise indekser oppgis med både `postgresql_where` og `sqlite_where`. Tabellene i testene lages fra Alembic-migrasjonene (eller `metadata.create_all`, men bare én av delene).»

### A2. Oppstart i Docker er ikke fastsatt: rekkefølge, ventetid på databasen og byggemåte (Middels)

- **technology.md:** migrasjoner kjøres som eget steg (`python -m app.cli schema upgrade`), helsesjekk på `/api/health`, frontend bygges i flere trinn (`node:22-alpine` → `npm ci` → `next build` → `output: standalone`), backend med `uv --locked`.
- **Spine:** sier at Alembic kjøres «når backend-containeren starter», at seed skjer ved tom database (AD-14), og at hengende jobber settes til `failed` (AD-5). Rekkefølgen og stedet er ikke gitt. Ingen helsesjekk eller `depends_on: condition: service_healthy` for Postgres. Flertrinnsbygg og `standalone` er ikke nevnt, verken som tatt med eller kuttet.
- **Hvorfor det betyr noe:** Sensor kjører én kommando. Starter backend før Postgres er klar, feiler migrasjonen. Next.js-`rewrites` bakes inn ved `next build`, så `API_INTERNAL_URL` må være kjent ved bygging, ellers peker `/api/*` feil (særlig ved `npm run dev` utenfor Docker).
- **Fiks:** Ny regel eller tillegg i «Kjøring»: (1) `db` har `pg_isready`-helsesjekk, og `backend` har `depends_on: service_healthy`. (2) Backend starter i fast rekkefølge: `alembic upgrade head` → `seed_if_empty` → sett `running`-jobber til `failed` → `uvicorn`. (3) Backend har `GET /api/health`. (4) Frontend bygges i flere trinn med `output: standalone`, som i technology.md. `API_INTERNAL_URL` er build-arg med standard `http://backend:8000`, og `.env.example` viser `http://localhost:8000` for kjøring uten Docker. (5) `uv sync --locked`.

### A3. Innlogging: levetid og testbruker er ikke fastsatt (Middels)

- **technology.md:** `ACCESS_TOKEN_EXPIRE_MINUTES` (standard 30 dager). Demokontoer bare i `local/dev/test/ci`. `NEXT_PUBLIC_DEV_PREFILL_*` / `DEV_AUTOLOGIN` for å slippe å skrive inn testbrukeren.
- **Spine:** AD-10 sier ikke hvor lenge innloggingen varer, og cookien har ingen `Max-Age`. EXPERIENCE krever meldingen «Du er logget ut. Logg inn igjen.» når innloggingen er utløpt, så frontend må vite at `401` betyr utløpt. AD-14 nevner testbruker, men ikke e-post/passord eller hvordan sensor får vite dem.
- **Fiks:** I AD-10: «Token og cookie varer `ACCESS_TOKEN_EXPIRE_MINUTES` (standard 43 200, som i technology.md). Utløpt eller manglende token gir `401` med kode `NOT_AUTHENTICATED`, og fetch-transporten i `lib/` sender da til 01 med meldingen.» I AD-14: fast testbruker (e-post og passord står i README og `.env.example`), og bestem om innloggingsfeltene fylles ut i demomodus (technology.md: `DEV_PREFILL`) eller ikke.

### A4. Sikkerhet for generert tekst er ikke nevnt (Middels)

- **technology.md:** DOMPurify og CSP i `next.config.ts`.
- **Spine:** sier ingenting. Innhold fra modellen (og fra brukerens PDF) vises på mange sider. Én bygger kan rendre det som Markdown/HTML, en annen som ren tekst.
- **Fiks:** Legg til i konvensjonene: «Generert innhold vises som ren tekst gjennom React. `dangerouslySetInnerHTML` og Markdown-rendering brukes ikke. Derfor trengs ikke DOMPurify.» Si i memlog om CSP er tatt med eller kuttet.

### A5. Brytere: hva skjer med rutene når en bryter er av (Lav)

- **technology.md:** hver modul mountes bare når `FEATURE_*` er på, og frontend har én `registry.ts` for rutene som styres av brytere.
- **Spine (AD-11):** sier bare at frontend leser `/api/config`. Ikke om backend-rutene finnes når bryteren er av, eller hvor frontend skjuler raden.
- **Fiks:** «Når en bryter er av, svarer backend-rutene `404`, og frontend skjuler raden i "Lag og øv" og på emnesiden. Bryterne leses ett sted i `lib/config`.»

### A6. Utelatte biblioteker og verktøy står ikke i kuttlista (Lav)

Memlog lister mange kutt, men disse fra technology.md er verken tatt med eller nevnt: `next-themes`, `motion`, `geist` (erstattet av Inter), markdown-bibliotekene (react-markdown, remark/rehype, katex), DOMPurify, `qrcode.react`, `fflate`, `pytest-xdist`, `cryptography`/Ed25519, `click`-CLI, Pillow, jsonschema, `/docs` og `/openapi.json` via proxyen, og feature-flagg ved bygging (`NEXT_PUBLIC_FEATURE_*`, nevnt i AD-11). `python-multipart` står i memlog, men ikke i teknologitabellen.
- **Fiks:** Én linje i memlog med «kuttet fordi PRD ikke trenger det», og legg `python-multipart` i tabellen.

---

## Del B: UX-krav som trenger mer fra arkitekturen

### B1. Jobbstatus på tvers av sider og ferdigmelding (Høy)

- **UX:** Klara kan gå hvor hun vil mens jobben går. Når den er ferdig, vises og leses det opp en kort melding «uansett hvilken side Klara er på» (EXPERIENCE: Tilstander, «Jobb pågår»; NFR-12, NFR-17). Mens en jobb går, er de andre «Lag …»-knappene i forelesningen ikke aktive, og raden sier hvorfor («Venter til flashcardene er ferdige»).
- **Spine (AD-5):** jobben har status og antall, og frontend poller «mens jobben pågår». Det står ikke *hvor* det polles, og jobben har ikke noe felt som sier *hva* den lager.
- **Hvorfor det betyr noe:** Polles det bare på side 04, kommer ingen melding på andre sider, og en jobb som startes, mistes ved omlasting. Uten type på jobben kan ikke raden si «Venter til flashcardene er ferdige», og «Prøv igjen» vet ikke hva som skal prøves igjen.
- **Fiks:** Utvid AD-5:
  - `jobs` har `kind` (`flashcards`, `model_cards`, `quiz`, `freetext`, `summary`), valgene (`params`), `created_count`, `discarded_count`, `error_code` og `finished_at`.
  - `GET /api/jobs/active` gir brukerens pågående jobber. Én poller i `(app)`-layouten (TanStack Query) henter dette så lenge noe pågår, og viser `sonner`-melding i et `aria-live`-område når en jobb går fra `running` til `done`/`failed`. Siden 04 leser samme spørring og ugyldiggjør innholdet når jobben er ferdig.
  - Forsøk på ny jobb mens en går gir `409` med kode `JOB_ALREADY_RUNNING`.
  - Siste jobb per forelesning og type vises i raden (feil med «Prøv igjen», «færre enn valgt», FR-47 «ingen modeller funnet» som `done` med 0 og en kode).

### B2. Økt lagres ikke ved navigering inne i appen eller utlogging (Middels)

- **UX:** «Går Klara til en annen side, logger ut eller lukker fanen midt i en økt, lagres økten som avbrutt» (FR-56).
- **Spine (AD-9):** lagrer ved ferdig, «Avslutt» og `pagehide`. Navigering inne i Next.js utløser ikke `pagehide`, og etter utlogging er cookien borte.
- **Fiks:** I AD-9: «Resultatet sendes også når øktsiden forlates inne i appen (når komponenten fjernes), og før utloggingskallet. Backend godtar samme økt bare én gang (klient-generert `session_id` + `ON CONFLICT DO NOTHING`), siden flere av disse kan utløses samtidig.»

### B3. Tilstand som UX krever lagret, men som ikke har et sted (Middels)

Byggere vil legge dette ulike steder (database, `localStorage` eller ingen steder) hvis arkitekturen ikke sier det:

| UX-krav | Hva mangler | Forslag |
|---|---|---|
| Vilkår godtatt før første opplasting, vist på kontosiden (FR-11, Flyt 4) | Ingen kolonne | `users.terms_accepted_at`. Opplasting uten den gir `409 TERMS_NOT_ACCEPTED`. |
| Demomodus vises på 15, 05, 04, 13 og i ventetekstene | `/api/config` har bare brytere | `/api/config` gir også `demo_mode: bool` (fra `LLM_PROVIDER`). |
| Bryteren «Bruk hurtigtaster» (WCAG 2.1.4) | Ikke sagt hvor den lagres | `localStorage` i `lib/hurtigtaster`, standard på. (Eller kolonne på bruker. Velg én.) |
| «Erstatt fil» (FR-13) | Ikke sagt om det er ett kall eller slett + last opp | Ett kall: den nye fila sjekkes først (PDF, tekst, ≤ 50 sider). Bare hvis den består, slettes den gamle i samme transaksjon. Ellers mistes innhold hvis den nye avvises. |
| Emnefarge i fast rekkefølge etter opprettelse (DESIGN, Emnefarger) | Lagres eller regnes ut? | `subjects.color_index` settes ved opprettelse (antall emner brukeren har laget, mod 6). Regnes den ut fra rekkefølgen, bytter emnene farge når ett slettes. |
| Nytt sammendrag erstatter det gamle først når det er ferdig (FR-55) | AD-4 sier én transaksjon, men ikke erstatning | Sletting av gammelt og lagring av nytt skjer i samme transaksjon som i AD-4. |

### B4. Hva «øvd» betyr for semesterlinja (Lav)

AD-9 sier at «øvd» regnes ut i `practice`, men ikke regelen. Det er uklart om en økt på hele emnet gjør alle forelesningene øvd. Regelen hører hjemme i PRD/story, men arkitekturen bør peke på hvor den står, siden både 02, 03 og 04 bruker samme svar.
- **Fiks:** Én setning i AD-9 som henviser til regelen (FR-16/FR-57), eller at `practice` har én funksjon `practised_lectures(subject_id)` som alle sidene bruker.

### B5. Inter: DESIGN.md og spine sier forskjellig (Lav)

DESIGN.md sier «Inter fra Google Fonts». Spine (AD-14) sier `@fontsource-variable/inter` fordi appen skal virke uten internett (NFR-3). Spine har rett, men DESIGN.md bør rettes (eller spine bør si at den går foran), så byggere ikke følger DESIGN.md. Husk også `font-feature-settings: "tnum"` (DESIGN).

---

## Dekket og i orden

- Sletteforhåndsvisning med antall (FR-12, Flyt 3 og 4): AD-7 `GET …/delete-preview`.
- Semesterlinja: forelesningsdato, eksamensdato på emnet og «øvd» fra backend (AD-9, kjernedata).
- «Fant ikke siden» for andres data: AD-2 (`404`).
- Norsk feiltekst fra godkjente formuleringer: AD-12.
- Bcrypt, HS256-JWT, `JWT_SECRET`-vakt, `seed_if_empty`, ingen `rollback()`, vertikale moduler som speiles i frontend, pydantic-settings, `.env` valgfri med `.env.example`: tatt med fra technology.md.
- Caddy, Supabase Storage, OpenRouter, pypdf, Redis/worker og brytere i ett lag: avvik begrunnet og godkjent i memlog.
