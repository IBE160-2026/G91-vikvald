# PRD-kvalitetsvurdering – PRD – G91-vikvald (Studiekamerat)

Vurdert mot `prd-validation-checklist.md`, 2026-11-09. PRD-en er et utkast uten addendum. Sammendrag, problem, visjon og ordliste mangler, men skal etter planen legges til. Det trekker derfor lite i vurderingen.

## Samlet vurdering

PRD-en er sterk der det teller mest for et soloprosjekt: beslutningene er tatt og begrunnet («Endringer fra briefen», «Konfidensnivå», «Vurdering av Googles logging»), funksjonskravene er stort sett testbare, og begrensningene er ærlige. Det som står i fare, er sammenhengen mellom prioritering og det produktet skal bevise. Huskeregler er et av briefens fire særtrekk og en del av brukskriteriet, men ligger blant bør ha-funksjonene. I tillegg er to krav i må ha-kjernen ikke presise nok til å bygges og testes: formeldeteksjonen i FR-37, og hvordan mock-modellen skal klare kontrollen i FR-38.

## Beslutningsklarhet – sterk

PRD-en tar stilling i stedet for å balansere. Tabellen under «Endringer fra briefen» sier hva som ble valgt, hva som ble valgt bort, og hvorfor. Et eksempel er «Bare PDF (FR-3, FR-4)», begrunnet med at «Word-filer og innlimt tekst har ikke faste sidetall». Avsnittet «Konfidensnivå» svarer direkte på faglærerens spørsmål. Det avviser selvrapportert sikkerhet og viser til kontroller som kan sjekkes. «Vurdering av Googles logging (issue #2)» nevner alternativet som ble valgt bort. «Omfang → Kjerneflyt» har et konkret kuttpunkt: «Virker ikke kjerneflyten 25. november, kuttes bør ha-funksjonene.» Krav merket «kan kuttes» har som regel en reserveløsning (FR-12, FR-30).

Svakheten er at kuttpunktet ikke sier hva «virker» betyr. I tillegg står det mest risikable kravet i må ha-delen uten at risikoen er nevnt.

### Funn
- **[middels]** Kuttpunktet 25. november mangler et mål (§ Omfang → Kjerneflyt). «Virker ikke kjerneflyten 25. november» sier ikke hvordan det avgjøres. Det er heller ikke sagt om det holder at flyten virker i demomodus, eller om den også må virke med Gemini («både i demomodus og med Gemini»). *Fix:* Definer «virker» som at de automatiske testene for kjerneflyten består, pluss én gjennomkjøring med Gemini på eksempelemnet.
- **[middels]** Formelstøtten er en stor risiko i må ha, uten at det er sagt (§ Felles for alt generert innhold, FR-37 og FR-39; § Prioritering). «Felles for alt generert innhold» hører til må ha. FR-37 krever da formeldeteksjon og at bilder av sider sendes til modellen allerede i kjerneflyten. Det er trolig det tekniske kravet med størst risiko i hele PRD-en, men det er ikke merket «kan kuttes» og har ingen reserveløsning. *Fix:* Ta en beslutning: enten merk FR-37 «kan kuttes» med FR-39 som reserve (merk innholdet, ikke send bilde), eller skriv eksplisitt at formler hører til kjernen og hvorfor.

## Innhold fremfor kulisser – sterk

Her er det lite pynt. Det er én persona, Klara, og hun brukes i begge brukerreisene. De ikke-funksjonelle kravene har produktspesifikke grenser: 768 piksler og 200 % forstørrelse (NFR-14), kontrast 4,5:1 (NFR-9), 50 sider (NFR-15) og under fem sekunder i demomodus (NFR-16). De er ikke generelle løfter om at noe skal være «skalerbart» eller «sikkert». «Konfidensnivå» er det motsatte av kulisser: avsnittet forklarer hvorfor en tilsynelatende naturlig funksjon er valgt bort.

### Funn
- **[lav]** «Fire ting» peker på en liste som ikke finnes i PRD-en (§ 1. Norsk språk). «Norsk fra grunnen av er en av fire ting som skiller Studiekamerat fra andre verktøy» viser til briefens liste, men de fire punktene står ikke i PRD-en. *Fix:* Ta med de fire særtrekkene når sammendraget og visjonen skrives, eller lenk til briefens avsnitt «Hva gjør Studiekamerat annerledes».

## Strategisk sammenheng – tilstrekkelig

Den underliggende tesen kommer tydelig fram, selv om den ikke er skrevet ned: aktiv øving på egne notater, organisert per forelesning gjennom semesteret, med kilder som gjør KI-innholdet mulig å kontrollere. Må ha-funksjonene og kvalitetsmålingene (faglige feil, riktige kilder, formler) følger av tesen. Begrensningene sier ærlig at læringseffekten ikke måles.

Problemet er at prioriteringen ikke henger sammen med det PRD-en selv sier skal vises og bevises.

### Funn
- **[høy]** Huskeregler er både særtrekk og suksesskriterium, men er bare bør ha (§ Prioritering; § Suksesskriterier → Bruk; § 6. Huskeregler). Briefen nevner huskeregler som ett av fire særtrekk («Ingen av verktøyene jeg har sett på, lager huskeregler»). Brukskriteriet krever «en repetisjonsøkt med flashcards, quiz og huskeregler», og en av de automatiske testene gjelder FR-42. Samtidig står huskeregler som bør ha nr. 6, og den regelen gjelder: «Virker ikke kjerneflyten 25. november, kuttes bør ha-funksjonene.» Hvis kuttet skjer, faller både et særtrekk og to suksesskriterier bort, uten at PRD-en sier hva som da gjelder. *Fix:* Velg bevisst. Enten flyttes huskeregler (FR-40–FR-42) inn i må ha, eventuelt i en enklere form. Eller så får suksesskriteriene en reservevariant uten huskeregler, og det står at særtrekket blir en utvidelse hvis det kuttes.
- **[middels]** Brukerreisene bygger mest på det som kuttes først (§ UJ-1 steg 3; § UJ-2 steg 2–3). UJ-1 avsluttes med sammendrag (bør ha nr. 8, «kuttes først»). To av tre steg i UJ-2 er huskeregler og fritekst (bør ha nr. 6 og 7). Reisen før eksamen, som er kjernen i tesen, blir nesten tom hvis bare må ha bygges. *Fix:* Legg til én setning per reise om hvordan den ser ut med bare må ha-funksjonene, eller marker stegene som bygger på bør ha.
- **[middels]** Kvaliteten på quizen måles ikke (§ Kvalitet med ekte språkmodell; FR-25, FR-38). Stikkprøven gjelder bare «50 flashcards». FR-38 kan kontrollere at et spørsmål har fire alternativer der ett er markert riktig, men ikke at bare ett alternativ faktisk er faglig riktig. Det er den vanligste feilen i KI-laget flervalg. *Fix:* Utvid stikkprøven med for eksempel 20 quizspørsmål, med et eget mål for spørsmål der flere alternativer er riktige eller det riktige alternativet er feil.
- **[middels]** Motvekten har ingen terskel (§ Kvalitet med ekte språkmodell → Motvekt). «Stikkprøven sjekker også at kortene dekker hovedpunktene» sier ikke hvordan dekningen måles eller hva som er godt nok. Uten terskel kan motvekten ikke slå ut. *Fix:* Lag for eksempel en liste over hovedpunkter per forelesning på forhånd, og sett et mål om at minst 80 % av dem dekkes av minst ett kort.
- **[middels]** Tesen står ikke i PRD-en (§ mangler: Sammendrag/Problem/Visjon). Dette er planlagt og vektes lite. Når sammendraget skrives, bør det nevne veddemålet direkte (semesterlang organisering, aktiv øving og kontrollerbare kilder), slik at prioriteringen og suksesskriteriene kan begrunnes ut fra det. *Fix:* Skriv sammendraget slik at det henger sammen med særtrekkene og løser huskeregel-funnet over.

## Klarhet om når et krav er ferdig – tilstrekkelig

De fleste funksjonskravene har en konsekvens som kan testes. Gode eksempler er FR-7 («Avbryter hun, slettes ingenting»), FR-25 («nøyaktig ett er riktig»), FR-29 («Svaret kan ikke endres etterpå»), FR-35 (endring av adressen i nettleseren) og FR-41–FR-42. De ikke-funksjonelle kravene har grenser, ikke bare adjektiver. Hullene er likevel samlet i den delen som har høyest risiko: generering og demomodus.

### Funn
- **[høy]** Det er ikke definert hvordan formler oppdages (FR-37, FR-39). «Når en side ser ut til å ha formler som ikke kommer med i teksten fra PDF-en» sier ikke hvordan appen avgjør dette. Både FR-37 og merkingen i FR-39 avhenger av den samme uklare vurderingen, så ingen av dem kan testes. *Fix:* Angi en regel som kan sjekkes, for eksempel matematiske tegn eller lite tekst på en side med tegnet innhold, eller at studenten selv markerer «sider med formler» ved opplasting. Lag også et testtilfelle for regelen.
- **[høy]** Demomodus kan komme i konflikt med kontrollen før lagring (NFR-2, FR-38, FR-42; § Automatiske tester). NFR-2 sier at «en mock-modell gir faste svar» og at «alle funksjoner kan prøves i demomodus». FR-38 forkaster innhold med sidetall som ikke finnes i filen. Hvis sensor laster opp sin egen PDF på to sider og mock-modellen svarer med faste kort fra side 5, blir alt forkastet. Testen «Alle sidetall i kildene finnes i den opplastede filen» med mock-modellen tester da mock-dataene, ikke appen. *Fix:* Spesifiser at mock-modellen lager svar ut fra den opplastede filen (for eksempel med sidetall og tekst fra filens egne sider). Legg også til en test der mock-modellen bevisst gir et ugyldig sidetall og innholdet blir forkastet.
- **[middels]** Det er uklart hva «hun selv har laget» betyr (FR-22, FR-31). Ingen krav lar studenten lage kort eller spørsmål manuelt. Alt innhold lages av appen. «Enkeltkort hun selv har laget» kan derfor bety «kort generert fra hennes forelesninger», men kan også leses som at manuelle kort finnes. *Fix:* Skriv «enkeltkort i sine egne forelesninger», eller legg til et krav om manuelle kort hvis det er meningen.
- **[middels]** Det er ikke sagt hva som skjer med duplikater når nye kort legges til (FR-17, FR-27, FR-45). «De nye legges til de eksisterende», men det er ikke sagt om appen skal unngå å lage de samme kortene en gang til. Etter to runder kan forelesningen ha mange nesten like kort. *Fix:* Ta en beslutning: enten får modellen de eksisterende kortene og blir bedt om å lage nye, eller så godtas duplikater og det skrives inn.
- **[middels]** Det er ikke definert hva «sidetall» er (FR-15, FR-26, FR-51). «Sidetallet finnes i den opplastede filen» kan bety sidenummeret i PDF-en (1…n) eller sidetallet som er trykket på siden. De er ofte ulike i foiler og lærebokutdrag. *Fix:* Skriv «sidenummer i PDF-filen, der første side er 1».
- **[middels]** Det er ikke sagt når universell utforming er godkjent (NFR-13; § Automatiske tester). «Kontrolleres med automatiske tester» og «kontrolleres automatisk på alle sider» sier ikke hva som er bestått. *Fix:* Angi verktøy og terskel, for eksempel «ingen brudd av typen serious eller critical i axe på hver side».
- **[lav]** «Normalt» er ikke definert (NFR-16). «Normalt under ett minutt» sier ikke om det gjelder gjennomsnitt, median eller for eksempel 9 av 10 forsøk. *Fix:* «I minst 9 av 10 forsøk.»
- **[lav]** Noen vurderinger er uklare i kravene om opplasting og generering (FR-5, FR-16). Det er ikke sagt hvor lite tekst som regnes som «ingen lesbar tekst», eller hva som skal skje med en PDF der bare noen sider er skannet. «En forståelig beskjed» er et adjektiv. *Fix:* Angi en terskel for tekst per side, og si at beskjeden sier hva som gikk galt og hva studenten kan gjøre (som i NFR-11).
- **[lav]** Det er ikke sagt hva som skjer når en økt avbrytes (FR-20, FR-21, FR-29, FR-30). Det står ikke om studenten kan avslutte en quiz midt i, og hva poengsummen da viser. *Fix:* Én setning om avbrutt økt.
- **[lav]** Det mangler krav til passord (FR-34, NFR-7). Det står ingen minstelengde. *Fix:* Angi for eksempel minst 8 tegn.

## Ærlighet om omfang – sterk

Omfanget er beskrevet eksplisitt. «Utenfor» har sju konkrete punkter, blant annet «Tolkning av tabeller og figurer» med grensen mot FR-37. «Mulige utvidelser» er rangert. «Begrensninger» er uvanlig ærlig om at det ikke er gjort intervjuer: «vi vet ikke om andre studenter har det samme problemet». Det er få åpne punkter (fire [ANTAGELSE]-merker og ingen åpne spørsmål), og det passer for et utkast i et studentprosjekt.

### Funn
- **[middels]** Tre [ANTAGELSE]-merker sier ikke hva som er antatt, og ingen av dem står i en oversikt (FR-48, FR-52, NFR-17). Bare NFR-16 sier hva antagelsen gjelder («[ANTAGELSE: ett minutt]»). I FR-48 er det uklart om antagelsen gjelder de tre vurderingsnivåene, opptellingen eller at svarene ikke lagres. *Fix:* Skriv innholdet i merket, for eksempel «[ANTAGELSE: svarene lagres ikke]», og legg til en oversikt over antagelser til slutt.
- **[lav]** Det er ikke sagt om øveresultater lagres (FR-20, FR-30). FR-48 sier at fritekstsvar ikke lagres, men for «Kunne»/«Kunne ikke» og poengsum i quizen er det ikke sagt. Utvidelse 2 (spaced repetition) tyder på at de ikke lagres. *Fix:* Legg «Lagring av øveresultater mellom økter» under «Utenfor» eller som en grense i FR-20/FR-30.

## Nytte for senere arbeid – tilstrekkelig

ID-ene er sammenhengende og unike (FR-1–FR-52, NFR-1–NFR-17), og alle kryssreferansene peker riktig. Brukerreisene har en navngitt person. Seksjonene har en innledning som knytter dem til brukerreisene. Det som gjør det vanskeligere å hente ut innhold til UX, arkitektur og stories, er strukturen og at ordlisten mangler.

### Funn
- **[middels]** Overskriftene plasserer seksjonene feil (§ Endringer fra briefen). «### 1. Norsk språk», «### 2. Innlogging og egne data» og «### Felles for alt generert innhold» står som underoverskrifter under «## Endringer fra briefen». De er ikke under «## Funksjoner og krav». Et verktøy som henter ut krav etter overskrift, vil miste FR-32–FR-39. Seksjon 1 og 2 står i tillegg etter 3–5. *Fix:* Flytt tabellen «Endringer fra briefen» etter kravene, og sorter seksjonene 1–5 slik at de står under «Funksjoner og krav».
- **[middels]** Ordlisten mangler (hele dokumentet). Ord som bærer mye, er ikke definert: «forelesning», «økt», «omfang»/«gjennomgang», «generert innhold», «modellkort»/«begrepskort», «mock-modell»/«demomodus», «språkmodell» og «kilde». Et eksempel på glidning er UJ-2 steg 3, som bruker «kortsvars- og langsvarsspørsmål», mens § 7 bruker «fritekstspørsmål». *Fix:* Legg til en kort ordliste med de om lag ti ordene over.
- **[lav]** Suksesskriteriene har ikke ID-er (§ Suksesskriterier). Stories og tester kan ikke vise til dem. *Fix:* Gi dem nummer, for eksempel SM-1–SM-12.
- **[lav]** UJ-2 og § 7 sier ulike ting om modeller (UJ-2 steg 3; § 7 innledning). UJ-2 steg 3 sier «forklarer modeller» som del av fritekstsvarene, mens § 7 sier «Modeller øves med modellkort (FR-40), ikke her». *Fix:* Flytt «forklarer modeller» til steg 2 i UJ-2.

## Passer formen til produktet – sterk

Formen passer til et gradert soloprosjekt med reell brukeropplevelse: to brukerreiser med én navngitt person, uten ekstra personaer. Sensor er en reell andre interessent, og PRD-en håndterer det riktig gjennom egne ikke-funksjonelle krav («Kjørbarhet og demomodus», NFR-1–NFR-4) i stedet for en kunstig brukerreise. Suksesskriteriene er ordnet etter hvordan sensor kan etterprøve dem. Formaliteten er passe. Det trengs ikke flere brukerreiser eller personaer.

## Mekaniske merknader

- **Overskriftsnivåer:** Se funnet over. «Felles for alt generert innhold» og seksjon 1–2 står under feil overskrift på nivå 2. Rekkefølgen 3, 4, 5, 1, 2, Felles, 6, 7, 8 er ulik prioriteringslisten.
- **ID-kontinuitet:** FR-1–FR-52 og NFR-1–NFR-17 er sammenhengende og uten duplikater. FR-numrene følger rekkefølgen i dokumentet, ikke prioriteringsnummeret (FR-32–FR-36 er seksjon 1–2). Det er greit, men bør beholdes slik etter omstruktureringen, så referansene ikke brytes.
- **Kryssreferanser:** Alle FR- og NFR-referansene peker riktig. Lenken til briefen (`../../briefs/brief-G91-vikvald-2026-09-24/brief.md`) fungerer. «se addendum til briefen» (Begrensninger) er ikke en lenke.
- **Oversikt over antagelser:** Den mangler. Fire [ANTAGELSE]-merker står i teksten (FR-48, FR-52, NFR-16, NFR-17), og tre av dem er tomme.
- **Navn:** Tittelen er «PRD – G91-vikvald», mens produktet heter Studiekamerat i teksten. Når sammendraget skrives, bør tittelen bruke produktnavnet.
- **Skrivemåte:** «Begrensninger» bruker både «jeg» og «vi» («vi vet ikke om andre studenter …»). Velg én form.
- **Seksjoner som mangler for et utkast:** Sammendrag, problem, visjon, målgruppe og ordliste. Alle er planlagt. Det som finnes ellers, dekker det graderingen trenger.
