# Brukerreisene testet med Playwright

Denne oversikten viser hvilke steg i de fire flytene i [EXPERIENCE.md](../../_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/EXPERIENCE.md#brukerreiser-key-flows) som har en automatisk test. Testene ligger i [`frontend/e2e/brukerreiser/`](../../frontend/e2e/brukerreiser/), én fil per flyt. De går i nettleseren i demomodus mot appen startet med `docker compose up --build`, og kjører axe (automatisk test av universell utforming) på hver side de besøker.

Kjør dem slik, i `frontend/`, mens appen kjører:

```
npx playwright test e2e/brukerreiser
```

**Sist oppdatert:** etter epic 1 (registrering, innlogging, forsiden innlogget, utlogging og «Fant ikke siden»).

**Slik leses tabellene**

- **Steg** er nummeret og teksten fra flyten i EXPERIENCE.md. Når bare en del av et steg er bygd, står steget på to rader: delen som er testet, og delen som ikke er bygd ennå.
- **Krav-ID-er** er kravene steget viser, fra EXPERIENCE.md, PRD-en og [epics.md](../../_bmad-output/planning-artifacts/epics.md). De samme ID-ene står i testnavnet.
- **Test** er fila og testnavnet. For steg som ikke er bygd, står storien som skal bygge dem.
- **Status** er `testet`, `ikke bygd ennå` eller `kuttet` med issue-nummer. Ingen steg er kuttet.

Stegene i hver testfil kjøres i rekkefølge i samme nettleser, som ett besøk av Klara. Feiler ett steg, hoppes resten over.

## Flyt 1 – UJ-1: Klara etter en forelesning

Fil: [`flyt-1-etter-forelesning.spec.ts`](../../frontend/e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts), `describe`: «UJ-1 / flyt 1: Klara etter en forelesning».

| Steg | Krav-ID-er | Test | Status |
|---|---|---|---|
| Forutsetning for 1: Klara har en konto | FR-3, UX-DR40 | «Forutsetning for steg 1 – FR-3, UX-DR40: Klara oppretter konto første gang» | testet |
| 1. Klara åpner Studiekamerat og logger inn (01) | UJ-1, FR-3, UX-DR40 | «Steg 1 – FR-3, UX-DR40: Klara åpner Studiekamerat og logger inn (01)» | testet |
| 2. Forsiden (02) vises | FR-3, UX-DR6, UX-DR45 | «Steg 2 (forsiden) – FR-3, UX-DR6, UX-DR45: forsiden «Dine emner» (02) med toppfelt» | testet |
| 2. Forsiden viser semesterlinjen og tiden til eksamen. Hun trykker «Åpne» på Markedsføring | FR-6, FR-57, UX-DR11, UX-DR12 | – (story 2.1, 5.3, 5.4, 5.5) | ikke bygd ennå |
| 3. «Ny forelesning» på emnesiden (03), dagens dato, til forelesningssiden (04) | FR-7, FR-15, UX-DR25 | – (story 2.2) | ikke bygd ennå |
| 4. Drar PDF-en inn, vilkårsdialogen (05) første gang, «Godta og last opp» | FR-8, FR-11, NFR-6, UX-DR17, UX-DR23 | – (story 2.3, 2.4) | ikke bygd ennå |
| 5. Fila står i fillista med antall sider | FR-8, UX-DR16 | – (story 2.3) | ikke bygd ennå |
| 5. Hun logger ut | FR-3, UX-DR6, UX-DR40 | «Steg 5 (logg ut) – FR-3, UX-DR6, UX-DR40: Klara logger ut uten bekreftelse og kommer til innloggingen (01)» | testet |
| 6. Åpner forelesningen fra sidemenyen, «Lag flashcards», jobbstatus, «Lag quiz» (06) | FR-17, FR-21, FR-28, NFR-17, UX-DR7, UX-DR18, UX-DR19, UX-DR24 | – (story 2.2, 3.1, 3.2, 4.1) | ikke bygd ennå |
| 7. «Øv nå» på flashcards (07), Mellomrom snur, `1`/`2`, «Kunne ikke»-kort kommer igjen | FR-23, FR-24, FR-25, NFR-8, UX-DR27, UX-DR31, UX-DR32 | – (story 3.3, 3.4) | ikke bygd ennå |
| 8. Økten er ferdig (08): «Kunne» og «Kunne ikke» med liste og kilde | FR-26, FR-56, UX-DR34, UX-DR35 | – (story 3.5) | ikke bygd ennå |
| 9. «Øv nå» på Quiz-raden (09), `A`–`D` og Enter, riktig svar og forklaring med kilde | FR-32, FR-34, FR-35, UX-DR29 | – (story 4.2) | ikke bygd ennå |
| 10. Resultatsiden (10) med poengsum og feilsvar med kilde | FR-36, UX-DR34, UX-DR35 | – (story 4.3) | ikke bygd ennå |
| 11. «Lag sammendrag», leser det (13) med kilde på hvert punkt | FR-53, FR-54, UX-DR38 | – (epic 9) | ikke bygd ennå |
| Feilvei: Word-fil avvises | FR-9, UX-DR42 | – (story 2.3) | ikke bygd ennå |
| Feilvei: skannet PDF uten lesbar tekst | FR-10, UX-DR42 | – (story 2.3) | ikke bygd ennå |
| Feilvei: fil over 50 sider | NFR-16, UX-DR42 | – (story 2.3) | ikke bygd ennå |
| Feilvei: genereringen feiler, «Prøv igjen» | FR-21, UX-DR19 | – (story 3.1) | ikke bygd ennå |
| Feilvei: færre kort enn valgt | FR-18, UX-DR42 | – (story 3.2) | ikke bygd ennå |

## Flyt 2 – UJ-2: Klara før eksamen

Fil: [`flyt-2-for-eksamen.spec.ts`](../../frontend/e2e/brukerreiser/flyt-2-for-eksamen.spec.ts), `describe`: «UJ-2 / flyt 2: Klara før eksamen». Ingen steg er bygd ennå. Flyten starter på forsiden med emner og har ikke noe eget innloggingssteg, så fila venter på epic 2–5.

| Steg | Krav-ID-er | Test | Status |
|---|---|---|---|
| 1. Forsiden (02) viser eksamen om tre uker og fire av åtte forelesninger øvd. «Åpne» på Markedsføring | UJ-2, FR-56, FR-57, FR-58, UX-DR11, UX-DR12 | – (story 5.1, 5.3, 5.4, 5.5) | ikke bygd ennå |
| 2. Emnesiden (03) med status, «Øv på flashcards» for hele emnet (07) | FR-23, UX-DR13, UX-DR14 | – (story 3.6, 5.2) | ikke bygd ennå |
| 3. Quiz på hele emnet (09), kilden viser forelesningen | FR-32, FR-34, UX-DR29 | – (story 4.4) | ikke bygd ennå |
| 4. Modellkort i flashcard-økten (11), «Endre huskeregel» | FR-42, FR-43, FR-46, UX-DR28 | – (epic 7) | ikke bygd ennå |
| 5. Fritekstspørsmål for hele emnet (12), «Vis modellsvar» | FR-48, FR-50, UX-DR30 | – (epic 8) | ikke bygd ennå |
| 6. Modellsvar med kilde, `2` for «Delvis riktig», ◐ i rutenettet | FR-49, FR-51, NFR-8, UX-DR8, UX-DR9 | – (epic 8) | ikke bygd ennå |
| 7. Resultat med riktig, delvis riktig og feil | FR-51, FR-56, UX-DR34 | – (epic 8) | ikke bygd ennå |
| Feilvei: slett eller rediger et feil kort | FR-27, FR-37, UX-DR22 | – (story 3.7, 4.5) | ikke bygd ennå |
| Feilvei: «Inneholder formel – sjekk mot kilden» | FR-41, UX-DR37 | – (story 6.3) | ikke bygd ennå |
| Feilvei: avslutter halvveis med Esc, resultatet lagres | FR-56, UX-DR33 | – (story 3.5) | ikke bygd ennå |

## Flyt 3 – Klara rydder i filene (FR-12, FR-13)

Fil: [`flyt-3-rydder-i-filene.spec.ts`](../../frontend/e2e/brukerreiser/flyt-3-rydder-i-filene.spec.ts), `describe`: «FR-12, FR-13 / flyt 3: Klara rydder i filene». Ingen steg er bygd ennå. Flyten starter på forelesningssiden (04) og har ikke noe eget innloggingssteg, så fila venter på epic 2.

| Steg | Krav-ID-er | Test | Status |
|---|---|---|---|
| 1. Forelesningssiden (04) med en gammel versjon av fila | FR-8, UX-DR16 | – (story 2.3) | ikke bygd ennå |
| 2. «Slett» på fila, dialogen (14) viser hva som slettes sammen med den | FR-12, UX-DR22 | – (story 2.5) | ikke bygd ennå |
| 3. Fokus på «Avbryt», Esc, ingenting er slettet | FR-12, UX-DR21, UX-DR22 | – (story 2.5) | ikke bygd ennå |
| 4. «Erstatt» og ny fil, bekreftelsen sier hva som slettes | FR-13, UX-DR22 | – (story 2.6) | ikke bygd ennå |
| 5. Bekrefter, den nye fila står i lista, tallene i «Lag og øv» viser hva som er igjen | FR-13, FR-16, UX-DR18 | – (story 2.6) | ikke bygd ennå |

## Flyt 4 – Klara avslutter etter semesteret (FR-3, FR-5)

Fil: [`flyt-4-avslutter-etter-semesteret.spec.ts`](../../frontend/e2e/brukerreiser/flyt-4-avslutter-etter-semesteret.spec.ts), `describe`: «FR-3, FR-5 / flyt 4: Klara avslutter etter semesteret». Ingen steg er bygd ennå. Flyten starter med kontosiden (15) og har ikke noe eget innloggingssteg, så fila venter på story 2.7. Lenken «Konto» i toppfeltet finnes allerede, men `/konto` gir «Fant ikke siden» til kontosiden er bygd (#62).

| Steg | Krav-ID-er | Test | Status |
|---|---|---|---|
| 1. «Konto» i toppfeltet åpner kontosiden (15) | FR-3, UX-DR6, UX-DR39 | – (story 2.7) | ikke bygd ennå |
| 2. E-posten, vilkårene godtatt og demomodus | FR-11, NFR-2, UX-DR39 | – (story 2.7) | ikke bygd ennå |
| 3. «Slett kontoen» viser hva som slettes og hvor mye hun har | FR-5, UX-DR39 | – (story 2.7) | ikke bygd ennå |
| 4. «Slett kontoen …» åpner bekreftelsen med «Avbryt» som startfokus | FR-5, UX-DR21, UX-DR22 | – (story 2.7) | ikke bygd ennå |
| 5. Bekrefter: alt er slettet, og hun er tilbake på innloggingen (01) | FR-5 | – (story 2.7) | ikke bygd ennå |
| Feilvei: hun avbryter, ingenting slettes | FR-5, UX-DR22 | – (story 2.7) | ikke bygd ennå |

## Det epic 1 har bygd som ingen flyt viser

«Fant ikke siden» (FR-4, UX-DR41) og meldingen «Du er logget ut. Logg inn igjen.» når innloggingen er utløpt (UX-DR40) er ikke steg i noen av de fire flytene. De er derfor ikke lagt inn her, men testes i [`frontend/e2e/innlogget.spec.ts`](../../frontend/e2e/innlogget.spec.ts). Det samme gjelder feilmeldingene ved registrering og innlogging, som testes i [`opprett-konto.spec.ts`](../../frontend/e2e/opprett-konto.spec.ts) og [`logg-inn.spec.ts`](../../frontend/e2e/logg-inn.spec.ts).
