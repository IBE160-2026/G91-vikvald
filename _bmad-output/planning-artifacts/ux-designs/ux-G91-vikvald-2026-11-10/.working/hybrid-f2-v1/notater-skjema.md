# Notater: sidene 01, 05, 06, 14 og 15 i F2-V1

Lages med `scratchpad/hf/genV1-skjema.py v1 <utmappe>`. Det er en kopi av `genF2farge.py`, med de samme fargene, knappene, toppfeltet og sidemenyen. Forelesningssiden (04) er gjort om til en funksjon, slik at dialogene kan ligge over den.

## Felles for dialogene (05, 06, 14)

- Bakgrunnen er side 04, dempet med et mørkt slør (42 % blekk).
- Dialogen er hvit med tynn kant, runde hjørner (16 px) og samme myke skygge som flashcardet.
- Oppbygging: tittel (24 px) og et lukkekryss øverst, innhold, en skillelinje og knapper nederst til høyre. Knappene står i rekkefølgen «Avbryt» og så hovedhandlingen.
- Knappene er 40 px høye, som på de andre sidene.

## Per side

- **01 Logg inn:** Toppfeltet viser bare logoen. Skjemaet ligger midt på siden i et hvitt kort. Begge feltene har synlig etikett. Passordfeltet viser feil (rød kant, ikon og tekst) og har fokus (svart ring). Nederst er semesterlinjen i grått, bare som et rolig bilde av hva appen handler om.
- **05 Vilkår:** Innholdet er delt i «Ditt ansvar» og «Hvor notatene sendes». Avkrysningen er krysset av og har fokus. Først da er «Godta og last opp» aktiv.
- **06 Lag quiz:** Omfang vises som tre kort ved siden av hverandre, vanskelighetsgrad som tre rader. Valgt alternativ har en svak ultramarin tone og en ultramarin kant. «Middels» har fokus. Bakgrunnen viser quizen uten jobb som pågår, fordi Klara er i ferd med å starte en.
- **14 Slett fil:** Fila vises i en egen boks. «Det kan ikke angres» står i halvfet skrift. Avbryt har startfokus. «Slett fila» er rød fylt, og det er det eneste stedet i appen der den røde knappen brukes.
- **15 Konto:** Sidemenyen viser emnene uten valgt forelesning. «Konto» i toppfeltet er markert med samme lyse tone som en valgt rad. Innholdet ligger i tre kort, bygget som filkortet på 04: Innlogging, Vilkår og personvern og Slett kontoen. Demomodus vises som et lite grått merke. «Slett kontoen …» er en omrissknapp med rød tekst. Den sletter ikke noe selv, men åpner en bekreftelse.

## Egne tolkninger

- Valgt radioknapp og avkrysning er ultramarine. Fargen betyr «det du har valgt», akkurat som valgt rad i menyen.
- Feilmeldingen på innlogging sier «Feil e-post eller passord» og ikke bare «Feil passord». Da kan ingen bruke innloggingen til å finne ut om en e-postadresse har konto.
- Semesterlinjen på innloggingen er grå, ikke oransje. Oransje er Markedsføring-fargen og skal bare brukes der emnet vises.
- Kontosiden har både «Logg ut» i toppfeltet og en «Logg ut»-knapp i kortet, fordi briefen ber om at kontosiden viser utlogging.

## Rettet av hovedagenten etter gjennomgang (11.11)

Rettet direkte i SVG-ene, ikke i generatoren:
- 01: «Glemt passordet?» fjernet. PRD FR-3 sier at appen ikke har den funksjonen.
- 06: «under ett minutt» endret til «under to minutter» (PRD NFR-17).
- 15: «Endre» e-post og «Endre passord» fjernet (finnes ikke i PRD). Passord-raden sier nå «Lagret kryptert, aldri i klartekst» (NFR-7). Språkmodell-raden viser testmodell i demomodus.
