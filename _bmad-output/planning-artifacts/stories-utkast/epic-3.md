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
**Og** uten filer er knappene ikke aktive, og raden sier hvorfor (forslag til tekst: «Last opp notater først.»)

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

**Gitt** at merknadsflaten brukes flere steder
**Når** storien er ferdig
**Så** finnes `note-surface` som felles komponent i `frontend/components/` og brukes aldri for feil (UX-DR20)
**Og** personvernmerknaden under opplastingsfeltet på 04 bruker komponenten, med samme tekst som før

**Gitt** at en jobb for flashcards har feilet (feil, tidsgrense eller `JOB_INTERRUPTED`)
**Når** Flashcards-raden vises
**Så** viser den i tekst «Vi klarte ikke å lage flashcardene. Ingenting er lagret. Prøv igjen.» og knappen «Prøv igjen» (FR-21, UX-DR42)
**Og** «Prøv igjen» starter en ny jobb med samme omfang
**Og** meldingen leses opp (UX-DR44)

**Gitt** at mock-modellen ikke finner én eneste gyldig definisjon
**Når** jobben er ferdig
**Så** [AVGJØRES: A20/E12] får jobben `status="done"` med `created=0`, ingenting lagres, og raden viser en egen melding i stedet for «0 av inntil 20» (forslag til tekst: «Notatene ga ikke grunnlag for flashcards. Ingenting er lagret.»)

**Gitt** at studenten er på en hvilken som helst side i `(app)`
**Når** en jobb hun har startet, kjører
**Så** spør én hook i `(app)`-layouten `GET /api/jobs/active` med jevne mellomrom, og bare innlogget brukers jobber kommer med (AR-2, AR-5)
**Og** jobben som ble startet fra fanen, følges selv om den blir ferdig før neste spørring (for eksempel med `GET /api/jobs/{id}`)

**Gitt** at jobben blir ferdig mens studenten er på en annen side
**Når** hooken ser at den er ferdig
**Så** vises en kort ferdigmelding med sonner i et levende område, med resultatet eller feilmeldingen fra meldingsfila (forslag til tekst ved suksess: «Flashcardene er ferdige: 18 kort i Uke 37: Merkevare.») *(Kan kuttes: da vises status bare på forelesningssiden, NFR-17.)*

**Gitt** at studenten logger ut mens en jobb kjører
**Når** jobben blir ferdig
**Så** [AVGJØRES: E10] fortsetter jobben og lagrer som vanlig, ingen ferdigmelding vises etter utlogging, og forelesningssiden viser resultatet neste gang hun logger inn

**Gitt** at «Lag flashcards» eller «+ Lag flere» trykkes *(Kan kuttes, FR-17: uten dette gjelder oppførselen fra 3.1, inntil 20 uten valg)*
**Når** dialogen «Lag flashcards» åpnes
**Så** gjenbruker den den felles dialogen og valgkortene: tittelen «Lag flashcards», forelesning med antall filer og sider, «Nye kort legges til de 24 du har fra før.» når det finnes kort, Omfang som tre valgkort «Rask / Inntil 10 kort», «Vanlig / Inntil 20 kort» og «Dyp / Inntil 30 kort», med «Vanlig» forhåndsvalgt og piltaster som flytter valget (UX-DR24)
**Og** under står ventetiden tilpasset modusen (forslag: «Tar noen sekunder.» i demomodus, «Tar vanligvis under to minutter.» ellers) og «Du kan bruke resten av appen imens.»
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
**Så** er listen over kort låst for økten, og kort som blir laget mens økten pågår, kommer ikke med før neste økt [AVGJØRES: E41]

**Gitt** at øktadresse åpnes for en forelesning uten flashcards (for eksempel med en gammel lenke)
**Når** siden vises
**Så** [AVGJØRES: A15/E1] starter ingen økt, siden sier at det ikke finnes flashcards her ennå, med en knapp tilbake til forelesningen, og ingenting lagres
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
**Så** [AVGJØRES: A6/E29] viser den antall ulike kort som er vist, aldri mer enn totalen («24 / 24», aldri «25 / 24»), og under repetisjonen står i tillegg hvor mange kort som er igjen (forslag: «Repeterer: 3 kort igjen»)

**Gitt** svarrutenettet (`answer-grid-cell`)
**Når** studenten markerer kort
**Så** har det én rute per kort, seks per rad, med ✓ for «Kunne» og ✗ for «Kunne ikke» etter første markering, og gjeldende kort med ultramarin kant og nummer (UX-DR9, NFR-10)
**Og** rutene er ikke knapper og leses som for eksempel «Kort 4: kunne ikke»
**Og** rutenettet har en tekstlig versjon for skjermleser

**Gitt** en økt med svært mange kort
**Når** øktpanelet vises
**Så** [AVGJØRES: E30] vises rutenettet bare opp til 120 kort; over det skjules rutenettet, og telleren, stolpen og «Kunne · Kunne ikke» står alene

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
**Så** gjør ikke tasten noe i økten [AVGJØRES: E24]: Esc i et tekstfelt avslutter aldri økten

**Gitt** at en dialog er åpen over økten, eller at øktpanelet er åpnet over innholdet på smal skjerm
**Når** studenten trykker Esc
**Så** [AVGJØRES: A16/E23/E40] lukkes bare dialogen eller panelet, fokus går tilbake dit det var, og økten fortsetter
**Og** enkelttastene virker ikke mens en dialog er åpen

**Gitt** at fokus står på en knapp i økten
**Når** studenten trykker Mellomrom
**Så** [AVGJØRES: E25] utfører Mellomrom knappens vanlige handling, slik tastaturbrukere venter, og snur kortet bare når fokus står på kortet, på snuknappen eller ikke på noen kontroll
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

**Gitt** at storien er ferdig
**Når** testene kjøres
**Så** har testene krav-ID i navnet (`test_nfr8_…`, `test_uxdr26_…`, `test_uxdr10_…`) (AR-17)
**Og** axe finner ingen brudd på økten med panelet lukket og åpent på 768 px og med hurtigtastdialogen åpen, og alt kan brukes med tastatur

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
**Så** vises ikke Flashcards-raden, slik at ingen tom økt kan startes [AVGJØRES: A15/E1]

**Gitt** at emnet har en lagret økt
**Når** emnesiden vises
**Så** står SISTE ØKT nederst i kortet med type, omfang, dato og resultat (forslag: «Flashcards · Markedsføring, hele emnet» og «12.11 · Kunne 19 av 24»)

**Gitt** at studenten trykker «Øv på flashcards»
**Når** økten starter
**Så** gjenbruker den øktrammen fra 3.3–3.5 med kortene fra alle forelesningene i tilfeldig rekkefølge (FR-23)
**Og** øktpanelet viser emnet som omfang (forslag: «Markedsføring · hele emnet»), og kilden på kortet viser fil og side

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
**Så** kan hun endre forside og bakside i en dialog med synlige etiketter (forslag: «Spørsmål» og «Svar»), og «Lagre» sender `PATCH /api/flashcards/{id}` (FR-27)
**Og** det endrede kortet vises med en gang i økten, og Esc lukker uten endring

**Gitt** at et felt er tomt eller bare har mellomrom
**Når** studenten lagrer
**Så** [AVGJØRES: E34] lagres ingenting: API-et svarer med en feilkode fra `core/errors.py`, og feltet får rød kant, tekst under som sier hva som må gjøres (forslag: «Skriv inn spørsmålet.» / «Skriv inn svaret.»), og fokus (UX-DR25, NFR-11)
**Og** endringer studenten gjør selv, sjekkes bare for tomme felt, ikke med `validate_item` (AR-4)

**Gitt** at studenten trykker «Slett»
**Når** bekreftelsen åpnes
**Så** gjenbruker den den felles slettebekreftelsen: kortets spørsmål, «Det kan ikke angres.», «Avbryt» med startfokus og fareknappen «Slett kortet» (UX-DR22)
**Og** «Avbryt» eller Esc sletter ingenting (SK-6)

**Gitt** at studenten bekrefter sletting
**Når** `DELETE /api/flashcards/{id}` svarer `204`
**Så** [AVGJØRES: E22] tas kortet ut av resten av økten; var det ikke markert, tas ruten bort og totalen går ned med én, og var det markert, står den første markeringen i resultatet
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
**Og** [AVGJØRES: E9] det samme gjelder sletting av et emne eller en konto der en forelesning har en jobb som pågår, og dialogen viser en melding fra meldingsfila (forslag: «Det lages innhold i denne forelesningen nå. Vent til det er ferdig, og prøv igjen.»)

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

### Spørsmål til Silje

1. **«Lag flere» i demomodus gir like kort.** Mock-modellen gir samme svar for samme fil (NFR-2), og nye kort legges til de gamle (FR-22). Trykker du «+ Lag flere», får du derfor de samme kortene en gang til. Skal mock-modellen hoppe over definisjoner som allerede har et kort, skal det være slik, eller skal README bare si fra om det?
2. **Nye tekster.** Disse finnes ikke i EXPERIENCE.md og er forslag i kriteriene: «færre enn valgt» for flashcards («12 av inntil 20 flashcards»), «ingenting laget» (A20/E12), forelesning uten filer, ferdigmeldingen, ventetiden i demomodus i dialogen, telleren under repetisjon, tom økt, SISTE ØKT, emneøkt i øktpanelet, feltetikettene og tomt-felt-meldingene i redigeringen, og meldingen ved sletting mens en jobb pågår. Godtar du dem, eller vil du endre noen?
3. **Merknadsflaten for «færre enn valgt».** UX-DR20 sier at merknadsflaten aldri brukes for feil, mens DESIGN.md sier at statusmeldinger for feil og «færre enn valgt» bruker den. Jeg har brukt den bare for «færre enn valgt» og vist feil som vanlig tekst i raden. Er det riktig?
4. **Smal skjerm (UX-DR10)** står bare i epic 3. Jeg har lagt menyknappen for både øktpanelet og sidemenyen i 3.4. Forsidekortene og to kolonner under hverandre hører til sidene i epic 2 og 5. Skal det stå der?
5. **Sletting av konto mens en jobb pågår (E9).** Jeg foreslår `409` også for emne og konto. Alternativet er å la kontosletting stoppe jobben. Hva vil du ha?
