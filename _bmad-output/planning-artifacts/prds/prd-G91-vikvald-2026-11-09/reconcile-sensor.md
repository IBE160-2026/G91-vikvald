---
title: Avstemming av PRD mot sensorveiledningen og faglærers tilbakemelding
created: 2026-11-09
prd: prd.md (branch docs/prd, commit de440fd)
---

# Avstemming av PRD mot sensorveiledningen og faglærers tilbakemelding

Denne gjennomgangen sjekker om PRD-en gjør det den skal på PRD-stadiet, målt mot:

- kriteriene for del 1 i sensorveiledningen (`research/research-temaer.md`, del F)
- faglærers tilbakemelding på briefen (`briefs/brief-G91-vikvald-2026-09-24/tilbakemelding-product-brief.md`, 2026-10-06)
- prosessreglene i `CLAUDE.md` og `docs/ki-prosess/beslutninger.md`

Ting som hører hjemme i arkitektur, UX, stories eller README, er merket som det, og ikke som mangler. PRD-en er ikke endret.

Linjenumre viser til `prd.md` slik den er i commit `de440fd`.

## 1. Kort oppsummert

PRD-en svarer godt på det meste faglæreren ba om. Den har funksjonelle, testbare kriterier, et tydelig skille mellom må ha og bør ha, demomodus med testbruker, en tabell over endringer fra briefen og en eksplisitt beslutning om konfidensnivå. Det som mangler mest:

1. Mock-modellen med «faste svar» (NFR-2) passer ikke med kontrollen av sidetall (FR-38). Laster sensor opp en egen PDF i demomodus, kan alt bli forkastet (G1).
2. De automatiske testkriteriene dekker ikke valideringen av KI-output, som faglæreren sa «kreves», og heller ikke feilhåndtering, sletting og avvisning av filer (G2).
3. KI-sporet i `docs/ki-prosess/` er ikke oppdatert med beslutningene fra PRD-økten (G3).
4. LLM-valget og «lokal eller sky» er tatt underforstått, ikke uttrykkelig. Ollama er tatt ut uten at det står i «Endringer fra briefen» (G4).
5. Rekkefølgen i dokumentet er rotete (§3–5 før §1–2, endringstabellen midt i kravene), og PRD-en mangler en innledning (G6).

## 2. Vurdering per kriterium

| Kriterium (vekt) | Hva PRD-en bør gjøre på dette stadiet | Status | Kommentar | Mangler |
|---|---|---|---|---|
| **Prosess og KI-styring (30 %)** | Krav som kan spores fra brief til stories og tester, synlig historikk og KI-spor | Delvis | Gode FR- og NFR-ID-er, henvisninger fra seksjoner til brukerreiser, endringstabell og henvisninger til issue #2 og #6. Men suksesskriteriene har ingen ID-er, endringstabellen er ufullstendig, og `docs/ki-prosess/` er ikke oppdatert. | G3, G5, G7 |
| **Funksjonalitet og omfang (20 %)** | Tydelig kjerneflyt, realistisk omfang og regler for kutt | Bra, med forbehold | Kjerneflyten og datoen for kutt (25. november) er tydelige, og krav er merket «kan kuttes». Men omfanget har vokst siden faglæreren advarte (konto-sletting, erstatte fil, omfangsvalg, fritekst), uten at det er vurdert. Prioriteringen sier heller ikke om NFR-ene er må ha. | G5, G8 |
| **Kvalitetssikring og testing (15 %)** | Kriterier som kan bli tester, og en plan for manuell kvalitetsmåling | Delvis | Alle tre eksemplene fra faglæreren er med. Men validering, feilhåndtering, sletting og avvisning mangler, stikkprøven har ingen metode, og quizkvaliteten blir ikke målt. Valg av testrammeverk hører hjemme i arkitekturen. | G2, G9, G10, G11, G12 |
| **Design og brukeropplevelse (10 %)** | Brukere, brukssituasjoner og krav til universell utforming. Skisser hører hjemme i UX. | Bra | Brukerreisene og NFR-8 til NFR-14 er gode. Valget om å vise kilden som tekst står i memlog, men ikke i PRD-en. Det finnes ingen reise for sensor eller en førstegangsbruker. Skisser av emneoversikt, flashcard, quiz og kilde lages med `bmad-ux`, og hører ikke hjemme her. | G14 |
| **Kodekvalitet og arkitektur (10 %)** | Rammer for arkitekturen, uten å velge teknologi | Bra | NFR-4 (leverandør byttes med én innstilling) og kravene til validering gir arkitekturen gode rammer. Stakken (beslutning 2026-11-05) skal riktignok begrunnes i arkitekturen. Rammen om at stakken skal kunne publiseres på Vercel senere er ikke tatt med. | G15 |
| **README og kjørbarhet (10 %)** | Krav om lokal kjøring, demomodus, testbruker og eksempeldata | Bra, med én alvorlig mangel | NFR-1 til NFR-4 dekker det faglæreren ba om. Men samspillet mellom mock-modellen og valideringen kan gjøre at demomodus ikke virker på nye filer. Selve README-teksten skrives senere. | G1, G15 |
| **Ryddighet i repoet (5 %)** | Hemmeligheter, testdata og lisenser | Bra | `.env` og `.env.example` (NFR-4) og lisensiert eksempelmateriale (NFR-3) er med, og `.gitignore` finnes. Selve dokumentet er rotete. ShareAlike-kravet i OpenStax-lisensen er ikke nevnt. | G6, G16 |

## 3. Faglærers åpne beslutningspunkter

| Beslutningspunkt | Status i PRD-en | Hvor | Vurdering |
|---|---|---|---|
| **Valg av LLM** | Tatt underforstått: NFR-4 sier «mock eller Gemini», og NFR-6 sier «hos Google i EU». Det står ingen beslutningssetning, ingen henvisning til researchen, og det står ikke at valget av konkret modell (#4) er overlatt til arkitekturen. | l. 166, 170–171 | **Delvis.** Se G4. |
| **Konfidensnivå** | Besluttet uttrykkelig: modellen rapporterer ikke selv hvor sikker den er. I stedet brukes kontroller som kan sjekkes. | l. 123 | **Besluttet.** Men målingen som skal vise om det virker, gjelder bare flashcards (G10). |
| **Detaljnivå i sammendrag** | Besluttet: ett nivå (FR-50). Endringen er ført i endringstabellen. | l. 98, 151, 153 | **Besluttet.** |
| **Tabeller og figurer** | Besluttet: ikke med (Utenfor). Bilde av siden brukes bare for formler. | l. 254, FR-37 | **Besluttet.** Det står ikke hva studenten får vite når en side bare består av en figur eller tabell. Det er en liten mangel (G13). |
| **Lokal eller sky** | Kjøring er besluttet: lokalt, ikke publisert (l. 253). Behandling er underforstått: Gemini i skyen eller mock. Briefen åpnet for en lokal modell via Ollama (brief l. 125), men den er ikke lenger med, og det står ikke i endringstabellen. | l. 166, 253 | **Delvis.** Se G4. |
| **Kostnad** (faglærer: «Avklar kostnad og testmodus») | Testmodus er dekket (NFR-2). Kostnad er ikke nevnt. Issue #8 er åpen. | – | **Ikke behandlet.** Se G4. |
| **Formler** (faglærer: avgjør dette før PRD-en) | Besluttet: FR-37 og FR-39. Reglene for å oppdage formler er ikke testet ennå (#9). | l. 119–121 | **Besluttet.** Testbarheten er omtalt i G11. |

## 4. Faglærers tilbakemelding, punkt for punkt

| Punkt i tilbakemeldingen | Dekket i PRD-en? | Merknad |
|---|---|---|
| Viktigste endring 1: funksjonelle kriterier som kan bli tester, og lokal kjøring etter README i stedet for publisering | Ja | Under «Automatiske tester» (l. 201–211) og i NFR-1. Publisering står under Utenfor. Svakheter i G2 og G7. |
| Viktigste endring 2: valg av LLM, personvern, kostnad, demomodus | Delvis | Personvern (NFR-5 og NFR-6) og demomodus (NFR-2) er dekket. Beslutningen om LLM er underforstått, og kostnad mangler (G4). |
| Viktigste endring 3: marker må ha og bør ha | Ja | l. 235–236, og «kan kuttes» på enkeltkrav. |
| Testbarhet: bare egne emner, gyldige sidetall, forklaring etter svar | Ja | l. 205–207. |
| Kjørbar for sensor: testbruker, eksempelemne, demomodus | Ja, med risiko | NFR-2 og NFR-3. Mock og validering kan komme i konflikt (G1). |
| Avhengigheter og kostnader | Delvis | Kostnad mangler (G4). |
| KI-funksjonalitet: «Strukturert output og validering kreves» | Delvis | FR-38 gir validering. Strukturert output (JSON-skjema) hører hjemme i arkitekturen. Valideringen testes ikke (G2). |
| Forslag 1: del i må ha og bør ha | Ja | Nøkkelbegreper er blitt begrepskort, og det står i endringstabellen. |
| Forslag 2: sjekk foilsett for formler før PRD-en | Ja | FR-37, FR-39 og testen fra 2026-11-05. |
| Del 2, prosess: «lagre prompts og KI-økter fortløpende» | Ikke for denne økten | Se G3. |
| Del 2, testing: funksjonelle kriterier for automatiske tester | Ja, men smalt | Se G2. |
| Del 2, design: skisser av emneoversikt, flashcard, quiz og kildevisning | Hører hjemme i UX | Ikke en mangel i PRD-en. PRD-en bør likevel slå fast at kilden vises som tekst (G14). |
| Del 2, arkitektur: begrunn valg av LLM opp mot personvern | Delvis | PRD-en peker ikke videre til arkitekturen (G4). |
| Del 2, README: testbruker, eksempelmateriale, demomodus | Ja | NFR-1 til NFR-3. At README skal oppgi innloggingen til testbrukeren, kan med fordel stå i NFR-1 (G15). |
| Del 2, ryddighet: `.env` utenfor Git, ingen foiler i repoet | Ja | NFR-4, NFR-3 og Begrensninger (l. 262). |
| Visjon mangler i briefen | Rettet i briefen | Briefen har nå en visjon. PRD-en har ingen innledning eller lenke til den (G6). |
| «Oppdater product brief … slik at historikken viser hvordan planen utviklet seg» | Delvis | Endringstabellen finnes, men er ufullstendig (G5). |

## 5. Mangler

Hver mangel har: kilde (sitat og hvor), hva PRD-en mangler, forslag til retting og alvorlighetsgrad.

### G1. Mock-modellen kan ikke gi «faste svar» som består kontrollen av sidetall (høy)

- **Kilde:** NFR-2 (l. 164): «I demomodus gir en mock-modell faste svar … Alle funksjoner kan prøves i demomodus.» FR-38 (l. 120): «Appen kontrollerer alt språkmodellen lager før det lagres: sidetallet i kilden finnes i filen …». Faglærer, Kjørbar for sensor (l. 64): «Planlegg lokal oppstart med testbruker, eksempelemne og demomodus uten nøkkel.»
- **Hva som mangler:** Svarer mocken alltid det samme, for eksempel med side 3, blir alt forkastet når sensor laster opp en PDF på én side. Da får sensor beskjeden «færre enn valgt» eller ingen kort, og appen ser ødelagt ut. PRD-en sier ikke hvordan mocken skal oppføre seg med filer den ikke kjenner. Den sier heller ikke at mocken skal kunne lage ugyldig output, slik at FR-38 kan testes.
- **Forslag:** Legg til i NFR-2: «Mock-modellen lager innhold ut fra teksten i den opplastede filen, med sidetall som finnes i filen, slik at alle funksjoner virker på en hvilken som helst PDF i demomodus. I testene kan mocken også gi ugyldig output, slik at kontrollen i FR-38 kan testes.» Hvordan dette gjøres, avgjøres i arkitekturen.
- **Alvorlighet:** Høy. Dette gjelder både kjørbarhet (10 %) og funksjonalitet (20 %), og det er den første opplevelsen sensor får.

### G2. De automatiske testkriteriene dekker ikke valideringen og andre risikable regler (høy)

- **Kilde:** Faglærer, tabellen over vanskelighetsgrad (l. 43): «Strukturert output og validering kreves.» Faglærer om enkle prosjekter (l. 51): «grundig testing». Research F (l. 66): «planlegg hvilke funksjonelle kriterier fra briefen som blir automatiske tester. Mock-modellen fra demomodusen gjør KI-delen testbar.» PRD l. 205–211.
- **Hva som mangler:** Testlisten tar med FR-38 bare for sidetall. Disse reglene har ikke noe testkriterium:
  - Ugyldig output forkastes, og det telles med i beskjeden om at det ble laget færre (FR-38 og FR-13).
  - Et quizspørsmål har fire alternativer, og nøyaktig ett er riktig (FR-25).
  - Det lagres ikke halvferdig innhold når genereringen feiler (FR-16).
  - Sletting sletter alt under: fil, forelesning og emne (FR-7 til FR-9), og konto-sletting fjerner alle dataene (FR-36).
  - Word-filer, PDF-er uten tekst og for store filer avvises (FR-4, FR-5 og NFR-15).
  - Vilkårene må godtas før første opplasting (FR-6).
  - Alt generert innhold er på bokmål (FR-33). Dette kan bare testes delvis automatisk.
- **Forslag:** Utvid «Automatiske tester» med de punktene over, og legg til en regel: «Hvert må ha-krav (FR og NFR) dekkes av minst én automatisk test eller et punkt i den manuelle testplanen. Hver test oppgir hvilket krav den dekker.» Valg av testrammeverk og testnivå (enhet eller ende-til-ende) avgjøres i arkitekturen.
- **Alvorlighet:** Høy. Testing teller 15 %, og faglæreren nevnte valideringen uttrykkelig.

### G3. KI-sporet er ikke oppdatert med beslutningene fra PRD-økten (høy, prosess)

- **Kilde:** CLAUDE.md: «Oppdater `docs/ki-prosess/` i samme økt: viktige prompts i `prompts.md`, avviste eller rettede KI-forslag og feil i `korrigeringer.md`, og beslutninger i `beslutninger.md`.» Faglærer, del 2 prosess (l. 99): «lagre prompts og KI-økter fortløpende».
- **Hva som mangler:** Den nyeste raden i `beslutninger.md` er vilkårsteksten (2026-11-09). Viktige beslutninger fra PRD-arbeidet står bare i `.memlog.md`:
  - bare PDF
  - konfidensnivå A
  - ett detaljnivå i sammendrag
  - fritekst med selvvurdering i stedet for nøkkelbegreper
  - begrepskort
  - WCAG 2.1 AA og grensen på 768 px
  - grensen på 50 sider
  - eksempelemnet basert på OpenStax

  Memlog l. 39 viser at Claude anbefalte modellkort fordi «Brukeren visste ikke». Det er akkurat den typen KI-påvirkning sensor ser etter. Det finnes ingen prompts fra PRD-økten i `prompts.md`.
- **Forslag:** Før PR-en fra `docs/prd` flettes:
  - Før de viktigste beslutningene inn i `beslutninger.md`, med commit.
  - Før KI-forslag som brukeren endret eller avviste, inn i `korrigeringer.md`.
  - Legg 2–3 sentrale prompts i `prompts.md`.

  PR-en bør ha `Closes #2` og `Closes #6`, siden begge er løst i PRD-en (l. 174 og 259).
- **Alvorlighet:** Høy. Prosess teller 30 %, og dette er billig å rette. Det ligger utenfor selve PRD-en, men hører til samme økt.

### G4. Valget av LLM, «lokal eller sky» og kostnad er ikke uttrykkelig besluttet (middels)

- **Kilde:** Faglærer, viktigste endring 2 (l. 25): «Valg av språkmodell er utsatt, men det påvirker både personvern …, kostnad og kjørbarhet.» Faglærer l. 65: «Avklar kostnad og testmodus.» Briefen l. 125: «leverandøren kan byttes med én innstilling (mock, lokal modell eller skytjeneste)». Briefen l. 134: «den endelige beslutningen tas i arkitekturen». PRD NFR-4 (l. 166): «(mock eller Gemini)».
- **Hva som mangler:** Gemini nevnes i NFR-4 og NFR-6, men det står ingen beslutning med begrunnelse og ingen henvisning til beslutningen fra 2026-10-28 eller researchrapporten. Det står ikke at valget av konkret Gemini-modell (#4) og kvalitetstesten (#3) er overlatt til arkitekturen. Det står ikke at Ollama og lokal behandling er tatt ut, og det mangler i endringstabellen. Kostnaden og prøvekreditten (#8) er ikke nevnt.
- **Forslag:** Legg til et kort avsnitt «Språkmodell» under NFR. Det bør si:
  - Leverandøren er Gemini på Vertex AI med endepunktet `eu` (beslutning 2026-10-28, se research).
  - Hvilken modell som brukes, avgjøres i arkitekturen etter kvalitetstesten (#3 og #4).
  - Behandlingen skjer i skyen. Lokal modell (Ollama) er tatt ut fordi den er svakere på norsk og ikke trengs til demomodus.
  - Kostnaden er under $1 per semester og dekkes av prøvekreditten (#8). Sensor har ingen kostnad i demomodus.

  Før Ollama inn i endringstabellen.
- **Alvorlighet:** Middels. Faglæreren pekte på dette som en av tre hovedendringer. Det er nesten besluttet, men det står ikke tydelig.

### G5. «Endringer fra briefen» er ufullstendig, og omfanget er ikke vurdert mot faglærers advarsel (middels)

- **Kilde:** Faglærer l. 26: «MVP har åtte punkter … Det er mer enn i forslaget appen bygger på.» Faglærer l. 113: «slik at historikken viser hvordan planen utviklet seg». PRD l. 91: «Disse endringene ble gjort i PRD-arbeidet».
- **Hva som mangler:** Tabellen har fire rader, og alle er innsnevringer. Disse endringene mangler:
  - Nye krav: vilkårstekst (FR-6), erstatte fil (FR-8), konto-sletting (FR-36), omfangsvalg rask/vanlig/dyp (FR-12, FR-23 og FR-45), dato og sortering (FR-10) og universell utforming (NFR-8 til NFR-14).
  - Ollama er tatt ut (G4).
  - Suksesskriteriet «Bruken av KI i utviklingen er dokumentert» (brief l. 84) er borte (se G7).

  Det står heller ingen setning om hvorfor omfanget fortsatt er realistisk, selv om må ha-delen har vokst.
- **Forslag:** Legg til radene over. Legg til en setning under Omfang, for eksempel: «Må ha har fått disse tilleggene: … De er små, og de som kan kuttes, er merket. Hver ny funksjon som kom til, erstattet en annen (fritekst erstattet nøkkelbegreper).»
- **Alvorlighet:** Middels. Dette gjelder prosess og sporbarhet, som teller 30 %.

### G6. Rekkefølgen er rotete, og innledningen mangler (middels)

- **Kilde:** PRD l. 30–88 har §3, §4 og §5. Deretter kommer «Endringer fra briefen» (l. 89), og så §1 og §2 (l. 100–113). FR-1 til FR-31 står i §3–5, mens FR-32 til FR-36 står i §1–2. Dokumentet begynner direkte med brukerreisene, og tittelen er «PRD – G91-vikvald». Faglærer l. 91 savnet en visjon i briefen.
- **Hva som mangler:** Sensor som leser fra toppen, møter §3 før §1, og endringstabellen ligger midt mellom kravene. Det finnes ingen kort innledning som sier hva appen er, hvem den er for og hva problemet er, og ingen lenker til briefen, research og tilbakemeldingen.
- **Forslag:**
  - Legg inn en kort innledning med produktnavnet Studiekamerat, målgruppen og problemet i to–tre setninger. Lenk til briefen (med visjonen), research-temaer og tilbakemeldingen.
  - Sorter seksjonene 1–8 og flytt «Endringer fra briefen» til slutten eller rett etter innledningen.
  - Gi FR-ene nye numre i samme rekkefølge nå, før epics og stories bruker dem. Etter det skal ID-ene være faste.
  - Bytt tittelen til «PRD – Studiekamerat».
- **Alvorlighet:** Middels. Dette gjelder ryddighet (5 %) og hvor lett sensor kan lese dokumentet. Det er billigst å rette før epics.

### G7. Suksesskriteriene har ingen ID-er, og kriteriet om dokumentert KI-bruk er borte (middels)

- **Kilde:** PRD l. 201–225 er punktlister uten ID-er. Briefen l. 84: «Bruken av KI i utviklingen er dokumentert, slik emnet krever.» Faglærer l. 78: «om sensor kan følge en sporbar vei fra plan til ferdig app».
- **Hva som mangler:** Stories og tester kan vise til FR og NFR, men ikke til suksesskriteriene. Da kan ikke sensor se hvilken test som oppfyller hvilket kriterium. Kriteriet om dokumentert KI-bruk ble tatt med fra briefen, men forsvant i PRD-en.
- **Forslag:** Gi kriteriene ID-er, for eksempel SK-T1 til SK-T7 for testene, SK-K1 til SK-K4 for kvalitet og SK-B1 og SK-B2 for bruk. Legg til et kriterium for prosess: «KI-bruken er dokumentert i `docs/ki-prosess/`, og hver story er bygd på egen branch og flettet via en PR som lenker til issue og story (CLAUDE.md).»
- **Alvorlighet:** Middels.

### G8. Prioriteringen sier ikke om NFR-ene er må ha, og kjerneflyten mangler demomodus (middels)

- **Kilde:** PRD l. 231 (kjerneflyten) og l. 235: «Må ha: 1 Norsk språk · … · 5 Flervalgsquiz». Briefen l. 129: «Må ha-funksjonene (1–5) og demomodus».
- **Hva som mangler:** Det står ikke om demomodus, testbruker, eksempelemne (NFR-1 til NFR-4), personvern (NFR-5 til NFR-7) og universell utforming (NFR-8 til NFR-14) er må ha, eller om de kan kuttes. Briefen planla demomodus i samme periode som må ha-funksjonene. PRD-en har ikke tatt det med i kjerneflyten.
- **Forslag:** Legg til: «Alle NFR-er er må ha. Demomodus med testbruker og eksempelemne (NFR-1 til NFR-3) bygges sammen med kjerneflyten, og kjerneflyten skal virke i demomodus 25. november.»
- **Alvorlighet:** Middels.

### G9. Den manuelle testplanen for stikkprøven mangler metode (middels)

- **Kilde:** Research F (l. 66): «Lag en manuell testplan for stikkprøven av 50 flashcards.» PRD l. 215–220. `korrigeringer.md` (2026-11-05, `5885f27`): «Feil fagbegrep skal telle som feil i stikkprøven».
- **Hva som mangler:**
  - Hvordan de 50 kortene velges (tilfeldig, fordelt på forelesninger og nivåer?).
  - Hva som regnes som en faglig feil. Feil norsk fagbegrep, som «Promotering» i stedet for «Påvirkning», er ikke nevnt.
  - Hvilken modell og versjon som måles.
  - Hvor resultatene føres.
  - Formelkriteriet (l. 219) har ingen terskel og ikke noe antall.
  - Hvordan «dekker hovedpunktene» (l. 220) måles.
- **Forslag:** Legg til en kort metode med disse punktene: 50 kort trukket tilfeldig, fordelt på minst tre forelesninger. Feil fakta, feil fagbegrep eller feil kilde regnes som en feil. Modellversjonen noteres. Resultatet føres i en egen fil, for eksempel `docs/testing/stikkprove.md`. For formler: «minst N kort fra M sider med formler, og alle formlene er riktige». Selve testplanen kan skrives senere, men kriteriene må stå i PRD-en.
- **Alvorlighet:** Middels.

### G10. Kvaliteten på quizen blir ikke målt, selv om researchen fant problemer (middels)

- **Kilde:** Research C (l. 40): «flere feilsvar er ikke troverdige, og det riktige svaret er ofte lengst.» PRD FR-25 (l. 77) dekker bare plasseringen av det riktige svaret. PRD l. 123: «Hvor godt dette virker, måles med stikkprøven».
- **Hva som mangler:** Stikkprøven gjelder bare flashcards. Konfidensnivået gjelder også quiz og bør ha-funksjonene, men de blir ikke målt. Det finnes ikke noe krav som motvirker at det riktige svaret er lengst, eller at feilsvarene ikke er troverdige.
- **Forslag:** Legg til et kvalitetskriterium: «En stikkprøve på 20 quizspørsmål: under 5 % faglige feil, feilsvarene er troverdige, og det riktige svaret er ikke systematisk det lengste.» Vurder også en kontroll i FR-38 eller et eget krav om lengden på alternativene. Det kan stå som [ANTAGELSE] til det er testet.
- **Alvorlighet:** Middels. Flervalgsquiz er må ha.

### G11. Regelen for å oppdage formler kan ikke testes som den står (middels)

- **Kilde:** FR-37 (l. 119): «Når en side ser ut til å ha formler som ikke kommer med i teksten …». Briefen l. 133: «Reglene for å oppdage slike sider må testes.» Issue #9 er åpen.
- **Hva som mangler:** Det står ikke hva «ser ut til å ha formler» betyr, og ingen akseptkriterier for FR-37 og FR-39. PRD-en sier heller ikke at regelen avgjøres i arkitekturen etter test #9.
- **Forslag:** Legg til: «Regelen for å oppdage sider med formler avgjøres i arkitekturen etter test #9. Akseptkriteriet er at alle sider med formler i testmaterialet fra økonomi blir oppdaget og merket (FR-39), og at under X % av sidene uten formler blir merket.»
- **Alvorlighet:** Middels.

### G12. Mindre feil i testseksjonen (lav)

- **Kilde:** PRD l. 211 står under «Automatiske tester», men slutter med «Kontrolleres manuelt før innlevering.» NFR-13 (l. 185) nevner en manuell gjennomgang med bare tastatur, men den er ikke med i suksesskriteriene.
- **Forslag:** Flytt oppstartssjekken til en egen liste, «Manuelle kontroller før innlevering», og legg tastaturgjennomgangen (NFR-13) og testen fra en ren klone (NFR-1) inn der.
- **Alvorlighet:** Lav.

### G13. Uklare formuleringer og motsigelser som kan gi feil i stories (lav, men FR-15 er middels)

- **FR-15 og FR-26** (l. 55 og 78): «Sidetallet finnes i den opplastede filen.» Det står ikke om det er sidenummeret i PDF-en (1, 2, 3 …) eller sidetallet som er trykt på siden. Dette er kjernen i den viktigste automatiske testen. Forslag: «Sidetallet er sidens nummer i PDF-filen, der første side er 1.» **Middels.**
- **FR-14** (l. 53) sier «Det finnes to typer kort», mens FR-40 (l. 133) innfører modellkort som en tredje type. Forslag: «to typer kort i må ha. Modellkort kommer til med FR-40.» **Lav.**
- **UJ-2 trinn 3** (l. 26): «forklarer modeller … vurderer selv hvor godt hun svarte». §7 (l. 141) sier at modeller øves med modellkort, som bruker «Kunne/Kunne ikke», ikke selvvurdering. Forslag: Juster UJ-2 slik at modellforklaring skjer med modellkort. **Lav.**
- **FR-22 og FR-31**: «hun selv har laget». Det kan bety innhold hun ba appen lage, eller kort hun skrev selv. PRD-en har ikke noe krav om å lage kort for hånd. Forslag: «enkeltkort i sine egne forelesninger». **Lav.**
- **Figurer og tabeller**: Det står ikke hva som skjer når en side nesten bare er en figur eller tabell. FR-5 dekker bare filer helt uten tekst. Forslag: Si at slike sider hoppes over uten beskjed, eller at det gis en beskjed. **Lav.**

### G14. Kildevisningen og en reise for sensor er ikke med (lav)

- **Kilde:** Memlog l. 27: «Kilde vises som tekst (fil + side), ikke klikkbar lenke.» Research E (l. 54) hadde dette som et åpent spørsmål. Faglærer, del 2 design (l. 102): «Skisser … hvordan kildehenvisningen vises».
- **Hva som mangler:** Beslutningen står i memlog, men ikke i FR-15. Det finnes ingen brukerreise for førstegangsbruk, der sensor logger inn som testbruker, åpner eksempelemnet og prøver kjerneflyten. En slik reise ville styrt UX, README og ende-til-ende-testen.
- **Forslag:** Legg til i FR-15: «vises som tekst, ikke som lenke». Vurder en kort UJ-3, «Første gang i appen (testbruker i demomodus)». Skissene hører hjemme i `bmad-ux`.
- **Alvorlighet:** Lav.

### G15. Små rammer for arkitektur og README er ikke tatt med (lav)

- **Kilde:** Research A (l. 20): «Velg en stakk som også kan kjøre på Vercel». Research l. 103: «Innlogging skjer med `gcloud` uten nøkkelfil.» NFR-4 (l. 166): «Hemmeligheter ligger i en `.env`-fil». Research F (l. 70): «testbruker og eksempeldata» i README.
- **Hva som mangler:** Rammen om at stakken skal kunne publiseres senere er ikke med. NFR-4 nevner bare `.env`, mens Vertex nå bruker innlogging med `gcloud`. NFR-1 sier ikke at README skal oppgi brukernavn og passord til testbrukeren.
- **Forslag:** I NFR-1: «README oppgir innloggingen til testbrukeren.» I NFR-4: «Innstillinger og nøkler ligger i `.env`. Hvordan appen logger inn hos Google, avgjøres i arkitekturen.» Under Utenfor eller Omfang: «Stakken velges slik at appen kan publiseres på Vercel senere.»
- **Alvorlighet:** Lav.

### G16. ShareAlike-kravet for eksempelmaterialet er ikke nevnt (lav)

- **Kilde:** Research B (l. 31): «generert innhold fra bøkene som legges i repoet, må krediteres og deles under samme lisens.» NFR-3 (l. 165): «kreditert der lisensen krever det».
- **Hva som mangler:** Det står ikke at eksempelnotatene og innholdet som er generert fra dem, må deles under CC BY-NC-SA 4.0, eller hvor krediteringen skal stå.
- **Forslag:** Legg til i NFR-3: «Eksempelmateriale basert på OpenStax deles under CC BY-NC-SA 4.0, med kreditering i en egen fil ved siden av materialet og i README. PDF-ene fra OpenStax legges ikke i repoet.»
- **Alvorlighet:** Lav.

### G17. Antagelser som ikke er bekreftet (lav)

- **Kilde:** FR-48 (l. 146), FR-52 (l. 155), NFR-16 (l. 194) og NFR-17 (l. 195) er merket [ANTAGELSE]. Memlog l. 16 sier at rekkefølgen mellom bør ha 7 og 8 ikke er bekreftet.
- **Forslag:** Bekreft eller endre punktene med brukeren før epics. Den som skriver stories, skal ikke måtte gjette.
- **Alvorlighet:** Lav.

## 6. Hører hjemme senere

Dette er ikke mangler i PRD-en, men det må gjøres i neste steg:

| Tema | Hvor | Merknad |
|---|---|---|
| Teknologistakk og begrunnelse | Arkitektur | Forslaget fra 2026-11-05 er laget av KI og skal begrunnes (`beslutninger.md`). |
| Strukturert output (JSON-skjema) og prompts i koden | Arkitektur | FR-38 gir kravet. |
| Konkret Gemini-modell og endepunkt | Arkitektur | Etter #3 og #4. PRD-en bør peke hit (G4). |
| Testrammeverk og testnivåer | Arkitektur og stories | PRD-en bør kreve at alle krav dekkes av tester (G2). |
| Skisser av emneoversikt, flashcard, quiz og kildevisning | UX (`bmad-ux`) | Faglærer del 2, design. |
| README-tekst, `.env.example` og hvordan testene kjøres | Implementering | NFR-1 og NFR-4 gir kravene. |
| `.gitignore` | Allerede på plass | `.env`, `node_modules` og bygg er holdt ute. |
| PR med `Closes #2, #6` og lenke til PRD-en | Ved fletting av `docs/prd` | CLAUDE.md: PR skal lenke til issue. |
