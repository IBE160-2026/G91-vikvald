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
**Så** ser hun én setning om hva appen gjør og hovedknappen «Lag ditt første emne», og ingen tom liste (UX-DR15)
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

**Gitt** dialogen for nytt emne eller nytt navn **[AVGJØRES: E35]**
**Når** navnet er tomt eller bare består av mellomrom
**Så** lagres ingenting: backend svarer med en feilkode (forslag `NAME_REQUIRED`, ført i `core/errors.py` og meldingsfila) og frontend viser under feltet forslaget «Skriv inn et navn.»
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
**Så** lagres ingenting, og en feilmelding under feltet sier hva som er feil og gir et eksempel, etter samme mønster som eksamensdatoen (ordlyd: se Spørsmål til Silje)

**Gitt** et emne med flere forelesninger **[AVGJØRES: E3]**
**Når** `GET /api/subjects/{id}/lectures` henter dem
**Så** er de sortert etter `date`, og forelesninger med samme dato står i den rekkefølgen de ble opprettet (`created_at`)
**Og** tabellen på 03 og sidemenyen bruker samme rekkefølge fra API-et og sorterer ikke på nytt i frontend

**Gitt** emnesiden (03) for et emne med forelesninger
**Når** den vises
**Så** står forelesningstabellen (`lecture-table`) med kolonnene Dato (`dd.mm`) og Forelesning, og hele raden er en lenke til forelesningssiden (04) (UX-DR13)
**Og** kolonnene for filer og status legges til i 2.3, og kolonnene Kort og Quiz kommer i epic 5

**Gitt** et emne uten forelesninger **[AVGJØRES: E2/E6, delen som gjelder 02, 03 og sidemenyen]**
**Når** studenten åpner emnesiden (03)
**Så** står det i stedet for tabellen «Ingen forelesninger ennå.» (forslag), og «Ny forelesning» er knappen for å komme videre
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

**Gitt** dialogene for ny forelesning og nytt navn **[AVGJØRES: E35]**
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
**Så** avviser backend den med en feilkode (forslag `NOT_PDF`) ut fra innholdet, ikke bare filendelsen, og ingenting lagres
**Og** ved opplastingsfeltet står ordrett «Bare PDF-filer kan lastes opp. Lagre Word-dokumentet som PDF (Fil → Lagre som → PDF) og prøv igjen.» (FR-9, UX-DR42)

**Gitt** en PDF der ingen side har tekst etter at mellomrom er fjernet (for eksempel skannet)
**Når** den lastes opp
**Så** avvises den med en feilkode (forslag `NO_READABLE_TEXT`), ingenting lagres, og meldingen er ordrett «Vi fant ingen tekst i denne PDF-en. Den kan være skannet. Last opp en PDF der teksten kan merkes.» (FR-10, UX-DR42)

**Gitt** en PDF med flere enn 50 sider
**Når** den lastes opp
**Så** avvises den med en feilkode (forslag `TOO_MANY_PAGES`) og `details.page_count`, ingenting lagres, og meldingen er ordrett «Fila har 63 sider. Grensen er 50 sider. Del den opp og last opp delene hver for seg.» med det faktiske sidetallet (NFR-16, UX-DR42)
**Og** en fil på nøyaktig 50 sider godtas

**Gitt** en PDF som er låst med passord eller er skadet **[AVGJØRES: E20]**
**Når** den lastes opp
**Så** avvises den med en egen feilkode (forslag `PDF_UNREADABLE`), og ingenting lagres
**Og** meldingen er forslaget «Vi klarte ikke å åpne denne PDF-en. Den kan være låst med passord eller skadet. Lagre den på nytt som PDF uten passord og prøv igjen.»

**Gitt** at studenten velger eller drar inn flere filer på én gang **[AVGJØRES: E19]**
**Når** noen av dem avvises
**Så** sender frontend hver fil i sitt eget kall, og filene som godtas, lastes opp og står i fillista
**Og** ved opplastingsfeltet står én melding per avvist fil, med filnavnet foran meldingen, og meldingene leses opp i et levende område
**Og** meldingene står til studenten laster opp noe nytt eller forlater siden

**Gitt** at studenten laster opp en fil med samme navn som en fil som finnes i forelesningen **[AVGJØRES: E21]**
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

**Gitt** at det ikke finnes noe å slette sammen med fila, forelesningen eller emnet **[AVGJØRES: E16]**
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

**Gitt** at studenten avbryter filvelgeren under erstatning **[AVGJØRES: E18]**
**Når** filvelgeren lukkes uten valgt fil
**Så** skjer ingenting: ingen bekreftelse åpnes, ingenting slettes, og fokus står på «Erstatt»

**Gitt** at studenten har bekreftet erstatningen **[AVGJØRES: E17]**
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
**Så** står Vilkår med «Godtatt 11.09.2026, før første opplasting» (datoen fra `terms_accepted_at`), eller en tekst om at de ikke er godtatt ennå (ordlyd: se Spørsmål til Silje), og Språkmodell med «Testmodell i demomodus (ellers Google, i EU)» i demomodus
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
| UX-DR21 | 2.1, 2.2, 2.4, 2.5, 2.7 |
| UX-DR22 | 2.5 (felles komponent), 2.6, 2.7 |
| UX-DR23 | 2.4 |
| UX-DR39 | 2.7 |
| UX-DR42 | 2.3, 2.6 (Word-fil, PDF uten tekst, over 50 sider) |

Kanttilfeller: E2/E6 (2.2), E3 (2.2), E16 (2.5), E17 og E18 (2.6), E19, E20 og E21 (2.3), E35 (2.1 og 2.2).

### Spørsmål til Silje

1. **Tekster som ikke står i EXPERIENCE.md.** Disse er forslag i storiene og må godkjennes eller endres:
   - setningen om hva appen gjør på tom forside (UX-DR15), for eksempel «Studiekamerat lager flashcards og quiz fra forelesningsnotatene dine, så du kan øve fram mot eksamen.»
   - knappene «Nytt navn», «Endre dato», «Slett forelesningen» og «Slett emnet», og hvor de står (forslag: i toppen av 03 og 04)
   - titler og fareknapper i bekreftelsene: «Slette forelesningen?»/«Slett forelesningen», «Slette emnet?»/«Slett emnet», «Erstatte fila?»/«Erstatt fila», «Slette kontoen?»/«Slett kontoen»
   - feilmelding for ugyldig forelesningsdato, forslag «Skriv inn datoen, for eksempel 11.09.2026.»
   - «Ingen forelesninger ennå.» (E2/E6), «Skriv inn et navn.» (E35) og meldingen for låst eller skadet PDF (E20)
   - kontosiden når vilkårene ikke er godtatt ennå, forslag «Ikke godtatt ennå. Du får se dem før første opplasting.»
2. **Sidetall i vilkårsdialogen.** Skisse 05 viser «merkevare-notater.pdf (12 sider)», men sidetallet er bare kjent etter at serveren har lest fila. Forslaget er å vise bare filnavnet (eller antall filer). Er det greit?
3. **Emnefarge etter sletting.** Forslaget er at et nytt emne får den første fargen ingen av emnene hennes bruker, slik at to emner sjelden har samme farge. DESIGN.md sier «fast rekkefølge etter når emnet ble opprettet». Godtar du tolkningen?
4. **Kolonnen Filer i forelesningstabellen** er lagt i epic 2 (2.3), selv om antall filer er en del av FR-16 (*kan kuttes*, epic 5). Den er liten og trengs for statusen «Ingen filer ennå». Greit å ha den her?
5. **Personvernmerknaden under opplastingsfeltet** på 04 («Notatene sendes til Googles språkmodell i EU …», tilpasset demomodus) bruker merknadsflaten (UX-DR20, epic 3). Skal den med allerede i 2.3, eller vente til epic 3?
6. **Raden «Økt: Logget inn på denne nettleseren siden 03.11»** i skisse 15 står ikke i UX-DR39. Den er utelatt. Skal den med?
7. **Rekkefølgen på emnene** på forsiden og i sidemenyen er satt til den rekkefølgen de ble opprettet. Ønsker du heller sortering etter eksamensdato?
