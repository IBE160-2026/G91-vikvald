# Konsept 05: Rått notat

**Personlighet:** Ærlig, rå og direkte – en app som ser ut som en arbeidsbenk og ikke later som den er noe annet.

## Idé

«Rått notat» er neo-brutalisme: tykke svarte rammer, harde skygger uten uskarphet, flate primærfarger og knapper som ser ut som fysiske klosser du kan trykke ned. Typografien er tung og stor, og alt som er metadata (datoer, antall, filnavn, sidetall) står i monospace, slik at innhold og «maskinfakta» aldri blandes. Kilden er gjort til en egen komponent: en svart-og-hvit etikett «KILDE | fil, side» som ser lik ut overalt, så Klara lærer å stole på den og å sjekke den. Retningen passer en student som vil ha tydelighet framfor pynt: hver side har én tydelig hovedhandling, og øvingsøktene tar over hele skjermen med en svart øvingslinje øverst, slik at det er åpenbart når hun er «i økt» og når hun organiserer stoff. Uttrykket er også lett å skille fra standard SaaS-estetikk, noe som gir prosjektet en egen identitet.

## Komposisjon

- **Organiseringssider** (emner, emne, forelesning, sammendrag, konto): hvit toppstripe med gul logokloss og brødsmuler i monospace. Emnesiden er en tabell med fet svart overskriftsrad og et eget sidepanel «Øv på hele emnet».
- **Øvingssider** (flashcard, quiz, modellkort, fritekst): svart øvingslinje med «Avslutt økt», plassering i monospace og en segmentert fremdriftsstripe (gul = ferdig, blå = nå, hvit = igjen). Kortet er én stor kloss med «FORSIDE»-felt øverst og «BAKSIDE»-fane.
- **Dialoger**: siden under dempes, dialogen er en kloss med farget topplate (gul = informasjon, blå = handling, rød = destruktiv).
- **Jobb pågår**: stripet gul/svart fremdriftslinje i raden for innholdstypen, pluss en svart statusstripe nederst på siden.

## Palett

| Farge | Hex | Rolle |
|---|---|---|
| Blekk | `#000000` | Rammer, skygger, tekst, overskriftsrader |
| Papir | `#F3EFE4` | Bakgrunn |
| Hvit | `#FFFFFF` | Flater for innhold, kort, felt |
| Knallgul | `#FFD60A` | Logo, markering, valgt tilstand, sekundærknapper, «ikke øvd ennå» |
| Ren blå | `#1D3FD8` | Primærhandling (hvit tekst, 7,6:1) og fokusring |
| Grønn | `#2EDB7F` | Riktig / Kunne (alltid med ✓ og svart tekst, ca. 9:1) |
| Rød | `#FF5A4E` | Feil / Kunne ikke / Slett (alltid med ✗ og svart tekst, ca. 6,8:1) |
| Feiltekst | `#B3140C` | Feilmelding på hvit bakgrunn (ca. 7:1) |

## Typografi

- **Overskrifter og knapper:** `'Arial Black', 'Helvetica Neue', Arial, sans-serif`, vekt 900, versaler, stramt sporing. H1 64–120 px, kortoverskrifter 22–34 px.
- **Brødtekst:** `'Helvetica Neue', Arial, sans-serif`, 17–28 px (kortsvar 28 px).
- **Metadata og kilder:** `ui-monospace, Menlo, 'Courier New', monospace`, 15–18 px, ofte fet versal.

## Form

- Rette hjørner overalt (radius 0).
- Rammer 4 px (3 px på etiketter og små elementer).
- Harde skygger forskjøvet 4–16 px ned/høyre, ingen blur. Større element = større skygge.
- Opplastingsfelt med tykk stiplet ramme.

## Avstandsskala

8-basert: 8 · 16 · 24 · 32 · 40 · 64 px. Ytre marg 40 px, intern polstring i klosser 24–32 px.

## Universell utforming

- Svart tekst på gul, grønn og rød gir god kontrast; hvit tekst brukes bare på blå og svart. Alle par er over 4,5:1.
- Riktig/feil vises alltid med symbol og tekst («✓ RIKTIG SVAR», «✗ DITT SVAR», «✓ KUNNE», «✗ KUNNE IKKE»), ikke bare farge.
- Synlige etiketter over alle skjemafelt; feilmelding i tekst med ✗-symbol under feltet.
- Fokusring: 4 px blå ramme med luft rundt elementet (vist på passordfelt, avkrysning, vanskelighetsgrad, selvvurdering og «Avbryt» i slettedialogen, der fokus starter på det trygge valget).
- Brødtekst minst 16–17 px, store klikkflater (knapper 40–80 px høye).
- Kilden er en fast komponent med samme plassering og utseende, lett å finne også for skjermleser som tekst.

## Styrker

- Svært tydelig hierarki og høy kontrast – sterkt utgangspunkt for UU.
- Kildeetiketten blir et gjenkjennelig «varemerke» og støtter kravet om sporbare kilder.
- Lett å bygge: rette hjørner, faste rammer og skygger er enkle CSS-regler, ingen bilder eller gradienter.
- Klart skille mellom «organisere» og «øve».

## Svakheter og risiko

- Uttrykket er høyt og kan oppleves masete eller slitsomt over lange økter; det tunge svarte kan føles aggressivt.
- Mange tykke rammer og skygger gjør tette sider (tabell, sammendrag) visuelt tunge.
- Arial Black finnes ikke på alle systemer; fallback til Helvetica/Arial gir svakere karakter.
- Rødt som både «feil svar» og «slett» kan gjøre feilsvar mer dramatiske enn nødvendig.
- Stilen er trendpreget og kan virke mindre «seriøs» for noen sensorer.
