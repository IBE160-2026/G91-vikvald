## Epic 7: Huskeregler (bør ha)

Studenten får modellkort med forbokstavregel for modeller og lister i notatene, øver på dem i flashcard-økten og kan endre eller legge til egen huskeregel. Bygges først av bør ha-epicene og kuttes sist (bryter `FEATURE_MNEMONICS`).

### Story 7.1: Lag modellkort fra en forelesning

Som student,
vil jeg trykke «Lag modellkort» og få et modellkort for hver modell eller liste i notatene, med huskeregel av forbokstavene,
slik at jeg kan pugge modeller som AIDA med aktiv øving.

**Krav:** FR-2, FR-38, FR-42, FR-43, FR-44, FR-45, FR-47, FR-12, NFR-2a (modellkort), NFR-3, AR-3, AR-4, AR-5, AR-7, AR-11, AR-12, AR-17, UX-DR18, UX-DR19, UX-DR22, UX-DR24 (modellkort), UX-DR42

**Akseptkriterier:**

**Gitt** at epic 3 har laget `flashcards` med `kind` (`qa`, `concept`, `model`)
**Når** storien er bygd
**Så** har en Alembic-migrering lagt til `points` (JSON-liste med tekst) og `mnemonic` (tekst, kan være tom) på `flashcards`, som virker på både Postgres og SQLite (AR-13)
**Og** bare `content` skriver til tabellen (AR-16)

**Gitt** at innholdstypen `models` er meldt inn i registeret for innholdstyper fra epic 3 (generator-regel, validator, lagring)
**Når** studenten sender `POST /api/lectures/{id}/jobs` med `kind: "models"`
**Så** svarer API-et `202`, og jobben går gjennom det samme løpet som flashcards (AR-4): sidetekst → porten → `validate_item` per kort → forkast og tell → lagre de gyldige i én transaksjon
**Og** modellkortene lagres som `flashcards` med `kind = "model"`, `front`, `points`, `mnemonic`, `file_id`, `page_no` og `formula_flag`, og legges til de som finnes fra før (FR-22)
**Og** pågår det allerede en jobb på forelesningen, svarer API-et `409 JOB_ALREADY_RUNNING` (gjenbruker epic 3)

**Gitt** `LLM_PROVIDER=mock` og en fil der én side har en linje fulgt av tre eller flere linjer etter hverandre som begynner med kulepunkt eller nummer
**Når** modellkort lages
**Så** lager `MockGenerator` ett modellkort per slik liste: forsiden er «Forklar [linja rett over lista].», punktene er listelinjene uten kulepunkt eller nummer, i samme rekkefølge, og kilden er siden lista står på (NFR-2a)
**Og** huskeregelen er forbokstaven i hvert punkt satt sammen med store bokstaver, i notatenes rekkefølge (FR-43)
**Og** samme fil gir samme modellkort hver gang (NFR-2)

**Gitt** et modellkort der alle punktene begynner på samme bokstav (som de fire P-ene)
**Når** det kontrolleres før lagring
**Så** lagres det med tom `mnemonic`, uten huskeregel (FR-44, SK-10)

**Gitt** et generert modellkort der punktene har ulike forbokstaver
**Når** `validate_item` kontrollerer det
**Så** forkastes og telles det hvis bokstavene i huskeregelen (bare bokstaver, uten hensyn til store og små, æ/ø/å regnes som bokstaver) ikke er nøyaktig forbokstavene i punktene i samme rekkefølge, eller hvis huskeregelen mangler (FR-45, SK-10)
**Og** det forkastes og telles også hvis forsiden er tom, det har færre enn tre punkter, et punkt er tomt, eller siden ikke finnes i fila (FR-38)
**Og** en test med `LLM_PROVIDER=mock-invalid` viser at ugyldige modellkort forkastes og at de gyldige lagres (SK-4)

**Gitt** at en modellkortjobb er ferdig uten at noe modellkort ble lagret
**Når** forelesningssiden eller ferdigmeldingen viser resultatet
**Så** står det ordrett «Vi fant ingen modeller eller lister i denne forelesningen.» i et levende område (FR-47, UX-DR42, UX-DR44)
**Og** meldingen er ikke en feil: jobben har status `done`, og det er ingen «Prøv igjen»-knapp

**Gitt** at kallet til modellen feiler eller tar over 3 minutter
**Når** jobben avsluttes
**Så** lagres ingen modellkort, og job-status viser «Vi klarte ikke å lage modellkortene. Ingenting er lagret. Prøv igjen.» med «Prøv igjen» (FR-21, gjenbruker `job-status`)

**Gitt** at forelesningen har minst én fil
**Når** studenten ser Flashcards-raden i «Lag og øv»
**Så** står tekstknappen «Lag modellkort» der både med og uten flashcards, og den starter jobben direkte uten dialog (UX-DR18, UX-DR24)
**Og** mens jobben går, viser `job-status` «Lager modellkort …» og «Du kan bruke resten av appen imens.», og de andre «Lag …»-knappene er ikke aktive og sier «Venter til modellkortene er ferdige» (UX-DR19)
**Og** uten filer er knappen ikke aktiv (UX-DR18)
**Og** det finnes ingen egen Huskeregler-rad; antallet på Flashcards-raden teller modellkortene med (FR-42)

**Gitt** at innholdstypen er meldt inn i delete-preview-registeret fra epic 2
**Når** studenten vil slette eller erstatte en fil, en forelesning eller et emne med modellkort
**Så** teller `GET …/delete-preview` modellkort for seg og flashcards uten modellkort for seg, og slettebekreftelsen viser for eksempel «Dette sletter også 18 flashcards, 11 quizspørsmål og 2 modellkort laget fra fila. Det kan ikke angres.» (FR-12, UX-DR22)
**Og** modellkortene slettes med fila gjennom `ON DELETE CASCADE` (AR-7)

**Gitt** `LLM_PROVIDER=vertex`
**Når** `VertexGenerator` får `kind = "models"`
**Så** bruker den en egen instruks for modellkort, lagt der epic 6 har lagt instruksene for de andre typene, som sier: bruk bare stoffet på sidene; finn modeller og lister (for eksempel AIDA); skriv forsiden som «Forklar …»; ta med punktene i den rekkefølgen de står i notatene; lag huskeregelen av forbokstaven i hvert punkt; gi ingen huskeregel når alle punktene har samme forbokstav; oppgi PDF-sidenummeret der modellen står; skriv på norsk bokmål og bruk fagbegrepene fra notatene, med engelsk i parentes når notatene bruker begge (FR-2, FR-39, FR-42–FR-44)
**Og** svaret har et løst output-skjema for modellkort, og en test (uten kall til Google) sjekker at instruksen og skjemaet finnes for `models`

**Gitt** `APP_ENV=local`, tom database og `FEATURE_MNEMONICS` på
**Når** `seed_if_empty` kjører
**Så** lager den modellkort for minst én forelesning i eksempelemnet gjennom de vanlige tjenestene med mock-modellen, og eksempelnotatene har minst én liste med ulike forbokstaver og én der alle begynner på samme bokstav (NFR-3, AR-14)

**Gitt** `FEATURE_MNEMONICS=false`
**Når** studenten åpner forelesningssiden eller kaller API-et
**Så** vises ikke «Lag modellkort», og `POST /api/lectures/{id}/jobs` med `kind: "models"` svarer `404 FEATURE_DISABLED` (AR-11)
**Og** seed lager ikke modellkort

**Gitt** de nye testene
**Når** de kjøres med `uv run pytest`, `npm run test` og `npx playwright test`
**Så** har de krav-ID i navnet (`test_fr43_…`, `test_fr45_…`, `test_fr47_…`, AR-17)
**Og** forelesningssiden har ingen axe-brudd, og «Lag modellkort» kan brukes med bare tastatur
**Og** README sin liste over brytere forklarer `FEATURE_MNEMONICS`

### Story 7.2: Øv på modellkort og endre huskeregelen

Som student,
vil jeg møte modellkortene i flashcard-økten og kunne bytte ut huskeregelen med min egen,
slik at jeg øver på modellene sammen med de andre kortene og husker dem på min måte.

**Krav:** FR-42, FR-46, FR-23–FR-27 (for modellkort), FR-56 (modellkort), NFR-8, NFR-10, AR-4, AR-11, AR-17, UX-DR20, UX-DR21, UX-DR25, UX-DR27, UX-DR28, UX-DR45

**Akseptkriterier:**

**Gitt** en forelesning eller et emne med flashcards og modellkort
**Når** studenten starter flashcard-økten med «Øv nå» eller fra «Øv på hele emnet»
**Så** kommer modellkortene blandet med de andre kortene i tilfeldig rekkefølge (FR-23, gjenbruker øktrammen fra epic 3)
**Og** forsiden viser SPØRSMÅL med «Forklar …», og baksiden vises først når kortet snus med Mellomrom, klikk eller knapp (FR-24)

**Gitt** at et modellkort er snudd
**Når** studenten ser baksiden
**Så** viser `model-card` punktene som rader med en bokstavboks foran hvert, bundet sammen av en tynn loddrett linje, huskeregelen på merknadsflaten med «Huskeregel:», og kilden (UX-DR28, UX-DR20, gjenbruker `note-surface` og kildelenken)
**Og** punktene er en ordnet liste for skjermleser, og bokstavboksene er skjult for skjermleser slik at hvert punkt leses én gang (UX-DR45)
**Og** har kortet formelmerke, vises det som på andre kort (gjenbruker `formula-flag` fra epic 6)

**Gitt** et modellkort uten huskeregel (FR-44)
**Når** det er snudd
**Så** vises bare punktene, og knappen heter «Legg til huskeregel» i stedet for «Endre huskeregel» (FR-46, UX-DR28)

**Gitt** at et modellkort er snudd
**Når** studenten markerer «Kunne» eller «Kunne ikke» (med knapp eller `2`/`1`)
**Så** behandles det som et vanlig flashcard: «Kunne ikke»-kort kommer igjen bakerst, og økten lagres som `kind = "flashcards"` med modellkortene talt i `shown`, `correct` og `wrong` (FR-25, FR-56)
**Og** det finnes ikke noe eget resultat for modellkort; de telles med i flashcard-resultatet (EXPERIENCE.md)

**Gitt** at studenten trykker «Endre huskeregel» eller «Legg til huskeregel»
**Når** dialogen åpnes
**Så** har den feltet «Huskeregel» med synlig etikett, utfylt med dagens huskeregel om den finnes, og knappene «Avbryt» og «Lagre» (UX-DR21, UX-DR25, gjenbruker dialog og skjemafelt)
**Og** Esc eller «Avbryt» lukker uten endring, og fokus går tilbake til knappen
**Og** hurtigtastene virker ikke mens fokus står i feltet (NFR-8)

**Gitt** at studenten skriver sin egen huskeregel og trykker «Lagre»
**Når** `PATCH /api/flashcards/{id}` får `mnemonic`
**Så** lagres den nye huskeregelen og vises på kortet med en gang (FR-46)
**Og** den kontrolleres ikke mot forbokstavene, bare for tomt felt (AR-4)
**Og** markeringen av kortet i økten endres ikke

**Gitt** at studenten tømmer feltet eller bare skriver mellomrom og trykker «Lagre» `[AVGJØRES: E33]`
**Når** skjemaet sendes
**Så** lagres ingenting, feltet får rød kant og teksten «Skriv inn en huskeregel.» under seg, og fokus flyttes til feltet (UX-DR25)
**Og** API-et avviser tom eller blank `mnemonic` med den samme feilkoden for tomme felt som redigering av kort bruker fra epic 3 (AR-12)

**Gitt** et modellkort under øving
**Når** studenten trykker «Rediger»
**Så** kan hun endre forsiden og punktene (ett punkt per linje) med den samme redigeringen som flashcards fra epic 3, og tomme felt avvises som der (FR-27, FR-42)
**Og** «Slett» på et modellkort sletter det etter slettebekreftelsen, som for andre kort (FR-27, gjenbruker slettebekreftelsen)

**Gitt** `FEATURE_MNEMONICS=false`
**Når** et modellkort som allerede finnes vises i økten
**Så** vises det som modellkort, men uten «Endre huskeregel»/«Legg til huskeregel», og `PATCH` med `mnemonic` svarer `404 FEATURE_DISABLED` (AR-11)

**Gitt** de nye testene
**Når** de kjøres
**Så** har de krav-ID i navnet (`test_fr42_…`, `test_fr46_…`, AR-17)
**Og** flashcard-økten med et modellkort og huskeregeldialogen har ingen axe-brudd, og alt kan gjøres med bare tastatur (snu, markere, endre huskeregel, lagre, avbryte)

### Dekning

| Krav | Story |
|---|---|
| FR-42 | 7.1 (lage), 7.2 (øve og redigere som flashcards) |
| FR-43 | 7.1 |
| FR-44 | 7.1 (lagres uten huskeregel), 7.2 («Legg til huskeregel») |
| FR-45 | 7.1 |
| FR-46 | 7.2 |
| FR-47 | 7.1 |
| NFR-2a (modellkort) | 7.1 |
| UX-DR28 | 7.2 |

## Epic 8: Fritekstspørsmål med selvvurdering (bør ha)

Studenten øver på kortsvar- og langsvarsspørsmål, skriver svaret selv, ser modellsvaret med kilde og vurderer seg selv. Bygges etter epic 7 og kuttes før den (bryter `FEATURE_FREETEXT`).

### Story 8.1: Lag fritekstspørsmål

Som student,
vil jeg lage kortsvar- eller langsvarsspørsmål med modellsvar fra en forelesning,
slik at jeg kan øve på å formulere svar som på eksamen.

**Krav:** FR-2, FR-18, FR-21, FR-22, FR-38, FR-48, FR-49, FR-12, NFR-2a (fritekst), NFR-3, AR-3, AR-4, AR-5, AR-7, AR-11, AR-12, AR-17, UX-DR18, UX-DR19, UX-DR21, UX-DR22, UX-DR24 (fritekst)

**Akseptkriterier:**

**Gitt** at storien er bygd
**Når** Alembic-migreringen kjører
**Så** finnes tabellen `freetext_questions` med `id`, `file_id` (fremmednøkkel med `ON DELETE CASCADE`), `kind` (`short` eller `long`), `question`, `model_answer`, `page_no`, `formula_flag` og `created_at`, på både Postgres og SQLite (AR-7, AR-13, AR-15)
**Og** bare `content` skriver til tabellen (AR-16)

**Gitt** at innholdstypen `freetext` er meldt inn i registeret for innholdstyper fra epic 3
**Når** studenten sender `POST /api/lectures/{id}/jobs` med `kind: "freetext"` og `params` med type (`short`/`long`) og omfang (5, 10 eller 15)
**Så** svarer API-et `202`, `requested` er omfanget, og jobben går gjennom det samme løpet (AR-4, AR-5)
**Og** nye spørsmål legges til de som finnes fra før (FR-22)
**Og** ugyldig type eller omfang avvises med feilkode (AR-12)

**Gitt** `LLM_PROVIDER=mock`
**Når** fritekstspørsmål lages
**Så** lager `MockGenerator` ett spørsmål «Forklar [begrep].» per definisjonssetning, med hele definisjonssetningen som modellsvar og siden som kilde, inntil valgt omfang (NFR-2a)
**Og** spørsmålene får typen studenten valgte
**Og** samme fil gir samme spørsmål hver gang (NFR-2)

**Gitt** et generert fritekstspørsmål
**Når** `validate_item` kontrollerer det
**Så** forkastes og telles det hvis spørsmålet eller modellsvaret er tomt, eller siden ikke finnes i fila (FR-38, FR-49)
**Og** en test med `mock-invalid` viser at ugyldige spørsmål forkastes og telles (SK-4)

**Gitt** at færre enn valgt omfang ble lagret
**Når** jobben er ferdig
**Så** vises meldingen for «færre enn valgt» fra epic 3, for eksempel «Det ble laget 3 av inntil 5 spørsmål. Notatene ga ikke grunnlag for flere.» (FR-18, gjenbruker meldingen)

**Gitt** at kallet feiler eller tar over 3 minutter
**Når** jobben avsluttes
**Så** lagres ingenting, antallet er uendret, og `job-status` viser «Vi klarte ikke å lage fritekstspørsmålene. Ingenting er lagret. Prøv igjen.» med «Prøv igjen» (FR-21, SK-8)

**Gitt** en forelesning med filer
**Når** studenten ser «Lag og øv»
**Så** har den raden «Fritekstspørsmål»: uten spørsmål «Ingen ennå» og omrissknappen «Lag fritekstspørsmål»; med spørsmål antallet («10 spørsmål»), «Øv nå» og «+ Lag flere» (UX-DR18, gjenbruker `create-row`)
**Og** mens jobben går, viser `job-status` «Lager fritekstspørsmål …» og «Du kan bruke resten av appen imens.», og andre «Lag …»-knapper sier «Venter til fritekstspørsmålene er ferdige» (UX-DR19)
**Og** «Øv nå» peker til fritekst-økten, som kommer i story 8.2; til da er den ikke synlig

**Gitt** at studenten trykker «Lag fritekstspørsmål» eller «+ Lag flere»
**Når** dialogen åpnes
**Så** velger hun type (Kortsvar eller Langsvar) og omfang som tre valgkort (Rask 5, Vanlig 10, Dyp 15), uten vanskelighetsgrad, og «Kortsvar» og «Vanlig» er forhåndsvalgt (UX-DR24, gjenbruker dialogen fra Lag quiz)
**Og** piltaster flytter valget, Esc lukker uten endring, og knappene er «Avbryt» og hovedhandlingen (UX-DR21)

**Gitt** at innholdstypen er meldt inn i delete-preview-registeret
**Når** studenten vil slette eller erstatte en fil, forelesning eller et emne med fritekstspørsmål
**Så** tar slettebekreftelsen med antallet fritekstspørsmål, for eksempel «… og 10 fritekstspørsmål laget fra fila. Det kan ikke angres.» (FR-12, UX-DR22)
**Og** spørsmålene slettes med fila (AR-7)

**Gitt** `LLM_PROVIDER=vertex`
**Når** `VertexGenerator` får `kind = "freetext"`
**Så** bruker den en egen instruks for fritekst som sier: bruk bare stoffet på sidene; lag inntil valgt antall spørsmål av valgt type, der kortsvar kan besvares med noen få setninger og langsvar krever forklaring av sammenhenger eller et eksempel, som på eksamen; ikke lag spørsmål om modeller og lister (de øves med modellkort); skriv et modellsvar bygd på notatene; oppgi PDF-sidenummeret; norsk bokmål med fagbegrepene fra notatene og engelsk i parentes når notatene bruker begge (FR-2, FR-39, FR-48, FR-49)
**Og** en test (uten kall til Google) sjekker at instruksen og det løse output-skjemaet finnes for `freetext`

**Gitt** `APP_ENV=local`, tom database og `FEATURE_FREETEXT` på
**Når** `seed_if_empty` kjører
**Så** lager den fritekstspørsmål for minst én forelesning i eksempelemnet gjennom de vanlige tjenestene med mock-modellen (NFR-3, AR-14)

**Gitt** `FEATURE_FREETEXT=false`
**Når** studenten åpner forelesningssiden eller kaller API-et
**Så** vises ikke Fritekstspørsmål-raden, jobb med `kind: "freetext"` og alle fritekst-rutene svarer `404 FEATURE_DISABLED`, og seed lager ikke fritekstspørsmål (AR-11)

**Gitt** de nye testene
**Når** de kjøres
**Så** har de krav-ID i navnet (`test_fr48_…`, `test_fr49_…`, AR-17)
**Og** forelesningssiden og dialogen har ingen axe-brudd, og alt kan gjøres med bare tastatur
**Og** README sin liste over brytere forklarer `FEATURE_FREETEXT`

### Story 8.2: Øv på fritekst og vurder deg selv

Som student,
vil jeg skrive svaret mitt, se modellsvaret og vurdere meg selv som Feil, Delvis riktig eller Riktig,
slik at jeg øver som på eksamen og ser hvor jeg står.

**Krav:** FR-50, FR-51, FR-56 (fritekst), NFR-8, NFR-10, NFR-12, AR-9, AR-11, AR-15, AR-17, UX-DR8, UX-DR9, UX-DR30, UX-DR31, UX-DR32, UX-DR33, UX-DR34 (fritekst), UX-DR35 (fritekst), UX-DR44

**Akseptkriterier:**

**Gitt** en forelesning med fritekstspørsmål
**Når** studenten trykker «Øv nå» på Fritekstspørsmål-raden
**Så** åpnes fritekst-økten (12) i øktrammen fra epic 3, med øktpanelet (type «Fritekst», omfang, teller «2 / 10», fremdriftsstolpe, tellinger for Riktig, Delvis riktig og Feil, svarrutenett og «Avslutt økt») og innholdet sentrert i 832 px (UX-DR5, UX-DR8, gjenbruker øktrammen)
**Og** spørsmålene hentes med `GET /api/lectures/{id}/freetext-questions` og vises én gang hver i tilfeldig rekkefølge (FR-50)

**Gitt** et spørsmål i økten
**Når** det vises
**Så** står «SPØRSMÅL 2 AV 10», spørsmålet og tekstfeltet med synlig etikett «Ditt svar», mens modellsvar og selvvurdering er skjult (FR-50, UX-DR30)
**Og** fokus står i tekstfeltet

**Gitt** at tekstfeltet er tomt eller bare har mellomrom og linjeskift `[AVGJØRES: E28]`
**Når** studenten ser knappen «Vis modellsvar»
**Så** er den ikke aktiv; den blir aktiv først når feltet har minst ett tegn som ikke er mellomrom (FR-50)

**Gitt** at studenten har skrevet et svar og trykker «Vis modellsvar»
**Når** modellsvaret vises
**Så** låses tekstfeltet, og «Levert · N ord» står ved etiketten (N er antall ord skilt med mellomrom) (UX-DR30)
**Og** modellsvaret vises i `model-answer` med overskriften «Modellsvar», teksten, kilden og forelesningen (FR-49, gjenbruker kildelenken), og formelmerket når spørsmålet har det
**Og** selvvurderingen «Hvordan gikk det?» vises med tre like omrissknapper Feil, Delvis riktig og Riktig, uten forhåndsvalg (FR-51, UX-DR30)

**Gitt** at modellsvaret nettopp er vist `[AVGJØRES: A8]`
**Når** fokus flyttes
**Så** flyttes det til overskriften «Modellsvar» (med `tabindex="-1"`), slik at skjermleseren leser modellsvaret og neste Tab går til selvvurderingen; fokus legges ikke på en av vurderingsknappene, så appen ikke dytter mot et svar (UX-DR31)

**Gitt** at modellsvaret ikke er vist ennå `[AVGJØRES: E27]`
**Når** studenten trykker `1`, `2` eller `3`
**Så** skjer ingenting; tastene virker bare når selvvurderingen er synlig
**Og** de virker aldri mens fokus står i et tekstfelt, så hun kan skrive tall i svaret sitt (NFR-8, UX-DR32)

**Gitt** at selvvurderingen er synlig
**Når** studenten velger Feil, Delvis riktig eller Riktig med knapp eller `1`/`2`/`3`
**Så** får ruta i svarrutenettet ✗, ◐ eller ✓ og leses som for eksempel «Spørsmål 2: delvis riktig», tellingen i øktpanelet øker, og økten går videre til neste spørsmål med fokus i «Ditt svar» (UX-DR9, NFR-10)
**Og** studentens svar sendes aldri til serveren og lagres ikke (FR-51)

**Gitt** at alle spørsmålene er vurdert
**Når** økten er ferdig
**Så** viser `result-summary` tre tall: «Riktig», «Delvis riktig» og «Feil», og øktpanelet viser «✓ Økten er ferdig og lagret» i et levende område (FR-51, UX-DR34, UX-DR44)
**Og** `missed-list` viser spørsmålene hun vurderte som Feil eller Delvis riktig, med nummer, spørsmål, modellsvar og kilde, uten hennes eget svar (UX-DR35)
**Og** hovedknappen starter samme økt på nytt (Enter), og tilbakevalget går til forelesningen (Esc) (UX-DR32, UX-DR34)

**Gitt** at minst ett spørsmål er vurdert
**Når** økten er ferdig, studenten velger «Avslutt økt» eller Esc, går til en annen side, logger ut eller lukker fanen
**Så** sendes resultatet én gang til `POST /api/practice-sessions` med `kind = "freetext"`, `shown`, `answered`, `correct`, `partial`, `wrong` og `aborted` (FR-56, AR-9, gjenbruker lagringen fra epic 3)
**Og** ved «Avslutt økt» vises resultatet som avbrutt, for eksempel «Avbrutt etter 4 av 10» (UX-DR33)
**Og** er ingenting vurdert, lagres ingenting, og studenten går rett tilbake uten resultatside (UX-DR33)

**Gitt** `FEATURE_FREETEXT=false`
**Når** studenten åpner fritekst-økten eller kaller `GET …/freetext-questions`
**Så** svarer API-et `404 FEATURE_DISABLED`, og «Øv nå» på raden vises ikke (AR-11)

**Gitt** de nye testene
**Når** de kjøres
**Så** har de krav-ID i navnet (`test_fr50_…`, `test_fr51_…`, `test_fr56_freetext_…`, AR-17)
**Og** fritekst-økten og resultatsiden har ingen axe-brudd, og hele økten kan gjennomføres med bare tastatur

### Story 8.3: Fritekst for hele emnet, og slett dårlige spørsmål

Som student,
vil jeg øve på fritekstspørsmål fra hele emnet og slette spørsmål som er dårlige,
slik at jeg kan repetere alt før eksamen og bare øve på spørsmål jeg stoler på.

**Krav:** FR-50, FR-52, FR-56 (fritekst, hele emnet), NFR-8, AR-2, AR-9, AR-11, AR-17, UX-DR14 (fritekst), UX-DR22

**Akseptkriterier:**

**Gitt** et emne der minst én forelesning har fritekstspørsmål
**Når** studenten åpner emnesiden
**Så** har kortet «Øv på hele emnet» raden «Fritekstspørsmål» med antallet («10 spørsmål») og «Start ›» (UX-DR14, gjenbruker `practice-all-card`)
**Og** har emnet ingen fritekstspørsmål, vises ikke raden

**Gitt** at studenten trykker «Start ›» på Fritekstspørsmål-raden
**Når** økten starter
**Så** hentes spørsmålene fra alle forelesningene i emnet med `GET /api/subjects/{id}/freetext-questions`, i tilfeldig rekkefølge, og øktpanelet viser «[emne], hele emnet» (FR-50)
**Og** økten lagres med tom `lecture_id` (hele emnet), og tilbakevalget på resultatsiden går til emnesiden (AR-9, UX-DR34)

**Gitt** en annen students emne eller forelesning
**Når** studenten kaller rutene for fritekstspørsmål
**Så** svarer API-et `404 NOT_FOUND` (AR-2)

**Gitt** et spørsmål under fritekst-økten
**Når** studenten trykker «Slett» i bunnfeltet ved kilden
**Så** åpnes slettebekreftelsen med «Avbryt» som startfokus, og «Avbryt» eller Esc sletter ingenting (FR-52, UX-DR22, gjenbruker slettebekreftelsen)
**Og** bekrefter hun, slettes spørsmålet med `DELETE /api/freetext-questions/{id}` (`204`), og økten går videre til neste spørsmål uten at det slettede telles som vurdert

**Gitt** `FEATURE_FREETEXT=false`
**Når** studenten åpner emnesiden eller kaller rutene
**Så** vises ikke Fritekstspørsmål-raden, og `GET /api/subjects/{id}/freetext-questions` og `DELETE /api/freetext-questions/{id}` svarer `404 FEATURE_DISABLED` (AR-11)

**Gitt** de nye testene
**Når** de kjøres
**Så** har de krav-ID i navnet (`test_fr50_subject_…`, `test_fr52_…`, AR-17)
**Og** emnesiden og slettebekreftelsen har ingen axe-brudd, og «Start ›» og sletting kan gjøres med bare tastatur

### Dekning

| Krav | Story |
|---|---|
| FR-48 | 8.1 |
| FR-49 | 8.1 (lagres med kilde), 8.2 (vises med kilde) |
| FR-50 | 8.2 (én forelesning), 8.3 (hele emnet) |
| FR-51 | 8.2 |
| FR-52 | 8.3 |
| FR-56 (fritekst) | 8.2, 8.3 |
| NFR-2a (fritekst) | 8.1 |
| UX-DR14 (fritekst) | 8.3 |
| UX-DR24 (fritekst) | 8.1 |
| UX-DR30 | 8.2 |
| UX-DR35 (fritekst, ført opp i oppdraget) | 8.2 |

## Epic 9: Sammendrag (bør ha)

Studenten leser et sammendrag av forelesningen med kilde på hvert punkt, og kan lage et nytt som erstatter det gamle. Bygges sist og kuttes først (bryter `FEATURE_SUMMARY`).

### Story 9.1: Lag sammendrag av en forelesning

Som student,
vil jeg trykke «Lag sammendrag» og få hovedpunktene fra forelesningen ordnet etter tema, med kilde,
slik at jeg kan repetere forelesningen raskt.

**Krav:** FR-2, FR-21, FR-38, FR-53, FR-54, FR-55, FR-12, FR-13, FR-14, NFR-2a (sammendrag), NFR-3, AR-3, AR-4, AR-5, AR-7, AR-11, AR-12, AR-16, AR-17, UX-DR18, UX-DR19, UX-DR22, UX-DR24 (sammendrag)

**Akseptkriterier:**

**Gitt** at storien er bygd
**Når** Alembic-migreringen kjører
**Så** finnes `summaries` (`id`, `lecture_id` unik med `ON DELETE CASCADE`, `created_at`) og `summary_points` (`id`, `summary_id` med `ON DELETE CASCADE`, `theme`, `position`, `text`, `file_id`, `page_no`, `formula_flag`), på både Postgres og SQLite (AR-7, AR-13)
**Og** en forelesning har høyst ett sammendrag

**Gitt** at innholdstypen `summary` er meldt inn i registeret for innholdstyper fra epic 3
**Når** studenten sender `POST /api/lectures/{id}/jobs` med `kind: "summary"`
**Så** svarer API-et `202`, og jobben går gjennom det samme løpet (AR-4, AR-5)

**Gitt** `LLM_PROVIDER=mock`
**Når** et sammendrag lages
**Så** lager `MockGenerator` ett punkt per side: første setning på siden, med fil og sidetall som kilde, og temaet er filnavnet (NFR-2a)
**Og** samme filer gir samme sammendrag hver gang (NFR-2)

**Gitt** et generert sammendragspunkt
**Når** `validate_item` kontrollerer det
**Så** forkastes og telles det hvis teksten eller temaet er tomt, teksten har over 50 ord, eller siden ikke finnes i fila (FR-38, FR-53)
**Og** er det over 15 gyldige punkter, lagres de 15 første, og resten telles som forkastet (FR-53)

**Gitt** at færre enn 5 punkter består kontrollen
**Når** jobben avsluttes
**Så** feiler den med `error_code = TOO_FEW_SUMMARY_POINTS`, ingenting lagres, og det gamle sammendraget står urørt (AR-4)
**Og** `job-status` viser meldingen for koden fra meldingsfila, med «Prøv igjen» (AR-12)
**Og** en test med en fil med færre enn 5 sider i mock-modus viser dette

**Gitt** at kallet feiler eller tar over 3 minutter
**Når** jobben avsluttes
**Så** lagres ingenting, det gamle sammendraget beholdes, og `job-status` viser «Vi klarte ikke å lage sammendraget. Ingenting er lagret. Prøv igjen.» med «Prøv igjen» (FR-21, SK-8)

**Gitt** at forelesningen har et sammendrag fra før, og et nytt består kontrollen
**Når** det lagres
**Så** slettes det gamle og lagres det nye i én og samme transaksjon, så det aldri finnes to eller et halvt sammendrag (FR-55, AR-4)

**Gitt** en forelesning med filer
**Når** studenten ser «Lag og øv»
**Så** har den raden «Sammendrag»: uten sammendrag «Ikke laget» og omrissknappen «Lag sammendrag», som starter jobben direkte uten dialog (UX-DR18, UX-DR24, gjenbruker `create-row`)
**Og** med sammendrag viser raden antallet punkter («7 punkter»); lenken til sammendragssiden kommer i story 9.2
**Og** mens jobben går, viser `job-status` «Lager sammendrag …» og «Du kan bruke resten av appen imens.», og andre «Lag …»-knapper sier «Venter til sammendraget er ferdig» (UX-DR19)
**Og** uten filer er knappen ikke aktiv

**Gitt** at en av forelesningens filer slettes eller erstattes
**Når** `files` sletter fila
**Så** slettes hele sammendraget i den samme transaksjonen, også punktene fra de andre filene, gjennom en funksjon i `content` som `files` kaller (AR-7, AR-16, E15)
**Og** en test viser at det ikke blir liggende et halvt sammendrag igjen
**Og** sletting av forelesningen, emnet eller kontoen sletter sammendraget gjennom kaskaden (FR-14, AR-7)

**Gitt** at innholdstypen er meldt inn i delete-preview-registeret
**Når** studenten vil slette eller erstatte en fil i en forelesning med sammendrag, eller slette forelesningen eller emnet
**Så** gir `GET …/delete-preview` antallet sammendrag, og slettebekreftelsen tar med sammendraget i lista over det som slettes (FR-12, FR-13, FR-14, UX-DR22)

**Gitt** `LLM_PROVIDER=vertex`
**Når** `VertexGenerator` får `kind = "summary"`
**Så** bruker den en egen instruks for sammendrag som sier: bruk bare stoffet på sidene; lag 5 til 15 hovedpunkter ordnet etter tema, med en kort tematittel; hvert punkt høyst 50 ord; oppgi fil og PDF-sidenummer for hvert punkt; norsk bokmål med fagbegrepene fra notatene og engelsk i parentes når notatene bruker begge (FR-2, FR-39, FR-53, FR-54)
**Og** en test (uten kall til Google) sjekker at instruksen og det løse output-skjemaet finnes for `summary`

**Gitt** `APP_ENV=local`, tom database og `FEATURE_SUMMARY` på
**Når** `seed_if_empty` kjører
**Så** lager den et sammendrag for minst én forelesning i eksempelemnet gjennom de vanlige tjenestene med mock-modellen, og den forelesningen har minst 5 sider med tekst (NFR-3, AR-14)

**Gitt** `FEATURE_SUMMARY=false`
**Når** studenten åpner forelesningssiden eller kaller API-et
**Så** vises ikke Sammendrag-raden, jobb med `kind: "summary"` svarer `404 FEATURE_DISABLED`, og seed lager ikke sammendrag (AR-11)

**Gitt** de nye testene
**Når** de kjøres
**Så** har de krav-ID i navnet (`test_fr53_…`, `test_fr55_…`, `test_ar7_summary_…`, AR-17)
**Og** forelesningssiden har ingen axe-brudd, og «Lag sammendrag» kan brukes med bare tastatur
**Og** README sin liste over brytere forklarer `FEATURE_SUMMARY`

### Story 9.2: Les sammendraget og lag et nytt

Som student,
vil jeg lese sammendraget som en artikkel med kilde på hvert punkt, og kunne lage et nytt,
slik at jeg kan repetere forelesningen og stole på hvor punktene kommer fra.

**Krav:** FR-53, FR-54, FR-55, FR-56 (sammendrag er ikke en økt), NFR-12, AR-2, AR-11, AR-15, AR-17, UX-DR5, UX-DR7, UX-DR18, UX-DR19, UX-DR20, UX-DR36, UX-DR38, UX-DR45

**Akseptkriterier:**

**Gitt** en forelesning med sammendrag
**Når** studenten bruker Sammendrag-raden i «Lag og øv»
**Så** åpner raden sammendragssiden (13) for forelesningen (UX-DR18)

**Gitt** at sammendragssiden åpnes
**Når** `GET /api/lectures/{id}/summary` svarer med temaer og punkter
**Så** vises siden med sidemeny (forelesningen valgt), h1 «Sammendrag», undertekst som «7 punkter i 3 temaer · laget 10.11.2026 fra 2 filer», og artikkelkolonnen på 568 px (UX-DR5, UX-DR7, UX-DR38)
**Og** temaene er seksjonstitler (h2), og punktene står under sitt tema i lagret rekkefølge
**Og** hvert punkt viser kilden som tekst, for eksempel «merkevare-notater.pdf, side 4» (FR-54, UX-DR36, gjenbruker kildelenken), og formelmerket når punktet har det
**Og** generert tekst vises som ren tekst (AR-15)

**Gitt** sammendragssiden
**Når** studenten ser innholdskortet til høyre
**Så** står INNHOLD med temaene og antall punkter, KILDER med filene og antall sider, knappen «Lag nytt sammendrag» med teksten «Det nye sammendraget erstatter dette. Det gamle blir ikke lagret.», og merknaden «Sammendraget er laget av en språkmodell. Sjekk viktige punkter mot kilden.» på merknadsflaten (UX-DR20, UX-DR38)

**Gitt** at studenten trykker «Lag nytt sammendrag»
**Når** jobben går
**Så** står det gamle sammendraget på siden til det nye er ferdig, og knappen er byttet med `job-status` («Lager sammendrag …») som leses opp ved start og slutt (FR-55, UX-DR19, UX-DR38)
**Og** når jobben er ferdig, viser siden det nye sammendraget
**Og** feiler jobben, eller gir den `TOO_FEW_SUMMARY_POINTS`, står det gamle sammendraget urørt med feilmeldingen og «Prøv igjen» (AR-4)

**Gitt** at studenten leser sammendraget
**Når** hun forlater siden
**Så** lagres ingen økt, og lesingen gjør ikke forelesningen øvd (FR-56)

**Gitt** en forelesning uten sammendrag, eller en annen students forelesning
**Når** sammendragssiden eller `GET /api/lectures/{id}/summary` åpnes
**Så** svarer API-et `404 NOT_FOUND`, og siden viser «Fant ikke siden» (AR-2, UX-DR41)

**Gitt** `FEATURE_SUMMARY=false`
**Når** studenten åpner sammendragssiden eller kaller `GET …/summary`
**Så** svarer API-et `404 FEATURE_DISABLED`, og siden viser «Fant ikke siden» (AR-11)

**Gitt** de nye testene
**Når** de kjøres
**Så** har de krav-ID i navnet (`test_fr54_…`, `test_fr55_…`, `test_fr56_summary_not_session_…`, AR-17)
**Og** sammendragssiden har ingen axe-brudd, én h1, landemerker og tab-rekkefølge som følger leserekkefølgen, og «Lag nytt sammendrag» kan brukes med bare tastatur (UX-DR45)

### Dekning

| Krav | Story |
|---|---|
| FR-53 | 9.1 (lage og kontrollere), 9.2 (vise) |
| FR-54 | 9.1 (lagres med kilde), 9.2 (vises med kilde) |
| FR-55 | 9.1 (erstatter i én transaksjon), 9.2 («Lag nytt sammendrag», det gamle står til det nye er ferdig) |
| NFR-2a (sammendrag) | 9.1 |
| UX-DR38 | 9.2 |
| AR-4 (`TOO_FEW_SUMMARY_POINTS`) | 9.1, 9.2 |
| AR-7 (sammendraget slettes helt) | 9.1 |

### Spørsmål til Silje

1. **Skisse 04 er utdatert for huskeregler.** Den viser en egen «Huskeregler»-rad med «Øv nå». UX-DR18 og avgjørelsen 12.11 sier at «Lag modellkort» står på Flashcards-raden og at det ikke er noen egen rad. Storiene følger UX-DR18. Stemmer det?
2. **Forsiden på modellkort i mock-modus:** NFR-2a sier ikke hva forsiden skal være. Forslaget er «Forklar [linja rett over lista].», og at en liste bare teller hvis den står på én side. Er det greit?
3. **Minst tre punkter på et modellkort:** Forslaget er at også ekte modell må gi minst tre punkter, likt mock-regelen. Eller skal to punkter være nok?
4. **Modellkort som blir forkastet:** Når noen modellkort lages og noen forkastes, finnes det ikke noe «valgt antall» å sammenligne med. Forslaget er at det ikke vises noen egen melding om forkastede modellkort (bare FR-47 når ingen blir laget). Greit?
5. **Bryteren av med modellkort som finnes:** Forslaget er at modellkort som allerede finnes, fortsatt øves som flashcards, men uten «Endre huskeregel». Greit?
6. **E33, tom huskeregel:** Forslaget avviser tom huskeregel (teksten «Skriv inn en huskeregel.» er ny). Skal studenten i stedet kunne fjerne en huskeregel ved å tømme feltet?
7. **Forhåndsvalg i Lag fritekst:** Forslaget er «Kortsvar» og «Vanlig» forhåndsvalgt, som i Lag quiz. Greit?
8. **Etter selvvurderingen:** Forslaget er at valget av Feil, Delvis riktig eller Riktig går rett videre til neste spørsmål, uten egen «Neste spørsmål»-knapp. Greit?
9. **Mock-temaer i sammendraget:** NFR-2a sier ikke hvilke temaer mock-sammendraget har. Forslaget er ett tema per fil, med filnavnet som tema. Greit?
10. **Over 15 sammendragspunkter:** Forslaget er å beholde de 15 første gyldige og telle resten som forkastet. Greit?
11. **Nye tekster som ikke står i EXPERIENCE.md:** meldingen for `TOO_FEW_SUMMARY_POINTS` (forslag: «Notatene ga ikke grunnlag for et sammendrag med minst 5 punkter. Det gamle sammendraget er beholdt.»), knappen på Sammendrag-raden når sammendraget finnes (forslag: «Les sammendrag»), og hvordan sammendraget nevnes i slettebekreftelsen (forslag: «… og sammendraget av forelesningen»). Godkjenner du ordlyden?
