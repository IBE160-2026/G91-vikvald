---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics]
inputDocuments:
  - prds/prd-G91-vikvald-2026-11-09/prd.md
  - prds/prd-G91-vikvald-2026-11-09/addendum.md
  - architecture/architecture-G91-vikvald-2026-11-14/ARCHITECTURE-SPINE.md
  - ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md
  - ux-designs/ux-G91-vikvald-2026-11-10/EXPERIENCE.md
  - ux-designs/ux-G91-vikvald-2026-11-10/review-ux-2026-11-14.md
---

# Studiekamerat: epics og stories

## Oversikt

Dette dokumentet deler kravene i PRD-en, UX-dokumentene og arkitekturen inn i epics og stories som kan bygges én om gangen. Kravene er hentet fra dokumentene og forkortet der det går uten å endre innholdet. Ved tvil gjelder kildedokumentet.

`technology.md` er bevisst ikke tatt med som eget grunnlag. Arkitekturen (`ARCHITECTURE-SPINE.md`) bygger på den og sier hvor den gjelder og hvor det er avvik. Stakkforslaget i PRD-addendumet (Auth.js, Prisma, SQLite) er erstattet av arkitekturen og brukes ikke.

## Kravliste

### Funksjonelle krav

**1. Norsk språk**

- FR-1: All tekst i grensesnittet er på norsk bokmål, også feilmeldinger og bekreftelser.
- FR-2: Alt generert innhold er på norsk bokmål, også når notatene er på engelsk eller blander språkene. Norske fagbegreper fra notatene brukes slik de står. Brukes et fagbegrep også på engelsk i notatene, står det engelske i parentes, for eksempel «merkevare (brand)».

**2. Innlogging og egne data**

- FR-3: Studenten kan opprette konto med e-post og passord, logge inn og logge ut. Ingen e-postbekreftelse og ingen «glemt passord».
- FR-4: En innlogget student ser og kan endre bare sine egne emner, forelesninger, filer og genererte innhold. Forsøk på å åpne andres innhold gir ingen tilgang.
- FR-5: Studenten kan slette kontoen sin etter en bekreftelse som sier at alt slettes for godt. Avbrudd sletter ingenting. Etter sletting finnes ingen av dataene hennes i appen.

**3. Emner, forelesninger og opplasting**

- FR-6: Studenten kan opprette, gi nytt navn til og slette emner. Et emne har navn og eksamensdato. Eksamensdatoen er påkrevd ved oppretting og kan endres.
- FR-7: Studenten kan opprette, gi nytt navn til og slette forelesninger i et emne.
- FR-8: Studenten kan laste opp én eller flere PDF-filer til en forelesning.
- FR-9: Word-filer og andre filtyper som ikke støttes, avvises med beskjed om hvilke formater som støttes, og hvordan et Word-dokument lagres som PDF.
- FR-10: Har en PDF ingen lesbar tekst (for eksempel skannet), får studenten beskjed om det i stedet for tomt eller feil innhold.
- FR-11: Før første opplasting må studenten godta en vilkårstekst: hun er ansvarlig for materialet, og det skal være egne notater eller materiale hun har rett til å bruke. Teksten har også innholdet i NFR-6.
- FR-12: Studenten kan slette en fil etter en bekreftelse som sier hvor mye generert innhold som slettes sammen med den. Avbrudd sletter ingenting.
- FR-13: Studenten kan erstatte en fil med en ny. Innhold fra den gamle fila slettes etter samme bekreftelse som i FR-12.
- FR-14: Sletting av en forelesning eller et emne sletter alle filer og alt generert innhold som hører til, etter bekreftelse som i FR-12.
- FR-15: En forelesning har navn og dato. Datoen er dagens dato som standard og kan endres. Forelesningene vises sortert etter dato.
- FR-16: For hver forelesning vises antall filer, hvor mye som er generert, og når hun sist øvde (FR-56). *(Kan kuttes.)*

**4. Flashcards**

- FR-17: Studenten kan lage flashcards fra en forelesning med omfang rask (inntil 10), vanlig (inntil 20) eller dyp (inntil 30). *(Kan kuttes: da lages inntil 20 uten valg.)*
- FR-18: Kortene lages bare fra stoffet i forelesningens filer. Gir stoffet grunnlag for færre enn valgt, lages færre, og studenten får beskjed.
- FR-19: To typer kort: spørsmål med svar, og begrepskort (begrep foran, forklaring bak).
- FR-20: Hvert kort viser kilden: filnavn og sidetall (FR-39).
- FR-21: Mens innhold lages, ser studenten at appen jobber. Feiler kallet, eller er det ikke ferdig etter 3 minutter, vises «Vi klarte ikke å lage [flashcardene/quizspørsmålene/…]. Ingenting er lagret. Prøv igjen.» med knappen «Prøv igjen». Antallet i forelesningen er uendret.
- FR-22: Nye kort legges til de eksisterende.
- FR-23: Studenten kan øve på kortene fra én forelesning eller hele emnet, i tilfeldig rekkefølge.
- FR-24: Forsiden vises først. Baksiden vises først når studenten snur kortet.
- FR-25: Etter snuing markerer studenten «Kunne» eller «Kunne ikke». «Kunne ikke»-kort legges bakerst og vises igjen når alle andre er vist én gang, til de er markert «Kunne» eller økten avsluttes. Markeringer for enkeltkort lagres ikke; bare øktresultatet (FR-56).
- FR-26: Når økten er ferdig, vises hvor mange kort hun kunne og ikke kunne. *(Kan kuttes.)*
- FR-27: Studenten kan redigere og slette enkeltkort direkte fra kortet under øving. Sletting krever bekreftelse.

**5. Flervalgsquiz**

- FR-28: Studenten kan lage quizspørsmål fra en forelesning med omfang (inntil 10, 20 eller 30) og vanskelighetsgrad: lett (kjenne igjen en definisjon), middels (forstå sammenhenger), vanskelig (bruke stoffet på et eksempel).
- FR-29: Spørsmålene lages bare fra forelesningens filer, med samme regel som FR-18 og samme venting og feilhåndtering som FR-21.
- FR-30: Hvert spørsmål har fire alternativer, nøyaktig ett riktig. Plasseringen av det riktige varierer.
- FR-31: Alternativene er omtrent like lange, og feilalternativene er troverdige. Det riktige skal ikke kunne gjettes fordi det er lengst eller eneste som høres riktig ut. Måles i SK-15.
- FR-32: Hvert spørsmål viser kilden: filnavn og sidetall (FR-39).
- FR-33: Nye spørsmål legges til de eksisterende.
- FR-34: Studenten kan ta quiz på én forelesning eller hele emnet, i tilfeldig rekkefølge.
- FR-35: Studenten velger ett alternativ og bekrefter. Først da vises riktig svar og forklaring. Svaret kan ikke endres etterpå.
- FR-36: Når quizen er ferdig, vises poengsummen og en liste over feilsvar med riktig svar, forklaring og kilde. *(Listen kan kuttes; poengsummen beholdes.)*
- FR-37: Studenten kan slette enkeltspørsmål direkte under quizen, med bekreftelse. Spørsmål kan ikke redigeres.

**Felles for alt generert innhold**

- FR-38: Alt språkmodellen lager kontrolleres før lagring: sidetallet finnes i fila, quizspørsmål har nøyaktig fire alternativer med ett riktig, og ingen påkrevde felt er tomme. Det som ikke består, forkastes og telles med i «færre enn valgt» (FR-18).
- FR-39: Sidetall i kilder er PDF-sidenummeret, telt fra første side i fila, ikke trykt sidetall.
- FR-40: Sider der teksten mangler formler, sendes også som bilde til språkmodellen. Hellere en side for mye enn for lite. Kontrolleres på *Principles of Economics 3e*, PDF-side 127–128. *(Kan kuttes.)*
- FR-41: Innhold fra en side sendt som bilde, eller der modellen melder at noe mangler, merkes «Inneholder formel – sjekk mot kilden». *(Kan kuttes sammen med FR-40.)*

**Oversikt fram mot eksamen**

- FR-56: En økt starter når studenten begynner å øve, og slutter når hun er ferdig, velger «Avslutt» eller forlater siden. Den lagres bare hvis minst ett kort er markert eller ett spørsmål besvart. Da lagres dato, type, omfang (én forelesning eller hele emnet), om den ble avbrutt, og resultatet: flashcards (også modellkort): vist, «Kunne» og «Kunne ikke», første markering teller; quiz: besvart og riktige; fritekst: besvart, «Riktig», «Delvis riktig» og «Feil». Enkeltsvar lagres ikke. Sammendrag er ikke en økt. En forelesning er øvd når den har minst én lagret økt.
- FR-57: Emnesiden viser forelesningene på en semesterlinje etter dato, fra første forelesning til eksamen, med øvd/ikke øvd, dagens dato og uker til eksamen. Forsiden viser det samme for alle emner. *(Kan kuttes: da vises teksten «Eksamen 04.12, om 3 uker · 4 av 8 forelesninger øvd».)*
- FR-58: Forsiden viser «Neste å øve på» per emne: eldste forelesning med innhold som ikke er øvd. Er alle øvd, vises den som ble øvd lengst siden. *(Kan kuttes.)*

**6. Huskeregler (bør ha)**

- FR-42: Studenten kan be om huskeregler for en forelesning. Appen finner modeller og lister og lager et modellkort for hver: forsiden ber henne forklare modellen, baksiden viser punktene og huskeregelen. Modellkort er flashcards og øves og redigeres som dem (FR-23–FR-27).
- FR-43: Huskeregelen er forbokstaven i hvert punkt, i notatenes rekkefølge.
- FR-44: Begynner alle punktene på samme bokstav, lages modellkortet uten huskeregel.
- FR-45: Før lagring kontrolleres at bokstavene i huskeregelen stemmer med forbokstavene, i tillegg til FR-38.
- FR-46: Studenten kan erstatte huskeregelen med sin egen, eller legge til en der det ikke finnes.
- FR-47: Finner appen ingen modeller eller lister, får studenten beskjed.

**7. Fritekstspørsmål med selvvurdering (bør ha)**

- FR-48: Studenten kan be om fritekstspørsmål for en forelesning, kortsvar eller langsvar, med omfang rask (inntil 5), vanlig (10) eller dyp (15). FR-18, FR-21, FR-22 og FR-38 gjelder.
- FR-49: Hvert spørsmål har et modellsvar og viser kilden.
- FR-50: Studenten kan øve på én forelesning eller hele emnet. Hun skriver svaret i et tekstfelt, og modellsvaret vises først når hun har skrevet noe og valgt å se det.
- FR-51: Etter modellsvaret vurderer hun seg selv som «Riktig», «Delvis riktig» eller «Feil». Når økten er ferdig, ser hun antallet av hver. Svarene lagres ikke, men øktresultatet gjør (FR-56).
- FR-52: Studenten kan slette enkeltspørsmål under øving, med bekreftelse.

**8. Sammendrag (bør ha)**

- FR-53: Studenten kan be om et sammendrag av en forelesning: hovedpunktene ordnet etter tema, 5 til 15 punkter, hvert på høyst 50 ord. FR-21 og FR-38 gjelder.
- FR-54: Hvert punkt viser fil og side det kommer fra.
- FR-55: Et nytt sammendrag erstatter det gamle.

### Ikke-funksjonelle krav

**Kjørbarhet og demomodus**

- NFR-1: Appen kan startes lokalt ved å følge README, med kommandoer som kan kopieres. README oppgir programversjoner, hvordan testene kjøres, og lenker til planleggingsdokumentene.
- NFR-2: Demomodus er standard. En mock-modell lager innhold fra teksten i den opplastede fila etter NFR-2a, med sidetall som finnes, og samme svar for samme fil. Ingen nøkkel, konto eller internett trengs, og alle funksjoner kan prøves, også med en ny PDF.
- NFR-2a: Mock-modellen bruker bare teksten i filene og leter etter definisjonssetninger («er»/«is»):
  - Flashcards: ett begrepskort per definisjonssetning; ordene før «er»/«is» foran, hele setningen bak; kilden er siden.
  - Modellkort: tre eller flere linjer etter hverandre med kulepunkt eller nummer blir ett modellkort, med huskeregel etter FR-43 og FR-44.
  - Quiz: «Hva er [begrep]?», resten av setningen som riktig svar, og tre andre definisjoner fra forelesningen som feilalternativer. Færre enn fire definisjoner gir ingen quiz og beskjed (FR-18).
  - Fritekst: «Forklar [begrep].», med definisjonssetningen som modellsvar.
  - Sammendrag: første setning på hver side, med sidetall.
  - Samme fil gir samme resultat; rekkefølgen under øving er likevel tilfeldig. FR-38 gjelder også mock-modellen. FR-31 og SK-13–SK-17 gjelder bare ekte modell.
  - README sier at demoinnholdet er enkelt og mekanisk og viser at funksjonene virker, ikke kvaliteten med ekte modell.
- NFR-3: Appen leveres med en testbruker og et eksempelemne med forelesninger, filer og ferdig generert innhold. Materialet er skrevet med egne ord eller åpent lisensiert. OpenStax-basert materiale krediteres og deles under CC BY-NC-SA 4.0. OpenStax-PDF-er ligger ikke i repoet; README forklarer hvor de lastes ned.
- NFR-4: Språkmodellen velges med én innstilling (mock eller Gemini), uten kodeendring. Modellen kalles bare fra serveren, og nøkler sendes aldri til nettleseren. Hemmeligheter ligger i `.env` utenfor Git, og repoet har `.env.example`.

**Personvern og datasikkerhet**

- NFR-5: Med ekte språkmodell behandles dataene i EU/EØS hos en leverandør som ikke trener på dem og har databehandleravtale gjennom vilkårene. Mellomlagring er slått av.
- NFR-6: Vilkårsteksten sier at notatene sendes til språkmodellen hos Google i EU, at Google kan logge forespørsler en periode for å oppdage misbruk, og at studenten ikke skal laste opp personopplysninger.
- NFR-7: Passord lagres aldri i klartekst.

**Universell utforming (WCAG 2.1 AA)**

- NFR-8: Alle funksjoner kan brukes med bare tastatur, med synlig fokus. Enkelttaster virker bare under øving og aldri i tekstfelt: flashcards Mellomrom snu, `1` Kunne ikke, `2` Kunne; quiz `A`–`D` og Enter; fritekst `1`/`2`/`3` Feil/Delvis/Riktig; Esc avslutter. Oversikt med «?». *(Oversikten kan kuttes.)*
- NFR-9: Tekst har minst 4,5:1 kontrast.
- NFR-10: Riktig og feil vises med tekst eller symbol i tillegg til farge.
- NFR-11: Alle skjemafelt har synlig etikett, og feilmeldinger sier i tekst hva som er feil og hvordan det rettes.
- NFR-12: Statusmeldinger leses opp av skjermleser. Sidene har norsk som språk.
- NFR-13: Universell utforming kontrolleres med automatiske tester og en manuell tastaturgjennomgang.

**Skjermstørrelser og nettlesere**

- NFR-14: Laget for PC. Ingen vannrett rulling ned til 768 px bredde og med 200 % tekst. Mobil er ikke med.
- NFR-15: Fungerer i siste Chrome, Safari og Edge.

**Grenser og ventetid**

- NFR-16: En fil kan ha inntil 50 sider. Større filer avvises med beskjed om grensen.
- NFR-17: Med ekte modell tar en vanlig gjennomgang (inntil 20 flashcards) normalt under to minutter, i demomodus under fem sekunder. Studenten kan bruke resten av appen imens og ser når det er ferdig. Én jobb om gangen per forelesning. Ferdigmelding vises på andre sider. *(Meldingen på andre sider kan kuttes.)*

### Tilleggskrav fra arkitekturen

Det finnes ingen ferdig startmal. Prosjektet er nytt, så **Epic 1 Story 1 må sette opp skjelettet**: `backend/` (FastAPI, uv), `frontend/` (Next.js, `output: 'standalone'`), `docker-compose.yml` med `frontend`, `backend` og `db` (Postgres 16), `.env.example` og mappestrukturen i arkitekturen.

- AR-1 (AD-1): Frontend snakker bare med `/api/*` på samme adresse, sendt videre med Next.js `rewrites` til `API_INTERNAL_URL` (standard `http://backend:8000`). Ingen `proxy.ts`, ingen Caddy, ingen CORS. Ingen forespørsel varer over 30 sekunder.
- AR-2 (AD-2): Hver rute henter brukeren fra én felles avhengighet `current_user`, og hver spørring filtrerer på brukeren. Andres data gir `404 NOT_FOUND`, ikke `403`.
- AR-3 (AD-3): Bare `generation` kaller språkmodellen, gjennom porten `generate(kind, pages, options)`. `LLM_PROVIDER=mock|mock-invalid|vertex`, `mock` som standard. Vertex bruker pydantic-ai med `GoogleCloudProvider(location='eu')`, ADC og `NativeOutput`, med `VERTEX_MODEL` og `VERTEX_THINKING`. Aldri det globale endepunktet. `InvalidMockGenerator` gir ugyldige elementer med vilje (SK-4).
- AR-4 (AD-4): All generering går gjennom samme løp: hent sidetekst → kall porten (løs liste) → `validate_item(item, pages)` per element → forkast og tell → lagre de gyldige i én transaksjon. Under 5 gyldige sammendragspunkter gir `TOO_FEW_SUMMARY_POINTS`, og det gamle beholdes. Quizalternativer blandes én gang ved lagring, deterministisk. Over 3 minutter (`asyncio.wait_for`) eller feil gir ingen lagring. Studentens egne endringer sjekkes bare for tomme felt.
- AR-5 (AD-5): En jobb er en rad i `jobs` (`kind`, `params`, `status` running/done/failed, `requested`, `created`, `discarded`, `error_code`, tidsstempler). `POST /api/lectures/{id}/jobs` gir `202`; pågående jobb gir `409 JOB_ALREADY_RUNNING`, håndhevet med en delvis unik indeks for både Postgres og SQLite. Jobben kjører som asyncio-oppgave med egen databasesesjon i én Uvicorn-prosess. Ved oppstart settes `running` til `failed`. Én hook i `(app)`-layouten spør `GET /api/jobs/active` og viser ferdigmelding med sonner i et levende område.
- AR-6 (AD-6): Ved opplasting leser PyMuPDF hver side til `file_pages(file_id, page_no, text, needs_image)`, med `page_no` fra 1. Avvisning med feilkode ved manglende vilkår (`TERMS_NOT_ACCEPTED`), ikke PDF, over 50 sider, eller ingen lesbar tekst. Alt innhold lagrer `file_id`, `page_no` og `formula_flag`. Sidebilder lages ved behov og lagres ikke.
- AR-7 (AD-7): `ON DELETE CASCADE` fra bruker til innhold. Kort og spørsmål hører til fila; sammendraget hører til forelesningen og slettes helt når en av forelesningens filer slettes eller erstattes. Erstatning er ett kall (ny `file_id`). Filer på disken slettes etter transaksjonen. `GET …/delete-preview` gir tellingene. Sletting mens en jobb pågår gir `409 JOB_ALREADY_RUNNING`.
- AR-8 (AD-8): Bare `core/storage` leser og skriver filer, i `data/uploads/<user_id>/<file_id>.pdf` på et Docker-volum. Originalt filnavn bare i databasen.
- AR-9 (AD-9): Nettleseren lager `session_id` (UUID) og teller. Resultatet sendes én gang til `POST /api/practice-sessions` (JSON eller `text/plain`, `ON CONFLICT DO NOTHING`) når økten er ferdig, ved «Avslutt», ved navigering, før utlogging og ved `pagehide` med `sendBeacon`. «Øvd» regnes ut i én funksjon i `practice`; en emneøkt teller for alle forelesninger som hadde innhold da den startet.
- AR-10 (AD-10): bcrypt, passord 8 tegn til 72 byte (`PASSWORD_TOO_LONG`). HS256-JWT med PyJWT i cookien `sk_session` (`HttpOnly`, `SameSite=Lax`, `Path=/`), 30 dager, aldri i `localStorage`. `POST /api/identity/logout`, `GET /api/identity/me`. Uten innlogging `401 UNAUTHENTICATED`. `JWT_SECRET` har standardverdi bare når `APP_ENV=local`.
- AR-11 (AD-11): Innstillinger med pydantic-settings; `.env` er valgfri. Brytere bare for bør ha: `FEATURE_MNEMONICS`, `FEATURE_FREETEXT`, `FEATURE_SUMMARY`. Frontend leser dem og `demo_mode` fra `GET /api/config`. Avslåtte ruter svarer `404 FEATURE_DISABLED`. Ingen hemmeligheter med `NEXT_PUBLIC_`.
- AR-12 (AD-12): Alle API-feil har formen `{"error": {"code": "...", "details": {...}}}`, med kodene i `core/errors.py`. Globale håndterere skriver om `HTTPException` og `422`. Frontend har én meldingsfil per kode med tekstene fra EXPERIENCE.md, og en test sjekker at alle backend-kodene finnes der.
- AR-13 (AD-13): Appen kjører på Postgres, pytest på SQLite i minnet (aiosqlite, `StaticPool`, `PRAGMA foreign_keys=ON`). Bare SQL som virker på begge. Databaseendringer med Alembic.
- AR-14 (AD-14): `docker compose up` uten `.env` gir demomodus. `db` har helsesjekk, og `backend` venter. Rekkefølge i backend: Alembic → `seed_if_empty` (bare `APP_ENV=local`) → jobbopprydding → Uvicorn. `/api/health` finnes. Demodata lages gjennom de vanlige tjenestene med mock-modellen. Testbrukerens innlogging står i README. Fonter, ikoner og skript følger med appen (Inter fra `@fontsource-variable/inter`).
- AR-15 (konvensjoner): Kode, tabeller og API-felt på engelsk etter ordlista i arkitekturen. UUID-nøkler, `date` for forelesning og eksamen, UTC-tidsstempler, ISO 8601, visning `dd.mm.åååå`. `snake_case` i JSON. Ressurser under foreldrene, `201`/`204`/`202`. Kilde som `source: {file_id, file_name, page_no}`. `subjects.color_index` (0–5). Generert innhold vises som ren tekst. Fasit sendes med quizspørsmål og vises først etter bekreftelse. Logger til stdout uten notattekst eller passord.
- AR-16 (moduler): Backend `app/modules/<modul>/` med `router.py`, `service.py`, `models.py`, `schemas.py`; moduler `identity`, `subjects`, `files`, `content`, `generation`, `practice`, pluss `core` og `seed`. Frontend `modules/<modul>/` med `types.ts`, `api.ts`, `components/`, `pages/`. Øktlogikken ligger i frontend-modulen `practice`. Bare eiermodulen skriver til sine tabeller.
- AR-17 (testing): `uv run pytest` med `LLM_PROVIDER=mock`; `npm run test` med Vitest; `npx playwright test` mot `docker compose up` med axe på alle sider. Testnavn har krav-ID (`test_fr38_…`) slik at SK-1 kan sjekkes. Pakker låses i `uv.lock` og `package-lock.json`.
- AR-18 (Vertex-oppsett): Vertex krever `LLM_PROVIDER=vertex`, `GOOGLE_CLOUD_PROJECT`, `VERTEX_MODEL` og en `docker-compose.override.yml` utenfor Git som monterer `~/.config/gcloud` skrivebeskyttet. README viser hvordan mellomlagring slås av og sjekkes.
- AR-19 (utsatt): Konkret Gemini-modell (issue #3, #4), regelen for `needs_image` (issue #9), instruksene til modellen (fastsettes i storyen for hver innholdstype), CI (avgjort 2026-11-14, se AR-20) og lisensfil (PyMuPDF er AGPL; eget issue).
- AR-20 (CI, avgjort 2026-11-14): En liten GitHub Actions-jobb kjører `uv run pytest` og `npm run test` ved hver pull request. Playwright er ikke med, fordi den krever hele appen i Docker. Settes opp i den første storien. *(Kan kuttes: CI er ikke et krav i PRD-en, technology.md eller sensorveiledningen, og går først hvis det blir mer arbeid enn ventet.)*

### UX-designkrav

**Tokens og grunnlag**

- UX-DR1: Legg inn alle tokens fra DESIGN.md (farger, typografi, avstander, hjørner, komponentverdier) som Tailwind-tema. Fargene er foreløpige, men rollene står fast; endres en verdi, må kontrasten måles på nytt.
- UX-DR2: Inter fra `@fontsource-variable/inter` med reserven `system-ui, sans-serif`, vektene 400/500/600 og tabulære tall (`tnum`) på all tekst. Ingen 700.
- UX-DR3: Velg og mål tre ekstra emnefarger, så lista har seks. De må ha minst 3:1 mot papir og holdes unna merkefargen, rødt og grønt. Fargene tildeles i fast rekkefølge og gjentas fra det sjuende emnet.
- UX-DR4: To skygger (`lift` og `float`), sløret bak dialoger (42 %), og linjeikoner med 1,5 px strek (lucide-react). Ingen emoji.

**Ramme og navigasjon**

- UX-DR5: Tre sideoppsett: forsiden uten sidemeny (80 px marg), sider med sidemeny (288 px meny, 64/48 px innrykk, to kolonner med 32 px mellomrom) og øving med øktpanel og innhold sentrert (flashcard 768 px, quiz og fritekst 832 px).
- UX-DR6: Toppfelt (`top-bar`): logo til forsiden, initialsirkel, «Konto» og «Logg ut» (logger ut uten bekreftelse). På innloggingen vises bare logoen.
- UX-DR7: Sidemeny med emnetre (`sidebar-tree`) på 03, 04, 13 og 15: emner med prikk og antall forelesninger, åpent emne med forelesninger sortert etter dato, menyrader med ukenummer og fylt/hul statusprikk, valgt rad med `aria-current="page"`, forkortede navn med hele navnet som tilgjengelig navn, og «? Hurtigtaster» nederst.
- UX-DR8: Øktpanel (`session-panel`) under øving: type og omfang, teller («7 / 24»), fremdriftsstolpe, «Kunne 5 · Kunne ikke 1», svarrutenett, symbolforklaring og «Avslutt økt». Når økten er ferdig: «✓ Økten er ferdig og lagret».
- UX-DR9: Svarrutenett (`answer-grid-cell`): seks ruter per rad, ✓/✗/◐, gjeldende rute med ultramarin kant. Rutene er ikke knapper. Leses som «Spørsmål 4: feil».
- UX-DR10: Ved 768 px eller 200 % tekst skjules sidemenyen og øktpanelet bak en menyknapp i toppfeltet. Mellom 768 og 1279 px går forsidekortene fra tre til to og én kolonne, og to kolonner legges under hverandre.

**Oversikt**

- UX-DR11: Semesterlinje (`semester-timeline`): kort med symbolforklaring, månedsoverlinjer, én linje per emne i emnefargen (heltrukket til i dag, stiplet til eksamen), stasjoner (fylt = øvd), eksamen som svart firkant, «I dag»-pille. Tekst ved siden av med emne, antall og «Eksamen 04.12 · om 3 uker», «Eksamen i dag» eller «Eksamen var 04.12». Starter ved første forelesning. På 04 vises ett emne med «Du er her». Har en tekstlig versjon for skjermleser. Månedsetiketter kan forkortes i smale vinduer, men «I dag» og eksamen synes alltid.
- UX-DR12: Emnekort (`subject-card`) på 02: emneprikk og navn, «Åpne ›», antall kort og spørsmål, NESTE Å ØVE PÅ med grunn og hovedknapp, fremdrift som stolper («4 av 8 forelesninger øvd»). Uten innhold: NESTE STEG med «Lag flashcards» til 04.
- UX-DR13: Forelesningstabell (`lecture-table`) på 03: Dato, Forelesning, Filer, Kort, Quiz, Status. Tall høyrejustert, tomme som «–», status som «Øvd 03.11», «Ikke øvd ennå» eller «Ingen filer ennå». Hele raden lenker til 04.
- UX-DR14: Kort «Øv på hele emnet» (`practice-all-card`) på 03: en rad per type som finnes (flashcards med hovedknapp, quiz og fritekst med «Start ›»), og SISTE ØKT nederst.
- UX-DR15: Ny bruker uten emner (02): én setning om hva appen gjør og hovedknappen «Lag ditt første emne».

**Forelesningssiden**

- UX-DR16: Filrad (`file-row`): filikon, filnavn, «12 sider · lastet opp 11.09», «Slett» (rød) og «Erstatt».
- UX-DR17: Opplastingsfelt (`upload-zone`): dra og slipp eller «Velg PDF», flere filer, tekstene fra DESIGN.md. Avviste filer får melding ved feltet.
- UX-DR18: Rad i «Lag og øv» (`create-row`): med innhold «Øv nå» og «+ Lag flere»; uten innhold «Ingen ennå»/«Ikke laget» og en «Lag …»-knapp. «Lag modellkort» på Flashcards-raden alltid. Sammendrag-raden åpner 13. Uten filer er knappene ikke aktive.
- UX-DR19: Jobbstatus (`job-status`): erstatter knappene med snurr, «Lager quizspørsmål …» og «Du kan bruke resten av appen imens.» Andre «Lag …»-knapper er ikke aktive og forklarer hvorfor («Venter til flashcardene er ferdige»). Feil viser meldingen og «Prøv igjen». Leses opp ved start og slutt.
- UX-DR20: Merknadsflate (`note-surface`) for personvernmerknad, huskeregel og «sjekk mot kilden». Aldri for feil.

**Dialoger og skjema**

- UX-DR21: Dialog (`dialog`): fokus flyttes inn og holdes der, Esc lukker uten endring, fokus går tilbake til knappen som åpnet. Ingen stabling. Knapper «Avbryt», så hovedhandling. Bredder 560/640/720 px.
- UX-DR22: Slettebekreftelse etter mønster 14: viser hva som slettes («Dette sletter også 18 flashcards, … Det kan ikke angres.»), «Avbryt» har startfokus, fareknappen har aldri startfokus. Brukes for fil, erstatning, forelesning, emne, konto, kort og spørsmål.
- UX-DR23: Vilkårsdialog (05) med avkrysning; «Godta og last opp» er ikke aktiv før boksen er krysset av. I demomodus står i tillegg «I demomodus sendes ingenting ut.»
- UX-DR24: Lag-dialoger: Lag quiz (06) med omfang som tre valgkort og vanskelighetsgrad som tre rader («Vanlig» og «Middels» forhåndsvalgt, piltaster flytter). Lag flashcards med bare omfang. Lag fritekst med type og omfang (5/10/15). Lag modellkort og Lag sammendrag starter jobben uten dialog.
- UX-DR25: Skjemafelt (`text-field`): synlig etikett, 48 px, feil med rød kant og tekst under, knyttet til feltet, og fokus flyttes til feltet. Passordfelt med «Vis». Dialoger for emne (navn og eksamensdato, «Skriv inn eksamensdatoen, for eksempel 04.12.2026.») og forelesning (navn og dato).
- UX-DR26: Hurtigtastdialog med tastene for siden og bryteren «Bruk hurtigtaster» (på som standard, lagret i `localStorage`). Når den er av, skjules hint-linjen.

**Øving**

- UX-DR27: Flashcard (`flashcard`): SPØRSMÅL og SVAR, kildelenke, «Kunne ikke» og «Kunne» (like brede, aktive først etter snuing), hurtigtasthint. Snus med Mellomrom, klikk eller knapp, uten animasjon eller med kort overgang som respekterer redusert bevegelse. «Rediger» og «Slett» i bunnfeltet.
- UX-DR28: Modellkort (`model-card`): punktene med bokstavbokser og linje, huskeregelen på merknadsflaten, «Endre huskeregel» eller «Legg til huskeregel».
- UX-DR29: Quiz: svaralternativer (`quiz-option`, 62 px, A–D) der riktig får grønn tone og «✓ Riktig svar», feil valgt får rød tone og «✗ Ditt svar», låst etter bekreftelse. Forklaringskort med kilde og forelesning. «Slett» i bunnfeltet.
- UX-DR30: Fritekst: tekstfelt «Ditt svar», «Vis modellsvar» aktiv først med tekst, så «Levert · N ord» og låst felt, modellsvar med kilde og selvvurdering med tre like knapper uten forhåndsvalg.
- UX-DR31: Fokus under øving flyttes til neste naturlige handling («Kunne», «Neste spørsmål») etter snuing eller bekreftelse.
- UX-DR32: Hurtigtaster etter tabellen i EXPERIENCE.md, bare under øving og aldri i tekstfelt. Resultatsider: Enter = øv igjen, Esc = tilbake.
- UX-DR33: «Avslutt økt» og Esc avslutter uten bekreftelse. Med svar vises resultatet som avbrutt («Avbrutt etter 12 av 20»); uten svar går Klara rett tilbake uten resultatside.

**Resultat og innhold**

- UX-DR34: Resultatsammendrag (`result-summary`): overlinje, tittel, undertekst og tall uten feiring. Flashcards «Kunne 19» og «Kunne ikke 5» med prosent. Fritekst med tre tall. Hovedknappen starter samme økt på nytt, og tilbakevalget går dit økten startet.
- UX-DR35: Liste over feil (`missed-list`): nummer, spørsmål, kilde, og for quiz «✗ Ditt svar», «✓ Riktig svar» og forklaring. For fritekst: Feil og Delvis riktig med modellsvar og kilde, uten studentens svar.
- UX-DR36: Kildelenke (`source-link`) som tekst, ikke lenke: filikon og «merkevare-notater.pdf, side 4», uten understreking.
- UX-DR37: Formelmerke (`formula-flag`): «Inneholder formel – sjekk mot kilden» ordrett, på merknadsflaten med infoikon over kilden.
- UX-DR38: Sammendragssiden (13): artikkelkolonne på 568 px, temaer som seksjonstitler, kilde på hvert punkt, merknaden «Sammendraget er laget av en språkmodell. Sjekk viktige punkter mot kilden.», og «Lag nytt sammendrag» der det gamle står til det nye er ferdig.

**Konto og andre sider**

- UX-DR39: Kontoside (15): tre kort (Innlogging, Vilkår og personvern, Slett kontoen). Passord vises som «Lagret kryptert, aldri i klartekst». Demomerket og språkmodell-raden «Testmodell i demomodus (ellers Google, i EU)». «Les vilkårene» viser teksten uten avkrysning. «Slett kontoen …» viser hvor mye som slettes og åpner bekreftelsen.
- UX-DR40: Innlogging og oppretting (01): samme kort med bytte. «Feil e-post eller passord. Sjekk at Caps Lock er av.» «Det finnes allerede en konto med denne e-postadressen. Logg inn i stedet.» Minst 8 tegn. Utløpt innlogging gir «Du er logget ut. Logg inn igjen.»
- UX-DR41: «Fant ikke siden» med lenke til forsiden, brukt både når innhold ikke finnes og når det tilhører en annen.
- UX-DR42: Meldingstekstene i EXPERIENCE.md brukes ordrett (Word-fil, PDF uten tekst, over 50 sider, generering feilet, færre enn valgt, ingen modeller).

**Universell utforming**

- UX-DR43: Svart fokusring (2 px, 2 px luft) på alt som kan få fokus. Den fjernes aldri.
- UX-DR44: Levende områder for jobbstart og -slutt, feil, færre enn valgt, resultat etter bekreftet svar og «Økten er ferdig», uten at fokus flyttes.
- UX-DR45: Én h1 per side, landemerker for toppfelt, sidemeny og innhold, `lang="nb"` og `lang="en"` på engelske begreper i parentes. Tab-rekkefølgen følger leserekkefølgen.
- UX-DR46: Kontroller har kanten `border-control` (3,2:1). `border-card` brukes aldri på noe man kan trykke på.

### Åpne kanttilfeller fra UX-gjennomgangen

Gruppe 3 i [review-ux-2026-11-14.md](ux-designs/ux-G91-vikvald-2026-11-10/review-ux-2026-11-14.md) (issue #18) har kanttilfeller som ikke er avgjort. De er ikke krav ennå. Noen er allerede avgjort av arkitekturen. Resten må avgjøres når storien de hører til skrives, eller føres videre i issue #18.

| Funn | Hva | Avgjort av arkitekturen? |
|---|---|---|
| E9, E10 | Hva skjer med en jobb ved sletting eller utlogging | Delvis: sletting gir `409 JOB_ALREADY_RUNNING` (AD-7). Utlogging er ikke avgjort. |
| E13 | Sammendrag med færre enn 5 punkter | Ja: `TOO_FEW_SUMMARY_POINTS`, det gamle beholdes (AD-4) |
| E14 | Det gamle sammendraget når et nytt feiler | Ja: det gamle beholdes, ingenting lagres (AD-4) |
| E15 | Sammendraget når én av flere filer slettes | Ja: hele sammendraget slettes (AD-7) |
| A15, E1 | «Øv nå» kan starte en tom økt | Nei |
| E2, E6 | Emne uten forelesninger på emnekortet og semesterlinjen | Nei |
| E3 | Rekkefølge når to forelesninger har samme dato | Nei |
| E4 | Semesterlinjen låst til august–desember | Nei |
| A20, E12 | Melding når ingenting ble laget (0 av N) | Nei |
| E16 | Slettedialogen sier «0 flashcards …» | Nei |
| E17, E18 | Erstatningsfil avvist, eller filvelgeren avbrutt | Nei |
| E19 | Flere filer der bare noen avvises | Nei |
| E20 | Låst eller ødelagt PDF | Nei |
| E21 | To filer med samme navn | Nei |
| E22, E41 | Kort slettes eller kommer til midt i en økt | Nei |
| A16, E23, E40, E24, E25 | Esc og Mellomrom som utløser feil handling under øving | Nei |
| A7, E26 | Enter i quiz uten valg eller over forklaringen | Nei |
| A8, E27, E28 | Fokus etter «Vis modellsvar», tastene 1–3 for tidlig, svar med bare mellomrom | Nei |
| A6, E29, E30 | Telleren «25 / 24» og rutenett for svært mange kort | Nei |
| E33, E34, E35 | Tomme felt i huskeregel, kort og navn, og like navn | Delvis: egne endringer sjekkes for tomme felt (AD-4). Like navn er ikke avgjort. |

### Dekning av funksjonelle krav

| Krav | Epic | Kort |
|---|---|---|
| FR-1 | 1 (og alle) | Norsk bokmål i grensesnittet |
| FR-2 | 3 (og 4, 7–9) | Norsk i generert innhold |
| FR-3 | 1 | Konto, innlogging, utlogging |
| FR-4 | 1 (og alle) | Bare egne data |
| FR-5 | 2 | Slette konto |
| FR-6, FR-7 | 2 | Emner og forelesninger |
| FR-8–FR-11 | 2 | Opplasting, avvisning, vilkår |
| FR-12–FR-14 | 2 (tellinger utvides i 3, 4, 7–9) | Slette og erstatte |
| FR-15 | 2 | Forelesningsdato og sortering |
| FR-16 | 5 | Tellinger og sist øvd per forelesning |
| FR-17–FR-27 | 3 | Flashcards |
| FR-28–FR-37 | 4 | Quiz |
| FR-38 | 3 (og 4, 7–9) | Kontroll før lagring |
| FR-39 | 2 (sidenummer) og 3 (kilde) | PDF-sidenummer |
| FR-40, FR-41 | 6 | Formler som bilde og formelmerke |
| FR-42–FR-47 | 7 | Huskeregler |
| FR-48–FR-52 | 8 | Fritekst |
| FR-53–FR-55 | 9 | Sammendrag |
| FR-56 | 3 (og 4, 8) | Lagring av økter |
| FR-57, FR-58 | 5 | Semesterlinje og «Neste å øve på» |

Alle 58 funksjonelle krav har en epic.

## Epics

### Prinsipper for inndelingen

- **Vertical slices.** Hver epic er en hel del av appen, fra side til API, logikk og tabell, og følger modulene i arkitekturen (AR-16). Koden for én epic holdes så isolert som mulig i sin modul.
- **Gjenbruk (DRY).** Det som brukes av mer enn én modul, flyttes til en fellesmappe og kopieres aldri: `backend/app/core/` og `frontend/lib/` (fra arkitekturen) og `frontend/components/` for felles skjermdeler som knapper, dialog, slettebekreftelse, kildelenke, merknadsflate og formelmerke (nytt, avgjort 2026-11-14).
- **To motorer bygges én gang i epic 3:** genereringsløpet i `generation` (jobb, mock-modell, kontroll, AR-3 til AR-5) og øktrammen i `practice` (øktpanel, svarrutenett, resultat, lagring av økt). Senere innholdstyper plugger seg inn i dem.
- **Testing, universell utforming og README i hver story.** Hver story har tester med krav-ID (AR-17) og axe-sjekk av sidene den lager. README starter i epic 1 og fullføres i epic 6. Epic 6 tar bare den samlede kontrollen.
- **Tabeller lages når de trengs**, i storien som først bruker dem.
- **Rekkefølge og kutt:** epic 1–4 er kjerneflyten i demomodus (milepæl 27.11), epic 6 kobler på Gemini (1.12), og epic 7–9 er bør ha som kuttes bakfra.

### Epic 1: Kom i gang: appen starter og du kan logge inn

Sensor starter appen med én kommando uten nøkler, og studenten kan opprette konto, logge inn og logge ut. Legger grunnmuren alle senere epics bygger på: prosjektskjelett, Docker Compose, CI, fellesmappene, designtokens, toppfelt, feilformat, innstillinger og «Fant ikke siden».
**Krav:** FR-1, FR-3, FR-4. NFR-1 (start), NFR-4, NFR-7, NFR-9, NFR-11, NFR-12. AR-1, AR-2, AR-10–AR-17, AR-20. UX-DR1, UX-DR2, UX-DR4, UX-DR5, UX-DR6, UX-DR25, UX-DR40, UX-DR41, UX-DR43, UX-DR45, UX-DR46.

### Epic 2: Emner, forelesninger og notater

Studenten organiserer semesteret: oppretter, gir nytt navn til og sletter emner og forelesninger, laster opp PDF-notater etter å ha godtatt vilkårene, får beskjed om filer som avvises, sletter og erstatter filer, og kan slette kontoen sin.
**Krav:** FR-5–FR-15, FR-39. NFR-6, NFR-16. AR-6–AR-8. UX-DR3, UX-DR7, UX-DR13 (uten tellinger av innhold), UX-DR15, UX-DR16, UX-DR17, UX-DR20 (personvernmerknaden), UX-DR21, UX-DR22, UX-DR23, UX-DR39, UX-DR42.

### Epic 3: Øv med flashcards

Studenten lager flashcards fra en forelesning, øver med «Kunne» og «Kunne ikke», ser resultatet, retter eller sletter dårlige kort, og økten lagres. Bygger genereringsløpet og øktrammen som de andre innholdstypene gjenbruker.
**Krav:** FR-2, FR-17–FR-27, FR-38, FR-56 (flashcards). NFR-2, NFR-2a (flashcards), NFR-8, NFR-10, NFR-17. AR-3–AR-5, AR-9. UX-DR8, UX-DR9, UX-DR10, UX-DR14 (flashcards), UX-DR18, UX-DR19, UX-DR20, UX-DR24 (flashcards), UX-DR26, UX-DR27, UX-DR31–UX-DR36, UX-DR44.

### Epic 4: Ta quiz

Studenten lager flervalgsquiz med valgt omfang og vanskelighetsgrad, svarer og bekrefter før fasit og forklaring vises, ser poengsum og feilsvar, og kan slette dårlige spørsmål. Plugger seg inn i motorene fra epic 3.
**Krav:** FR-28–FR-37, FR-56 (quiz). NFR-2a (quiz). UX-DR14 (quiz), UX-DR24 (quiz), UX-DR29.

### Epic 5: Oversikt fram mot eksamen

Studenten ser hvor hun står i semesteret: semesterlinja med øvd og ikke øvd og tid til eksamen, «Neste å øve på» på forsiden, og tellinger og «sist øvd» i forelesningstabellen. Mye kan kuttes til tekst.
**Krav:** FR-16, FR-57, FR-58. UX-DR11, UX-DR12, UX-DR13 (tellinger og status).

### Epic 6: Ekte språkmodell og klar for sensor

Appen kan bruke Gemini i EU, formler kommer med fra sider sendt som bilde, og sensor møter en ferdig app med testbruker, eksempelemne og en README som virker. Avslutter med samlet kontroll av universell utforming, tastatur, nettlesere og stikkprøvene for kvalitet.
**Krav:** FR-40, FR-41. NFR-1 (fullført), NFR-3, NFR-5, NFR-13, NFR-14, NFR-15. AR-14 (demodata), AR-18, AR-19 (lisens). UX-DR37. SK-11–SK-17.

### Epic 7: Huskeregler (bør ha)

Studenten får modellkort med forbokstavregel for modeller og lister i notatene, øver på dem i flashcard-økten og kan endre eller legge til egen huskeregel.
**Krav:** FR-42–FR-47. NFR-2a (modellkort). UX-DR28.

### Epic 8: Fritekstspørsmål med selvvurdering (bør ha)

Studenten øver på kortsvar- og langsvarsspørsmål, skriver svaret selv, ser modellsvaret med kilde og vurderer seg selv.
**Krav:** FR-48–FR-52, FR-56 (fritekst). NFR-2a (fritekst). UX-DR14 (fritekst), UX-DR24 (fritekst), UX-DR30.

### Epic 9: Sammendrag (bør ha)

Studenten leser et sammendrag av forelesningen med kilde på hvert punkt, og kan lage et nytt som erstatter det gamle.
**Krav:** FR-53–FR-55. NFR-2a (sammendrag). UX-DR38.

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
**Og** siden erstattes av innloggingen i story 1.5 og forsiden i story 1.6

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
**Og** en ukjent kode, `INTERNAL_ERROR` og `VALIDATION_ERROR` uten egen tekst gir reserveteksten «Noe gikk galt. Prøv igjen.»

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

### Story 1.4: Opprett konto

Som student,
vil jeg opprette en konto med e-post og passord,
slik at notatene og øvingen min blir mine og ligger der neste gang.

**Krav:** FR-1, FR-3, NFR-7, NFR-9, NFR-11, NFR-12, AR-10, AR-13, AR-15, AR-16, UX-DR1, UX-DR2, UX-DR4, UX-DR5, UX-DR6, UX-DR25, UX-DR40, UX-DR43, UX-DR45, UX-DR46

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
**Og** studenten er logget inn etterpå: svaret setter cookien `sk_session` (HS256-JWT med PyJWT, `HttpOnly`, `SameSite=Lax`, `Path=/`, 30 dager), og JWT-en står aldri i svaret

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

**Gitt** `JWT_SECRET`
**Når** backenden starter
**Så** har den en standardverdi bare når `APP_ENV=local`, og ellers nekter appen å starte uten nøkkel
**Og** `.env.example` og innstillingstabellen i README har `JWT_SECRET`

**Gitt** registrering
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

*Siden «Opprett konto» (variant av 01)*

**Gitt** at studenten ikke er logget inn
**Når** hun åpner `/registrer`
**Så** viser `(auth)`-layouten toppfeltet med bare logoen
**Og** kortet har h1 «Opprett konto», undertittelen «Fra forelesningsnotat til eksamen.», feltene «E-post» og «Passord» (med «Vis») og hovedknappen «Opprett konto»
**Og** den grå, forenklede semesterlinja og setningen «Studiekamerat lager øvingsstoff fra dine egne forelesningsnotater, med kilde på alt.» står som i skisse 01, med linja skjult for skjermleser

**Gitt** en e-postadresse som finnes fra før
**Når** studenten prøver å opprette konto
**Så** står «Det finnes allerede en konto med denne e-postadressen. Logg inn i stedet.» under e-postfeltet

**Gitt** et passord med færre enn 8 tegn, for langt passord eller ugyldig e-post
**Når** studenten sender skjemaet
**Så** står en melding fra meldingsfila under feltet som sier hva som er feil og hvordan det rettes: «Passordet må ha minst 8 tegn.», «Passordet er for langt. Bruk færre tegn.» eller «Skriv inn en gyldig e-postadresse, for eksempel klara@eksempel.no.», og fokus flyttes til feltet
**Og** frontend sjekker de samme reglene med zod før kallet, men backenden avgjør

**Gitt** gyldig e-post og passord
**Når** studenten oppretter konto
**Så** er hun innlogget og kommer til `/`, som foreløpig er startsiden fra story 1.1

**Gitt** siden «Opprett konto», også med feilmelding
**Når** Playwright kjører axe
**Så** er det ingen brudd
**Og** alt kan gjøres med bare tastatur i leserekkefølgen, og Enter sender skjemaet

**Gitt** testene i denne storien
**Når** de leses
**Så** har hvert testnavn krav-ID-en det tester, for eksempel `test_fr3_opprett_konto`, `test_nfr7_passord_lagres_som_hash` og `test_ar10_passord_over_72_byte_avvises`

**Gitt** README
**Når** sensor leser den
**Så** står det hvordan man oppretter en konto på `http://localhost:3000` (testbrukeren kommer i epic 6)

### Story 1.5: Logg inn

Som student,
vil jeg logge inn med e-post og passord,
slik at jeg kommer tilbake til stoffet mitt.

**Krav:** FR-3, NFR-11, NFR-12, AR-2, AR-10, UX-DR25, UX-DR40

**Akseptkriterier:**

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

**Gitt** at studenten ikke er logget inn
**Når** hun åpner `/logg-inn`
**Så** viser siden samme kort og felles komponenter som «Opprett konto» (story 1.4)
**Og** kortet har h1 «Logg inn», undertittelen «Fra forelesningsnotat til eksamen.», feltene «E-post» og «Passord» (med «Vis»), hovedknappen «Logg inn» og «Ny her?» med «Opprett konto»
**Og** den grå, forenklede semesterlinja og setningen «Studiekamerat lager øvingsstoff fra dine egne forelesningsnotater, med kilde på alt.» står som i skisse 01, med linja skjult for skjermleser

**Gitt** innloggingskortet
**Når** studenten velger «Opprett konto»
**Så** kommer hun til «Opprett konto», som har en vei tilbake til «Logg inn»

**Gitt** feil e-post eller passord
**Når** studenten prøver å logge inn
**Så** står «Feil e-post eller passord. Sjekk at Caps Lock er av.» under feltet med feilkant, fokus flyttes til feltet, og meldingen leses opp av skjermleser

**Gitt** riktig e-post og passord
**Når** studenten logger inn eller oppretter konto
**Så** kommer hun til forsiden (`/`)

**Gitt** innloggingssiden også med feilmelding
**Når** Playwright kjører axe
**Så** er det ingen brudd
**Og** alt kan gjøres med bare tastatur i leserekkefølgen: E-post, Passord, Vis, Logg inn, Opprett konto, og Enter sender skjemaet

**Gitt** at appen kjører i Docker
**Når** Playwright oppretter en konto, logger ut ved å slette cookien og logger inn igjen
**Så** går alle kallene gjennom `rewrites`, og cookien `sk_session` er `HttpOnly`

**Gitt** testene i denne storien
**Når** de leses
**Så** har hvert testnavn krav-ID-en det tester, for eksempel `test_fr3_logg_inn`, `test_ar10_cookie_er_httponly` og `test_fr3_feil_passord_gir_samme_svar`

### Story 1.6: Bruk appen innlogget, logg ut og få «Fant ikke siden»

Som student,
vil jeg ha et toppfelt med «Logg ut», bli sendt til innloggingen når jeg ikke er innlogget, og se «Fant ikke siden» når noe ikke finnes,
slik at appen er trygg å bruke og ingen kan se mine data.

**Krav:** FR-1, FR-3, FR-4, NFR-11, NFR-12, AR-2, AR-10, AR-12, UX-DR4, UX-DR5, UX-DR6, UX-DR21 (felles komponent), UX-DR40, UX-DR41, UX-DR43, UX-DR45

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
**Så** sendes hun til innloggingssiden, og der står «Du er logget ut. Logg inn igjen.» i et levende område som leses opp
**Og** meldingen vises bare når studenten har vært innlogget i samme fane; åpner hun appen etter at cookien er utløpt, kommer hun til innloggingen uten melding (backenden kan ikke se forskjell)

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
**Så** vises siden med h1 «Fant ikke siden» og lenken «Gå til forsiden»
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
| FR-1 | 1.3 (meldingsfil), 1.4, 1.5, 1.6 |
| FR-3 | 1.4 (opprett konto), 1.5 (logg inn), 1.6 (logg ut) |
| FR-4 | 1.6 (`current_user` på alle ruter, 404 for andres data) |
| UX-DR1 | 1.4 |
| UX-DR2 | 1.4 |
| UX-DR4 | 1.4 (skygger, slør, ikoner), 1.6 (dialogen bruker dem) |
| UX-DR5 | 1.4 (målene som tokens), 1.6 (forsideoppsettet). Oppsettet med sidemeny tas i bruk i epic 2 og øvingsoppsettet i epic 3 |
| UX-DR6 | 1.4 (bare logo på auth-sidene), 1.6 (fullt toppfelt) |
| UX-DR25 | 1.4 (skjemafelt og passord med «Vis»), 1.5. Dialogene for emne og forelesning er epic 2 |
| UX-DR40 | 1.4 (oppretting), 1.5 (innlogging), 1.6 (utløpt innlogging) |
| UX-DR41 | 1.6 |
| UX-DR43 | 1.4 |
| UX-DR45 | 1.1 (`lang="nb"`), 1.4 (h1), 1.6 (landemerker, Tab-rekkefølge) |
| UX-DR46 | 1.4 |

Øvrige krav fra epicens linje: NFR-1 (1.1), NFR-4 (1.1, 1.3), NFR-7 (1.4), NFR-9 (1.4, axe måler kontrast), NFR-11 (1.4, 1.5, 1.6), NFR-12 (1.1, 1.4, 1.5, 1.6), AR-1 (1.1), AR-2 (1.5, 1.6), AR-10 (1.4, 1.5, 1.6), AR-11 (1.3), AR-12 (1.3, nye koder i 1.4–1.6), AR-13 (1.1, første migrering i 1.4), AR-14 (1.1; Inter i 1.4; `seed_if_empty` og jobbopprydding legges inn i oppstarten i epic 6 og 3), AR-15 (1.1, 1.4), AR-16 (1.1, 1.4), AR-17 (alle), AR-20 (1.2).

Kanttilfeller: ingen i tabellen hører til epic 1. E10 (jobb ved utlogging) avgjøres i epic 3.

### Avgjort av Silje 2026-11-14

1. Studenten er innlogget med en gang hun har opprettet konto, og kommer til forsiden.
2. Feiltekstene «Passordet må ha minst 8 tegn.», «Passordet er for langt. Bruk færre tegn.» og «Skriv inn en gyldig e-postadresse, for eksempel klara@eksempel.no.»
3. Reserveteksten for ukjente feil er «Noe gikk galt. Prøv igjen.»
4. «Du er logget ut. Logg inn igjen.» vises bare når innloggingen går ut mens studenten bruker appen i samme fane.
5. Lenken på «Fant ikke siden» heter «Gå til forsiden».
6. Den felles dialogen bygges i story 1.6.
7. Story 1.4 i første utkast var for stor og er delt i 1.4 (opprett konto) og 1.5 (logg inn).

## Epic 2: Emner, forelesninger og notater

Studenten organiserer semesteret: oppretter, gir nytt navn til og sletter emner og forelesninger, laster opp PDF-notater etter å ha godtatt vilkårene, får beskjed om filer som avvises, sletter og erstatter filer, og kan slette kontoen sin.

**Hva forsiden (02) viser etter epic 2:** overskriften «Dine emner», knappen «Nytt emne» og en enkel liste med ett element per emne: emneprikk i emnefargen, emnenavnet som lenke til emnesiden (03), antall forelesninger og eksamensdatoen. En ny bruker uten emner ser i stedet én setning om hva appen gjør og hovedknappen «Lag ditt første emne» (UX-DR15). Semesterlinja og emnekortene med «Neste å øve på» kommer i epic 5 og erstatter lista.

### Story 2.1: Opprett emner og se dem på forsiden

Som student,
vil jeg opprette emner med navn og eksamensdato og se dem på forsiden,
slik at jeg kan organisere notatene mine etter fag.

**Krav:** FR-6 (opprette, gi nytt navn, endre eksamensdato), FR-4, UX-DR3, UX-DR7 (emnenivået), UX-DR15, UX-DR21, UX-DR25

**Akseptkriterier:**

**Gitt** en innlogget student
**Når** hun sender `POST /api/subjects` med `name` og `exam_date` (ISO 8601-dato)
**Så** lagres emnet i tabellen `subjects` (UUID, `user_id`, `name`, `exam_date`, `color_index`, `created_at`), laget med en Alembic-migrering i denne storien, med fremmednøkkel til `users` og `ON DELETE CASCADE` (AR-7)
**Og** svaret er `201` med emnet i `snake_case`

**Gitt** en innlogget student
**Når** hun henter `GET /api/subjects`
**Så** får hun bare sine egne emner, i rekkefølgen de ble opprettet, hver med `lecture_count` (0 i denne storien, siden forelesninger kommer i 2.2)
**Og** `GET`, `PATCH` på et emne som tilhører en annen bruker eller ikke finnes, gir `404 NOT_FOUND` (AR-2)

**Gitt** at studenten oppretter et nytt emne
**Når** `color_index` settes
**Så** får emnet den første av de seks fargene (0–5) i fast rekkefølge som ingen av hennes eksisterende emner bruker, og har alle seks fargene emner, brukes antall emner modulo 6, slik at fargene gjentas fra det sjuende emnet (UX-DR3)
**Og** `color_index` endres aldri etter at emnet er opprettet

**Gitt** de tre emnefargene i DESIGN.md
**Når** storien er ferdig
**Så** finnes tre nye emnefarger (`subject-4` til `subject-6`) som Tailwind-tokens ved siden av de tre første, valgt slik at de holdes unna merkefargen (#3A3FB0), rødt (`danger`) og grønt (`success`)
**Og** en Vitest-test (`test_uxdr3_…`) regner ut kontrasten for alle seks mot `paper` (#F8F7F3) og krever minst 3:1
**Og** de valgte verdiene og målt kontrast føres inn i fargelista og kontrasttabellen i DESIGN.md, og Silje godkjenner fargene før storien flettes

**Gitt** at emneprikken vises
**Når** fargen er den eneste forskjellen mellom to emner
**Så** står emnenavnet alltid ved prikken, og prikken er pynt for skjermleser (`aria-hidden`)

**Gitt** en innlogget student uten emner
**Når** hun åpner forsiden (02)
**Så** ser hun setningen «Studiekamerat lager flashcards og quiz fra forelesningsnotatene dine, så du kan øve fram mot eksamen.» og hovedknappen «Lag ditt første emne», og ingen tom liste (UX-DR15)
**Og** knappen åpner dialogen for nytt emne

**Gitt** en student med emner
**Når** hun åpner forsiden (02)
**Så** ser hun h1 «Dine emner», omrissknappen «Nytt emne» og en liste med emneprikk, emnenavn som lenke til emnesiden (03), antall forelesninger og «Eksamen 04.12.2026» (`dd.mm.åååå`)
**Og** forsiden har ingen sidemeny (UX-DR5)

**Gitt** dialogen for nytt emne (gjenbruker dialog og skjemafelt fra `frontend/components/`)
**Når** studenten fyller ut «Navn» og «Eksamensdato» og bekrefter
**Så** opprettes emnet, og hun kommer til emnesiden (03)
**Og** fokus starter i første felt, Esc lukker uten endring, og fokus går tilbake til knappen som åpnet dialogen (UX-DR21)

**Gitt** dialogen for nytt emne eller «Endre eksamensdato»
**Når** eksamensdatoen er tom eller ugyldig
**Så** står «Skriv inn eksamensdatoen, for eksempel 04.12.2026.» under feltet, feltet får rød kant, meldingen er knyttet til feltet, og fokus flyttes dit (UX-DR25, NFR-11)
**Og** en eksamensdato som er passert, godtas

**Gitt** dialogen for nytt emne eller nytt navn *(E35)*
**Når** navnet er tomt eller bare består av mellomrom
**Så** lagres ingenting: backend svarer med en feilkode (`NAME_REQUIRED`, ført i `core/errors.py` og meldingsfila) og frontend viser under feltet «Skriv inn et navn.»
**Og** mellomrom foran og bak navnet fjernes før lagring
**Og** to emner kan ha samme navn; appen sjekker ikke like navn, fordi emnene skilles på farge, eksamensdato og plass i lista

**Gitt** emnesiden (03) for et emne
**Når** studenten åpner den
**Så** viser den h1 med emnenavnet, en linje med «eksamen fredag 04.12.2026», og knappene «Ny forelesning» (aktiveres i 2.2), «Nytt navn» og «Endre eksamensdato»
**Og** «Nytt navn» og «Endre eksamensdato» åpner dialoger med dagens verdi fylt ut og lagrer med `PATCH /api/subjects/{id}`

**Gitt** emnesiden (03)
**Når** den vises
**Så** står sidemenyen (`sidebar-tree`) til venstre med overlinjen EMNER og alle emnene med emneprikk, navn og antall forelesninger høyrejustert (UX-DR7)
**Og** klikk på et emnenavn går til 03, og raden for emnet som er åpent, har `aria-current="page"`
**Og** lange navn kortes av med «…», og hele navnet er tilgjengelig navn
**Og** knappen «? Hurtigtaster» nederst legges til i epic 3, ikke her

**Gitt** sidene 02 og 03
**Når** Playwright-testene kjører med axe
**Så** finnes ingen brudd, og alt i storien kan gjøres med bare tastatur med synlig fokus

**Gitt** testene for storien
**Når** de kjøres med `uv run pytest`, `npm run test` og `npx playwright test`
**Så** har hver test krav-ID i navnet (`test_fr6_…`, `test_fr4_…`, `test_uxdr15_…`), slik AR-17 krever

### Story 2.2: Legg til forelesninger og finn dem i sidemenyen

Som student,
vil jeg opprette forelesninger med navn og dato i et emne og se dem sortert etter dato,
slik at notatene fra hver forelesning har sin egen plass.

**Krav:** FR-7 (opprette, gi nytt navn), FR-15, FR-4, UX-DR7, UX-DR13 (uten tellinger av innhold), UX-DR21, UX-DR25

**Akseptkriterier:**

**Gitt** et emne studenten eier
**Når** hun sender `POST /api/subjects/{id}/lectures` med `name` og `date`
**Så** lagres forelesningen i tabellen `lectures` (UUID, `subject_id`, `name`, `date`, `created_at`), laget med en Alembic-migrering i denne storien, med `ON DELETE CASCADE` fra `subjects`
**Og** svaret er `201`, og `lecture_count` for emnet øker med én

**Gitt** dialogen «Ny forelesning» på emnesiden (03)
**Når** den åpnes
**Så** er «Dato» fylt ut med dagens dato, og datoen kan endres (FR-15)
**Og** etter oppretting kommer studenten til forelesningssiden (04)

**Gitt** at datoen i dialogen er tom eller ugyldig
**Når** studenten bekrefter
**Så** lagres ingenting, og en feilmelding under feltet sier hva som er feil og gir et eksempel, etter samme mønster som eksamensdatoen: «Skriv inn datoen, for eksempel 11.09.2026.»

**Gitt** et emne med flere forelesninger *(E3)*
**Når** `GET /api/subjects/{id}/lectures` henter dem
**Så** er de sortert etter `date`, og forelesninger med samme dato står i den rekkefølgen de ble opprettet (`created_at`)
**Og** tabellen på 03 og sidemenyen bruker samme rekkefølge fra API-et og sorterer ikke på nytt i frontend

**Gitt** emnesiden (03) for et emne med forelesninger
**Når** den vises
**Så** står forelesningstabellen (`lecture-table`) med kolonnene Dato (`dd.mm`) og Forelesning, og hele raden er en lenke til forelesningssiden (04) (UX-DR13)
**Og** kolonnene for filer og status legges til i 2.3, og kolonnene Kort og Quiz kommer i epic 5

**Gitt** et emne uten forelesninger *(E2/E6, delen som gjelder 02, 03 og sidemenyen)*
**Når** studenten åpner emnesiden (03)
**Så** står det i stedet for tabellen «Ingen forelesninger ennå.», og «Ny forelesning» er knappen for å komme videre
**Og** i sidemenyen står emnet med antallet 0, og når emnet er åpent, vises ingen menyrader
**Og** på forsiden står «0 forelesninger» på emnet (emnekortet og semesterlinja behandles i epic 5)

**Gitt** sidemenyen på 03 og 04
**Når** et emne er åpent
**Så** vises forelesningene som menyrader (`menu-row`) sortert som over, med ukenummeret (ISO-uke fra datoen) i dempet grå foran navnet og en hul statusprikk (UX-DR7)
**Og** klikk på en rad går til 04, og valgt forelesning har `aria-current="page"`
**Og** et emne kan åpnes og lukkes med tastatur, og emnet til siden som vises, er åpent
**Og** statusprikken er hul for alle i denne epicen; fylt prikk for øvd kommer i epic 5

**Gitt** forelesningssiden (04)
**Når** studenten åpner den
**Så** viser den h1 med forelesningsnavnet og linjen «Forelesning fredag 11.09.2026», og sidemenyen med emnet åpent
**Og** knappene «Nytt navn» og «Endre dato» åpner dialoger med dagens verdi og lagrer med `PATCH /api/lectures/{id}`
**Og** etter endret dato flytter forelesningen seg til riktig plass i tabellen og sidemenyen

**Gitt** dialogene for ny forelesning og nytt navn *(E35)*
**Når** navnet er tomt eller bare mellomrom
**Så** gjelder samme regel som for emner i 2.1 (`NAME_REQUIRED`, «Skriv inn et navn.», mellomrom fjernes)
**Og** to forelesninger i samme emne kan ha samme navn; de skilles på dato og ukenummer

**Gitt** en forelesning eller et emne som tilhører en annen bruker
**Når** studenten åpner `/api/lectures/{id}`, `/api/subjects/{id}/lectures` eller siden 04 for den
**Så** svarer API-et `404 NOT_FOUND`, og siden viser «Fant ikke siden» fra epic 1 (FR-4, AR-2)

**Gitt** sidene 03 og 04
**Når** Playwright-testene kjører med axe
**Så** finnes ingen brudd, og alt kan gjøres med bare tastatur med synlig fokus, også å åpne og lukke emner i sidemenyen

**Gitt** testene for storien
**Når** de kjøres
**Så** har hver test krav-ID i navnet (`test_fr7_…`, `test_fr15_…`, `test_uxdr7_…`), slik AR-17 krever

### Story 2.3: Last opp PDF-notater til en forelesning

Som student,
vil jeg laste opp én eller flere PDF-filer til en forelesning og få beskjed om filer som ikke kan brukes,
slik at notatene mine er klare til å lage øvingsinnhold fra.

**Krav:** FR-8, FR-9, FR-10, FR-39, FR-4, NFR-16, AR-6, AR-8, UX-DR13 (filer og status), UX-DR16, UX-DR17, UX-DR42

**Akseptkriterier:**

**Gitt** backend
**Når** en modul skal lese, skrive eller slette en PDF
**Så** skjer det bare gjennom `core/storage`, som lagrer under `data/uploads/<user_id>/<file_id>.pdf` og har funksjoner for å lagre, lese, slette én fil og slette hele brukermappa (AR-8)
**Og** rotmappa settes med en innstilling i `core/config` (for eksempel `UPLOAD_DIR`), og testene bruker en midlertidig mappe
**Og** det opprinnelige filnavnet brukes aldri i stien på disken

**Gitt** `docker-compose.yml`
**Når** appen startes med `docker compose up`
**Så** ligger opplastingsmappa på et eget Docker-volum (`uploads`), slik at filene overlever omstart
**Og** README og `.env.example` nevner innstillingen og volumet

**Gitt** en forelesning studenten eier
**Når** hun sender én PDF med tekst til `POST /api/lectures/{id}/files` (multipart, én fil per kall)
**Så** lagres fila i `files` (UUID, `lecture_id`, `original_name`, `page_count`, `uploaded_at`) og teksten fra hver side i `file_pages(file_id, page_no, text, needs_image)`, begge laget med en Alembic-migrering i denne storien med `ON DELETE CASCADE`
**Og** PyMuPDF leser sidene, `page_no` er PDF-sidenummeret og starter på 1 (FR-39, AR-6), og `needs_image` er `false` (regelen kommer i epic 6)
**Og** PDF-en lagres via `core/storage`, og svaret er `201` med fila

**Gitt** en testfil på 3 sider laget av testen selv med PyMuPDF, med ulik tekst på hver side
**Når** den lastes opp
**Så** finnes nøyaktig radene `page_no` 1, 2 og 3 med teksten fra riktig side (`test_fr39_…`)

**Gitt** en fil som ikke er PDF, for eksempel en Word-fil
**Når** den lastes opp
**Så** avviser backend den med en feilkode (`NOT_PDF`) ut fra innholdet, ikke bare filendelsen, og ingenting lagres
**Og** ved opplastingsfeltet står ordrett «Bare PDF-filer kan lastes opp. Lagre Word-dokumentet som PDF (Fil → Lagre som → PDF) og prøv igjen.» (FR-9, UX-DR42)

**Gitt** en PDF der ingen side har tekst etter at mellomrom er fjernet (for eksempel skannet)
**Når** den lastes opp
**Så** avvises den med en feilkode (`NO_READABLE_TEXT`), ingenting lagres, og meldingen er ordrett «Vi fant ingen tekst i denne PDF-en. Den kan være skannet. Last opp en PDF der teksten kan merkes.» (FR-10, UX-DR42)

**Gitt** en PDF med flere enn 50 sider
**Når** den lastes opp
**Så** avvises den med en feilkode (`TOO_MANY_PAGES`) og `details.page_count`, ingenting lagres, og meldingen er ordrett «Fila har 63 sider. Grensen er 50 sider. Del den opp og last opp delene hver for seg.» med det faktiske sidetallet (NFR-16, UX-DR42)
**Og** en fil på nøyaktig 50 sider godtas

**Gitt** en PDF som er låst med passord eller er skadet *(E20)*
**Når** den lastes opp
**Så** avvises den med en egen feilkode (`PDF_UNREADABLE`), og ingenting lagres
**Og** meldingen er «Vi klarte ikke å åpne denne PDF-en. Den kan være låst med passord eller skadet. Lagre den på nytt som PDF uten passord og prøv igjen.»

**Gitt** at studenten velger eller drar inn flere filer på én gang *(E19)*
**Når** noen av dem avvises
**Så** sender frontend hver fil i sitt eget kall, og filene som godtas, lastes opp og står i fillista
**Og** ved opplastingsfeltet står én melding per avvist fil, med filnavnet foran meldingen, og meldingene leses opp i et levende område
**Og** meldingene står til studenten laster opp noe nytt eller forlater siden

**Gitt** at studenten laster opp en fil med samme navn som en fil som finnes i forelesningen *(E21)*
**Når** fila godtas
**Så** lagres den som en ny fil, og begge står i lista med hver sin linje «N sider · lastet opp dd.mm»
**Og** appen endrer ikke navnet og spør ikke; vil hun bytte ut den gamle, bruker hun «Erstatt» (2.6)

**Gitt** forelesningssiden (04)
**Når** den vises
**Så** står seksjonen «Filer» med en filrad (`file-row`) per fil: filikon, filnavn og «12 sider · lastet opp 11.09» (UX-DR16), sortert etter opplastingstidspunkt
**Og** knappene «Slett» og «Erstatt» på filraden legges til i 2.5 og 2.6
**Og** linjen under h1 viser i tillegg antall filer og sider: «Forelesning fredag 11.09.2026 · 2 filer · 18 sider»

**Gitt** opplastingsfeltet (`upload-zone`) på 04
**Når** det vises
**Så** har det stiplet kant i `border-control`, opplastingsikon, «Dra og slipp PDF-filer hit», «Bare PDF. Hver fil får sin egen kilde med sidetall.» og omrissknappen «Velg PDF» (UX-DR17)
**Og** både dra og slipp og «Velg PDF» tar imot flere filer, og «Velg PDF» kan brukes med bare tastatur
**Og** mens filer lastes opp, sier en statusmelding i et levende område at opplastingen pågår

**Gitt** opplastingsfeltet på 04
**Når** det vises
**Så** står personvernmerknaden under det, i merknadsflaten (`note-surface`) med låseikon og dempet tekst (UX-DR20)
**Og** merknadsflaten er en felles komponent i `frontend/components/`, som epic 3 gjenbruker
**Og** i demomodus sier merknaden «I demomodus sendes ingenting ut.» Teksten med ekte språkmodell avgjøres i epic 6

**Gitt** emnesiden (03) og forsiden
**Når** en forelesning har filer
**Så** viser forelesningstabellen kolonnen Filer (tall høyrejustert, «–» for 0) og kolonnen Status med «Ikke øvd ennå» og hul prikk, eller «Ingen filer ennå» når forelesningen ikke har filer (UX-DR13)
**Og** linjen under h1 på 03 viser «8 forelesninger · 11 filer · eksamen fredag 04.12.2026»

**Gitt** en forelesning som tilhører en annen bruker
**Når** studenten prøver å laste opp til den
**Så** svarer API-et `404 NOT_FOUND`, og ingenting lagres (FR-4, AR-2)

**Gitt** de nye feilkodene
**Når** testen fra epic 1 som sammenligner `core/errors.py` med meldingsfila kjører
**Så** har alle kodene en norsk tekst i meldingsfila

**Gitt** side 04 med filer og med avviste filer
**Når** Playwright-testene kjører med axe
**Så** finnes ingen brudd, og opplasting med «Velg PDF» kan gjøres med bare tastatur
**Og** en ende-til-ende-test laster opp en PDF gjennom `rewrites` og ser den i fillista

**Gitt** testene for storien
**Når** de kjøres
**Så** har hver test krav-ID i navnet (`test_fr8_…`, `test_fr9_…`, `test_fr10_…`, `test_nfr16_…`), og testfilene er laget av testene selv eller skrevet med egne ord, slik at ingen andres materiale ligger i repoet

### Story 2.4: Godta vilkårene før første opplasting

Som student,
vil jeg se og godta vilkårene før jeg laster opp min første fil,
slik at jeg vet hvor notatene sendes og hva jeg er ansvarlig for.

**Krav:** FR-11, NFR-6, AR-6 (`TERMS_NOT_ACCEPTED`), UX-DR21, UX-DR23

**Akseptkriterier:**

**Gitt** tabellen `users`
**Når** storien er ferdig
**Så** har den feltet `terms_accepted_at` (UTC-tidsstempel, tomt som standard), lagt til med en Alembic-migrering, og `GET /api/identity/me` returnerer feltet

**Gitt** en student med tomt `terms_accepted_at`
**Når** hun prøver å laste opp en fil med `POST /api/lectures/{id}/files`
**Så** svarer backend med `TERMS_NOT_ACCEPTED`, og ingenting lagres (AR-6)

**Gitt** en student som godtar vilkårene
**Når** frontend sender `POST /api/identity/terms`
**Så** settes `terms_accepted_at` til nå, og et nytt kall endrer ikke tidspunktet

**Gitt** en student som ikke har godtatt vilkårene
**Når** hun velger eller drar inn én eller flere filer på forelesningssiden (04)
**Så** åpnes vilkårsdialogen (05, 640 px) før noe lastes opp, med tittelen «Før du laster opp» og teksten «Du har valgt merkevare-notater.pdf. Vi viser dette bare før den første opplastingen.» med navnet på fila, eller antall filer når hun har valgt flere

**Gitt** vilkårsdialogen
**Når** den vises
**Så** står teksten fra skisse 05: under DITT ANSVAR «Du er ansvarlig for materialet du laster opp.», «Last bare opp egne notater eller materiale du har rett til å bruke.» og «Ikke last opp personopplysninger, for eksempel navn på medstudenter.»; under HVOR NOTATENE SENDES «Notatene sendes til språkmodellen hos Google, med behandling i EU, for å lage øvingsinnholdet.» og «Google kan logge forespørslene en periode for å oppdage misbruk.» (FR-11, NFR-6)
**Og** teksten er den samme i demomodus og med ekte modell

**Gitt** at appen kjører i demomodus (`demo_mode` fra `GET /api/config`)
**Når** vilkårsdialogen vises
**Så** står i tillegg setningen «I demomodus sendes ingenting ut.» (UX-DR23)
**Og** uten demomodus står ikke setningen der

**Gitt** vilkårsdialogen
**Når** avkrysningen «Jeg har lest dette og laster bare opp materiale jeg har rett til å bruke.» ikke er krysset av
**Så** er «Godta og last opp» ikke aktiv (UX-DR23)
**Og** når boksen krysses av, blir knappen aktiv

**Gitt** at studenten krysser av og trykker «Godta og last opp»
**Når** dialogen lukkes
**Så** lagres godkjenningen, og filene hun valgte, lastes opp med flyten fra 2.3, også med avvisningsmeldingene
**Og** neste gang hun laster opp, vises ikke dialogen

**Gitt** vilkårsdialogen
**Når** studenten trykker «Avbryt», lukkekrysset eller Esc
**Så** lastes ingenting opp, og `terms_accepted_at` forblir tomt (FR-11)
**Og** fokus går tilbake dit det var før dialogen åpnet (UX-DR21)

**Gitt** at vilkårsteksten også skal vises på kontosiden (2.7)
**Når** teksten bygges
**Så** ligger den i én felles komponent i `frontend/components/` som vilkårsdialogen bruker, og som kan vises uten avkrysning

**Gitt** side 04 med vilkårsdialogen åpen, med og uten demomodus
**Når** Playwright-testene kjører med axe
**Så** finnes ingen brudd, fokus står i dialogen og holdes der, og hele flyten kan gjøres med bare tastatur

**Gitt** testene for storien
**Når** de kjøres
**Så** har hver test krav-ID i navnet (`test_fr11_…`, `test_nfr6_…`, `test_uxdr23_…`), slik AR-17 krever

### Story 2.5: Slett filer, forelesninger og emner med bekreftelse

Som student,
vil jeg slette en fil, en forelesning eller et emne etter å ha sett hva som forsvinner sammen med det,
slik at jeg kan rydde uten å miste noe ved et uhell.

**Krav:** FR-6 (slette), FR-7 (slette), FR-12, FR-14, FR-4, AR-7, AR-8, UX-DR16 («Slett»), UX-DR21, UX-DR22

**Akseptkriterier:**

**Gitt** modulen `content`
**Når** storien er ferdig
**Så** har den et register der innholdstyper melder seg inn med en `kind` og en funksjon som teller innholdet for et sett med filer og forelesninger
**Og** i denne epicen er ingen innholdstyper registrert, så tellingene fra `content` er tomme; senere epics (flashcards, quiz, modellkort, fritekst, sammendrag) melder seg inn uten å endre slettekoden
**Og** en test registrerer en innholdstype bare for testen og viser at tellingen kommer med i alle delete-preview-svarene og i teksten i bekreftelsen (`test_fr12_…`)

**Gitt** en fil, en forelesning eller et emne studenten eier
**Når** frontend henter `GET /api/files/{id}/delete-preview`, `GET /api/lectures/{id}/delete-preview` eller `GET /api/subjects/{id}/delete-preview`
**Så** får den tellingene av det som slettes sammen med det: for et emne antall forelesninger og filer, for en forelesning antall filer, og for alle tre tellingene fra `content`-registeret (AR-7)
**Og** tellinger som er 0, er ikke med i svaret
**Og** andres eller ukjente ID-er gir `404 NOT_FOUND`

**Gitt** at studenten bekrefter sletting
**Når** frontend sender `DELETE` på fila, forelesningen eller emnet
**Så** slettes raden i én transaksjon, og alt under den forsvinner med `ON DELETE CASCADE` uten kode som sletter rad for rad (AR-7)
**Og** PDF-ene på disken slettes med `core/storage` først etter at transaksjonen er fullført; feiler slettingen på disken, logges det uten filinnhold, og svaret er likevel `204`
**Og** en test sjekker at ingen rader i `lectures`, `files` eller `file_pages` og ingen PDF-er på disken er igjen etter at et emne er slettet (FR-14)

**Gitt** sletting mens en jobb pågår
**Når** epic 3 legger til jobber
**Så** utvider epic 3 slettingen med `409 JOB_ALREADY_RUNNING` (AR-7); denne storien har ingen jobber og ingen slik sjekk

**Gitt** den felles slettebekreftelsen i `frontend/components/` (bygd på dialogen fra epic 1, 560 px)
**Når** den åpnes
**Så** viser den en tittel, en boks med det som slettes, teksten om hva som slettes sammen med det og «Det kan ikke angres.», og knappene «Avbryt» og fareknappen i den rekkefølgen (UX-DR22)
**Og** «Avbryt» har startfokus, fareknappen har aldri startfokus, Esc og «Avbryt» lukker uten å slette, og fokus går tilbake til knappen som åpnet den (UX-DR21)
**Og** komponenten tar imot tellingene som liste og brukes av fil, forelesning, emne, erstatning og konto i denne epicen og av kort og spørsmål senere

**Gitt** tellingene fra delete-preview
**Når** bekreftelsen lager teksten
**Så** bygger én funksjon i `frontend/lib/` setningen «Dette sletter også 18 flashcards, 11 quizspørsmål og 2 modellkort laget fra fila. Det kan ikke angres.» med komma, «og», entall og flertall («1 fil», «2 filer», «1 forelesning», «8 forelesninger»), og navnene på typene ligger i meldingsfila

**Gitt** at det ikke finnes noe å slette sammen med fila, forelesningen eller emnet *(E16)*
**Når** bekreftelsen vises
**Så** står ikke setningen «Dette sletter også …», og aldri «0 flashcards …»; bare «Det kan ikke angres.» står igjen
**Og** finnes noen tellinger, nevnes bare de som er over 0

**Gitt** filraden på forelesningssiden (04)
**Når** studenten trykker «Slett» (rød tekstknapp med søppelbøtte)
**Så** åpnes bekreftelsen med tittelen «Slette fila?», en boks med filnavnet og «12 sider · Uke 37: Merkevare», og fareknappen «Slett fila» (skisse 14)
**Og** etter sletting er fila borte fra lista, og tellingene på 03 og 04 er oppdatert

**Gitt** forelesningssiden (04) og emnesiden (03)
**Når** studenten trykker «Slett forelesningen» på 04 eller «Slett emnet» på 03
**Så** åpnes bekreftelsen med tittelen «Slette forelesningen?» eller «Slette emnet?», navnet i boksen og for eksempel «Dette sletter også 2 filer. Det kan ikke angres.» eller «Dette sletter også 8 forelesninger og 11 filer. Det kan ikke angres.» (FR-14)
**Og** etter sletting av en forelesning kommer studenten til emnesiden, og etter sletting av et emne til forsiden
**Og** sidemenyen og forsiden er oppdatert

**Gitt** at studenten avbryter en bekreftelse
**Når** dialogen lukkes
**Så** er ingenting slettet, verken i databasen eller på disken (FR-12)

**Gitt** sidene 03 og 04 med slettebekreftelsen åpen
**Når** Playwright-testene kjører med axe
**Så** finnes ingen brudd, og sletting kan gjøres og avbrytes med bare tastatur

**Gitt** testene for storien
**Når** de kjøres
**Så** har hver test krav-ID i navnet (`test_fr12_…`, `test_fr14_…`, `test_uxdr22_…`), slik AR-17 krever

### Story 2.6: Erstatt en fil med en ny versjon

Som student,
vil jeg erstatte en fil med en ny versjon,
slik at jeg kan rette en gammel opplasting uten å lage forelesningen på nytt.

**Krav:** FR-13, FR-9, FR-10, AR-7, AR-8, UX-DR16 («Erstatt»), UX-DR22, UX-DR42

**Akseptkriterier:**

**Gitt** en fil studenten eier
**Når** frontend sender den nye PDF-en til `POST /api/files/{id}/replace`
**Så** sjekkes den nye fila med de samme reglene som opplasting (vilkår, ikke PDF, over 50 sider, ingen tekst, låst eller skadet)
**Og** godtas den, slettes den gamle fila og lagres den nye i samme forelesning med ny `file_id` og nye `file_pages` i én transaksjon (AR-7)
**Og** PDF-en til den gamle fila slettes fra disken med `core/storage` etter transaksjonen
**Og** innhold registrert i `content` for den gamle fila forsvinner med kaskaden

**Gitt** filraden på 04
**Når** studenten trykker «Erstatt» (tekstknapp med sirkelpil)
**Så** åpnes filvelgeren for én PDF, og når hun har valgt en fil, åpnes den felles slettebekreftelsen fra 2.5 med tittelen «Erstatte fila?», den gamle fila i boksen, hvilken fil den erstattes med, tellingene fra `GET /api/files/{id}/delete-preview` og fareknappen «Erstatt fila» (EXPERIENCE: «erstatter» i stedet for «sletter»)
**Og** «Avbryt» har startfokus, og avbrudd endrer ingenting

**Gitt** at studenten avbryter filvelgeren under erstatning *(E18)*
**Når** filvelgeren lukkes uten valgt fil
**Så** skjer ingenting: ingen bekreftelse åpnes, ingenting slettes, og fokus står på «Erstatt»

**Gitt** at studenten har bekreftet erstatningen *(E17)*
**Når** den nye fila avvises
**Så** står den gamle fila og alt som hører til den, urørt, fordi backend sjekker den nye fila før noe slettes
**Og** avvisningsmeldingen (de samme ordrette tekstene som i 2.3) vises ved filraden og leses opp i et levende område

**Gitt** at erstatningen er godtatt
**Når** lista oppdateres
**Så** står den nye fila på samme forelesning med sitt navn og «N sider · lastet opp dd.mm», og tellingene på 03 og 04 er oppdatert

**Gitt** en fil som tilhører en annen bruker
**Når** studenten prøver å erstatte den
**Så** svarer API-et `404 NOT_FOUND`, og ingenting endres (FR-4)

**Gitt** side 04 med erstatningsbekreftelsen åpen og med avvist erstatning
**Når** Playwright-testene kjører med axe
**Så** finnes ingen brudd, og erstatning kan gjøres med bare tastatur

**Gitt** testene for storien
**Når** de kjøres
**Så** har hver test krav-ID i navnet (`test_fr13_…`), slik AR-17 krever

### Story 2.7: Se kontoen og slett den

Som student,
vil jeg se kontoen min, lese vilkårene igjen og kunne slette kontoen,
slik at jeg vet hva appen har om meg og kan fjerne alt når semesteret er over.

**Krav:** FR-5, FR-4, AR-7, AR-8, UX-DR7 (på 15), UX-DR21, UX-DR22, UX-DR39

**Akseptkriterier:**

**Gitt** en innlogget student
**Når** hun trykker «Konto» i toppfeltet
**Så** kommer hun til kontosiden (15) med h1 «Konto», undertittelen «Innlogging, vilkår og sletting av kontoen» og sidemenyen uten valgt forelesning (UX-DR7)
**Og** når appen kjører i demomodus, står demomerket «Demomodus: innholdet lages av en testmodell»

**Gitt** kortet Innlogging
**Når** det vises
**Så** står e-postadressen, Passord med «Lagret kryptert, aldri i klartekst», og «Logg ut» som logger ut med flyten fra epic 1 (UX-DR39)

**Gitt** kortet Vilkår og personvern
**Når** det vises
**Så** står Vilkår med «Godtatt 11.09.2026, før første opplasting» (datoen fra `terms_accepted_at`), eller «Ikke godtatt ennå. Du får se dem før første opplasting.», og Språkmodell med «Testmodell i demomodus (ellers Google, i EU)» i demomodus
**Og** «Les vilkårene» åpner vilkårsteksten fra den felles komponenten (2.4) i en dialog uten avkrysning, med «I demomodus sendes ingenting ut.» i demomodus

**Gitt** kortet Slett kontoen
**Når** det vises
**Så** står «Alle emner, filer og alt generert innhold slettes for godt», fulgt av navnene på innholdstypene i `content`-registeret når det finnes noen (i epic 2 ingen), og «Det kan ikke angres.»
**Og** linjen «Du har nå 3 emner, 15 forelesninger og 18 filer.» med tall fra `GET /api/identity/me/delete-preview`, med entall og flertall fra funksjonen i 2.5
**Og** knappen «Slett kontoen …» er en omrissknapp med rød tekst

**Gitt** at studenten trykker «Slett kontoen …»
**Når** bekreftelsen åpnes
**Så** er det den felles slettebekreftelsen fra 2.5 med tittelen «Slette kontoen?», at alt slettes for godt med tellingene, og fareknappen «Slett kontoen», og «Avbryt» har startfokus (UX-DR22)
**Og** avbrudd sletter ingenting (FR-5)

**Gitt** at studenten bekrefter
**Når** frontend sender `DELETE /api/identity/me`
**Så** slettes brukeren i én transaksjon, og alle emner, forelesninger, filer, sider og registrert innhold forsvinner med `ON DELETE CASCADE` (AR-7)
**Og** etter transaksjonen fjerner `core/storage` hele brukermappa `data/uploads/<user_id>/`
**Og** cookien `sk_session` slettes, svaret er `204`, og studenten kommer til innloggingen (01)

**Gitt** en slettet konto
**Når** testen sjekker databasen og disken
**Så** finnes ingen rader som hører til brukeren i noen tabell, og brukermappa finnes ikke (FR-5)
**Og** innlogging med den gamle e-posten og passordet gir «Feil e-post eller passord. Sjekk at Caps Lock er av.», og e-postadressen kan brukes til en ny konto
**Og** en annen brukers data er urørt (FR-4)

**Gitt** side 15 med og uten demomodus, og med dialogene «Les vilkårene» og slettebekreftelsen åpne
**Når** Playwright-testene kjører med axe
**Så** finnes ingen brudd, og alt på siden kan gjøres med bare tastatur

**Gitt** testene for storien
**Når** de kjøres
**Så** har hver test krav-ID i navnet (`test_fr5_…`, `test_uxdr39_…`), slik AR-17 krever

### Dekning

| Krav | Story |
|---|---|
| FR-5 | 2.7 |
| FR-6 | 2.1 (opprette, nytt navn, eksamensdato), 2.5 (slette) |
| FR-7 | 2.2 (opprette, nytt navn), 2.5 (slette) |
| FR-8 | 2.3 |
| FR-9, FR-10 | 2.3 (og 2.6 ved erstatning) |
| FR-11 | 2.4 |
| FR-12 | 2.5 |
| FR-13 | 2.6 |
| FR-14 | 2.5 |
| FR-15 | 2.2 |
| FR-39 | 2.3 |
| NFR-6 | 2.4 |
| NFR-16 | 2.3 |
| AR-6 | 2.3, 2.4 (`TERMS_NOT_ACCEPTED`) |
| AR-7 | 2.5, 2.6, 2.7 |
| AR-8 | 2.3 (`core/storage`), 2.5–2.7 (sletting) |
| UX-DR3 | 2.1 |
| UX-DR7 | 2.1 (emner), 2.2 (forelesninger), 2.7 (på 15) |
| UX-DR13 | 2.2 (Dato, Forelesning), 2.3 (Filer, Status) |
| UX-DR15 | 2.1 |
| UX-DR16 | 2.3 (filrad), 2.5 («Slett»), 2.6 («Erstatt») |
| UX-DR17 | 2.3 |
| UX-DR20 | 2.3 (merknadsflaten og personvernmerknaden i demomodus) |
| UX-DR21 | 2.1, 2.2, 2.4, 2.5, 2.7 |
| UX-DR22 | 2.5 (felles komponent), 2.6, 2.7 |
| UX-DR23 | 2.4 |
| UX-DR39 | 2.7 |
| UX-DR42 | 2.3, 2.6 (Word-fil, PDF uten tekst, over 50 sider) |

Kanttilfeller: E2/E6 (2.2), E3 (2.2), E16 (2.5), E17 og E18 (2.6), E19, E20 og E21 (2.3), E35 (2.1 og 2.2).

### Avgjort av Silje 2026-11-14

1. Tekstene «Studiekamerat lager flashcards og quiz fra forelesningsnotatene dine, så du kan øve fram mot eksamen.», «Skriv inn datoen, for eksempel 11.09.2026.», «Ikke godtatt ennå. Du får se dem før første opplasting.», knappene «Nytt navn», «Endre dato», «Slett forelesningen» og «Slett emnet» øverst på sidene, og dialogtitlene «Slette emnet?» med «Slett emnet» og tilsvarende for forelesning, erstatning og konto.
2. Vilkårsdialogen viser filnavnet uten sidetall, fordi sidetallet ikke er kjent før fila er lastet opp.
3. Et nytt emne får den første ledige fargen, slik at to emner sjelden får samme farge.
4. Kolonnen Filer i forelesningstabellen kommer i epic 2.
5. Personvernmerknaden under opplastingsfeltet kommer i 2.3, og merknadsflaten bygges der.
6. Raden «Økt: logget inn siden …» fra skisse 15 droppes. Den står ikke i kravene, og appen lagrer ikke den informasjonen.
7. Emnene står i den rekkefølgen de ble opprettet.
8. Kanttilfellene: E3 samme dato står i rekkefølgen de ble opprettet. E35 tomt navn gir «Skriv inn et navn.», og like navn er greit. E2/E6 emne uten forelesninger viser «Ingen forelesninger ennå.». E16 viser bare «Det kan ikke angres.» når ingenting annet slettes. E17 den gamle fila er urørt når erstatningen avvises. E18 ingenting skjer når filvelgeren avbrytes. E19 hver avvist fil får sin egen melding, og resten lagres. E20 låst eller skadet PDF gir «Vi klarte ikke å åpne denne PDF-en. Den kan være låst med passord eller skadet. Lagre den på nytt som PDF uten passord og prøv igjen.». E21 to filer med samme navn lagres begge.

## Epic 3: Øv med flashcards

Studenten lager flashcards fra en forelesning, øver med «Kunne» og «Kunne ikke», ser resultatet, retter eller sletter dårlige kort, og økten lagres. Bygger genereringsløpet og øktrammen som de andre innholdstypene gjenbruker.

### Story 3.1: Lag flashcards fra en forelesning i demomodus

Som student,
vil jeg trykke «Lag flashcards» på forelesningssiden og få kort laget fra notatene mine,
slik at jeg har noe å øve på uten å lage kortene selv.

**Krav:** FR-2, FR-18, FR-19, FR-22, FR-38, NFR-2, NFR-2a (flashcards), NFR-17, AR-3, AR-4, AR-5, UX-DR18, UX-DR19

**Akseptkriterier:**

**Gitt** at `LLM_PROVIDER` ikke er satt
**Når** backenden starter
**Så** bruker `generation` `MockGenerator` bak porten `generate(kind, pages, options)`
**Og** `LLM_PROVIDER=mock-invalid` gir `InvalidMockGenerator`, mens en verdi som ikke støttes ennå (også `vertex`, som kommer i epic 6), stopper oppstarten med en tydelig loggmelding

**Gitt** at porten er laget
**Når** en utvikler legger til en ny innholdstype
**Så** skjer det ved å melde typen inn i et register i `generation` (`kind` → regel i mock-modellen, løs modell, `validate_item`, lagring gjennom `content`), uten å endre selve løpet
**Og** `flashcards` er den første typen i registeret

**Gitt** en forelesning med én eller flere filer med definisjonssetninger («X er …» / «X is …»)
**Når** `MockGenerator` kalles med `kind="flashcards"`
**Så** gir den ett begrepskort per definisjonssetning, med ordene før «er»/«is» foran, hele setningen bak, og `file_id` og `page_no` for siden setningen står på (NFR-2a)
**Og** teksten hentes uendret fra `file_pages`, slik at kortene er på samme språk og med de samme fagbegrepene som notatene (FR-2 i demomodus)

**Gitt** den faste testfila i `backend/tests/fixtures/`
**Når** mock-modellen lager flashcards to ganger fra den samme fila
**Så** blir resultatet nøyaktig likt begge gangene, og kortene stemmer med reglene i NFR-2a (SK-21, flashcard-delen)

**Gitt** at forelesningen allerede har flashcards fra mock-modellen
**Når** studenten trykker «+ Lag flere»
**Så** hopper mock-modellen over kort med samme forside som et kort forelesningen har, slik at de samme kortene ikke lages to ganger
**Og** er det ingen nye kort å lage, vises meldingen for «ingenting laget», og ingenting lagres

**Gitt** at instruksene til modellen fastsettes i storyen for hver innholdstype (AR-19)
**Når** storien er ferdig
**Så** ligger instruksene for flashcards som en tekstfil i `generation`, klar for `VertexGenerator` i epic 6: norsk bokmål også når notatene er på engelsk, norske fagbegreper slik de står, engelsk begrep i parentes når notatene bruker begge (FR-2), bare stoff fra sidene, kilde med fil og PDF-side per kort, og de to korttypene spørsmål med svar (`qa`) og begrepskort (`concept`) (FR-19)
**Og** mock-modellen bruker ikke instruksene

**Gitt** at genereringen er ferdig
**Når** løpet kjører
**Så** går det gjennom stegene i AR-4: hent sidetekst fra `file_pages` → kall porten (løs liste) → `validate_item(item, pages)` per element → forkast og tell → lagre de gyldige i én transaksjon
**Og** `validate_item` for flashcards forkaster elementer med tom forside eller bakside, ukjent `kind`, eller en `file_id`/`page_no` som ikke finnes i forelesningens filer (FR-38, FR-39)

**Gitt** at mock-modellen finner flere gyldige kort enn det som ble bedt om
**Når** kortene lagres
**Så** lagres bare de første `requested` i fast rekkefølge (fil, side, plassering på siden)

**Gitt** at tabellene `jobs` og `flashcards` ikke finnes
**Når** storien er ferdig
**Så** lager én Alembic-migrering `jobs` med feltene i AR-5 og `flashcards` (`id`, `file_id` med `ON DELETE CASCADE`, `kind` `qa`/`concept`, `front`, `back`, `page_no`, `formula_flag`, `created_at`)
**Og** en delvis unik indeks på `jobs.lecture_id` der `status='running'` er skrevet for både Postgres og SQLite

**Gitt** en innlogget student med en forelesning som har filer
**Når** hun sender `POST /api/lectures/{id}/jobs` med `kind="flashcards"`
**Så** svarer API-et `202` med jobben (`status="running"`, `requested=20`) før genereringen er ferdig, og jobben kjører som asyncio-oppgave med egen databasesesjon
**Og** et nytt kall mens jobben kjører gir `409 JOB_ALREADY_RUNNING`

**Gitt** en forelesning som tilhører en annen student, eller en forelesning uten filer
**Når** hun prøver å starte en jobb
**Så** gir den andres forelesning `404 NOT_FOUND` (AR-2), og forelesningen uten filer gir en feilkode fra `core/errors.py` som finnes i meldingsfila (AR-12)

**Gitt** at jobber står som `running` i databasen
**Når** backenden starter på nytt
**Så** settes de til `failed` med `error_code="JOB_INTERRUPTED"` før Uvicorn tar imot forespørsler (AR-14-rekkefølgen)

**Gitt** at forelesningen har 24 kort fra før
**Når** en ny jobb er ferdig
**Så** legges de nye kortene til de gamle (FR-22), og `jobs` har `created` og `discarded` fylt ut

**Gitt** forelesningssiden (04)
**Når** den vises
**Så** har den seksjonen «Lag og øv» med Flashcards-raden laget med den felles komponenten `create-row` i `frontend/components/`
**Og** raden viser «24 kort», hovedknappen «Øv nå» og tekstknappen «+ Lag flere» når det finnes kort, og «Ingen ennå» og omrissknappen «Lag flashcards» når det ikke gjør det
**Og** uten filer er knappene ikke aktive, og raden sier hvorfor («Last opp notater først.»)

**Gitt** at «Lag flashcards» eller «+ Lag flere» trykkes
**Når** jobben starter
**Så** startes en jobb på inntil 20 kort uten valg (oppførselen når FR-17 er kuttet; dialogen kommer i 3.2)
**Og** knappene i raden byttes med den felles komponenten `job-status` i `frontend/components/`: snurr, «Lager flashcards …» og «Du kan bruke resten av appen imens.»
**Og** start og slutt leses opp i et levende område (UX-DR44)

**Gitt** at jobben blir ferdig mens forelesningssiden er åpen
**Når** siden spør etter siste jobb per `kind` (for eksempel `GET /api/lectures/{id}/jobs/latest`)
**Så** kommer «Øv nå» og det nye antallet tilbake uten at siden lastes på nytt
**Og** i demomodus tar en jobb på 20 kort under fem sekunder (NFR-17)

**Gitt** at `create-row` har en tilstand for «venter»
**Når** en annen rad i forelesningen har en jobb som pågår
**Så** er «Lag …»-knappen ikke aktiv og raden viser grunnen, for eksempel «Venter til flashcardene er ferdige» (UX-DR19)
**Og** dette testes på komponenten med to rader, siden de andre radene kommer i senere epics

**Gitt** at storien er ferdig
**Når** testene kjøres
**Så** har backend- og frontendtestene krav-ID i navnet (`test_fr38_…`, `test_nfr2a_…`, `test_sk21_…`, `test_ar5_…`) (AR-17)
**Og** axe finner ingen brudd på forelesningssiden med og uten kort og mens en jobb pågår, og alt i «Lag og øv» kan brukes med tastatur

**Gitt** README
**Når** storien er ferdig
**Så** forklarer README `LLM_PROVIDER` (`mock` og `mock-invalid`), står det i `.env.example`, og README sier at demoinnholdet er enkelt og mekanisk og viser at funksjonene virker, ikke kvaliteten med ekte modell (NFR-2a)

### Story 3.2: Velg omfang og se hvordan genereringen gikk

Som student,
vil jeg velge hvor mange kort som lages, og få beskjed når de er ferdige, når det ble færre, eller når noe gikk galt,
slik at jeg vet hva som er lagret og kan prøve igjen.

**Krav:** FR-17, FR-18, FR-21, FR-38, NFR-12, NFR-17, AR-4, AR-5, UX-DR19, UX-DR20, UX-DR24 (flashcards), UX-DR44

**Akseptkriterier:**

**Gitt** at kallet til porten feiler
**Når** jobben kjører
**Så** lagres ingen kort, jobben får `status="failed"` og `error_code="GENERATION_FAILED"`, og antallet i forelesningen er uendret (FR-21, SK-8)

**Gitt** en generator som bruker mer enn 3 minutter
**Når** jobben kjører
**Så** stopper `asyncio.wait_for` den, ingenting lagres, og jobben får `error_code="GENERATION_TIMEOUT"`
**Og** testen setter grensen ned slik at den går raskt, mens appen bruker 3 minutter

**Gitt** at lagringen feiler midt i transaksjonen
**Når** jobben kjører
**Så** lagres ingen av kortene (én transaksjon, SK-8)

**Gitt** `LLM_PROVIDER=mock-invalid`
**Når** studenten lager flashcards
**Så** forkastes de ugyldige elementene, `discarded` telles, bare de gyldige lagres, og studenten får beskjed om at det ble laget færre (SK-4)

**Gitt** at jobben er ferdig med færre kort enn valgt
**Når** Flashcards-raden vises
**Så** står det i en statusmelding på merknadsflaten: «Det ble laget 12 av inntil 20 flashcards. Notatene ga ikke grunnlag for flere.» (FR-18; ordlyden følger den godkjente meldingen med «flashcards» i stedet for «spørsmål»)
**Og** meldingen leses opp i et levende område uten at fokus flyttes (UX-DR44)
**Og** meldingen står til neste jobb for flashcards starter

**Gitt** merknadsflaten (`note-surface`) fra story 2.3
**Når** meldingen om «færre enn valgt» vises
**Så** gjenbruker den komponenten i `frontend/components/` i stedet for å lage en ny, og merknadsflaten brukes aldri for feil (UX-DR20)

**Gitt** at en jobb for flashcards har feilet (feil, tidsgrense eller `JOB_INTERRUPTED`)
**Når** Flashcards-raden vises
**Så** viser den i tekst «Vi klarte ikke å lage flashcardene. Ingenting er lagret. Prøv igjen.» og knappen «Prøv igjen» (FR-21, UX-DR42)
**Og** «Prøv igjen» starter en ny jobb med samme omfang
**Og** meldingen leses opp (UX-DR44)

**Gitt** at mock-modellen ikke finner én eneste gyldig definisjon
**Når** jobben er ferdig
**Så** *(A20/E12)* får jobben `status="done"` med `created=0`, ingenting lagres, og raden viser en egen melding i stedet for «0 av inntil 20» («Notatene ga ikke grunnlag for flashcards. Ingenting er lagret.»)

**Gitt** at studenten er på en hvilken som helst side i `(app)`
**Når** en jobb hun har startet, kjører
**Så** spør én hook i `(app)`-layouten `GET /api/jobs/active` med jevne mellomrom, og bare innlogget brukers jobber kommer med (AR-2, AR-5)
**Og** jobben som ble startet fra fanen, følges selv om den blir ferdig før neste spørring (for eksempel med `GET /api/jobs/{id}`)

**Gitt** at jobben blir ferdig mens studenten er på en annen side
**Når** hooken ser at den er ferdig
**Så** vises en kort ferdigmelding med sonner i et levende område, med resultatet eller feilmeldingen fra meldingsfila («Flashcardene er ferdige: 18 kort i Uke 37: Merkevare.») *(Kan kuttes: da vises status bare på forelesningssiden, NFR-17.)*

**Gitt** at studenten logger ut mens en jobb kjører
**Når** jobben blir ferdig
**Så** *(E10)* fortsetter jobben og lagrer som vanlig, ingen ferdigmelding vises etter utlogging, og forelesningssiden viser resultatet neste gang hun logger inn

**Gitt** at «Lag flashcards» eller «+ Lag flere» trykkes *(Kan kuttes, FR-17: uten dette gjelder oppførselen fra 3.1, inntil 20 uten valg)*
**Når** dialogen «Lag flashcards» åpnes
**Så** gjenbruker den den felles dialogen og valgkortene: tittelen «Lag flashcards», forelesning med antall filer og sider, «Nye kort legges til de 24 du har fra før.» når det finnes kort, Omfang som tre valgkort «Rask / Inntil 10 kort», «Vanlig / Inntil 20 kort» og «Dyp / Inntil 30 kort», med «Vanlig» forhåndsvalgt og piltaster som flytter valget (UX-DR24)
**Og** under står ventetiden tilpasset modusen («Tar noen sekunder.» i demomodus, «Tar vanligvis under to minutter.» ellers) og «Du kan bruke resten av appen imens.»
**Og** knappene er «Avbryt» og så «Lag flashcards»; Esc lukker uten å starte noe, og fokus går tilbake til knappen som åpnet dialogen (UX-DR21)

**Gitt** dialogen med «Rask» valgt *(Kan kuttes, FR-17)*
**Når** studenten trykker «Lag flashcards»
**Så** sendes `params={"requested": 10}`, og backenden godtar bare 10, 20 eller 30

**Gitt** at storien er ferdig
**Når** testene kjøres
**Så** har testene krav-ID i navnet (`test_fr21_…`, `test_sk4_…`, `test_sk8_…`, `test_fr17_…`) (AR-17)
**Og** meldingsfila har tekst for `GENERATION_FAILED`, `GENERATION_TIMEOUT` og `JOB_INTERRUPTED`, og testen fra epic 1 finner dem
**Og** axe finner ingen brudd på forelesningssiden med feilmelding, med «færre enn valgt» og med dialogen åpen, og dialogen kan brukes med bare tastatur

### Story 3.3: Øv på flashcards fra én forelesning

Som student,
vil jeg øve på kortene fra en forelesning, snu dem og markere «Kunne» eller «Kunne ikke»,
slik at jeg ser hva som sitter og får repetert det jeg ikke kunne.

**Krav:** FR-19, FR-20, FR-23, FR-24, FR-25, NFR-10, UX-DR8, UX-DR9, UX-DR27, UX-DR36

**Akseptkriterier:**

**Gitt** en forelesning med kort
**Når** studenten åpner `GET /api/lectures/{id}/flashcards`
**Så** får hun alle kortene med `source: {file_id, file_name, page_no}` (AR-15)
**Og** en forelesning som tilhører en annen, gir `404 NOT_FOUND`

**Gitt** Flashcards-raden med kort
**Når** studenten trykker «Øv nå»
**Så** åpnes flashcard-økten (07) i øvingsoppsettet, med øktpanelet der sidemenyen var, og kortet sentrert i 768 px (UX-DR5)
**Og** kortene vises i tilfeldig rekkefølge, blandet i frontend-modulen `practice` (FR-23)

**Gitt** at økten starter
**Når** kortene er hentet
**Så** er listen over kort låst for økten, og kort som blir laget mens økten pågår, kommer ikke med før neste økt *(E41)*

**Gitt** at øktadresse åpnes for en forelesning uten flashcards (for eksempel med en gammel lenke)
**Når** siden vises
**Så** *(A15/E1)* starter ingen økt, siden sier «Det finnes ingen flashcards her ennå.» med knappen «Tilbake til forelesningen», og ingenting lagres
**Og** «Øv nå» vises bare på raden når typen har innhold, slik at den aldri starter en tom økt

**Gitt** et kort som ikke er snudd
**Når** det vises
**Så** står overlinjen SPØRSMÅL med forsiden, og baksiden er skjult (FR-24)
**Og** «Kunne ikke» og «Kunne» er like brede og ikke aktive (UX-DR27)
**Og** begrepskort og spørsmålskort bruker samme kort, med begrepet under SPØRSMÅL (FR-19)

**Gitt** et kort som ikke er snudd
**Når** studenten klikker på kortet eller trykker knappen for å snu
**Så** vises SVAR under en hårlinje, og «Kunne ikke» og «Kunne» blir aktive
**Og** kortet snus uten animasjon, eller med en kort overgang som slås av ved `prefers-reduced-motion`

**Gitt** et snudd kort
**Når** det vises
**Så** står kilden nederst med den felles komponenten `source-link` i `frontend/components/`: filikon og «merkevare-notater.pdf, side 4» som tekst, ikke lenke, uten understreking (FR-20, UX-DR36)
**Og** sidetallet er PDF-sidenummeret fra `page_no` (FR-39)

**Gitt** en økt med 24 kort
**Når** studenten markerer et kort «Kunne ikke»
**Så** legges kortet bakerst og vises igjen etter at alle andre kort er vist én gang, til det markeres «Kunne» eller økten avsluttes (FR-25)
**Og** logikken ligger i én ren funksjon i `practice` som testes med Vitest

**Gitt** at alle kort er markert «Kunne» minst én gang
**Når** siste kort markeres
**Så** er økten ferdig, og øktpanelet viser ferdigtilstanden (resultatsiden kommer i 3.5)

**Gitt** øktpanelet (`session-panel`)
**Når** økten pågår
**Så** viser det overlinjen ØKT, «Flashcards», forelesningens navn, teller, fremdriftsstolpe, «Kunne 5 · Kunne ikke 1», svarrutenettet, symbolforklaringen («Kunne», «Kunne ikke, kommer igjen», «Ikke vist ennå») og omrissknappen «Avslutt økt» (UX-DR8)
**Og** panelet er en del av øktrammen i `practice` og tar imot en adapter per innholdstype, slik at quiz og fritekst kan gjenbruke det

**Gitt** at kort kommer igjen etter «Kunne ikke»
**Når** telleren vises
**Så** *(A6/E29)* viser den antall ulike kort som er vist, aldri mer enn totalen («24 / 24», aldri «25 / 24»), og under repetisjonen står i tillegg hvor mange kort som er igjen («Repeterer: 3 kort igjen»)

**Gitt** svarrutenettet (`answer-grid-cell`)
**Når** studenten markerer kort
**Så** har det én rute per kort, seks per rad, med ✓ for «Kunne» og ✗ for «Kunne ikke» etter første markering, og gjeldende kort med ultramarin kant og nummer (UX-DR9, NFR-10)
**Og** rutene er ikke knapper og leses som for eksempel «Kort 4: kunne ikke»
**Og** rutenettet har en tekstlig versjon for skjermleser

**Gitt** en økt med svært mange kort
**Når** øktpanelet vises
**Så** *(E30)* vises rutenettet bare opp til 120 kort; over det skjules rutenettet, og telleren, stolpen og «Kunne · Kunne ikke» står alene

**Gitt** at økten pågår
**Når** studenten trykker «Avslutt økt»
**Så** avsluttes økten uten bekreftelse (UX-DR33); uten markerte kort går hun rett tilbake til forelesningen (lagring og avbrutt resultat kommer i 3.5)

**Gitt** at storien er ferdig
**Når** testene kjøres
**Så** har testene krav-ID i navnet (`test_fr23_…`, `test_fr24_…`, `test_fr25_…`, `test_fr20_…`) (AR-17)
**Og** axe finner ingen brudd på flashcard-økten før og etter snuing, og en hel økt kan gjennomføres med Tab og Enter

### Story 3.4: Hurtigtaster, fokus og smal skjerm i økten

Som student,
vil jeg øve med tastene Mellomrom, `1`, `2` og Esc, kunne skru av enkelttastene, og bruke økten i et smalt vindu,
slik at jeg øver raskt med tastatur uten at tastene gjør noe jeg ikke ville.

**Krav:** NFR-8, UX-DR10, UX-DR26, UX-DR27, UX-DR31, UX-DR32, UX-DR33

**Akseptkriterier:**

**Gitt** en flashcard-økt med hurtigtaster på
**Når** studenten trykker Mellomrom, `1`, `2` eller Esc
**Så** snur Mellomrom kortet, `1` markerer «Kunne ikke», `2` markerer «Kunne» (bare etter snuing), og Esc avslutter økten som «Avslutt økt» (NFR-8)
**Og** tastene håndteres av en felles funksjon i `frontend/lib/` som bare er aktiv under øving, slik at quiz og fritekst kan bruke den med egne taster

**Gitt** at fokus står i et tekstfelt
**Når** studenten trykker en enkelttast eller Esc
**Så** gjør ikke tasten noe i økten *(E24)*: Esc i et tekstfelt avslutter aldri økten

**Gitt** at en dialog er åpen over økten, eller at øktpanelet er åpnet over innholdet på smal skjerm
**Når** studenten trykker Esc
**Så** *(A16/E23/E40)* lukkes bare dialogen eller panelet, fokus går tilbake dit det var, og økten fortsetter
**Og** enkelttastene virker ikke mens en dialog er åpen

**Gitt** at fokus står på en knapp i økten
**Når** studenten trykker Mellomrom
**Så** *(E25)* utfører Mellomrom knappens vanlige handling, slik tastaturbrukere venter, og snur kortet bare når fokus står på kortet, på snuknappen eller ikke på noen kontroll
**Og** fokus flyttes aldri av seg selv til «Avslutt økt», slik at Mellomrom ikke avslutter økten ved et uhell

**Gitt** at kortet snus
**Når** baksiden vises
**Så** flyttes fokus til «Kunne» (UX-DR31)
**Og** etter markering flyttes fokus til neste kort, slik at Mellomrom snur det

**Gitt** hint-linjen under knappene (`kbd`)
**Når** økten vises med hurtigtaster på
**Så** viser den «Mellomrom snu kortet», «1 Kunne ikke», «2 Kunne» og «Esc avslutt» som tekst, ikke knapper (UX-DR27)

**Gitt** hurtigtastdialogen
**Når** den åpnes fra «? Hurtigtaster» i sidemenyen
**Så** viser den tastene etter tabellen i EXPERIENCE.md og bryteren «Bruk hurtigtaster», som er på som standard (UX-DR26)
**Og** dialogen gjenbruker den felles dialogen (fokus inn, Esc lukker, fokus tilbake)

**Gitt** at bryteren «Bruk hurtigtaster» slås av
**Når** studenten øver
**Så** virker ingen enkelttaster, knappene virker som før, og hint-linjen er skjult
**Og** valget lagres i `localStorage` og huskes til neste gang; kan `localStorage` ikke leses, er tastene på

**Gitt** en flashcard-økt *(Kan kuttes, oversikten i NFR-8)*
**Når** studenten trykker `?`
**Så** åpnes hurtigtastdialogen med tastene for flashcards

**Gitt** et vindu på 768 px eller mindre, eller tekst forstørret til 200 %
**Når** økten vises
**Så** er øktpanelet skjult bak en menyknapp i toppfeltet og legger seg over innholdet når den åpnes, uten vannrett rulling (UX-DR10, NFR-14)
**Og** samme menyknapp brukes for sidemenyen på sidene som har den
**Og** mellom 768 og 1279 px krymper kortet til bredden som er igjen

**Gitt** sidene fra epic 2 (forsiden, emnesiden, forelesningssiden og kontosiden) i et vindu på 768 px eller mindre, eller med tekst forstørret til 200 %
**Når** de vises
**Så** er sidemenyen skjult bak den samme menyknappen, oppsett med to kolonner legges under hverandre, og det er ingen vannrett rulling (UX-DR10, NFR-14)
**Og** forsidekortene som går fra tre til to og én kolonne, kommer i epic 5, der de bygges

**Gitt** at storien er ferdig
**Når** testene kjøres
**Så** har testene krav-ID i navnet (`test_nfr8_…`, `test_uxdr26_…`, `test_uxdr10_…`) (AR-17)
**Og** axe finner ingen brudd på økten med panelet lukket og åpent på 768 px og med hurtigtastdialogen åpen, og på sidene fra epic 2 på 768 px, og alt kan brukes med tastatur

### Story 3.5: Lagre økten og se resultatet

Som student,
vil jeg at økten lagres når jeg er ferdig eller går ut av den, og se hvor mange kort jeg kunne,
slik at appen vet hva jeg har øvd på, og jeg ser hvilke kort jeg bør se på igjen.

**Krav:** FR-26, FR-56 (flashcards), NFR-10, NFR-12, AR-9, UX-DR8, UX-DR32, UX-DR33, UX-DR34, UX-DR35, UX-DR44

**Akseptkriterier:**

**Gitt** at tabellen `practice_sessions` ikke finnes
**Når** storien er ferdig
**Så** lager en Alembic-migrering den med feltene i AR-9 (`session_id` unik, `subject_id`, `lecture_id` som kan være tom, `kind`, `aborted`, `shown`, `answered`, `correct`, `partial`, `wrong`, `started_at`), med `ON DELETE CASCADE` fra emne og forelesning

**Gitt** en innlogget student
**Når** nettleseren sender et resultat til `POST /api/practice-sessions` som JSON eller som `text/plain`
**Så** lagres det én gang; samme `session_id` igjen gir ingen ny rad og ingen feil (`ON CONFLICT DO NOTHING`, skrevet for både Postgres og SQLite)
**Og** et emne eller en forelesning som tilhører en annen, gir `404 NOT_FOUND`

**Gitt** en flashcard-økt
**Når** økten starter
**Så** lager nettleseren en `session_id` (UUID) og teller: `shown` er antall ulike kort vist, `answered` antall markerte kort, og første markering på hvert kort føres som `correct` («Kunne») eller `wrong` («Kunne ikke») (FR-56)
**Og** enkeltmarkeringer sendes aldri til serveren

**Gitt** at minst ett kort er markert
**Når** økten er ferdig, studenten velger «Avslutt økt» eller Esc, går til en annen side i appen, logger ut, eller lukker fanen (`pagehide`)
**Så** sendes resultatet nøyaktig én gang, med `sendBeacon` ved `pagehide`, og `aborted=true` i alle tilfeller unntatt når økten er ferdig (AR-9, SK-20)
**Og** «Logg ut» i toppfeltet venter til resultatet er sendt før utloggingen

**Gitt** at ingen kort er markert
**Når** økten avsluttes på noen av måtene over
**Så** lagres ingenting, og «Avslutt økt» og Esc går rett tilbake dit økten startet, uten resultatside (UX-DR33)

**Gitt** at økten er ferdig og lagret
**Når** øktpanelet vises
**Så** er alle ruter fylt, «Avslutt økt» er byttet med «✓ Økten er ferdig og lagret», og symbolforklaringen viser «Kunne ikke, repetert» (UX-DR8)
**Og** «Økten er ferdig» leses opp i et levende område (UX-DR44)

**Gitt** at «øvd» skal regnes ut ett sted (AR-9)
**Når** storien er ferdig
**Så** finnes én funksjon i `practice` som gir forelesningene i et emne som er øvd, med dato for siste økt
**Og** en forelesning er øvd når den har en lagret økt; en emneøkt teller for forelesningene som hadde innhold (tellinger fra `content`) da økten startet

**Gitt** at siste økt i et emne skal kunne vises
**Når** `GET /api/subjects/{id}/practice-sessions/latest` kalles
**Så** gir den den siste lagrede økten i emnet, eller ingenting

**Gitt** en ferdig økt *(Kan kuttes, FR-26)*
**Når** resultatsiden (08) vises
**Så** viser `result-summary` overlinjen «ØKT FERDIG», tittelen «Du har gått gjennom alle 24 kortene», underteksten «Uke 37: Merkevare · kortene du ikke kunne, ble repetert til slutt i økten», og to felt «Kunne 19» med «79 % av kortene» og «Kunne ikke 5» med «Repetert til slutt i økten», uten feiring (UX-DR34)

**Gitt** en avbrutt økt med minst ett markert kort *(Kan kuttes, FR-26)*
**Når** resultatsiden vises
**Så** viser den resultatet for det som er markert, med tittelen «Avbrutt etter 12 av 20» (UX-DR33)

**Gitt** at studenten hadde kort hun ikke kunne *(Kan kuttes, FR-26)*
**Når** resultatsiden vises
**Så** viser `missed-list` «Kortene du ikke kunne» med antall og én rad per kort: nummer, spørsmål og kilde med `source-link` (UX-DR35)

**Gitt** resultatsiden
**Når** studenten trykker «Øv igjen» eller Enter
**Så** starter samme økt på nytt med ny blanding og ny `session_id`
**Og** «Tilbake til forelesningen» eller Esc går dit økten startet (UX-DR32, UX-DR34)
**Og** hint-linjen viser «Enter øv igjen» og «Esc tilbake til forelesningen» når hurtigtaster er på

**Gitt** at storien er ferdig
**Når** testene kjøres
**Så** har testene krav-ID i navnet (`test_fr56_…`, `test_sk20_…`, `test_ar9_…`, `test_fr26_…`) (AR-17)
**Og** en Playwright-test markerer to kort, går til en annen side og ser at økten er lagret som avbrutt
**Og** axe finner ingen brudd på resultatsiden for ferdig og avbrutt økt, og den kan brukes med tastatur

### Story 3.6: Øv på flashcards fra hele emnet

Som student,
vil jeg øve på flashcardene fra alle forelesningene i et emne samlet,
slik at jeg kan repetere hele pensum før eksamen.

**Krav:** FR-23, FR-56 (flashcards), UX-DR14 (flashcards)

**Akseptkriterier:**

**Gitt** et emne med kort i flere forelesninger
**Når** `GET /api/subjects/{id}/flashcards` kalles
**Så** får studenten alle kortene i emnet med kilde og forelesningens navn
**Og** et emne som tilhører en annen, gir `404 NOT_FOUND`

**Gitt** emnesiden (03)
**Når** emnet har flashcards
**Så** viser kortet «Øv på hele emnet» (`practice-all-card`) raden Flashcards med «120 kort fra 6 forelesninger» og hovedknappen «Øv på flashcards» (UX-DR14)
**Og** kortet er bygd slik at quiz og fritekst kan legge til sine rader senere, og en rad vises bare når typen har innhold

**Gitt** et emne uten flashcards
**Når** emnesiden vises
**Så** vises ikke Flashcards-raden, slik at ingen tom økt kan startes *(A15/E1)*

**Gitt** at emnet har en lagret økt
**Når** emnesiden vises
**Så** står SISTE ØKT nederst i kortet med type, omfang, dato og resultat («Flashcards · Markedsføring, hele emnet» og «12.11 · Kunne 19 av 24»)

**Gitt** at studenten trykker «Øv på flashcards»
**Når** økten starter
**Så** gjenbruker den øktrammen fra 3.3–3.5 med kortene fra alle forelesningene i tilfeldig rekkefølge (FR-23)
**Og** øktpanelet viser emnet som omfang («Markedsføring · hele emnet»), og kilden på kortet viser fil og side

**Gitt** en emneøkt med minst ett markert kort
**Når** den lagres
**Så** er `lecture_id` tom og `subject_id` satt (FR-56)
**Og** funksjonen for «øvd» regner forelesningene som hadde kort da økten startet, som øvd, men ikke forelesninger som fikk kort senere

**Gitt** resultatsiden etter en emneøkt
**Når** studenten velger tilbake
**Så** kommer hun til emnesiden, der økten startet (UX-DR34)

**Gitt** at storien er ferdig
**Når** testene kjøres
**Så** har testene krav-ID i navnet (`test_fr23_…`, `test_fr56_…`) (AR-17)
**Og** axe finner ingen brudd på emnesiden med og uten flashcards og på emneøkten, og alt kan brukes med tastatur

### Story 3.7: Rett og slett kort, og se hva som slettes

Som student,
vil jeg rette eller slette et dårlig kort mens jeg øver, og se hvor mange kort som slettes sammen med en fil,
slik at jeg kan stole på kortene jeg øver på og vet hva jeg mister.

**Krav:** FR-12 (flashcards), FR-27, AR-4, AR-7, UX-DR22, UX-DR27

**Akseptkriterier:**

**Gitt** et kort i en økt
**Når** det vises
**Så** har bunnfeltet ved kilden tekstknappene «Rediger» og «Slett» (UX-DR27)

**Gitt** at studenten trykker «Rediger»
**Når** redigeringen åpnes
**Så** kan hun endre forside og bakside i en dialog med synlige etiketter («Spørsmål» og «Svar»), og «Lagre» sender `PATCH /api/flashcards/{id}` (FR-27)
**Og** det endrede kortet vises med en gang i økten, og Esc lukker uten endring

**Gitt** at et felt er tomt eller bare har mellomrom
**Når** studenten lagrer
**Så** *(E34)* lagres ingenting: API-et svarer med en feilkode fra `core/errors.py`, og feltet får rød kant, tekst under som sier hva som må gjøres («Skriv inn spørsmålet.» / «Skriv inn svaret.»), og fokus (UX-DR25, NFR-11)
**Og** endringer studenten gjør selv, sjekkes bare for tomme felt, ikke med `validate_item` (AR-4)

**Gitt** at studenten trykker «Slett»
**Når** bekreftelsen åpnes
**Så** gjenbruker den den felles slettebekreftelsen: kortets spørsmål, «Det kan ikke angres.», «Avbryt» med startfokus og fareknappen «Slett kortet» (UX-DR22)
**Og** «Avbryt» eller Esc sletter ingenting (SK-6)

**Gitt** at studenten bekrefter sletting
**Når** `DELETE /api/flashcards/{id}` svarer `204`
**Så** *(E22)* tas kortet ut av resten av økten; var det ikke markert, tas ruten bort og totalen går ned med én, og var det markert, står den første markeringen i resultatet
**Og** er det det siste kortet i økten, er økten ferdig (eller går tilbake uten resultat hvis ingenting er markert)

**Gitt** et kort som tilhører en annen student
**Når** noen sender `PATCH` eller `DELETE` til `/api/flashcards/{id}`
**Så** svarer API-et `404 NOT_FOUND` (AR-2, SK-6)

**Gitt** delete-preview-registeret i `content` fra epic 2
**Når** flashcards melder seg inn
**Så** teller forhåndsvisningen for fil, erstatning, forelesning, emne og konto også flashcards
**Og** slettedialogen for en fil sier for eksempel «Dette sletter også 18 flashcards laget fra fila. Det kan ikke angres.» (FR-12, UX-DR22)

**Gitt** at en jobb pågår på forelesningen
**Når** studenten sletter eller erstatter en fil, eller sletter forelesningen
**Så** svarer API-et `409 JOB_ALREADY_RUNNING` og sletter ingenting (AR-7)
**Og** *(E9)* det samme gjelder sletting av et emne eller en konto der en forelesning har en jobb som pågår, og dialogen viser en melding fra meldingsfila («Det lages innhold i denne forelesningen nå. Vent til det er ferdig, og prøv igjen.»)

**Gitt** at storien er ferdig
**Når** testene kjøres
**Så** har testene krav-ID i navnet (`test_fr27_…`, `test_sk6_…`, `test_fr12_…`, `test_ar7_…`) (AR-17)
**Og** axe finner ingen brudd på økten med redigeringsdialogen og slettebekreftelsen åpen, og begge kan brukes med bare tastatur

### Dekning

| Krav | Story |
|---|---|
| FR-2 | 3.1 (mock bruker teksten fra fila; instruksene for flashcards skrives) |
| FR-17 *(Kan kuttes)* | 3.2 (egne merkede kriterier) |
| FR-18 | 3.1 (inntil valgt antall), 3.2 (melding om færre) |
| FR-19 | 3.1 (to typer i validator og instrukser), 3.3 (samme kort for begge) |
| FR-20 | 3.3 |
| FR-21 | 3.2 |
| FR-22 | 3.1 |
| FR-23 | 3.3 (forelesning), 3.6 (hele emnet) |
| FR-24 | 3.3 |
| FR-25 | 3.3 |
| FR-26 *(Kan kuttes)* | 3.5 (egne merkede kriterier) |
| FR-27 | 3.7 |
| FR-38 | 3.1, 3.2 |
| FR-56 (flashcards) | 3.5, 3.6 |
| UX-DR8 | 3.3, 3.5 (ferdigtilstand) |
| UX-DR9 | 3.3 |
| UX-DR10 | 3.4 |
| UX-DR14 (flashcards) | 3.6 |
| UX-DR18 | 3.1 |
| UX-DR19 | 3.1, 3.2 |
| UX-DR20 | 3.2 |
| UX-DR24 (flashcards) | 3.2 |
| UX-DR26 | 3.4 |
| UX-DR27 | 3.3, 3.4 (hint), 3.7 (Rediger/Slett) |
| UX-DR31 | 3.4 |
| UX-DR32 | 3.4, 3.5 (resultatsiden) |
| UX-DR33 | 3.3, 3.4 (Esc), 3.5 (avbrutt resultat) |
| UX-DR34 | 3.5, 3.6 |
| UX-DR35 | 3.5 |
| UX-DR36 | 3.3 |
| UX-DR44 | 3.1, 3.2, 3.5 |

Kanttilfeller: A15/E1 (3.3, 3.6), A20/E12 (3.2), E9 (3.7), E10 (3.2), E22 (3.7), E41 (3.3), A16/E23/E40, E24, E25 (3.4), A6/E29, E30 (3.3), E34 (3.7).

### Avgjort av Silje 2026-11-14

1. «+ Lag flere» i demomodus: mock-modellen hopper over kort med samme forside som kort forelesningen har fra før, så sensor ikke ser de samme kortene to ganger.
2. Tekstene «Last opp notater først.», «Det ble laget 12 av inntil 20 flashcards. Notatene ga ikke grunnlag for flere.», «Notatene ga ikke grunnlag for flashcards. Ingenting er lagret.», «Flashcardene er ferdige: 18 kort i Uke 37: Merkevare.», «Tar noen sekunder.» og «Tar vanligvis under to minutter.», «Repeterer: 3 kort igjen», «Det finnes ingen flashcards her ennå.» med «Tilbake til forelesningen», «Flashcards · Markedsføring, hele emnet» og «12.11 · Kunne 19 av 24», «Markedsføring · hele emnet», feltene «Spørsmål» og «Svar» med «Skriv inn spørsmålet.» og «Skriv inn svaret.», og «Det lages innhold i denne forelesningen nå. Vent til det er ferdig, og prøv igjen.»
3. Merknadsflaten brukes bare for «færre enn valgt», aldri for feil, slik UX-DR20 sier. Motsigelsen i DESIGN.md ryddes sammen med gruppe 4 fra UX-gjennomgangen.
4. Story 3.4 tar smal skjerm for alle sidene som finnes da, også sidene fra epic 2. Forsidekortene tas i epic 5.
5. Sletting av forelesning, emne eller konto blokkeres med 409 mens en jobb pågår.
6. Merknadsflaten bygges i 2.3 (avgjort i epic 2), så 3.2 gjenbruker den.
7. Kanttilfellene A6/E29, A15/E1, A16/E23/E40, A20/E12, E9, E10, E22, E24, E25, E30, E34 og E41 er løst slik kriteriene beskriver.
