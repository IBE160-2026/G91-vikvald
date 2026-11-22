# Brukerreisene testet med Playwright

Denne oversikten viser hvilke steg i de fire flytene i [EXPERIENCE.md](../../_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/EXPERIENCE.md#brukerreiser-key-flows) som har en automatisk test. Testene ligger i [`frontend/e2e/brukerreiser/`](../../frontend/e2e/brukerreiser/), én fil per flyt. De går i nettleseren i demomodus mot appen startet med `docker compose up --build`, og kjører axe (automatisk test av universell utforming) på hver side de besøker.

Kjør dem slik, i `frontend/`, mens appen kjører:

```
npx playwright test e2e/brukerreiser
```

**Sist oppdatert:** etter epic 3 (flashcards i demomodus med omfang og meldinger, økten for én forelesning og for hele emnet med hurtigtaster, lagret økt og resultatsiden, rette og slette kort, og flashcards i slettetellingene). Før det: epic 2 (emner, forelesninger og sidemenyen, opplasting av PDF med avvisninger, vilkårsdialogen, sletting og erstatning av filer, og kontosiden). Flyt 4 er testet fra start til slutt. Flyt 3 er testet fra start til slutt, med flashcards i tellingene. Det som gjenstår i flyt 3, er quizspørsmål (epic 4) og modellkort (epic 7) i tellingene (#131). I flyt 1 og 2 er alt med flashcards testet. Quiz, semesterlinjen, status «Øvd», modellkort, fritekst og sammendrag er ikke bygd ennå.

**Slik leses tabellene**

- **Steg** er nummeret og teksten fra flyten i EXPERIENCE.md. Når bare en del av et steg er bygd, står steget på to rader: delen som er testet, og delen som ikke er bygd ennå.
- **Krav-ID-er** er kravene steget viser, fra EXPERIENCE.md, PRD-en og [epics.md](../../_bmad-output/planning-artifacts/epics.md). De samme ID-ene står i testnavnet.
- **Test** er fila og testnavnet. For steg som ikke er bygd, står storien som skal bygge dem.
- **Status** er `testet`, `ikke bygd ennå` eller `kuttet` med issue-nummer. Ingen steg er kuttet.
- **Forutsetning** er noe flyten tar for gitt før første steg, for eksempel at Klara har en konto. I flyt 1 lages forutsetningene i nettleseren. I flyt 2, 3 og 4 lages de gjennom API-et før testen starter (konto, godtatte vilkår, emner, forelesninger og PDF-er), siden flytene starter midt i semesteret og ikke har noe eget innloggingssteg.
- **PDF-ene** lager testen selv med [`e2e/pdf.ts`](../../frontend/e2e/pdf.ts). Ingen ekte notater brukes. Demomodellen lager ett flashcard per definisjonssetning («X er …»), så PDF-ene har korte definisjoner, høyst tre per side.
- **Flashcards** lages i nettleseren i flyt 1, slik Klara gjør det. I flyt 2 og 3 lages de gjennom API-et før testen starter, som en del av forutsetningen.

Stegene i hver testfil kjøres i rekkefølge i samme nettleser, som ett besøk av Klara. Feiler ett steg, hoppes resten over.

## Flyt 1 – UJ-1: Klara etter en forelesning

Fil: [`flyt-1-etter-forelesning.spec.ts`](../../frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts), `describe`: «UJ-1 / flyt 1: Klara etter en forelesning».

| Steg | Krav-ID-er | Test | Status |
|---|---|---|---|
| Forutsetning for 1: Klara har en konto | FR-3, UX-DR40 | «Forutsetning for steg 1 – FR-3, UX-DR40: Klara oppretter konto første gang» | testet |
| 1. Klara åpner Studiekamerat og logger inn (01) | UJ-1, FR-3, UX-DR40 | «Steg 1 – FR-3, UX-DR40: Klara åpner Studiekamerat og logger inn (01)» | testet |
| 2. Forsiden (02) vises | FR-3, UX-DR6, UX-DR45 | «Steg 2 (forsiden) – FR-3, UX-DR6, UX-DR45: forsiden «Dine emner» (02) med toppfelt» | testet |
| Forutsetning for 2: Klara har emnet Markedsføring | FR-6, UX-DR15, UX-DR21 | «Forutsetning for steg 2 – FR-6, UX-DR15, UX-DR21: Klara oppretter emnet Markedsføring med eksamensdato» | testet |
| 2. Hun åpner Markedsføring fra forsiden | FR-6 | «Steg 2 (åpner emnet) – FR-6: forsiden (02) viser Markedsføring med eksamen, og hun åpner emnet» | testet |
| 2. Forsiden viser semesterlinjen og tiden til eksamen, og emnet åpnes med knappen «Åpne» | FR-57, UX-DR11, UX-DR12 | – (story 5.3, 5.4, 5.5) | ikke bygd ennå |
| 3. «Ny forelesning» på emnesiden (03), dagens dato, til forelesningssiden (04) | FR-7, FR-15, UX-DR25 | «Steg 3 – FR-7, FR-15, UX-DR25: «Ny forelesning» på emnesiden (03) med dagens dato, til forelesningssiden (04)» | testet |
| 4. Drar PDF-en inn, vilkårsdialogen (05) første gang, «Godta og last opp» | FR-8, FR-11, NFR-6, UX-DR17, UX-DR23 | «Steg 4 – FR-8, FR-11, NFR-6, UX-DR17, UX-DR23: hun drar PDF-en inn, vilkårsdialogen (05) åpnes første gang, «Godta og last opp»» | testet |
| 5. Fila står i fillista med antall sider | FR-8, UX-DR16 | «Steg 5 (fila) – FR-8, UX-DR16: fila står i fillista med antall sider» | testet |
| 5. Hun logger ut | FR-3, UX-DR6, UX-DR40 | «Steg 5 (logg ut) – FR-3, UX-DR6, UX-DR40: Klara logger ut uten bekreftelse og kommer til innloggingen (01)» | testet |
| 6. Noen dager senere åpner hun forelesningen fra sidemenyen | FR-3, FR-7, UX-DR7 | «Steg 6 (sidemenyen) – FR-3, FR-7, UX-DR7: noen dager senere logger hun inn og åpner forelesningen fra sidemenyen» | testet |
| 6. «Lag flashcards», hun velger «Vanlig», og jobbstatusen viser at kortene lages | FR-17, NFR-17, UX-DR18, UX-DR19, UX-DR24 | «Steg 6 (lag flashcards) – FR-17, NFR-17, UX-DR18, UX-DR19, UX-DR24: «Lag flashcards», hun velger «Vanlig», og jobbstatusen viser at kortene lages» | testet |
| 6. «Lag quiz» venter til kortene er ferdige, så «Lag quiz» (06) med «Vanlig» og «Middels» | FR-28, UX-DR18 | – (story 4.1) | ikke bygd ennå |
| 7. «Øv nå» på flashcards (07), Mellomrom snur, `1`/`2`, «Kunne ikke»-kort kommer igjen | FR-23, FR-24, FR-25, NFR-8, UX-DR27, UX-DR31, UX-DR32 | «Steg 7 – FR-23, FR-24, FR-25, NFR-8, UX-DR27, UX-DR31, UX-DR32: «Øv nå» starter kortøkten (07), Mellomrom snur, 1 og 2 markerer, og kortet hun ikke kunne, kommer igjen» | testet |
| 7. Hun øver mens quizen lages | FR-28, NFR-17 | – (story 4.1) | ikke bygd ennå |
| 8. Økten er ferdig (08): «Kunne» og «Kunne ikke» med liste og kilde, og hun går tilbake til forelesningen | FR-26, FR-56, UX-DR34, UX-DR35 | «Steg 8 – FR-26, FR-56, UX-DR34, UX-DR35: økten er ferdig (08) med «Kunne» og «Kunne ikke», lista med kilde, og hun går tilbake til forelesningen» | testet |
| 9. «Øv nå» på Quiz-raden (09), `A`–`D` og Enter, riktig svar og forklaring med kilde | FR-32, FR-34, FR-35, UX-DR29 | – (story 4.2) | ikke bygd ennå |
| 10. Resultatsiden (10) med poengsum og feilsvar med kilde | FR-36, UX-DR34, UX-DR35 | – (story 4.3) | ikke bygd ennå |
| 11. «Lag sammendrag», leser det (13) med kilde på hvert punkt | FR-53, FR-54, UX-DR38 | – (epic 9) | ikke bygd ennå |
| Feilvei: Word-fil avvises | FR-9, UX-DR42 | «Feilvei – FR-9, UX-DR42: hun drar inn en Word-fil, og den avvises med beskjed om å lagre som PDF» | testet |
| Feilvei: skannet PDF uten lesbar tekst | FR-10, UX-DR42 | «Feilvei – FR-10, UX-DR42: en skannet PDF uten lesbar tekst avvises» | testet |
| Feilvei: fil over 50 sider | NFR-16, UX-DR42 | «Feilvei – NFR-16, UX-DR42: en fil over 50 sider avvises med beskjed om grensen» | testet |
| Feilvei: genereringen feiler, «Prøv igjen», ingenting halvferdig er lagret | FR-21, UX-DR19 | «Feilvei – FR-21, UX-DR19: genereringen feiler, raden viser meldingen og «Prøv igjen», og ingenting halvferdig er lagret» | testet |
| Feilvei: færre kort enn valgt | FR-18, UX-DR42 | «Feilvei – FR-18, UX-DR42: notatene gir grunnlag for færre kort enn valgt, og hun får beskjed om hvor mange som ble laget» | testet |

Notatene i flyt 1 har tre definisjoner, så «Vanlig» (inntil 20 kort) gir 3 kort. Feilveien «færre kort enn valgt» kommer derfor rett etter steg 6, slik den ville gjort for Klara. Testene kjøres i denne rekkefølgen: steg 1–8, så feilveiene for opplasting, og til slutt feilveien for generering.

To steder holder testen igjen eller bytter ut et svar fra API-et, fordi demomodellen er for rask eller aldri feiler:

- **Jobbstatusen i steg 6:** En jobb i demomodus er ferdig på rundt ett sekund. Svaret på «start jobben» holdes igjen til testen har sett «Lager flashcards …». Jobben går på serveren imens.
- **Genereringen feiler:** Demomodellen feiler aldri. Svaret om siste jobb byttes ut med en feilet jobb, som i [`flashcards.spec.ts`](../../frontend/e2e/flashcards.spec.ts). «Prøv igjen» starter så en ekte jobb med samme omfang. Den gir ingen nye kort, siden notatene er de samme.

De to andre avvisningene ved opplasting (fil over størrelsesgrensen og PDF som ikke kan åpnes) er ikke feilveier i flyt 1. De testes i [`filer.spec.ts`](../../frontend/e2e/filer.spec.ts) og i backend-testene.

## Flyt 2 – UJ-2: Klara før eksamen

Fil: [`flyt-2-for-eksamen.spec.ts`](../../frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts), `describe`: «UJ-2 / flyt 2: Klara før eksamen». Forutsetningen («Tre uker før eksamen har Klara lastet opp notater fra alle forelesningene i Markedsføring») lages gjennom API-et: emnet med eksamen om tre uker, åtte forelesninger med én PDF hver, og flashcards fra hver av dem (ett per forelesning, tre i «Uke 37: Merkevare», ti i alt).

| Steg | Krav-ID-er | Test | Status |
|---|---|---|---|
| 1. Forsiden (02) viser Markedsføring, og hun åpner emnet | UJ-2, FR-6 | «Steg 1 (åpner emnet) – UJ-2, FR-6: forsiden (02) viser Markedsføring med åtte forelesninger og eksamen, og hun åpner emnet» | testet |
| 1. Forsiden viser at eksamen er om tre uker og at fire av åtte forelesninger er øvd, og emnet åpnes med «Åpne» | FR-56, FR-57, FR-58, UX-DR11, UX-DR12 | – (story 5.1, 5.3, 5.4) | ikke bygd ennå |
| 2. Emnesiden (03) viser forelesningene med status | FR-7, FR-15, UX-DR7, UX-DR13 | «Steg 2 (forelesningene med status) – FR-7, FR-15, UX-DR7, UX-DR13: emnesiden (03) viser forelesningene etter dato med filer og status» | testet |
| 2. «Øv på flashcards» i kortet «Øv på hele emnet», og økten (07) blander kort fra alle forelesningene | FR-23, FR-24, FR-25, FR-56, UX-DR14, UX-DR34 | «Steg 2 (øver på hele emnet) – FR-23, FR-24, FR-25, FR-56, UX-DR14, UX-DR34: i kortet «Øv på hele emnet» trykker hun «Øv på flashcards», og økten (07) blander kort fra alle forelesningene» | testet |
| 2. Status «Øvd» på forelesningene | FR-56, UX-DR13 | – (story 5.1, 5.2) | ikke bygd ennå |
| 3. Quiz på hele emnet (09), kilden viser forelesningen | FR-32, FR-34, UX-DR29 | – (story 4.4) | ikke bygd ennå |
| 4. Hun åpner «Uke 37: Merkevare» (04) | FR-7, UX-DR7 | «Steg 4 (åpner forelesningen) – FR-7, UX-DR7: hun åpner «Uke 37: Merkevare» (04) med notatene» | testet |
| 4. Hun øver på flashcards fra forelesningen (07) | FR-23, FR-24, UX-DR9, UX-DR27 | «Steg 4 (øver på flashcards) – FR-23, FR-24, UX-DR9, UX-DR27: hun øver på flashcards fra forelesningen (07)» | testet |
| 4. Modellkort i flashcard-økten (11), «Endre huskeregel» | FR-42, FR-43, FR-46, UX-DR28 | – (epic 7) | ikke bygd ennå |
| 5. Fritekstspørsmål for hele emnet (12), «Vis modellsvar» | FR-48, FR-50, UX-DR30 | – (epic 8) | ikke bygd ennå |
| 6. Modellsvar med kilde, `2` for «Delvis riktig», ◐ i rutenettet | FR-49, FR-51, NFR-8, UX-DR8, UX-DR9 | – (epic 8) | ikke bygd ennå |
| 7. Resultat med riktig, delvis riktig og feil | FR-51, FR-56, UX-DR34 | – (epic 8) | ikke bygd ennå |
| Feilvei: rediger et feil kort | FR-27, UX-DR27 | «Feilvei (rediger) – FR-27, UX-DR27: et kort er faglig feil, hun sjekker kilden og retter svaret med «Rediger» i bunnfeltet» | testet |
| Feilvei: slett et feil kort | FR-27, UX-DR22 | «Feilvei (slett) – FR-27, UX-DR22: hun sletter et feil kort med «Slett», bekrefter, og kortet er borte» | testet |
| Feilvei: slett eller rediger et feil quizspørsmål | FR-37, UX-DR22 | – (story 4.5) | ikke bygd ennå |
| Feilvei: «Inneholder formel – sjekk mot kilden» | FR-41, UX-DR37 | – (story 6.3) | ikke bygd ennå |
| Feilvei: avslutter halvveis med Esc, resultatet vises og lagres | FR-56, UX-DR33 | «Feilvei (Esc) – FR-56, UX-DR33: hun avslutter økten halvveis med Esc, og resultatet for det hun har gjort, vises og lagres» | testet |

Steg 4 og feilveiene for kort og Esc kjøres i samme flashcard-økt i «Uke 37: Merkevare»: hun øver, retter ett kort, sletter ett, markerer ett og trykker Esc. Feilveiene for kort står i flyten uten et bestemt steg. De passer best i denne økten, der steg 4 også skal vise modellkortet når epic 7 er bygd.

## Flyt 3 – Klara rydder i filene (FR-12, FR-13)

Fil: [`flyt-3-rydder-i-filene.spec.ts`](../../frontend/e2e/brukerreiser/flyt-3-rydder-i-filene.spec.ts), `describe`: «FR-12, FR-13 / flyt 3: Klara rydder i filene». Forutsetningen lages gjennom API-et: en forelesning med den gamle `merkevare-notater.pdf` (6 sider) og lysarkene `merkevare-lysark.pdf`, og flashcards fra begge. Den gamle fila gir 18 flashcards, som i flyten, og lysarkene ett. Alle stegene er testet fra start til slutt. Det som står igjen, er quizspørsmål (11 i flyten, epic 4) og modellkort (2 i flyten, epic 7) i tellingene, se #131.

| Steg | Krav-ID-er | Test | Status |
|---|---|---|---|
| 1. Forelesningssiden (04) med en gammel versjon av fila | FR-8, UX-DR16 | «Steg 1 – FR-8, UX-DR16: forelesningssiden (04) viser den gamle versjonen av fila» | testet |
| 2. «Slett» på fila, dialogen (14) viser fila, at 18 flashcards slettes sammen med den, og at det ikke kan angres | FR-12, UX-DR22 | «Steg 2 – FR-12, UX-DR22: «Slett» på fila åpner dialogen (14) som viser fila, at 18 flashcards slettes sammen med den, og at det ikke kan angres» | testet |
| 2. Dialogen sier også hvor mange quizspørsmål og modellkort som slettes | FR-12, UX-DR22 | – (story 4.1, 7.1) | ikke bygd ennå |
| 3. Fokus på «Avbryt», Esc, ingenting er slettet | FR-12, UX-DR21, UX-DR22 | «Steg 3 – FR-12, UX-DR21, UX-DR22: fokus står på «Avbryt», hun trykker Esc, og ingenting er slettet» | testet |
| 4. «Erstatt» og ny fil, bekreftelsen sier hva som slettes (18 flashcards) | FR-13, UX-DR21, UX-DR22 | «Steg 4 – FR-13, UX-DR21, UX-DR22: «Erstatt» og den nye fila, bekreftelsen sier hva som slettes» | testet |
| 5. Bekrefter, den nye fila står i lista, og tallene i «Lag og øv» viser hva som er igjen (1 kort) | FR-13, FR-16, UX-DR16, UX-DR18 | «Steg 5 – FR-13, FR-16, UX-DR16, UX-DR18: hun bekrefter, den nye fila står i lista, og tallene i «Lag og øv» viser hva som er igjen» | testet |
| 5. Tallene for quiz og modellkort i «Lag og øv» | FR-13, FR-16, UX-DR18 | – (story 4.1, 7.1) | ikke bygd ennå |

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

Steg 3 og 4 sjekker teksten «Alle emner, filer og alt generert innhold slettes for godt: flashcards.». Fra story 3.7 er flashcards meldt inn i telleregisteret, så kontosiden og bekreftelsen nevner dem.

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
