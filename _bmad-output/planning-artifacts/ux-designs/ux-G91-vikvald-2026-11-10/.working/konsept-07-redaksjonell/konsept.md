# Konsept 07: Tidsskriftet

**Personlighet:** Et rolig, kunnskapsrikt fagtidsskrift som behandler Klaras egne notater som stoff verdt å lese, og som alltid oppgir kilden.

## Idé

Studiekamerat ser ut som en avis eller et fagtidsskrift, med masthode, doble hårlinjer, kicker-etiketter («FORELESNING · UKE 37 · 11.09.2026»), store serif-rubrikker og ingresser i kursiv. Emnesiden er satt som en innholdsfortegnelse med ukenummer, prikkede linjer og dato. Sammendraget er en artikkel i tre spalter. Kildene vises som nummererte fotnoter («¹ merkevare-notater.pdf, side 4»), slik studenter kjenner dem fra fagtekster. Det passer Klara fordi kildekravet blir en del av formen og ikke et tillegg. Uttrykket er seriøst og trygt uten å bli kjedelig. Når Klara øver, forsvinner avisoppslaget. Da står bare et utklipp (kortet) på arket, med et tynt fremdriftsbånd øverst, så det er lett å konsentrere seg.

## Palett

| Rolle | Hex | Kontrast mot papir |
|---|---|---|
| Papir (bakgrunn) | `#F5F0E6` | – |
| Trykksverte (tekst, primærknapp) | `#161311` | 16,3:1 |
| Dempet tekst (metadata, ingress) | `#4E473F` | 8,1:1 |
| Aksent, dyp rødbrun (kicker, fotnote, feil, fokus, destruktiv) | `#7B1E17` | 9,1:1 |
| Riktig (bare med ✓ og tekst) | `#2B5B34` | 7,0:1 |
| Felt/utklipp (skjemafelt, kort) | `#FFFDF8` | – |
| Tone (statusbånd, demomodus, kortskygge) | `#EBE3D3` | dempet tekst 7,2:1 |
| Hårlinje (bare dekor/skille) | `#B9AE9B` | 1,9:1, bærer aldri informasjon |
| Feil-/riktig-tone i quiz | `#F2E2DC` / `#E3EBDD` | tekst 8,2:1 / 6,5:1 |

## Typografi

- **Serif** (`Georgia, 'Times New Roman', serif`): masthode (84–96 px, fet), rubrikker (40–76 px, fet, litt stram sperring), mellomtitler (22–28 px), brødtekst og svar (18–28 px), ingress i kursiv (20–22 px). Ukenummer og fotnotetall også i fet serif i aksent.
- **Grotesk** (`'Helvetica Neue', Arial, sans-serif`): kicker-etiketter (14 px, fet, versaler, sperret 1,6), knapper (16–20 px fet), metadata, fotnotelinjer og feilmeldinger (16 px).
- Hierarki: kicker → rubrikk → ingress → brødtekst → fotnote.

## Form og hjørner

Rette hjørner overalt, ingen avrundede kort og ingen skygger (unntatt en flat, forskjøvet «papirskygge» bak øvingskortet). Struktur lages med linjer: tykk og tynn dobbel hårlinje under masthodet, 2 px linje over seksjoner, tynne linjer mellom rader og loddrette spaltelinjer. Primærknapp er svart flate, sekundærknapp er hvit med 1,5 px svart ramme, destruktiv knapp er rødbrun flate.

## Avstandsskala

Basis 8 px: 8 – 16 – 24 – 32 – 48 – 64 – 80. Sidemarg 80 px, spaltemellomrom 40 px, radhøyder i lister 64–80 px. Rammeverket er et spaltenett, med 2 spalter (2/3 + 1/3) eller 3 like spalter.

## Universell utforming

- All tekst har minst 4,5:1 i kontrast (laveste tekstpar er 6,5:1). Hårlinjer brukes bare som dekor.
- Riktig/feil vises alltid med symbol og tekst («✓ Riktig svar», «✗ Ditt svar», «✗ Feil»), i tillegg til farge og en kantlinje på venstre side.
- Skjemafelt har synlige etiketter over feltet, og feilmeldingen står i tekst under feltet med ✗ og tykkere ramme.
- Fokusringen er 3 px i rødbrunt med luft rundt. Den vises på passordfeltet, på en forelesning i innholdsfortegnelsen, på «Middels», «Kunne», «Neste spørsmål», «Delvis riktig», avkrysningen i vilkårene og «Avbryt» i slettedialogen. Slettedialogen setter fokus på det trygge valget.
- Brødtekst er 18–21 px, og ingenting er under 16 px bortsett fra kicker-etiketter (14 px, fet) og forklaringer til skissen.
- Fremdriften står som tekst («Kort 7 av 24»), ikke bare som en stolpe. Det er tastatursnarveier på kortene.
- Tilstander vises i tekst: «PÅGÅR», «Ikke laget ennå» og «Ikke øvd ennå».

## Styrker

- Konseptet har en tydelig personlighet som skiller seg fra vanlige SaaS-apper, og passer godt til en fagapp.
- Fotnotene gjør at kildekravet blir en naturlig og gjenkjennelig del av designet.
- Innholdsfortegnelsen gir god oversikt over mange forelesninger, med dato og status i samme rad.
- Det er lavt fargeforbruk og høy kontrast. Rammeverket er lett å bygge med vanlig CSS (grid, border, ingen bilder).

## Svakheter og risiko

- Tidsskrift-stilen kan virke formell eller «tung». Studenter som ønsker noe lekent og motiverende, kan oppleve det som lite engasjerende.
- Store serif-rubrikker og avisspalter tar plass og fungerer dårligere på smale skjermer. De må forenkles til én spalte.
- Georgia ser forskjellig ut på ulike systemer. Hvis Georgia mangler, kan fallback-fonten gjøre uttrykket mer generisk.
- Rødbrunt brukes både som aksent og for feil/destruktiv handling. Det er trygt fordi tekst og symbol alltid følger med, men betydningen kan bli utvannet.
- Fotnoter krever at brukeren ser ned til kildelinja. Hvis den ligger langt fra teksten, kan det være tungvint, særlig i lange sammendrag.
