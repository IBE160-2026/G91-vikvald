---
title: PRD – G91-vikvald
status: draft
created: 2026-11-09
updated: 2026-11-09
---

# PRD – G91-vikvald

## Brukerreiser

### UJ-1: Klara etter en forelesning

Klara studerer markedsføring og skriver egne notater i forelesningene. Hun gjentar dette hver uke gjennom semesteret.

1. Etter forelesningen åpner Klara Studiekamerat og laster opp notatene sine til forelesningen i emnet Markedsføring. Mer orker hun ikke akkurat da.
2. Noen dager senere lager hun flashcards og en flervalgsquiz fra forelesningen. Hun svarer før fasiten vises, og ser hva som sitter og hva hun har glemt. Å vente noen dager gir bedre læring enn å øve med en gang.
3. Hun leser sammendraget som er laget ut fra notatene.

### UJ-2: Klara før eksamen

Noen uker før eksamen har Klara lastet opp notater fra alle forelesningene.

1. Hun samler flashcardene og quizspørsmålene fra alle forelesningene i emnet og går gjennom dem.
2. Hun bruker huskeregler for å lære modeller og lister som må pugges.
3. Hun svarer på kortsvars- og langsvarsspørsmål og forklarer modeller. Etter hvert svar ser hun et modellsvar med kilde, og vurderer selv hvor godt hun svarte.

## Funksjoner og krav

### 3. Emner, forelesninger og opplasting

Studenten organiserer stoffet per emne og forelesning, slik at det er samlet når eksamen nærmer seg (UJ-1, UJ-2).

- **FR-1** Studenten kan opprette, gi nytt navn til og slette emner.
- **FR-2** Studenten kan opprette, gi nytt navn til og slette forelesninger i et emne.
- **FR-3** Studenten kan laste opp én eller flere PDF-filer til en forelesning.
- **FR-4** Laster studenten opp en Word-fil eller en annen filtype som ikke støttes, avvises filen med en beskjed om hvilke formater som støttes og hvordan et Word-dokument lagres som PDF.
- **FR-5** Har en PDF ingen lesbar tekst, for eksempel et skannet dokument, får studenten beskjed om det i stedet for tomt eller feil innhold.
- **FR-6** Før studenten laster opp sin første fil, må hun godta en vilkårstekst om at hun er ansvarlig for materialet hun laster opp, og at det skal være egne notater eller materiale hun har rett til å bruke.
- **FR-7** Studenten kan slette en fil. Før filen slettes, får hun en bekreftelse som sier hvor mye generert innhold (flashcards, quizspørsmål og annet) som slettes sammen med filen. Avbryter hun, slettes ingenting.
- **FR-8** Studenten kan erstatte en fil med en ny. Innhold generert fra den gamle filen slettes etter samme bekreftelse som i FR-7.
- **FR-9** Sletter studenten en forelesning eller et emne, slettes alle filer og alt generert innhold under, etter en bekreftelse som i FR-7.
- **FR-10** En forelesning har et navn og en dato. Datoen er dagens dato som standard og kan endres. Forelesningene i et emne vises sortert etter dato.
- **FR-11** For hver forelesning ser studenten antall filer og hvor mye som er generert, for eksempel antall flashcards og quizspørsmål, slik at hun ser hvilke forelesninger hun ikke har øvd på ennå. *(Kan kuttes.)*

### 4. Flashcards

Studenten tester seg selv på stoffet fra én forelesning (UJ-1) eller hele emnet (UJ-2), og ser hva hun har glemt.

*Lage kort*
- **FR-12** Studenten kan lage flashcards fra en forelesning, og velger omfang: rask gjennomgang (inntil 10 kort), vanlig gjennomgang (inntil 20) eller dyp gjennomgang (inntil 30). *(Kan kuttes: da lages inntil 20 kort uten valg.)*
- **FR-13** Kortene lages bare fra stoffet i forelesningens filer. Gir stoffet grunnlag for færre kort enn valgt, lages færre, og studenten får beskjed om det.
- **FR-14** Det finnes to typer kort: spørsmål med svar, og begrepskort med begrepet på forsiden og forklaringen på baksiden.
- **FR-15** Hvert kort viser kilden: filnavn og sidetall. Sidetallet finnes i den opplastede filen.
- **FR-16** Mens kortene lages, ser studenten at appen jobber. Feiler det, får hun en forståelig beskjed og kan prøve igjen, uten at halvferdige kort lagres.
- **FR-17** Lager studenten kort fra en forelesning som allerede har kort, legges de nye til de eksisterende.

*Øve*
- **FR-18** Studenten kan øve på kortene fra én forelesning eller fra alle forelesningene i et emne. Kortene vises i tilfeldig rekkefølge.
- **FR-19** Forsiden vises først. Baksiden vises først når studenten velger å snu kortet.
- **FR-20** Etter at kortet er snudd, markerer studenten «Kunne» eller «Kunne ikke». Kort markert «Kunne ikke» vises igjen senere i samme økt, til hun har markert dem «Kunne» eller avslutter økten.
- **FR-21** Når økten er ferdig, ser studenten hvor mange kort hun kunne og ikke kunne. *(Kan kuttes.)*

*Rette opp*
- **FR-22** Studenten kan redigere og slette enkeltkort hun selv har laget.

### 5. Flervalgsquiz

Quizen lages og brukes på samme måte som flashcardene, men studenten velger blant fire svar og får en forklaring etterpå.

*Lage quiz*
- **FR-23** Studenten kan lage quizspørsmål fra en forelesning. Hun velger omfang som for flashcards (inntil 10, 20 eller 30 spørsmål) og vanskelighetsgrad:
  - *Lett:* kjenne igjen en definisjon.
  - *Middels:* forstå sammenhenger mellom begreper.
  - *Vanskelig:* bruke stoffet på et eksempel.
- **FR-24** Spørsmålene lages bare fra stoffet i forelesningens filer, med samme regel for for lite stoff som i FR-13, og samme håndtering av venting og feil som i FR-16.
- **FR-25** Hvert spørsmål har fire svaralternativer, der nøyaktig ett er riktig. Plasseringen av det riktige svaret varierer.
- **FR-26** Hvert spørsmål viser kilden: filnavn og sidetall. Sidetallet finnes i den opplastede filen.
- **FR-27** Lager studenten spørsmål fra en forelesning som allerede har spørsmål, legges de nye til de eksisterende.

*Ta quizen*
- **FR-28** Studenten kan ta quiz på spørsmålene fra én forelesning eller fra alle forelesningene i et emne. Spørsmålene vises i tilfeldig rekkefølge.
- **FR-29** Studenten velger ett alternativ og bekrefter svaret. Først da vises riktig svar og en forklaring. Svaret kan ikke endres etterpå.
- **FR-30** Når quizen er ferdig, ser studenten poengsummen og en liste over spørsmålene hun svarte feil på, med riktig svar, forklaring og kilde. *(Listen kan kuttes; poengsummen beholdes.)*

*Rette opp*
- **FR-31** Studenten kan slette enkeltspørsmål hun selv har laget. Spørsmål kan ikke redigeres.

## Endringer fra briefen

Briefen ([brief.md](../../briefs/brief-G91-vikvald-2026-09-24/brief.md)) var utgangspunktet. Disse endringene ble gjort i PRD-arbeidet:

| Briefen sa | PRD-en sier | Begrunnelse |
|---|---|---|
| Opplasting av PDF eller tekst | Bare PDF (FR-3, FR-4) | Kilden skal vise fil og side. Word-filer og innlimt tekst har ikke faste sidetall. Notatene skrives i Word og kan lagres som PDF med ett klikk. |
| Nøkkelbegreper som egen bør ha-funksjon (nr. 7) | Begrepskort som en type flashcard (FR-14) | Brukes ikke i brukerreisene som egen visning. Som flashcard blir begrepene aktiv øving, og funksjonen krever nesten ikke ekstra arbeid. Datamodellen blir enklere. |
| Fritekstsvar med KI-tilbakemelding som første utvidelse | Fritekstspørsmål med selvvurdering som bør ha nr. 7. KI-tilbakemelding er fortsatt første utvidelse. | Brukerreisen før eksamen (UJ-2) har kortsvar, langsvar og forklaring av modeller. Selvvurdering er enkel å bygge og teste, mens KI-vurdering har usikker kvalitet. |
| Sammendrag med valgbart detaljnivå (kort, middels, detaljert) | Ett detaljnivå: hovedpunktene med en kort forklaring (FR-50). Valgbart nivå er en mulig utvidelse. | Sammendrag er den bør ha-funksjonen som kuttes først. Tre nivåer betyr tre varianter å lage og teste, og sensorveiledningen vurderer at det som er bygd, virker, ikke antall valg. |

### 1. Norsk språk

Gjelder hele appen. Norsk fra grunnen av er en av fire ting som skiller Studiekamerat fra andre verktøy.

- **FR-32** All tekst i grensesnittet er på norsk bokmål, også feilmeldinger og bekreftelser.
- **FR-33** Alt generert innhold er på norsk bokmål, også når notatene er på engelsk eller blander språkene. Der et fagbegrep også brukes på engelsk i notatene, står det engelske begrepet i parentes, for eksempel «merkevare (brand)».

### 2. Innlogging og egne data

Innlogging trengs fordi studentens materiale lagres.

- **FR-34** Studenten kan opprette en konto med e-postadresse og passord, logge inn og logge ut. E-postadressen bekreftes ikke, og det finnes ingen «glemt passord»-funksjon.
- **FR-35** En innlogget student ser og kan endre bare sine egne emner, forelesninger, filer og genererte innhold. Forsøk på å åpne andres innhold, for eksempel ved å endre adressen i nettleseren, gir ingen tilgang.
- **FR-36** Studenten kan slette kontoen sin. Før kontoen slettes, får hun en bekreftelse som sier at alle emner, filer og alt generert innhold slettes for godt. Etter sletting finnes ingen av dataene hennes i appen.

### Felles for alt generert innhold

Disse kravene gjelder flashcards, quiz og bør ha-funksjonene.

- **FR-37** Når en side ser ut til å ha formler som ikke kommer med i teksten fra PDF-en, får språkmodellen også et bilde av siden, slik at formlene kommer med i det som lages.
- **FR-38** Appen kontrollerer alt språkmodellen lager før det lagres: sidetallet i kilden finnes i filen, et quizspørsmål har nøyaktig fire alternativer der ett er riktig, og ingen påkrevde felt er tomme. Det som ikke består kontrollen, forkastes og regnes med i beskjeden om at det ble laget færre enn valgt (FR-13).
- **FR-39** Innhold laget fra en side med formler er merket «Inneholder formel – sjekk mot kilden».

**Konfidensnivå.** Faglæreren ba om en beslutning om konfidensnivå, det vil si hvordan appen håndterer at språkmodellen kan ta feil. Appen viser ikke språkmodellens egen vurdering av hvor sikker den er, fordi språkmodeller ikke vurderer sin egen sikkerhet pålitelig. I stedet bygger appen på kontroller som faktisk kan sjekkes: innholdet lages bare fra notatene (FR-13, FR-24), alt kontrolleres før lagring (FR-38), alt viser kilde (FR-15, FR-26), innhold fra sider med formler er merket (FR-39), og studenten kan slette det som er feil (FR-22, FR-31). Hvor godt dette virker, måles med stikkprøven under Suksesskriterier.

## Bør ha-funksjoner

Bygges bare når må ha-funksjonene (1–5) virker og er stabile, i denne rekkefølgen. Det som står sist, kuttes først.

### 6. Huskeregler

Studenten bruker huskeregler for å lære modeller og lister som må pugges (UJ-2).

- **FR-40** Studenten kan be om huskeregler for en forelesning. Appen finner modeller og lister i notatene, for eksempel de fire P-ene i markedsmiksen, og lager et modellkort for hver: forsiden ber studenten forklare modellen, og baksiden viser punktene og huskeregelen. Modellkort er en type flashcard og øves og redigeres som andre flashcards (FR-18–FR-22).
- **FR-41** Huskeregelen består av forbokstaven i hvert punkt satt sammen, i den rekkefølgen punktene står i notatene.
- **FR-42** Før et modellkort lagres, kontrollerer appen at bokstavene i huskeregelen stemmer med forbokstavene i punktene (i tillegg til kontrollene i FR-38).
- **FR-43** Studenten kan erstatte huskeregelen med sin egen.
- **FR-44** Finner appen ingen modeller eller lister i forelesningen, får studenten beskjed om det.

### 7. Fritekstspørsmål med selvvurdering

Studenten øver på eksamenslignende spørsmål der hun må formulere svaret selv (UJ-2). Modeller øves med modellkort (FR-40), ikke her.

- **FR-45** Studenten kan be om fritekstspørsmål for en forelesning. Det finnes to typer: kortsvar og langsvar. Hun velger omfang: rask (inntil 5 spørsmål), vanlig (inntil 10) eller dyp (inntil 15). Reglene i FR-13, FR-16, FR-17 og FR-38 gjelder.
- **FR-46** Hvert spørsmål har et modellsvar og viser kilden: filnavn og sidetall.
- **FR-47** Studenten kan øve på spørsmålene fra én forelesning eller fra hele emnet. Hun skriver svaret sitt i et tekstfelt. Modellsvaret vises først når hun har skrevet noe og valgt å se det.
- **FR-48** Etter at modellsvaret er vist, vurderer studenten svaret sitt som «Riktig», «Delvis riktig» eller «Feil». Når økten er ferdig, ser hun hvor mange hun hadde av hver. Svarene hennes lagres ikke. [ANTAGELSE]
- **FR-49** Studenten kan slette enkeltspørsmål.

### 8. Sammendrag

Studenten leser et sammendrag av forelesningen som repetisjon (UJ-1). Faglæreren ba om en beslutning om detaljnivå. Svaret er ett nivå, se «Endringer fra briefen».

- **FR-50** Studenten kan be om et sammendrag av en forelesning. Sammendraget har hovedpunktene fra notatene med en setning eller to om hvert, ordnet etter tema. Reglene i FR-16 og FR-38 gjelder.
- **FR-51** Hvert punkt i sammendraget viser hvilken fil og side det kommer fra.
- **FR-52** Ber studenten om et nytt sammendrag, erstatter det det gamle. [ANTAGELSE]

## Ikke-funksjonelle krav

### Kjørbarhet og demomodus

Sensor skal kunne starte og teste appen uten studentens nøkler, kontoer eller tjenester.

- **NFR-1** Appen kan startes lokalt på en PC ved å følge README, med kommandoer som kan kopieres direkte. README oppgir hvilke versjoner av programmer som trengs, hvordan testene kjøres, og lenker til planleggingsdokumentene.
- **NFR-2** Demomodus er standard. I demomodus gir en mock-modell faste svar, så appen trenger verken nøkkel, konto eller internett. Alle funksjoner kan prøves i demomodus.
- **NFR-3** Appen leveres med en testbruker og et eksempelemne med forelesninger, filer og ferdig generert innhold. Eksempelmaterialet er skrevet med egne ord eller er åpent lisensiert, og er kreditert der lisensen krever det.
- **NFR-4** Språkmodell velges med én innstilling (mock eller Gemini), uten endringer i koden. Hemmeligheter ligger i en `.env`-fil utenfor Git, og repoet har en `.env.example` som viser hvilke innstillinger som finnes.

### Personvern og datasikkerhet

- **NFR-5** Når appen bruker en ekte språkmodell, behandles dataene i EU/EØS hos en leverandør som ikke trener modeller på dem. Mellomlagring hos leverandøren er slått av.
- **NFR-6** Vilkårsteksten (FR-6) sier at notatene sendes til språkmodellen hos Google i EU, at Google kan logge forespørsler en periode for å oppdage misbruk, og at studenten ikke skal laste opp personopplysninger, for eksempel navn på medstudenter.
- **NFR-7** Passord lagres aldri i klartekst.

**Vurdering av Googles logging (issue #2).** Google bruker ikke dataene til trening, men kan logge forespørsler for å oppdage misbruk. Det betyr at notater kan bli lagret hos Google en periode selv om mellomlagring er slått av. Dette godtas fordi innholdet er studienotater, ikke sensitive opplysninger, dataene behandles i EU, og studenten får beskjed og blir bedt om ikke å laste opp personopplysninger (NFR-6). I demomodus sendes ingenting ut av maskinen. Et alternativ var å søke Google om unntak fra loggingen, men det er usikkert om et studentprosjekt får det, og det ville tatt tid.

### Universell utforming

Appen skal kunne brukes av alle, også med tastatur eller skjermleser. Kravene bygger på WCAG 2.1 nivå AA, som er standarden norsk regelverk bruker for nettløsninger.

- **NFR-8** Alle funksjoner kan brukes med bare tastatur, også å snu et flashcard, velge et svaralternativ og bekrefte en sletting. Det er alltid synlig hvilket element som har fokus.
- **NFR-9** Tekst har en kontrast på minst 4,5:1 mot bakgrunnen.
- **NFR-10** Riktig og feil svar vises med tekst eller symbol i tillegg til farge, slik at det kan forstås uten å skille rødt fra grønt.
- **NFR-11** Alle skjemafelt har en synlig etikett, og feilmeldinger forklarer i tekst hva som er feil og hvordan det rettes.
- **NFR-12** Statusmeldinger, for eksempel at innhold lages eller at det ble laget færre kort enn valgt, leses opp av skjermlesere. Sidene har norsk som språk, slik at skjermlesere uttaler teksten riktig.
- **NFR-13** Universell utforming kontrolleres med automatiske tester i tillegg til en manuell gjennomgang med bare tastatur.

### Skjermstørrelser

- **NFR-14** Appen er laget for PC. Den skal fungere uten vannrett rulling i vinduer ned til 768 piksler brede, og når teksten er forstørret til 200 %. Mobil er ikke med i MVP.

### Grenser og ytelse

- **NFR-15** En opplastet fil kan være på inntil 50 sider. Er filen større, avvises den med en beskjed om grensen.
- **NFR-16** Med ekte språkmodell tar det normalt under [ANTAGELSE: ett minutt] å lage en vanlig gjennomgang (inntil 20 flashcards) fra én forelesning. I demomodus tar det under fem sekunder.
- **NFR-17** Appen fungerer i siste versjon av Chrome, Safari og Edge. [ANTAGELSE]

## Suksesskriterier

Kriteriene står i den rekkefølgen sensor kan etterprøve dem: først det som kan kjøres som tester, så manuelle kvalitetsmålinger, og til slutt bruk som grunnlag for rapporten.

### Automatiske tester

Kjøres med mock-modellen, slik at sensor kan kjøre dem uten nøkkel.

- En student ser og kan endre bare sitt eget innhold (FR-35).
- Alle sidetall i kildene finnes i den opplastede filen (FR-15, FR-26, FR-38).
- Forklaringen i quizen vises først etter at svaret er bekreftet (FR-29).
- Et flashcard kan redigeres og slettes av studenten som eier det (FR-22), og sletting av en fil krever bekreftelse (FR-7).
- Huskeregelen stemmer med forbokstavene i punktene (FR-42).
- Universell utforming kontrolleres automatisk på alle sider (NFR-13).
- Appen starter etter README fra en ren kopi av repoet, uten nøkler eller kontoer (NFR-1, NFR-2). Kontrolleres manuelt før innlevering.

### Kvalitet med ekte språkmodell

Måles manuelt med Gemini på eksempelnotater og åpent lisensiert materiale.

- **Faglige feil:** En stikkprøve på 50 flashcards fra markedsføring har under 5 % faglige feil.
- **Riktige kilder:** Minst 95 % av kortene i stikkprøven viser til en side der innholdet faktisk står.
- **Formler:** Kort laget fra sider med formler i økonomistoff gjengir formlene riktig.
- **Motvekt:** Stikkprøven sjekker også at kortene dekker hovedpunktene i notatene, slik at lav feilprosent ikke skyldes at det bare lages enkle kort.

### Bruk (grunnlag for rapporten)

- Stoffet i markedsføring legges inn forelesning for forelesning, og en repetisjonsøkt med flashcards, quiz og huskeregler gjennomføres som før en eksamen.
- En kort egenrefleksjon vurderer om appen ga oversikt over stoffet. Dette er ikke bevis for at appen virker for andre, se Begrensninger.

## Omfang

### Kjerneflyt

Kjerneflyten er det som må virke og være stabilt først, både i demomodus og med Gemini: logge inn → opprette emne og forelesning → laste opp PDF → lage og øve på flashcards → lage og ta quiz. Virker ikke kjerneflyten 25. november, kuttes bør ha-funksjonene. Målet er at appen er ferdig 4. desember. Innleveringsfristen er 15. desember 2026.

### Prioritering

- **Må ha:** 1 Norsk språk · 2 Innlogging og egne data · 3 Emner, forelesninger og opplasting · 4 Flashcards · 5 Flervalgsquiz, med kravene i «Felles for alt generert innhold». Krav merket «kan kuttes» går først hvis tiden blir knapp.
- **Bør ha, i byggerekkefølge:** 6 Huskeregler · 7 Fritekstspørsmål med selvvurdering · 8 Sammendrag.

### Mulige utvidelser

Bygges bare hvis MVP-en er ferdig og stabil. Den første er den mest aktuelle.

1. KI-tilbakemelding på fritekstsvar.
2. Spaced repetition, der appen husker «Kunne» og «Kunne ikke» og velger hvilke kort som skal øves.
3. Opplasting av Word-filer, med overskrift som kilde.
4. Valgbart detaljnivå på sammendrag, andre typer huskeregler og en samlet ordliste med norske og engelske begreper.

### Utenfor

- Transkribering av lyd- og videoopptak.
- Deling og quizzing mellom studenter.
- Mobilapp og tilpasning til mobilskjerm.
- Integrasjon med Canvas.
- Publisering på nett. Appen kjøres lokalt.
- Tolkning av tabeller og figurer. Bilde av siden brukes bare for å få med formler (FR-37).
- E-postbekreftelse og «glemt passord» (se FR-34).

## Begrensninger

- **Ingen intervjuer med brukere (issue #6).** Planen var å intervjue 3–5 medstudenter om eksamensforberedelser og KI-bruk. Det ble ikke gjort, fordi jeg ikke kjenner studenter med emner som krever mye pugging. Behovet bygger i stedet på egen erfaring og offentlige kilder om læring og konkurrerende verktøy (se addendum til briefen). Grunnlaget er derfor svakere: vi vet ikke om andre studenter har det samme problemet eller ville brukt appen på samme måte.
- **Én brukers erfaring.** Brukerreisene og valg som type huskeregel bygger på hvordan jeg selv lærer. Andre studenter kan foretrekke andre metoder.
- **Simulert bruk.** Appen testes på markedsføring med en simulert repetisjon, fordi jeg ikke har et emne dette semesteret der den passer. Testen viser ikke om appen hjelper en student som faktisk forbereder seg til eksamen.
- **Testmateriale.** Testene bruker eksempelnotater skrevet med egne ord og åpent lisensiert materiale fra OpenStax, som er på engelsk. Ekte forelesningsfoiler brukes ikke, av hensyn til opphavsretten.
