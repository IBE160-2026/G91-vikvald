# F3 «Varm»: Semesterlinjen med emnets farge

**Personlighet:** Den samme rolige hybrid F, men varmere. Det som hører til et emne, får en svak tone av emnets farge, og en vennlig, rund skrift gjør at appen føles mer som en studiekamerat og mindre som et skjema.

Strukturen, sidene og innholdet er de samme som i hybrid F. Endringen er håndverket og varmen: en fast avstandsskala, ekte skriftmåling, linjeikoner, ingen understreking i navigasjon og en tydelig regel for hvor farge brukes.

## Regelen for farge

Emnefargen brukes på to måter:

1. **Sterk farge** (#B83E0C, #0B6585, #2D6A3B) på det som er emnet og tiden: linjen, stasjonene, emneprikken og fremdriften i økten.
2. **Svak tone av samme farge** på flater som *hører til* emnet:
   - forsiden (02): hvert emnekort har sin egen tone (korall, lys blå eller lys grønn)
   - emnesiden (03): hele toppfeltet med tittel og semesterlinje
   - forelesningssiden (04): semesterbåndet øverst, valgt rad i menyen, jobben «Lager quizspørsmål …» og sirkelen rundt opplastingsikonet
   - øving (07, 09): hele øktpanelet og kildefoten nederst på flashcardet

Alt annet står på varmt papir (#F8F5F0) eller hvitt. Riktig/feil har fortsatt grønt og rødt, og hovedknappene er fortsatt svarte, så fargen aldri konkurrerer med det Klara skal gjøre.

## Grunnproblemene

### 1. Understreking
Ingen understreking i navigasjon, tabell eller knapper. «Konto» og «Logg ut» har et lite person- og døråpner-ikon. Radene i tabellen på emnesiden har halvfet tittel og en diskret pil (›) til høyre. «Lag flere» har et pluss, «Erstatt» to piler og «Slett» en søppelbøtte i rødt. «Ta quiz» og «Fritekstspørsmål» har en pil til høyre. «Hurtigtaster» har et tastaturikon. Det eneste som er understreket, er kildehenvisningen («merkevare-notater.pdf, side 4»), som er en lenke i løpende tekst. Den har en tynn, grå strek i stedet for standard understreking.

### 2. Dobbel informasjon
Forsidekortene gjentar ikke lenger «X uker til eksamen», fordi tidslinjen viser det. Hvert kort viser nå:
- tall for emnet (forelesninger, kort, quizspørsmål)
- fremdrift som en stripe i emnefargen: «4 av 8 forelesninger øvd»
- **«Neste å øve på: Uke 38: Markedsmiksen»** med «16 flashcards · ikke øvd ennå» og én tydelig handling, «Øv nå»

Organisasjon og ledelse har ikke noe å øve på ennå. Det kortet sier «Neste steg: Uke 45: Motivasjon – 1 PDF lastet opp · ingen kort» og har omrissknappen «Lag kort». «Åpne emne» er byttet med en pil ved emnenavnet.

### 3. Plass
- **Forsiden:** kartet og kortene fyller skjermen med jevn luft. Kartet har fått en kolonneetikett («EMNE») og forklaringen på egen linje, slik at den ikke kolliderer med siste emne.
- **Emnesiden:** tabellen har raden 40 px og går nesten til bunnen. Kolonnene er rettet opp (tall høyrejustert), og statusen har fått plass.
- **Forelesningssiden:** radene i «Lag og øv» er 96 px høye, filene 88 px og opplastingsfeltet 240 px. Begge kolonnene slutter på samme høyde (ca. 830 px), så den tomme halvdelen nederst er borte. Innholdet i opplastingsfeltet er sentrert i høyden.
- **Flashcard:** kort, knapper og hint er regnet ut som én blokk og sentrert i høyden i innholdsfeltet. Kortet er 832 px bredt, så svaret får ca. 60 tegn per linje.
- **Quiz:** spørsmål, alternativer, forklaring og knapperad fyller høyden med jevne avstander. Forklaringen er begrenset til ca. 760 px bredde, så linjene ikke blir for lange. «Neste spørsmål» står rett under forklaringen, på samme linje som hurtigtastene.

### 4. Håndverk
- **Avstandsskala:** 8 px-trinn (8, 16, 24, 32, 40, 48, 64). Sidemarg 64 px, kortpolstring 32 px på forsiden og 48 px på flashcardet.
- **Felles venstrekanter:** forsiden står på x = 64. Sidene med meny står på x = 364, og høyre kant er 1376 på alle sider.
- **Tekstbredder** regnes ut fra de ekte målene i Avenir Next, så avkortinger («Uke 34: Hva er markedsfø…»), sentrering i knapper og plassering av ikoner stemmer.
- **Tabulære tall** (`font-variant-numeric: tabular-nums`) og høyrejusterte tallkolonner.
- **Linjeikoner** med samme strek (1,75 px, runde ender): pluss, pil, sjekk, kryss, fil, opplasting, bytt, søppelbøtte, person, logg ut, tastatur og pil i menyen.
- **Tidslinjen:** «I dag»-merket er en pille som ikke overlapper etiketter. «3 uker igjen» står over den stiplede delen. Eksamen er et svart kvadrat med etikett til høyre. Den stiplede delen er runde prikker. På forelesningssiden står «Du er her · Uke 37» som en mørk pille sentrert over stasjonen.
- **Detaljer:** Hjørnene er 8 px på knapper, 10–12 px på kort og 14 px på flashcardet. Skyggen på flashcardet er svært myk og varm, og knapperammene er 1,5 px. Valgt rad i menyen har tonet flate og en kort, avrundet strek i emnefargen.
- **Fokus:** synlig blå fokusring (3 px, 5 px luft) på «Kunne» (07) og «Neste spørsmål» (09).

### 5. Universell utforming
Se tabellen under. All tekst er målt mot flaten den står på, også de tonede. Riktig/feil har symbol og tekst («✓ Riktig svar», «✗ Ditt svar», ✓/✗ i rutenettet). Status skilles på form (fylt eller hul prikk), ikke bare farge.

## Palett (målt kontrast, WCAG 2.1)

| Hex | Rolle | Kontrast (tekst) |
|---|---|---|
| `#F8F5F0` | Varmt papir, bakgrunn | – |
| `#FFFFFF` | Hvite flater: tidslinjepanel, flashcard, svaralternativ, forklaring, opplastingsfelt | – |
| `#241D19` | Varmt blekk: tekst og svarte knapper | 15,3 papir · 16,6 hvit · 14,7 korall · 13,2 valgt rad · 14,8 blå tone · 14,8 grønn tone |
| `#5F564F` | Varm sekundærgrå: undertekst, status, etiketter | 6,6 papir · 7,2 hvit · 6,4 korall · 5,7 valgt rad · 6,4 blå tone · 6,4 grønn tone |
| `#E3DCD2` / `#EEE8DF` | Hårlinjer / svake skillelinjer (ikke tekst) | – |
| `#B83E0C` | Markedsføring: linje, stasjoner, prikk, fremdrift (grafikk) | 5,2 papir · 5,0 korall · 4,46 valgt rad (krav for grafikk: 3,0) |
| `#FBEFE7` | Korall tone: Markedsføring-flater | – |
| `#F6E1D4` | Sterkere korall: valgt rad i menyen, tomme fremdriftsruter | – |
| `#953007` | Mørk terrakotta: opplastingsikon og snurr på tonet flate | 6,9 korall |
| `#0B6585` / `#EAF3F6` | Samfunnsøkonomi: linje og prikk / kortflate | 5,8 på egen tone (grafikk) |
| `#2D6A3B` / `#EDF4EC` | Organisasjon og ledelse: linje og prikk / kortflate | 5,8 på egen tone (grafikk) |
| `#1D7037` / `#E4F1E7` | Riktig, kunne | 5,3 på grønn flate |
| `#B42318` / `#FBE7E4` | Feil, kunne ikke, «Slett» | 5,5 på rød flate · 6,1 papir |
| `#1F56D6` | Fokusring | 5,8 papir · 6,3 hvit |

Hvit tekst på svarte knapper har 16,6:1. Kontrasten er regnet ut i generatoren (`genF3.py --kontrast`) med WCAG-formelen.

## Skrift

**Avenir Next** (macOS) i fire vekter: Regular 400 til brødtekst, Medium 500 til små tall og etiketter, Demi Bold 600 til titler og knapper, Bold 700 til sidetitler og telleren. Skriften er geometrisk, men med åpne, runde former, og føles vennligere enn Helvetica uten å bli barnslig.

Fallback-stabel: `'Avenir Next', Avenir, 'Nunito Sans', 'Helvetica Neue', Arial, sans-serif`.

**Google Fonts-erstatning i den ekte appen: Nunito Sans.** Den har samme runde, åpne karakter og alle vektene vi bruker. (Alternativ: «Mulish», som er litt smalere.)

| Nivå | Størrelse / vekt |
|---|---|
| Sidetittel | 40 px / 700 (forelesning 36, quizspørsmål 30) |
| Seksjonstittel | 20 px / 600 |
| Radtittel, kortnavn | 17–22 px / 600 |
| Flashcard: spørsmål / svar | 22 px / 600 · 24 px / 400, linjehøyde 38 |
| Brødtekst, tabell | 15–17 px |
| Små etiketter (EMNER, ØKT, SVAR, måneder) | 12 px / 600, versaler, sperret 1,4 |
| Teller i øktpanelet | 52 px / 700 og «/ 24» 26 px / 500 |

## Styrker

- Fargen gir tilhørighet: Klara ser med en gang hvilket emne hun er i, både i menyen, på emnesiden og mens hun øver. Fargen betyr alltid det samme, nemlig emnet.
- Forsiden er mer nyttig: hvert kort sier hva hun bør øve på nå, og har én handling.
- Ingen understreking i grensesnittet. Ikoner og vekt gjør jobben, og bare kildelenken ser ut som en lenke.
- Rolig helhet: bare to knappestiler, svarte knapper bare der hun øver eller går videre, og hvite flater bare der innholdet skal leses.
- Skriften er varmere og føles mer gjennomarbeidet enn Helvetica.

## Svakheter og risiko

- Tonede flater må holdes i sjakk når det kommer flere emner. Med mange emner trengs flere toner, og de må måles hver for seg.
- Den korallfargede tonen på emnesiden (03) er et stort felt. På en skjerm med mye metning kan den virke rosa. Den kan dempes mot papir hvis det blir for mye.
- Grønn tone på Organisasjon og ledelse ligger nær «riktig»-grønt. Det går fordi riktig/feil alltid har symbol og tekst, men det kan være lurt å velge en annen emnefarge.
- Avenir Next finnes bare på Apple-maskiner. I den ekte appen må vi laste Nunito Sans, og da endrer bredder seg litt.
- Samfunnsøkonomi og Organisasjon og ledelse har fått tenkte forelesningsnavn på forsiden (Uke 39: Konkurranseformer, Uke 45: Motivasjon). De må erstattes med ekte data.
