---
title: "PRD: Studiekamerat"
status: final
created: 2026-11-09
updated: 2026-11-12
---

# PRD: Studiekamerat

## Sammendrag

Studiekamerat er en norskspråklig webapp som gjør studentens egne forelesningsnotater om til materiale hun kan øve på: flashcards, flervalgsquiz, huskeregler, fritekstspørsmål og sammendrag. Alt viser til kilden i notatene, med fil og side.

**Problemet.** Mange studenter går inn i eksamensperioden med rotete notater fra et helt semester og bruker tiden på å rydde i stoffet i stedet for å repetere. Det er repetisjon og det å teste seg selv som gir læring, ikke å lese det samme om igjen. Studiekamerat følger studenten gjennom semesteret: notatene legges inn per emne og forelesning, slik at hun er klar til å teste seg selv når eksamen nærmer seg.

**For hvem.** En student i høyere utdanning i Norge med et teoritungt emne, som vet at det virker å teste seg selv, men ikke har tid til å lage øvingsmaterialet.

**Hva som skiller Studiekamerat fra verktøy som NotebookLM, Quizlet og Knowt:**
1. **Bygd for semesteret.** Stoffet organiseres per emne og forelesning mens semesteret pågår.
2. **Huskeregler** for modeller og lister som må pugges.
3. **Norsk fra grunnen av**, med norske fagbegreper.
4. **Kilde på alt**, slik at studenten kan oppdage feil i det språkmodellen har laget.

**Rammer.** Soloprosjekt i IBE160 høsten 2026. Appen kjøres lokalt og skal være ferdig 5. desember. Innleveringsfristen er 15. desember 2026. Faglæreren har vurdert prosjektet som enkelt, så kvaliteten skal ligge i gjennomføringen: design, testing, dokumentert prosess og en README som virker.

Grunnlaget er [produktbriefen](../../briefs/brief-G91-vikvald-2026-09-24/brief.md), [faglærers tilbakemelding](../../briefs/brief-G91-vikvald-2026-09-24/tilbakemelding-product-brief.md) og [researchen](../../research/research-temaer.md). Tekniske detaljer som hører hjemme i arkitekturen, står i [addendum.md](addendum.md).

## Brukerreiser

### UJ-1: Klara etter en forelesning

Klara studerer markedsføring og skriver egne notater i forelesningene. Hun gjentar dette hver uke gjennom semesteret.

1. Etter forelesningen åpner Klara Studiekamerat og laster opp notatene sine fra forelesningen i emnet Markedsføring. Mer orker hun ikke akkurat da.
2. Noen dager senere lager hun flashcards og en flervalgsquiz fra forelesningen. Hun svarer før fasiten vises, og ser hva som sitter og hva hun har glemt. Å vente noen dager gir bedre læring enn å øve med en gang.
3. Hun leser sammendraget som er laget ut fra notatene.

### UJ-2: Klara før eksamen

Noen uker før eksamen har Klara lastet opp notater fra alle forelesningene.

1. Hun samler flashcardene og quizspørsmålene fra alle forelesningene i emnet og går gjennom dem.
2. Hun bruker huskeregler for å lære modeller og lister som må pugges.
3. Hun svarer på kortsvars- og langsvarsspørsmål. Etter hvert svar ser hun et modellsvar med kilde, og vurderer selv hvor godt hun svarte.

## Må ha-funksjoner

Funksjon 1–5 og kravene under «Oversikt fram mot eksamen» og «Felles for alt generert innhold» er MVP-en: den minste versjonen av appen som er nyttig å bruke. Krav merket *(Kan kuttes)* går først hvis tiden blir knapp.

### 1. Norsk språk

Gjelder hele appen.

- **FR-1** All tekst i grensesnittet er på norsk bokmål, også feilmeldinger og bekreftelser.
- **FR-2** Alt generert innhold er på norsk bokmål, også når notatene er på engelsk eller blander språkene. Norske fagbegreper som står i notatene, brukes slik de står. Der et fagbegrep også brukes på engelsk i notatene, står det engelske begrepet i parentes, for eksempel «merkevare (brand)».

### 2. Innlogging og egne data

Innlogging trengs fordi studentens materiale lagres.

- **FR-3** Studenten kan opprette en konto med e-postadresse og passord, logge inn og logge ut. E-postadressen bekreftes ikke, og det finnes ingen «glemt passord»-funksjon, fordi begge deler krever en e-posttjeneste med egen konto og nøkkel (se NFR-2).
- **FR-4** En innlogget student ser og kan endre bare sine egne emner, forelesninger, filer og genererte innhold. Forsøk på å åpne andres innhold, for eksempel ved å endre adressen i nettleseren, gir ingen tilgang.
- **FR-5** Studenten kan slette kontoen sin. Før kontoen slettes, får hun en bekreftelse som sier at alle emner, filer og alt generert innhold slettes for godt. Avbryter hun, slettes ingenting. Etter sletting finnes ingen av dataene hennes i appen.

### 3. Emner, forelesninger og opplasting

Studenten organiserer stoffet per emne og forelesning, slik at det er samlet når eksamen nærmer seg (UJ-1, UJ-2).

- **FR-6** Studenten kan opprette, gi nytt navn til og slette emner. Et emne har et navn og en eksamensdato. Eksamensdatoen må fylles ut når emnet opprettes, og kan endres.
- **FR-7** Studenten kan opprette, gi nytt navn til og slette forelesninger i et emne.
- **FR-8** Studenten kan laste opp én eller flere PDF-filer til en forelesning.
- **FR-9** Laster studenten opp en Word-fil eller en annen filtype som ikke støttes, avvises filen med en beskjed om hvilke formater som støttes og hvordan et Word-dokument lagres som PDF.
- **FR-10** Har en PDF ingen lesbar tekst, for eksempel et skannet dokument, får studenten beskjed om det i stedet for tomt eller feil innhold.
- **FR-11** Før studenten laster opp sin første fil, må hun godta en vilkårstekst om at hun er ansvarlig for materialet hun laster opp, og at det skal være egne notater eller materiale hun har rett til å bruke. Vilkårsteksten har også innholdet i NFR-6.
- **FR-12** Studenten kan slette en fil. Før filen slettes, får hun en bekreftelse som sier hvor mye generert innhold (flashcards, quizspørsmål og annet) som slettes sammen med filen. Avbryter hun, slettes ingenting.
- **FR-13** Studenten kan erstatte en fil med en ny. Innhold generert fra den gamle filen slettes etter samme bekreftelse som i FR-12.
- **FR-14** Sletter studenten en forelesning eller et emne, slettes alle filer og alt generert innhold som hører til, etter en bekreftelse som i FR-12.
- **FR-15** En forelesning har et navn og en dato. Datoen er dagens dato som standard og kan endres. Forelesningene i et emne vises sortert etter dato.
- **FR-16** For hver forelesning ser studenten antall filer, hvor mye som er generert, for eksempel antall flashcards og quizspørsmål, og når hun sist øvde (FR-56), slik at hun ser hvilke forelesninger hun ikke har øvd på ennå. *(Kan kuttes.)*

### 4. Flashcards

Studenten tester seg selv på stoffet fra én forelesning (UJ-1) eller hele emnet (UJ-2), og ser hva hun har glemt.

*Lage kort*
- **FR-17** Studenten kan lage flashcards fra en forelesning, og velger omfang: rask gjennomgang (inntil 10 kort), vanlig gjennomgang (inntil 20) eller dyp gjennomgang (inntil 30). *(Kan kuttes: da lages inntil 20 kort uten valg.)*
- **FR-18** Kortene lages bare fra stoffet i forelesningens filer. Gir stoffet grunnlag for færre kort enn valgt, lages færre, og studenten får beskjed om det.
- **FR-19** Det finnes to typer kort: spørsmål med svar, og begrepskort med begrepet på forsiden og forklaringen på baksiden.
- **FR-20** Hvert kort viser kilden: filnavn og sidetall (se FR-39).
- **FR-21** Mens kortene lages, ser studenten at appen jobber. Feiler kallet, eller er innholdet ikke ferdig etter 3 minutter, vises «Vi klarte ikke å lage [flashcardene/quizspørsmålene/…]. Ingenting er lagret. Prøv igjen.» med knappen «Prøv igjen». Antall kort og spørsmål i forelesningen er uendret.
- **FR-22** Lager studenten kort fra en forelesning som allerede har kort, legges de nye til de eksisterende.

*Øve*
- **FR-23** Studenten kan øve på kortene fra én forelesning eller fra alle forelesningene i et emne. Kortene vises i tilfeldig rekkefølge.
- **FR-24** Forsiden vises først. Baksiden vises først når studenten velger å snu kortet.
- **FR-25** Etter at kortet er snudd, markerer studenten «Kunne» eller «Kunne ikke». Kort markert «Kunne ikke» legges bakerst og vises igjen når alle de andre kortene er vist én gang, til hun har markert dem «Kunne» eller avslutter økten. Markeringene for enkeltkort lagres ikke mellom øktene; bare resultatet av økten lagres (FR-56).
- **FR-26** Når økten er ferdig, ser studenten hvor mange kort hun kunne og ikke kunne. *(Kan kuttes.)*

*Rette opp*
- **FR-27** Studenten kan redigere og slette enkeltkort hun selv har laget, direkte fra kortet mens hun øver. Sletting krever bekreftelse.

### 5. Flervalgsquiz

Quizen lages og brukes på samme måte som flashcardene, men studenten velger blant fire svaralternativer og får en forklaring etterpå.

*Lage quiz*
- **FR-28** Studenten kan lage quizspørsmål fra en forelesning. Hun velger omfang som for flashcards (inntil 10, 20 eller 30 spørsmål) og vanskelighetsgrad:
  - *Lett:* kjenne igjen en definisjon.
  - *Middels:* forstå sammenhenger mellom begreper.
  - *Vanskelig:* bruke stoffet på et eksempel.
- **FR-29** Spørsmålene lages bare fra stoffet i forelesningens filer, med samme regel som i FR-18 når det er for lite stoff, og samme håndtering av venting og feil som i FR-21.
- **FR-30** Hvert spørsmål har fire svaralternativer, der nøyaktig ett er riktig. Plasseringen av det riktige svaret varierer.
- **FR-31** Alternativene er omtrent like lange, og feilalternativene er troverdige for en som ikke kan stoffet. Det riktige svaret skal ikke kunne gjettes fordi det er det lengste eller det eneste som høres riktig ut. Måles i SK-15.
- **FR-32** Hvert spørsmål viser kilden: filnavn og sidetall (se FR-39).
- **FR-33** Lager studenten spørsmål fra en forelesning som allerede har spørsmål, legges de nye til de eksisterende.

*Ta quizen*
- **FR-34** Studenten kan ta quiz på spørsmålene fra én forelesning eller fra alle forelesningene i et emne. Spørsmålene vises i tilfeldig rekkefølge.
- **FR-35** Studenten velger ett alternativ og bekrefter svaret. Først da vises riktig svar og en forklaring. Svaret kan ikke endres etterpå.
- **FR-36** Når quizen er ferdig, ser studenten poengsummen og en liste over spørsmålene hun svarte feil på, med riktig svar, forklaring og kilde. *(Listen kan kuttes; poengsummen beholdes.)*

*Rette opp*
- **FR-37** Studenten kan slette enkeltspørsmål hun selv har laget, direkte fra spørsmålet mens hun tar quizen. Sletting krever bekreftelse. Spørsmål kan ikke redigeres; et dårlig spørsmål slettes, og hun kan lage nye.

### Felles for alt generert innhold

Gjelder flashcards, quiz og bør ha-funksjonene.

- **FR-38** Appen kontrollerer alt språkmodellen lager før det lagres: sidetallet i kilden finnes i filen, et quizspørsmål har nøyaktig fire alternativer der ett er riktig, og ingen påkrevde felt er tomme. Det som ikke består kontrollen, forkastes og regnes med i beskjeden om at det ble laget færre enn valgt (FR-18).
- **FR-39** Sidetall i kilder er sidenummeret i PDF-filen, telt fra første side i filen, ikke sidetallet som eventuelt er trykt på siden.
- **FR-40** Sider der teksten fra PDF-en mangler formler, sendes også som bilde til språkmodellen, slik at formlene kommer med. Det er bedre å sende en side for mye som bilde enn en for lite. Regelen kontrolleres på kjente testsider der formlene er tegnet som grafikk (*Principles of Economics 3e*, PDF-side 127–128). *(Kan kuttes.)*
- **FR-41** Innhold laget fra en side som er sendt som bilde, er merket «Inneholder formel – sjekk mot kilden». Det samme gjelder når språkmodellen melder at noe ser ut til å mangle på siden. *(Kan kuttes sammen med FR-40.)*

**Konfidensnivå.** Faglæreren ba om en beslutning om konfidensnivå, det vil si hvordan appen håndterer at språkmodellen kan ta feil. Appen viser ikke språkmodellens egen vurdering av hvor sikker den er, fordi språkmodeller ikke vurderer sin egen sikkerhet pålitelig. I stedet bygger appen på kontroller som faktisk kan sjekkes: innholdet lages bare fra notatene (FR-18, FR-29), alt kontrolleres før lagring (FR-38), alt viser kilde (FR-20, FR-32), innhold fra sider med formler er merket (FR-41), og studenten kan slette det som er feil (FR-27, FR-37). Hvor godt dette virker, måles med stikkprøvene i SK-13 til SK-17.

### Oversikt fram mot eksamen

Studenten ser hvor hun står i semesteret og hva hun bør øve på (UJ-2). Lagt til etter UX-arbeidet, se «Endringer etter UX-arbeidet».

- **FR-56** En økt starter når studenten begynner å øve, og avsluttes når hun er ferdig, velger «Avslutt» eller forlater siden. Økten lagres bare hvis minst ett kort er markert eller ett spørsmål besvart. Da lagres dato, type, omfang (én forelesning eller hele emnet), om økten ble avbrutt, og resultatet:

  | Type | Resultat |
  |---|---|
  | Flashcards, også modellkort | antall kort vist, antall «Kunne» og «Kunne ikke». Første markering på hvert kort teller. |
  | Quiz | antall besvart og antall riktige |
  | Fritekst | antall besvart og antall «Riktig», «Delvis riktig» og «Feil» |

  *Eksempel:* Avslutter studenten en flashcardøkt etter 12 av 20 kort, og hun markerte 9 som «Kunne» første gang, lagres: flashcards, én forelesning, avbrutt, vist 12, kunne 9, kunne ikke 3. Enkeltsvar lagres ikke. Å lese et sammendrag er ikke en økt. En forelesning regnes som øvd når den har minst én lagret økt.
- **FR-57** Emnesiden viser forelesningene på en semesterlinje etter dato, fra første forelesning til eksamen, med øvd og ikke øvd, dagens dato og hvor mange uker det er til eksamen. Forsiden viser det samme for alle emnene. *(Kan kuttes: da vises samme informasjon som tekst, for eksempel «Eksamen 04.12, om 3 uker · 4 av 8 forelesninger øvd».)*
- **FR-58** Forsiden viser «Neste å øve på» for hvert emne: den eldste forelesningen som har innhold, men ikke er øvd. Er alle øvd, vises den som ble øvd lengst siden. *(Kan kuttes.)*

## Bør ha-funksjoner

Bygges i denne rekkefølgen, og bare når må ha-funksjonene virker og er stabile. Det som står sist, kuttes først.

### 6. Huskeregler

Studenten bruker huskeregler for å lære modeller og lister som må pugges (UJ-2).

- **FR-42** Studenten kan be om huskeregler for en forelesning. Appen finner modeller og lister i notatene, for eksempel AIDA-modellen, og lager et modellkort for hver: forsiden ber studenten forklare modellen, og baksiden viser punktene og huskeregelen. Modellkort er en type flashcard og øves og redigeres som andre flashcards (FR-23 til FR-27).
- **FR-43** Huskeregelen består av forbokstaven i hvert punkt satt sammen, i den rekkefølgen punktene står i notatene.
- **FR-44** Begynner alle punktene på samme bokstav, som de fire P-ene i markedsmiksen, lages modellkortet uten huskeregel.
- **FR-45** Før et modellkort lagres, kontrollerer appen at bokstavene i huskeregelen stemmer med forbokstavene i punktene, i tillegg til kontrollene i FR-38.
- **FR-46** Studenten kan erstatte huskeregelen med sin egen, eller legge til en der det ikke finnes noen.
- **FR-47** Finner appen ingen modeller eller lister i forelesningen, får studenten beskjed om det.

### 7. Fritekstspørsmål med selvvurdering

Studenten øver på eksamenslignende spørsmål der hun må formulere svaret selv (UJ-2). Modeller øves med modellkort (FR-42), ikke her.

- **FR-48** Studenten kan be om fritekstspørsmål for en forelesning. Det finnes to typer: kortsvar og langsvar. Hun velger omfang: rask (inntil 5 spørsmål), vanlig (inntil 10) eller dyp (inntil 15). Reglene i FR-18, FR-21, FR-22 og FR-38 gjelder.
- **FR-49** Hvert spørsmål har et modellsvar og viser kilden: filnavn og sidetall.
- **FR-50** Studenten kan øve på spørsmålene fra én forelesning eller fra hele emnet. Hun skriver svaret sitt i et tekstfelt. Modellsvaret vises først når hun har skrevet noe og valgt å se det.
- **FR-51** Etter at modellsvaret er vist, vurderer studenten svaret sitt som «Riktig», «Delvis riktig» eller «Feil». Når økten er ferdig, ser hun hvor mange hun hadde av hver. Svarene hennes lagres ikke, men resultatet av økten lagres (FR-56).
- **FR-52** Studenten kan slette enkeltspørsmål, direkte fra spørsmålet mens hun øver. Sletting krever bekreftelse.

### 8. Sammendrag

Studenten leser et sammendrag av forelesningen som repetisjon (UJ-1). Faglæreren ba om en beslutning om detaljnivå. Svaret er ett nivå, se «Endringer fra briefen».

- **FR-53** Studenten kan be om et sammendrag av en forelesning. Sammendraget har hovedpunktene fra notatene, ordnet etter tema: 5 til 15 punkter, hvert på høyst 50 ord. Reglene i FR-21 og FR-38 gjelder.
- **FR-54** Hvert punkt i sammendraget viser hvilken fil og side det kommer fra.
- **FR-55** Ber studenten om et nytt sammendrag, erstatter det nye sammendraget det gamle.

## Ikke-funksjonelle krav

Alle de ikke-funksjonelle kravene er en del av MVP-en, på samme måte som må ha-funksjonene, med unntakene i kuttrekkefølgen (se Omfang).

### Kjørbarhet og demomodus

Sensor skal kunne starte og teste appen uten studentens nøkler, kontoer eller tjenester.

- **NFR-1** Appen kan startes lokalt på en PC ved å følge README, med kommandoer som kan kopieres direkte. README oppgir hvilke versjoner av programmer som trengs, hvordan testene kjøres, og lenker til planleggingsdokumentene.
- **NFR-2** Demomodus er standard. I demomodus lager en mock-modell innhold ut fra teksten i den opplastede filen etter reglene i NFR-2a, med sidetall som finnes i filen, og gir samme svar hver gang for samme fil. Appen trenger da verken nøkkel, konto eller internett, og alle funksjoner kan prøves, også med en PDF som lastes opp for første gang.
- **NFR-2a** Mock-modellen bruker bare teksten i de opplastede filene. Den leter etter definisjonssetninger, det vil si setninger med «er» eller, i engelske PDF-er, «is», og lager innhold slik:
  - **Flashcards:** Ett begrepskort per definisjonssetning. Ordene før «er»/«is» står på forsiden, og hele setningen på baksiden. Kilden er siden setningen står på.
  - **Modellkort:** Tre eller flere linjer etter hverandre som begynner med kulepunkt eller nummer, blir ett modellkort. Huskeregelen lages etter FR-43 og FR-44.
  - **Quiz:** «Hva er [begrep]?», med resten av definisjonssetningen som riktig svar. De tre andre alternativene er definisjoner av andre begreper i samme forelesning. Finnes det færre enn fire definisjoner, lages ingen quiz, og studenten får beskjed (FR-18).
  - **Fritekst:** «Forklar [begrep].», med definisjonssetningen som modellsvar.
  - **Sammendrag:** Første setning på hver side, med sidetall.
  - Samme fil gir samme resultat hver gang. Rekkefølgen under øving er likevel tilfeldig (FR-23).
  - Kontrollene i FR-38 gjelder også for mock-modellen. FR-31 og SK-13 til SK-17 gjelder bare ekte språkmodell.
  - README sier at innholdet i demomodus er enkelt og mekanisk, og at det viser at funksjonene virker, ikke hvor god kvaliteten er med ekte språkmodell.
- **NFR-3** Appen leveres med en testbruker og et eksempelemne med forelesninger, filer og ferdig generert innhold. Eksempelmaterialet er skrevet med egne ord eller er åpent lisensiert. Materiale basert på OpenStax krediteres og deles under samme lisens (CC BY-NC-SA 4.0). PDF-er fra OpenStax legges ikke i repoet; README forklarer hvor de lastes ned.
- **NFR-4** Språkmodellen velges med én innstilling (mock eller Gemini), uten endringer i koden. Språkmodellen kalles bare fra serveren, og nøkler eller tilgang til språkmodellen sendes aldri til nettleseren. Hemmeligheter ligger i en `.env`-fil utenfor Git, og repoet har en `.env.example` som viser hvilke innstillinger som finnes.

### Personvern og datasikkerhet

- **NFR-5** Når appen bruker en ekte språkmodell, behandles dataene i EU/EØS hos en leverandør som ikke trener modeller på dem, og som har databehandleravtale gjennom vilkårene sine. Mellomlagring hos leverandøren er slått av.
- **NFR-6** Vilkårsteksten (FR-11) sier at notatene sendes til språkmodellen hos Google i EU, at Google kan logge forespørsler en periode for å oppdage misbruk, og at studenten ikke skal laste opp personopplysninger, for eksempel navn på medstudenter.
- **NFR-7** Passord lagres aldri i klartekst.

**Vurdering av Googles logging (issue #2).** Google bruker ikke dataene til trening, men kan logge forespørsler for å oppdage misbruk. Det betyr at notater kan bli lagret hos Google en periode selv om mellomlagring er slått av. Dette godtas fordi innholdet er studienotater, ikke sensitive opplysninger, dataene behandles i EU, og studenten får beskjed og blir bedt om ikke å laste opp personopplysninger (NFR-6). I demomodus sendes ingenting ut av maskinen. Et alternativ var å søke Google om unntak fra loggingen, men det er usikkert om et studentprosjekt får det, og det ville tatt tid. Vurderingen gjelder et studentprosjekt som kjøres lokalt, og bør gjøres på nytt hvis appen tas i bruk av andre.

### Universell utforming

Appen skal kunne brukes av alle, også med tastatur eller skjermleser. Kravene bygger på WCAG 2.1 nivå AA, som er standarden norsk regelverk bruker for nettløsninger.

- **NFR-8** Alle funksjoner kan brukes med bare tastatur, også å snu et flashcard, velge et svaralternativ og bekrefte en sletting. Det er alltid synlig hvilket element som har fokus. Hurtigtaster med én tast virker bare under øving, og aldri når fokus står i et tekstfelt: i flashcards snur Mellomrom kortet, `1` er «Kunne ikke» og `2` er «Kunne»; i quiz velger `A`–`D` svar og Enter bekrefter; i fritekst er `1`/`2`/`3` Feil, Delvis riktig og Riktig; Esc avslutter økten. En oversikt over hurtigtastene for siden vises med «?». *(Oversikten kan kuttes.)*
- **NFR-9** Tekst har en kontrast på minst 4,5:1 mot bakgrunnen.
- **NFR-10** Riktig og feil svar vises med tekst eller symbol i tillegg til farge, slik at det kan forstås uten å skille rødt fra grønt.
- **NFR-11** Alle skjemafelt har en synlig etikett, og feilmeldinger forklarer i tekst hva som er feil og hvordan det rettes.
- **NFR-12** Statusmeldinger, for eksempel at innhold lages eller at det ble laget færre kort enn valgt, leses opp av skjermlesere. Sidene har norsk som språk, slik at skjermlesere uttaler teksten riktig.
- **NFR-13** Universell utforming kontrolleres med automatiske tester i tillegg til en manuell gjennomgang med bare tastatur.

### Skjermstørrelser og nettlesere

- **NFR-14** Appen er laget for PC. Den skal fungere uten vannrett rulling i vinduer som er ned til 768 piksler brede, og når teksten er forstørret til 200 %. Mobil er ikke med i MVP.
- **NFR-15** Appen fungerer i siste versjon av Chrome, Safari og Edge.

### Grenser og ventetid

- **NFR-16** En opplastet fil kan være på inntil 50 sider. Er filen større, avvises den med en beskjed om grensen.
- **NFR-17** Med ekte språkmodell tar det normalt under to minutter å lage en vanlig gjennomgang (inntil 20 flashcards) fra én forelesning. I demomodus tar det under fem sekunder. Mens innholdet lages, kan studenten bruke resten av appen, og hun ser når det er ferdig. Det kan gå én jobb om gangen per forelesning. Blir jobben ferdig mens hun er på en annen side, vises en kort melding der. *(Meldingen på andre sider kan kuttes: da vises status bare på forelesningssiden.)*

### Valg av språkmodell

Faglæreren ba om beslutninger om valg av språkmodell og om behandlingen skal skje lokalt eller i skyen.

- **Sky, i EU.** Gemini på Vertex AI med behandling i EU er hovedvalget ([research 2026-10-28](../../research/technical-valg-av-sprakmodell-og-demomodus-2026-10-28/research.md), [funn i research-temaer](../../research/research-temaer.md)). Azure OpenAI ble forsøkt, men studentabonnementet fikk ikke kvote i EU. Anthropics API, Gemini via AI Studio og Sikt KI oppfyller ikke kravene til EU/EØS eller har ikke API.
- **Ikke lokal modell.** En lokal modell via Ollama er valgt bort fordi den er svakere på norsk og har begrenset plass til lange PDF-er. Demomodusen (NFR-2) dekker behovet for å kjøre appen uten skytjeneste.
- **Konkret modell** velges i arkitekturen etter en kvalitetstest på norsk (issue #3 og #4).
- **Kostnad.** Anslått til høyst noen få kroner per semester. En ekte språkmodell krever et eget Google Cloud-prosjekt med kredittkort, og det er ikke bekreftet at bruken trekkes fra prøvekreditten (issue #8). Sensor trenger ikke dette, fordi demomodus er standard.
- **Plan B.** Er det ikke bekreftet innen 14. november at kall til Gemini trekkes fra prøvekreditten (issue #8), leveres appen med demomodus alene. Kvalitetsmålingene SK-13 til SK-17 flyttes da til Begrensninger. Testen fra 2026-11-05 dokumenteres som det eneste som finnes om kvaliteten med ekte modell, med sin begrensning: én kjøring på 2–3 sider.

## Suksesskriterier

Kriteriene står i den rekkefølgen sensor kan etterprøve dem: først det som kan kjøres som tester, så manuelle kontroller og kvalitetsmålinger, og til slutt bruk som grunnlag for rapporten.

### Automatiske tester

Kjøres med mock-modellen, slik at sensor kan kjøre dem uten nøkkel.

- **SK-1** Hvert funksjonelt må ha-krav (FR-1 til FR-41 og FR-56 til FR-58) har minst én automatisk test, med mindre kravet bare kan kontrolleres manuelt. Da står det i testplanen hvorfor.
- **SK-2** En student ser og kan endre bare sitt eget innhold (FR-4).
- **SK-3** Alle sidetall i kildene finnes i den opplastede filen (FR-20, FR-32, FR-39).
- **SK-4** Ugyldig innhold fra språkmodellen forkastes, og studenten får beskjed om at det ble laget færre (FR-38, FR-18). Testes med en mock-modell som med vilje gir ugyldige svar.
- **SK-5** Forklaringen i quizen vises først etter at svaret er bekreftet (FR-35).
- **SK-6** Kort kan redigeres og slettes av eieren (FR-27). Sletting av fil, forelesning, emne og konto krever bekreftelse, og avbrudd sletter ingenting (FR-5, FR-12, FR-14).
- **SK-7** Word-filer, for store filer og PDF-er uten tekst avvises med riktig beskjed (FR-9, FR-10, NFR-16).
- **SK-8** Feiler genereringen, lagres ingenting halvferdig (FR-21).
- **SK-9** Universell utforming kontrolleres automatisk på alle sider (NFR-13).
- **SK-10** Huskeregelen stemmer med forbokstavene, og modellkort der alle punktene har samme forbokstav, lages uten huskeregel (FR-44, FR-45). Gjelder hvis huskeregler bygges.
- **SK-20** Resultatet av en økt lagres når økten avsluttes, også når den avbrytes, mens enkeltsvar ikke lagres. «Neste å øve på» følger regelen i FR-58 (FR-56, FR-58).
- **SK-21** Mock-modellen gir det samme innholdet to ganger for samme fil, og lager flashcards, quiz og sammendrag etter reglene i NFR-2a fra en kjent testfil (NFR-2a).
- **SK-22** Semesterlinja viser riktige forelesninger som øvd og ikke øvd, og riktig antall uker til eksamen (FR-57). Gjelder også tekstvarianten hvis semesterlinja kuttes.

### Manuelle kontroller før innlevering

- **SK-11** Appen starter etter README fra en ren kopi av repoet, uten nøkler eller kontoer (NFR-1, NFR-2).
- **SK-12** Hele kjerneflyten kan gjennomføres med bare tastatur (NFR-8, NFR-13).

### Kvalitet med ekte språkmodell

Måles manuelt med Gemini på eksempelnotatene og åpent lisensiert materiale. Hvert kort og spørsmål vurderes mot kilden og føres i et regneark som «riktig», «faglig feil» eller «feil kilde». Vurderingen gjøres av meg mot læreboka, ikke av KI. Kort jeg er usikker på etter å ha slått opp, teller som faglig feil. Resultatet legges i repoet.

- **SK-13** **Faglige feil:** En stikkprøve på 50 flashcards fra markedsføring har under 5 % faglige feil. Feil fagbegrep, for eksempel «Promotering» der notatene sier «Påvirkning», regnes som faglig feil.
- **SK-14** **Riktige kilder:** Minst 95 % av kortene i stikkprøven viser til en side der innholdet faktisk står.
- **SK-15** **Quiz:** I en stikkprøve på 20 quizspørsmål har hvert spørsmål nøyaktig ett faglig riktig alternativ, og det riktige alternativet er det lengste i høyst 35 % av spørsmålene (FR-31). Ved tilfeldighet er det lengste i omtrent 25 %.
- **SK-16** **Formler:** Kort laget fra PDF-side 127–128 i *Principles of Economics 3e* gjengir formlene riktig. Gjelder hvis FR-40 bygges.
- **SK-17** **Motvekt:** Minst 80 % av overskriftene i notatene har minst ett kort, slik at lav feilprosent ikke skyldes at det bare lages enkle kort om noen få detaljer.

### Bruk og prosess (grunnlag for rapporten)

- **SK-18** Stoffet i markedsføring legges inn forelesning for forelesning, og en repetisjonsøkt med flashcards, quiz og eventuelle huskeregler gjennomføres som før en eksamen. En kort egenrefleksjon vurderer om appen ga oversikt over stoffet, og om semesterlinja og «Neste å øve på» hjalp meg å velge hva jeg skulle øve på. Dette er ikke bevis for at appen virker for andre, se Begrensninger.
- **SK-19** Bruken av KI i utviklingen er dokumentert i `docs/ki-prosess/` og sesjonsloggene, slik emnet krever.

## Omfang

### Kjerneflyt

Kjerneflyten er det som må virke og være stabilt først, både i demomodus og med Gemini: logge inn → opprette emne og forelesning → laste opp PDF → lage og øve på flashcards → lage og ta quiz. Milepæler:

- **14. november:** Det er avklart om Gemini kan brukes (Plan B under Valg av språkmodell).
- **27. november:** Kjerneflyten virker i demomodus. Virker den ikke, kuttes bør ha-funksjonene.
- **1. desember:** Gemini er koblet på kjerneflyten.
- **5. desember:** Appen er ferdig. Innleveringsfristen er 15. desember 2026.

### Prioritering

- **Må ha:** 1 Norsk språk · 2 Innlogging og egne data · 3 Emner, forelesninger og opplasting · 4 Flashcards · 5 Flervalgsquiz, med «Oversikt fram mot eksamen», kravene i «Felles for alt generert innhold» og alle ikke-funksjonelle krav. Krav merket *(Kan kuttes)* går først.
- **Bør ha, i byggerekkefølge:** 6 Huskeregler · 7 Fritekstspørsmål med selvvurdering · 8 Sammendrag.

Blir tiden knapp, kuttes det i denne rekkefølgen:

1. Krav merket *(Kan kuttes)*.
2. Bør ha-funksjonene, bakfra: sammendrag, fritekst, huskeregler.
3. NFR-15: bare Chrome og Edge kontrolleres.
4. NFR-13 og SK-9: den automatiske testen av universell utforming kjøres bare på tre sider: forelesningssiden, flashcard-øving og quiz. Tastaturgjennomgangen beholdes.

Faglæreren advarte om at MVP-en i briefen var større enn prosjektforslaget den bygger på. Må ha er derfor holdt til de fem punktene faglæreren foreslo, nøkkelbegreper er slått sammen med flashcards, og krav som kan kuttes, er merket. Huskeregler er ett av de fire særtrekkene, men står som bør ha slik faglæreren foreslo. Kuttes de, faller SK-10 bort.

### Mulige utvidelser

Bygges bare hvis MVP-en er ferdig og stabil. Den første er den mest aktuelle.

1. KI-tilbakemelding på fritekstsvar.
2. Spredt repetisjon (spaced repetition), der appen husker «Kunne» og «Kunne ikke» og velger hvilke kort som skal øves.
3. Opplasting av Word-filer, med overskrift som kilde.
4. Mindre tillegg: valgbart detaljnivå på sammendrag, andre typer huskeregler, en samlet ordliste med norske og engelske begreper, og kilde som åpner PDF-en på riktig side.

### Utenfor

- Transkribering av lyd- og videoopptak.
- Deling av innhold og quiz mellom studenter.
- Mobilapp og tilpasning til mobilskjerm.
- Integrasjon med Canvas.
- Publisering på nett. Appen kjøres lokalt. Publiseres den senere, må også serveren kjøre i EU for å oppfylle NFR-5.
- Tolkning av tabeller og figurer. Bilde av siden brukes bare for å få med formler (FR-40).
- E-postbekreftelse og «glemt passord» (se FR-3).

## Endringer fra briefen

Briefen ([brief.md](../../briefs/brief-G91-vikvald-2026-09-24/brief.md)) var utgangspunktet. Disse endringene ble gjort i PRD-arbeidet:

| Briefen sa | PRD-en sier | Begrunnelse |
|---|---|---|
| Studenten laster opp foiler eller notater | Studentens egne notater, eller materiale hun har rett til å bruke (FR-11) | Opphavsrett: foilene tilhører foreleseren, og Kopinor-avtalen tillater ikke opplasting av kurslitteratur i KI-verktøy. Faglæreren bekreftet 2026-11-09 at en vilkårstekst er nok. |
| Opplasting av PDF eller tekst | Bare PDF (FR-8, FR-9) | Kilden skal vise fil og side. Word-filer og innlimt tekst har ikke faste sidetall. Notatene skrives i Word og kan lagres som PDF med ett klikk. |
| Nøkkelbegreper som egen bør ha-funksjon (nr. 7) | Begrepskort som en type flashcard (FR-19) | Nøkkelbegreper brukes ikke som egen visning i brukerreisene. Som flashcard blir begrepene aktiv øving, og funksjonen krever nesten ikke ekstra arbeid. Datamodellen blir enklere. |
| Huskeregler: KI-en foreslår måter å huske lister og modeller på | Forbokstavregel på modellkort, som en type flashcard. Ingen huskeregel når alle punktene har samme forbokstav (FR-42 til FR-44). | Forbokstavregelen er den metoden som har virket for meg. Som flashcard blir det aktiv øving. Testen 2026-11-05 viste at forbokstavene kan bli «PPPP», som ikke hjelper. |
| Fritekstsvar med KI-tilbakemelding som første utvidelse | Fritekstspørsmål med selvvurdering som bør ha nr. 7. KI-tilbakemelding er fortsatt første utvidelse. | Brukerreisen før eksamen (UJ-2) har kortsvar og langsvar. Selvvurdering er enkel å bygge og teste, mens KI-tilbakemelding har usikker kvalitet. |
| Sammendrag med valgbart detaljnivå (kort, middels, detaljert) | Ett detaljnivå: hovedpunktene med en kort forklaring (FR-53). Valgbart nivå er en mulig utvidelse. | Sammendrag er den bør ha-funksjonen som kuttes først. Tre nivåer betyr tre varianter å lage og teste, og sensorveiledningen vurderer at det som er bygd, virker, ikke antall valg. |
| Publisert webapp som en bonus | Publisering er utenfor | Lokal kjøring er det som kreves, og publisering ville krevd at også serveren kjører i EU. |

## Endringer etter UX-arbeidet

UX-arbeidet 10.–11. november 2026 ([EXPERIENCE.md](../../ux-designs/ux-G91-vikvald-2026-11-10/EXPERIENCE.md), [DESIGN.md](../../ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md)) viste at semesterlinjen, som jeg likte best av designkonseptene, trenger data PRD-en ikke hadde. Disse endringene ble gjort 11. november:

| PRD-en sa | PRD-en sier nå | Begrunnelse |
|---|---|---|
| Et emne har et navn (FR-6) | Et emne har navn og eksamensdato (FR-6) | Semesterlinjen viser tiden til eksamen. Det var det jeg likte best i designet. |
| Markeringer og fritekstsvar lagres ikke (FR-25, FR-51) | Enkeltsvar lagres fortsatt ikke, men resultatet av hver økt lagres (FR-56) | Uten lagring kan appen ikke vise hva som er øvd. Det er bare dato, type og resultat, ikke svarene. |
| Ingen oversikt over semesteret | Semesterlinje og «Neste å øve på» (FR-57, FR-58), begge *(Kan kuttes)* | Gir oversikten fram mot eksamen (UJ-2). Kan kuttes fordi kjerneflyten virker uten dem; reserven for semesterlinjen er tekst. |
| Kort og spørsmål kan redigeres og slettes (FR-27, FR-37, FR-52) | Det skjer direkte fra kortet eller spørsmålet under øving, med bekreftelse | Feil oppdages mens studenten øver og sjekker kilden. Det trengs ingen egen listeside. |
| Tastatur og ventetid (NFR-8, NFR-17) | Hurtigtaster og oversikt med «?», én jobb per forelesning og ferdigmelding på andre sider. Oversikten og meldingen *(Kan kuttes)* | Gjør tastaturbruk og venting tydeligere. Faglæreren advarte mot omfang, så tilleggene er merket. |

Faglæreren advarte om at omfanget kunne bli for stort. Bare FR-56 og eksamensdatoen er nye må ha-krav, og begge er små. Resten er merket *(Kan kuttes)*.

## Endringer etter tilbakemeldingen på PRD-en

Tilbakemeldingen 12. november 2026 ([tilbakemelding-prd.md](tilbakemelding-prd.md)) pekte på omfang, manglende reserveplan og krav som ikke kunne testes.

| PRD-en sa | PRD-en sier nå | Begrunnelse |
|---|---|---|
| Kjerneflyten skal virke 27.11, appen ferdig 5.12 | Milepæler 14.11, 27.11, 1.12 og 5.12, og en kuttrekkefølge som også omfatter NFR-13 og NFR-15 (Omfang) | De tyngste kravene kunne ikke kuttes. Funksjoner kuttes før kvalitet og testing. |
| Kostnaden med Gemini er ikke bekreftet (#8) | Plan B: ikke bekreftet innen 14.11 → demomodus alene, og SK-13 til SK-17 flyttes til Begrensninger | Vertex-kall virket allerede 2026-11-05, så det uavklarte er kostnaden, ikke tilgangen. |
| Mock-modellen «lager innhold ut fra teksten» (NFR-2) | Faste regler for hver innholdstype (NFR-2a) | Demomodus er det sensor møter først, og reglene må kunne bli en story og testes. |
| Øktype inkluderte «huskeregler», resultat var ikke definert (FR-56) | Tre øktyper med resultat for hver; modellkort er flashcards; tomme økter lagres ikke (FR-56) | Datamodellen og semesterlinjen bygger på dette. Huskeregelen er en hjelp på kortet, ikke en egen øving. |
| «Forståelig beskjed», «senere», «en setning eller to», «halvparten» | Tidsgrense, meldingstekst, rekkefølge, lengde og 35 % (FR-21, FR-25, FR-53, NFR-8, SK-15) | Tester trenger tall og tekster. |
| Mock-modellen og semesterlinja hadde ingen suksesskriterier | SK-21 og SK-22, og SK-18 vurderer om semesterlinja hjalp | Hovedideen «bygd for semesteret» ble bare målt i SK-18, og reglene for mock-modellen må testes. |

Rekkefølgen på ID-ene er ryddet, og ordlista har fått emne, forelesning, flashcard, quiz og resultat.

## Begrensninger og risikoer

### Begrensninger

- **Ingen intervjuer med brukere (issue #6).** Planen var å intervjue 3–5 medstudenter om eksamensforberedelser og KI-bruk. Det ble ikke gjort, fordi jeg ikke kjenner studenter med emner som krever mye pugging. Behovet bygger i stedet på egen erfaring og offentlige kilder om læring og konkurrerende verktøy (se [addendum til briefen](../../briefs/brief-G91-vikvald-2026-09-24/addendum.md)). Grunnlaget er derfor svakere: jeg vet ikke om andre studenter har det samme problemet eller ville brukt appen på samme måte.
- **Én brukers erfaring.** Brukerreisene og valg som typen huskeregel bygger på hvordan jeg selv lærer. Andre studenter kan foretrekke andre metoder.
- **Simulert bruk.** Appen testes på markedsføring med en simulert repetisjon, fordi jeg ikke har et emne dette semesteret der den passer. Testen viser ikke om appen hjelper en student som faktisk forbereder seg til eksamen.
- **Testmateriale.** Testene bruker eksempelnotater skrevet med egne ord og åpent lisensiert materiale fra OpenStax, som er på engelsk. Ekte forelesningsfoiler brukes ikke, av hensyn til opphavsretten.

### Kjente risikoer

- **Feil i generert innhold.** En studie fra 2025 fant feil i omtrent 5 % av KI-genererte flashcards. Tiltak: kilde på alt, kontroll før lagring, sletting og redigering, og stikkprøvene i SK-13 til SK-17.
- **Passiv bruk.** Sammendrag kan gjøre studenten mer passiv. Tiltak: flashcards krever at studenten tenker ut svaret før kortet snus, quiz og fritekst krever svar før fasiten vises, og sammendrag har lavest prioritet.
- **Dubletter.** Når nye kort legges til de gamle (FR-22, FR-33), kan språkmodellen lage kort som ligner de gamle. Studenten kan slette dem selv.
- **Formelregelen er ikke testet (issue #9).** Bommer regelen i FR-40, kan formler mangle uten varsel. Tiltak: hellere en side for mye som bilde enn en for lite, og merking når modellen melder at noe mangler (FR-41).
- **Ventetid.** I testen tok det 53 sekunder å lage 9 quizspørsmål fra 3 sider. Tiltak: studenten kan bruke appen mens hun venter (NFR-17).

## Åpne punkter

Disse avklares før eller under arkitektur og implementering, og følges opp som GitHub Issues:

- Test norsk kvalitet og vurder testkortene faglig (#3), og velg Gemini-modell (#4).
- Sjekk at Vertex-kall trekkes fra prøvekreditten, og at budsjettvarsel er satt (#8). Frist 14. november, se Plan B.
- Lag og test regelen for å finne sider med formler som mangler i teksten (#9).
- Skriv 2–3 eksempelnotater på norsk med egne ord, basert på *Principles of Marketing* fra OpenStax (NFR-3).

## Ordliste

- **Demomodus:** Appen kjører med mock-modellen i stedet for en ekte språkmodell. Standard for sensor.
- **Mock-modell:** En liten erstatning for språkmodellen som lager forutsigbart innhold uten internett. Brukes i demomodus og i de automatiske testene.
- **Emne:** Et fag studenten tar, for eksempel Markedsføring, med navn og eksamensdato.
- **Forelesning:** Én forelesning i et emne, med dato og én eller flere PDF-filer.
- **Flashcard (kort):** Et kort med spørsmål eller begrep på forsiden og svar på baksiden. «Kort» brukes som kortform. Begrepskort og modellkort er typer flashcards.
- **Quiz (quizspørsmål):** Flervalgsspørsmål med fire alternativer. «Spørsmål» brukes som kortform når det går fram av sammenhengen at det er quizspørsmål.
- **Begrepskort:** Flashcard med et begrep på forsiden og forklaringen på baksiden.
- **Modellkort:** Flashcard som ber studenten forklare en modell eller liste, med punktene og eventuell huskeregel på baksiden.
- **Kilde:** Filnavn og sidetall i PDF-filen som innholdet er laget fra.
- **Stikkprøve:** Manuell kontroll av et utvalg kort eller spørsmål mot kilden.
- **Kjerneflyt:** Den delen av appen som må virke først: innlogging, emner og forelesninger, opplasting, flashcards og quiz.
- **Økt:** Én gjennomgang av flashcards, quiz eller fritekst, se FR-56.
- **Resultat:** Det som lagres om en økt: antall kort eller spørsmål og hvordan det gikk, se FR-56.
- **Semesterlinje:** Tidslinje som viser forelesningene i et emne etter dato, fram til eksamen.
