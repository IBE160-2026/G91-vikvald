# Hybrid B: Linjen i nordisk ro

**Personlighet:** Semesterlinjens oversikt i en stille, lys høstdag. Klara ser hele tiden hvor hun er i semesteret, men ingenting roper.

## Idé

Hybriden bruker strukturen fra **08 Semesterlinjen**: hvert emne er en linje fra august til eksamen, forelesningene er stasjoner (fylt = øvd, hul = ikke øvd ennå), linjen er hel fram til «I dag» og stiplet fram til den firkantede endestasjonen «Eksamen». Fra **09 Tastaturet først** kommer sidemenyen med emnetreet, men lys og rolig i stedet for mørk kodeeditor. Fra **06 Nordisk ro** kommer fargene (havre, sand, furugrønn, blekk), luften, de lette titlene og fokusmodusen under øving.

Sidemenyen er selv en liten semesterlinje: under det åpne emnet går emnelinjen loddrett, med én stasjon per forelesning, en «I dag»-strek («8 forelesninger har vært») og endestasjonen «Eksamen 04.12 · om 3 uker». Klara ser altså fremdriften på alle vanlige sider, også når hun står inne på en forelesning.

## Hva er hentet fra hvilket konsept

| Fra | Hva |
|---|---|
| 08 Semesterlinjen | Emnelinjer med stasjoner, «I dag», stiplet tid igjen, firkantet eksamensstasjon, søyler for kort og quiz på emnesiden, smalt semesterbånd med «Du er her» på forelesningssiden, tabellen «Forelesninger etter dato», kort med «X uker til eksamen» og «4 av 8 forelesninger øvd», «Fra Uke 37: Merkevare» på kort og quiz |
| 09 Tastaturet først | Sidemeny med tre: emner → forelesninger, valgt rad, tellere (8, 5, 2), åpne og lukkede emner. Hurtigtaster vises som tekst på øvingssidene. Ikke kommandopalett, ikke mørk stil, ikke monospace |
| 06 Nordisk ro | Palett, humanistisk skrift med lette titler (vekt 300), store avstander, hårlinjer i stedet for skygger, fokusmodus uten meny under øving med tynn fremdriftslinje og «Avslutt økt» |

## Sider

- `02-emner.svg`: semesterkart med tre emnelinjer, «I dag 10.11», «Eksamen 04.12 · om 3 uker» og «8 forelesninger har vært» per emne. Tre emnekort under.
- `03-emne.svg`: stor linje for Markedsføring med søyler, «3 uker igjen»-felt fram til eksamen, tabell og panelet «Øv på hele emnet».
- `04-forelesning.svg`: semesterbånd med «Du er her · Uke 37», notater og opplasting til venstre, «Øv og lag innhold» til høyre med pågående quizjobb.
- `07-flashcard.svg` og `09-quiz.svg`: fokusmodus. Ingen sidemeny.

## Sidemeny-oppførsel

- Lys sandflate (`#E9E3D5`), 296 px bred, fast på venstre side på 02, 03 og 04.
- Øverst: logo og «Alle emner». Under overtittelen EMNER ligger treet. Hvert emne har en kort strek i emnefargen og en teller med antall forelesninger.
- Emnet Klara er i, er åpent. Forelesningene står som stasjoner på en loddrett emnelinje, med «I dag» og eksamen nederst. Andre emner er lukket (pil til høyre).
- Valgt rad: lys furu flate (`#DCE6DD`), en furugrønn kant på 4 px til venstre og halvfet tekst. Valgt forelesning får i tillegg en ring rundt stasjonen. Altså tre signaler, ikke bare farge.
- Nederst: «Konto» og «Logg ut».
- **Under øving (07, 09) skjules sidemenyen helt.** Øverst er det bare en fremdriftslinje på 4 px over hele bredden, en liten tekst om hva som øves, telleren («Kort 7 av 24») og knappen «Avslutt økt». Semesterbåndet vises ikke. Kortet og spørsmålet sier bare «Fra Uke 37: Merkevare», så tilhørigheten ikke forsvinner.
- Lange navn forkortes i menyen («Uke 36: Segmentering og pos.»). I ekte kode bør hele navnet ligge i en `title` eller vises ved fokus.

## Palett

| Hex | Rolle | Kontrast |
|---|---|---|
| `#F3F0E8` | Havre, sidebakgrunn | – |
| `#FBFAF7` | Flate: kort, semesterkart, alternativer | – |
| `#E9E3D5` | Sand, sidemeny | – |
| `#EFEADF` | Lys sand: opplasting, jobbstatus, forklaring, «Øv på hele emnet» | – |
| `#DDD6C6` | Hårlinjer og månedslinjer (bare pynt) | – |
| `#232B27` | Blekk: tekst, «I dag»-strek, eksamensstasjon, flashcard-søyler | 12,7:1 på havre, 11,3:1 på sand |
| `#56615B` | Skifer: sekundærtekst, månedsetiketter, kilder | 5,7:1 på havre, 5,0:1 på sand |
| `#2E4A3B` | Furugrønn: hovedfarge, primærknapper, lenker, fokusring, riktig svar | 8,5:1 på havre; hvit tekst på furu 9,7:1 |
| `#E3EBE3` / `#DCE6DD` | Lys furu: riktig svar / valgt rad i sidemenyen | blekk 11,9:1 / 11,3:1 |
| `#3A6B50` | Emnelinje Markedsføring (furu) | 5,4:1 på havre, 4,8:1 på sand |
| `#2C5F80` | Emnelinje Samfunnsøkonomi (fjord-blå) | 6,0:1 på havre, 5,4:1 på sand |
| `#6E4B7F` | Emnelinje Organisasjon og ledelse (lyng) | 6,2:1 på havre, 5,5:1 på sand |
| `#E4ECE5` | Tonet flate for «3 uker igjen» | blekk ca. 12:1 |
| `#9B3A2C` / `#F6E4DE` | Rust: feil, «Ditt svar», «Slett» | 6,1:1 på havre, 5,6:1 på lys rust |
| `#7C8680` | Feltkant, kant på opplastingsfelt og bokstavsirkler | 3,6:1 mot flaten (krav 3:1) |

**Valg av emnefarger:** Briefen nevnte rust som mulig emnefarge, men rust er allerede fargen for feil og sletting i Nordisk ro. Tredje emne fikk derfor en dempet lyngfiolett. Alle tre emnefarger har minst 4,5:1 der de bærer tekst (emnenavn på forsiden, «Ikke øvd ennå», «Fra Uke 37»).

## Typografi

Humanistisk sans: `'Gill Sans', 'Gill Sans MT', Seravek, 'Segoe UI', Calibri, 'Helvetica Neue', Arial, sans-serif`. Ingen monospace (avvik fra 08, for å holde roen).

- Sidetitler 40–48 px, vekt 300. Spørsmål i quiz 32 px, vekt 300.
- Seksjonstitler 22–24 px, vekt 400. Radtitler 17–19 px, vekt 600.
- Brødtekst 16–18 px. Svaret på flashcardet 28 px, vekt 400.
- Overtitler (EMNER, SPØRSMÅL, SVAR, månedene) 13 px, vekt 600, store bokstaver med sperring.
- Akseetiketter og forklaringer i grafene 14–15 px.

## Form og avstand

- Hjørner 6 px på knapper og rader, 8 px på kort og paneler, 10 px på flashcardet. Piller for tellere, «I dag» og «Du er her».
- Ingen skygger. Dybde kommer fra havre/sand/flate og hårlinjer.
- Emnelinjer 4–7 px med runde ender. Stasjoner er sirkler, eksamen en firkant.
- Avstandsskala 4 · 8 · 16 · 24 · 40 · 56 · 64 px. Hovedområdet har 56 px luft fra sidemenyen.

## Universell utforming

- All tekst har minst 4,5:1 (se tabellen). Brødtekst 16 px eller mer.
- Øvd og ikke øvd skilles med form (fylt og hul stasjon) og står som tekst i tabellen på emnesiden og i kortene på forsiden.
- Riktig og feil: «✓ Riktig svar» og «✗ Ditt svar» med symbol, tekst, farge og kant.
- Synlig fokusring: furugrønn ring på 2,5 px med luft, på «Kunne» og «Neste spørsmål».
- Grafene er ikke eneste kilde: tabellen og sidemenyen gir de samme tallene som tekst.
- Hurtigtaster står som tekst på øvingssidene.
- Fokusmodus gir lav kognitiv belastning når Klara øver.

## Styrker

- Beholder det Silje likte i 08 (oversikt, tid til eksamen, antall forelesninger) og gjør det roligere.
- Sidemenyen viser semesterlinjen hele tiden og gir rask navigasjon mellom forelesninger, uten et eget semesterbånd på hver side.
- Fokusmodusen skiller tydelig mellom å planlegge (med meny) og å øve (uten meny).
- Liten palett som er lett å holde innenfor WCAG.

## Svakheter og risiko

- Fargene er dempet. Emnelinjene kan bli for like hvis Klara får flere enn 4–5 emner.
- Semesterlinjen vises både i sidemenyen og i hovedområdet på 03 og 04. Det kan føles dobbelt. Båndet på 04 kan fjernes hvis menyen er nok.
- Den loddrette linjen i menyen viser rekkefølge, ikke ekte tidsavstand. Det er greit som navigasjon, men ikke en tidslinje.
- Gill Sans finnes ikke overalt, og vekt 300 kan bli svak på skjermer med lav oppløsning.
- Med mange forelesninger blir menyen lang og må kunne rulle.
- Stasjoner som ligger tett (ukentlige forelesninger) gir lite plass til etiketter på emnesiden, så bare ukenummer og dato står under linjen.
