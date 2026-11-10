# Konsept 02: Sveitsisk rutenett

**Personlighet:** Presis, saklig og selvsikker – en studiekamerat som rydder stoffet inn i et strengt system og lar tallene snakke.

## Idé

Konseptet bygger på International Typographic Style: et strengt 12-kolonners rutenett, asymmetrisk komposisjon, tung grotesk og svart på hvitt med én signalrød aksent. Store tall er grafiske elementer i seg selv: «7/24» på flashcardet, «4/15» i quizen, «19» og «5» etter økta, «11/15» på resultatet og antall kort per innholdstype på forelesningssiden. Klara får hele tiden et klart svar på «hvor er jeg, og hvor mye gjenstår?», uten pynt som stjeler oppmerksomhet fra stoffet. Øving skjer i en egen øktmodus med smal topplinje, segmentert fremdriftslinje over hele bredden og fast oppsett: telleren står til venstre (kolonne 1–3), og innholdet står til høyre (kolonne 5–12). Til eksamen gjør tabellen på emnesiden det lett å se hele semesteret i én liste, med datoer, filer og antall kort og spørsmål i faste kolonner.

## Palett

| Hex | Rolle |
|---|---|
| `#000000` | Tekst, linjer, primærknapper, valgt tilstand, riktig svar |
| `#FFFFFF` | Bakgrunn, tekst på svart og rødt |
| `#E2001A` | Eneste aksent: aktiv side, gjeldende kort i fremdriften, feil svar, feilmelding, kildemarkør, destruktiv handling (4,94:1 mot hvitt) |
| `#555555` | Sekundærtekst og metadata (7,46:1) |
| `#767676` | Bare store dekortall som «/24» og tomme tellere «0» (4,54:1) |
| `#F2F2F2` | Bakgrunn bak riktig svar i quiz |
| `#D9D9D9` | Fremdriftssegmenter som gjenstår (alltid sammen med tekst, f.eks. «Kort 7 av 24») |

## Typografi

- `'Helvetica Neue', Helvetica, Arial, sans-serif`, bare vektene 400 og 700.
- Skala: 300/260 (tellere) · 120/96/88 (sidetitler) · 52/44/32 (overskrifter og spørsmål) · 24/20/18 (brødtekst og knapper) · 16 (metadata og etiketter, minimum).
- Seksjonsetiketter i versaler, 16 px fet, sperret 1,2 («FILER», «LAG INNHOLD», «FORKLARING»).
- Tett sperring (negativ letter-spacing) på store titler og tall.
- All tekst er venstrestilt (flush left). Tall i tabeller er høyrestilt.

## Form, hjørner og linjer

- Ingen avrundede hjørner, ingen skygger og ingen gradienter.
- Tynne linjer (1 px) skiller rader. Tykke linjer (2 px) åpner en seksjon.
- Dialoger har en 8 px toppkant: svart for vanlige valg og rød for sletting.
- Knapper er rektangler med teksten venstrestilt og pil til høyre. Primærknapper er fylt svart, sekundærknapper har 2 px svart kant, og destruktive knapper er røde.
- Unntak: radioknapper er runde, fordi formen er en innarbeidet konvensjon for «velg én».

## Rutenett og avstand

- 1440 px lerret, 72 px marg, 12 kolonner på 86 px, 24 px mellomrom (kolonnesteg 110 px).
- Fast asymmetri: kolonne 1–3 brukes til tittel, teller eller handlinger, og kolonne 5–12 til innhold.
- Avstandsskala: 8 · 16 · 24 · 32 · 48 · 64 · 96.

## Universell utforming

- Tekstkontrast er minst 4,5:1 overalt: svart 21:1, grå sekundærtekst 7,46:1, rød 4,94:1 og stort grått tall 4,54:1.
- Riktig og feil vises aldri med farge alene. Svarene har «✓ Riktig svar» og «✗ Ditt svar», en fylt bokstavboks og en sidekant, og riktig svar er i tillegg satt med fet skrift. Resultatlista bruker «✗ Ditt svar:» og «✓ Riktig svar:». Ferdig-skjermen viser hvert kort som svart rute med ✓ eller rød rute med ✗.
- Synlig fokus vises som en 3 px svart ramme med 4 px luft rundt elementet, slik at fokus ikke forveksles med valgt tilstand (fylt svart). Fokus vises på emnerad, avkrysningsboks, vanskelighetsgrad, «Neste spørsmål», «Delvis riktig» og «Avbryt» i slettedialogen. Avbryt er standardvalget der.
- Alle skjemafelt har synlige etiketter over feltet. Feilmeldingen står i tekst under feltet, med ✗, rød kant og en markør.
- Tastatursnarveier vises på knappene («Tast 1/2/3», «Snu tilbake (mellomrom)», «Enter går videre», «Esc lukker uten å slette»).
- Fremdrift vises både som segmentlinje og som tekst («Kort 7 av 24»).
- Brødtekst er minst 16 px, og hovedinnhold på kort og spørsmål er 18–34 px.

## Styrker

- Konseptet er svært tydelig og rolig, og hierarkiet bæres av typografi og rutenett i stedet for farger.
- Store tall gir umiddelbar oversikt over fremdrift og resultat, og de er karakteristiske, så konseptet blir lett å kjenne igjen.
- Paletten med én aksent gjør rødt meningsbærende (her, nå, feil eller fare), og den er enkel å implementere med få CSS-variabler.
- Faste kolonner gjør implementeringen forutsigbar med CSS Grid.

## Svakheter og risiko

- Uttrykket kan oppleves som kaldt eller strengt. Det er lite varme for en student som gruer seg til eksamen.
- Rødt betyr både «aktiv eller gjeldende» og «feil». Det kan forvirre hvis det ikke brukes konsekvent, og bør kanskje begrenses til feil, fare og kilde.
- De store tellerne tar mye plass. Lange spørsmål eller svar kan gi trangt innhold i kolonne 5–12, og på smalere skjermer må tellerne krympes eller flyttes.
- Helvetica Neue finnes ikke på alle maskiner. Fallback til Arial gir et litt annet, mindre stramt uttrykk.
- Kildemarkøren (rød rute) er diskret. Den må sammen med teksten «Kilde:» være tydelig nok til at kravet om kildevisning oppleves som oppfylt.
