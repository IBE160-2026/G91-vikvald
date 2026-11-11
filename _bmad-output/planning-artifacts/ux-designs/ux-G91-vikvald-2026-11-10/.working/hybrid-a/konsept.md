# Hybrid A: Linjen med sidemeny

**Personlighet:** Den samme rolige t-banekartografen som i Semesterlinjen. Nå har den et fast kart i lomma, så Klara alltid ser emnene sine og hvor i semesteret hun er.

## Idé

Semesterlinjen (konsept 08) er grunnlaget og er uendret i farger, skrift og former. Det nye er en lys sidemeny til venstre, hentet fra strukturen i Tastaturet først (konsept 09): et tre med emner og forelesninger som ligger fast på hver side. I sidemenyen er forelesningene i det valgte emnet tegnet som en liten loddrett semesterlinje. Hver forelesning er en stasjon, og avstanden mellom stasjonene følger datoene. Linjen er hel fram til «I dag» og stiplet fram til «Eksamen 04.12 · om 3 uker». Treet er altså selve linjen, så Klara navigerer og ser tiden på samme sted. Under øving (07, 09) blir sidemenyen et øktpanel med teller, fremdrift som en loddrett linje med en stasjon per kort (✓/✗), kilde og «Avslutt økt».

## Hva er hentet fra hvilket konsept

| Fra | Hva |
|---|---|
| 08 Semesterlinjen | Hele paletten, typografien, formene (linje + stasjon, firkantet eksamensstasjon, «I dag»-merke), den store semesterlinjen på 02 og 03, tabellen «Forelesninger etter dato», panelet «Øv på hele emnet», «Lag og øv» på 04, kortet og quizoppsettet på 07 og 09 |
| 09 Tastaturet først | Fast sidemeny med tre (emne → forelesninger), valgt rad med markering, tellere, og ideen om at sidemenyen blir et øktpanel under øving. Ikke den mørke kodeeditor-stilen, monospace overalt, hurtigtast-tegningene eller kommandopaletten |
| Nytt i hybriden | Emnefarge som liten linjeprikk ved hvert emne, forelesningene som en loddrett tidsriktig minilinje i treet, «Neste eksamener» som loddrett linje på forsiden, og pågående jobb nederst i sidemenyen |

Endringer fra 08 som følger av sidemenyen: Semesterbåndet øverst på 04 og nederst på 07 og 09 er fjernet, fordi sidemenyen nå viser den samme informasjonen. Nedtellingen fra konsept 08 er oppdatert til eksamen fredag 04.12.2026 (om 3 uker).

## Visuelt språk

### Palett (som 08)

| Hex | Rolle | Kontrast |
|---|---|---|
| `#F6F5F1` | Bakgrunn (lyst papir), hovedflaten | – |
| `#FFFFFF` | Sidemeny, toppfelt, kort, paneler | – |
| `#161B26` | Blekk: tekst, primærknapper, «I dag», eksamensstasjon | 15,8:1 på papir, 17,2:1 på hvitt |
| `#4B5262` | Sekundærtekst | 7,2:1 på papir, 7,8:1 på hvitt, 6,8:1 på tonet flate |
| `#D6D3CB` / `#ECEAE4` | Skillelinjer, kantlinje mellom sidemeny og innhold (bare pynt) | – |
| `#B83E0C` | Markedsføring-linjen, aksent, «Ikke øvd ennå» | 5,6:1 på hvitt, 5,2:1 på papir, 4,9:1 på tonet flate |
| `#FBEDE5` | Tonet flate: valgt rad i sidemenyen, pågående jobb | blekk 15,1:1 |
| `#0B6585` | Samfunnsøkonomi-linjen | 6,5:1 på hvitt |
| `#2D6A3B` | Organisasjon og ledelse-linjen | 6,5:1 på hvitt |
| `#1D7037` / `#E6F2E9` | Riktig og kunne | 5,3:1 |
| `#B42318` / `#FBE8E6` | Feil, kunne ikke, slett | 5,6:1 på tonet, 6,6:1 på hvitt |
| `#1F56D6` | Fokusring, 3 px med luft | 5,7:1 på papir |

### Typografi (som 08)

- `'Helvetica Neue', Arial, sans-serif` for grensesnittet: sidetitler 40 px / 800, seksjonstitler 22 px / 800, brødtekst 16–18 px, kortsvar 30 px / 700. I sidemenyen: emnenavn 16 px / 700, forelesninger 15 px, hjelpelinjer 14 px.
- `ui-monospace, Menlo, monospace` for data og etiketter: datoer, månedsetiketter (AUG, SEP), seksjonsetikettene EMNER, NESTE EKSAMENER, ØKT og KILDE med sperret skrift.

### Form og avstand

Som 08: 4–6 px hjørner, ingen skygger utenom den flate papirkanten på flashcardet, linjer 5–8 px med runde ender, sirkelstasjoner og firkantet eksamen. 8-punkts skala. Faste soner: toppfelt 64 px, sidemeny 280 px, innholdet starter 40 px fra sidemenyen (x = 320) og slutter 40 px fra høyre kant.

## Sidemenyen

- **Forsiden (02):** Emnetreet er lukket. Hvert emne har pil, linjeprikk i emnefargen, navn og en linje med «4 av 8 øvd · eksamen 04.12». Under ligger «Neste eksamener»: en loddrett stiplet linje fra «I dag» med eksamensstasjonene i riktig avstand (27.11 om 2 uker, 04.12 om 3 uker, 14.12 om 5 uker).
- **Emnesiden (03):** Markedsføring er åpen og markert. Forelesningene vises som en loddrett minilinje med fylte (øvd) og hule (ikke øvd) stasjoner, «I dag 10.11» som en tverrstrek og eksamen som endestasjon. De andre emnene står lukket under.
- **Forelesningssiden (04):** Samme tre, men «Uke 37: Merkevare» er valgt (tonet rad, stor stasjon med ring). Nederst i sidemenyen står den pågående jobben («Lager quizspørsmål … bruk appen imens»), så den synes uansett hvor Klara går.
- **Øving (07, 09):** Treet byttes ut med et øktpanel: ØKT, type og omfang, stor teller («7 av 24»), «Kunne 5 · Kunne ikke 1», en loddrett fremdriftslinje med en stasjon per kort (✓ grønn, ✗ rød med tekst «Kort 3 · kunne ikke», hul for ikke vist), forklaring av tegnene, KILDE med fil og side, hvilken forelesning stoffet hører hjemme i, og «Avslutt økt» nederst. Treet er skjult så Klara ikke blir forstyrret, men hun kan alltid avslutte.
- Lange forelesningsnavn kortes med «…» i sidemenyen. Fullt navn står i tabellen på emnesiden og i tittelen på forelesningssiden.

## Universell utforming

- All tekst har minst 4,5:1 kontrast (se tabellen). Brødtekst er 16 px eller mer. Bare hjelpelinjer og etiketter i sidemenyen er 13–15 px.
- Øvd og ikke øvd skilles på form (fylt eller hul stasjon), ikke bare farge. Emnefargen står alltid sammen med emnenavnet i tekst.
- Riktig og feil vises med symbol og tekst: «✓ Riktig svar», «✗ Ditt svar», ✓/✗ på fremdriftslinjen og «Kort 3 · kunne ikke» ved siden av feil stasjon.
- Synlig fokusring (blå, 3 px) på «Kunne» og «Neste spørsmål».
- Kilde vises på kortet og i forklaringen (fil + side), og i tillegg i øktpanelet.
- Sidemenyen bør være et `nav`-landemerke med en vanlig liste (emner → forelesninger) og `aria-current` på valgt forelesning. Den loddrette linjen er pynt rundt lenkene; datoene og statusen står som tekst i tabellen på emnesiden. Øktpanelet bør ha en tekstteller som skjermlesere kan lese («Kort 7 av 24, 5 kunne, 1 kunne ikke»).
- En fast sidemeny gir en forutsigbar plass for navigasjon på hver side (WCAG 3.2.3).

## Styrker

- Semesterlinjen er fortsatt synlig hele tiden, men tar ikke lenger et eget bånd på hver side. Det løser svakheten i 08 om at båndet tok 110 px og føltes gjentakende.
- Klara kan hoppe direkte mellom forelesninger og emner uten å gå via forsiden.
- Treet og tidslinjen er samme komponent. Det er lett å forklare for sensor: «Navigasjonen er semesteret.»
- Øktpanelet gir fremdrift og kilde en fast plass, så selve kortet og quizen får mer luft.
- Pågående jobb har én fast plass i sidemenyen.

## Svakheter og risiko

- Sidemenyen tar 280 px. På skjermer smalere enn ca. 1100 px må den kunne lukkes eller bli en meny bak en knapp.
- Den loddrette minilinjen gjentar den store linjen på emnesiden. Det er bevisst (sidemenyen er lik på alle sider), men kan oppleves som dobbelt.
- Lange forelesningsnavn må kortes med «…» i sidemenyen. Fullt navn må finnes som tekst for skjermlesere og som verktøytips.
- Tidsriktig avstand krever datoer. Mange forelesninger tett i tid gjør at stasjonene kommer for nær hverandre, så det trengs en minsteavstand.
- Med 30 kort i en økt blir den loddrette fremdriftslinjen tett. Over ca. 30 kort bør den bli en enkel linje med prosent.
- Kilden står både på kortet og i panelet. I koden bør bare én av dem leses opp, slik at skjermleseren ikke sier den to ganger.
