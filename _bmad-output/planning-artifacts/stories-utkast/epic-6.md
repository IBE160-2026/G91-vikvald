## Epic 6: Ekte språkmodell og klar for sensor

Appen kan bruke Gemini i EU, formler kommer med fra sider sendt som bilde, og sensor møter en ferdig app med testbruker, eksempelemne og en README som virker. Epicen avslutter med en samlet kontroll av universell utforming, tastatur, nettlesere og stikkprøvene for kvalitet.

### Story 6.1: Koble Gemini på Vertex AI inn bak språkmodellporten

Som student,
vil jeg at appen kan lage innhold med Gemini i EU når den er slått på,
slik at jeg får innhold av ekte kvalitet uten at notatene mine forlater EU.

**Krav:** NFR-4, NFR-5, AR-3, AR-18

**Akseptkriterier:**

**Gitt** at `LLM_PROVIDER=vertex`, `GOOGLE_CLOUD_PROJECT` og `VERTEX_MODEL` er satt
**Når** backend starter
**Så** bruker genereringsløpet `VertexGenerator` bak den samme porten `generate(kind, pages, options)` som `MockGenerator` (gjenbruker porten og løpet fra epic 3)
**Og** ingen andre moduler enn `generation` importerer pydantic-ai eller kaller modellen

**Gitt** at `VertexGenerator` lages
**Når** leverandøren settes opp
**Så** brukes pydantic-ai med `GoogleCloudProvider(location='eu')` og Application Default Credentials (ADC)
**Og** en test bekrefter at `location` er `eu`, og at det globale endepunktet (`global`) aldri brukes

**Gitt** en innholdstype i registeret fra epic 3
**Når** `VertexGenerator` kaller modellen
**Så** bes det om svar med `NativeOutput` og det samme løse skjemaet som mock-modellen gir
**Og** svaret går videre gjennom `validate_item`, forkasting, telling og lagring akkurat som i demomodus

**Gitt** at `VERTEX_MODEL` og `VERTEX_THINKING` er satt i `.env`
**Når** modellen kalles
**Så** brukes modellnavnet og tenkenivået derfra
**Og** modellen kan byttes (issue #3, #4) uten kodeendring; `.env.example` har `gemini-3.5-flash` som foreløpig verdi

**Gitt** at `LLM_PROVIDER=vertex`, men `GOOGLE_CLOUD_PROJECT` eller `VERTEX_MODEL` mangler
**Når** backend starter
**Så** stopper den med en loggmelding som sier hvilken innstilling som mangler
**Og** meldingen inneholder ingen hemmeligheter

**Gitt** at kallet til Vertex feiler (for eksempel manglende innlogging i gcloud eller nettverksfeil) eller tar over 3 minutter
**Når** jobben avsluttes
**Så** blir jobben `failed` med feilkoden fra epic 3, ingenting lagres, og studenten ser meldingen fra FR-21 med «Prøv igjen» (gjenbruker `job-status`)
**Og** loggen har feilkoden, men ikke notattekst eller svar fra modellen (AR-15)

**Gitt** at appen kjører med `LLM_PROVIDER=vertex`
**Når** nettleseren henter `GET /api/config`
**Så** er `demo_mode` `false`, og svaret har verken prosjekt-ID, modellnavn eller annen nøkkel
**Og** ingen innstilling for Vertex har prefikset `NEXT_PUBLIC_`

**Gitt** at `demo_mode` er `false`
**Når** studenten åpner kontosiden og vilkårsdialogen
**Så** vises ikke demomerket, og setningen «I demomodus sendes ingenting ut.» er borte (gjenbruker bryterne fra epic 1–3)
**Og** språkmodell-raden og ventetekstene viser varianten for ekte modell (se Spørsmål til Silje)

**Gitt** at repoet er klonet
**Når** utvikleren følger README-avsnittet om Gemini
**Så** viser README hvordan `.env` fylles ut, og innholdet i en `docker-compose.override.yml` som monterer `~/.config/gcloud` skrivebeskyttet inn i `backend`
**Og** `docker-compose.override.yml` står i `.gitignore`, og README viser hvordan mellomlagring slås av og sjekkes i Google Cloud-prosjektet (NFR-5)

**Gitt** testpakken
**Når** `uv run pytest` kjøres med `LLM_PROVIDER=mock`
**Så** testes `VertexGenerator` med pydantic-ais testmodell (`TestModel` eller `FunctionModel`), og ekte kall er sperret (`ALLOW_MODEL_REQUESTS = False`)
**Og** testene har krav-ID i navnet, for eksempel `test_ar3_vertex_uses_eu_location` og `test_nfr4_config_has_no_secrets` (AR-17)

### Story 6.2: Fastsett instruksene til modellen for flashcards og quiz

Som student,
vil jeg at Gemini lager kort og quizspørsmål på norsk med fagbegrepene fra notatene mine og alternativer som ikke røper svaret,
slik at jeg øver på det riktige stoffet og ikke kan gjette meg til fasiten.

**Krav:** FR-2, FR-31, AR-3

**Akseptkriterier:**

**Gitt** registeret for innholdstyper fra epic 3
**Når** flashcards og quiz registreres
**Så** har hver av dem en instruksfil i `backend/app/modules/generation/instructions/` (`flashcards.md` og `quiz.md`) som `VertexGenerator` leser
**Og** instruksene ligger i Git, slik at sensor kan lese dem; senere innholdstyper (epic 7–9) legger til sin egen fil på samme måte

**Gitt** sider som sendes til modellen
**Når** forespørselen bygges
**Så** er hver side merket med `file_id`, filnavn og `page_no`, og modellen bes oppgi kilden med disse verdiene
**Og** en test med `FunctionModel` bekrefter at forespørselen har sidene, instruksen og største antall fra omfanget (10, 20 eller 30)

**Gitt** instruksen for flashcards
**Når** den leses
**Så** sier den at kortene bare skal lages fra sidene, skal være på norsk bokmål, og at norske fagbegreper fra notatene brukes slik de står, med det engelske i parentes når notatene bruker begge, for eksempel «merkevare (brand)» (FR-2)
**Og** den sier at begge korttypene kan brukes (spørsmål med svar og begrepskort), at modellen lager færre enn største antall heller enn å fylle opp med svake kort, og at kortene skal spre seg over overskriftene i notatene (SK-17)

**Gitt** instruksen for quiz
**Når** den leses
**Så** sier den at hvert spørsmål har fire alternativer med nøyaktig ett riktig, en forklaring og en kilde, og at vanskelighetsgraden følger FR-28 (lett: kjenne igjen en definisjon, middels: forstå sammenhenger, vanskelig: bruke stoffet på et eksempel)
**Og** den sier at alternativene skal være omtrent like lange, at feilalternativene skal være troverdige for en som ikke kan stoffet, og at «alle de ovenfor» og lignende ikke brukes (FR-31)

**Gitt** at instruksene er skrevet
**Når** Silje prøver dem med Gemini på åpent lisensierte sider (som i `research/pdf-og-norsk-test/`)
**Så** noteres det hun retter i instruksene, i `docs/ki-prosess/korrigeringer.md`
**Og** kvaliteten måles først i stikkprøvene i story 6.6

**Gitt** testpakken
**Når** testene kjøres
**Så** finnes tester med krav-ID i navnet, for eksempel `test_fr2_flashcard_instructions_require_norwegian_terms` og `test_fr31_quiz_instructions_require_equal_length` (AR-17)
**Og** testplanen (story 6.5) sier at FR-2 og FR-31 for ekte modell bare kan måles manuelt, i SK-13 og SK-15

### Story 6.3: Send sider med formler som bilde og merk innholdet *(Kan kuttes)*

Som student,
vil jeg at formler som mangler i teksten, kommer med, og at innhold fra slike sider er merket,
slik at jeg vet når jeg bør sjekke en formel mot kilden.

**Krav:** FR-40, FR-41, AR-6, UX-DR37

**Akseptkriterier:**

**Gitt** at en PDF lastes opp
**Når** `files` leser sidene med PyMuPDF
**Så** settes `file_pages.needs_image` etter regelen fra issue #9: en side får `true` når den har vektortegninger eller bilder over en terskel som fastsettes ved testing (forslag), slik at heller en side for mye enn for lite blir sendt som bilde
**Og** regelen og terskelen står i en kommentar i koden og i issue #9

**Gitt** *Principles of Economics 3e*, PDF-side 127–128 (formler tegnet som vektorgrafikk)
**Når** Silje laster opp fila lokalt
**Så** får begge sidene `needs_image = true`, og en vanlig tekstside i samme bok får `false`
**Og** resultatet noteres i issue #9; OpenStax-PDF-en legges ikke i repoet, så den automatiske testen bruker en liten test-PDF med en formel tegnet som vektorgrafikk og en side med bare tekst

**Gitt** en jobb med sider der `needs_image = true`
**Når** genereringsløpet henter sidene
**Så** lages et bilde av hver slik side fra den lagrede PDF-en gjennom `core/storage` og sendes sammen med teksten til porten
**Og** bildet lagres verken på disk eller i databasen (AR-6)

**Gitt** at modellen svarer
**Når** svaret tolkes
**Så** har skjemaet et felt der modellen kan melde at noe mangler i teksten (for eksempel `formula_missing`), og instruksene fra story 6.2 ber modellen bruke det
**Og** `MockGenerator` setter aldri feltet

**Gitt** et gyldig element
**Når** det lagres
**Så** settes `formula_flag = true` hvis kildesiden har `needs_image = true` eller modellen meldte at noe mangler; ellers `false`
**Og** regelen ligger ett sted i genereringsløpet og gjelder alle innholdstyper i registeret, også dem som kommer i epic 7–9

**Gitt** et flashcard eller quizspørsmål med `formula_flag = true`
**Når** det vises under øving, i forklaringen etter bekreftet svar eller i listen over feil
**Så** vises formelmerket (`formula-flag`) med teksten «Inneholder formel – sjekk mot kilden» ordrett, på merknadsflaten med infoikon, rett over kildelenken
**Og** formelmerket er en felles komponent i `frontend/components/` som gjenbruker merknadsflaten, slik at epic 7–9 kan bruke den; det er ikke oransje eller rødt

**Gitt** innhold uten `formula_flag`
**Når** det vises
**Så** vises ikke formelmerket

**Gitt** sidene som viser formelmerket
**Når** axe kjøres og siden brukes med tastatur
**Så** har axe ingen brudd, og merket leses av skjermleser som tekst (ikke bare som ikon)
**Og** testene har krav-ID i navnet, for eksempel `test_fr40_vector_formula_page_needs_image` og `test_fr41_flag_set_when_model_reports_missing` (AR-17)

### Story 6.4: Lag testbruker og eksempelemne med eksempelnotater

Som sensor,
vil jeg kunne logge inn med en testbruker og finne et ferdig eksempelemne med notater og innhold,
slik at jeg kan prøve alle funksjonene uten å lage noe selv.

**Krav:** NFR-2 (README-tekst fra NFR-2a), NFR-3, AR-14

**Akseptkriterier:**

**Gitt** prosjektet
**Når** eksempelnotatene legges inn
**Så** finnes 2–3 korte notater på norsk bokmål, skrevet med egne ord og basert på *Principles of Marketing* fra OpenStax (for eksempel markedsmiksen, segmentering og AIDA, issue #13), som PDF i `backend/app/seed/notater/` sammen med kildeteksten
**Og** hvert notat har minst fire definisjonssetninger med «er» og minst én punktliste med tre eller flere punkter, slik at mock-modellen lager flashcards, quiz og modellkort etter NFR-2a

**Gitt** eksempelnotatene
**Når** de leses
**Så** krediterer hvert notat OpenStax *Principles of Marketing* med lenke, sier at det er endret, og at det deles under CC BY-NC-SA 4.0
**Og** mappa har en lisensfil for notatene; ingen OpenStax-PDF ligger i repoet

**Gitt** at KI ble brukt til utkast av notatene
**Når** de legges inn
**Så** står det i `docs/ki-prosess/`, og Silje har lest dem faglig før de tas i bruk

**Gitt** en tom database og `APP_ENV=local`
**Når** backend starter
**Så** kjører `seed_if_empty` etter Alembic og før jobboppryddingen og Uvicorn (AR-14)
**Og** den lager testbrukeren, godtar vilkårene, lager emnet «Markedsføring» med eksamensdato og én forelesning per notat, og laster opp notatene, alt gjennom de vanlige tjenestene i `identity`, `subjects` og `files`, ikke med egne SQL-setninger

**Gitt** at eksempelemnet er laget
**Når** seed lager innhold
**Så** kjøres det vanlige genereringsløpet med mock-modellen for hver innholdstype som er registrert og slått på, i hver forelesning, uansett hva `LLM_PROVIDER` er satt til
**Og** innholdstyper fra epic 7–9 kommer derfor med automatisk når de er bygd og bryteren er på; en test med en ekstra innholdstype i registeret viser dette, og en avslått bryter gir ingen rader av den typen

**Gitt** at databasen ikke er tom, eller at `APP_ENV` ikke er `local`
**Når** backend starter
**Så** gjør seed ingenting, og en ny oppstart lager aldri dobbelt testbruker eller emne

**Gitt** at appen er startet med `docker compose up` uten `.env`
**Når** sensor logger inn med testbrukeren
**Så** ser hun emnet «Markedsføring» med forelesninger, filer og ferdig generert innhold, og kan øve med en gang
**Og** en Playwright-test logger inn som testbrukeren, åpner emnet og starter en flashcardøkt, og axe har ingen brudd på sidene den besøker

**Gitt** README
**Når** sensor leser den
**Så** står testbrukerens e-post og passord der
**Og** README sier, med teksten fra NFR-2a, at demoinnholdet er enkelt og mekanisk og viser at funksjonene virker, ikke kvaliteten med ekte modell, og den sier hvor *Principles of Marketing* og *Principles of Economics 3e* lastes ned hos OpenStax og hvordan de krediteres

**Gitt** testpakken
**Når** testene kjøres
**Så** finnes tester med krav-ID i navnet, for eksempel `test_nfr3_seed_creates_test_user_and_subject` og `test_ar14_seed_only_when_empty_and_local` (AR-17)

### Story 6.5: Fullfør README, legg til lisens og vis testdekningen

Som sensor,
vil jeg kunne starte appen fra en ren kopi, se hvilken lisens som gjelder, og se hvilke krav som er testet og hvordan,
slik at jeg kan etterprøve leveransen.

**Krav:** NFR-1 (fullført), AR-19 (lisens), SK-1, SK-11

**Akseptkriterier:**

**Gitt** README
**Når** den leses fra toppen
**Så** har den: programmer som trengs med versjon (Docker Desktop, og uv og Node for utvikling), oppstart med `docker compose up` og adressen `http://localhost:3000`, at demomodus er standard uten `.env`, testbrukerens innlogging, hvordan pytest, Vitest og Playwright kjøres, hvordan Gemini slås på (fra story 6.1), demotekst og nedlasting av OpenStax (fra story 6.4), lenker til planleggingsdokumentene og testplanen, og kreditering og lisens
**Og** alle kommandoer står i kodeblokker som kan kopieres (issue #27)

**Gitt** repoet
**Når** lisensen legges til
**Så** finnes en `LICENSE`-fil i rota med lisensen Silje velger i issue #25 (forslag: AGPL-3.0, fordi PyMuPDF er AGPL og repoet er offentlig)
**Og** README sier hvilken lisens koden har, at eksempelnotatene har CC BY-NC-SA 4.0, og at PyMuPDF er AGPL

**Gitt** `.env.example`
**Når** den sammenlignes med innstillingene i `core/config`
**Så** har den alle innstillingene med forklaring og uten hemmelige verdier
**Og** en test sjekker at alle innstillingene finnes i `.env.example`, og at appen kan lages med tom miljø og `APP_ENV=local` (`test_nfr4_env_example_lists_all_settings`)

**Gitt** testplanen `docs/testplan.md`
**Når** den leses
**Så** har den én rad per må ha-krav (FR-1–FR-41 og FR-56–FR-58) med testene som dekker det, eller «manuell» med begrunnelse når kravet bare kan kontrolleres manuelt (for eksempel FR-2 og FR-31 med ekte modell)
**Og** den viser hvor SK-2–SK-22 kontrolleres, og har plass til resultatene fra de manuelle kontrollene i story 6.6

**Gitt** testplanen og testene
**Når** `uv run pytest` kjøres
**Så** sjekker en test at hvert må ha-krav enten har minst én test med krav-ID i navnet (i backend-, Vitest- eller Playwright-testene) eller en begrunnelse for manuell kontroll i testplanen (`test_sk1_every_must_requirement_has_test_or_reason`)
**Og** testen feiler med en liste over kravene som mangler

**Gitt** en ren kopi av repoet i en ny mappe, uten `.env`, uten gcloud-innlogging og uten andre kontoer
**Når** Silje følger README ordrett
**Så** starter appen i demomodus, testbrukeren kan logge inn, og alle testkommandoene i README virker (SK-11)
**Og** dato, commit og eventuelle avvik føres i testplanen, og README rettes der den ikke stemte

### Story 6.6: Gjør den avsluttende kontrollen av universell utforming, skjerm, nettlesere og kvalitet

Som sensor,
vil jeg se dokumentert at appen er kontrollert for universell utforming, skjermstørrelse, nettlesere og kvalitet med ekte modell,
slik at jeg kan stole på at kravene er oppfylt og ser hvor de ikke er det.

**Krav:** NFR-13, NFR-14, NFR-15, SK-9, SK-12, SK-13, SK-14, SK-15, SK-16, SK-17

**Akseptkriterier:**

**Gitt** at appen kjører med `docker compose up` og seed-dataene fra story 6.4
**Når** `npx playwright test` kjøres
**Så** sjekker axe forelesningssiden, flashcard-øving og quiz uten brudd (gjenbruker Playwright- og axe-oppsettet fra epic 1)
**Og** testene har krav-ID i navnet, for eksempel `test_nfr13_axe_lecture_page`

**Gitt** de samme testene *(Kan kuttes, kuttrekkefølge punkt 4)*
**Når** de kjøres
**Så** sjekker axe også alle de andre sidene og tilstandene: innlogging og oppretting, forsiden med og uten emner, emnesiden, vilkårsdialogen, lag-dialogene, slettebekreftelsen, flashcard- og quizresultat, hurtigtastdialogen, kontosiden og «Fant ikke siden», uten brudd
**Og** sider for bør ha (modellkort, fritekst, sammendrag) sjekkes når bryteren er på i `GET /api/config`, slik at de kommer med uten at testen endres

**Gitt** kjerneflyten: logge inn → opprette emne og forelesning → laste opp PDF og godta vilkår → lage og øve på flashcards → lage og ta quiz → logge ut
**Når** Silje gjør den med bare tastatur (SK-12)
**Så** kan hvert steg gjøres, fokusringen synes hele tiden, og fokus går dit EXPERIENCE.md sier
**Og** dato, nettleser og funn føres i testplanen; feil rettes eller føres som GitHub Issue og i `issues.md`

**Gitt** alle sidene over
**Når** vinduet er 768 px bredt
**Så** har ingen side vannrett rulling, og sidemenyen og øktpanelet ligger bak menyknappen (NFR-14, UX-DR10)
**Og** en Playwright-test sjekker at sidebredden ikke er større enn vinduet; 200 % tekststørrelse i nettleseren kontrolleres manuelt på kjerneflyten og føres i testplanen

**Gitt** kjerneflyten
**Når** den gjennomføres i siste Chrome og Edge
**Så** virker den, og resultatet føres i testplanen med versjonsnummer (NFR-15)
**Og** *(Kan kuttes, kuttrekkefølge punkt 3)* det samme gjøres i siste Safari

**Gitt** at Gemini er slått på og eksempelnotatene og åpent lisensiert materiale fra OpenStax er lastet opp lokalt
**Når** Silje lager en stikkprøve på 50 flashcards fra markedsføring og 20 quizspørsmål
**Så** eksporterer et lite skript (`backend/scripts/`) kortene og spørsmålene med kilde til et regneark i `docs/kvalitet/` med kolonnene innhold, kilde, vurdering («riktig», «faglig feil», «feil kilde») og kommentar
**Og** Silje vurderer hvert element mot læreboka, ikke med KI; kort hun er usikker på etter å ha slått opp, teller som faglig feil

**Gitt** det utfylte regnearket
**Når** resultatet regnes ut
**Så** står det i `docs/kvalitet/` om grensene er nådd: under 5 % faglige feil (SK-13), minst 95 % riktig kilde (SK-14), ett faglig riktig alternativ i hvert quizspørsmål og det riktige som det lengste i høyst 35 % (SK-15), og minst 80 % av overskriftene i notatene med minst ett kort (SK-17)
**Og** modellen og tenkenivået som ble brukt, står der; valget av modell (issue #4) avgjøres ut fra dette og settes bare i `.env.example`; ventetiden for 20 flashcards med Gemini noteres (kontroll av NFR-17 fra epic 3)

**Gitt** at story 6.3 er bygd *(Kan kuttes sammen med story 6.3)*
**Når** Silje lager kort fra *Principles of Economics 3e*, PDF-side 127–128
**Så** sammenlignes formlene på kortene med sidene, og resultatet føres i regnearket (SK-16)
**Og** kortene har formelmerket

**Gitt** at en grense ikke nås
**Når** resultatet føres
**Så** står det hva som ble gjort (for eksempel endrede instrukser eller annen modell) eller hvorfor ingenting ble gjort, med lenke til `docs/ki-prosess/korrigeringer.md` eller et GitHub Issue
**Og** resultatet legges i repoet uten personopplysninger

### Dekning

| Krav | Story |
|---|---|
| FR-40 | 6.3 *(Kan kuttes)* |
| FR-41 | 6.3 *(Kan kuttes sammen med FR-40)* |
| UX-DR37 | 6.3 |
| FR-2, FR-31 (instruksene til ekte modell; grunnkravene ligger i epic 3 og 4) | 6.2, målt i 6.6 |
| NFR-1 (fullført) | 6.5 (6.1 og 6.4 legger til sine avsnitt) |
| NFR-3 | 6.4 |
| NFR-4, NFR-5 | 6.1 |
| NFR-13, NFR-14, NFR-15 | 6.6 |
| AR-3 (Vertex), AR-18 | 6.1 (instrukser 6.2) |
| AR-14 (demodata) | 6.4 |
| AR-19 (lisens, `needs_image`, instrukser, modellvalg) | 6.5 (lisens), 6.3 (`needs_image`), 6.2 (instrukser), 6.6 (modellvalg) |
| SK-1, SK-11 | 6.5 |
| SK-9, SK-12–SK-17 | 6.6 |

### Spørsmål til Silje

1. **Tekster for ekte modell:** EXPERIENCE.md har bare demovarianten av språkmodell-raden på kontosiden («Testmodell i demomodus (ellers Google, i EU)») og av merknadene og ventetekstene på 04 og 13. Hva skal stå når Gemini er på? Forslag: «Gemini fra Google, behandlet i EU» og «Det tar vanligvis under to minutter».
2. **Testbrukerens innlogging:** Forslag `test@studiekamerat.no` med passordet `studiekamerat` (minst 8 tegn). Greit, eller ønsker du noe annet?
3. **Datoer i eksempelemnet:** Sensor åpner appen etter 15. desember. Med faste datoer vil semesterlinja vise «Eksamen var …». Forslag: seed setter datoene ut fra dagen den kjører (forelesninger de siste ukene, eksamen om 3 uker).
4. **Øvde økter i eksempelemnet:** Skal seed også lagre én eller to økter (gjennom `practice`), slik at semesterlinja og «Neste å øve på» viser både øvd og ikke øvd med en gang? Det er ikke krav i NFR-3, men viser epic 5 bedre.
5. **Regelen for `needs_image` (issue #9):** Forslaget er å telle vektortegninger og bilder på siden mot en terskel, og velge en lav terskel («hellere en side for mye»). Er du enig i at regelen fastsettes slik og testes på s. 127–128?
6. **Formelmerket i demomodus:** Forslaget gir formelmerke ut fra `needs_image` også i demomodus, slik at merket kan testes uten nøkkel. Greit?
7. **Lisens (issue #25):** AGPL-3.0 for koden er forslaget, fordi PyMuPDF er AGPL. Vil du avklare med faglærer først?
8. **Regneark:** CSV i `docs/kvalitet/` (kan åpnes i Excel og vises på GitHub) eller `.xlsx`?
