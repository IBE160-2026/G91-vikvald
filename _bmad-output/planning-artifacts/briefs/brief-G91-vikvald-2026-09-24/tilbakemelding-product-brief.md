# Tilbakemelding på product brief

| | |
|---|---|
| **Gruppe** | G91 – G91-vikvald |
| **Product brief** | `_bmad-output/planning-artifacts/briefs/brief-G91-vikvald-2026-09-24/brief.md` (commit `dae6fe5`) |
| **Tilbakemelding fra** | Faglærer i IBE160 (utarbeidet med KI-støtte) |
| **Dato** | 2026-10-06 |

Jeg har også lest `addendum.md` i samme mappe.

## Samlet vurdering

- **Godt utgangspunkt med justeringer.** Gruppen kan gå videre og innarbeide punktene under.

**Det som er bra:**

1. Briefen er konkret og personlig: problemet («tre uker før eksamen sitter mange studenter med et semester med rotete notater») er gjenkjennelig, og løsningen er forankret i læringsforskning (testing slår gjenlesing). At flashcards og quiz krever svar før fasiten vises, er et godt designvalg.
2. MVP-listen står i byggerekkefølge, slik at det som står sist, kuttes først hvis tiden blir knapp. Det er en svært god måte å styre omfanget på for et soloprosjekt.
3. Risikoene er tatt på alvor og konkretisert: feil i generert innhold (med kildehenvisning og mulighet for å redigere kort), opphavsrett, personvern og at sammendrag kan gjøre studenten passiv. Kvalitetskriteriet om stikkprøve av 50 flashcards med mål om under 5 % faglige feil er målbart.

**De viktigste endringene:**

1. Suksesskriteriene for bruk («mesteparten av eksamensforberedelsene går til flashcards …», egenrefleksjon) og målet om publisert webapp er vanskelige å dokumentere for sensor. Legg til funksjonelle kriterier som kan bli tester, og husk at sensor skal kunne kjøre appen lokalt etter README – publisering er ikke nødvendig.
2. Valg av språkmodell er utsatt, men det påvirker både personvern (EU/EØS, ingen trening på data), kostnad og kjørbarhet. Ta valget tidlig i arkitekturen, og planlegg en demomodus slik at sensor kan kjøre appen uten din nøkkel.
3. MVP har åtte punkter med innlogging, lagring per emne og forelesning og fem genereringstyper. Det er mer enn i forslaget appen bygger på. Vurder å markere tydelig hvilke punkter som er den minste versjonen du *må* ha (f.eks. 1–5), og hvilke som er «bør ha».

## Vanskelighetsgrad og gjennomførbarhet

### Vurdert vanskelighetsgrad

- **Enkel**

**Sammenlignbart med:** 1) AI Study Buddy (enkel), som addendumet også viser til. Innlogging, lagring per emne og forelesning, kildehenvisning til fil og side og huskeregler gjør at prosjektet ligger i øvre del av «enkel».

**Begrunnelse:**

| Faktor | Nivå (lav / middels / høy) | Kommentar |
|---|---|---|
| Domenelogikk – hvor mange og hvor kompliserte regler og beregninger må stemme? | Lav | Få egne regler: organisering i emner og forelesninger, quiz-poeng og flashcard-gjennomgang. Spaced repetition (utvidelse) ville lagt til mer. |
| Datamodell – antall entiteter og relasjoner mellom dem | Middels | Bruker, emne, forelesning, fil, flashcard, quiz-spørsmål, huskeregel, nøkkelbegrep og sammendrag, med kildehenvisning til fil og side. |
| Brukere, roller og innlogging | Middels | Innlogging fordi materialet lagres. Én rolle. |
| KI-funksjonalitet i appen, f.eks. kall til språkmodell, prompts i koden og håndtering av usikre svar | Middels | Fem genereringstyper med norsk språk, valgbart detaljnivå og vanskelighetsgrad, og kildehenvisning på alt. Strukturert output og validering kreves. |
| Integrasjoner og eksterne tjenester, f.eks. API-er, betaling og e-post | Middels | Språkmodell-API med krav til EU/EØS og ingen trening på data. Leverandør ikke valgt. |
| Sanntid, samtidighet eller flere brukere som påvirker hverandre | Lav | Ikke relevant. |
| Filhåndtering, f.eks. opplasting, PDF-lesing og eksport | Middels | PDF-opplasting av foiler med sidenummer. Foiler gir ofte oppstykket tekst, og formler kan gå tapt (som du selv påpeker). |
| Sikkerhet og personvern | Middels | Lagret studiemateriale per bruker, opphavsrett og valg av LLM-leverandør. Godt identifisert i briefen. |

**Hva vanskelighetsgraden betyr for dere:**

- _Enkel:_ Et enkelt prosjekt gir stor sjanse for å bli ferdig. Vanskelighetsgraden inngår likevel i vurderingen, så for å nå helt opp må dere vise mer i gjennomføringen. Det betyr særlig et gjennomarbeidet design, grundig testing, en tydelig dokumentert prosess og en README som virker. Briefen sier selv at kvaliteten skal ligge i gjennomføringen; det er riktig strategi. Huskeregler og kildehenvisning på alt er gode tillegg som løfter prosjektet.

### Gjennomførbarhet med BMAD og Claude Code

Dere skal planlegge med BMAD (product brief → PRD → arkitektur → epics og stories) og implementere med Claude Code. Vurderingen under tar hensyn til at det må være tid til hele denne flyten, og til testing, retting og README til slutt.

| Spørsmål | Vurdering (OK / risiko / stor risiko) | Kommentar |
|---|---|---|
| **Tid og omfang** – kan v1 realistisk bli ferdig og stabil i løpet av semesteret, med tid til flere iterasjoner? | OK | Realistisk for én person med prioritert byggerekkefølge. Målet om brukbar MVP i midten av november er ambisiøst, men det er et mål, ikke et krav. |
| **BMAD-flyten** – er briefen konkret nok til at PRD, arkitektur og stories kan lages uten store hull, og blir det overkommelig mange stories? | OK | Svært konkret. Åpne beslutninger (LLM, lokal eller sky, detaljnivå) er tydelig lagt til PRD og arkitektur. |
| **Egnet for Claude Code** – bruker løsningen en vanlig, godt dokumentert teknologistakk som Claude Code håndterer godt, eller krever den nisjeteknologi, spesialmaskinvare eller mye manuell konfigurasjon? | OK | En webapp med innlogging, database, PDF-opplasting og LLM-kall er godt dokumentert. |
| **Kontroll på KI-ens arbeid** – kan gruppen selv avgjøre om koden gjør det riktige? Krever domenet kunnskap gruppen ikke har, f.eks. avanserte beregninger eller fagregler, så er det vanskelig å kvalitetssikre. | OK | Du tester på emner du selv tar, og stikkprøven mot kildene er en god kontroll. Kildehenvisningene kan sjekkes automatisk (finnes siden i filen?). |
| **Testbarhet** – finnes det tydelige regler og forventede resultater som tester kan skrives mot? | Risiko | Kvalitetskriteriene er gode, men funksjonelle kriterier mangler (f.eks. at en bruker bare ser egne emner, at en opplastet PDF gir flashcards med gyldige sidetall, at quizen viser forklaring etter svar). Legg dem til. |
| **Kjørbar for sensor** – kan appen kjøres lokalt etter README, uten gruppens nøkler, betalte kontoer eller egen infrastruktur? | Risiko | Briefen sikter mot en publisert webapp, men sier ikke noe om lokal kjøring. Planlegg lokal oppstart med testbruker, eksempelemne og demomodus uten nøkkel. |
| **Avhengigheter og kostnader** – krever løsningen betalte API-er, f.eks. språkmodeller, og finnes det en plan for kostnad, testmodus eller mock-data? | Risiko | LLM-leverandør er ikke valgt, og kravene til EU/EØS kan begrense valget. Avklar kostnad og testmodus. |

**Konklusjon om gjennomførbarhet:**

- **Gjennomførbart som beskrevet.**

**Forslag til justering av omfang eller vanskelighetsgrad:**

1. Del MVP-listen i «må ha» (norsk, innlogging, emner/forelesninger, flashcards, quiz) og «bør ha» (huskeregler, nøkkelbegreper, sammendrag). Rekkefølgen dere har satt, gjør dette enkelt.
2. Sjekk to–tre foilsett tidlig, slik du selv foreslår, og avgjør om formler i tekstform må med før PRD skrives.

## Hvorfor product brief er viktig for mappen

Product brief er utgangspunktet for PRD, arkitektur, stories og til slutt koden. Del 1 av mappen vurderes blant annet på om sensor kan følge en sporbar vei fra plan til ferdig app. Den vurderes også på om appen gjør det dere har beskrevet, om den er testet, om den er godt designet, og om den kan kjøres etter README. Et uklart, for stort eller for lite brief gjør alt dette vanskeligere senere. Det er mye enklere å rette nå enn sent i semesteret.

## 1. Gjennomgang av briefens deler

| Del av brief | Status | Kommentar |
|---|---|---|
| Executive Summary – er det klart hva appen er, og hvilket problem den løser? | OK | Tydelig: en norskspråklig webapp som gjør foiler og notater om til øvingsmateriell gjennom semesteret, med kilde på alt. |
| The Problem – er problemet konkret, med reelle situasjoner og brukere? | OK | Svært konkret og godt skrevet, med en tydelig situasjon og eksisterende metoder som koster for mye tid. |
| The Solution – beskriver løsningen brukeropplevelsen, ikke bare teknologi? | OK | Beskriver opplevelsen etter hver forelesning og fram mot eksamen, uten teknologi. |
| What Makes This Different – er vurderingen ærlig og realistisk? | OK | Ærlig om NotebookLM, Quizlet og Knowt, og konkret om fire forskjeller (semesterperspektiv, huskeregler, norsk, kilder). |
| Who This Serves – er primærbrukerne tydelige, og vet vi hva de trenger? | OK | Tydelig primærbruker med et teoritungt emne og tynne foiler. |
| Success Criteria – kan kriteriene faktisk sjekkes eller testes? | Juster | Kvalitetskriteriene er målbare. Brukskriteriene bygger på egen bruk og egenrefleksjon, som er vanskelig for sensor å etterprøve. Legg til funksjonelle kriterier som kan bli tester. |
| Scope – er det klart hva som er med i første versjon, og hva som ikke er det? | OK | MVP, utvidelser og «utenfor» er tydelige, og rekkefølgen viser hva som kuttes først. |
| Vision – henger visjonen sammen med resten uten å blåse opp omfanget? | Juster | Det finnes ingen egen visjonsdel. Det er greit for omfanget, men en kort setning om hvor appen kan gå etter emnet gjør briefen komplett. |

## 2. Utgangspunkt for del 1 av mappen

Punktene følger kriteriene i sensorveiledningen for del 1. Vektene i parentes viser hvor mye hvert kriterium teller i del 1.

| Kriterium i del 1 | Hva briefen bør legge til rette for | Status | Kommentar |
|---|---|---|---|
| **1. Prosess og KI-styring** (30 %) | Brief som er presis nok til at PRD og stories kan bygges direkte på den, slik at krav kan spores fra brief til kode. | Juster | Briefen er presis nok til PRD og stories. Repoet har foreløpig bare én commit med briefen; fortsett med PRD og lagre prompts og KI-økter fortløpende. |
| **2. Funksjonalitet og omfang** (20 %) | Realistisk omfang for gruppen og semesteret: en tydelig kjerneflyt som kan bli ferdig og stabil, og nok innhold til å vise reell funksjonalitet. | OK | God balanse mellom omfang og gjennomførbarhet, med innebygd prioritering. |
| **3. Kvalitetssikring og testing** (15 %) | Suksesskriterier og funksjoner som er konkrete nok til å bli testtilfeller. | Juster | Stikkprøven er et godt grunnlag for manuell kvalitetssikring. Legg til funksjonelle kriterier for automatiske tester. |
| **4. Design og brukeropplevelse** (10 %) | Tydelige brukere og brukssituasjoner som designet kan bygges rundt, gjerne med de viktigste skjermbildene eller flytene skissert. | OK | Tydelig bruker og brukssituasjon. Skisser emneoversikt, flashcard-visning og quiz, og hvordan kildehenvisningen vises. |
| **5. Kodekvalitet og arkitektur** (10 %) | Teknologivalg som er begrunnet og ikke mer komplekse enn appen trenger. | Juster | Teknologi og LLM er ikke valgt. Begrunn valgene i arkitekturen, særlig LLM-leverandør opp mot personvernkravene du har identifisert. |
| **6. README og kjørbarhet** (10 %) | Løsning som andre kan kjøre lokalt uten betalte kontoer, og uten tilgang til gruppens egne tjenester og nøkler. | Juster | Planlegg lokal kjøring med testbruker, eksempelmateriale og demomodus, i tillegg til eventuell publisering. |
| **7. Ryddighet i repoet** (5 %) | En plan for hvor hemmeligheter, testdata og dokumentasjon skal ligge. | Juster | API-nøkler i `.env` utenfor Git. Ikke legg foiler eller kurslitteratur du ikke har rettigheter til i det offentlige repoet; bruk egne notater eller fritt materiale som testdata. |

## 3. Neste steg for gruppen

1. Legg til funksjonelle, testbare suksesskriterier, og marker hvilke MVP-punkter som er «må ha».
2. Velg LLM-leverandør ut fra personvernkravene, og planlegg demomodus og lokal kjøring for sensor.
3. Sjekk noen foilsett for formler og figurer, og gå videre til PRD.

Oppdater product brief i repoet når dere har gjort endringene, slik at historikken viser hvordan planen utviklet seg. Det er en del av prosessen sensor ser etter.
