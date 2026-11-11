# F2-V1: Signaturfarge

**Idé:** Studiekamerat får én egen merkefarge, en dyp ultramarin. Den brukes bare der Klara kan gjøre noe eller der appen viser «hvor du er». Resten er F2 som før.

Layout, skrift, tekst og innhold er helt likt F2. Bare fargene er endret.

## Hva er endret og hvorfor

- **Hovedknapper** («Øv nå», «Øv på flashcards», «Kunne», «Neste spørsmål») er ultramarine i stedet for svarte. Da skiller de seg fra teksten, og siden får ett tydelig fargepunkt.
- **Handlinger i tekst** («Åpne», «Start», «Lag flere», «Erstatt») er også ultramarine. Fargen betyr altså «dette kan du trykke på».
- **Valgt rad i menyen** har en svak ultramarin tone og en loddrett strek til venstre.
- **«I dag»** og **«Du er her»** på tidslinjen, fremdriften på emnekortene og i øktpanelet, gjeldende rute i rutenettet og **logo-prikken** er ultramarine.
- **Papiret** er litt varmere (#F8F7F3). En varm bakgrunn får den kjølige blåfargen til å virke klarere.
- **Fokusringen** er svart (blekk) i stedet for blå, slik at den ikke forveksles med merkefargen.
- Ultramarin ligger langt nok fra emnefargene (oransje, petrol, grønn) til at den ikke leses som et emne. Den er mer fiolett enn petrol-blåen til Samfunnsøkonomi.

## Palett (målt kontrast, WCAG)

| Hex | Rolle | Kontrast |
|---|---|---|
| `#3A3FB0` | Merkefarge: hovedknapper, handlinger, «I dag», fremdrift, logo-prikk | 8,3:1 på hvitt, 7,8:1 på papir, 7,1:1 på valgt rad |
| `#EBEBF8` | Merketone: valgt menyrad, hover på tekstknapp, filflis, initialsirkel | Blekk 15,0:1, grå 5,3:1 |
| `#FFFFFF` på `#3A3FB0` | Tekst på hovedknapper | 8,3:1 |
| `#F8F7F3` | Papir (litt varmere enn F2) | – |
| `#FFFFFF` | Flater: kort, paneler | – |
| `#15181F` | Blekk: tekst og fokusring | 16,6:1 på papir, 17,8:1 på hvitt |
| `#5A6070` | Sekundær grå | 5,9:1 på papir, 5,5:1 på merknadsflaten |
| `#858B96` | Kant på omrissknapper og opplastingsfelt | 3,2:1 på papir |
| `#DDDCD5` / `#EAE9E3` | Kortkant og skillelinjer | – |
| `#B83E0C` / `#0B6585` / `#2D6A3B` | Emnefarger, uendret fra F2 | 5,3–6,5:1 |
| `#1C6E36` / `#E8F3EB`, `#B42318` / `#FCEBE9` | Riktig og feil, uendret | 5,5:1 og 5,7:1 |

## Styrker

- Minst mulig endring for størst mulig effekt. Appen får en identitet uten at noe annet flytter seg.
- Fargen har én tydelig betydning: handling og posisjon. Det gjør siden lettere å skanne.
- Lett å bygge: én ny farge og én lys tone.

## Svakheter og risiko

- Blåfiolett er en vanlig farge for apper og kan virke litt «generisk SaaS» hvis den brukes for mye.
- Den svarte fokusringen er tydelig, men mindre «vennlig» enn en farget ring.
- Når både knapper og tekstlenker er ultramarine, må fargen ikke brukes til pynt noe sted, ellers mister den betydningen.
- Med tre emnefarger og en merkefarge er det fire farger på forsiden. Det fungerer fordi merkefargen bare sitter på knapper og «I dag».

Generator: `scratchpad/hf/genF2farge.py v1 <utmappe>` (kopi av genF2.py med styrbare farger; `f2` gir filer identiske med hybrid-f2).
