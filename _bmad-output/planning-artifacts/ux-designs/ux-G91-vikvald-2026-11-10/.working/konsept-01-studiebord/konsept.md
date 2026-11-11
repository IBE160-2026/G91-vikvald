# Konsept 01: Studiebord

**Personlighet:** En rolig og vennlig studiekamerat som sitter ved kjøkkenbordet med deg, med notatblokk, kartotekkort og en gul markeringstusj.

## Idéen

Hele appen ligger på en varm bordflate. Arbeidssidene (emner, forelesninger, sammendrag, konto) er et linjert notatark med rød marglinje, og navigasjonen er registerfaner som stikker opp fra arket. I margen står datoer og nummer skrevet som håndskrift, slik Klara selv ville notert dem. Når Klara øver, forsvinner notatarket. Hun sitter ved bordet med en bunke kartotekkort, et quizark eller et oppgaveark, og fremdriften vises som streker (tellestreker) i stedet for en fremdriftslinje. Kilden står på en post-it-lapp som er klistret på kortet, eller som et stempel ved hvert punkt i sammendraget. Det gjør kilden til en naturlig del av «papiret» og ikke en liten fotnote. Retningen passer Studiekamerat fordi appen bygger på Klaras *egne* notater. Det skal føles som å øve med sitt eget materiale, ikke som å bruke et bedriftsverktøy.

## Palett

| Rolle | Hex | Bruk |
|---|---|---|
| Blekkblå (hovedfarge) | `#1D3B8A` | Primærknapper, lenker, fokusring, overskrifter i dialoger, håndskrift i margen |
| Mørkt blekk | `#152C6B` | Kant og «trykkskygge» på primærknapp |
| Grafitt (tekst) | `#2B2A28` | Brødtekst og overskrifter |
| Blyantgrå (metatekst) | `#5E5A52` | Hjelpetekst, metadata, etiketter på post-it |
| Kremhvitt papir | `#FDFAF2` | Notatark, dialoger |
| Kartotekkort | `#FFFEF9` | Kort, filrader, valgkort |
| Bordflate | `#E8DCC4` | Bakgrunn |
| Bordskygge | `#D6C6A8` | Skygge under papir (flat, ingen uskarphet) |
| Linjer | `#DCE4EC` | Linjene i notatblokken (pynt) |
| Marglinje | `#E9B8B0` | Rød marg på ark og kort (pynt) |
| Markeringstusj | `#FFE36B` | Markering bak nøkkelord, temaoverskrifter og «ikke øvd ennå», streken under aktiv fane |
| Post-it | `#FFF0A0` | Kilder, panelet «Øv på hele emnet» |
| Rødpenn | `#B3261E` | Feil svar, feilmeldinger, sletting |
| Grønnpenn | `#1E6B3A` | Riktig svar |
| Feltkant | `#6B6456` | Kanter på tekstfelt |

## Typografi

- **Georgia (serif)** til overskrifter og alt studieinnhold (spørsmål, svar, sammendrag). Det gir et «bok og notat»-preg. Overskrifter er 34–44 px fete, korttekst 24 px og brødtekst 17–19 px.
- **Avenir Next / Helvetica Neue / Arial (sans)** til selve grensesnittet: knapper, etiketter, metadata og status (15–18 px, halvfet). Skillet gjør det lett å se hva som er *stoff* og hva som er *knapper*.
- **Håndskrift (Bradley Hand / Segoe Print / Chalkboard SE, med cursive som reserve)** brukes sparsomt og bare der det er pynt eller gjentar informasjon: datoer i margen, nummer på spørsmål og ordet «Kilde» på post-it. Ingen viktig informasjon står *bare* i håndskrift.
- Logoen «Studiekamerat» står i Georgia kursiv med en håndtegnet strek under.

## Form, hjørner og strek

- Ingen avrundede hjørner. Alle rammer er «nesten rette» streker med en liten, tilfeldig skjelving, som om de er tegnet for hånd med linjal.
- Kort og lapper ligger litt skjevt (rotert 0,4–6 grader) og har en flat skygge. Bunker med kort viser at det er flere.
- Primærknappen er fylt med blekk og har en flat underkant, så den ser ut som en stempelpute. Sekundærknappen er en blekkstrek på kortpapir. Den destruktive knappen er fylt rødpenn.
- Dialoger er et eget ark med binders og rød marg, lagt over en dempet side.

## Avstandsskala

8 · 16 · 24 · 32 · 48 · 64 px. Linjene i notatblokken går hver 32. px, og radene på emnesiden følger et rutenett på 72 px, så innholdet «ligger på linjene».

## Universell utforming

- **Kontrast (beregnet):** grafitt på papir 13,7:1, blyantgrå på papir 6,6:1, blekkblå på papir 9,8:1, hvit på blekkblå 10,3:1, rødpenn på papir 6,3:1, grønnpenn på papir 6,3:1, hvit på rød knapp 6,5:1, grafitt på markeringstusj 11,2:1, blyantgrå på post-it 6,0:1 og blyantgrå på bordflaten 5,1:1. Alt er over 4,5:1.
- **Riktig og feil vises aldri bare med farge:** «✓ Riktig svar» og «✗ Ditt svar» står som tekst, sammen med en håndtegnet hake eller et kryss i margen. Knappene «✓ Kunne» og «✗ Kunne ikke» har både symbol og tekst.
- **Synlig fokusring:** en dobbel blekkstrek på 3–3,5 px med luft rundt. Den vises på «Middels» (lag quiz), på avkrysningen (vilkår), på «Avbryt» (slett fil, der det trygge valget har fokus først) og på «Delvis riktig» (fritekst).
- **Synlige etiketter** står over alle skjemafelt. Feilmeldingen har både ✗, rød tekst og rød feltkant, og står rett under feltet.
- Brødteksten er minst 16 px, og studieinnholdet er 18–24 px.
- Hurtigtaster (mellomrom for å snu kortet, 1 og 2 for Kunne ikke og Kunne) står på skjermen.
- Linjer, marg og bordtekstur er svake og bare pynt. De bærer ingen informasjon.

## Styrker

- Konseptet har en tydelig og varm personlighet som er lett å huske, og det skiller seg klart fra vanlige dashbord.
- Kilden blir en synlig, fysisk del av hvert kort (post-it og stempel). Det støtter kjerneløftet om at «alt viser kilden».
- To tydelige moduser: et notatark når Klara organiserer, og en bordflate med kort når hun øver. Det gjør det lett å vite hvor hun er.
- Tellestreker, marg-datoer og markeringstusj gir mening og er ikke bare pynt.

## Svakheter og risiko

- **Ujevn strek og skjeve kort er dyrt å lage i CSS.** Det må forenkles, for eksempel med `transform: rotate()`, SVG-rammer eller `border-image`. Ellers blir det glatte bokser som mister sjarmen.
- **Håndskriften er ulik på hvert operativsystem** (Bradley Hand på Mac, Segoe Print på Windows, ellers Comic Sans eller cursive). Den bør derfor bare brukes til pynt, eller byttes ut med en innebygd webfont.
- **Skjeve kort og ujevne streker kan oppleves som rotete** for noen brukere, og for skjermforstørrere. Rotasjonen bør være liten og respektere `prefers-reduced-motion` hvis den animeres.
- **Tellestreker for spørsmål som ikke er besvart ennå** har lav kontrast (2,7:1). Informasjonen står også som tekst («Kort 7 av 24»), men strekene bør gjøres mørkere eller skjules for skjermlesere.
- Mange like varme beigetoner kan bli flate på dårlige skjermer. Blekkblått må bære all handling tydelig.
- Lekent preg kan virke mindre «seriøst» for noen sensorer. Konsekvent typografi og streng innretning må veie opp for det.
