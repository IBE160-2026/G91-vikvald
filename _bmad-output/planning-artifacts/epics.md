

## Epic 4: Ta quiz

Studenten lager flervalgsquiz med valgt omfang og vanskelighetsgrad, svarer og bekrefter før fasit og forklaring vises, ser poengsum og feilsvar, og kan slette dårlige spørsmål. Plugger seg inn i motorene fra epic 3.

### Story 4.1: Lag quizspørsmål fra en forelesning

Som student,
vil jeg lage quizspørsmål fra en forelesning med valgt omfang og vanskelighetsgrad,
slik at jeg kan teste meg selv på stoffet i notatene mine.

**Krav:** FR-2, FR-28, FR-29, FR-30, FR-31 (bare instruksen), FR-33, FR-38 (quiz), FR-39, NFR-2a (quiz), AR-3, AR-4, AR-5, AR-7, AR-15, AR-17, UX-DR18 (quiz), UX-DR19 (quiz), UX-DR24 (quiz), UX-DR42

**Akseptkriterier:**

**Gitt** at appen starter etter denne storien
**Når** Alembic kjører
**Så** finnes tabellen `quiz_questions` med `id` (UUID), `file_id` (fremmednøkkel med `ON DELETE CASCADE`), `page_no`, `formula_flag`, `question`, `options` (liste med fire tekster), `correct_index` (0–3), `explanation` og `created_at`
**Og** migreringen virker både på Postgres og på SQLite i minnet (AR-13)

**Gitt** registeret for innholdstyper fra epic 3
**Når** quiz meldes inn med `kind` = `quiz`
**Så** har registeret mock-regel, validator og lagring for quiz, og `POST /api/lectures/{id}/jobs` med `kind` = `quiz` og `params` med omfang (10, 20 eller 30, som flashcards) og `difficulty` (`easy`, `medium` eller `hard`) gir `202`
**Og** ugyldig omfang eller vanskelighetsgrad gir feil i formatet fra `core/errors` (AR-12)
**Og** gjenbruker jobbløpet, `409 JOB_ALREADY_RUNNING`, tidsgrensen på 3 minutter og `GET /api/jobs/active` uten egen kode for quiz

**Gitt** en forelesning der filene har minst fire definisjonssetninger («er»/«is»)
**Når** en quizjobb kjører med `LLM_PROVIDER=mock`
**Så** lager `MockGenerator` ett spørsmål per definisjonssetning: «Hva er [begrep]?», resten av setningen som riktig svar, og definisjonene (resten av setningen) til de tre neste begrepene i forelesningen, i leserekkefølge og med omstart fra begynnelsen, som feilalternativer
**Og** kilden er fila og PDF-sidenummeret der definisjonen står (FR-39)
**Og** forklaringen er hele definisjonssetningen
**Og** mock-modellen bruker samme regel uansett vanskelighetsgrad, og høyst så mange spørsmål som omfanget tillater, valgt på samme måte som flashcards i epic 3
**Og** ved «+ Lag flere» hopper mock-modellen over spørsmål med samme spørsmålstekst som et spørsmål forelesningen har fra før, slik som for flashcards i epic 3, og er det ingen nye, vises meldingen for «ingenting laget»
**Og** samme fil gir de samme spørsmålene hver gang (SK-21)

**Gitt** en forelesning med færre enn fire definisjonssetninger
**Når** en quizjobb kjører i demomodus
**Så** lagres ingen quizspørsmål, jobben ender med `created` = 0
**Og** studenten får meldingen for «færre enn valgt» slik epic 3 viser den for 0 av N (A20/E12), med ordet «spørsmål»

**Gitt** elementer fra modellen
**Når** `validate_item` kontrollerer et quizelement
**Så** forkastes det hvis det ikke har nøyaktig fire alternativer, hvis noen alternativer er tomme eller like (etter at mellomrom og store/små bokstaver er sett bort fra), hvis det riktige ikke er nøyaktig ett av dem, hvis spørsmål eller forklaring er tomt, eller hvis siden ikke finnes i fila
**Og** de forkastede telles i `discarded` og gir meldingen «Det ble laget 12 av inntil 20 spørsmål. Notatene ga ikke grunnlag for flere.» med de faktiske tallene
**Og** `LLM_PROVIDER=mock-invalid` gir ugyldige quizelementer som blir forkastet (SK-4)

**Gitt** gyldige quizspørsmål som skal lagres
**Når** de lagres i én transaksjon
**Så** blandes rekkefølgen på alternativene én gang, med et frø regnet ut fra teksten i spørsmålet og alternativene (for eksempel SHA-256, ikke Pythons `hash()`), og `correct_index` peker på det riktige alternativet etter blandingen
**Og** samme innhold gir alltid samme rekkefølge (AR-4)
**Og** det riktige svaret står ikke på samme plass i alle spørsmål fra testfila (FR-30)
**Og** nye spørsmål legges til de som finnes fra før (FR-33)

**Gitt** at kallet til modellen feiler eller tar over 3 minutter
**Når** quizjobben avsluttes
**Så** lagres ingenting, antallet spørsmål er uendret, og raden viser «Vi klarte ikke å lage quizspørsmålene. Ingenting er lagret. Prøv igjen.» med knappen «Prøv igjen», som starter jobben på nytt med samme valg

**Gitt** at ekte modell kobles på i epic 6
**Når** quiz meldes inn i registeret
**Så** har quiz en egen instruks til modellen på samme sted som flashcards-instruksen fra epic 3: bare stoff fra sidene, norsk bokmål med engelsk fagbegrep i parentes (FR-2), fire alternativer med nøyaktig ett riktig, en forklaring, sidetallet, beskrivelsen av valgt vanskelighetsgrad fra FR-28, og at alternativene er omtrent like lange og troverdige (FR-31)
**Og** en enhetstest sjekker at instruksen tar med riktig beskrivelse for hver vanskelighetsgrad
**Og** FR-31 måles ikke her, men i SK-15 i epic 6

**Gitt** forelesningssiden med «Lag og øv»
**Når** Quiz-raden vises
**Så** gjenbruker den `create-row`: uten spørsmål «Ingen ennå» og knappen «Lag quiz»; med spørsmål antallet («15 spørsmål»), «Øv nå» og «+ Lag flere»
**Og** uten filer er knappene ikke aktive
**Og** mens quizjobben pågår, viser `job-status` «Lager quizspørsmål …» og «Du kan bruke resten av appen imens.», og de andre «Lag …»-knappene er ikke aktive med forklaringen etter mønsteret fra epic 3 («Venter til quizspørsmålene er ferdige»)
**Og** når en annen jobb pågår, er «Lag quiz» ikke aktiv og forklarer hvorfor

**Gitt** at studenten trykker «Lag quiz» eller «+ Lag flere» på Quiz-raden
**Når** dialogen «Lag quiz» (skisse 06) åpnes
**Så** gjenbruker den dialogen fra `frontend/components/` med bredde 720 px, og viser forelesningen med antall filer og sider («Uke 37: Merkevare · 2 filer, 18 sider»)
**Og** har studenten spørsmål fra før, står «Nye spørsmål legges til de 15 du har fra før.» med det faktiske tallet
**Og** omfang er tre valgkort: «Rask» «Inntil 10 spørsmål», «Vanlig» «Inntil 20 spørsmål», «Dyp» «Inntil 30 spørsmål», og gjenbruker omfangsvalget fra «Lag flashcards» hvis det finnes
**Og** vanskelighetsgrad er tre rader: «Lett» «Kjenne igjen en definisjon», «Middels» «Forstå sammenhenger», «Vanskelig» «Bruke stoffet på et eksempel»
**Og** «Vanlig» og «Middels» er forhåndsvalgt, og piltaster flytter valget innenfor hver gruppe
**Og** under står «Tar vanligvis under to minutter.» og «Du kan bruke resten av appen imens.», og knappene «Avbryt» og «Lag quiz»
**Og** «Lag quiz» starter jobben og lukker dialogen; «Avbryt» og Esc lukker uten at noe startes, og fokus går tilbake til knappen som åpnet dialogen

**Gitt** en fil, forelesning, et emne eller en konto med quizspørsmål
**Når** `delete-preview` hentes
**Så** melder quiz seg inn i telleregisteret i `content`, og tellingen tar med quizspørsmålene
**Og** slettebekreftelsen viser for eksempel «Dette sletter også 18 flashcards, 11 quizspørsmål og 2 modellkort laget fra fila. Det kan ikke angres.»
**Og** quizspørsmålene slettes med kaskade sammen med fila, også ved erstatning (AR-7)

**Gitt** en annen brukers forelesning
**Når** studenten prøver å starte en quizjobb på den
**Så** svarer API-et `404 NOT_FOUND` (FR-4, AR-2)

**Gitt** testene for storien
**Når** `uv run pytest`, `npm run test` og `npx playwright test` kjøres
**Så** har testene krav-ID i navnet, for eksempel `test_fr30_alternativer_blandes_deterministisk` og `test_nfr2a_quiz_krever_fire_definisjoner` (AR-17)
**Og** axe finner ingen brudd på forelesningssiden med Quiz-raden og på dialogen «Lag quiz», og alt i dialogen kan brukes med bare tastatur

### Story 4.2: Ta quiz på en forelesning

Som student,
vil jeg svare på quizspørsmålene fra en forelesning og bekrefte svaret før jeg ser fasit og forklaring,
slik at jeg må tenke selv før jeg får vite svaret.

**Krav:** FR-32, FR-34 (én forelesning), FR-35, FR-56 (quiz), NFR-8 (quiz), NFR-10, NFR-12, AR-9, AR-15, AR-17, UX-DR8, UX-DR9, UX-DR29, UX-DR31, UX-DR32, UX-DR33, UX-DR44

**Akseptkriterier:**

**Gitt** en forelesning med quizspørsmål
**Når** frontend henter dem med `GET /api/lectures/{id}/quiz-questions`
**Så** får den hvert spørsmål med `question`, `options`, `correct_index`, `explanation`, `source: {file_id, file_name, page_no}` og forelesningens navn, i samme stil som flashcards-API-et fra epic 3
**Og** fasiten sendes med, som bestemt i arkitekturen (AR-15), men vises først etter bekreftelse
**Og** en annen brukers forelesning gir `404 NOT_FOUND`

**Gitt** at studenten trykker «Øv nå» på Quiz-raden
**Når** quizøkten (skisse 09) starter
**Så** gjenbruker den øktrammen fra `practice`: øktpanel med «Quiz» og forelesningens navn, teller («4 / 15»), fremdriftsstolpe, «3 riktige · 1 feil», svarrutenett med ✓ og ✗, symbolforklaring («Riktig», «Feil», «Ikke besvart ennå») og «Avslutt økt»
**Og** spørsmålene kommer i tilfeldig rekkefølge, hvert én gang (FR-34)
**Og** alternativene står i rekkefølgen de ble lagret med, med bokstavene A–D

**Gitt** et spørsmål som ikke er bekreftet
**Når** studenten ser det
**Så** vises «SPØRSMÅL 4 AV 15», spørsmålet, fire svaralternativer (`quiz-option`, 62 px) og knappen «Bekreft svar» (se spørsmål 4)
**Og** ingen farge, ingen forklaring og ingen markering av riktig svar finnes i siden (SK-5)
**Og** studenten kan bytte valg så mange ganger hun vil

**Gitt** at studenten har valgt et alternativ
**Når** hun bekrefter
**Så** låses alternativene, og svaret kan ikke endres (FR-35)
**Og** riktig alternativ får grønn tone og «✓ Riktig svar», og et feil valgt alternativ får rød tone og «✗ Ditt svar», med tekst og symbol i tillegg til farge (NFR-10)
**Og** forklaringskortet viser forklaringen, kilden med `source-link` fra `frontend/components/` («merkevare-notater.pdf, side 7») og forelesningen (FR-32)
**Og** et levende område leser opp «Du svarte C. Svaret er bekreftet.» fulgt av «Riktig.» eller «Feil. Riktig svar er B.», uten at fokus flyttes for skjermleseren (UX-DR44)
**Og** fokus flyttes til «Neste spørsmål» (UX-DR31)
**Og** svarrutenettet og «riktige · feil» i øktpanelet oppdateres, og ruten leses som «Spørsmål 4: feil»

**Gitt** at quizøkten vises og hurtigtaster er på
**Når** studenten bruker tastaturet
**Så** velger `A`–`D` (også små bokstaver) tilsvarende alternativ før bekreftelse, Enter bekrefter, Enter etter bekreftelse går til neste spørsmål, og Esc avslutter økten
**Og** `A`–`D` gjør ingenting etter bekreftelse eller mens en dialog er åpen
**Og** hint-linjen viser «A–D velg svar», «Enter bekreft svar» eller «Enter neste spørsmål», og «Esc avslutt», og skjules når hurtigtaster er slått av
**Og** hurtigtastdialogen fra epic 3 viser tastene for quiz
**Og** alt kan også gjøres med Tab, piltaster og Mellomrom uten hurtigtaster (alternativene er en radiogruppe)

**Gitt** at studenten trykker Enter uten å ha valgt et alternativ
**Når** spørsmålet ikke er bekreftet
**Så** skjer ingenting, og «Bekreft svar» er ikke aktiv før et alternativ er valgt *(A7)*

**Gitt** at fokus står på en annen knapp i siden, for eksempel «Slett», «Avslutt økt» eller en knapp i forklaringskortet
**Når** studenten trykker Enter
**Så** gjør Enter bare det den knappen gjør, og hurtigtasten for bekreft/neste utløses ikke i tillegg
**Og** en Enter som holdes inne (gjentatt tastetrykk) bekrefter ikke og går videre i samme trykk *(E26)*

**Gitt** det siste spørsmålet i økten
**Når** svaret er bekreftet
**Så** heter knappen «Se resultatet» i stedet for «Neste spørsmål», og den og Enter går til resultatet

**Gitt** en quizøkt der minst ett spørsmål er bekreftet
**Når** økten er ferdig, studenten velger «Avslutt økt» eller Esc, går til en annen side, logger ut eller lukker fanen
**Så** sendes resultatet én gang til `POST /api/practice-sessions` med lagringen fra epic 3: `kind` = `quiz`, `lecture_id`, `shown`, `answered` (bekreftede svar), `correct`, `wrong` = `answered` − `correct`, `partial` = 0, og `aborted` når økten ikke ble fullført
**Og** et valgt, men ikke bekreftet svar telles ikke som besvart
**Og** uten bekreftede svar lagres ingenting, og «Avslutt økt» går rett tilbake dit økten startet

**Gitt** testene for storien
**Når** de kjøres
**Så** har de krav-ID i navnet, for eksempel `test_fr35_svar_laases_etter_bekreftelse`, `test_sk5_forklaring_skjult_for_bekreftelse` og `test_fr56_quizokt_lagres` (AR-17)
**Og** axe finner ingen brudd på quizsiden før og etter bekreftelse, og hele økten kan tas med bare tastatur med synlig fokus

### Story 4.3: Se poengsum og feilsvar etter quizen

Som student,
vil jeg se hvor mange jeg fikk riktig og hvilke jeg svarte feil på,
slik at jeg vet hva jeg må lese mer på.

**Krav:** FR-36, AR-17, UX-DR8, UX-DR32, UX-DR33, UX-DR34, UX-DR35

**Akseptkriterier:**

**Gitt** at studenten har bekreftet svar på alle spørsmålene
**Når** hun går til resultatet (skisse 10)
**Så** gjenbruker siden resultatsammendraget fra øktrammen med overlinjen «QUIZ FERDIG» og tittelen «11 av 15 riktige»
**Og** øktpanelet er fullt og viser «✓ Økten er ferdig og lagret», som leses opp
**Og** knappene er «Ta quizen igjen» (hovedknapp) og tilbakevalget til der økten startet; Enter tar quizen igjen og Esc går tilbake

**Gitt** at studenten avslutter med «Avslutt økt» eller Esc etter minst ett bekreftet svar
**Når** resultatet vises
**Så** står det som avbrutt («Avbrutt etter 12 av 20»), og poengsummen gjelder de besvarte spørsmålene

**Gitt** at studenten trykker «Ta quizen igjen»
**Når** den nye økten starter
**Så** får den ny `session_id`, henter spørsmålene på nytt og viser dem i ny tilfeldig rekkefølge

**Gitt** at studenten svarte feil på minst ett spørsmål *(Kan kuttes)*
**Når** resultatet vises
**Så** står undertittelen med omfang og antall, for eksempel «Markedsføring, hele emnet · her er de 4 du svarte feil på, med riktig svar og kilde»
**Og** liste over feil (`missed-list`) fra øktrammen viser for hvert feilsvar nummeret i økten, spørsmålet, kilden, «✗ Ditt svar», «✓ Riktig svar» og forklaringen

**Gitt** at studenten svarte riktig på alle *(Kan kuttes, sammen med lista)*
**Når** resultatet vises
**Så** vises ingen tom liste, og undertittelen viser bare omfanget

**Gitt** testene for storien
**Når** de kjøres
**Så** har de krav-ID i navnet, for eksempel `test_fr36_poengsum_vises` og `test_fr36_liste_over_feilsvar` (AR-17)
**Og** axe finner ingen brudd på resultatsiden, med og uten liste, og alt kan brukes med bare tastatur

### Story 4.4: Ta quiz på hele emnet

Som student,
vil jeg ta quiz på spørsmålene fra alle forelesningene i et emne,
slik at jeg kan repetere hele emnet før eksamen.

**Krav:** FR-34 (hele emnet), FR-56 (quiz, hele emnet), AR-9, AR-17, UX-DR14 (quiz)

**Akseptkriterier:**

**Gitt** et emne der minst én forelesning har quizspørsmål
**Når** emnesiden vises
**Så** har kortet «Øv på hele emnet» en Quiz-rad med antallet spørsmål og «Start ›», under flashcards-raden fra epic 3
**Og** emner uten quizspørsmål har ingen Quiz-rad

**Gitt** at studenten trykker «Start ›» på Quiz-raden
**Når** økten starter
**Så** hentes alle emnets spørsmål med `GET /api/subjects/{id}/quiz-questions`, blandet på tvers av forelesninger i tilfeldig rekkefølge
**Og** øktpanelet viser «Quiz» og «Markedsføring, hele emnet»
**Og** forklaringskortet og lista over feil viser hvilken forelesning hvert spørsmål kommer fra
**Og** en annen brukers emne gir `404 NOT_FOUND`

**Gitt** en emneøkt med minst ett bekreftet svar
**Når** den lagres
**Så** sendes `lecture_id` tom, slik at økten teller for hele emnet (AR-9)
**Og** tilbakevalget og Esc på resultatsiden går til emnesiden («Tilbake til emnet»)

**Gitt** testene for storien
**Når** de kjøres
**Så** har de krav-ID i navnet, for eksempel `test_fr34_quiz_hele_emnet` (AR-17)
**Og** axe finner ingen brudd på emnesiden med Quiz-raden og på quizøkten for hele emnet, og alt kan brukes med bare tastatur

### Story 4.5: Slett et dårlig spørsmål under quizen

Som student,
vil jeg slette et quizspørsmål direkte mens jeg tar quizen,
slik at dårlige spørsmål ikke kommer igjen.

**Krav:** FR-37, AR-2, AR-17, UX-DR22, UX-DR29

**Akseptkriterier:**

**Gitt** et quizspørsmål i en økt
**Når** det vises, før og etter bekreftelse
**Så** står «Slett» i bunnfeltet hele tiden, også før svaret er bekreftet, mens kilden vises etter bekreftelse som i skisse 09, og det finnes ingen «Rediger» (spørsmål kan ikke redigeres)

**Gitt** at studenten trykker «Slett»
**Når** bekreftelsen åpnes
**Så** gjenbruker den den felles slettebekreftelsen og teksten for enkeltelementer fra epic 3, med quizspørsmål i stedet for kort
**Og** «Avbryt» har startfokus, og Esc eller «Avbryt» sletter ingenting og gir fokus tilbake til «Slett»
**Og** hurtigtastene `A`–`D` og Enter virker ikke mens dialogen er åpen

**Gitt** at studenten bekrefter slettingen
**Når** `DELETE /api/quiz-questions/{id}` kalles
**Så** svarer API-et `204`, og spørsmålet er borte fra databasen og fra tellingene på forelesningssiden og emnesiden
**Og** en annen brukers spørsmål gir `404 NOT_FOUND`
**Og** sletting mens en jobb pågår på forelesningen følger samme regel som sletting av kort i epic 3

**Gitt** at et spørsmål slettes før det er bekreftet
**Når** økten fortsetter
**Så** fjernes det fra økten etter samme regel som epic 3 bruker for kort (E22): telleren og svarrutenettet får ett spørsmål mindre, og neste spørsmål vises
**Og** var det det siste spørsmålet, avsluttes økten som om den var ferdig (resultat hvis noe er besvart, ellers tilbake dit økten startet)

**Gitt** at et spørsmål slettes etter at svaret er bekreftet
**Når** økten fortsetter
**Så** teller svaret fortsatt i poengsummen og i lista over feil, fordi det allerede er gitt, og økten går til neste spørsmål *(E22)*

**Gitt** testene for storien
**Når** de kjøres
**Så** har de krav-ID i navnet, for eksempel `test_fr37_slett_quizspormaal` og `test_fr37_avbryt_sletter_ingenting` (AR-17)
**Og** axe finner ingen brudd på quizsiden med slettebekreftelsen åpen, og slettingen kan gjøres med bare tastatur

### Dekning

| Krav | Story |
|---|---|
| FR-28 | 4.1 |
| FR-29 | 4.1 |
| FR-30 | 4.1 (blanding ved lagring), 4.2 (vises i lagret rekkefølge) |
| FR-31 | 4.1 (instruksen); måles i SK-15 i epic 6 |
| FR-32 | 4.2 |
| FR-33 | 4.1 |
| FR-34 | 4.2 (én forelesning), 4.4 (hele emnet) |
| FR-35 | 4.2 |
| FR-36 | 4.3 (poengsum; lista som egne *Kan kuttes*-kriterier) |
| FR-37 | 4.5 |
| FR-56 (quiz) | 4.2, 4.4 |
| NFR-2a (quiz) | 4.1 |
| UX-DR14 (quiz) | 4.4 |
| UX-DR24 (quiz) | 4.1 |
| UX-DR29 | 4.2 (alternativer, låsing, forklaringskort), 4.5 («Slett» i bunnfeltet) |

Kanttilfeller: A7 og E26 i 4.2, E22 (quizdelen) i 4.5.

### Avgjort av Silje 2026-11-14

1. Forklaringen i demomodus er hele definisjonssetningen.
2. Knappen på siste spørsmål heter «Se resultatet».
3. Venteteksten i de andre radene er «Venter til quizspørsmålene er ferdige».
4. Knappen for å svare heter «Bekreft svar».
5. Etter bekreftelse leses «Riktig.» eller «Feil. Riktig svar er B.» opp i tillegg.
6. Er alle svarene riktige, vises ingen liste, og undertittelen viser bare omfanget.
7. «Slett» står i bunnfeltet hele tiden, også før svaret er bekreftet.
8. Ved «+ Lag flere» hopper mock-modellen over spørsmål forelesningen har fra før, slik som for flashcards i epic 3.
9. Kanttilfellene A7, E22 og E26 er løst slik kriteriene beskriver.
