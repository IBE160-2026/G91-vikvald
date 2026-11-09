# Språkvask av PRD og addendum (2026-11-09)

Standard: linsene `structure` og `prose` i `bmad-review`. Innholdet er ikke endret: ingen krav, tall, ID-er, terskler, datoer, issue-nummer eller beslutninger er rørt, og ingen seksjoner er flyttet. 35 små endringer: 28 i `prd.md` og 7 i `addendum.md`.

**Hva dokumentet er til for:** å vise sensor hva Studiekamerat skal gjøre, hvorfor, og hvordan det etterprøves, slik at forfatteren kan forklare hvert valg.

**Struktur:** Rekkefølgen fungerer for formålet: sammendrag, brukerreiser, krav, suksesskriterier, omfang og begrensninger. Ingen seksjoner er kuttet eller flyttet. «Valg av språkmodell» og «Vurdering av Googles logging» står under ikke-funksjonelle krav uten egne ID-er. Det er greit, fordi de begrunner NFR-ene rundt seg.

## Endringer i prd.md

### Faste begreper
- «KI-en» → «språkmodellen» i sammendraget (særtrekk 4).
- «Ekte modell» → «En ekte språkmodell» (Kostnad), og «tilgang til modellen» → «tilgang til språkmodellen» (NFR-4).
- «en mock» → «en mock-modell» (SK-4).
- «KI-vurdering» → «KI-tilbakemelding» i tabellen «Endringer fra briefen», slik at funksjonen har samme navn overalt.
- «fire svar» → «fire svaralternativer» (innledningen til flervalgsquiz), som i FR-30.
- «materiell» → «materiale» (sammendraget), som ellers i dokumentet.
- Ordlisten: «Kjerneflyt» nevner nå også emner og forelesninger, slik som i «Omfang → Kjerneflyt».

### Klarere setninger
- Problemet: «med et semester med rotete notater» → «med rotete notater fra et helt semester».
- For hvem: dobbelt «selv» fjernet («å lage øvingsmaterialet»).
- UJ-1 steg 1: «notatene sine til forelesningen» → «fra forelesningen».
- Innledningen til må ha-funksjoner: forklarer nå at funksjon 1–5 er «MVP-en», siden ordet brukes senere uten forklaring.
- FR-14: «under» → «som hører til».
- FR-29: «samme regel for for lite stoff som i FR-18» → «samme regel som i FR-18 når det er for lite stoff».
- Bør ha-funksjoner: innledningen sier først rekkefølgen og så vilkåret.
- FR-55: «erstatter det det gamle» → «erstatter det nye sammendraget det gamle».
- Innledningen til ikke-funksjonelle krav: «gjelder MVP-en» → «er en del av MVP-en».
- NFR-14: «i vinduer ned til 768 piksler brede» → «i vinduer som er ned til 768 piksler brede».
- Kostnad: «under noen kroner» → «høyst noen få kroner» (samme betydning).
- SK-10: «modellkort uten nyttig huskeregel» → «modellkort der alle punktene har samme forbokstav», som er det FR-44 faktisk sier.
- Tabellen «Endringer fra briefen», raden om nøkkelbegreper: setningen fikk subjekt («Nøkkelbegreper brukes ikke …»).
- Kjente risikoer, ventetid: «tok 9 quizspørsmål fra 3 sider 53 sekunder» → «tok det 53 sekunder å lage 9 quizspørsmål fra 3 sider».
- Kjente risikoer, formelregelen: «enn for lite» → «enn en for lite», som i FR-40.

### Fornorsking og stemme
- «Spaced repetition» → «Spredt repetisjon (spaced repetition)».
- «Deling og quizzing mellom studenter» → «Deling av innhold og quiz mellom studenter».
- Begrensninger: «vi vet ikke» → «jeg vet ikke», fordi dokumentet ellers bruker «jeg» i et soloprosjekt.
- Begrensninger: «valg som type huskeregel» → «valg som typen huskeregel».
- Begrensninger: «addendum til briefen» er nå en lenke til `../../briefs/brief-G91-vikvald-2026-09-24/addendum.md`. Fila finnes.

## Endringer i addendum.md

- Overskrift og tekst: «mock» → «mock-modell».
- «i demoen» → «i demomodus».
- Tenking: forklart som «modellens tenking (resonneringen før den svarer)».
- «fordi modeller forsvinner (`gemini-2.5-flash` ga 404)» → «fordi modeller kan bli fjernet (i testen ga `gemini-2.5-flash` feilen 404)».
- PDF og formler: setningen om regelen for bilde av siden er skrevet om, så det går fram at «mange vektortegninger og lite tekst» er et eksempel på når regelen slår inn.
- Instrukser: «må forbedres for troverdige feilalternativer» → «må forbedres for å gi troverdige feilalternativer».

## Krysshenvisninger

Jeg sjekket alle henvisninger til FR, NFR, SK, UJ og issue mot kravteksten. Lenkemålene finnes (brief, tilbakemelding, research, beslutninger). Disse punktene trenger en beslutning:

1. **SK-1 mot «Prioritering».** SK-1 sier at hvert må ha-krav (FR-1 til FR-41) skal ha en automatisk test. «Prioritering» og innledningen til ikke-funksjonelle krav regner også alle NFR-er som må ha. Skal SK-1 bare gjelde FR-ene, slik teksten sier nå, eller også NFR-ene? Hvis bare FR-ene, kan «må ha-krav» byttes ut med «må ha-funksjonskrav».
2. **SK-6 mot FR-5.** SK-6 viser til FR-5 for at «avbrudd sletter ingenting». FR-5 sier at kontosletting krever bekreftelse, men ikke at avbrudd sletter ingenting. Det sier bare FR-12, og FR-14 får det gjennom «som i FR-12». Vurder å legge til «Avbryter hun, slettes ingenting» i FR-5, eller å fjerne FR-5 fra den delen av SK-6.
3. **Modellversjon i addendum.** «Modell» anbefaler `gemini-3.5-flash`, mens «Prisdato» handler om prisen på Gemini 3.8 Flash. Researchen viser at prisøkningen gjelder 3.8 Flash. Det er derfor ingen feil, men leseren kan tro at den anbefalte modellen blir dyrere. Skal punktet forklare at 3.8 Flash er et alternativ, eller er punktet overflødig hvis 3.5 Flash velges? Datoen 2027-01-28 er researchens frist for å sjekke vilkår og priser på nytt og er riktig.
4. **Kjente risikoer, «Passiv bruk».** Punktet sier at flashcards «krever svar før fasiten vises». FR-24 krever bare at studenten snur kortet, ikke at hun svarer. Vurder «krever at studenten tenker gjennom svaret før fasiten vises», eller la det stå.

## Ikke endret med vilje

- «researchen» er beholdt fordi det er navnet på dokumenttypen og lenkene.
- «teknologistakk», «tokens», «endepunkt» og «mellomlagring» er beholdt fordi de er etablerte fagord.
- FR-49 og FR-54 beskriver kilden med litt andre ord enn FR-20 og FR-32. FR-39 gjelder uansett for alt innhold, så det er ikke rettet.
