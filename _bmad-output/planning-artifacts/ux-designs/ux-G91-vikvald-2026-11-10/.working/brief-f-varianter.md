# Brief: tre ferdigstilte varianter av hybrid F

Silje liker retningen i hybrid F, men sier at den «ser ut som et førsteutkast og at man ikke orket å gjøre mer». Oppgaven er å gjøre F **ferdig og gjennomarbeidet**: samme struktur og innhold, men med et håndverksnivå som føles premium. Tre subagenter lager hver sin variant. Alle tre må løse grunnproblemene; de skiller seg bare på personligheten i oppdraget.

Alle stier er relative til `/Users/Silje/Desktop/G91-vikvald/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/.working/`.

## Les først

- `brief-konsepter.md`: innhold, universell utforming (WCAG 2.1 AA) og SVG-teknikk. Gjelder fullt ut.
- `hybrid-f/konsept.md` og SVG-ene `hybrid-f/02-emner.svg`, `03-emne.svg`, `04-forelesning.svg`, `07-flashcard.svg`, `09-quiz.svg`. Merk: i 04 er «Lag fritekstspørsmål» og «Lag sammendrag» omrissknapper (Siljes beslutning); bare «Øv nå» er svarte.
- Generatoren for F: `/private/tmp/claude-502/-Users-Silje-Desktop-G91-vikvald/c9e86afd-a37b-4a8e-854e-b78c11e28a0b/scratchpad/hf/genHF.py` og `base.py`. Kopier til egen fil (navn i oppdraget). Ikke endre originalene eller filene i `hybrid-f/`.

## Det som er bestemt og skal beholdes

- Forsiden (02) uten sidemeny, med Semesterlinjens store tidslinje for alle emner (Silje liker at den viser tiden til eksamen og hvor mange forelesninger som har vært).
- De andre sidene: enkel sidemeny med emnetre (ingen tidslinje i menyen); under øving blir den et øktpanel (teller, fremdrift, rutenett ✓/✗, «Avslutt økt»).
- Én tidslinje per side. Oransje #B83E0C som Markedsføring-farge på emnelinjen; emnefarger #0B6585 og #2D6A3B for de andre emnene. Få knappestiler; svart fylt bare for det Klara gjør oftest.
- Innholdet (tekster, tall, Klara, Uke 37: Merkevare) fra F.

## Grunnproblemer alle tre må løse

1. **Understrekinger:** fjern understreking fra navigasjon, tabellrader, «Konto», «Logg ut», «Lag flere», «Erstatt». Bruk vekt, farge eller en diskret pil/ikon i stedet. Understreking bare i løpende tekst (f.eks. kildehenvisning kan være en lenke med diskret stil).
2. **Dobbel informasjon:** forsidekortene skal ikke gjenta «X uker til eksamen» som tidslinjen allerede viser. La kortene si noe nytt og nyttig, f.eks. «Neste å øve på: Uke 38: Markedsmiksen» med én tydelig handling, og en kort fremdrift.
3. **Plass:** ingen store, tilfeldig tomme felt. Flashcard- og quizsiden skal ha en bevisst, balansert komposisjon (vertikal sentrering, riktig kortbredde, hint og handlinger på naturlig sted). Forelesningssiden skal ikke ha tom halvdel nederst; vurder rytme og høyder.
4. **Håndverk:** konsekvent 8-punkts avstandsskala, felles venstrekanter, presis innretting av tekstlinjer, tabulære tall, enkle linjeikoner der de hjelper (fil, opplasting, pil, sjekk) tegnet med samme strekbredde, rolige hover-/fokus-tilstander der det er naturlig, finere detaljer på tidslinjen (etiketter som ikke kolliderer, gode avstander). Ingen pynt uten funksjon.
5. Universell utforming: kontrast minst 4,5:1 (mål det), riktig/feil med symbol + tekst, synlig fokusring der det er naturlig.

## Skrift

SVG-ene ses i nettleser på en Mac. Bruk skrifter som er installert på macOS (f.eks. Avenir Next, Charter, Iowan Old Style, New York, Seravek, Optima, Baskerville, Palatino, Futura, Gill Sans, Hoefler Text, SF Pro via `-apple-system`), med fallback-stabel. Oppgi i konsept.md hvilken gratis Google Fonts-skrift som er nærmeste erstatning i den ekte appen.

## Sider og leveranse

Lag `02-emner.svg`, `03-emne.svg`, `04-forelesning.svg`, `07-flashcard.svg`, `09-quiz.svg` i mappen fra oppdraget, pluss `konsept.md` (overskrift «# <Variant>: …», hva som er gjort med hvert grunnproblem, palett med målt kontrast, skrift og Google Fonts-erstatning, styrker og svakheter).

## Kvalitet

Valider XML. Gjengi hver side i headless Chrome (`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --window-size=1440,900 --screenshot=<png> file://<svg>`) og se på PNG-ene. Gjør minst **tre** runder med kritisk gjennomgang som en erfaren produktdesigner: Ser dette ut som et ferdig, premium produkt eller et utkast? Rett alt som ser halvferdig ut. Sammenlign med F for å sikre at det faktisk er et tydelig løft. Ikke spør brukeren. Ikke commit.

Returner bare: mappesti, én setning om resultatet, om alle SVG-ene validerte, og egne tolkninger Silje bør vite om.
