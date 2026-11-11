# F2-V3: Sterkere emnefarger

**Idé:** Fargen kommer fra fagene. Emnefargene blir friskere og brukes på flere steder, slik at hvert emne får sin egen farge gjennom appen. Det er ingen store fargeflater, bare striper, prikker og streker.

Layout, skrift, tekst og innhold er helt likt F2. Bare fargene er endret, pluss tynne striper og én prikk som følger av fargene.

## Hva er endret og hvorfor

- **Friskere emnefarger:** Markedsføring #CF4A0C (var #B83E0C), Samfunnsøkonomi #0B78B8 (var #0B6585), Organisasjon og ledelse #1A8247 (var #2D6A3B). De er lysere og mer mettede, men har fortsatt minst 4,5:1 mot hvitt.
- **Emnekortene på forsiden** har en 4 px toppstripe i emnefargen, og fremdriftsstrekene er i emnefargen.
- **Emnesiden:** en emnefarget prikk henger i margen foran tittelen «Markedsføring», og kortet «Øv på hele emnet» har emnestripen.
- **Valgt rad i menyen** har en svært lys oransje tone (#FCEFE8) og en oransje strek til venstre.
- **Øktpanelet:** fremdriftslinjen og rammen rundt gjeldende rute er oransje. **Flashcardet** har en tynn oransje toppstripe, så kortet hører synlig til emnet.
- **Uendret:** knappene er svarte, «I dag» er svart, og papiret er det samme. Fargen ligger i emnene, ikke i appen.

## Palett (målt kontrast, WCAG)

| Hex | Rolle | Kontrast |
|---|---|---|
| `#CF4A0C` | Markedsføring: linje, stasjoner, stripe, prikk, fremdrift, menystrek | 4,5:1 på hvitt, 4,2:1 på papir, 4,0:1 på valgt rad (bare grafikk, krav 3:1) |
| `#0B78B8` | Samfunnsøkonomi | 4,8:1 på hvitt, 4,5:1 på papir |
| `#1A8247` | Organisasjon og ledelse | 4,9:1 på hvitt, 4,5:1 på papir |
| `#FCEFE8` | Svak emnetone på valgt menyrad | Blekk 15,8:1, grå 5,6:1 |
| `#15181F` | Blekk: tekst, hovedknapper, «I dag» | 16,6:1 på papir |
| `#5A6070` | Sekundær grå | 5,9:1 på papir |
| `#F7F7F5` / `#FFFFFF` | Papir og flater, uendret | – |
| `#858B96` | Kant på omrissknapper | 3,2:1 på papir |
| `#2A5BD7` | Fokusring, uendret | 5,5:1 på papir |
| Riktig/feil | Uendret fra F2 | 5,5:1 og 5,7:1 |

Emnefargene bærer ikke tekst noe sted i disse sidene. De er likevel holdt på minst 4,5:1 mot hvitt, slik at de kan brukes til tekst senere.

## Styrker

- Mest «studentnært»: fargene betyr noe (emnet), og Klara lærer raskt at oransje er Markedsføring.
- Forsiden blir livligere uten å bli rotete. Tre farger på tre kort gir tydelig skille.
- Knappene forblir svarte, så det er aldri tvil om hva som er hovedhandlingen.

## Svakheter og risiko

- Fargen avhenger av emnene. Har Klara bare ett emne, blir appen nesten like grå som F2.
- Den grønne emnefargen (#1A8247) ligner på riktig-grønn (#1C6E36). Det går fordi riktig alltid har ✓ og tekst, men to grønne bør vurderes hvis appen får flere emner.
- Med mange emner trengs flere farger som alle tåler kontrastkravet. Det må lages en fast emnepalett.
- Toppstripene er en ny detalj. De må brukes bare på flater som hører til ett emne, ellers blir de pynt.

Generator: `scratchpad/hf/genF2farge.py v3 <utmappe>` (kopi av genF2.py med styrbare farger; `f2` gir filer identiske med hybrid-f2).
