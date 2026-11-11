# Konsept 10: Klartekst

**Personlighet:** Trygg og rett fram, som et godt offentlig skjema: alt står der det skal stå, og ingenting kan misforstås.

## Idé

Klartekst gjør universell utforming til selve estetikken i stedet for et krav som sjekkes av til slutt. Retningen henter grepene fra offentlige designsystemer som NAV Aksel og GOV.UK: én kolonne som leses ovenfra og ned, stor brødtekst (20–22 px), tykke svarte rammer, store klikkflater og en gul og svart fokusring som er umulig å overse. Klara bruker appen i to situasjoner, rett etter forelesning og under eksamenspress. Begge gangene tjener hun på at hver side har ett tydelig formål, at hver knapp sier hva den gjør, og at kilden alltid står på samme sted. Studiekamerat vurderes på universell utforming, og her er tilgjengeligheten noe sensor kan se direkte i skissene, ikke bare lese om.

Et bevisst grep: **ingen modale dialoger.** Vilkår (05), «Lag quiz» (06) og «Slett fil» (14) er egne sider med «Tilbake»-lenke, etter mønsteret «én ting per side». Da slipper vi fokusfeller og problemer med skjermleser og zoom, og nettleserens tilbakeknapp virker som forventet.

## Palett

| Hex | Rolle | Kontrast |
|---|---|---|
| `#0B0C0C` | Blekk: tekst, rammer, topplinje, fokusstrek | 19,6:1 på hvit |
| `#FFFFFF` | Papir: bakgrunn | – |
| `#0B3D91` | Klartekst-blå: lenker, primærknapp, fremdrift, stripe under topplinjen | 10,0:1 |
| `#06245A` | Skygge under primærknapp | – |
| `#FFDD00` | Fokusgul, brukes **bare** til fokus | blekk på gul 14,6:1 |
| `#3B3F42` | Hjelpetekst og metadata | 10,6:1 |
| `#00623A` | Riktig / «Kunne» / ferdig | 7,5:1 |
| `#A3221B` | Feil / destruktiv handling | 7,5:1 |
| `#F3F2F1` | Rolig flate (vilkår, opplasting, huskeregel) | blekk 17,5:1 |
| `#E8EEF7` | Informasjonsflate (jobb pågår, modellsvar) | blekk 16,8:1 |
| `#E6F2EC` / `#FBEAE9` | Bakgrunn for riktig og feil quizalternativ | grønn/rød fet tekst ca. 6,5:1 |
| `#505A5F` | Ramme på nøytrale quizalternativ | 7,1:1 |

All brødtekst er over 7:1 (AAA). Eneste unntak er grønn og rød **fet 20 px** tekst på lys tone (6,5:1). Den regnes som stor tekst, der AAA-kravet er 4,5:1.

## Typografi

- Én familie: `'Helvetica Neue', Helvetica, Arial, sans-serif`. Nøytral og godt lesbar, og den skal ikke ta oppmerksomheten fra innholdet.
- H1 48 px fet · H2 30–32 px fet · H3 og spørsmål 24–28 px fet · etikett 22 px fet · brødtekst 20 px · hjelpetekst 20 px grå · kilde 18–20 px. Ingenting er mindre enn 18 px.
- Over hver H1 står en «stedstekst» (22 px grå, f.eks. «Emne», «Slett fil»), som forteller hvor du er.
- Lenker er alltid understreket. Små versaler med sperring brukes bare til kortetikettene «SPØRSMÅL» og «SVAR».

## Form, hjørner og ikoner

- **Ingen avrundede hjørner og ingen skygger.** Rammene er 2–3 px svarte, og kort har 3 px ramme.
- Knapper er 56 px høye (minst 44 px treffflate) med en 4 px «sokkel» under. Primær er blå, sekundær er hvit med svart ramme, destruktiv er rød, og «Kunne» er grønn.
- Fokus: knappen eller lenken blir gul med svart sokkel eller understrek. Skjemafelt, radioknapper og avkrysningsbokser får 8 px gul ring utenpå en 4 px svart ramme. Gult brukes ikke til noe annet. Fokus vises på side 01, 02, 05, 06, 07, 08, 09, 11, 12 og 14.
- Ikoner er enkle, tykke strektegninger (hake, kryss, pil, PDF, søppelbøtte, blyant), og de står alltid sammen med tekst.

## Avstandsskala og raster

- Skala: 8 · 16 · 24 · 32 · 48 · 64 px.
- Innholdet ligger i én kolonne på 800 px (x 320–1120), midtstilt i et vindu på 1440 px. Topplinjen er svart, 80 px høy, med en 10 px blå stripe under.
- Lister er tabellrader med 3 px svart linje øverst og 2 px grå linje mellom radene, i stedet for kort. Det gir rolig lesing og en tydelig rekkefølge.

## Universell utforming

- Kontrasten er AAA for all brødtekst, se tabellen.
- Fokus er alltid synlig, med gul og svart dobbel markering som fungerer på både lys og mørk bakgrunn.
- Rekkefølgen for lesing og tabulering følger det visuelle: én kolonne, ovenfra og ned. Det er ingen sidepaneler.
- Feil vises på tre måter: en feiloppsummering øverst med lenke til feltet, rød strek ved feltet og teksten «Feil: …» med kryss. Ingenting formidles bare med farge.
- Quiz: «✓ Riktig svar» og «✗ Ditt svar – feil» står som tekst og symbol. Bokstavene A–D gjør alternativene lette å omtale og å velge med tastaturet.
- Alle skjemafelt har synlige etiketter og hjelpetekst. Radioknapper og avkrysningsbokser er 40 px.
- Fremdrift vises både som tekst («Kort 7 av 24», «6 ferdige, 18 igjen») og som stolpe.
- Ved destruktive valg starter fokus på «Avbryt», og konsekvensen står i klartekst («18 flashcards, 11 quizspørsmål og 2 modellkort … kan ikke angres»).
- Det står hva som skjer etter en handling, for eksempel «Fokus flyttes hit når svaret er bekreftet» og «Kortene du ikke kunne, kommer igjen til slutt».
- Når innhold lages, vises tilstanden både som et banner og i selve raden, med tekst og en ikke-blinkende indikator.

## Styrker

- Sensor ser universell utforming direkte i skissene, noe som passer godt med vurderingskriteriene.
- Retningen er svært lett å bygge konsekvent i kode: få komponenter, få farger, ingen spesialeffekter, og den egner seg godt for Tailwind eller vanlig CSS.
- Den tåler zoom på 200–400 % og smale vinduer, fordi alt allerede er én kolonne.
- Trygg i stressede eksamensøkter: lite å tolke og ingen skjulte handlinger.

## Svakheter og risiko

- **Kan oppleves som et offentlig skjema og ikke som en studieapp.** Studiekamerat kan virke strengt og lite motiverende, og identiteten ligger nesten bare i logoen, den blå stripen og den gule fokusfargen.
- **Nærhet til GOV.UK og NAV:** grepene ligner tydelig på disse designsystemene. Det må begrunnes som inspirasjon og ikke se ut som en kopi.
- Store skrifter og én kolonne gir lange sider. Emnesiden, forelesningssiden og sammendraget må rulles på en skjerm med 900 px høyde, og det gjør det vanskeligere å få oversikt over mange forelesninger.
- Mye av bredden på en PC-skjerm står tom, så det kan se nakent ut på store skjermer.
- Valget om å ikke bruke modaler avviker fra briefens «dialog». Det koster et ekstra sidebytte, og man mister den visuelle sammenhengen med siden man kom fra.
- Gul brukes bare til fokus. Det krever disiplin, fordi gul ikke kan brukes som varslings- eller markeringsfarge noe annet sted.
