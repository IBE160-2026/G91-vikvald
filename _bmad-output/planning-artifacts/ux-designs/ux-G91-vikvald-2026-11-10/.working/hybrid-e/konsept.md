# Hybrid E: Semesterlinjen med enkel sidemeny

**Personlighet:** Semesterlinjens rolige, lyse papir og tydelige tidslinje, med en stille sidemeny som gjør det raskt å bytte forelesning og som blir et øktpanel når Klara øver.

## Hva er hentet hvorfra

| Del | Hentet fra | Endring |
|---|---|---|
| Forsiden (02) | Semesterlinjen, uendret oppsett uten sidemeny | Bare feil er rettet: eksamen i Markedsføring er 04.12 (ikke 08.12), og da er det «om 3 uker» både på linjen og på kortet. |
| Toppfelt | Semesterlinjen | Brødsmulestien og jobbmerket i toppfeltet er fjernet. Sidemenyen viser allerede hvor Klara er, og jobben vises der den hører til (i Quiz-raden på side 04). |
| Sidemeny med emnetre (03, 04) | Tastaturet først | «EMNER», et enkelt tre med pil, navn og antall. Forelesningene er rykket inn, og den valgte raden har en lys tonet flate. Under ligger en diskret liste over hurtigtaster. Emnefargen vises bare som en liten prikk ved emnenavnet. |
| Øktpanel (07, 09) | Tastaturet først | «ØKT», type og omfang, stor teller (7 / 24), tynn fremdriftsstripe, rutenett med ✓ / ✗ / · per kort eller spørsmål, forklaring av symbolene og «Avslutt økt» nederst. |
| Emnesiden (03) | Semesterlinjen | Den store semesterlinjen med søyler for kort og quiz, tabellen «Forelesninger etter dato» og «Øv på hele emnet». Tilpasset smalere bredde: uketallet står alene under stasjonen, kolonnen «Filer» er kuttet (totalen står i undertittelen), og «Øv på hele emnet» står uten ramme. |
| Forelesningssiden (04) | Semesterlinjen | Et smalt semesterbånd øverst i innholdet med «Du er her · Uke 37». Filer og «Lag og øv» er lister med hårlinjer i stedet for separate bokser, og de små datastolpene er kuttet. |
| Flashcard (07) | Semesterlinjen | Samme kort med papirkant, kilde og stasjonsmerket «Uke 37: Merkevare · 11.09». Fremdriftslinjen og semesterbåndet nederst er fjernet, fordi øktpanelet viser fremdriften. |
| Quiz (09) | Semesterlinjen + Tastaturet først | Alternativene står i full bredde over hverandre, og forklaringen står under (som i Tastaturet først). Forklaringen har bare en strek i venstre kant, ingen boks. Kilde og «Hører hjemme i Uke 37» står på én linje. |

Rettet i tillegg: forelesningen 11.09.2026 var en fredag (ikke torsdag), og emnet har 11 filer (summen av forelesningene), ikke 13.

## Palett (målt kontrast)

| Hex | Rolle | Kontrast |
|---|---|---|
| `#F6F5F1` | Bakgrunn i innholdet (lyst papir) | – |
| `#FFFFFF` | Toppfelt, sidemeny, kort, svaralternativer | – |
| `#161B26` | Blekk: tekst, primærknapper, «I dag»-strek | 15,8:1 på papir, 17,2:1 på hvitt, 15,1:1 på valgt-flate |
| `#4B5262` | Sekundærtekst, etiketter, hurtigtast-tekst | 7,2:1 på papir, 7,8:1 på hvitt |
| `#D6D3CB` / `#ECEAE4` | Hårlinjer, rutenett, tomme celler (pynt, ikke tekst) | – |
| `#FBEDE5` | Valgt rad i treet, «3 uker igjen», pågående jobb | – |
| `#B83E0C` | Markedsføring-linjen, «Ikke øvd ennå», stasjonsmerket | 5,6:1 på hvitt, 5,2:1 på papir, 4,9:1 på valgt-flate |
| `#0B6585` | Samfunnsøkonomi | 6,5:1 på hvitt |
| `#2D6A3B` | Organisasjon og ledelse | 6,5:1 på hvitt |
| `#1D7037` / `#E6F2E9` | Riktig og kunne | 5,3:1 på tonet flate, 6,1:1 på hvitt |
| `#B42318` / `#FBE8E6` | Feil, kunne ikke og sletting | 5,6:1 på tonet flate, 6,6:1 på hvitt |
| `#1F56D6` | Fokusring, 3 px med luft rundt elementet | 5,7:1 mot papir |

Ingen mørke flater ut over primærknappene og de små «Du er her»- og stasjonsmerkene.

## Typografi

- `'Helvetica Neue', Arial, sans-serif` for alt, også datoer og månedsetiketter (Semesterlinjens monospace er tatt bort).
- Sidetitler 36–40 px / 800, seksjonstitler 20 px / 800, brødtekst 15–18 px, kortsvar 30 px / 700, teller i øktpanelet 52 px / 800.
- Små etiketter (EMNER, HURTIGTASTER, ØKT, SPØRSMÅL, AUG–DES) er 12 px / 700 versaler med sperring.
- Hurtigtast-merkene er små hvite taster med hårlinjekant og 12 px fet tekst. De står bare i sidemenyen og i én diskret linje under knappene på øvingssidene.

## Sidemenyens oppførsel

- Fast bredde på 300 px, hvit flate med én hårlinje mot innholdet. Den ligger under det felles toppfeltet.
- **Forsiden (02) har ingen sidemeny.** Der viser semesterkartet alle emnene, og en meny ville bare gjenta dem.
- **Emnesiden og forelesningssiden (03, 04):** et emnetre. Det åpne emnet viser forelesningene. Den valgte raden (emnet på 03, «Uke 37: Merkevare» på 04) har tonet flate og fet tekst. Lange navn kortes av med «…». Hele navnet står i innholdet og kan vises som verktøytips. Under treet står fire hurtigtaster.
- **Under øving (07, 09):** menyen blir et øktpanel. Treet skjules, så Klara ikke blir fristet til å hoppe ut av økta. «Avslutt økt» (Esc) er den eneste veien ut, nederst i panelet.
- Sidemenyen viser aldri semesterlinjen. Linjen hører til innholdet: stor på emnesiden og som et smalt bånd på forelesningssiden. Øvingssidene har bare stasjonsmerket «Uke 37: Merkevare».

## Universell utforming

- All tekst har minst 4,5:1 kontrast (se tabellen).
- Riktig og feil vises med symbol og tekst i tillegg til farge: «✓ Riktig svar», «✗ Ditt svar», ✓ og ✗ i rutenettet og en forklaring av symbolene under.
- Øvd og ikke øvd skilles på form (fylt eller hul stasjon), og står som tekst i tabellen.
- Synlig fokusring på «Kunne» (07) og «Neste spørsmål» (09).
- Treet kan brukes med piltastene og Enter, og hurtigtastene står synlig. Enkelttaster må kunne skrus av (WCAG 2.1.4).

## Styrker

- Forsiden er urørt og viser hele semesteret på ett blikk, slik Silje likte i originalen.
- Sidemenyen gir rask navigasjon mellom forelesninger uten brødsmulesti, og den tar over fremdriften under øving. Dermed er det bare én tidslinje eller fremdriftsvisning per side.
- Færre bokser enn i originalen: lister med hårlinjer, forklaring uten ramme og «Øv på hele emnet» uten panel.
- Lys og rolig, med samme farger og skrift som Semesterlinjen. Det er enkelt å bygge i HTML/CSS (fast sidemeny + innholdskolonne).

## Svakheter og risiko

- Emnesiden er tett i høyden: semesterlinje, tabell og handlinger fyller nesten hele skjermen ved 900 px. Med flere enn 8–9 forelesninger må tabellen rulle.
- Navn på forelesningene kortes av i sidemenyen. Det krever verktøytips og fullt navn for skjermlesere.
- Forsiden har ingen sidemeny, mens de andre sidene har det. Overgangen må føles naturlig, for eksempel ved at «Åpne emne» fører rett til emnesiden med treet åpent.
- Tabellen og treet på emnesiden viser begge navnene på forelesningene. Det er bevisst, siden tabellen er tekstalternativet til semesterlinjen, men det er en liten gjentakelse.
- Semesterlinjen trenger eksamensdato, som ikke er et krav i PRD-en i dag.
