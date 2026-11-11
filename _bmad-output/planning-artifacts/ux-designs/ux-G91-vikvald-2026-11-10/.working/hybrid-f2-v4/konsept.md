# F2-V4: Mørk ramme

**Idé:** Toppfeltet og sidemenyen (og øktpanelet) er dyp marine. Innholdet er lyst. Rammen gir appen tyngde og et tydelig «verktøy-preg», og innholdet blir det lyseste og viktigste på skjermen.

Layout, skrift, tekst og innhold er helt likt F2. Bare fargene er endret.

## Hva er endret og hvorfor

- **Toppfelt og sidemeny** er dyp marine (#14213A). Forsiden, som ikke har meny, får bare det mørke toppfeltet.
- **Tekst i rammen** er nesten hvit (#F3F5F9), og sekundær tekst er lys blågrå (#AEB9C9). Begge har god margin over 4,5:1.
- **Emnefargene i menyen** er lysere utgaver (lys oransje #FF9466, lys petrol #62C6EA, lys grønn #7ED492), slik at prikkene synes på mørk bakgrunn. På innholdet brukes de vanlige emnefargene.
- **Valgt menyrad** er en lysere marine (#2A3A57) med hvit, halvfet tekst.
- **Øktpanelet:** fremdriftslinjen er lys oransje (emnefargen). Rutene for riktig og feil har mørke, tonede flater med lys ✓ og ✗. Gjeldende rute har lys ramme. «Avslutt økt» er en omrissknapp med lys kant.
- **Hovedknapper, «I dag» og «Du er her»** er i samme marine som rammen, så rammen og handlingene hører sammen.
- **Papiret** er litt kjøligere (#F6F7F8) enn i F2, så det passer med den blå rammen.
- Fokusringen er blå (#2A5BD7), tydelig skilt fra de mørke knappene.

## Palett (målt kontrast, WCAG)

| Hex | Rolle | Kontrast |
|---|---|---|
| `#14213A` | Ramme: toppfelt, sidemeny, øktpanel; også hovedknapper og «I dag» | Hvit tekst 16,1:1 |
| `#F3F5F9` | Tekst i rammen | 14,7:1 på ramme |
| `#AEB9C9` | Sekundær tekst i rammen | 8,1:1 på ramme, 5,8:1 på valgt rad |
| `#2A3A57` | Valgt menyrad | Hvit tekst 11,4:1 |
| `#FF9466` / `#62C6EA` / `#7ED492` | Emnefarger i rammen | 7,4:1 / 8,2:1 / 9,0:1 på ramme |
| `#FF9466` | Fremdrift i øktpanelet | 5,0:1 mot sporet |
| `#1D4A39` + `#86E3A6` | Riktig/kunne-rute i rammen | ✓ 6,5:1 mot ruten |
| `#552632` + `#FFA096` | Feil/kunne ikke-rute i rammen | ✗ 6,3:1 mot ruten |
| `#7D8BA1` | Kant på «Avslutt økt» | 4,7:1 på ramme |
| `#4A5B78` | Tomme ruter i rutenettet (tallet bærer innholdet) | – |
| `#C9D2DE` på `#1F2E4A` | Tastemerke i menyen | 8,9:1 |
| `#F6F7F8` | Papir (litt kjøligere enn F2) | – |
| `#15181F` / `#5A6070` | Tekst på innholdet | 16,6:1 / 5,9:1 på papir |
| `#858B96` | Kant på omrissknapper | 3,2:1 på papir |
| `#B83E0C` / `#0B6585` / `#2D6A3B` | Emnefarger på innholdet, uendret | 5,3:1 og over |
| `#2A5BD7` | Fokusring | 5,5:1 på papir |
| Riktig/feil på innholdet | Uendret fra F2 | 5,5:1 og 5,7:1 |

## Styrker

- Størst forskjell fra F2. Appen får et tydelig og profesjonelt preg.
- Innholdet blir det lyseste på skjermen, så blikket går rett dit. Under øving er panelet tydelig «bakgrunn».
- Emnefargene lyser fint mot den mørke rammen.

## Svakheter og risiko

- Mørke flater er tyngre. Noen vil oppleve appen som mer «kontor» og mindre vennlig.
- To sett emnefarger (mørke på lyst, lyse på mørkt) gir mer å vedlikeholde.
- Stor kontrast mellom mørk ramme og lyst innhold kan slite på øynene ved lange økter, særlig om kvelden. En mørk modus for innholdet ville løse det, men er ikke tegnet.
- Hovedknappene i samme marine som rammen kan oppleves som en del av rammen og ikke som handlinger. Størrelsen og plasseringen veier opp for det.

Generator: `scratchpad/hf/genF2farge.py v4 <utmappe>` (kopi av genF2.py med styrbare farger; `f2` gir filer identiske med hybrid-f2).
