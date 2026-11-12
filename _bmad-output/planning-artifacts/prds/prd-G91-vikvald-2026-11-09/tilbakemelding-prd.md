# Tilbakemelding på PRD

| | |
|---|---|
| **Gruppe** | G91 – G91-vikvald |
| **PRD vurdert** | `_bmad-output/planning-artifacts/prds/prd-G91-vikvald-2026-11-09/prd.md` (status `final`, sist endret 2026-11-11, commit 2ff0218) |
| **Dato** | 2026-11-12 |
| **Type** | Formativ tilbakemelding, ikke karakter |

Jeg har også lest `addendum.md` i samme mappe.

## 1. Samlet inntrykk

Dette er en sterk PRD med egen tese, ærlige avgrensninger og krav som for det meste kan bli testtilfeller. Størst risiko er ikke kvaliteten på kravene, men at omfanget og avhengigheten av Google Cloud er stort for ett soloprosjekt med frist for ferdig app 5. desember, og at noen sentrale krav (mock-modellen, øktresultatet) ennå ikke er presise nok til å bli stories.

## 2. Dette fungerer godt

1. **KI-kontroll og kvalitetssikring er tenkt gjennom.** Avsnittet «Konfidensnivå» begrunner hvorfor appen *ikke* viser modellens egen sikkerhet, og peker i stedet på kontroller som kan sjekkes: kilde på alt (FR-20, FR-32), validering før lagring (FR-38) og stikkprøver (SK-13 til SK-17). SK-4 tester dette med en mock som med vilje gir ugyldige svar. SK-17 («Motvekt») hindrer at lav feilprosent kommer av at bare enkle kort lages.
2. **Avveininger og endringer er synlige.** Tabellene «Endringer fra briefen» og «Endringer etter UX-arbeidet» sier hva som ble gitt opp og hvorfor. Det samme gjelder vurderingen av Googles logging (NFR-5/6) og valget av sky i EU framfor lokal modell.
3. **Kjørbarhet for sensor.** NFR-2 til NFR-4 (demomodus som standard, testbruker, `.env.example`, én innstilling for modellvalg) svarer direkte på briefen-tilbakemeldingen. Kan kuttes-merkingen gir en reell kuttrekkefølge på funksjonsnivå.

## 3. Oversikt per dimensjon

| Dimensjon | Vurdering | Kort begrunnelse |
|---|---|---|
| Beslutningsklarhet | sterk | Beslutninger står som beslutninger, med begrunnelse og hva som velges bort. |
| Substans | sterk | Ingen pynt. Tallene (53 s for 9 spørsmål, 5 % feil i studie) og NFR-ene er produktspesifikke. |
| Strategisk sammenheng | god | Tydelig tese («bygd for semesteret»), og FR-56 til FR-58 støtter den. Men huskeregler, ett av fire særtrekk, er «bør ha», og SK-ene måler ikke semesterverdien (bare SK-18). |
| Testbarhet | god | De fleste FR-er har observerbare utfall. Noen sentrale krav bruker fortsatt adjektiver (4.4). |
| Scope og avgrensning | god | Utenfor-lista og Kan kuttes er ærlige, men omfanget er stort og kutt-lista rører ikke de tyngste kravene (4.1). |
| Brukbarhet for neste fase | god | Brukerreiser, SK-er og kryssreferanser fungerer. Noen ID- og begrepsavvik (kap. 5). |
| Formtilpasning | god | Passer et soloprosjekt med UX-fase. 58 FR, 17 NFR og 20 SK er tungt å holde ved like. |

## 4. Viktigste forbedringer

### 4.1 Omfanget er stort for tiden som er igjen
- **Alvorlighet:** høy
- **Hvor:** «Alle de ikke-funksjonelle kravene er en del av MVP-en»; Omfang → Kjerneflyt: «Målet er at appen er ferdig 5. desember»
- **Problem og hvorfor det betyr noe:** Må ha omfatter innlogging, fem funksjonsgrupper, semesterlinje, demomodus med mock, Gemini på Vertex, WCAG 2.1 AA med automatiske tester og tre nettlesere. Det er 23 dager igjen. Kan kuttes-merkene gjelder små krav (FR-26, FR-58). De tyngste kravene kan ikke kuttes.
- **Forslag:** Lag en rangert kuttliste også for NFR-er og integrasjoner, og en tidsplan med to milepæler. For eksempel: *«27.11: kjerneflyten virker i demomodus. 1.12: Gemini koblet på. NFR-15: Chrome og Edge kontrolleres, Safari kun hvis tilgjengelig. NFR-13: automatisk universell utforming på tre nøkkelsider.»* Slik vet arkitektur og epics hva som bygges først og hva som går først.

### 4.2 Ekte språkmodell hviler på uavklart tilgang, uten plan B
- **Alvorlighet:** høy
- **Hvor:** «Kostnad … ikke bekreftet at bruken trekkes fra prøvekreditten (issue #8)»; Åpne punkter (#3, #4, #8, #9)
- **Problem og hvorfor det betyr noe:** Azure ble allerede forsøkt og feilet. SK-13 til SK-17, FR-40 og kjerneflyten «med Gemini» forutsetter Vertex, Google Cloud-prosjekt og kredittkort. Feiler dette sent, mangler PRD-en en avgjort fallback.
- **Forslag:** Sett en dato og en konsekvens: *«Virker et Vertex-kall ikke innen 18.11, leveres appen med demomodus alene. SK-13 til SK-17 flyttes til Begrensninger, og testen 2026-11-05 dokumenteres som kvalitetsbevis.»*

### 4.3 Mock-modellens krav er for løse til å bli en story
- **Alvorlighet:** medium
- **Hvor:** NFR-2: «en mock-modell lager innhold ut fra teksten i den opplastede filen … alle funksjoner kan prøves, også med en PDF sensor laster opp selv»
- **Problem og hvorfor det betyr noe:** Det er demomodus sensor møter først. En deterministisk mock som lager flashcards, quiz med fire troverdige alternativer og sammendrag fra en vilkårlig PDF er ikke triviell, og FR-30/31 gjelder også da.
- **Forslag:** Beskriv enkle regler som testbare konsekvenser: *«Mock lager ett begrepskort per side som har en setning med «er». Quizalternativene er tre andre setninger fra samme fil. Samme fil gir identisk resultat to ganger. FR-31 og SK-15 gjelder bare ekte modell.»*

### 4.4 «Økt» og «resultat» er ikke definert
- **Alvorlighet:** medium
- **Hvor:** FR-56 «lagres dato, type (flashcards, quiz, huskeregler eller fritekst) … og resultat»; Ordliste «Økt»
- **Problem og hvorfor det betyr noe:** Modellkort er «en type flashcard» (FR-42), men FR-56 har «huskeregler» som egen øktype. Hva «resultat» er for hver type står ingenting om. Datamodell, semesterlinje (FR-57) og SK-20 avhenger av dette.
- **Forslag:** *«Avsluttes en flashcardøkt etter 12 av 20 kort med 9 «Kunne», lagres én økt: type=flashcards, omfang=forelesning, vist=12, kunne=9, kunne_ikke=3, avbrutt=ja.»* Avgjør om en økt med modellkort er flashcards eller huskeregler.

### 4.5 Noen FR-er mangler fortsatt testbart utfall
- **Alvorlighet:** medium
- **Hvor:** FR-21 «forståelig beskjed»; FR-25 «vises igjen senere i samme økt»; FR-53 «en setning eller to om hvert»; NFR-8 «Hurtigtaster … med én tast»; SK-15 «høyst halvparten»
- **Problem og hvorfor det betyr noe:** Stories og tester trenger tall, tekster og tilstander. Ved fire tilfeldige alternativer er det lengste riktig i 25 % av tilfellene, så grensen på 50 % fanger lite.
- **Forslag:** FR-21: *«Feiler kallet eller tar det over 120 sekunder, vises «Kortene kunne ikke lages. Prøv igjen.» med knappen «Prøv igjen», og antall kort i forelesningen er uendret.»* FR-25: *«Kort markert «Kunne ikke» legges bakerst og vises når alle de andre er vist én gang.»* SK-15: bruk for eksempel høyst 35 %. Nevn hvilke taster NFR-8 gjelder.

## 5. Mekaniske funn

- **ID-rekkefølge:** FR-56 til FR-58 står mellom FR-37 og FR-38, og SK-20 står før SK-10. ID-ene er unike, men leseren leter. SK-1 dekker «FR-1 til FR-41» og utelater må ha-kravene FR-56 til FR-58 (delvis dekket av SK-20).
- **Begrepsbruk:** «kort/flashcard» og «spørsmål/quizspørsmål» blandes. Emne, forelesning, fil, flashcard, quiz og resultat står ikke i ordlista. Sensor brukes som målgruppe midt i kravene (NFR-2, NFR-3).
- **Henvisninger:** #2, #3, #4, #8, #9 er GitHub Issues. Gjengi gjerne spørsmålet i PRD-en, så den står alene.
- **Antakelser:** `[ASSUMPTION]`-tagger brukes ikke, men Begrensninger og Åpne punkter dekker det meste.

## 6. Før dere går videre

**Må avklares før UX/arkitektur/epics:**
- Vertex-tilgang og plan B (4.2).
- Kuttrekkefølge og milepæler (4.1).
- Definisjon av økt og resultat (4.4), siden datamodellen bygger på den.
- Mock-regler (4.3).

**Kan vente:** modellvalg og norsk kvalitetstest (#3, #4), formelregel (#9, FR-40 kan kuttes), eksempelnotater (NFR-3, før testing), prisendring 2027.

**Oppfølging av briefen-tilbakemeldingen: ja.** Funksjonelle suksesskriterier (SK-1 til SK-9, SK-20), må ha/bør ha, valgt språkmodell, demomodus og lokal kjøring og formler (testet 2026-11-05) er alle fulgt opp.

## 7. Refleksjonsspørsmål

1. Addendumet sier at teknologistakken ble «foreslått av KI … og godtatt». Hva gjorde at dere kunne vurdere forslaget, og hva hadde fått dere til å avvise det?
2. SK-13 krever under 5 % faglige feil, vurdert manuelt. Hvordan avgjør dere at et kort er faglig feil, og hvordan unngår dere å la KI-en bedømme sitt eget arbeid?

_Vurdert mot kvalitetsrubrikken i bmad-prd. Dette er veiledning, ikke sensur._
