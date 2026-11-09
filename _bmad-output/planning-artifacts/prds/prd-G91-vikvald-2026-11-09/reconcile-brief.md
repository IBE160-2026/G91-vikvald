---
title: "Avstemming: PRD mot brief og addendum"
created: 2026-11-09
prd: prd.md (status draft, 2026-11-09)
inndata:
  - ../../briefs/brief-G91-vikvald-2026-09-24/brief.md
  - ../../briefs/brief-G91-vikvald-2026-09-24/addendum.md
---

# Avstemming: PRD mot brief og addendum

Avstemmingen ser etter innhold i briefen og addendumet som PRD-en dropper uten å si det, eller som PRD-en sier imot. Endringer som er begrunnet i PRD-en («Endringer fra briefen») eller i `.memlog.md`, regnes ikke som hull. Det gjelder bare PDF, begrepskort som flashcard, ett detaljnivå på sammendrag og fritekst med selvvurdering. Er en endring bare begrunnet i memlog og ikke i PRD-en, er den likevel tatt med, fordi sensor leser PRD-en og ikke memlog.

Alvorlighetsgrad: **høy** = påvirker hva som bygges, eller et beslutningspunkt faglæreren ba om. **Middels** = «hvorfor», en risiko eller et kriterium mangler, og sensor eller senere faser kan savne det. **Lav** = finpuss.

## Oversikt

| # | Hull | Kilde | Alvor |
|---|---|---|---|
| 1 | Problemet, målgruppen, «hvorfor» og hva som skiller appen ut, mangler | brief | høy |
| 2 | Faglærerens beslutningspunkter om valg av språkmodell og lokal behandling eller sky er ikke lukket. Gemini er låst uten henvisning | brief + addendum | høy |
| 3 | Kriteriet om dokumentert KI-bruk er falt ut | brief + addendum | middels |
| 4 | Databehandleravtale (GDPR) er ikke nevnt | addendum | middels |
| 5 | Risikoen for passiv bruk og genereringseffekten står ikke som prinsipp | brief + addendum | middels |
| 6 | Tabellen «Endringer fra briefen» mangler flere endringer | brief | middels |
| 7 | Skiftet fra «foiler eller notater» til «egne notater» er ikke forklart | brief | middels |
| 8 | Det er ikke satt krav til å teste reglene for å finne sider med formler | brief | middels |
| 9 | Visjonen mangler | brief | lav |
| 10 | Egenrefleksjonen og registreringen av feil i stikkprøven er gjort tynnere | brief | lav |
| 11 | Feil i quiz, fritekst og sammendrag kan ikke rettes eller flagges | brief + addendum | lav |
| 12 | Lokal modell (Ollama) som leverandørvalg er falt ut | brief | lav |
| 13 | Ingen krav til visuell kvalitet og ingen henvisning til UX | brief + addendum | lav |
| 14 | Prinsippet «kutt funksjoner før kvalitet» og fristen for å fryse koden mangler | brief | lav |
| 15 | Valg av språk og målform (fra oppgaveteksten) er ikke drøftet | addendum | lav |
| 16 | Begrunnelsen for FR-6 og bekreftelsen fra faglæreren mangler | brief | lav |

---

## 1. Problemet, målgruppen, «hvorfor» og hva som skiller appen ut, mangler — **høy**

**Inndata sier:**
- brief.md, «Problemet» (l. 18–24): studentene bruker eksamensperioden på å rydde i stedet for å repetere. «Studenten ender med å lese det samme om igjen, noe som er en svak strategi».
- brief.md, «Løsningen» (l. 38): «Poenget er ikke at KI-en skal lære stoffet for studenten. Poenget er å fjerne ryddearbeidet, slik at tiden går til å teste seg selv.»
- brief.md, «Hva gjør Studiekamerat annerledes» (l. 40–49): fire punkter (semesteret, huskeregler, norsk, kilder) og «Styrken ligger i at Studiekamerat er tilpasset én konkret studiehverdag».
- brief.md, «Hvem er det for» (l. 55–59): en student med et teoritungt emne, der foilene er for tynne. Studenten vet at selvtesting virker, men har ikke tid. I første omgang gjelder det HiMolde og studenter med norsk som hovedspråk. Suksess er «å gå inn i eksamensperioden med oversikt over stoffet».

**PRD-en:** begynner rett på brukerreisene. Det finnes ingen innledning med problem, målgruppe eller produktbeskrivelse. Produktnavnet står bare én gang (l. 102). Der står det at norsk er «en av fire ting som skiller Studiekamerat fra andre verktøy», men de fire punktene står ingen steder. Klara er beskrevet med emne, men ikke med problemet hennes. Tittelen er «PRD – G91-vikvald», ikke produktnavnet.

**Forslag:** Legg inn en kort innledning (5–10 linjer) før brukerreisene:
- hva Studiekamerat er
- problemet (ryddearbeid i stedet for repetisjon)
- prinsippet om at KI-en fjerner ryddearbeidet, mens studenten selv gjør øvingen
- primærbrukeren
- de fire punktene som skiller appen ut, med en lenke til briefen

Gi PRD-en tittelen «PRD: Studiekamerat».

## 2. Valg av språkmodell og lokal behandling eller sky er ikke lukket, og Gemini er låst uten henvisning — **høy**

**Inndata sier:**
- addendum.md, «Decision points named by the lecturer» (l. 52–56): «which LLM to use, and confidence levels», «how detailed summaries should be», «how to handle tables and figures», «local processing or cloud».
- brief.md, «Åpne beslutninger fra oppgaveteksten» (l. 134): «Valg av LLM og lokal behandling eller sky er researchet (se over); den endelige beslutningen tas i arkitekturen.»
- brief.md, «Personvern og valg av LLM-leverandør» (l. 124): «Før valget låses: test kvaliteten på norsk med åpent materiale.»

**PRD-en:** lukker eksplisitt to av de fire punktene: konfidensnivå (l. 123) og detaljnivå (l. 151). Tabeller og figurer står under «Utenfor», og det holder. Valg av språkmodell og lokal behandling eller sky er derimot ikke drøftet som beslutninger. Likevel er Gemini og Google skrevet rett inn i NFR-4, NFR-6, «Vurdering av Googles logging», «Kvalitet med ekte språkmodell» og kjerneflyten. Det fins ingen henvisning til researchrapporten, til testen av norsk som gjenstår, eller til at det endelige valget tas i arkitekturen. Det strider mot briefen, som sier at valget tas i arkitekturen etter en kvalitetstest.

**Forslag:** Legg inn et avsnitt etter «Konfidensnivå», for eksempel «Språkmodell og lokal behandling eller sky». Det bør si:
- PRD-en krever en skytjeneste med behandling i EU/EØS (NFR-5) og mock lokalt (NFR-2). Lokal behandling er bare demomodus.
- Gemini på Vertex AI er foreløpig valg ifølge researchen (lenke). Endelig valg og test av norsk tas i arkitekturen.

Skriv NFR-4 og NFR-6 som krav uten leverandør, for eksempel «mock eller ekte språkmodell» og «navnet på leverandøren og regionen». Alternativt kan det stå «Gemini (foreløpig, se arkitekturen)».

## 3. Kriteriet om dokumentert KI-bruk er falt ut — **middels**

**Inndata sier:**
- brief.md, «Suksesskriterier → For IBE160» (l. 84): «Bruken av KI i utviklingen er dokumentert, slik emnet krever.»
- addendum.md, «HiMolde guidelines (2026)» (l. 40): «students must declare AI use».

**PRD-en:** har ikke kriteriet. «Suksesskriterier» har automatiske tester, kvalitet og bruk, men ingenting om KI-sporet (`docs/ki-prosess/`), som sensorveiledningen ser etter.

**Forslag:** Legg til et kriterium under Suksesskriterier, eller en egen underdel «For IBE160»: «Bruken av KI i utviklingen er dokumentert i `docs/ki-prosess/` (prompts, korrigeringer, beslutninger), slik HiMoldes retningslinjer og emnet krever.»

## 4. Databehandleravtale (GDPR) er ikke nevnt — **middels**

**Inndata sier:** addendum.md, «GDPR» (l. 41): «a tool for students should store data in the EU/EEA, have a data processing agreement and not train on uploads.»

**PRD-en:** NFR-5 dekker EU/EØS, at leverandøren ikke trener på dataene, og at mellomlagring er slått av. Databehandleravtale står ingen steder, heller ikke som noe som er bevisst valgt bort.

**Forslag:** Legg til i NFR-5, eller i vurderingen under issue #2: «Leverandøren har en databehandleravtale (for Google Cloud: Cloud Data Processing Addendum), som godtas når kontoen opprettes.» Er det usikkert, før det som en antagelse eller som noe arkitekturen skal avklare.

## 5. Risikoen for passiv bruk og genereringseffekten står ikke som prinsipp — **middels**

**Inndata sier:**
- brief.md, «For passiv bruk» (l. 126): «KI-sammendrag kan gjøre studenten mer passiv. Tiltaket er at flashcards og quiz krever svar før fasiten vises. Å bare lese sammendrag er ikke hovedbruken.»
- addendum.md, «Generation effect» (l. 33): «Ready-made AI material may lose some of this benefit.» Og «Unguarded AI tutoring» (Bastani 2025, l. 34).

**PRD-en:** har tiltakene (FR-19, FR-29 og FR-47, og sammendraget nederst i prioriteringen), men forklarer ikke hvorfor. Risikoen at ferdiglaget materiale gir mindre læring enn å lage det selv, står ikke. Det gjør heller ikke Bastani-funnet, som er en del av begrunnelsen for at KI-vurdering av fritekst bare er en utvidelse (memlog l. 14). Endringstabellen sier bare «usikker kvalitet». FR-43 (egen huskeregel) kunne vært koblet til genereringseffekten, men er ikke det.

**Forslag:** Legg inn et kort designprinsipp i innledningen (se hull 1), eller rett før «Funksjoner og krav»: «Studenten skal alltid svare før fasiten vises. Sammendrag er støtte, ikke hovedbruken.» Henvis til addendumet (testing, spacing og genereringseffekten). Utvid begrunnelsen for fritekst i endringstabellen med Bastani 2025.

## 6. Tabellen «Endringer fra briefen» mangler flere endringer — **middels**

**Inndata sier, og PRD-en endret uten å føre det i tabellen:**

| Briefen | PRD-en | Begrunnet hvor? |
|---|---|---|
| brief.md l. 100: «Huskeregler: KI-en foreslår måter å huske lister og modeller på, for eksempel forkortelser av forbokstaver» (egen funksjon, åpen form) | Bare forbokstavregelen (FR-41), og huskeregler er en type flashcard (modellkort, FR-40). Andre typer er en utvidelse. | Bare memlog l. 38–40. «Begrensninger» nevner «type huskeregel» indirekte. |
| brief.md l. 83: «Publisert webapp er en bonus, ikke et krav.» | «Utenfor: Publisering på nett. Appen kjøres lokalt.» | Ingen steder |
| brief.md l. 125: leverandøren byttes med én innstilling: «mock, lokal modell eller skytjeneste» | NFR-4: «mock eller Gemini» | Ingen steder (se hull 12) |
| brief.md l. 134: språkmodellen velges endelig i arkitekturen | Gemini er skrevet inn i kravene | Ingen steder (se hull 2) |

Faglæreren ba om at avvik fra briefen dokumenteres (memlog l. 33–34).

**Forslag:** Legg til rader for huskeregler (forbokstaver og modellkort, med begrunnelse fra memlog l. 38–39) og for publisering (fra bonus til utenfor, fordi kjørbarhet for sensor og personvern veier tyngre enn publisering, eller den begrunnelsen som gjelder). Valget av språkmodell løses gjennom hull 2.

## 7. Skiftet fra «foiler eller notater» til «egne notater» er ikke forklart — **middels**

**Inndata sier:**
- brief.md l. 12 og l. 28: appen gjør «forelesningsfoiler og notater» om til materiell. «Etter hver forelesning laster studenten opp foiler eller notater».
- brief.md l. 57: primærbrukeren har foiler som er «for tynne til å lese alene».
- brief.md l. 118 og addendum.md l. 39: Kopinor-avtalen og eierskapet til foilene, slik at MVP-en er «ment for egne notater og materiale brukeren har rett til å bruke».

**PRD-en:** Brukerreisene handler bare om egne notater, og FR-6 begrenser til «egne notater eller materiale hun har rett til å bruke». Det er i tråd med risikoavsnittet i briefen. Men PRD-en sier ikke at foiler, som er kjernen i briefens fortelling, ikke lenger er hovedinndata, eller hvorfor. En leser av briefen vil forvente opplasting av foiler.

**Forslag:** Skriv én setning i innledningen eller over FR-6: «Hovedinndata er studentens egne notater. Foiler og kurslitteratur kan bare lastes opp hvis studenten har rett til det, fordi Kopinor-avtalen ikke tillater opplasting til KI-verktøy og foilene tilhører foreleseren.» Vurder også en rad i endringstabellen.

## 8. Det er ikke satt krav til å teste reglene for å finne sider med formler — **middels**

**Inndata sier:** brief.md, «Formler og figurer» (l. 133): «MVP-en bruker teksten som standard, og sender bilde av siden når siden ser ut til å ha formler som ikke er med i teksten. Reglene for å oppdage slike sider må testes.»

**PRD-en:** FR-37 bruker samme vage formulering («ser ut til å ha formler»), og FR-39 avhenger av den. Suksesskriteriene sjekker at formlene gjengis riktig, men ikke at sidene med formler faktisk blir funnet. En side som ikke blir funnet, gir et kort uten formel og uten advarsel. Risikoen at reglene kan bomme, står ikke.

**Forslag:** Legg til et kriterium under «Kvalitet med ekte språkmodell», for eksempel: «I testmaterialet fra økonomi blir alle sider med formler som mangler i teksten, oppdaget (FR-37), og innholdet fra dem er merket (FR-39).» Henvis eventuelt til at reglene bestemmes i arkitekturen.

## 9. Visjonen mangler — **lav**

**Inndata sier:** brief.md, «Visjon» (l. 51–53): flere emner og studenter på HiMolde, spaced repetition og deling i kollokviegrupper. «Kun en retning, ikke noe som skal bygges.»

**PRD-en:** spaced repetition er en utvidelse, og deling står under «Utenfor». Retningen etter IBE160 står ikke.

**Forslag:** Skriv én setning under «Mulige utvidelser» eller i innledningen. Det forklarer hvorfor deling står under «Utenfor» nå, men ikke for alltid.

## 10. Egenrefleksjonen og registreringen av feil er gjort tynnere — **lav**

**Inndata sier:**
- brief.md l. 68: egenrefleksjonen vurderer om appen ga oversikt: «hva som hjalp, og hva som manglet».
- brief.md l. 71: «En stikkprøve av generert innhold sjekkes mot kildene, og feilene registreres».

**PRD-en (l. 217–225):** egenrefleksjonen er kortet ned til «om appen ga oversikt over stoffet». At feilene registreres, altså at det finnes en logg over feiltypene som rapporten kan bruke, står ikke.

**Forslag:** Legg tilbake «hva som hjalp, og hva som manglet», og «feilene registreres med type (faglig feil, feil kilde, feil formel)».

## 11. Feil i quiz, fritekst og sammendrag kan ikke rettes eller flagges — **lav**

**Inndata sier:**
- brief.md l. 117: tiltaket mot feil er kilde og at «studenten kan redigere eller slette kort».
- addendum.md l. 38: «let students flag errors».

**PRD-en:** flashcards kan redigeres (FR-22). Quizspørsmål og fritekstspørsmål kan bare slettes (FR-31, FR-49), og sammendrag kan bare lages på nytt (FR-52). Det er et rimelig valg, men begrunnelsen for at quiz ikke kan redigeres står bare i memlog (l. 31–32), ikke i PRD-en. Flagging er ikke drøftet som alternativ.

**Forslag:** Skriv en kort begrunnelse i FR-31 (for eksempel: redigering av fire alternativer og forklaring er mer å bygge og teste, og sletting og ny generering dekker behovet). Nevn under «Konfidensnivå» at sammendraget bare rettes ved å lage det på nytt.

## 12. Lokal modell (Ollama) som leverandørvalg er falt ut — **lav**

**Inndata sier:** brief.md l. 125: «leverandøren kan byttes med én innstilling (mock, lokal modell eller skytjeneste). En lokal modell via Ollama kan være et valgfritt tillegg».

**PRD-en:** NFR-4 sier «mock eller Gemini». Lokal modell er verken med eller valgt bort.

**Forslag:** Før lokal modell under «Mulige utvidelser», eller under «Utenfor» med begrunnelsen fra briefen (svakere på norsk). Teknikken hører hjemme i arkitekturen.

## 13. Ingen krav til visuell kvalitet og ingen henvisning til UX — **lav**

**Inndata sier:**
- addendum.md l. 47: prosjektet er vurdert som «Easy» og «needs more form and colour» for å nå toppkarakter.
- brief.md l. 127: «karakteren avhenger særlig av design, testing, dokumentert prosess og en README som virker».

**PRD-en:** dekker testing, README og universell utforming, men sier ingenting om design eller visuell kvalitet. Den henviser heller ikke til at dette kommer i UX-dokumentene.

**Forslag:** Skriv én linje under «Omfang» eller «Ikke-funksjonelle krav»: «Visuelt uttrykk og samspill beskrives i UX-dokumentene (DESIGN.md og EXPERIENCE.md).»

## 14. Prinsippet «kutt funksjoner før kvalitet» og fristen for å fryse koden mangler — **lav**

**Inndata sier:** brief.md l. 127: «Når tiden blir knapp, kuttes derfor funksjoner før kvalitet.» Og l. 130: «Etter 4. desember rettes bare feil som stopper appen.»

**PRD-en:** har rekkefølgen for hva som kuttes og fristene 25. november og 4. desember. Selve prinsippet og regelen om bare kritiske feil etter 4. desember står ikke.

**Forslag:** Skriv én setning i «Kjerneflyt» eller «Prioritering». Dette er prosjektplan og ikke produktkrav, så det kan også bli liggende i briefen. Vurder selv.

## 15. Valg av språk og målform (fra oppgaveteksten) er ikke drøftet — **lav**

**Inndata sier:** addendum.md l. 50, data inn: «desired detail level, language and preferences».

**PRD-en:** FR-32 og FR-33 låser alt til bokmål, som briefen også gjør. At oppgaveteksten nevner språkvalg som inndata, og at nynorsk og engelsk er valgt bort, står ikke.

**Forslag:** Skriv en halv setning i avsnitt 1 Norsk språk: «Valg av målform eller språk er ikke med i MVP.»

## 16. Begrunnelsen for FR-6 og bekreftelsen fra faglæreren mangler — **lav**

**Inndata sier:** brief.md l. 118: Kopinor-avtalen, og «Faglæreren bekreftet 2026-11-09 at vilkårstekst er greit, og at appen ikke er ansvarlig for det brukeren laster opp.»

**PRD-en:** FR-6 og NFR-6 har vilkårsteksten, men ikke hvorfor (opphavsretten) eller at faglæreren har godkjent løsningen. Memlog l. 8 sier at dette skulle inn i PRD-en.

**Forslag:** Skriv én setning etter FR-6 eller i «Begrensninger»: «Vilkårsteksten er tiltaket mot opphavsrettsrisikoen (Kopinor). Faglæreren bekreftet 2026-11-09 at dette er godt nok.»

---

## Dekket uten avvik (kontrollert)

- Kilde på alt generert innhold (FR-15, FR-26, FR-46, FR-51), og svar før fasiten (FR-19, FR-29, FR-47).
- Quiz med vanskelighetsgrad og forklaring (FR-23, FR-29).
- Organisering per emne og forelesning gjennom semesteret (FR-1, FR-2, FR-10, UJ-1 og UJ-2).
- Norske fagbegreper sammen med de engelske (FR-33).
- Demomodus, mock-modell, testbruker og eksempelmateriale (NFR-1 til NFR-3), og at testene bruker mock.
- `.env` utenfor Git (NFR-4), og ingen foiler i repoet («Begrensninger», testmateriale).
- Formler sendes som bilde av siden, og figurer og tabeller står under «Utenfor» (FR-37, FR-39, «Utenfor»).
- Funksjonelle suksesskriterier fra briefen (l. 75–79), stikkprøven på 50 kort med under 5 % feil, og testen på økonomi for formler.
- Fristene 25. november, 4. desember og 15. desember, og rekkefølgen for hva som kuttes.
- Spaced repetition som utvidelse, og transkribering, deling, mobil og Canvas under «Utenfor».
- Konfidensnivå og detaljnivå på sammendrag er lukket eksplisitt.

## Merknad om struktur (utenfor avstemmingen)

«Endringer fra briefen» står midt i funksjonskravene (mellom avsnitt 5 og avsnitt 1), og avsnittene er nummerert 3, 4, 5 og så 1, 2. Det gjør PRD-en vanskeligere å lese for sensor. Endringstabellen bør flyttes til slutten eller rett etter innledningen, og avsnittene bør stå i rekkefølgen 1–5.
