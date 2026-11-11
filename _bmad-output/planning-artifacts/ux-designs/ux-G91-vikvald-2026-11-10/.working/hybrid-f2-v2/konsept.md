# F2-V2: Fargede soner

**Idé:** Rammen rundt innholdet (toppfeltet og sidemenyen eller øktpanelet) får en kjølig blågrå tone. Arbeidsflaten i midten er hvit. Sonene skilles med farge i stedet for linjer.

Layout, skrift, tekst og innhold er helt likt F2. Bare fargene er endret.

## Hva er endret og hvorfor

- **Toppfelt og sidemeny** er blågrå (#DFE6EE) og henger sammen som én L-formet ramme. Skillelinjene fra F2 er fjernet, siden fargeskiftet gjør jobben.
- **Innholdsflaten** er hvit. Kortene er hvite med en tynn, kjølig kant.
- **Valgt rad i menyen** er en hvit «lomme» i den blågrå sonen. Den har samme farge som innholdet, og det knytter menyen til siden som vises.
- **Hovedknapper, «I dag» og fremdrift** er dyp skifer (#1F2D42), en mørk blåtone i samme familie som sonene, i stedet for svart.
- **Hvorfor blågrå:** den kjølige tonen er komplementær til den oransje Markedsføring-fargen, slik at oransje ser varmere og friskere ut. Salvie ville kollidert med den grønne emnefargen, og sand ville gjort alt varmt igjen («alt i samme tone»).
- Fokusringen er blå (#2A5BD7) som i F2. Den skiller seg fra de mørke skiferknappene.

## Palett (målt kontrast, WCAG)

| Hex | Rolle | Kontrast |
|---|---|---|
| `#DFE6EE` | Sone: toppfelt, sidemeny, øktpanel | – |
| `#15181F` | Tekst i sonen og på innholdet | 14,1:1 på sone, 17,8:1 på hvitt |
| `#4F5968` | Sekundær tekst i sonen (etiketter, tall, «Logg ut») | 5,6:1 på sone |
| `#FFFFFF` | Innholdsflate, kort og valgt menyrad | – |
| `#566070` | Sekundær grå på innholdet | 6,4:1 på hvitt, 5,8:1 på merknadsflaten, 5,9:1 på hover-rad |
| `#1F2D42` | Dyp skifer: hovedknapper, «I dag», «Du er her», fremdrift | Hvit tekst 13,9:1; 11,0:1 mot sonen |
| `#7F8A99` | Kant på omrissknapper og opplastingsfelt | 3,5:1 på hvitt |
| `#B6C1CE` / `#C6D0DB` | Tomme ruter og spor i øktpanelet (ikke tekst) | – |
| `#DCE1E7` / `#E8ECF0` | Kortkant og skillelinjer | – |
| `#EDF0F4` / `#F1F4F7` / `#F5F7F9` | Hover på tekstknapp, merknadsflate, hover-rad | – |
| `#B83E0C` / `#0B6585` / `#2D6A3B` | Emnefarger, uendret | 5,6–6,5:1 på hvitt; prikkene i sonen 4,5–5,2:1 (grafikk, krav 3:1) |
| `#2A5BD7` | Fokusring | 5,9:1 på hvitt |
| Riktig/feil | Uendret fra F2 | 5,5:1 og 5,7:1 |

## Styrker

- Tydeligst skille mellom «hvor er jeg» (rammen) og «hva gjør jeg» (innholdet). Øktpanelet blir et eget rom ved siden av kortet.
- Færre linjer enn F2, så siden blir roligere.
- Den kjølige rammen får emnefargene til å skinne mer, uten at de brukes mer.

## Svakheter og risiko

- Tonen er dempet. Den løser «alt i samme tone» ved å skille soner, men gir ikke appen en sterk farge.
- På skjermer med dårlig fargegjengivelse kan blågrå og hvitt flyte sammen. Overgangen er ikke en linje lenger.
- Skiferknappene ligner på mørk ramme (V4) i farge. Forskjellen ligger i rammen, ikke i knappene.
- Hvite kort på hvit flate trenger kanten for å synes.

Generator: `scratchpad/hf/genF2farge.py v2 <utmappe>` (kopi av genF2.py med styrbare farger; `f2` gir filer identiske med hybrid-f2).
