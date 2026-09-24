---
title: "Produktbrief: Studiekamerat"
status: final
created: 2026-09-24
updated: 2026-09-24
---

# Produktbrief: Studiekamerat

## Sammendrag

Studiekamerat er en norskspråklig webapp som hjelper studenter med å gjøre forelesningsfoiler og notater om til materiell de kan øve på: sammendrag med valgbart detaljnivå, nøkkelbegreper, flashcards, flervalgsquiz med valgbar vanskelighetsgrad og huskeregler. Alt innhold viser til kilden i materialet.

Mange studenter bruker eksamensperioden på å rydde i et semester med rotete notater og tynne foiler, i stedet for å repetere. Det er repetisjonen som gir læring. Studiekamerat følger studenten fra første forelesning. Stoffet legges inn fortløpende per emne og forelesning, slik at studenten går inn i eksamensperioden klar til å teste seg selv.

Studiekamerat er et soloprosjekt i IBE160 høsten 2026. Omfanget er bevisst holdt nøkternt, og kvaliteten skal ligge i gjennomføringen. Appen testes i praksis ved at jeg bruker den selv i et emne jeg tar dette semesteret.

## Problemet

Tre uker før eksamen sitter mange studenter med et semester med rotete notater, tynne forelesningsfoiler og opptak de knapt har fulgt med på. Før de kan begynne å repetere, må de først sette seg inn i stoffet på nytt. Tiden de skulle brukt på å lære, går med til å rydde.

Det finnes metoder som virker. Man kan skrive ryddige notater etter hver forelesning med fast struktur og fargekoder, lage huskeregler av forbokstaver og quizze hverandre i kollokviegrupper. Men de koster mye tid, og det er ekstra krevende når foreleserens egne notater er lite forklarende. Når studenten ikke har tid til å bearbeide hver forelesning, hoper stoffet seg opp. Forelesningen går på i bakgrunnen mens mobilen tar oppmerksomheten, og eksamensperioden blir en kamp for å ta igjen det tapte i stedet for å repetere.

Resultatet er for lite tid til repetisjon. Studenten ender med å lese det samme om igjen, noe som er en svak strategi, i stedet for å teste seg selv jevnlig gjennom semesteret.

## Løsningen

Studiekamerat er en norskspråklig webapp som følger studenten gjennom semesteret. Etter hver forelesning laster studenten opp foiler eller notater til riktig emne. Appen gjør stoffet om til materiell studenten kan jobbe aktivt med:

- **Sammendrag** med valgbart detaljnivå: kort, middels eller detaljert.
- **Nøkkelbegreper** med korte forklaringer.
- **Flashcards** der studenten må tenke ut svaret før kortet snus.
- **Quiz** med flervalg og valgbar vanskelighetsgrad, med forklaring etter hvert svar.
- **Huskeregler** for lister og modeller som må pugges, for eksempel en forkortelse av forbokstavene.

Alt generert innhold viser til kilden, altså hvilken fil og side det kommer fra, slik at studenten kan sjekke det og stole på det. Fordi stoffet legges inn fortløpende per forelesning, har studenten et ryddig og samlet grunnlag for repetisjon når eksamen nærmer seg. Tre uker før eksamen skal studenten repetere, ikke begynne på nytt.

Poenget er ikke at KI-en skal lære stoffet for studenten. Poenget er å fjerne ryddearbeidet, slik at tiden går til å teste seg selv. Det er det som faktisk gir læring. I både flashcards og quiz må studenten svare før fasiten vises.

## Hva gjør Studiekamerat annerledes

Det finnes allerede gode verktøy som lager sammendrag, flashcards og quiz fra dokumenter, blant annet Google NotebookLM, Quizlet og Knowt. Studiekamerat prøver ikke å slå dem på bredde. Studiekamerat skiller seg ut på fire punkter:

- **Bygd for semesteret, ikke bare for eksamensinnspurten.** Stoffet organiseres per emne og forelesning mens semesteret pågår. De generelle verktøyene er laget for å behandle ett og ett dokument.
- **Huskeregler.** Ingen av verktøyene jeg har sett på, lager huskeregler. Metoden har fungert godt for meg når jeg har pugget modeller og lister.
- **Norsk fra grunnen av.** Grensesnittet og det genererte innholdet er på norsk, og norske fagbegreper står sammen med de engelske der pensum blander språkene.
- **Kilder på alt.** Hvert kort og hvert spørsmål viser hvor i materialet det kommer fra. Det gjør det mulig for studenten å oppdage feil i det KI-en har laget.

Studiekamerat har ingen teknisk fordel som andre ikke kan kopiere. Styrken ligger i at Studiekamerat er tilpasset én konkret studiehverdag.

## Hvem er det for

**Primærbruker:** en student i høyere utdanning i Norge med et teoritungt emne, der forelesningsfoilene er for tynne til å lese alene. Studenten lærer lite av å bare høre på foreleseren og mister lett oversikten i løpet av semesteret. Studenten vet at det å teste seg selv og repetere virker, men har ikke tid til å lage materialet selv.

Suksess for denne studenten er å gå inn i eksamensperioden med oversikt over stoffet og bruke den tiden på repetisjon. I første omgang er brukerne studenter ved HiMolde med norsk som hovedspråk.

## Suksesskriterier

Jeg tester Studiekamerat på ekte materiale fra emner jeg tar selv dette semesteret. Hvilke emner det er, kan jeg dokumentere senere. Emnet er testarenaen for appen. Det er appen som måles, ikke meg: karakteren min i emnet er ikke et suksesskriterium.

**I bruk (eget emne som testarena)**
- Forelesningene i testemnet legges inn i Studiekamerat fortløpende.
- Mesteparten av eksamensforberedelsene går til flashcards, quiz og huskeregler, ikke til å rydde og sette meg inn i stoffet på nytt.
- Appen gjør det lettere å få oversikt over pensum. Dette vurderes i en kort egenrefleksjon om hvordan appen fungerte i eksamensforberedelsene: hva som hjalp, og hva som manglet.

**For kvaliteten**
- En stikkprøve av generert innhold sjekkes mot kildene, og feilene registreres: 50 flashcards, med mål om under 5 % faglige feil.
- Kildehenvisningene peker på riktig fil og side.

**For IBE160**
- Målet er en brukbar MVP **i midten av november**, slik at den rekker å bli testet i eksamensforberedelser. Dette er et mål, ikke et krav.
- Alle MVP-funksjonene virker i en publisert webapp innen IBE160-fristen i midten av desember.
- Bruken av KI i utviklingen er dokumentert, slik emnet krever.

## Omfang (MVP)

MVP står for *minimum viable product*: den minste versjonen av appen som er nyttig å bruke. Rammer: én utvikler og tre måneder (IBE160, høsten 2026). Omfanget skal være håndterbart. Kvaliteten skal ligge i gjennomføringen, ikke i antall funksjoner.

**Med i MVP.** Listen er foreløpig og finjusteres i PRD-en. Den følger oppgaveteksten, pluss huskeregler. Punktene står i den rekkefølgen de bygges, slik at det som står sist, er det første som kuttes hvis tiden blir knapp.
1. Norsk grensesnitt og norsk generert innhold. Dette gjelder hele appen.
2. Innlogging, fordi brukerens materiale lagres.
3. Emner og forelesninger: opprette emne og laste opp PDF eller tekst per forelesning.
4. Flashcards med kildehenvisning. Studenten må svare før fasiten vises.
5. Flervalgsquiz med valgbar vanskelighetsgrad og forklaring.
6. Huskeregler: KI-en foreslår måter å huske lister og modeller på, for eksempel forkortelser av forbokstaver.
7. Nøkkelbegreper.
8. Sammendrag med valgbart detaljnivå.

**Utvidelser hvis tiden strekker til**
- **Første utvidelse:** quiz med fritekstsvar og tilbakemelding fra KI-en. Det er vanskeligere enn flervalg og ligner mer på en eksamen.
- Spaced repetition, der appen velger hvilke kort som skal øves i dag.

**Utenfor**
- Transkribering av lyd- og videoopptak.
- Deling og quizzing mellom studenter.
- Mobilapp.
- Integrasjon med Canvas.
- Tolkning av tabeller og figurer. Bare tekst i MVP.

## Risiko og åpne spørsmål

- **Feil i generert innhold.** En studie fra 2025 fant feil i omtrent 5 % av KI-genererte flashcards. Tiltaket er at alt innhold viser til kilden, og at studenten kan redigere eller slette kort.
- **Opphavsrett.** Kopinor-avtalen tillater foreløpig ikke at kurslitteratur lastes opp i KI-verktøy, og foilene tilhører foreleseren. MVP-en skal derfor tydelig si at brukeren er ansvarlig for eget materiale, og være ment for egne notater og materiale brukeren har rett til å bruke. Dette ser ut til å være godt nok for et skoleprosjekt, men det må bekreftes med faglæreren.
- **Personvern.** HiMoldes KI-retningslinjer og GDPR krever at innhold ikke brukes til å trene modeller, og at data helst lagres i EU/EØS. Dette påvirker valget av LLM-leverandør.
- **For passiv bruk.** KI-sammendrag kan gjøre studenten mer passiv. Tiltaket er at flashcards og quiz krever svar før fasiten vises. Å bare lese sammendrag er ikke hovedbruken.
- **Omfang og tid.** Prosjektet har én utvikler, og IBE160-fristen er i midten av desember. Målet er en brukbar MVP i midten av november, slik at den kan testes på ekte materiale før fristen. Utvidelsene må vente til MVP-en er ferdig og fungerer.
- **Formler og figurer.** Tekniske emner har ofte mange formler og diagrammer, og tolkning av figurer er utenfor MVP. Før PRD-en skrives, bør jeg sjekke to eller tre foilsett fra testemnet for å se hvor mye som går tapt når bare teksten leses. Er tapet stort, må formler i tekstform med i MVP.
- **Åpne beslutninger fra oppgaveteksten** tas i PRD-en og arkitekturen: valg av LLM og konfidensnivå, lokal behandling eller sky, og hvor detaljerte sammendragene skal være.
