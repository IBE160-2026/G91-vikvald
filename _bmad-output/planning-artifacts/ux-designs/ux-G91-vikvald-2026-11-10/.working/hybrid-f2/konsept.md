# F2 Presis: hybrid F som et godt designet verktøy

**Personlighet:** Skarp, rolig og profesjonell, som Linear, Things eller Stripe Dashboard i lys utgave. Samme struktur og innhold som F, men alle mål, avstander og tekstlinjer er bestemt med vilje.

F2 beholder alt som er bestemt i F: forsiden uten sidemeny og med den store semesterlinjen, sidemeny med emnetre på de andre sidene, øktpanel under øving, én tidslinje per side, oransje #B83E0C bare for Markedsføring, få knappestiler og svart bare for det Klara gjør oftest. Løftet ligger i håndverket: én skriftfamilie med presis vektbruk, et fast 8-punkts rutenett, hvite flater med tynn kant i stedet for løse linjer, linjeikoner med samme strek, og ingen understrekede knapper.

## Grunnproblemene

### 1. Understrekinger
- Ingen understreking i navigasjon, tabell, «Konto», «Logg ut», «Lag flere», «Erstatt» eller «Slett».
- **Toppfeltet:** «Konto» har en liten initialsirkel (K) foran, «Logg ut» har et utgangsikon og står i grått. En hårlinje skiller dem.
- **Tabellrader og menyrader** er lenker uten strek. Hele raden er klikkbar, og en liten pil (›) ytterst til høyre viser det. Uke 37-raden på emnesiden er vist i hover-tilstand (lys flate, mørk pil).
- **«Lag flere», «Erstatt», «Slett», «Start»** er tekstknapper med ikon (+, sirkelpil, søppelbøtte, pil). «Slett» er rød. «Erstatt» på første fil er vist i hover-tilstand.
- **Kilden** («merkevare-notater.pdf, side 4») er den eneste lenken i løpende tekst. Den har en diskret, lys strek under og et filikon foran.

### 2. Dobbel informasjon
- Emnekortene på forsiden sier ikke lenger «X uker til eksamen», for det viser tidslinjen. Hvert kort viser i stedet:
  - antall kort og quizspørsmål
  - **«Neste å øve på»**: forelesningen som bør øves på nå, med grunnen («16 kort, ikke øvd ennå»)
  - en kort fremdrift («4 av 8 forelesninger øvd» med stolper)
  - én tydelig handling («Øv nå» →)
- Organisasjon og ledelse har ikke noe å øve på ennå. Kortet viser derfor «Neste steg: Uke 45: Ledelse» og omrissknappen «Lag flashcards».
- Undertittelen på emnesiden sier ikke «om 3 uker», fordi det står på linjen. Flashcardet viser ikke «Kort 7 av 24», fordi øktpanelet viser det.

### 3. Plass
- **Flashcard (07):** Kortet er 768 px bredt (ca. 56 tegn per linje i svaret, som er godt for lesing). Kort, knapper og hurtigtaster er sentrert som én gruppe, både vannrett og loddrett, i området til høyre for panelet. Knappene er like brede (208 px) og står rett under kortet.
- **Quiz (09):** Spørsmålet, svarene, forklaringen og knapperaden er én kolonne på 832 px, sentrert loddrett. Hurtigtastene står til venstre på samme linje som «Neste spørsmål», så raden avslutter kolonnen.
- **Forelesning (04):** Begge kolonnene slutter på samme høyde (y 824). Filer, opplasting og en kort personvernmerknad fyller venstre kolonne. Radene i «Lag og øv» er 96 px høye, så kortet blir like høyt. Det står ingen tom halvdel igjen nederst.
- **Emnesiden (03):** Tabellen og kortet «Øv på hele emnet» slutter på samme linje. Plassen under handlingene brukes til «Siste økt» (Quiz, Uke 37, 12 av 15 riktige).

### 4. Håndverk
- **8-punkts rutenett:** Kanter, kortstørrelser, radhøyder (32 i menyen, 44 i tabellen, 80 og 96 på forelesningssiden) og avstander er delelige med 8. To unntak: rutenettet i øktpanelet (35 px ruter med 6 px mellomrom, slik at seks ruter fyller 240 px nøyaktig) og grunnlinjene til teksten.
- **Felles venstrekanter:** Innholdet starter på x 352 ved siden av sidemenyen. På forsiden står både «Semesterlinje», emnenavnene og tekstene i kortene på x 120. Emneprikken i kortene henger i margen, slik at teksten står rett.
- **Tekstbredder er målt** med SF Pro i Chrome. Derfor står ikoner, understreker og knappetekster riktig i forhold til teksten.
- **Tabulære tall** overalt (`font-variant-numeric: tabular-nums`). Datoer, kort og quiz står i rette kolonner, og tallene i Kort og Quiz er høyrejustert.
- **Linjeikoner** er tegnet på et rutenett på 16 px med 1,5 px strek: fil, opplasting, pil, pil til høyre, sjekk, kryss, pluss, erstatt, slett, logg ut og lås.
- **Tidslinjen:** Forklaringen står i panelets topprad og kolliderer ikke med linjene. «I dag 10.11» er en liten svart pille. Ukenummer og dato står under stasjonene. «3 uker igjen» står under den stiplede delen, slik at det ikke krasjer med «I dag». På forelesningssiden markerer «Du er her» en ring rundt stasjonen med en loddrett nål.
- **Tilstander:** Hover vises på en tabellrad (03) og på «Erstatt» (04). Fokusring vises på «Kunne» (07) og «Neste spørsmål» (09). Jobben som pågår har en snurr med lys sporring.

### 5. Universell utforming
- Kontrasten er målt (tabellen under). All tekst har minst 4,5:1.
- Riktig og feil vises med symbol og tekst: «✓ Riktig svar», «✗ Ditt svar», og ✓ og ✗ i rutenettet og forklaringen.
- Status vises også med form, ikke bare farge: fylt prikk betyr øvd, hul prikk betyr ikke øvd. Det gjelder på linjen, i tabellen og i menyen.
- Omrissknappene og opplastingsfeltet har en kant med 3,2:1 mot papiret (WCAG 1.4.11).
- Fokusringen er 2 px blå (#2A5BD7) med 2 px luft rundt knappen.
- Hurtigtastene står i hint-linjen og bak «? Hurtigtaster». Enkelttaster må kunne skrus av (WCAG 2.1.4).

## Palett (målt kontrast, WCAG)

| Hex | Rolle | Kontrast |
|---|---|---|
| `#F7F7F5` | Papir: bakgrunn, litt renere og kjøligere enn F (#F6F5F1) | – |
| `#FFFFFF` | Flater: paneler, kort, tabell, flashcard, svaralternativer | – |
| `#15181F` | Blekk: tekst, svarte knapper, «I dag», eksamensmerke | 16,6:1 på papir, 17,8:1 på hvitt, 15,0:1 på valgt rad |
| `#5A6070` | Sekundær grå: undertekst, status, etiketter, hint | 5,9:1 på papir, 6,3:1 på hvitt, 5,3:1 på valgt rad, 5,5:1 på merknadsflaten |
| `#858B96` | Kant på omrissknapper og opplastingsfelt | 3,2:1 på papir (grafikk) |
| `#DCDCD6` / `#E9E9E4` | Kortkant og skillelinjer (ikke tekst) | – |
| `#ECECE7` | Valgt rad i menyen, hover på tekstknapp | – |
| `#F5F5F2` | Hover-rad i tabellen | Blekk 16,3:1, grå 5,8:1 |
| `#A3A8B2` | Svake pil-ikoner i tabellen (pynt, raden er lenken) | 2,4:1, ikke tekst |
| `#B83E0C` | Markedsføring: linje, stasjoner og emneprikk | 5,3:1 på papir, 5,6:1 på hvitt |
| `#0B6585` / `#2D6A3B` | Samfunnsøkonomi og Organisasjon og ledelse | 6,5:1 på hvitt |
| `#1C6E36` / `#E8F3EB` | Riktig og kunne | 5,5:1 på tonet flate |
| `#B42318` / `#FCEBE9` | Feil, kunne ikke og «Slett» | 5,7:1 på tonet flate, 6,6:1 på hvitt |
| `#2A5BD7` | Fokusring | 5,5:1 på papir |

Hvit tekst på svarte knapper har 17,8:1.

## Skrift

**SF Pro** via `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif`. Én familie hele veien. Hierarkiet kommer fra størrelse, vekt (400, 500 og 600) og farge, ikke fra flere skrifttyper. Store titler har litt negativ sperring (-0,5 px), slik SF Display er laget for.

**Erstatning i den ekte appen:** **Inter** (Google Fonts, gratis). Den ligner SF Pro i form og spennvidde, har vektene 400, 500 og 600, og har tabulære tall (`font-feature-settings: "tnum"`).

| Nivå | Størrelse / vekt |
|---|---|
| Sidetittel | 32 / 600, sperring -0,5 |
| Quizspørsmål | 26 / 600 |
| Seksjonstittel | 18 / 600 |
| Radtittel, kortnavn | 16–17 / 600 |
| Flashcard: spørsmål / svar | 20 / 600 og 24 / 400 med 36 px linjeavstand |
| Brødtekst, tabell, meny | 15–16 / 400–500 |
| Metatekst | 13–14 / 400 |
| Etiketter (EMNER, ØKT, SVAR, måneder) | 12 / 600 versaler, sperring 0,8 |
| Teller i øktpanelet | 44 / 600, «/ 24» 20 / 400 grå |

**Form:** knapper 8 px hjørner, kort og paneler 12 px, flashcardet 16 px. Flatene har 1 px kant og nesten usynlig skygge (1 px ned, 4 %). Flashcardet har i tillegg en myk, lav skygge, så det ligger over resten.

## Knapper

- **Svart fylt:** det Klara gjør oftest: «Øv nå», «Øv på flashcards», «Kunne», «Neste spørsmål».
- **Omriss (hvit med kant):** sjeldne eller sekundære valg: «Nytt emne», «Ny forelesning», «Lag fritekstspørsmål», «Lag sammendrag», «Lag flashcards», «Velg PDF», «Kunne ikke», «Avslutt økt».
- **Tekstknapp med ikon:** «Lag flere», «Erstatt», «Slett», «Start», «Åpne».

## Styrker

- Ser ferdig ut. Kantene står rett, kolonnene slutter på samme høyde, og tall og tekst står presist.
- Ingen understrekede knapper. Ikonene og vekten gjør jobben, og det eneste understrekede er kildelenken.
- Forsidekortene gir et nytt svar («hva bør jeg øve på nå?») i stedet for å gjenta tidslinjen.
- Øvingssidene har en rolig komposisjon som tåler lengre tekst.
- Lett å bygge: én skriftfamilie, få farger, tre knappeklasser og et lite ikonsett.

## Svakheter og risiko

- Hvite kort på papir gir flere rammer enn i F. Det er ryddig, men litt mer «app» og mindre «papir».
- SF Pro finnes bare på Apple-maskiner. Andre maskiner får Helvetica eller Arial, med mindre appen laster inn Inter.
- Pil-ikonene i tabellen har lav kontrast (2,4:1). Det går fordi hele raden er lenken og pilen bare er pynt, men det bør sjekkes i den ekte appen.
- Hvert emnekort med innhold har en svart «Øv nå». Med mange emner blir det mye svart på forsiden.
- «Neste å øve på» krever en enkel regel i appen, for eksempel den eldste forelesningen med innhold som ikke er øvd. Den regelen er ikke beskrevet i PRD-en.
- Lange forelesningsnavn kortes fortsatt av i menyen («Segmentering og posi…»).

## Egne tolkninger

- Forelesningsnavnene for Samfunnsøkonomi («Uke 39: Pengepolitikk») og Organisasjon og ledelse («Uke 45: Ledelse») er funnet på. Det samme er «Siste økt: 12 av 15 riktige» på emnesiden.
- «Nytt emne» og «Ny forelesning» er omrissknapper, i tråd med Siljes regel om omriss for sjeldne handlinger. I F var «Nytt emne» svart.
- Personvernmerknaden på forelesningssiden er hentet fra vilkårene (side 5). Den fyller plassen med noe nyttig.
- Merket «Hører hjemme i Uke 37» på flashcardet er fjernet, fordi øktpanelet allerede viser omfanget. På quizen (hele emnet) står forelesningen igjen ved kilden.
- I menyen står ukenummeret som eget tall foran navnet («37 Merkevare»), så færre navn må kortes av.

Generator: `scratchpad/hf/genF2.py` (bruker tegnbredder målt i Chrome, `scratchpad/hf/f2/m/widths.json`).
