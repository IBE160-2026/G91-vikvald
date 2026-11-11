# Hybrid F: Semesterlinjen, ryddet

**Personlighet:** Den samme rolige semesterlinjen og den enkle sidemenyen fra Hybrid E, men stillere: én papirfarge, færre knappetyper, lettere skrift og oransje bare der emnet faktisk vises.

Hybrid F er Hybrid E med sju avtalte endringer. Retningen, oppsettet og innholdet er det samme.

## De sju endringene

1. **Hurtigtastlisten er fjernet fra sidemenyen** (03, 04). I stedet står en liten lenke nederst i menyen: «?  Hurtigtaster». Øktpanelet (07, 09) har heller ingen tasteliste, og «Esc» er flyttet fra knappen «Avslutt økt» til hint-linjen. Hint-linjen under kortet og quizen står igjen, men dempet: tastene har bare en hårlinje (ingen skygge), og teksten er 14 px i sekundær grå.
2. **Færre knappetyper.** Appen bruker to stiler pluss én omrissknapp:
   - **Svart fylt** for hovedhandlingen, maks én per rad eller seksjon («+ Nytt emne», «Øv på flashcards», «Øv nå», «Lag fritekstspørsmål», «Lag sammendrag», «Kunne», «Neste spørsmål»).
   - **Tekstlenke** (understreket) for resten: «Lag flere», «Erstatt», «Slett» (rød tekst, ingen rød boks), «Ta quiz», «Fritekstspørsmål», «Åpne emne», «Konto», «Logg ut».
   - **Omriss** for sekundære knapper: «+ Ny forelesning», «Velg PDF», «Kunne ikke», «Avslutt økt».
   På forelesningssiden har hver rad med innhold «Øv nå» som hovedknapp, og rader uten innhold har «Lag …» som eneste hovedknapp. Alle hovedknappene i listen er like brede (208 px), så kolonnen blir rolig.
3. **Oransje (#B83E0C) bare på emnelinjen:** tidslinjen, stasjonene og emneprikken. Status («Ikke øvd ennå», «Ingen ennå», «Ikke laget», «Øvd 03.11», «24 kort») står i sekundær grå med fylt prikk (har innhold / øvd) eller hul prikk (mangler / ikke øvd). Jobben «Lager quizspørsmål …» har nøytral flate (#ECEAE4) og blekkfarget snurr. Valgt rad i menyen har nøytral flate (#ECEAE4) med en 3 px blekkstrek til venstre. Logoen er i blekk, og stasjonsmerket «Uke 37: Merkevare» har blekktekst (bare selve stasjonen er oransje). På forsiden er fargestripene på emnekortene byttet med en emneprikk, og fremdriftsstolpene er i blekk.
4. **Stolpediagrammet på emnesiden er fjernet.** Linjen med stasjoner, månedsetiketter, ukenumre og datoer, «I dag 10.11», «3 uker igjen» (nå som ren tekst over den stiplede delen, uten tonet boks) og eksamen står igjen. Forklaringen viser bare Øvd, Ikke øvd ennå og Eksamen. Tabellen er uendret og har flyttet litt opp.
5. **Meny, toppfelt og innhold har samme papirfarge** (#F6F5F1), skilt bare med hårlinjer (#D6D3CB). Semesterbåndet på forelesningssiden er også i papirfarge. Hvitt brukes bare på flater som skal skille seg ut: flashcardet, svaralternativene i quizen og emnekortene på forsiden.
6. **Mildere skrift.** Helvetica Neue overalt. Sidetitler 700 (før 800), seksjonstitler og radtitler 600, knappetekst 600. Svaret på flashcardet er 26 px i vanlig vekt (400) med 40 px linjehøyde, og spørsmålet er 22 px / 600 i blekk. Hierarkiet holdes av størrelse og plassering i stedet for tykkelse.
7. **Flashcardet har tynn kant** (1 px #D6D3CB), 8 px hjørner og en svært myk skygge (6 px ned, 14 px uskarphet, 6 % opasitet). Den harde, forskjøvne skyggen er borte.

Forsiden (02) har fått endring 3, 5 og 6, men har ellers samme komposisjon som før, uten sidemeny.

## Palett (målt kontrast, WCAG)

| Hex | Rolle | Kontrast |
|---|---|---|
| `#F6F5F1` | Papir: bakgrunn i meny, toppfelt og innhold | – |
| `#FFFFFF` | Bare flashcard, svaralternativer og emnekort | – |
| `#161B26` | Blekk: tekst, svarte knapper, valgt-strek, «I dag» | 15,8:1 på papir, 17,2:1 på hvitt, 14,3:1 på valgt-flate |
| `#4B5262` | Sekundær grå: undertekst, status, etiketter, hurtigtast-hint | 7,2:1 på papir, 7,8:1 på hvitt, 6,5:1 på valgt-flate |
| `#D6D3CB` | Hårlinjer, kortkant, tastekanter (ikke tekst) | – |
| `#ECEAE4` | Valgt rad i menyen, jobbflate, tomme fremdriftsruter | – |
| `#B83E0C` | Markedsføring: linje, stasjoner og emneprikk (ikke tekst) | 5,2:1 mot papir som grafikk |
| `#0B6585` / `#2D6A3B` | Samfunnsøkonomi og Organisasjon og ledelse: linje og prikk | 6,5:1 på hvitt |
| `#1D7037` / `#E6F2E9` | Riktig og kunne | 5,3:1 på tonet flate |
| `#B42318` / `#FBE8E6` | Feil, kunne ikke og «Slett»-lenken | 5,6:1 på tonet flate, 6,0:1 på papir |
| `#1F56D6` | Fokusring, 3 px med luft rundt | 5,7:1 mot papir |

All tekst har minst 4,5:1. Hvit tekst på svarte knapper har 17,2:1.

## Typografi

| Nivå | Størrelse / vekt |
|---|---|
| Sidetittel | 36–40 px / 700 (quizspørsmålet 30 px / 700) |
| Seksjonstittel | 20 px / 600 |
| Radtittel (Flashcards, Quiz …) | 18 px / 600 |
| Flashcard: spørsmål | 22 px / 600, blekk |
| Flashcard: svar | 26 px / 400, linjehøyde 40 px |
| Brødtekst og tabell | 15–18 px / 400 |
| Små etiketter (EMNER, ØKT, SPØRSMÅL, SVAR, måneder) | 12 px / 600 versaler med sperring |
| Teller i øktpanelet | 52 px / 700, «/ 24» 28 px / 400 grå |

## Sidemenyen

- 300 px bred, samme papirfarge som innholdet og skilt fra det med én hårlinje.
- **Forsiden (02) har ingen sidemeny.** Semesterkartet viser alle emnene der.
- **Emnesiden og forelesningssiden (03, 04):** «EMNER» og et enkelt tre med pil, emneprikk, navn og antall. Valgt rad har lys nøytral flate og blekkstrek til venstre. Lange navn kortes av med «…». Helt nederst står bare lenken «?  Hurtigtaster», som åpner hele listen.
- **Under øving (07, 09):** menyen blir et øktpanel med type, omfang, teller, tynn fremdriftsstripe, rutenett med ✓ / ✗ / · og forklaring. «Avslutt økt» er en omrissknapp nederst. Ingen tasteliste.

## Universell utforming

- All tekst har minst 4,5:1 kontrast (se tabellen).
- Status skilles på tekst og form, ikke bare farge: fylt eller hul prikk i tabellen og listene, fylt eller hul stasjon på linjen.
- Riktig og feil vises med symbol og tekst: «✓ Riktig svar», «✗ Ditt svar», ✓ og ✗ i rutenettet.
- Tekstlenker er understreket, så de kan kjennes igjen uten farge. «Slett» er rød og understreket og bør be om bekreftelse.
- Synlig fokusring på «Kunne» (07) og «Neste spørsmål» (09).
- Hurtigtastene finnes fortsatt (lenken i menyen og hint-linjen på øvingssidene). Enkelttaster må kunne skrus av (WCAG 2.1.4).

## Styrker

- Roligere enn E: én bakgrunnsfarge, færre bokser, færre knappetyper og oransje bare på linjen. Når oransje bare betyr «emnet og tiden», blir linjen tydeligere.
- Knappebruken er forutsigbar: det svarte er alltid det viktigste, tekstlenker er alltid «mer», og omriss er alltid et sekundært valg.
- Flashcardet er lettere å lese: vanlig vekt i svaret og tynn kant i stedet for tung skygge.
- Emnesiden har fått luft når stolpene er borte, og tabellen får plass uten trengsel.
- Enkel å bygge i HTML/CSS: få farger, to knappeklasser og en lenkeklasse.

## Svakheter og risiko

- Når meny og innhold har samme farge, er det bare hårlinjen som skiller dem. På dårlige skjermer kan grensen bli svak.
- Uten stolpene viser emnesiden ikke lenger hvor mye øvingsinnhold hver forelesning har på linjen. Det står bare i tabellen (kolonnene Kort og Quiz).
- Fire svarte knapper over hverandre i «Lag og øv» er mye svart i én kolonne, selv om det er én per rad.
- Hurtigtastene er mindre synlige enn i E. Brukere som liker tastatur må finne lenken først.
- Lange forelesningsnavn kortes fortsatt av i menyen, og semesterlinjen trenger eksamensdato, som ikke er krav i PRD-en i dag.
