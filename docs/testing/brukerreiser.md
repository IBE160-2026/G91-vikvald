# Brukerreisene testet med Playwright

Denne oversikten viser hvilke steg i de fire flytene i [EXPERIENCE.md](../../_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/EXPERIENCE.md#brukerreiser-key-flows) som har en automatisk test. Testene ligger i [`frontend/e2e/brukerreiser/`](../../frontend/e2e/brukerreiser/), én fil per flyt. De går i nettleseren i demomodus mot appen startet med `docker compose up --build`, og kjører axe (automatisk test av universell utforming) på hver side de besøker.

Kjør dem slik, i `frontend/`, mens appen kjører:

```
npx playwright test e2e/brukerreiser
```

**Sist oppdatert:** etter epic 2 (emner, forelesninger og sidemenyen, opplasting av PDF med avvisninger, vilkårsdialogen, sletting og erstatning av filer, og kontosiden med sletting av kontoen). Flyt 4 er testet fra start til slutt. Flyt 3 er testet fra start til slutt med det epic 2 har bygd. Det som gjenstår i flyt 3, er tellingene av generert innhold, som kommer med epic 3, 4 og 7.

**Slik leses tabellene**

- **Steg** er nummeret og teksten fra flyten i EXPERIENCE.md. Når bare en del av et steg er bygd, står steget på to rader: delen som er testet, og delen som ikke er bygd ennå.
- **Krav-ID-er** er kravene steget viser, fra EXPERIENCE.md, PRD-en og [epics.md](../../_bmad-output/planning-artifacts/epics.md). De samme ID-ene står i testnavnet.
- **Test** er fila og testnavnet. For steg som ikke er bygd, står storien som skal bygge dem.
- **Status** er `testet`, `ikke bygd ennå` eller `kuttet` med issue-nummer. Ingen steg er kuttet.
- **Forutsetning** er noe flyten tar for gitt før første steg, for eksempel at Klara har en konto. I flyt 1 lages forutsetningene i nettleseren. I flyt 2, 3 og 4 lages de gjennom API-et før testen starter (konto, godtatte vilkår, emner, forelesninger og PDF-er), siden flytene starter midt i semesteret og ikke har noe eget innloggingssteg.
- **PDF-ene** lager testen selv med [`e2e/pdf.ts`](../../frontend/e2e/pdf.ts). Ingen ekte notater brukes.

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
| 6. «Lag flashcards», jobbstatus, «Lag quiz» (06) | FR-17, FR-21, FR-28, NFR-17, UX-DR18, UX-DR19, UX-DR24 | – (story 3.1, 3.2, 4.1) | ikke bygd ennå |
| 7. «Øv nå» på flashcards (07), Mellomrom snur, `1`/`2`, «Kunne ikke»-kort kommer igjen | FR-23, FR-24, FR-25, NFR-8, UX-DR27, UX-DR31, UX-DR32 | – (story 3.3, 3.4) | ikke bygd ennå |
| 8. Økten er ferdig (08): «Kunne» og «Kunne ikke» med liste og kilde | FR-26, FR-56, UX-DR34, UX-DR35 | – (story 3.5) | ikke bygd ennå |
| 9. «Øv nå» på Quiz-raden (09), `A`–`D` og Enter, riktig svar og forklaring med kilde | FR-32, FR-34, FR-35, UX-DR29 | – (story 4.2) | ikke bygd ennå |
| 10. Resultatsiden (10) med poengsum og feilsvar med kilde | FR-36, UX-DR34, UX-DR35 | – (story 4.3) | ikke bygd ennå |
| 11. «Lag sammendrag», leser det (13) med kilde på hvert punkt | FR-53, FR-54, UX-DR38 | – (epic 9) | ikke bygd ennå |
| Feilvei: Word-fil avvises | FR-9, UX-DR42 | «Feilvei – FR-9, UX-DR42: hun drar inn en Word-fil, og den avvises med beskjed om å lagre som PDF» | testet |
| Feilvei: skannet PDF uten lesbar tekst | FR-10, UX-DR42 | «Feilvei – FR-10, UX-DR42: en skannet PDF uten lesbar tekst avvises» | testet |
| Feilvei: fil over 50 sider | NFR-16, UX-DR42 | «Feilvei – NFR-16, UX-DR42: en fil over 50 sider avvises med beskjed om grensen» | testet |
| Feilvei: genereringen feiler, «Prøv igjen» | FR-21, UX-DR19 | – (story 3.2) | ikke bygd ennå |
| Feilvei: færre kort enn valgt | FR-18, UX-DR42 | – (story 3.2) | ikke bygd ennå |

De to andre avvisningene ved opplasting (fil over størrelsesgrensen og PDF som ikke kan åpnes) er ikke feilveier i flyt 1. De testes i [`filer.spec.ts`](../../frontend/e2e/filer.spec.ts) og i backend-testene.

## Flyt 2 – UJ-2: Klara før eksamen

Fil: [`flyt-2-for-eksamen.spec.ts`](../../frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts), `describe`: «UJ-2 / flyt 2: Klara før eksamen». Forutsetningen («Tre uker før eksamen har Klara lastet opp notater fra alle forelesningene i Markedsføring») lages gjennom API-et: emnet med eksamen om tre uker og åtte forelesninger med én PDF hver.

| Steg | Krav-ID-er | Test | Status |
|---|---|---|---|
| 1. Forsiden (02) viser Markedsføring, og hun åpner emnet | UJ-2, FR-6 | «Steg 1 (åpner emnet) – UJ-2, FR-6: forsiden (02) viser Markedsføring med åtte forelesninger og eksamen, og hun åpner emnet» | testet |
| 1. Forsiden viser at eksamen er om tre uker og at fire av åtte forelesninger er øvd, og emnet åpnes med «Åpne» | FR-56, FR-57, FR-58, UX-DR11, UX-DR12 | – (story 5.1, 5.3, 5.4) | ikke bygd ennå |
| 2. Emnesiden (03) viser forelesningene med status | FR-7, FR-15, UX-DR7, UX-DR13 | «Steg 2 (forelesningene med status) – FR-7, FR-15, UX-DR7, UX-DR13: emnesiden (03) viser forelesningene etter dato med filer og status» | testet |
| 2. Status «Øvd» og «Øv på flashcards» i kortet «Øv på hele emnet» (07) | FR-23, FR-56, UX-DR13, UX-DR14 | – (story 3.6, 5.1, 5.2) | ikke bygd ennå |
| 3. Quiz på hele emnet (09), kilden viser forelesningen | FR-32, FR-34, UX-DR29 | – (story 4.4) | ikke bygd ennå |
| 4. Hun åpner «Uke 37: Merkevare» (04) | FR-7, UX-DR7 | «Steg 4 (åpner forelesningen) – FR-7, UX-DR7: hun åpner «Uke 37: Merkevare» (04) med notatene» | testet |
| 4. Modellkort i flashcard-økten (11), «Endre huskeregel» | FR-42, FR-43, FR-46, UX-DR28 | – (epic 7) | ikke bygd ennå |
| 5. Fritekstspørsmål for hele emnet (12), «Vis modellsvar» | FR-48, FR-50, UX-DR30 | – (epic 8) | ikke bygd ennå |
| 6. Modellsvar med kilde, `2` for «Delvis riktig», ◐ i rutenettet | FR-49, FR-51, NFR-8, UX-DR8, UX-DR9 | – (epic 8) | ikke bygd ennå |
| 7. Resultat med riktig, delvis riktig og feil | FR-51, FR-56, UX-DR34 | – (epic 8) | ikke bygd ennå |
| Feilvei: slett eller rediger et feil kort | FR-27, FR-37, UX-DR22 | – (story 3.7, 4.5) | ikke bygd ennå |
| Feilvei: «Inneholder formel – sjekk mot kilden» | FR-41, UX-DR37 | – (story 6.3) | ikke bygd ennå |
| Feilvei: avslutter halvveis med Esc, resultatet lagres | FR-56, UX-DR33 | – (story 3.4, 3.5) | ikke bygd ennå |

## Flyt 3 – Klara rydder i filene (FR-12, FR-13)

Fil: [`flyt-3-rydder-i-filene.spec.ts`](../../frontend/e2e/brukerreiser/flyt-3-rydder-i-filene.spec.ts), `describe`: «FR-12, FR-13 / flyt 3: Klara rydder i filene». Forutsetningen lages gjennom API-et: en forelesning med den gamle `merkevare-notater.pdf` (2 sider) og en fil til. Alle stegene er testet fra start til slutt. Det som står igjen, er tallene for generert innhold: før epic 3 finnes det ikke flashcards, quizspørsmål eller modellkort, så dialogene har ingen «Dette sletter også …», og «Lag og øv» finnes ikke ennå.

| Steg | Krav-ID-er | Test | Status |
|---|---|---|---|
| 1. Forelesningssiden (04) med en gammel versjon av fila | FR-8, UX-DR16 | «Steg 1 – FR-8, UX-DR16: forelesningssiden (04) viser den gamle versjonen av fila» | testet |
| 2. «Slett» på fila, dialogen (14) viser fila og at det ikke kan angres | FR-12, UX-DR22 | «Steg 2 – FR-12, UX-DR22: «Slett» på fila åpner dialogen (14) som viser fila og at det ikke kan angres» | testet |
| 2. Dialogen sier hvor mange flashcards, quizspørsmål og modellkort som slettes sammen med fila | FR-12, UX-DR22 | – (story 3.7, 4.1, 7.1) | ikke bygd ennå |
| 3. Fokus på «Avbryt», Esc, ingenting er slettet | FR-12, UX-DR21, UX-DR22 | «Steg 3 – FR-12, UX-DR21, UX-DR22: fokus står på «Avbryt», hun trykker Esc, og ingenting er slettet» | testet |
| 4. «Erstatt» og ny fil, bekreftelsen sier hva som slettes | FR-13, UX-DR21, UX-DR22 | «Steg 4 – FR-13, UX-DR21, UX-DR22: «Erstatt» og den nye fila, bekreftelsen sier hva som slettes» | testet |
| 5. Bekrefter, den nye fila står i lista | FR-13, UX-DR16 | «Steg 5 – FR-13, UX-DR16: hun bekrefter, den gamle fila er borte og den nye står i lista» | testet |
| 5. Tallene i «Lag og øv» viser hva som er igjen | FR-13, FR-16, UX-DR18 | – (story 3.1) | ikke bygd ennå |

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
