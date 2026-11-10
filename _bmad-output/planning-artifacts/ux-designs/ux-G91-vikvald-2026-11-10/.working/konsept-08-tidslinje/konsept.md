# Konsept 08: Semesterlinjen

**Personlighet:** En rolig og presis t-banekartograf. Klara ser alltid hvor hun er i semesteret og hvor langt det er til eksamen.

## Idé

Tiden organiserer alt. Hvert emne er en linje fra august til eksamen, og hver forelesning er en stasjon på linjen. En fylt stasjon betyr «øvd», en hul betyr «ikke øvd ennå». Linjen er hel fram til «I dag» og stiplet fram til endestasjonen «Eksamen», så tiden som er igjen synes uten at Klara må regne. Den samme linjen går igjen på emnesiden med små søyler for antall kort og quizspørsmål, som et smalt bånd øverst på forelesningssidene og nederst på alle øvingssidene. Der markerer den hvilken forelesning stoffet hører hjemme i («Kortet hører hjemme her · for 9 uker siden»). Det passer Klara fordi hun jobber i takt med semesteret: hun laster opp etter hver forelesning og øver på hele emnet før eksamen. Linjen viser henne hva hun har gjort og hva som gjenstår. Quizresultatet viser også hvor i semesteret feilene ligger, så hun vet hvilke forelesninger hun bør øve mer på.

Metaforen går igjen i små detaljer: fremdriften i en økt er en linje med stopp (✓ og ✗ per kort), vilkårene er fem nummererte stopp, omfanget i «Lag quiz» er tre stasjoner, AIDA er fire stasjoner med pil, og sammendraget er en loddrett linje der temaene er stasjoner.

## Visuelt språk

### Palett

| Hex | Rolle |
|---|---|
| `#F6F5F1` | Bakgrunn (lyst papir) |
| `#FFFFFF` | Flater, kort, dialoger, semesterbånd |
| `#161B26` | Blekk: tekst, primærknapper, «I dag»-strek, eksamensstasjon |
| `#4B5262` | Sekundærtekst, akseetiketter (7,2:1 på bakgrunnen) |
| `#D6D3CB` / `#ECEAE4` | Skillelinjer og rutenett (bare pynt, ikke tekst) |
| `#B83E0C` | Markedsføring-linjen og aksentfarge, også for «Ikke øvd ennå» (5,2:1 på bakgrunnen, 4,9:1 på tonet flate) |
| `#FBEDE5` | Tonet flate for valgt element og «du er her» |
| `#0B6585` | Samfunnsøkonomi-linjen (6,5:1) |
| `#2D6A3B` | Organisasjon og ledelse-linjen (6,5:1) |
| `#1D7037` / `#E6F2E9` | Riktig og kunne (5,3:1) |
| `#B42318` / `#FBE8E6` | Feil, kunne ikke og sletting (5,6:1). Skravert mønster for «slettes» |
| `#1F56D6` | Fokusring, 3 px med luft rundt elementet (6,3:1) |

Hvert emne får sin egen linjefarge, som på et t-banekart. Ellers er paletten nesten bare blekk på papir.

### Typografi

- `'Helvetica Neue', Arial, sans-serif` for alt grensesnitt: titler 36–52 px / 800, seksjonstitler 20–24 px / 800, brødtekst 16–19 px / 400, kortsvar 30 px / 700.
- `ui-monospace, Menlo, monospace` for data: datoer (21.08), månedsetiketter (AUG, SEP med sperret skrift), kildehenvisninger i sammendraget og små etiketter som SPØRSMÅL / SVAR. Dette gir et infografikk- og rutetabellpreg.

### Form og hjørner

Rette, nesten kantete former (4 px hjørner på knapper og kort, 6 px på paneler, 8 px på dialoger). Ingen skygger, bare en forskjøvet flat «papirkant» på flashcards. Linjene er 5–8 px tykke med runde ender. Stasjoner er sirkler, og eksamen er alltid en firkantet endestasjon.

### Avstandsskala

8-punkts skala: 8 / 16 / 24 / 32 / 40 / 64 px. Ytre marg er 40–80 px, og innholdet følger en felles venstrekant.

## Universell utforming

- All tekst har minst 4,5:1 kontrast (se tabellen). Brødtekst er 16 px eller større. Bare akseetiketter og noen hjelpetekster er 13–15 px.
- Øvd og ikke øvd skilles på form (fylt eller hul stasjon), ikke bare farge, og står i tillegg som tekst i tabellen på emnesiden.
- Riktig og feil vises alltid med symbol og tekst: «✓ Riktig svar», «✗ Ditt svar», ✓ og ✗ i fremdriftslinjen, «✗ 1» per stasjon. «Slettes» bruker skravering i tillegg til rødt.
- Synlig fokusring (blå, 3 px, med luft) på det aktive valget i Lag quiz, Kunne, Neste spørsmål, Delvis riktig, Endre huskeregel og Avbryt i slettedialogen. Det trygge valget har fokus som standard.
- Grafikken er aldri eneste informasjonskilde. Emnesiden har en vanlig tabell («Forelesninger etter dato») med de samme tallene, og hver emnelinje på forsiden har et kort med tallene som tekst. I koden bør linjene ha tekstalternativ, eller være pynt med tabellen som innhold.
- Skjemafelt har synlige etiketter over feltet. Feilmeldingen står som tekst med symbol under feltet.
- Tastatursnarveier vises som tekst på flashcard-siden.

## Styrker

- Konseptet er unikt og lett å huske. Det svarer direkte på Klaras behov for å vite hvor hun står før eksamen.
- Datavisualiseringen har en funksjon: den viser hva som ikke er øvd, og hvor feilene ligger.
- Konseptet er konsekvent. Én form (linje + stasjon) brukes for semester, økter, vilkår, valg og huskeregler.
- Det er lyst og rolig, med høy kontrast og lite pynt, så det er lett å lage i ekte HTML/CSS.

## Svakheter og risiko

- Konseptet trenger datoer for forelesningene og eksamen. Eksamensdato er ikke et krav i PRD-en i dag, og uten den mister linjen endestasjonen sin. Den kan da ende ved «I dag» eller ved semesterslutt.
- Forelesninger som ligger tett, kan gi stasjoner som kolliderer. Stasjonsnavn får derfor ikke plass på linjen, så tabellen må bære navnene.
- Tidslinjer er vanskelige på smale skjermer og for skjermlesere. Det krever ekstra arbeid med tekstalternativer og tastaturnavigasjon hvis stasjonene skal være klikkbare.
- Semesterbåndet tar ca. 110 px høyde på hver side. Det kan føles gjentakende, og må kunne skjules eller gjøres mindre.
- Fargene per emne holder ikke hvis Klara har mange emner. Da trengs flere farger som fortsatt har god kontrast.
