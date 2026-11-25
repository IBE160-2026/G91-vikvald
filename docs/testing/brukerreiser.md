# Brukerreisene testet med Playwright

Denne oversikten viser hvilke steg i de fire flytene i [EXPERIENCE.md](../../_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/EXPERIENCE.md#brukerreiser-key-flows) som har en automatisk test. Testene ligger i [`frontend/e2e/brukerreiser/`](../../frontend/e2e/brukerreiser/), én fil per flyt. De går i nettleseren i demomodus mot appen startet med `docker compose up --build`, og kjører axe (automatisk test av universell utforming) på hver side de besøker.

Kjør dem slik, i `frontend/`, mens appen kjører:

```
npx playwright test e2e/brukerreiser
```

**Sist oppdatert:** etter epic 8 (fritekst for hele emnet i steg 5–7 i flyt 2, fra story 8.1–8.3, og ventingen i steg 4 i flyt 2 er rettet, #343). Flyt 2 er nå testet fra start til slutt. Før det: etter epic 7 (modellkortet midt i flashcard-økten og «Endre huskeregel» i steg 4 i flyt 2, fra story 7.2). Før det: story 7.1 (modellkort i tellingene i flyt 3, #131). Før det: etter epic 6 (formelmerket «Inneholder formel – sjekk mot kilden» fra story 6.3, som nå er testet som feilvei i flyt 2). Før det: epic 5 (status «Øvd», forelesningstabellen, SISTE ØKT, tiden til eksamen, emnekortene og semesterlinja), epic 4 (quiz), epic 3 (flashcards) og epic 2 (emner, forelesninger, filer og kontosiden). Flyt 4 er testet fra start til slutt. Flyt 3 er testet fra start til slutt, også modellkortene i tellingene (story 7.1, #131). I flyt 1 er alt testet unntatt sammendraget (epic 9). Bare sammendraget (epic 9, steg 11 i flyt 1) er ikke bygd ennå.

**Slik leses tabellene**

- **Steg** er nummeret og teksten fra flyten i EXPERIENCE.md. Når bare en del av et steg er bygd, står steget på to rader: delen som er testet, og delen som ikke er bygd ennå.
- **Krav-ID-er** er kravene steget viser, fra EXPERIENCE.md, PRD-en og [epics.md](../../_bmad-output/planning-artifacts/epics.md). De samme ID-ene står i testnavnet.
- **Test** er fila og testnavnet. For steg som ikke er bygd, står storien som skal bygge dem.
- **Status** er `testet`, `ikke bygd ennå` eller `kuttet` med issue-nummer. Ingen steg er kuttet.
- **Forutsetning** er noe flyten tar for gitt før første steg, for eksempel at Klara har en konto. I flyt 1 lages forutsetningene i nettleseren. I flyt 2, 3 og 4 lages de gjennom API-et før testen starter (konto, godtatte vilkår, emner, forelesninger og PDF-er), siden flytene starter midt i semesteret og ikke har noe eget innloggingssteg.
- **Datoene** regnes ut fra dagens dato når testen kjøres: eksamen er alltid tre uker fram, så semesterlinja sier «om 3 uker» uansett når testene kjøres. Bare forelesningsdatoene i flyt 2 (fredagene i uke 34–41) er faste, siden de ligger i fortida.
- **Semesterlinja** er skjult for skjermleser (`aria-hidden`). Testene sjekker derfor teksten skjermleseren får (lista med én linje per emne, for eksempel «Markedsføring: 4 av 8 forelesninger øvd. Eksamen fredag 04.12, om 3 uker.») og det som synes (eksamensteksten, «I dag», antall stasjoner og hvilke som er fylt), ikke detaljer i SVG-tegningen.
- **PDF-ene** lager testen selv med [`e2e/pdf.ts`](../../frontend/e2e/pdf.ts). Ingen ekte notater brukes. En side kan også få en «formel» tegnet som vektorkurver (uten tekst), som story 6.3 lagde for [`formelmerke.spec.ts`](../../frontend/e2e/formelmerke.spec.ts). Backenden merker slike sider ved opplasting, og det som lages fra dem, får formelmerket, også i demomodus. Demomodellen lager ett flashcard og ett quizspørsmål per definisjonssetning («X er …»), så PDF-ene har korte definisjoner, høyst tre per side. Quiz krever minst fire definisjoner i forelesningen. Med færre lager demomodellen ingen spørsmål.
- **Flashcards og quiz** lages i nettleseren i flyt 1, slik Klara gjør det. I flyt 2 og 3 lages de gjennom API-et før testen starter, som en del av forutsetningen.

Stegene i hver testfil kjøres i rekkefølge i samme nettleser, som ett besøk av Klara. Feiler ett steg, hoppes resten over.

## Flyt 1 – UJ-1: Klara etter en forelesning

Fil: [`flyt-1-etter-forelesning.spec.ts`](../../frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts), `describe`: «UJ-1 / flyt 1: Klara etter en forelesning».

| Steg | Krav-ID-er | Test | Status |
|---|---|---|---|
| Forutsetning for 1: Klara har en konto | FR-3, UX-DR40 | «Forutsetning for steg 1 – FR-3, UX-DR40: Klara oppretter konto første gang» | testet |
| 1. Klara åpner Studiekamerat og logger inn (01) | UJ-1, FR-3, UX-DR40 | «Steg 1 – FR-3, UX-DR40: Klara åpner Studiekamerat og logger inn (01)» | testet |
| 2. Forsiden (02) vises | FR-3, UX-DR6, UX-DR45 | «Steg 2 (forsiden) – FR-3, UX-DR6, UX-DR45: forsiden «Dine emner» (02) med toppfelt» | testet |
| Forutsetning for 2: Klara har emnet Markedsføring | FR-6, UX-DR15, UX-DR21 | «Forutsetning for steg 2 – FR-6, UX-DR15, UX-DR21: Klara oppretter emnet Markedsføring med eksamensdato» | testet |
| 2. Forsiden viser semesterlinjen og tiden til eksamen, og hun trykker «Åpne» på Markedsføring | FR-6, FR-57, FR-58, SK-22, UX-DR11, UX-DR12 | «Steg 2 (semesterlinja og «Åpne») – FR-6, FR-57, FR-58, SK-22, UX-DR11, UX-DR12: forsiden (02) viser semesterlinja med tiden til eksamen og emnekortet, og hun trykker «Åpne» på Markedsføring» | testet |
| 3. «Ny forelesning» på emnesiden (03), dagens dato, til forelesningssiden (04) | FR-7, FR-15, UX-DR25 | «Steg 3 – FR-7, FR-15, UX-DR25: «Ny forelesning» på emnesiden (03) med dagens dato, til forelesningssiden (04)» | testet |
| 4. Drar PDF-en inn, vilkårsdialogen (05) første gang, «Godta og last opp» | FR-8, FR-11, NFR-6, UX-DR17, UX-DR23 | «Steg 4 – FR-8, FR-11, NFR-6, UX-DR17, UX-DR23: hun drar PDF-en inn, vilkårsdialogen (05) åpnes første gang, «Godta og last opp»» | testet |
| 5. Fila står i fillista med antall sider | FR-8, UX-DR16 | «Steg 5 (fila) – FR-8, UX-DR16: fila står i fillista med antall sider» | testet |
| 5. Hun logger ut | FR-3, UX-DR6, UX-DR40 | «Steg 5 (logg ut) – FR-3, UX-DR6, UX-DR40: Klara logger ut uten bekreftelse og kommer til innloggingen (01)» | testet |
| 6. Noen dager senere åpner hun forelesningen fra sidemenyen (prikken sier «Ikke øvd ennå») | FR-3, FR-7, UX-DR7 | «Steg 6 (sidemenyen) – FR-3, FR-7, UX-DR7: noen dager senere logger hun inn og åpner forelesningen fra sidemenyen» | testet |
| 6. «Lag flashcards», hun velger «Vanlig», jobbstatusen viser at kortene lages, og «Lag quiz» venter til kortene er ferdige | FR-17, FR-28, NFR-17, UX-DR18, UX-DR19, UX-DR24 | «Steg 6 (lag flashcards) – FR-17, FR-28, NFR-17, UX-DR18, UX-DR19, UX-DR24: «Lag flashcards», hun velger «Vanlig», jobbstatusen viser at kortene lages, og «Lag quiz» venter til de er ferdige» | testet |
| 6. «Lag quiz» (06) med «Vanlig» og «Middels», og jobbstatusen viser at quizen lages | FR-28, FR-29, FR-30, NFR-17, UX-DR18, UX-DR19, UX-DR24 | «Steg 6 (lag quiz) – FR-28, FR-29, FR-30, NFR-17, UX-DR18, UX-DR19, UX-DR24: kortene er ferdige, hun trykker «Lag quiz» (06), velger «Vanlig» og «Middels», og jobbstatusen viser at quizen lages» | testet |
| 7. Mens quizen lages: «Øv nå» på flashcards (07), Mellomrom snur, `1`/`2`, «Kunne ikke»-kort kommer igjen | FR-23, FR-24, FR-25, FR-28, NFR-8, NFR-17, UX-DR27, UX-DR31, UX-DR32 | «Steg 7 – FR-23, FR-24, FR-25, FR-28, NFR-8, NFR-17, UX-DR27, UX-DR31, UX-DR32: mens quizen lages, starter «Øv nå» kortøkten (07), Mellomrom snur, 1 og 2 markerer, og kortet hun ikke kunne, kommer igjen» | testet |
| 8. Økten er ferdig (08): «Kunne» og «Kunne ikke» med liste og kilde, og hun går tilbake til forelesningen (prikken sier nå «Øvd») | FR-26, FR-56, UX-DR7, UX-DR34, UX-DR35 | «Steg 8 – FR-26, FR-56, UX-DR7, UX-DR34, UX-DR35: økten er ferdig (08) med «Kunne» og «Kunne ikke», lista med kilde, og hun går tilbake til forelesningen» | testet |
| 9. «Øv nå» på Quiz-raden (09), `A`–`D` og Enter, riktig svar og forklaring med kilde | FR-32, FR-34, FR-35, NFR-8, UX-DR29 | «Steg 9 – FR-32, FR-34, FR-35, NFR-8, UX-DR29: quizen er ferdig, «Øv nå» på Quiz-raden starter quizen (09), hun svarer med A–D og Enter, og først da ser hun riktig svar og forklaring med kilde» | testet |
| 10. Resultatsiden (10) med poengsum og feilsvar med kilde | FR-36, FR-56, UX-DR34, UX-DR35 | «Steg 10 – FR-36, FR-56, UX-DR34, UX-DR35: resultatsiden (10) viser «3 av 4 riktige» og nøyaktig hvilket hun bommet på, med riktig svar og side i notatene» | testet |
| 11. «Lag sammendrag», leser det (13) med kilde på hvert punkt | FR-53, FR-54, UX-DR38 | – (epic 9) | ikke bygd ennå |
| Feilvei: Word-fil avvises | FR-9, UX-DR42 | «Feilvei – FR-9, UX-DR42: hun drar inn en Word-fil, og den avvises med beskjed om å lagre som PDF» | testet |
| Feilvei: skannet PDF uten lesbar tekst | FR-10, UX-DR42 | «Feilvei – FR-10, UX-DR42: en skannet PDF uten lesbar tekst avvises» | testet |
| Feilvei: fil over 50 sider | NFR-16, UX-DR42 | «Feilvei – NFR-16, UX-DR42: en fil over 50 sider avvises med beskjed om grensen» | testet |
| Feilvei: genereringen feiler, «Prøv igjen», ingenting halvferdig er lagret | FR-21, UX-DR19 | «Feilvei – FR-21, UX-DR19: genereringen feiler, raden viser meldingen og «Prøv igjen», og ingenting halvferdig er lagret» | testet |
| Feilvei: færre kort enn valgt | FR-18, UX-DR42 | «Feilvei – FR-18, UX-DR42: notatene gir grunnlag for færre kort enn valgt, og hun får beskjed om hvor mange som ble laget» | testet |

I steg 2 har Markedsføring ingen forelesninger ennå, siden Klara lager den første i steg 3. Semesterlinja har derfor ingen stasjoner, bare den stiplede tiden fra i dag til eksamen og «Ingen forelesninger ennå» (E6), og emnekortet viser NESTE STEG «Ny forelesning». At «forelesningene ligger tett», kan ikke vises i denne flyten. Det er testet med to forelesninger i [`semesterlinje.spec.ts`](../../frontend/e2e/semesterlinje.spec.ts), og med åtte i steg 1 i flyt 2.

Notatene i flyt 1 har fire definisjoner på tre sider, så «Vanlig» (inntil 20) gir 4 kort og 4 quizspørsmål. Det er det minste demomodellen kan lage en quiz av. Feilveien «færre kort enn valgt» kommer derfor rett etter at kortene er laget i steg 6, slik den ville gjort for Klara. I steg 9 svarer hun feil på spørsmål 2, så resultatsiden i steg 10 viser «3 av 4 riktige» (i flyten: «11 av 15»). Testene kjøres i denne rekkefølgen: steg 1–10, så feilveiene for opplasting, og til slutt feilveien for generering.

Tre steder holder testen igjen eller bytter ut et svar fra API-et, fordi demomodellen er for rask eller aldri feiler:

- **Jobbstatusen i steg 6:** En jobb i demomodus er ferdig på rundt ett sekund. Svaret på «start jobben» holdes igjen til testen har sett «Lager flashcards …». Deretter holdes svaret om den ferdige jobben (`GET /api/jobs/{id}`) igjen til testen har sett at Quiz-raden viser «Venter til flashcardene er ferdige». Jobben går på serveren imens.
- **Quizen lages mens hun øver (steg 6 og 7):** Svaret om den ferdige quizjobben holdes igjen fra hun trykker «Lag quiz», til hun har startet kortøkten og øvd på alle kortene. Da slippes svaret, og meldingen «Quizspørsmålene er ferdige: 4 spørsmål i Uke 37: Merkevare.» vises i kortøkten.
- **Genereringen feiler:** Demomodellen feiler aldri. Svaret om siste jobb byttes ut med en feilet jobb, som i [`flashcards.spec.ts`](../../frontend/e2e/flashcards.spec.ts). «Prøv igjen» starter så en ekte jobb med samme omfang. Den gir ingen nye kort, siden notatene er de samme.

De to andre avvisningene ved opplasting (fil over størrelsesgrensen og PDF som ikke kan åpnes) er ikke feilveier i flyt 1. De testes i [`filer.spec.ts`](../../frontend/e2e/filer.spec.ts) og i backend-testene.

## Flyt 2 – UJ-2: Klara før eksamen

Fil: [`flyt-2-for-eksamen.spec.ts`](../../frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts), `describe`: «UJ-2 / flyt 2: Klara før eksamen». Forutsetningen («Tre uker før eksamen har Klara lastet opp notater fra alle forelesningene i Markedsføring») lages gjennom API-et: emnet med eksamen om tre uker, åtte forelesninger med én PDF hver, flashcards fra hver av dem (ett per forelesning, fire i «Uke 37: Merkevare» og «Uke 38: Prising», 14 i alt), ett modellkort i «Uke 37: Merkevare» (se under) quiz fra de to forelesningene med fire definisjoner (fire spørsmål hver, åtte i alt) og kortsvar-fritekstspørsmål fra «Uke 36: Segmentering» og «Uke 38: Prising» (ett per definisjon, fem i alt). For at «fire av åtte forelesninger er øvd» skal stemme, lagres også én flashcard-økt i hver av de fire første forelesningene (uke 34–37) gjennom API-et, som om Klara har øvd på dem tidligere. Det er serveren som avgjør «øvd» (story 5.1). Eksamen er tre uker fram fra dagens dato.

| Steg | Krav-ID-er | Test | Status |
|---|---|---|---|
| 1. Forsiden (02) viser at eksamen er om tre uker og at fire av åtte forelesninger er øvd (semesterlinja og emnekortet med «Neste å øve på»), og hun trykker «Åpne» på Markedsføring | UJ-2, FR-6, FR-57, FR-58, SK-20, SK-22, UX-DR11, UX-DR12 | «Steg 1 – UJ-2, FR-6, FR-57, FR-58, SK-20, SK-22, UX-DR11, UX-DR12: forsiden (02) viser at eksamen er om tre uker og at fire av åtte forelesninger er øvd, og hun trykker «Åpne» på Markedsføring» | testet |
| 2. Emnesiden (03) viser forelesningene med status: «Øvd dd.mm» på de fire første og «Ikke øvd ennå» på resten, med Kort og Quiz, prikkene i sidemenyen og semesterlinja | FR-7, FR-15, FR-16, FR-56, UX-DR7, UX-DR11, UX-DR13 | «Steg 2 (forelesningene med status) – FR-7, FR-15, FR-16, FR-56, UX-DR7, UX-DR11, UX-DR13: emnesiden (03) viser forelesningene etter dato med filer, kort, quiz og status «Øvd»» | testet |
| 2. «Øv på flashcards» i kortet «Øv på hele emnet», og økten (07) blander kort fra alle forelesningene. Etterpå er alle åtte «Øvd», og SISTE ØKT viser økten | FR-23, FR-24, FR-25, FR-56, UX-DR13, UX-DR14, UX-DR34 | «Steg 2 (øver på hele emnet) – FR-23, FR-24, FR-25, FR-56, UX-DR13, UX-DR14, UX-DR34: i kortet «Øv på hele emnet» trykker hun «Øv på flashcards», og økten (07) blander kort fra alle forelesningene» | testet |
| 3. Quiz på hele emnet («Start», 09), kilden viser forelesningen | FR-32, FR-34, UX-DR14, UX-DR29 | «Steg 3 (starter quizen på hele emnet) – FR-32, FR-34, UX-DR14, UX-DR29: etterpå tar hun quiz på hele emnet («Start», 09), og kilden ved spørsmålet viser hvilken forelesning det kommer fra» | testet |
| 3. Resten av quizen, forelesningen ved hvert spørsmål, og resultatet for hele emnet, som SISTE ØKT viser | FR-34, FR-36, FR-56, UX-DR14, UX-DR29, UX-DR34 | «Steg 3 (resten og resultatet) – FR-34, FR-36, FR-56, UX-DR14, UX-DR29, UX-DR34: hver forklaring viser forelesningen spørsmålet kommer fra, og resultatet lagres for hele emnet» | testet |
| 4. Hun åpner «Uke 37: Merkevare» (04) | FR-7, UX-DR7 | «Steg 4 (åpner forelesningen) – FR-7, UX-DR7: hun åpner «Uke 37: Merkevare» (04) med notatene» | testet |
| 4. Hun øver på flashcards fra forelesningen (07) | FR-23, FR-24, UX-DR9, UX-DR27 | «Steg 4 (øver på flashcards) – FR-23, FR-24, UX-DR9, UX-DR27: hun øver på flashcards fra forelesningen (07)» | testet |
| 4. Midt i økten kommer modellkortet (11). Hun snur «Forklar AIDA-modellen» og ser punktene og huskeregelen AIDA | FR-42, FR-43, FR-56, UX-DR28, NFR-8 | «Steg 4 (modellkortet) – FR-42, FR-43, FR-56, UX-DR28, NFR-8: midt i økten kommer modellkortet (11), hun snur «Forklar AIDA-modellen» og ser punktene og huskeregelen AIDA» | testet |
| 4. Hun vil heller ha sin egen regel og trykker «Endre huskeregel» | FR-46, UX-DR21, UX-DR28 | «Steg 4 (Endre huskeregel) – FR-46, UX-DR21, UX-DR28: hun vil heller ha sin egen regel, trykker «Endre huskeregel» og lagrer den» | testet |
| 5. Tilbake på emnesiden starter hun fritekstspørsmål for hele emnet (12), skriver svaret i tekstfeltet og trykker «Vis modellsvar» | FR-48, FR-50, UX-DR14, UX-DR30 | «Steg 5 – FR-48, FR-50, UX-DR14, UX-DR30: tilbake på emnesiden starter hun fritekstspørsmål for hele emnet (12), skriver svaret i tekstfeltet og trykker «Vis modellsvar»» | testet |
| 6. Modellsvaret står under hennes eget svar, med kilde, `2` for «Delvis riktig», ◐ i rutenettet | FR-49, FR-51, NFR-8, UX-DR8, UX-DR9 | «Steg 6 – FR-49, FR-51, NFR-8, UX-DR8, UX-DR9: modellsvaret står under hennes eget svar, med kilde, hun trykker 2 for «Delvis riktig», og rutenettet i øktpanelet viser ◐» | testet |
| 7. Resultatet med riktig, delvis riktig og feil, lagret for hele emnet | FR-51, FR-56, UX-DR14, UX-DR34 | «Steg 7 – FR-51, FR-56, UX-DR14, UX-DR34: når økten er ferdig, ser hun hvor mange hun hadde riktig, delvis riktig og feil, og økten lagres for hele emnet» | testet |
| Feilvei: rediger et feil kort | FR-27, UX-DR27 | «Feilvei (rediger) – FR-27, UX-DR27: et kort er faglig feil, hun sjekker kilden og retter svaret med «Rediger» i bunnfeltet» | testet |
| Feilvei: slett et feil kort | FR-27, UX-DR22 | «Feilvei (slett) – FR-27, UX-DR22: hun sletter et feil kort med «Slett», bekrefter, og kortet er borte» | testet |
| Feilvei: slett et feil quizspørsmål (spørsmål kan ikke redigeres, FR-37) | FR-37, UX-DR22, UX-DR29 | «Feilvei (slett quizspørsmål) – FR-37, UX-DR22, UX-DR29: et spørsmål er faglig feil, hun sjekker kilden og sletter det med «Slett» i bunnfeltet, og svaret hun ga, står» | testet |
| Feilvei: et kort er merket «Inneholder formel – sjekk mot kilden», og hun slår opp i PDF-en på siden som står i kilden | FR-40, FR-41, UX-DR37 | «Feilvei (formelmerke) – FR-40, FR-41, UX-DR37: et kort er merket «Inneholder formel – sjekk mot kilden», og hun slår opp i PDF-en på siden som står i kilden» | testet |
| Feilvei: avslutter halvveis med Esc, resultatet vises og lagres | FR-56, UX-DR33 | «Feilvei (Esc) – FR-56, UX-DR33: hun avslutter økten halvveis med Esc, og resultatet for det hun har gjort, vises og lagres» | testet |

Steg 3 og feilveien for quizspørsmål kjøres i samme quiz på hele emnet: hun svarer på det første spørsmålet, ser kilden, sletter spørsmålet, og tar resten av quizen. Svaret hun ga før slettingen, står (E22), så quizen har fortsatt 8 spørsmål, og resultatet blir «7 av 8 riktige». Flyten sier «Slett» eller «Rediger», men FR-37 sier at spørsmål ikke kan redigeres, så bare «Slett» testes.

**Formelmerket:** Side 5 i `prising.pdf` («Margin er forskjellen mellom pris og kostnad.») har også en formel tegnet som vektorkurver. Kortet, quizspørsmålet og fritekstspørsmålet om margin får derfor merket. Feilveien kjøres sist, etter fritekst-økten: hun åpner «Uke 38: Prising» fra sidemenyen og øver på flashcards. Kortet om margin har merket rett over kilden «prising.pdf, side 5». Hun trykker «Kunne ikke», og kortet kommer igjen med merket. Feillista i resultatet (08) viser også merket over kilden. Tilbake på forelesningssiden (04) står `prising.pdf` med 5 sider i fillista, som er PDF-en hun slår opp i. Kilden er ren tekst i MVP-en, ikke en lenke, så testen kan ikke åpne PDF-en. Den sjekker at kilden og fillista gir henne fil og side. I tillegg sjekker steg 2 at bare kortet om margin har merket i økten for hele emnet, og steg 3 at bare spørsmålet om margin har det i forklaringen (har hun slettet nettopp det spørsmålet i feilveien for quizspørsmål, finnes det ikke lenger, og da sjekkes bare at de andre er umerket).

**Modellkortet:** `merkevare.pdf` har lista «AIDA-modellen» med punktene Attention, Interest, Desire og Action på side 6. Demomodellen lager ett modellkort av den, «Forklar AIDA-modellen.», med huskeregelen AIDA. Modellkort øves som flashcards (FR-56), så det telles med overalt der kort telles: «15 kort · 8 quizspørsmål» på emnekortet, 5 kort for «Uke 37: Merkevare» i forelesningstabellen og i «Lag og øv», og «15 kort fra 8 forelesninger» i «Øv på hele emnet». Økten for hele emnet i steg 2 har derfor 15 kort, og testen sjekker at modellkortet viser punktene der også.

Steg 4 og feilveiene for kort og Esc kjøres i samme flashcard-økt i «Uke 37: Merkevare» med fem kort: hun øver på det første kortet, retter det, sletter det, kan de to neste, kommer til modellkortet, snur det, endrer huskeregelen, trykker «Kunne ikke» på modellkortet og avslutter med Esc. Resultatet blir «Avbrutt etter 3 av 4». Feilveiene for kort står i flyten uten et bestemt steg. De passer best i denne økten.

**Rekkefølgen i økten:** Økten stokker kortene tilfeldig (FR-23). For at modellkortet skal komme midt i økten, slik flyten sier, og feilveiene skal treffe et vanlig kort, holder testen `Math.random` fast på 0,5 mens økten starter. Det gir rekkefølgen Merkevare, Image, Logo, modellkortet, Slagord. Den settes tilbake så snart økten viser det første kortet, altså når stokkingen er gjort. Før ble den satt tilbake etter fem sekunder, og når maskinen var travel, var ikke kortene lastet innen da, så rekkefølgen ble tilfeldig (#343). Testen sjekker likevel at minst ett kort kommer før modellkortet og ett etter. Stokkingen selv testes i enhetstestene i [`session.test.ts`](../../frontend/modules/practice/session.test.ts) og i steg 2, der rekkefølgen er tilfeldig.

**Fritekst (steg 5–7):** Etter Esc i steg 4 går hun til emnesiden fra sidemenyen. Kortet «Øv på hele emnet» har raden «Fritekstspørsmål» med «5 spørsmål fra 2 forelesninger». Økten stokker spørsmålene, så testen finner spørsmålet på skjermen i lista fra API-et og sjekker modellsvaret, kilden og forelesningen mot den. Modellsvaret skal stå under hennes eget svar, og testen sjekker at det ligger lavere på siden enn tekstfeltet. Hun trykker `2` på det første spørsmålet («Delvis riktig», ◐ i rutenettet), `1` på det tredje («Feil») og `3` på resten («Riktig»). Resultatet blir Riktig 3, Delvis riktig 1 og Feil 1. Lista under viser de to med modellsvar, kilde og forelesning, men ikke hennes eget svar, som heller ikke sendes med når økten lagres (FR-51). Spørsmålet om margin er fra siden med formel, og modellsvaret har merket «Inneholder formel – sjekk mot kilden». Til slutt viser SISTE ØKT «Fritekstspørsmål · Hele emnet». Feilveien med formelmerket kjøres etter fritekst-økten.

**Huskeregelen:** Klara skriver «Alle Ivrige Deltakere Applauderer». Den sjekkes bare for tomt felt, aldri mot forbokstavene (AR-4). Testen sjekker at den står på kortet med en gang, at punktene og markeringen er uendret, og at den er lagret.

## Flyt 3 – Klara rydder i filene (FR-12, FR-13)

Fil: [`flyt-3-rydder-i-filene.spec.ts`](../../frontend/e2e/brukerreiser/flyt-3-rydder-i-filene.spec.ts), `describe`: «FR-12, FR-13 / flyt 3: Klara rydder i filene». Forutsetningen lages gjennom API-et: en forelesning med den gamle `merkevare-notater.pdf` (6 sider) og lysarkene `merkevare-lysark.pdf`, og flashcards, quiz og modellkort. Den gamle fila gir 18 flashcards, 18 quizspørsmål og 2 modellkort (to punktlister på side 1 og 2), og lysarkene ett flashcard og ett quizspørsmål. Flashcards-raden teller modellkortene med, så den viser 21 kort. For å få 11 quizspørsmål fra den gamle fila, som i flyten, sletter forutsetningen sju av dem gjennom API-et, som om Klara har slettet dårlige spørsmål under quizen tidligere (FR-37). Alle stegene er testet fra start til slutt, også de 2 modellkortene i tellingene (story 7.1, #131).

| Steg | Krav-ID-er | Test | Status |
|---|---|---|---|
| 1. Forelesningssiden (04) med en gammel versjon av fila | FR-8, UX-DR16 | «Steg 1 – FR-8, UX-DR16: forelesningssiden (04) viser den gamle versjonen av fila» | testet |
| 2. «Slett» på fila, dialogen (14) viser fila, at 18 flashcards, 11 quizspørsmål og 2 modellkort slettes sammen med den, og at det ikke kan angres | FR-12, UX-DR22 | «Steg 2 – FR-12, UX-DR22: «Slett» på fila åpner dialogen (14) som viser fila, at 18 flashcards, 11 quizspørsmål og 2 modellkort slettes sammen med den, og at det ikke kan angres» | testet |
| 3. Fokus på «Avbryt», Esc, ingenting er slettet | FR-12, UX-DR21, UX-DR22 | «Steg 3 – FR-12, UX-DR21, UX-DR22: fokus står på «Avbryt», hun trykker Esc, og ingenting er slettet» | testet |
| 4. «Erstatt» og ny fil, bekreftelsen sier hva som slettes (18 flashcards, 11 quizspørsmål og 2 modellkort) | FR-13, UX-DR21, UX-DR22 | «Steg 4 – FR-13, UX-DR21, UX-DR22: «Erstatt» og den nye fila, bekreftelsen sier hva som slettes» | testet |
| 5. Bekrefter, den nye fila står i lista, og tallene i «Lag og øv» viser hva som er igjen (1 kort og 1 spørsmål, ingen modellkort) | FR-13, FR-16, FR-42, UX-DR16, UX-DR18 | «Steg 5 – FR-13, FR-16, FR-42, UX-DR16, UX-DR18: hun bekrefter, den nye fila står i lista, og tallene for flashcards, modellkort og quiz i «Lag og øv» viser hva som er igjen» | testet |

## Flyt 4 – Klara avslutter etter semesteret (FR-3, FR-5)

Fil: [`flyt-4-avslutter-etter-semesteret.spec.ts`](../../frontend/e2e/brukerreiser/flyt-4-avslutter-etter-semesteret.spec.ts), `describe`: «FR-3, FR-5 / flyt 4: Klara avslutter etter semesteret». Forutsetningen lages gjennom API-et: en konto med godtatte vilkår og nøyaktig det flyten nevner, 3 emner, 15 forelesninger og 18 filer. Hele flyten er testet fra start til slutt.

| Steg | Krav-ID-er | Test | Status |
|---|---|---|---|
| 1. «Konto» i toppfeltet åpner kontosiden (15) | FR-3, UX-DR6, UX-DR39 | «Steg 1 – FR-3, UX-DR6, UX-DR39: «Konto» i toppfeltet åpner kontosiden (15)» | testet |
| 2. E-posten, vilkårene godtatt og demomodus | FR-11, NFR-2, UX-DR39 | «Steg 2 – FR-11, NFR-2, UX-DR39: hun ser e-posten, at vilkårene ble godtatt før første opplasting, og demomodus» | testet |
| 3. «Slett kontoen» viser hva som slettes og hvor mye hun har | FR-5, UX-DR39 | «Steg 3 – FR-5, UX-DR39: under «Slett kontoen» står det hva som slettes og hvor mye hun har» | testet |
| 4. «Slett kontoen …» åpner bekreftelsen med «Avbryt» som startfokus | FR-5, UX-DR21, UX-DR22 | «Steg 4 – FR-5, UX-DR21, UX-DR22: «Slett kontoen …» åpner bekreftelsen med «Avbryt» som startfokus» | testet |
| Feilvei: hun avbryter, ingenting slettes | FR-5, UX-DR22 | «Feilvei – FR-5, UX-DR22: hun avbryter, og ingenting slettes» | testet |
| 5. Bekrefter: alt er slettet, og hun er tilbake på innloggingen (01) | FR-5, UX-DR40 | «Steg 5 – FR-5, UX-DR40: hun bekrefter, alt er slettet for godt, og hun er tilbake på innloggingen (01)» | testet |

Steg 3 og 4 sjekker teksten «Alle emner, filer og alt generert innhold slettes for godt: flashcards, quizspørsmål, modellkort og fritekstspørsmål.». Fra story 3.7 er flashcards meldt inn i telleregisteret, fra story 4.1 quizspørsmål, fra story 7.1 modellkort og fra story 8.1 fritekstspørsmål, så kontosiden og bekreftelsen nevner alle fire.

Feilveien kjøres før steg 5, siden det ikke er noe å avbryte når kontoen er slettet. Steg 5 sjekker at innloggingen med samme e-post og passord gir feilmeldingen, og at en ny konto med samme e-post er tom.

## Det epic 1 har bygd som ingen flyt viser

«Fant ikke siden» (FR-4, UX-DR41) og meldingen «Du er logget ut. Logg inn igjen.» når innloggingen er utløpt (UX-DR40) er ikke steg i noen av de fire flytene. De er derfor ikke lagt inn her, men testes i [`frontend/e2e/innlogget.spec.ts`](../../frontend/e2e/innlogget.spec.ts). Det samme gjelder feilmeldingene ved registrering og innlogging, som testes i [`opprett-konto.spec.ts`](../../frontend/e2e/opprett-konto.spec.ts) og [`logg-inn.spec.ts`](../../frontend/e2e/logg-inn.spec.ts).

## Det epic 2 har bygd som ingen flyt viser

Disse delene av epic 2 er ikke steg i noen av de fire flytene, og testes derfor bare i de vanlige Playwright-testene:

- nytt navn og ny eksamensdato på et emne ([`emner.spec.ts`](../../frontend/e2e/emner.spec.ts)), og nytt navn og ny dato på en forelesning ([`forelesninger.spec.ts`](../../frontend/e2e/forelesninger.spec.ts))
- sletting av en forelesning og et emne ([`slett.spec.ts`](../../frontend/e2e/slett.spec.ts))
- avvisning av en fil over størrelsesgrensen ([`filer.spec.ts`](../../frontend/e2e/filer.spec.ts)) og av en PDF som ikke kan åpnes (backend-testene)
- en ikke-PDF som erstatning ([`erstatt.spec.ts`](../../frontend/e2e/erstatt.spec.ts))
- «Les vilkårene» og «Logg ut» på kontosiden ([`konto.spec.ts`](../../frontend/e2e/konto.spec.ts))

## Det epic 3 har bygd som ingen flyt viser

Disse delene av epic 3 er ikke steg i noen av de fire flytene, og testes derfor bare i de vanlige Playwright-testene:

- omfangene «Rask» og «Dyp», «Lag flere», meldingen når notatene ikke gir noen kort, og ferdigmeldingen når hun er på en annen side ([`flashcards.spec.ts`](../../frontend/e2e/flashcards.spec.ts))
- økten med bare Tab og Enter, og siden «Det finnes ingen flashcards her ennå.» ([`flashcard-okt.spec.ts`](../../frontend/e2e/flashcard-okt.spec.ts))
- hurtigtastdialogen («?»), bryteren som skrur av enkelttastene, og økten på 768 px med panelet bak «Meny» ([`hurtigtaster-og-smal-skjerm.spec.ts`](../../frontend/e2e/hurtigtaster-og-smal-skjerm.spec.ts))
- «Øv igjen», «Avslutt økt», lagring når hun går til en annen side eller logger ut, og at samme økt bare lagres én gang ([`lagre-okt.spec.ts`](../../frontend/e2e/lagre-okt.spec.ts))
- et emne uten kort, og Esc i økten for hele emnet ([`hele-emnet.spec.ts`](../../frontend/e2e/hele-emnet.spec.ts))
- tomt felt i «Rediger kortet», og sperren mot å slette en fil mens det lages innhold ([`rett-og-slett-kort.spec.ts`](../../frontend/e2e/rett-og-slett-kort.spec.ts))

## Det epic 4 har bygd som ingen flyt viser

Disse delene av epic 4 er ikke steg i noen av de fire flytene, og testes derfor bare i de vanlige Playwright-testene:

- «Lag quiz» med bare tastaturet, piltastene i dialogen og vanskelighetsgraden «Vanskelig» ([`quiz.spec.ts`](../../frontend/e2e/quiz.spec.ts))
- quizøkten uten hurtigtaster, Esc uten bekreftet svar, og en holdt Enter ([`quiz-okt.spec.ts`](../../frontend/e2e/quiz-okt.spec.ts))
- «Ta quizen igjen», alle riktige uten liste, og resultatsiden på 768 px ([`quiz-resultat.spec.ts`](../../frontend/e2e/quiz-resultat.spec.ts))
- Esc og avbrutt quiz på hele emnet, og et emne med både kort og quiz ([`quiz-hele-emnet.spec.ts`](../../frontend/e2e/quiz-hele-emnet.spec.ts))
- sletting av et spørsmål før svaret er bekreftet, «Avbryt» og Esc i dialogen, og dialogen på 768 px ([`slett-quizsporsmal.spec.ts`](../../frontend/e2e/slett-quizsporsmal.spec.ts))

## Det epic 5 har bygd som ingen flyt viser

Disse delene av epic 5 er ikke steg i noen av de fire flytene, og testes derfor bare i de vanlige Playwright-testene eller i enhetstestene:

- semesterlinja på forelesningssiden (04) med «Du er her», ukenummer og dato under stasjonene på 03, etiketter som tynnes ut, og linja på 768 px og ved 200 % zoom ([`semesterlinje.spec.ts`](../../frontend/e2e/semesterlinje.spec.ts))
- tiden til eksamen når det er dager igjen, i morgen, i dag eller passert (enhetstestene i [`lib/exam.test.ts`](../../frontend/lib/exam.test.ts))
- NESTE STEG «Lag flashcards» og «Øv nå» på en forelesning med bare quiz ([`emnekort.spec.ts`](../../frontend/e2e/emnekort.spec.ts)), «Last opp PDF» og «sist øvd dd.mm» når alt er øvd (enhetstestene i [`next-step.test.ts`](../../frontend/modules/subjects/next-step.test.ts)), og feilmeldingen i emnekortet ([`home-page.test.tsx`](../../frontend/modules/subjects/home-page.test.tsx))
- SISTE ØKT for en avbrutt økt, og en quiz på hele emnet som ikke teller for forelesninger uten quiz ([`ovd.spec.ts`](../../frontend/e2e/ovd.spec.ts))
- tellingene og statusen i forelesningstabellen på 768 px ([`forelesningstabell.spec.ts`](../../frontend/e2e/forelesningstabell.spec.ts))

## Det epic 7 har bygd som ingen flyt viser

Modellkortet i økten og «Endre huskeregel» er steg 4 i flyt 2, og modellkortene i tellingene er steg 2, 4 og 5 i flyt 3. Resten av epic 7 testes i de vanlige Playwright-testene eller i backend-testene:

- «Lag modellkort» på Flashcards-raden med jobbstatusen, meldingen når notatene ikke har lister, «Legg til huskeregel» på et kort uten huskeregel, tomt felt og Esc i huskeregeldialogen, og modellkort i økten for hele emnet ([`modellkort.spec.ts`](../../frontend/e2e/modellkort.spec.ts))
- «Rediger» med punktene (ett per linje) ([`edit-flashcard-dialog.test.tsx`](../../frontend/modules/practice/components/edit-flashcard-dialog.test.tsx) og backend-testene)
- huskeregelen fra forbokstavene, kort som forkastes, og bryteren `FEATURE_MNEMONICS` (backend-testene, blant annet `test_models.py` og `test_model_card_practice.py`)

## Det epic 6 har bygd som ingen flyt viser

Av epic 6 er det bare formelmerket (story 6.3) som er et steg i en flyt (feilveien i flyt 2). Resten testes andre steder:

- Gemini bak porten (story 6.1) og instruksene til modellen (story 6.2) brukes ikke i demomodus, og testene kaller aldri Gemini. De testes i backend-testene med en falsk modell.
- Formelmerket på quizspørsmål i feillista, og at tekstsider ikke får merket ([`formelmerke.spec.ts`](../../frontend/e2e/formelmerke.spec.ts)). Regelen for hvilke sider som merkes, testes i backend-testene.
- Testbrukeren og eksempelemnet (story 6.4) ([`testbruker.spec.ts`](../../frontend/e2e/testbruker.spec.ts)). Flytene lager sin egen konto, slik at de går mot en database som allerede har kontoer. Testene av testbrukeren hopper over seg selv når databasen ikke var tom da appen startet, siden testbrukeren bare lages i en tom database.
- README, lisens og testplanen (story 6.5) er dokumenter, ikke steg i appen.
- axe på alle sider i 1280 og 768 px (story 6.6) ([`universell-utforming.spec.ts`](../../frontend/e2e/universell-utforming.spec.ts)). Flyttestene kjører i tillegg axe på hver side de besøker, som før.
