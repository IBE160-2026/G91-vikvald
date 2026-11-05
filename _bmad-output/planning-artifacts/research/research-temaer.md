---
title: "Research-temaer før PRD: Studiekamerat"
created: 2026-10-28
updated: 2026-11-05
---

# Research-temaer før PRD: Studiekamerat

Liste over det som bør undersøkes før PRD-en skrives. Den bygger på briefen, addendumet og faglærers tilbakemelding fra 2026-10-06. Konkurrenter og læringsforskning er allerede dekket i `../briefs/brief-G91-vikvald-2026-09-24/addendum.md`.

**Regel for testmateriale:** Forelesningsfoiler og kurslitteratur lastes ikke opp i KI-verktøy (heller ikke Claude eller NotebookLM). Bestemt 2026-11-05: Forelesningsfoiler brukes ikke som testmateriale. Bruk egne notater, der kopiert innhold fra foiler og lærebøker er fjernet, eller åpent lisensiert materiale (OpenStax, NDLA, Wikipedia).

## A. Beslutninger før PRD og arkitektur

- [x] **Valg av språkmodell.** *(Researchet 2026-10-28, se Funn.)* Hvilke leverandører lagrer data i EU/EØS og trener ikke på opplastet innhold? Aktuelle kandidater er Mistral, Azure OpenAI (EU-region), Gemini via Vertex (EU) og en lokal modell via Ollama. Sammenlign pris per forelesning, kvalitet på norsk og støtte for strukturert output (JSON).
- [x] **Demomodus for sensor.** *(Researchet 2026-10-28, se Funn.)* Hvordan kan appen kjøres uten min API-nøkkel? Alternativer: ferdiggenerert eksempelinnhold, en mock-modell eller en lokal modell.
- [x] **PDF-lesing med sidetall.** *(Testet 2026-11-05, se [resultater](pdf-og-norsk-test/resultater.md): Formler tegnet som vektorgrafikk forsvinner fra tekstuttrekket, men ble lest riktig fra bilde av siden. Bestemt: tekst som standard, og bilde av siden for sider med formler som mangler i teksten.)* Hvor mye tekst går tapt fra foiler, særlig formler og figurer? Testes på åpent materiale, eller med et lokalt skript som bare rapporterer tall (tegn per side, sider med lite tekst). Avgjør om formler i tekstform må med i MVP.
- [ ] **Teknologistakk.** Velg et vanlig og godt dokumentert oppsett for webapp, innlogging og database som er enkelt å kjøre lokalt etter README.
- [x] **Publisering på nett.** *(Bestemt 2026-10-29: ikke i MVP. Appen kjøres lokalt etter README, og publisering vurderes etter MVP. Stakken velges slik at den kan publiseres på Vercel senere.)* Faglærer opplyste 2026-10-29 at Vercel (Hobby, gratis) er eneste publiseringsløsning emnet støtter. Publisering er valgfritt. Bestem om appen skal publiseres, eller bare kjøres lokalt etter README. Velges publisering, settes Vercel opp når appen har et første skjelett, og repoet må være offentlig.
  - **Rammeverk:** Velg en stakk som også kan kjøre på Vercel (for eksempel Next.js, Vite/React, Node/Express eller Python), så muligheten holdes åpen.
  - **Nøkler til Vertex AI:** Modellkallet bør uansett gå via serveren, med service account-nøkkelen i miljøvariabler (`.env` lokalt, Settings → Environment Variables på Vercel). Aldri i repoet, og aldri i variabler med `VITE_` eller `NEXT_PUBLIC_`.
  - **EU-region (hvis publisert):** Vercel-funksjoner kjører som standard i USA (`iad1`). Sjekk om Hobby-planen lar oss velge en EU-region (for eksempel `fra1` eller `arn1`). Hvis ikke, går brukerdata via USA selv om Vertex ligger i EU, og det må vurderes opp mot kravet om data i EU.

## B. Opphavsrett og testmateriale

- [x] **Spør faglærer** *(E-post sendt 2026-11-05, venter på svar. Planen er vilkårstekst i appen til noe annet er avklart.)* om det holder at brukeren selv er ansvarlig for materialet sitt. E-posten opplyser at appen bare testes på egne notater og åpent materiale.
- [x] **Spør foreleseren i testemnet** *(Faller bort 2026-11-05: foiler brukes ikke som testmateriale.)* om foilene kan brukes i appen, hvis faglærer mener det er nødvendig.
- [x] **Juster suksesskriteriet** *(Gjort 2026-11-05.)* i briefen hvis testmaterialet endres: «ekte materiale fra emner jeg tar» → «egne notater og åpent lisensiert materiale».
- [x] **Finn åpent testmateriale** i markedsføring og økonomi, med formler i økonomistoffet (OpenStax, NDLA eller Wikipedia). *(2026-11-05: se under.)*
  - **Valgt:** [Principles of Marketing](https://openstax.org/books/principles-marketing/pages/preface) og [Principles of Economics 3e](https://openstax.org/books/principles-economics-3e/pages/preface) fra OpenStax. Begge er gratis som PDF, på engelsk og lisensiert CC BY-NC-SA 4.0. Hvilke kapitler i økonomiboka som har formler, er ikke sjekket.
  - **Lisensen:** Den tillater ikke kommersiell bruk og krever kreditering. PDF-ene legges ikke i repoet, og generert innhold fra bøkene som legges i repoet, må krediteres og deles under samme lisens.
  - **NDLA:** [Markedsføring og ledelse 1](https://ndla.no/subject:1:433559e2-5bf4-4ba1-a592-24fa4057ec01) er merket som utgått. Lisens må sjekkes per artikkel, så NDLA er ikke førstevalg.
  - **Norsk kildetekst:** Egne notater i markedsføring blir den norske kildeteksten.
- [x] **Velg testemne.** *(Bestemt 2026-11-05: markedsføring som hovedemne, og en mindre test på økonomifag for formler. Ingen emner dette semesteret passer, så repetisjonen simuleres.)*

## C. Ting jeg tester selv

- [ ] **Prøv konkurrentene med samme åpne materiale.** NotebookLM og StuderSmartere.no: hva er bra, hva mangler, og hvordan vises kildene?
- [x] **Huskeregler.** *(Testet 2026-11-05, se [resultater](pdf-og-norsk-test/resultater.md): Brukbare, men av varierende verdi, og fagbegreper må sjekkes.)* Hvor gode er språkmodeller til å lage huskeregler på norsk? Rask prøve med noen lister og modeller. Dette er det som skiller appen fra de andre.
- [x] **Kvalitet på quiz.** *(Testet 2026-11-05, se [resultater](pdf-og-norsk-test/resultater.md): Nivåene skiller seg, men flere feilsvar er ikke troverdige, og det riktige svaret er ofte lengst.)* Er feilsvarene troverdige? Gir vanskelighetsgradene merkbart forskjellige spørsmål?

## D. Brukerbehov

- [x] **Spør 3–5 medstudenter.** *(Faller bort 2026-11-05: jeg kjenner ingen med puggefag, og det blir ingen spørreundersøkelse. Erstattet av offentlige kilder under. Dette må stå som en begrensning i PRD-en.)*
- **Offentlige erfaringer (2026-11-05, svakt grunnlag):** Funnene er enkeltutsagn og egne påstander fra leverandører, ikke målinger. De viser ikke hvor utbredt problemene er.
  - **Riktighet og tillit:** I en tråd på r/notebooklm klager brukere på oppdiktet innhold og feil i kort. Én skriver at verktøyet er ubrukelig for dem hvis 1 av 15 kort er feil. [Reddit](https://reddit.sentinel-team.org/posts/1rhjbsw/snapshots/2026-03-02T19%3A23%3A45.392683Z)
  - **Kildehenvisning:** I samme tråd trekkes muligheten til å sjekke kilden fram som det som gjør verktøyet nyttig. Dette støtter kildehenvisningen i Studiekamerat, men bygger på bare to innlegg.
  - **Grenser i quizen:** Brukere klager på tak på 25 spørsmål, manglende forklaringer og manglende spørsmål eller svar i NotebookLM.
  - **Passivitet:** Brainscape oppgir at studenter som masselaget KI-kort, studerte mindre og falt fra tidligere. Brainscape selger selv slike verktøy, så dette må leses med forbehold. [Brainscape](https://m.brainscape.com/academy/flashcard-copilot-ai-generator)
  - **Gjenstår:** Jeg fant ingen måling av hvor ofte KI-kort er feil, og ingen direkte tråder fra r/Anki eller r/GetStudying.

## E. Brainstorming-temaer

- [ ] Hvordan kildehenvisningen vises: lenke til siden eller utdrag av teksten?
- [ ] Skjermflyten: emneoversikt → forelesning → flashcards og quiz.
- [ ] Hva som skjer når KI-en tar feil: rette, flagge eller slette.
- [ ] Om fremgang skal vises (for eksempel hvor mange kort jeg kan) uten full spaced repetition.

## F. Krav fra sensorveiledningen (del 1)

Lagt til 2026-10-28 etter gjennomgang av sensorveiledningen for del 1. Vekten står i parentes. Punktene er det som bør avklares før eller i PRD-en, så det ikke må rettes i etterkant.

- [x] **Arbeidsflyt i Git (prosess, 30 %).** *(Bestemt 2026-10-29: hver story bygges på egen branch og flettes via pull request. Åpne punkter føres som GitHub Issues i tillegg til `issues.md`.)* Sensor ser etter branches, pull requests og issues. Bestem om stories skal bygges på egne branches med PR, og om åpne punkter skal ligge i GitHub Issues i tillegg til `issues.md`.
- [ ] **Lagring av prompts og KI-økter (prosess, 30 %).** Sesjonsloggen lagrer sammendrag, ikke prompts. Bestem hvordan viktige prompts og eksempler på at KI-forslag ble avvist eller rettet skal tas vare på, og koble dem til commits.
- [ ] **Commit research-mappen (prosess, 30 %).** Research, kilder og logg er spor av prosessen og bør ligge i repoet.
- [ ] **Teststrategi (testing, 15 %).** Velg testrammeverk, og planlegg hvilke funksjonelle kriterier fra briefen som blir automatiske tester. Mock-modellen fra demomodusen gjør KI-delen testbar. Lag en manuell testplan for stikkprøven av 50 flashcards.
- [ ] **Designskisser (design, 10 %).** Skisser emneoversikt, flashcard-visning, quiz og hvordan kilden vises, for eksempel med `bmad-ux`.
- [ ] **Universell utforming (design, 10 %).** Kontrast, tastaturnavigasjon, alternativtekst og skjemaetiketter. Sett dette som krav i PRD-en.
- [x] **Skjermstørrelser (design, 10 %).** *(Bestemt 2026-10-29: bare PC i MVP. Mobil er en mulig utvidelse.)* Bestem om appen skal fungere på mobil, eller bare på PC.
- [ ] **README-krav (kjørbarhet, 10 %).** Versjoner av forutsetninger, kommandoer som kan kopieres, `.env.example`, testbruker og eksempeldata, hvordan testene kjøres, og lenker til planleggingsdokumentene.
- [ ] **`.gitignore` og testdata (ryddighet, 5 %).** Sjekk at `.env`, avhengigheter og byggefiler holdes ute. Foiler og sensorveiledningen skal ikke i repoet.

## Funn

### 2026-10-28: Valg av språkmodell og demomodus

Full rapport med kilder: [technical-valg-av-sprakmodell-og-demomodus-2026-10-28/research.md](technical-valg-av-sprakmodell-og-demomodus-2026-10-28/research.md)

- **Hovedvalg:** Azure OpenAI (GPT-5.4-mini eller GPT-5-mini) via Azure for Students, i Data Zone EU. Gratis ($100 i 12 mnd), uten kredittkort.
- **Alternativ:** Gemini Flash på Vertex AI i en EU-region. Litt bedre på norsk, men krever kredittkort.
- **Faller bort:** Anthropics eget API, Gemini via AI Studio, Sikt KI og Mistrals gratisnivå.
- **Pris avgjør ikke:** under $1 per semester for de billige modellene.
- **Demomodus:** ferdiglaget innhold og en mock-modell som standard, med Ollama som valgfritt tillegg.
- **Neste steg:**
  - Opprett Azure for Students og sjekk kvoten for Data Zone EU.
  - Test norsk kvalitet med Azure og Gemini på åpent materiale.

### 2026-10-28: Test av Azure for Students

- **Tillatte regioner** i studentabonnementet (Azure Policy): polandcentral, norwayeast, germanywestcentral, italynorth og austriaeast. Sweden Central er ikke tillatt.
- **Hvilke modeller som finnes hvor** ([Microsoft Learn, oppdatert 2026-10-19](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure-region-availability)):
  - Data Zone Standard: gpt-5.4-mini i Norway East, Germany West Central, Poland Central og Italy North; gpt-5-mini i de tre siste.
  - Standard (regional) i Norway East: bare gpt-4o.
- **Forsøk på deployering i Norway East:**
  - gpt-5.4-mini med Data Zone Standard: «insufficient quota».
  - gpt-5-mini med Data Zone Standard: ikke støttet i regionen.
  - gpt-4o (2024-11-20) med Standard: «insufficient quota».
- **Konklusjon:** Studentabonnementet har ikke kvote for deployeringer som holder data i EU. Global Standard brukes ikke, fordi den kan behandle data utenfor EU.
- **Kvotesøknad sendt 2026-10-28:** Azure OpenAI, Data Zone Standard, pool EUR, gpt-5.4-mini, 50 kTPM. Microsoft svarer vanligvis innen 1–2 virkedager, men gir ingen garanti, og kunder som allerede bruker kvoten sin, prioriteres.
- **Kvotesøknaden ble avslått 2026-10-28:** «At this time your quota increase request cannot be processed.»
- **Konklusjon:** Azure for Students kan ikke brukes med data i EU. Gemini Flash på Vertex AI i en EU-region er nå hovedvalget.
- **Neste steg:** Sett opp Google Cloud-prøveperiode og Vertex AI i EU (for eksempel europe-west4 eller europe-west3). *(Gjort 2026-11-05.)*
- **Oppsett av Vertex AI 2026-11-05:** Mellomlagring er slått av for prosjektet (`disableCache: true`). Innlogging skjer med `gcloud` uten nøkkelfil.
- **Modeller som svarte på ekte kall 2026-11-05:**
  - `eu`: `gemini-3.8-flash`, `3.7-flash`, `3.6-flash`, `3.5-flash`, `3.5-flash-lite` og `3.1-flash-lite`.
  - `europe-west3`: bare `gemini-3.5-flash`.
  - `europe-west4`: ingen av de testede.
  - `gemini-2.5-flash` og `2.5-flash-lite` ga 404 i alle tre.
- **Personvern:** Google oppgir at maskinlæringsbehandlingen på `eu` skjer i EU, og at dataene ikke brukes til trening. Google kan likevel logge prompts for å oppdage misbruk, så «mellomlagring av» betyr ikke at ingenting lagres.
- **Ikke bekreftet:** at kallene trekkes fra prøvekreditten.
