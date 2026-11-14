---
stepsCompleted: [step-01-validate-prerequisites]
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

{{requirements_coverage_map}}

## Epics

{{epics_list}}
