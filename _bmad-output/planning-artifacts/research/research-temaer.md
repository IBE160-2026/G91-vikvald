---
title: "Research-temaer før PRD: Studiekamerat"
created: 2026-10-28
updated: 2026-10-28
---

# Research-temaer før PRD: Studiekamerat

Liste over det som bør undersøkes før PRD-en skrives. Den bygger på briefen, addendumet og faglærers tilbakemelding fra 2026-10-06. Konkurrenter og læringsforskning er allerede dekket i `../briefs/brief-G91-vikvald-2026-09-24/addendum.md`.

**Regel for testmateriale:** Forelesningsfoiler og kurslitteratur lastes ikke opp i KI-verktøy (heller ikke Claude eller NotebookLM) før opphavsretten er avklart. Bruk egne notater eller åpent lisensiert materiale (OpenStax, NDLA, Wikipedia).

## A. Beslutninger før PRD og arkitektur

- [x] **Valg av språkmodell.** *(Researchet 2026-10-28, se Funn.)* Hvilke leverandører lagrer data i EU/EØS og trener ikke på opplastet innhold? Aktuelle kandidater er Mistral, Azure OpenAI (EU-region), Gemini via Vertex (EU) og en lokal modell via Ollama. Sammenlign pris per forelesning, kvalitet på norsk og støtte for strukturert output (JSON).
- [x] **Demomodus for sensor.** *(Researchet 2026-10-28, se Funn.)* Hvordan kan appen kjøres uten min API-nøkkel? Alternativer: ferdiggenerert eksempelinnhold, en mock-modell eller en lokal modell.
- [ ] **PDF-lesing med sidetall.** Hvor mye tekst går tapt fra foiler, særlig formler og figurer? Testes på åpent materiale, eller med et lokalt skript som bare rapporterer tall (tegn per side, sider med lite tekst). Avgjør om formler i tekstform må med i MVP.
- [ ] **Teknologistakk.** Velg et vanlig og godt dokumentert oppsett for webapp, innlogging og database som er enkelt å kjøre lokalt etter README.

## B. Opphavsrett og testmateriale

- [ ] **Spør faglærer** om det holder at brukeren selv er ansvarlig for materialet sitt, og om appen kan testes på egne notater og åpent materiale i stedet for forelesningsfoiler.
- [ ] **Spør foreleseren i testemnet** om foilene kan brukes i appen, hvis faglærer mener det er nødvendig.
- [ ] **Juster suksesskriteriet** i briefen hvis testmaterialet endres: «ekte materiale fra emner jeg tar» → «egne notater og åpent lisensiert materiale».
- [ ] **Finn åpent testmateriale** som ligner testemnet, gjerne med formler (OpenStax, NDLA eller Wikipedia).
- [ ] **Velg testemne.**

## C. Ting jeg tester selv

- [ ] **Prøv konkurrentene med samme åpne materiale.** NotebookLM og StuderSmartere.no: hva er bra, hva mangler, og hvordan vises kildene?
- [ ] **Huskeregler.** Hvor gode er språkmodeller til å lage huskeregler på norsk? Rask prøve med noen lister og modeller. Dette er det som skiller appen fra de andre.
- [ ] **Kvalitet på quiz.** Er feilsvarene troverdige? Gir vanskelighetsgradene merkbart forskjellige spørsmål?

## D. Brukerbehov

- [ ] **Spør 3–5 medstudenter:**
  - Hvordan forbereder du deg til eksamen?
  - Bruker du KI-verktøy til det? Hvilke?
  - Ville du stolt på flashcards laget av KI hvis de viste hvor i materialet svaret står?

## E. Brainstorming-temaer

- [ ] Hvordan kildehenvisningen vises: lenke til siden eller utdrag av teksten?
- [ ] Skjermflyten: emneoversikt → forelesning → flashcards og quiz.
- [ ] Hva som skjer når KI-en tar feil: rette, flagge eller slette.
- [ ] Om fremgang skal vises (for eksempel hvor mange kort jeg kan) uten full spaced repetition.

## F. Krav fra sensorveiledningen (del 1)

Lagt til 2026-10-28 etter gjennomgang av sensorveiledningen for del 1. Vekten står i parentes. Punktene er det som bør avklares før eller i PRD-en, så det ikke må rettes i etterkant.

- [ ] **Arbeidsflyt i Git (prosess, 30 %).** Sensor ser etter branches, pull requests og issues. Bestem om stories skal bygges på egne branches med PR, og om åpne punkter skal ligge i GitHub Issues i tillegg til `issues.md`.
- [ ] **Lagring av prompts og KI-økter (prosess, 30 %).** Sesjonsloggen lagrer sammendrag, ikke prompts. Bestem hvordan viktige prompts og eksempler på at KI-forslag ble avvist eller rettet skal tas vare på, og koble dem til commits.
- [ ] **Commit research-mappen (prosess, 30 %).** Research, kilder og logg er spor av prosessen og bør ligge i repoet.
- [ ] **Teststrategi (testing, 15 %).** Velg testrammeverk, og planlegg hvilke funksjonelle kriterier fra briefen som blir automatiske tester. Mock-modellen fra demomodusen gjør KI-delen testbar. Lag en manuell testplan for stikkprøven av 50 flashcards.
- [ ] **Designskisser (design, 10 %).** Skisser emneoversikt, flashcard-visning, quiz og hvordan kilden vises, for eksempel med `bmad-ux`.
- [ ] **Universell utforming (design, 10 %).** Kontrast, tastaturnavigasjon, alternativtekst og skjemaetiketter. Sett dette som krav i PRD-en.
- [ ] **Skjermstørrelser (design, 10 %).** Bestem om appen skal fungere på mobil, eller bare på PC.
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
