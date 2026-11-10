# Konsept 03: Nattbibliotek

**Personlighet:** En stille lesesal om kvelden. Mørkt blekk, messing og en grønn bordlampe, og under lampen ligger bare det ene kortet du øver på.

## Idé

Klara øver om kvelden, etter forelesninger og jobb. Nattbibliotek tar det på alvor: mørkt tema som er behagelig for øynene, ro og konsentrasjon i stedet for varsler og dashbord. Appen er bygd som et bibliotek. Emnene står som bøker på en hylle (02). Emnesiden er en innholdsfortegnelse med prikkede ledelinjer og datoer (03). Sammendraget er en boksside med kildene i margen (13). Når Klara øver, går appen i **fokusmodus**: navigasjonen forsvinner, rommet blir mørkere og et lyst «papirkort» ligger i lampelyset midt på skjermen (07, 09, 11). Den eneste lyse flaten i hele appen er det hun skal lære. Retningen passer et studieverktøy som skal hjelpe henne å konsentrere seg, ikke holde henne i appen.

## Palett

| Rolle | Hex | Bruk |
|---|---|---|
| Blekk (bakgrunn) | `#0B1220` | Sidebakgrunn |
| Natt (fokusmodus) | `#080D18` | Bakgrunn under øving, mørkere enn ellers |
| Dyp marine | `#111B2E` | Paneler, toppfelt, dialoger |
| Hevet marine | `#1B2A47` | Valgt flate, «bok» |
| Linje | `#2A3A57` | Skillelinjer (dekor, ikke tekst) |
| Messinglinje | `#6B5631` | Hårlinjer, hylle, bokrammer |
| Pergament (tekst) | `#EEE7D7` | Brødtekst, overskrifter (15,2:1 på blekk) |
| Dempet pergament | `#B5AE9E` | Sekundærtekst (8,5:1 på blekk, 6,5:1 på hevet) |
| Messing/gull (aksent) | `#D9B36A` | Lenker, primærknapp, aktiv navigasjon (9,5:1) |
| Lampegrønn | `#1F5A43` | Lampeskjerm, statusstriper, demomodus-merke |
| Grønn tekst | `#8ED1A9` | «✓ Riktig», «Kunne» (10,6:1) |
| Korall | `#F0998C` | Feil, destruktive handlinger (8,6:1) |
| Fokusring | `#F5D98B` | 3 px ring med 4 px avstand |
| Papir | `#EEE5D1` | Øvingskort og modellsvar |
| Blekk på papir | `#1A2233` | Tekst på kort (12,7:1) |
| Papir dempet / grønn / rød / gull | `#5A5244` / `#1D6A45` / `#A23A2C` / `#7A5418` | Kilde, riktig, feil, etiketter på kort (alle over 4,7:1) |

## Typografi

- **Serif** (`Georgia, 'Times New Roman', serif`) til overskrifter, emne- og forelesningsnavn og alt kortinnhold. Kortsvaret settes stort (30 px) for å lese i ro.
- **Sans** (`'Helvetica Neue', Arial, sans-serif`) til grensesnitt: knapper, etiketter, metadata, kilder. Minst 16 px.
- **Kapitéler** (14 px, versaler med sperring, messing) som små «hyllemerker» over titler: EMNE, FORELESNING, SPØRSMÅL.
- Skala: 14 / 16 / 18 / 20–24 / 32–34 / 44–48 / 60+ (store tall og overskrifter i fokusmodus).

## Form og avstand

- Skarpe, bokaktige hjørner: 2–3 px. Ingen myke «app-kort» med skygge. Den eneste skyggen ligger under papirkortet i lampelyset.
- Rammer: tynne messinglinjer og stiplede «tomme hylleplasser» for å legge til (Nytt emne, opplasting).
- Avstandsskala: 4, 8, 16, 24, 32, 48, 64. Innholdet starter på x = 120, med 64 px marg i fokusmodus.

## Universell utforming

- All tekstkontrast er regnet ut og ligger fra 4,7:1 og opp (de fleste over 7:1), også for dempet tekst på de mørke flatene. Feltkanter har minst 3:1.
- Riktig og feil vises alltid med symbol og tekst, ikke bare farge: «✓ Riktig svar», «✗ Ditt svar», «✗ Feil svar», «✓ Kunne», «✗ Kunne ikke». I resultatlista står «✗ Ditt svar:» og «✓ Riktig svar:» som tekst.
- Synlig fokusring (lys messing, 3 px, med avstand) vises på forelesningsrad (03), valgt vanskelighetsgrad (06), avkrysning (05), «Kunne» (07), «Neste spørsmål» (09), selvvurdering (12) og «Avbryt» som trygt standardvalg i slettedialogen (14).
- Synlige etiketter over alle skjemafelt. Feilmeldingen står som tekst under feltet, ikke bare som rød ramme.
- Tastatursnarveier står på skjermen i øving (1/2/mellomrom, Enter).
- Fokusmodus fjerner visuell støy. Det hjelper brukere med konsentrasjonsvansker.
- Jobbstatus vises som tekst i en fast statuslinje («Lager quizspørsmål … Du får beskjed her»), ikke bare som en animasjon.

## Styrker

- Sterk og gjenkjennelig identitet som skiller seg klart fra standard SaaS. Bibliotekmetaforen går gjennom hele appen: hylle, innholdsfortegnelse, marg og lampe.
- Fokusmodus med papirkort gir tydelig skille mellom å organisere og å øve. Kortinnholdet får høyest kontrast og ro.
- Mørkt tema er behagelig om kvelden, når Klara faktisk øver.
- Kilde i margen (sammendrag) og nederst på hvert kort gjør kildekravet til en naturlig del av formen.

## Svakheter og risiko

- Mørkt tema er ikke for alle. Noen leser dårligere lys tekst på mørk bunn (for eksempel ved astigmatisme). Appen bør ha et lyst tema eller følge systeminnstillingen, og det dobler fargearbeidet.
- Bokhyllen (02) skalerer dårlig ved mange emner og på smale skjermer. Den må kunne falle tilbake til en liste.
- Gull og korall må brukes sparsomt. Ellers forsvinner det rolige preget, og knapper konkurrerer med hverandre.
- Serif og stemningsbilder (lampen på innloggingssiden) kan virke pyntet. Sensor kan spørre om dekoren har en funksjon. Svaret er at lampen er logo og bærer fokusmodus, men den må ikke spre seg.
- Georgia og Helvetica ser forskjellig ut på ulike systemer. Linjebrudd må testes i ekte nettleser.

## Filer

`01-logg-inn.svg` … `15-konto.svg` (15 sider, 1440 × 900). Alle er validert som XML og kontrollert visuelt i nettleser.
