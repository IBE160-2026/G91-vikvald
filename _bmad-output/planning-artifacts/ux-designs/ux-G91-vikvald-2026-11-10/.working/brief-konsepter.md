# Felles brief: 10 designkonsepter for Studiekamerat

Du lager ETT av ti designkonsepter. Konseptretningen står i oppdraget ditt. Alle ti skisserer de samme sidene med samme innhold, slik at de kan sammenlignes. Vær tro mot din retning og gå langt i den: konseptene skal være tydelig forskjellige i personlighet, layout, tetthet, typografi og komposisjon, ikke bare farger.

## Produktet

Studiekamerat er en norskspråklig webapp (PC-nettleser) som gjør studentens egne forelesningsnotater (PDF) om til øvingsmateriale: flashcards, flervalgsquiz, huskeregler (modellkort), fritekstspørsmål og sammendrag. Alt generert innhold viser kilden: filnavn og PDF-sidetall. Stoffet organiseres per emne → forelesning (navn + dato, sortert etter dato). Studenten kan øve på én forelesning eller hele emnet. Appen er et studentprosjekt som vurderes på design, universell utforming og gjennomføring.

Protagonist: **Klara**, studerer markedsføring. Etter forelesningen laster hun opp notatene, og noen dager senere øver hun. Før eksamen øver hun på hele emnet.

## Sidene du skal skissere (én SVG per side)

Lerret: `viewBox="0 0 1440 900"`, width="1440" height="900". Tegn hele nettleservinduets innhold (ikke nettleserkrom, eller bare en svært enkel ramme).

1. `01-logg-inn.svg` – Logg inn / opprett konto (e-post, passord, knapp, lenke til å bytte). Kan gjerne vise en feilmelding i tekst under et felt.
2. `02-emner.svg` – Oversikt over emnene (forsiden etter innlogging). Emner: «Markedsføring» (8 forelesninger), «Samfunnsøkonomi» (5), «Organisasjon og ledelse» (2). Knapp «Nytt emne». Navigasjon med konto/logg ut.
3. `03-emne.svg` – Emnesiden for Markedsføring: forelesningene sortert etter dato (f.eks. «Uke 34: Hva er markedsføring?» 21.08, «Uke 35: Kjøpsatferd» 28.08, «Uke 36: Segmentering og posisjonering» 04.09, «Uke 37: Merkevare» 11.09, «Uke 38: Markedsmiksen» 18.09 …). For hver: antall filer, antall flashcards og quizspørsmål (noen har 0 → «ikke øvd ennå»). Handlinger for hele emnet: «Øv på flashcards (hele emnet)», «Ta quiz (hele emnet)», fritekst. «Ny forelesning».
4. `04-forelesning.svg` – Forelesningssiden «Uke 37: Merkevare», 11.09.2026. Filer: «merkevare-notater.pdf» (12 sider), «merkevare-forelesning2.pdf» (6 sider), med slett/erstatt. Opplastingsområde (dra og slipp / velg PDF). Seksjon for å lage innhold: Flashcards (24 kort), Quiz (15 spørsmål), Huskeregler (3 modellkort), Fritekstspørsmål (0), Sammendrag (ikke laget). Vis at én jobb pågår: «Lager quizspørsmål … du kan bruke resten av appen imens».
5. `05-vilkar.svg` – Dialog før første opplasting: vilkårstekst. Innhold: du er ansvarlig for materialet; bare egne notater eller materiale du har rett til å bruke; notatene sendes til språkmodellen hos Google i EU; Google kan logge forespørsler en periode for å oppdage misbruk; ikke last opp personopplysninger, f.eks. navn på medstudenter. Avkrysning + «Godta og last opp» / «Avbryt».
6. `06-lag-innhold.svg` – Dialog/panel: Lag quiz. Velg omfang: Rask (inntil 10), Vanlig (inntil 20), Dyp (inntil 30). Vanskelighetsgrad: Lett (kjenne igjen en definisjon), Middels (forstå sammenhenger), Vanskelig (bruke stoffet på et eksempel). Knapp «Lag quiz». Vis tastaturfokus (synlig fokusring) på ett valg.
7. `07-flashcard.svg` – Øvingsøkt flashcards, kort 7 av 24, kortet er SNUDD. Forside: «Hva er merkevareekvitet (brand equity)?» Bakside: «Den merverdien et merke gir et produkt, ut over produktets funksjonelle egenskaper. Bygges av kjennskap, assosiasjoner, oppfattet kvalitet og lojalitet.» Kilde: «merkevare-notater.pdf, side 4». Knapper «Kunne» og «Kunne ikke». Fremdrift. Avslutt økt.
8. `08-flashcard-ferdig.svg` – Økt ferdig: Kunne 19, Kunne ikke 5 (som ble repetert). Knapper: Øv igjen, Tilbake til forelesningen.
9. `09-quiz.svg` – Quiz, spørsmål 4 av 15, ETTER at svaret er bekreftet. Spørsmål: «Hvilken av disse beskriver best posisjonering?» Alternativer: A «Å dele markedet inn i grupper med like behov» B «Å skape et tydelig og ønsket bilde av merket i målgruppens bevissthet» (riktig) C «Å velge hvilke segmenter bedriften skal satse på» D «Å fastsette prisen ut fra konkurrentenes priser». Klara valgte C (feil). Riktig/feil skal vises med tekst eller symbol i tillegg til farge (✓ Riktig svar / ✗ Ditt svar). Forklaring + kilde «merkevare-notater.pdf, side 7». Knapp «Neste spørsmål».
10. `10-quiz-resultat.svg` – Resultat: 11 av 15 riktige. Liste over de 4 feil besvarte med riktig svar, kort forklaring og kilde.
11. `11-modellkort.svg` – Huskeregel/modellkort snudd: forside «Forklar AIDA-modellen». Bakside: punktene Attention (oppmerksomhet), Interest (interesse), Desire (ønske), Action (handling), huskeregel «AIDA». Merk «Inneholder formel – sjekk mot kilden» kan vises på et ANNET eksempel; her vis heller knapp «Endre huskeregel». Kilde «merkevare-notater.pdf, side 9».
12. `12-fritekst.svg` – Fritekstspørsmål (langsvar) 2 av 10: «Forklar forskjellen på segmentering og posisjonering, og gi et eksempel.» Klaras svar i tekstfelt (noen setninger). Modellsvar vist med kilde. Selvvurdering: Riktig / Delvis riktig / Feil.
13. `13-sammendrag.svg` – Sammendrag av «Uke 37: Merkevare», punkter ordnet etter tema (Hva er en merkevare, Merkevareekvitet, Merkevarestrategier), hvert punkt 1–2 setninger med kilde (fil, side). Knapp «Lag nytt sammendrag» (erstatter det gamle).
14. `14-slett-bekreft.svg` – Bekreftelsesdialog: slett fila «merkevare-notater.pdf». «Dette sletter også 18 flashcards, 11 quizspørsmål og 2 modellkort laget fra fila. Det kan ikke angres.» Avbryt / Slett fila (destruktiv).
15. `15-konto.svg` – Konto: e-post, logg ut, «Slett kontoen» med forklaring om at alle emner, filer og alt generert innhold slettes for godt. Kan også vise demomodus-merke («Demomodus: innholdet lages av en testmodell»).

Lag også gjerne en tilstand som formidler at innhold lages (på side 4) og en tom tilstand der det passer.

## Krav til innholdet

- All tekst på norsk bokmål, ekte innhold som over. Ingen lorem ipsum, ingen engelsk UI-tekst. Navnet er «Studiekamerat».
- Kilde vises på alt generert innhold (fil + side).
- Universell utforming (WCAG 2.1 AA) skal synes i skissene: tekstkontrast minst 4,5:1, synlige etiketter på skjemafelt, riktig/feil med symbol + tekst, ikke bare farge, synlig fokusring der det er naturlig.
- Brødtekst minst ~16 px i skissen.

## Designkvalitet (unngå generisk KI-estetikk)

- Ta en klar, modig retning og gjennomfør den konsekvent. Ingen «standard SaaS-dashbord med lilla gradient og kort med skygge» med mindre retningen din eksplisitt ber om noe slikt.
- Typografi bærer mye: velg et bevisst typografisk hierarki (størrelser, vekter, skrifttype). Bruk systemskrifter eller generiske fallbacks i font-family (f.eks. `Georgia, 'Times New Roman', serif`, `'Helvetica Neue', Arial, sans-serif`, `ui-monospace, Menlo, monospace`), ingen eksterne fonter.
- Begrenset, bevisst palett. Unngå meningsløs dekor, emoji som ikoner, og tilfeldig fargebruk.
- Rytme og luft: konsekvent avstandsskala, rett innretning.
- La retningen synes i komposisjon og layout (navigasjonsmønster, hvor øving skjer, hvordan kort og quiz framstår), ikke bare i farger.

## Teknisk

- Ren, gyldig SVG (XML): escape `&` som `&amp;`, `<` som `&lt;`. Ingen eksterne ressurser, ingen script, ingen foreignObject. Bryt tekst manuelt med `<tspan>`/flere `<text>` slik at ingenting renner over.
- Sett `xmlns="http://www.w3.org/2000/svg"` og `lang="nb"` på rot-elementet.
- Etter at du har skrevet filene: sjekk at hver fil er gyldig XML (f.eks. `python3 -c "import xml.dom.minidom,sys;[xml.dom.minidom.parse(f) for f in sys.argv[1:]]" *.svg`) og rett feil.

## Leveranse

Skriv filene i mappen du får oppgitt. I tillegg `konsept.md` med:
- Navn på konseptet (norsk, kort) og en setning om personligheten.
- 3–5 setninger om idéen og hvorfor den passer Klara og Studiekamerat.
- Palett med hex-verdier og rolle, typografi, form/hjørner, avstandsskala.
- Hvordan konseptet ivaretar universell utforming.
- Styrker og svakheter / risiko (ærlig).

Returner til hovedagenten bare: mappesti, konseptnavn, én setning om personligheten, og om alle 15 SVG-er validerte. Ikke lim inn SVG-innhold.
