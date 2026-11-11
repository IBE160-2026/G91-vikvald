# F1 «Redaksjonell»: hybrid F, gjennomarbeidet som et fagtidsskrift

**Personlighet:** Varm, rolig og trygg, som et godt fagtidsskrift. En serif med karakter bærer titler, store tall og selve lærestoffet. En rolig, humanistisk sans tar seg av alt brukergrensesnittet.

Struktur, sider og innhold er de samme som i hybrid F. Forsiden har fortsatt ingen sidemeny og viser den store tidslinjen. Emnesiden og forelesningssiden har en enkel sidemeny med emnetre. Under øving blir sidemenyen et øktpanel. Det som er nytt, er håndverket: et bevisst skriftpar, et fast rutenett, linjeikoner og mer gjennomtenkte avstander.

## Grunnproblemene, ett for ett

1. **Understrekinger:** Navigasjonen, tabellradene, «Konto», «Logg ut», «Lag flere», «Erstatt» og «Slett» har ikke lenger understreking. «Konto» og «Logg ut» har linjeikon foran (person og utgang). «Lag flere» har pluss, «Erstatt» har to piler i ring, og «Slett» har søppelbøtte i rød. Tabellrader og listevalg viser at de kan klikkes med en diskret pil (›) eller →. Den eneste understrekingen er i kildehenvisningen («merkevare-notater.pdf, side 4»). Den er tegnet som en tynn, dempet linje (1 px, grå) i stedet for nettleserens tykke standardstrek.
2. **Dobbel informasjon:** Forsidekortene gjentar ikke lenger «X uker til eksamen», for det viser tidslinjen. Hvert kort sier i stedet hva som er neste steg: «Neste å øve på: Uke 38: Markedsmiksen · 16 kort · ikke øvd ennå» med én knapp («Øv nå»), en kort fremdrift («4 av 8 forelesninger øvd») og «Åpne emne →». Organisasjon og ledelse har ikke øvingsinnhold ennå, så kortet viser «Neste steg» med omrissknappen «Lag kort».
3. **Plass:** Flashcardet er 784 px bredt (en god linjelengde for svaret), og kort, knapper og hint er sentrert loddrett som én gruppe. På quizsiden står forklaringen i to kolonner (overskrift til venstre, tekst til høyre, som i et tidsskrift), og «Neste spørsmål» står nederst til høyre på samme linje som tastehintene, adskilt med en hårlinje. På forelesningssiden er radene i «Lag og øv» 80 px høye, og opplastingsfeltet slutter på samme høyde som den siste raden. Begge kolonnene ender på 776 px, så det er ikke lenger en tom halvdel nederst. På emnesiden har høyrekolonnen fått en rad til («Huskeregler»), så den ender omtrent der tabellen ender.
4. **Håndverk:**
   - 8-punkts rutenett: toppfelt 72 px, sidemeny 304 px, innhold fra 368 til 1376 px (64 px marg), kolonneavstand 48 px, kortavstand 32 px, radhøyder 32/40 (meny), 36 (tabell), 64 (lister) og 80 (forelesningsrader).
   - Felles venstrekanter: logo, «EMNER», «ØVINGSØKT» og alt i menyen starter på 40 px. Alt innhold starter på 368 px. På forsiden starter alt på 40 px.
   - Teksten er plassert etter målte bredder. Bredden til hvert tegn er målt i Chrome, slik at etiketter ikke kolliderer og avkortinger («…») stemmer.
   - Tall har tabellsifre (`font-variant-numeric: tabular-nums`), og tallkolonnene Kort og Quiz er høyrestilt.
   - Tretten linjeikoner (fil, opplasting, pil, liten pil, sjekk, kryss, pluss, erstatt, søppel, person, utgang, tastatur og kortbunke) er tegnet på et 20 × 20-rutenett med samme strekbredde (1,5 px) og runde ender.
   - Tidslinjen: «I dag» er en mørk pille på egen høyde under månedene, og «3 uker igjen» står på linjen med ukenumrene, så de ikke kolliderer. Den stiplede delen er runde prikker, og stasjonen «Du er her · Uke 37» har en egen pille som ikke treffer stasjonene.
   - Rolige hovertilstander finnes i SVG-en som CSS (`:hover`). Tabellrader og lister får lys flate, og emnekortene får mørkere kant. De synes bare når siden åpnes i nettleseren, ikke på skjermbildene.
5. **Universell utforming:** Kontrasten er målt (se tabellen). Riktig og feil vises alltid med ikon og tekst («✓ Riktig svar», «✗ Ditt svar», ✓ og ✗ i rutenettet og på knappene). Synlig fokusring (2,5 px blå med luft) står på «Kunne» og «Neste spørsmål». Status skilles på fylt og hul prikk, ikke bare på farge.

## Palett (målt kontrast, WCAG 2.1)

| Hex | Rolle | Kontrast |
|---|---|---|
| `#F7F5F0` | Papir: bakgrunn i alt | – |
| `#FFFFFF` | Flater som skal skille seg ut: flashcard, svaralternativer, emnekort, semesterkart, opplastingsfelt | – |
| `#1D1C1A` | Blekk (varm svart): tekst, svarte knapper | 15,6:1 på papir, 17,0:1 på hvitt, 14,2:1 på valgt-flate |
| `#5C574F` | Varm sekundær grå: undertekst, status, etiketter | 6,6:1 på papir, 7,2:1 på hvitt, 6,0:1 på valgt-flate |
| `#DAD5CB` / `#E7E3DA` | Hårlinjer og kanter (ikke tekst) | – |
| `#EDEAE3` | Valgt rad, jobbflate, tomme fremdriftsruter, hover | – |
| `#B83E0C` | Markedsføring: linje, stasjoner og emneprikk | 5,2:1 mot papir |
| `#0B6585` / `#2D6A3B` | Samfunnsøkonomi og Organisasjon og ledelse | 6,5:1 på hvitt |
| `#1D7037` / `#E6F2E9` | Riktig og kunne | 5,3:1 på tonet flate |
| `#B42318` / `#FBE8E6` | Feil, kunne ikke og «Slett» | 5,7:1 på tonet flate, 6,0:1 på papir |
| `#1F56D6` | Fokusring | 5,7:1 mot papir (krav 3:1) |

All tekst har minst 4,5:1. Hvit tekst på svarte knapper har 17,0:1. Paletten er F sin, bare litt varmere (blekket og den grå har fått et varmt stikk, så de passer bedre til serifen og papirfargen).

## Skrift

| Rolle | Skrift (macOS) | Nærmeste gratis Google Fonts-skrift |
|---|---|---|
| Serif: logo, sidetitler, seksjonstitler, store tall, flashcardets spørsmål og svar, quizspørsmålet | **Charter** (fallback: Iowan Old Style, Bitstream Charter, Georgia, serif) | **Source Serif 4**. Alternativ: **Literata** eller **Newsreader** |
| Sans: brødtekst, knapper, tabeller, meny og etiketter | **Avenir Next** (fallback: Avenir, Segoe UI, Helvetica Neue, Arial) | **Nunito Sans**. Alternativ: **Figtree** |

| Nivå | Størrelse / vekt |
|---|---|
| Sidetittel | Charter 44–48 / 400 |
| Quizspørsmål | Charter 36 / 400 |
| Seksjonstittel (Filer, Lag og øv, Forelesninger, Forklaring) | Charter 22 / 700 |
| Emnenavn på kort, økttype i panelet | Charter 24–28 / 400 |
| Teller i øktpanelet | Charter 64 / 400, «/ 24» Charter 28 grå |
| Flashcard: spørsmål / svar | Charter 24 / 700 · Charter 26 / 400 med 42 px linjehøyde |
| Radtittel | Avenir Next 16–17 / 600 |
| Brødtekst og tabell | Avenir Next 15–17 / 400 |
| Etikett («kicker»: EMNER, SVAR, NESTE Å ØVE PÅ, måneder) | Avenir Next 12 / 600, versaler, 1,4 px sperring |

Charter har bare vanlig og fet vekt (ingen halvfet). Derfor er titlene i vanlig vekt og store, og seksjonstitlene er fete og små. Det gir kontrast uten mellomvekter.

## Former

- Hjørner: 6 px på knapper, 8 px på alternativer, kort og opplastingsfelt, og 12 px på flashcardet.
- Knapper: svart fylt for det Klara gjør oftest («Øv nå», «Øv på flashcards», «Kunne», «Neste spørsmål»). Omriss for sjeldne handlinger («Nytt emne», «Ny forelesning», «Velg PDF», «Lag fritekstspørsmål», «Lag sammendrag», «Lag kort», «Kunne ikke», «Avslutt økt»). Tekstknapper med ikon for resten.
- Flashcardet har en tynn kant og en svært myk, todelt skygge.

## Styrker

- Ser ut som et ferdig produkt. Det tydelige skriftparet gir en egen identitet uten å legge til farger eller pynt.
- Lærestoffet (spørsmål, svar og forklaring) står i serif og leses som en tekst, ikke som et skjema. Det passer til en app som handler om å lese og huske.
- Forsidekortene er nyttige: de sier hva Klara bør gjøre nå, i stedet for å gjenta tidslinjen.
- Ingen understreking i grensesnittet. Lenker og handlinger kjennes igjen på ikon, vekt og plassering.
- Fast rutenett og målte tekstbredder, så ting står presist og ingenting kolliderer.

## Svakheter og risiko

- To skrifter må lastes i den ekte appen (Source Serif 4 og Nunito Sans). Det gir litt mer å laste, og bør begrenses til de vektene som faktisk brukes (400 og 700 for serif, 400 og 600 for sans).
- Charter finnes bare på Mac. På Windows faller skissen tilbake til Georgia, som ser annerledes ut, derfor Google Fonts-erstatningen.
- Uten understreking må lenkene kjennes igjen på ikon og plassering. Kildehenvisningen beholder en diskret strek, men dette må testes med brukere.
- Hovertilstandene er bare CSS i SVG-en og synes ikke på skjermbildene.
- Navnene «Uke 39: Elastisitet» og «Uke 44: Struktur og roller» på forsidekortene er eksempler laget for skissen. De står ikke i det opprinnelige innholdet.
- Lange forelesningsnavn kortes fortsatt av i menyen («Segmentering og po…»).
