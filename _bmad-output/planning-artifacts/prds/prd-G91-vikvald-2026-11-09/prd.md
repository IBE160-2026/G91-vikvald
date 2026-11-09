---
title: PRD – G91-vikvald
status: draft
created: 2026-11-09
updated: 2026-11-09
---

# PRD – G91-vikvald

## Brukerreiser

### UJ-1: Klara etter en forelesning

Klara studerer markedsføring og skriver egne notater i forelesningene. Hun gjentar dette hver uke gjennom semesteret.

1. Etter forelesningen åpner Klara Studiekamerat og laster opp notatene sine til forelesningen i emnet Markedsføring. Mer orker hun ikke akkurat da.
2. Noen dager senere lager hun flashcards og en flervalgsquiz fra forelesningen. Hun svarer før fasiten vises, og ser hva som sitter og hva hun har glemt. Å vente noen dager gir bedre læring enn å øve med en gang.
3. Hun leser sammendraget som er laget ut fra notatene.

### UJ-2: Klara før eksamen

Noen uker før eksamen har Klara lastet opp notater fra alle forelesningene.

1. Hun samler flashcardene og quizspørsmålene fra alle forelesningene i emnet og går gjennom dem.
2. Hun bruker huskeregler for å lære modeller og lister som må pugges.
3. Hun svarer på kortsvars- og langsvarsspørsmål og forklarer modeller. Etter hvert svar ser hun et modellsvar med kilde, og vurderer selv hvor godt hun svarte.

## Funksjoner og krav

### 3. Emner, forelesninger og opplasting

Studenten organiserer stoffet per emne og forelesning, slik at det er samlet når eksamen nærmer seg (UJ-1, UJ-2).

- **FR-1** Studenten kan opprette, gi nytt navn til og slette emner.
- **FR-2** Studenten kan opprette, gi nytt navn til og slette forelesninger i et emne.
- **FR-3** Studenten kan laste opp én eller flere PDF-filer til en forelesning.
- **FR-4** Laster studenten opp en Word-fil eller en annen filtype som ikke støttes, avvises filen med en beskjed om hvilke formater som støttes og hvordan et Word-dokument lagres som PDF.
- **FR-5** Har en PDF ingen lesbar tekst, for eksempel et skannet dokument, får studenten beskjed om det i stedet for tomt eller feil innhold.
- **FR-6** Før studenten laster opp sin første fil, må hun godta en vilkårstekst om at hun er ansvarlig for materialet hun laster opp, og at det skal være egne notater eller materiale hun har rett til å bruke.
- **FR-7** Studenten kan slette en fil. Før filen slettes, får hun en bekreftelse som sier hvor mye generert innhold (flashcards, quizspørsmål og annet) som slettes sammen med filen. Avbryter hun, slettes ingenting.
- **FR-8** Studenten kan erstatte en fil med en ny. Innhold generert fra den gamle filen slettes etter samme bekreftelse som i FR-7.
- **FR-9** Sletter studenten en forelesning eller et emne, slettes alle filer og alt generert innhold under, etter en bekreftelse som i FR-7.
- **FR-10** En forelesning har et navn og en dato. Datoen er dagens dato som standard og kan endres. Forelesningene i et emne vises sortert etter dato.
- **FR-11** For hver forelesning ser studenten antall filer og hvor mye som er generert, for eksempel antall flashcards og quizspørsmål, slik at hun ser hvilke forelesninger hun ikke har øvd på ennå. *(Kan kuttes.)*

### 4. Flashcards

Studenten tester seg selv på stoffet fra én forelesning (UJ-1) eller hele emnet (UJ-2), og ser hva hun har glemt.

*Lage kort*
- **FR-12** Studenten kan lage flashcards fra en forelesning, og velger omfang: rask gjennomgang (inntil 10 kort), vanlig gjennomgang (inntil 20) eller dyp gjennomgang (inntil 30). *(Kan kuttes: da lages inntil 20 kort uten valg.)*
- **FR-13** Kortene lages bare fra stoffet i forelesningens filer. Gir stoffet grunnlag for færre kort enn valgt, lages færre, og studenten får beskjed om det.
- **FR-14** Det finnes to typer kort: spørsmål med svar, og begrepskort med begrepet på forsiden og forklaringen på baksiden.
- **FR-15** Hvert kort viser kilden: filnavn og sidetall. Sidetallet finnes i den opplastede filen.
- **FR-16** Mens kortene lages, ser studenten at appen jobber. Feiler det, får hun en forståelig beskjed og kan prøve igjen, uten at halvferdige kort lagres.
- **FR-17** Lager studenten kort fra en forelesning som allerede har kort, legges de nye til de eksisterende.

*Øve*
- **FR-18** Studenten kan øve på kortene fra én forelesning eller fra alle forelesningene i et emne. Kortene vises i tilfeldig rekkefølge.
- **FR-19** Forsiden vises først. Baksiden vises først når studenten velger å snu kortet.
- **FR-20** Etter at kortet er snudd, markerer studenten «Kunne» eller «Kunne ikke». Kort markert «Kunne ikke» vises igjen senere i samme økt, til hun har markert dem «Kunne» eller avslutter økten.
- **FR-21** Når økten er ferdig, ser studenten hvor mange kort hun kunne og ikke kunne. *(Kan kuttes.)*

*Rette opp*
- **FR-22** Studenten kan redigere og slette enkeltkort hun selv har laget.

### 5. Flervalgsquiz

Quizen lages og brukes på samme måte som flashcardene, men studenten velger blant fire svar og får en forklaring etterpå.

*Lage quiz*
- **FR-23** Studenten kan lage quizspørsmål fra en forelesning. Hun velger omfang som for flashcards (inntil 10, 20 eller 30 spørsmål) og vanskelighetsgrad:
  - *Lett:* kjenne igjen en definisjon.
  - *Middels:* forstå sammenhenger mellom begreper.
  - *Vanskelig:* bruke stoffet på et eksempel.
- **FR-24** Spørsmålene lages bare fra stoffet i forelesningens filer, med samme regel for for lite stoff som i FR-13, og samme håndtering av venting og feil som i FR-16.
- **FR-25** Hvert spørsmål har fire svaralternativer, der nøyaktig ett er riktig. Plasseringen av det riktige svaret varierer.
- **FR-26** Hvert spørsmål viser kilden: filnavn og sidetall. Sidetallet finnes i den opplastede filen.
- **FR-27** Lager studenten spørsmål fra en forelesning som allerede har spørsmål, legges de nye til de eksisterende.

*Ta quizen*
- **FR-28** Studenten kan ta quiz på spørsmålene fra én forelesning eller fra alle forelesningene i et emne. Spørsmålene vises i tilfeldig rekkefølge.
- **FR-29** Studenten velger ett alternativ og bekrefter svaret. Først da vises riktig svar og en forklaring. Svaret kan ikke endres etterpå.
- **FR-30** Når quizen er ferdig, ser studenten poengsummen og en liste over spørsmålene hun svarte feil på, med riktig svar, forklaring og kilde. *(Listen kan kuttes; poengsummen beholdes.)*

*Rette opp*
- **FR-31** Studenten kan slette enkeltspørsmål hun selv har laget. Spørsmål kan ikke redigeres.

## Endringer fra briefen

Briefen ([brief.md](../../briefs/brief-G91-vikvald-2026-09-24/brief.md)) var utgangspunktet. Disse endringene ble gjort i PRD-arbeidet:

| Briefen sa | PRD-en sier | Begrunnelse |
|---|---|---|
| Opplasting av PDF eller tekst | Bare PDF (FR-3, FR-4) | Kilden skal vise fil og side. Word-filer og innlimt tekst har ikke faste sidetall. Notatene skrives i Word og kan lagres som PDF med ett klikk. |
| Nøkkelbegreper som egen bør ha-funksjon (nr. 7) | Begrepskort som en type flashcard (FR-14) | Brukes ikke i brukerreisene som egen visning. Som flashcard blir begrepene aktiv øving, og funksjonen krever nesten ikke ekstra arbeid. Datamodellen blir enklere. |
| Fritekstsvar med KI-tilbakemelding som første utvidelse | Fritekstspørsmål med selvvurdering som bør ha nr. 7. KI-tilbakemelding er fortsatt første utvidelse. | Brukerreisen før eksamen (UJ-2) har kortsvar, langsvar og forklaring av modeller. Selvvurdering er enkel å bygge og teste, mens KI-vurdering har usikker kvalitet. |

### 1. Norsk språk

Gjelder hele appen. Norsk fra grunnen av er en av fire ting som skiller Studiekamerat fra andre verktøy.

- **FR-32** All tekst i grensesnittet er på norsk bokmål, også feilmeldinger og bekreftelser.
- **FR-33** Alt generert innhold er på norsk bokmål, også når notatene er på engelsk eller blander språkene. Der et fagbegrep også brukes på engelsk i notatene, står det engelske begrepet i parentes, for eksempel «merkevare (brand)».

### 2. Innlogging og egne data

Innlogging trengs fordi studentens materiale lagres.

- **FR-34** Studenten kan opprette en konto med e-postadresse og passord, logge inn og logge ut. E-postadressen bekreftes ikke, og det finnes ingen «glemt passord»-funksjon.
- **FR-35** En innlogget student ser og kan endre bare sine egne emner, forelesninger, filer og genererte innhold. Forsøk på å åpne andres innhold, for eksempel ved å endre adressen i nettleseren, gir ingen tilgang.
- **FR-36** Studenten kan slette kontoen sin. Før kontoen slettes, får hun en bekreftelse som sier at alle emner, filer og alt generert innhold slettes for godt. Etter sletting finnes ingen av dataene hennes i appen.
