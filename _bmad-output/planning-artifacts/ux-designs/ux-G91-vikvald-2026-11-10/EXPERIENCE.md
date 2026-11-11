---
title: "EXPERIENCE: Studiekamerat"
status: draft
created: 2026-11-10
updated: 2026-11-11
sources:
  - ../../prds/prd-G91-vikvald-2026-11-09/prd.md
---

# Studiekamerat: hvordan appen virker

Dette dokumentet sier hvordan Studiekamerat er bygd opp og oppfører seg. Hvordan den ser ut, står i [DESIGN.md](DESIGN.md). Krav fra PRD-en er henvist med ID (FR-, NFR-, UJ-) og ikke gjentatt her.

Skissene ligger i [`.working/hybrid-f2-v1/`](.working/hybrid-f2-v1/) og flyttes senere til `mockups/`. **Dokumentene vinner ved konflikt med skissene.** Tekst i skissene som forelesningsnavn i andre emner, spørsmål, svar, filnavn og sidetall er eksempelinnhold, ikke krav.

## Grunnlag (Foundation)

- **Plattform:** webapp for PC-nettleser (NFR-14, NFR-15). Fungerer ned til 768 px bredde og med tekst forstørret til 200 %, uten vannrett rulling. Mobil er utenfor MVP.
- **Språk:** norsk bokmål i hele grensesnittet (FR-1). Sidene har `lang="nb"` (NFR-12).
- **Teknologi:** teknisk stakk og eventuelt UI-bibliotek er ikke bestemt i UX-arbeidet. Det avgjøres i arkitekturen. Dette dokumentet beskriver oppførsel uavhengig av bibliotek.
- **Visuell referanse:** [DESIGN.md](DESIGN.md). Tokens henvises som `{colors.brand}` osv.
- **Demomodus** er standard (NFR-2). Grensesnittet er likt i demomodus og med ekte språkmodell. Forskjellen vises på kontosiden.
- **Tre moduser:** forsiden uten sidemeny, arbeidssider med sidemeny (emnetre), og øving der sidemenyen blir et øktpanel.

## Informasjonsarkitektur (Information Architecture)

### Flater

| # | Flate | Type | Nås fra | Venstre side | Skisse |
|---|---|---|---|---|---|
| 01 | Logg inn / Opprett konto | Side | Appstart uten innlogging, «Logg ut» | Ingen | [01-logg-inn.svg](.working/hybrid-f2-v1/01-logg-inn.svg) |
| 02 | Dine emner (forsiden) | Side | Etter innlogging, logoen | Ingen sidemeny | [02-emner.svg](.working/hybrid-f2-v1/02-emner.svg) |
| 03 | Emneside | Side | «Åpne» på emnekort, emne i sidemenyen | Sidemeny | [03-emne.svg](.working/hybrid-f2-v1/03-emne.svg) |
| 04 | Forelesningsside | Side | Rad i forelesningstabellen, forelesning i sidemenyen | Sidemeny | [04-forelesning.svg](.working/hybrid-f2-v1/04-forelesning.svg) |
| 05 | Vilkår | Dialog over 04 | Første opplasting (FR-11, innhold etter NFR-6) | – | [05-vilkar.svg](.working/hybrid-f2-v1/05-vilkar.svg) |
| 06 | Lag quiz | Dialog over 04 | «Lag flere» på Quiz-raden (FR-28) | – | [06-lag-innhold.svg](.working/hybrid-f2-v1/06-lag-innhold.svg) |
| 07 | Flashcard-økt | Øving | «Øv nå» (02, 04), «Øv på flashcards» (03) | Øktpanel | [07-flashcard.svg](.working/hybrid-f2-v1/07-flashcard.svg) |
| 08 | Flashcards ferdig | Øving | Siste kort i 07 | Øktpanel, ferdig | [08-flashcard-ferdig.svg](.working/hybrid-f2-v1/08-flashcard-ferdig.svg) |
| 09 | Quiz | Øving | «Start» Quiz (03), «Øv nå» på Quiz-raden (04) | Øktpanel | [09-quiz.svg](.working/hybrid-f2-v1/09-quiz.svg) |
| 10 | Quizresultat | Øving | Siste spørsmål i 09 | Øktpanel, ferdig | [10-quiz-resultat.svg](.working/hybrid-f2-v1/10-quiz-resultat.svg) |
| 11 | Modellkort-økt | Øving | «Øv nå» på Huskeregler-raden (04) | Øktpanel | [11-modellkort.svg](.working/hybrid-f2-v1/11-modellkort.svg) |
| 12 | Fritekst-økt | Øving | «Start» Fritekstspørsmål (03), «Øv nå» på Fritekst-raden (04) | Øktpanel | [12-fritekst.svg](.working/hybrid-f2-v1/12-fritekst.svg) |
| 13 | Sammendrag | Side | Sammendrag-raden (04) | Sidemeny, forelesningen valgt | [13-sammendrag.svg](.working/hybrid-f2-v1/13-sammendrag.svg) |
| 14 | Slett fil | Dialog over 04 | «Slett» på filrad | – | [14-slett-bekreft.svg](.working/hybrid-f2-v1/14-slett-bekreft.svg) |
| 15 | Konto | Side | «Konto» i toppfeltet | Sidemeny, ingen forelesning valgt | [15-konto.svg](.working/hybrid-f2-v1/15-konto.svg) |

### Flater som bare beskrives her (ikke skissert)

Disse bygges fra mønstrene i dette dokumentet og DESIGN.md:

- **Opprett konto** (FR-3): samme kort som 01, byttet med «Opprett konto» / «Logg inn».
- **Nytt emne, nytt navn, slett emne** (FR-6, FR-14): dialoger. Sletting følger mønsteret i 14.
- **Ny forelesning, nytt navn, endre dato, slett forelesning** (FR-7, FR-14, FR-15): dialoger. Dato er dagens dato som standard.
- **Erstatt fil** (FR-13): bekreftelse som 14, med teksten «erstatter» i stedet for «sletter».
- **Lag flashcards** (FR-17) og **Lag fritekstspørsmål** (FR-48): dialoger som 06, med omfang og uten vanskelighetsgrad.
- **Lag huskeregler** (FR-42) og **Lag sammendrag** (FR-53): starter jobben direkte, uten dialog. [ASSUMPTION] Ingen valg finnes i PRD-en.
- **Hurtigtaster** («?»): dialog. Innholdet er et åpent spørsmål.
- **Endre huskeregel** (FR-46): fra 11. Ikke skissert.
- **Rediger og slett kort, slett spørsmål** (FR-27, FR-37, FR-52): ikke skissert, og det er ikke bestemt hvor det skjer. Se Åpne spørsmål.
- **Resultat for modellkort og fritekst** (FR-26, FR-51): som 08, med «Riktig / Delvis riktig / Feil» for fritekst.
- **Slett konto** (FR-5): bekreftelse som 14, åpnes fra 15.

### Navigasjon

- **Toppfeltet** står på alle sider: logoen går til forsiden, «Konto» til 15, «Logg ut» logger ut og går til 01.
- **Forsiden (02) har ingen sidemeny.** Den viser alle emner på semesterlinjen og ett kort per emne.
- **Sidemenyen** (emnetreet) står på 03, 04, 13 og 15. Emnet som er åpent, viser forelesningene sortert etter dato (FR-15). Valgt forelesning er markert. Nederst står «? Hurtigtaster».
- **Under øving** (07–12) byttes sidemenyen med øktpanelet. Klara kommer ut med «Avslutt økt» eller Esc, eller via resultatsiden.
- **Dialoger** ligger over siden de åpnes fra, stables aldri, og lukkes med Esc, lukkekrysset eller «Avbryt».

## Stemme og tone (Voice and Tone)

Mikrotekst. Uttrykket ellers står i DESIGN.md, «Merkevare og stil».

Prinsipper:

- **Du-form, korte hele setninger, norsk bokmål.** Fagbegreper fra notatene brukes slik de står (FR-2).
- **Si hva som skjer, og hva Klara kan gjøre.** En feilmelding sier hva som er feil og hvordan det rettes (NFR-11).
- **Ingen feiring, ingen utropstegn, ingen emoji.** Resultater står som tall.
- **Datoer** som 04.12 eller fredag 04.12.2026. Tall med tabulære siffer.
- **Knapper er verb:** «Øv nå», «Lag flere», «Slett fila», «Godta og last opp».

| Gjør | Unngå |
|---|---|
| «Lager quizspørsmål … Du kan bruke resten av appen imens.» | «Vennligst vent» |
| «Feil e-post eller passord. Sjekk at Caps Lock er av.» | «Feil passord» (avslører at e-posten finnes) |
| «Dette sletter også 18 flashcards, 11 quizspørsmål og 2 modellkort laget fra fila. Det kan ikke angres.» | «Er du sikker?» |
| «11 av 15 riktige» | «Bra jobba! 🎉» |
| «Ikke øvd ennå», «Ingen ennå», «Ikke laget» | «Du har ikke gjort noe her» |
| «✓ Økten er ferdig og lagret» | «Gratulerer, økten er fullført!» |
| «Sammendraget er laget av en språkmodell. Sjekk viktige punkter mot kilden.» | Å skjule at innholdet er laget av KI |
| «Inneholder formel – sjekk mot kilden» (FR-41, ordrett) | Egne varianter av denne teksten |

### Meldinger som ikke er skissert

PRD-en sier hva meldingene skal inneholde. Ordlyden under er forslag. [ASSUMPTION] Ordlyden må godkjennes av Silje.

| Situasjon | Krav | Forslag til tekst |
|---|---|---|
| Word-fil eller annen filtype | FR-9 | «Bare PDF-filer kan lastes opp. Lagre Word-dokumentet som PDF (Fil → Lagre som → PDF) og prøv igjen.» |
| PDF uten lesbar tekst | FR-10 | «Vi fant ingen tekst i denne PDF-en. Den kan være skannet. Last opp en PDF der teksten kan merkes.» |
| Fil over 50 sider | NFR-16 | «Fila har 63 sider. Grensen er 50 sider. Del den opp og last opp delene hver for seg.» |
| Generering feilet | FR-21 | «Vi klarte ikke å lage quizspørsmålene. Ingenting er lagret. Prøv igjen.» |
| Færre enn valgt | FR-18, FR-38 | «Det ble laget 12 av inntil 20 spørsmål. Notatene ga ikke grunnlag for flere.» |
| Ingen modeller funnet | FR-47 | «Vi fant ingen modeller eller lister i denne forelesningen.» |

## Komponentmønstre (Component Patterns)

Oppførsel. Visuelt utseende står i DESIGN.md, «Komponenter». Navnene er de samme.

| Komponent | Brukes på | Regler |
|---|---|---|
| Toppfelt (`top-bar`) | Alle sider | Logo → forsiden. «Konto» og «Logg ut» er knapper uten understreking. «Logg ut» logger ut med en gang, uten bekreftelse. |
| Sidemeny med emnetre (`sidebar-tree`) | 03, 04, 13, 15 | Et emne kan åpnes og lukkes. Åpent emne viser forelesningene sortert etter dato. Klikk på emnenavn → 03, på forelesning → 04. Status per forelesning med fylt/hul prikk. |
| Menyrad (`menu-row`) | Sidemeny | Hele raden er klikkbar. Valgt rad er markert og har `aria-current="page"`. Lange navn kortes av med «…», og hele navnet finnes som tilgjengelig navn. |
| Øktpanel (`session-panel`) | 07–12 | Viser hvor langt Klara er, hva hun har svart, og «Avslutt økt». Oppdateres etter hvert svar. Når økten er ferdig, byttes «Avslutt økt» med «✓ Økten er ferdig og lagret». |
| Svarrutenett (`answer-grid-cell`) | Øktpanel | Én rute per kort eller spørsmål. Viser ✓, ✗ eller ◐ etter svar. Rutene er ikke knapper; Klara kan ikke hoppe mellom spørsmål. [ASSUMPTION] Skissene viser ikke klikk. |
| Semesterlinje (`semester-timeline`) | 02, 03, 04 | Viser forelesninger som stasjoner (fylt = øvd), «I dag» og eksamen. Er grafikk; samme informasjon finnes i tekst ved siden av (emnenavn, antall forelesninger, «Eksamen 04.12 · om 3 uker»). |
| Emnekort (`subject-card`) | 02 | «Åpne» → 03. Hovedknappen starter flashcards for forelesningen under NESTE Å ØVE PÅ. Har emnet ikke innhold, står NESTE STEG med «Lag flashcards» → 04 for den forelesningen. Regelen for hvilken forelesning som vises, er et åpent spørsmål. |
| Forelesningstabell (`lecture-table`) | 03 | Sortert etter dato (FR-15). Hele raden er lenke til 04. Viser antall kort og quiz og status (FR-16). |
| Kort «Øv på hele emnet» (`practice-all-card`) | 03 | Starter øving på alt innhold i emnet: flashcards (07), quiz (09) og fritekst (12) (FR-23, FR-34, FR-50). En rad vises bare når emnet har den typen innhold. |
| Filrad (`file-row`) | 04 | «Slett» åpner 14. «Erstatt» åpner filvelgeren, deretter en bekreftelse som 14 (FR-13). |
| Opplastingsfelt (`upload-zone`) | 04 | Tar imot én eller flere PDF-er ved dra og slipp eller «Velg PDF» (FR-8). Første gang åpnes 05 før opplasting (FR-11). Filer som avvises, får melding (FR-9, FR-10, NFR-16). |
| Rad i «Lag og øv» (`create-row`) | 04 | Med innhold: «Øv nå» starter økt for forelesningen, «Lag flere» åpner dialog og legger nye til de gamle (FR-22, FR-33). Uten innhold: «Lag …» åpner dialog eller starter jobben. Sammendrag-raden åpner 13 når sammendraget finnes. |
| Jobbstatus (`job-status`) | 04 | Erstatter knappene i raden mens jobben pågår. Klara kan gå hvor hun vil i appen imens (NFR-17). Leses opp av skjermleser når den starter og slutter (NFR-12). [ASSUMPTION] Bare én jobb per type og forelesning om gangen. |
| Hovedknapp (`button-primary`) | Overalt | Det Klara gjør oftest på stedet. Høyst én per rad eller seksjon. |
| Omrissknapp (`button-outline`) | Overalt | Sjeldnere eller sekundære valg, og «Avbryt». |
| Tekstknapp (`button-text`) | Overalt | Handlinger i rader og kort. Ikonet har tekst ved siden av; ikonet alene er aldri hele navnet. |
| Fareknapp (`button-danger`) | 14 og andre slettedialoger | Utfører slettingen. Har aldri startfokus. |
| Kildelenke (`source-link`) | Alt generert innhold | Viser fil og PDF-side (FR-20, FR-32, FR-39, FR-49, FR-54). [ASSUMPTION] I MVP er kilden tekst, ikke lenke som åpner PDF-en; det er en mulig utvidelse i PRD-en. Da må den heller ikke understrekes som lenke. Se Åpne spørsmål. |
| Flashcard (`flashcard`) | 07 | Forsiden vises først. Snus med Mellomrom eller klikk (FR-24). Spørsmålskort og begrepskort (FR-19) bruker samme kort; på begrepskort står begrepet under SPØRSMÅL. [ASSUMPTION] Etiketten er ikke skissert for begrepskort. «Kunne» og «Kunne ikke» er aktive først når kortet er snudd (FR-25). Kort markert «Kunne ikke» kommer igjen senere i økten. |
| Modellkort (`model-card`) | 11 | Som flashcard (FR-42). Har kortet ingen huskeregel (FR-44), vises bare punktene, og «Endre huskeregel» heter «Legg til huskeregel» (FR-46). [ASSUMPTION] Ordlyden er ikke skissert. «Endre huskeregel» åpner redigering av huskeregelen (FR-46). |
| Svaralternativ (`quiz-option`) | 09 | Fire alternativer (FR-30). Klara velger ett, og bekrefter. Etter bekreftelse er alternativene låst (FR-35), og riktig svar og forklaring vises. |
| Forklaringskort (`explanation-card`) | 09 | Vises først etter bekreftet svar (FR-35). Har kilde og forelesning, fordi quiz på hele emnet blander forelesninger. |
| Tekstfelt for svar (`text-field`) | 12 | Synlig etikett «Ditt svar». «Vis modellsvar» er aktiv først når feltet har tekst (FR-50). Etter visning er svaret låst og merket «Levert · N ord». Svaret lagres ikke (FR-51). |
| Modellsvar (`model-answer`) | 12 | Vises etter «Vis modellsvar», med kilde (FR-49). |
| Selvvurdering (`self-assessment`) | 12 | Tre like knapper, ingen er forhåndsvalgt (FR-51). Valget går videre til neste spørsmål. |
| Resultatsammendrag (`result-summary`) | 08, 10 | Viser tall (FR-26, FR-36). Hovedknappen starter samme økt på nytt. Tilbakevalget går til stedet økten ble startet fra. |
| Liste over feil (`missed-list`) | 08, 10 | Kort Klara ikke kunne, eller spørsmål hun svarte feil på, med riktig svar, forklaring og kilde (FR-36). |
| Dialog (`dialog`) | 05, 06, 14 | Fokus flyttes inn i dialogen og holdes der. Esc lukker uten å endre noe. Fokus går tilbake til knappen som åpnet den. |
| Valgkort (`choice-option`) | 06 | Radiogruppe. Piltaster flytter valget. [ASSUMPTION] «Vanlig» og «Middels» er forhåndsvalgt; skissen viser «Vanlig» valgt og fokus på «Middels». |
| Avkrysning (`checkbox`) | 05 | «Godta og last opp» er ikke aktiv før boksen er krysset av (FR-11). |
| Skjemafelt (`text-field`) | 01 | Synlig etikett. Feil vises under feltet i tekst og knyttes til feltet for skjermleser (NFR-11). |
| Merknadsflate (`note-surface`) | 04, 11, 13 | Rolig informasjon, aldri feil. |
| Formelmerke (`formula-flag`) | Kort, spørsmål, sammendrag | Vises på innhold laget fra en side sendt som bilde, eller når modellen melder at noe mangler (FR-41). Ikke skissert. |
| Kontokort (`account-card`) | 15 | Rader med etikett, verdi og eventuelt én handling. «Logg ut» logger ut. «Les vilkårene» viser vilkårsteksten fra 05 uten avkrysning. «Slett kontoen …» åpner bekreftelsen (FR-5). |
| Demomerke (`demo-badge`) | 15 | Vises når appen kjører i demomodus (NFR-2). |
| Hurtigtasthint (`kbd`) | 07–12 | Viser tastene som virker på siden. Er bare tekst, ikke knapper. |

## Tilstander (State Patterns)

| Tilstand | Flate | Oppførsel |
|---|---|---|
| Ny bruker uten emner | 02 | Ikke skissert. [ASSUMPTION] Semesterlinjen og kortene byttes med én kort forklaring og «Nytt emne» som hovedknapp. Se Åpne spørsmål. |
| Emne uten øvingsinnhold | 02 | Kortet viser NESTE STEG og «Lag flashcards» i stedet for «Øv nå» (skisse 02, Organisasjon og ledelse). |
| Forelesning uten filer | 03, 04 | Tabellen viser «Ingen filer ennå». På 04 er «Lag og øv»-knappene ikke aktive før det finnes en fil. [ASSUMPTION] |
| Type uten innhold | 04 | «Ingen ennå» / «Ikke laget» og en omrissknapp for å lage. |
| Jobb pågår | 04 | Jobbstatus i raden: «Lager quizspørsmål …» og «Du kan bruke resten av appen imens.» Klara kan gå hvor hun vil (NFR-17). Når jobben er ferdig, kommer «Øv nå» tilbake og en statusmelding leses opp (NFR-12). [ASSUMPTION] Forlater hun siden, får hun beskjed når jobben er ferdig, og forelesningen viser det når hun kommer tilbake. |
| Generering feilet | 04 | Ikke skissert. Raden viser feilmeldingen i tekst og «Prøv igjen». Ingenting halvferdig lagres (FR-21). |
| Færre enn valgt | 04 | Ikke skissert. Statusmelding med hvor mange som ble laget (FR-18, FR-38). Leses opp (NFR-12). |
| Ingen modeller funnet | 04 | Ikke skissert. Melding i Huskeregler-raden (FR-47). |
| Fil avvist | 04 | Ikke skissert. Word og andre filtyper (FR-9), PDF uten tekst (FR-10) og over 50 sider (NFR-16) avvises med melding ved opplastingsfeltet. Fila lastes ikke opp. |
| Første opplasting | 04 → 05 | Vilkårsdialogen vises før fila lastes opp. Avbryt → ingenting lastes opp (FR-11). |
| Sletting | 14 | Viser hva som slettes sammen med fila (FR-12). Avbryt har startfokus, og avbrudd sletter ingenting. |
| Kortet ikke snudd | 07, 11 | Bare spørsmålet vises. «Kunne»/«Kunne ikke» er ikke aktive. Ikke skissert (07 viser snudd kort). |
| Svar ikke bekreftet | 09 | Klara kan bytte valg. Ingen farge, ingen forklaring. Ikke skissert (09 viser etter bekreftelse). |
| Fritekst før modellsvar | 12 | Tekstfeltet er åpent. Modellsvar og selvvurdering er skjult. Ikke skissert. |
| Nytt sammendrag | 13 | «Lag nytt sammendrag» starter en jobb. Det gamle sammendraget står til det nye er ferdig, og blir så erstattet (FR-55). [ASSUMPTION] |
| Økt ferdig | 08, 10 | Øktpanelet er fullt. Innholdet viser resultatet. |
| Innhold med formel | Kort, quiz, fritekst, sammendrag | Merket «Inneholder formel – sjekk mot kilden» (FR-41). Ikke skissert. |
| Innloggingsfeil | 01 | Feltet får feilkant og tekst under, og fokus flyttes til feltet (skisse 01). |
| Konto | 15 | Passord-raden viser bare «Lagret kryptert, aldri i klartekst» (NFR-7). Det finnes ingen endring av e-post eller passord. |
| Demomodus | 15 | Demomerket vises. Språkmodell-raden sier «Testmodell i demomodus (ellers Google, i EU)». |
| Fokus | Alle | Svart fokusring på det som har fokus (skissene viser den på «Kunne», «Neste spørsmål», «Middels», avkrysningen, «Avbryt» og passordfeltet). |
| Hover | Rader og tekstknapper | Tabellrad får lys flate. Tekstknapp får merketone bak. Hover er aldri eneste måte å se at noe er klikkbart. |

## Interaksjon (Interaction Primitives)

**Klikk og tastatur er likeverdige.** Alt kan gjøres med tastatur (NFR-8). Hurtigtaster er en snarvei, ikke den eneste veien.

### Hurtigtaster (fra skissene)

| Flate | Tast | Handling |
|---|---|---|
| Alle med sidemeny | `?` | Åpner hurtigtastdialogen |
| Flashcard og modellkort (07, 11) | Mellomrom | Snu kortet |
| | `1` | Kunne ikke |
| | `2` | Kunne |
| | Esc | Avslutt økten |
| Quiz (09) | `A`–`D` | Velg svar |
| | Enter | Bekreft svar. Etter bekreftelse: neste spørsmål. [ASSUMPTION] Skissen viser bare «neste spørsmål». |
| | Esc | Avslutt økten |
| Fritekst (12) | `1` / `2` / `3` | Feil / Delvis riktig / Riktig |
| | Esc | Avslutt økten |
| Resultat (08, 10) | Enter | Øv igjen / Ta quizen igjen |
| | Esc | Tilbake |
| Dialoger | Esc | Lukk uten endring |

Regler:

- **Enkelttaster** (tall, bokstaver, Mellomrom) virker ikke mens fokus står i et tekstfelt. Ellers kan Klara ikke skrive svaret sitt på 12.
- **Enkelttaster må kunne skrus av** (WCAG 2.1.4). Hvor det skjer, er et åpent spørsmål.
- Tastene står alltid synlig i hint-linjen på siden de virker.

### Grep

- **Snu kort:** forsiden først. Mellomrom, klikk på kortet eller en knapp snur. [ASSUMPTION] Kortet snus uten animasjon, eller med en kort overgang som slås av når nettleseren ber om redusert bevegelse.
- **Bekreft svar:** valg og bekreftelse er to steg (FR-35). Etter bekreftelse kan svaret ikke endres.
- **Selvvurdering:** etter modellsvaret velger Klara Feil, Delvis riktig eller Riktig (FR-51). Ingen er forhåndsvalgt, og appen dytter ikke mot et svar.
- **Rekkefølge:** kort og spørsmål vises i tilfeldig rekkefølge (FR-23, FR-34).
- **Avslutt økt:** [ASSUMPTION] avslutter uten bekreftelse og viser resultatet for det som er besvart. Se Åpne spørsmål.

### Ikke i appen

- Dra og slipp for annet enn filopplasting.
- Strek-teller, merker eller varsler som lokker Klara tilbake.
- Mer enn én dialog oppå hverandre.
- Hover som eneste måte å finne en handling.

## Universell utforming (Accessibility Floor)

Oppførsel. Kontrast og farger står i DESIGN.md. Grunnlaget er WCAG 2.1 AA.

- **Tastatur (NFR-8).** Alle funksjoner kan brukes med bare tastatur, også å snu et kort, velge svaralternativ, bekrefte svar, laste opp fil med «Velg PDF» i stedet for å dra, og å bekrefte sletting. Tab-rekkefølgen følger leserekkefølgen: toppfelt, sidemeny eller øktpanel, innhold.
- **Synlig fokus (NFR-8).** `{components.focus-ring}` på alt som kan få fokus. Den fjernes aldri.
- **Fokus i dialoger.** Fokus flyttes inn i dialogen når den åpnes og holdes der. I bekreftelser for sletting står startfokus på «Avbryt». I andre dialoger står det på første valg. Esc lukker. Fokus går tilbake dit det var.
- **Fokus under øving.** Når kortet snus eller svaret bekreftes, flyttes fokus til neste naturlige handling («Kunne», «Neste spørsmål»). [ASSUMPTION] Skissene viser fokus der.
- **Ikke bare farge (NFR-10).** Riktig og feil har symbol og tekst («✓ Riktig svar», «✗ Ditt svar»). Status har fylt eller hul prikk og tekst. Delvis riktig har ◐.
- **Skjemafelt (NFR-11).** Alle felt har synlig etikett. Feilmeldinger står i tekst, er knyttet til feltet og sier hvordan feilen rettes.
- **Statusmeldinger (NFR-12).** Jobb startet og ferdig, feil, færre enn valgt, resultat etter bekreftet svar og «Økten er ferdig» leses opp av skjermleser (levende område), uten at fokus flyttes.
- **Språk (NFR-12).** `lang="nb"` på alle sider. Engelske fagbegreper i parentes kan merkes `lang="en"`.
- **Grafikk.** Semesterlinjen og svarrutenettet har en tekstlig versjon for skjermleser, for eksempel «Markedsføring: 4 av 8 forelesninger øvd. Eksamen fredag 04.12, om 3 uker.»
- **Tilgjengelige navn.** Ikonknapper har tekst. Forkortede navn i menyen har hele navnet som tilgjengelig navn. Svarrutenettet leses som «Spørsmål 4: feil».
- **Overskrifter og landemerker.** Én sidetittel (h1) per side. Toppfelt, sidemeny og innhold er egne landemerker.
- **Enkelttaster** kan skrus av (WCAG 2.1.4).
- **Zoom (NFR-14).** Alt kan brukes med 200 % tekst uten vannrett rulling.
- **Kontroll (NFR-13).** Automatiske tester på alle sider pluss en manuell gjennomgang med bare tastatur av hele kjerneflyten (SK-9, SK-12).

## Brukerreiser (Key Flows)

Flyt 1 og 2 følger brukerreisene i PRD-en. Flyt 3 og 4 er støtteflyter for flater som brukerreisene ikke når.

### Flyt 1 — UJ-1: Klara etter en forelesning

Klara har nettopp hatt forelesningen «Uke 37: Merkevare» i Markedsføring. Hun er sliten og vil bare få notatene inn.

1. Klara åpner Studiekamerat og logger inn (01).
2. Forsiden (02) viser semesterlinjen. Hun ser at forelesningene ligger tett og at det er noen uker til eksamen. Hun trykker «Åpne» på Markedsføring.
3. På emnesiden (03) trykker hun «Ny forelesning». Navnet er «Uke 37: Merkevare», og datoen er dagens dato (FR-15). Hun kommer til forelesningssiden (04).
4. Hun drar `merkevare-notater.pdf` inn i opplastingsfeltet. Det er første gang, så vilkårsdialogen (05) åpnes. Hun leser, krysser av og trykker «Godta og last opp».
5. Fila står i fillista med antall sider. Mer orker hun ikke. Hun logger ut.
6. Noen dager senere åpner hun forelesningen fra sidemenyen. Hun trykker «Lag flashcards», velger «Vanlig», og jobbstatusen viser at kortene lages. Hun trykker «Lag quiz» (06), velger «Vanlig» og «Middels», og trykker «Lag quiz».
7. Mens quizen lages, trykker hun «Øv nå» på flashcards. Kortøkten (07) starter. Hun leser spørsmålet, tenker, og snur med Mellomrom. Hun trykker `2` for «Kunne» eller `1` for «Kunne ikke». Kortene hun ikke kunne, kommer igjen.
8. Økten er ferdig (08): «Kunne 19», «Kunne ikke 5», og en liste over de fem kortene med kilde. Hun går tilbake til forelesningen.
9. Quizen er ferdig laget. Hun trykker «Øv nå» på Quiz-raden (09), velger svar med `A`–`D` og bekrefter med Enter. Først da ser hun riktig svar og forklaring med kilde.
10. **Klimaks:** På resultatsiden (10) ser hun «11 av 15 riktige» og nøyaktig hvilke fire hun bommet på, med riktig svar og side i notatene. Hun vet hva som sitter og hva hun har glemt, uten å ha laget ett eneste kort selv.
11. Til slutt trykker hun «Lag sammendrag». Når det er ferdig, leser hun det (13), med kilde på hvert punkt.

**Feilveier:**

- Hun drar inn en Word-fil. Fila avvises med beskjed om at bare PDF støttes og hvordan hun lagrer som PDF (FR-9).
- Fila er skannet. Hun får beskjed om at PDF-en ikke har lesbar tekst (FR-10).
- Fila har over 50 sider. Den avvises med beskjed om grensen (NFR-16).
- Genereringen feiler. Raden viser en forståelig melding og «Prøv igjen». Ingenting halvferdig er lagret (FR-21).
- Notatene gir grunnlag for færre kort enn valgt. Hun får beskjed om hvor mange som ble laget (FR-18).

### Flyt 2 — UJ-2: Klara før eksamen

Tre uker før eksamen har Klara lastet opp notater fra alle forelesningene i Markedsføring.

1. Forsiden (02) viser at eksamen er om tre uker, og at fire av åtte forelesninger er øvd. Hun trykker «Åpne» på Markedsføring.
2. Emnesiden (03) viser forelesningene med status. I kortet «Øv på hele emnet» trykker hun «Øv på flashcards». Økten (07) blander kort fra alle forelesningene (FR-23).
3. Etterpå tar hun quiz på hele emnet («Start», 09). Kilden ved hvert spørsmål viser hvilken forelesning det kommer fra.
4. Hun åpner «Uke 37: Merkevare» og øver på huskeregler (11). Hun snur modellkortet «Forklar AIDA-modellen» og ser punktene og huskeregelen AIDA. Hun vil heller ha sin egen regel og trykker «Endre huskeregel» (FR-46).
5. Tilbake på emnesiden starter hun fritekstspørsmål for hele emnet (12). Hun skriver svaret i tekstfeltet og trykker «Vis modellsvar».
6. **Klimaks:** Modellsvaret står under hennes eget svar, med kilde. Hun ser selv hva hun fikk med og hva hun glemte, og trykker `2` for «Delvis riktig». Rutenettet i øktpanelet viser ◐. Hun øver som på eksamen, og vet hvor hun står.
7. Når økten er ferdig, ser hun hvor mange hun hadde riktig, delvis riktig og feil (FR-51).

**Feilveier:**

- Et kort er faglig feil. Hun sjekker kilden og sletter eller retter kortet (FR-27, FR-37). Hvor dette gjøres, er ikke bestemt.
- Et kort er merket «Inneholder formel – sjekk mot kilden». Hun slår opp i PDF-en på siden som står i kilden (FR-41).
- Hun avslutter en økt halvveis med Esc. Hun kommer tilbake dit hun startet.

### Flyt 3 — Klara rydder i filene (FR-12, FR-13)

[ASSUMPTION] Situasjonen er laget for å vise slettingen; kravene er fra PRD-en.

1. På forelesningssiden (04) ser Klara at hun har lastet opp en gammel versjon av `merkevare-notater.pdf`.
2. Hun trykker «Slett» på fila. Dialogen (14) viser fila og sier at 18 flashcards, 11 quizspørsmål og 2 modellkort slettes sammen med den.
3. Fokus står på «Avbryt». Hun bestemmer seg for å erstatte i stedet, og trykker Esc. Ingenting er slettet.
4. Hun trykker «Erstatt» og velger den nye fila. Bekreftelsen sier hva som slettes fra den gamle fila.
5. **Klimaks:** Hun bekrefter. Den nye fila står i lista, og tallene i «Lag og øv» viser hva som er igjen. Hun vet nøyaktig hva hun mistet, og kan lage nytt innhold fra den nye fila.

### Flyt 4 — Klara avslutter etter semesteret (FR-3, FR-5)

[ASSUMPTION] Situasjonen er laget for å vise kontosiden; kravene er fra PRD-en.

1. Etter eksamen trykker Klara «Konto» i toppfeltet (15).
2. Hun ser e-posten, at vilkårene ble godtatt før første opplasting, og at appen kjører i demomodus.
3. Under «Slett kontoen» står det hva som slettes, og hvor mye hun har: 3 emner, 15 forelesninger og 18 filer.
4. Hun trykker «Slett kontoen …». En bekreftelse som 14 åpnes, med «Avbryt» som startfokus.
5. **Klimaks:** Hun bekrefter. Alt er slettet for godt, og hun er tilbake på innloggingen (01). Ingenting av henne ligger igjen i appen (FR-5).

Feilvei: Hun avbryter. Ingenting slettes.

## Skjermstørrelse og plattform (Responsive & Platform)

Skissene er tegnet for 1440 × 900 px. PRD-en krever at appen virker ned til 768 px bredde og med 200 % tekst, uten vannrett rulling (NFR-14), i siste Chrome, Safari og Edge (NFR-15).

| Bredde | Oppførsel |
|---|---|
| ≥ 1280 px | Som skissene. |
| 768–1279 px | [ASSUMPTION] Forsidekortene går fra tre til to kolonner og så én. To kolonner på 03, 04 og 13 legges under hverandre når de ikke får plass. Flashcard og quizkolonne krymper til bredden som er igjen. |
| ≤ 768 px eller 200 % tekst | Sidemenyen og øktpanelet tar for mye plass. Hva som skjer med dem, er ikke bestemt. Se Åpne spørsmål. |

Semesterlinjen må kunne vises smalere uten at etiketter kolliderer. [ASSUMPTION] Månedsetiketter kan forkortes, men «I dag» og eksamen skal alltid synes.

## Inspirasjon og det vi valgte bort (Inspiration & Anti-patterns)

- **Hentet fra Semesterlinjen (konsept 08):** tidslinjen som viser forelesninger og tid til eksamen, rolige farger med farge på emnelinjene.
- **Hentet fra Tastaturet først (konsept 09):** sidemenyen med emnetre og hurtigtaster.
- **Hentet fra Nordisk ro (via hybrid B):** luft, lys sidemeny og fokusmodus under øving.
- **Forbilder for håndverket (F2):** Linear, Things og Stripe Dashboard i lys utgave.
- **Valgt bort: tidslinje i sidemenyen.** Det var den som gjorde hybridene rotete.
- **Valgt bort: stolpediagram på emnesiden.** Status vises med prikk og tekst.
- **Valgt bort: understrekede knapper og lenker.** Unntatt kildelenken.
- **Valgt bort: dobbel informasjon.** Kortene sier ikke det tidslinjen eller øktpanelet allerede viser.
- **Valgt bort: feiring av resultater.** Resultatet er sakelig.
- **Valgt bort: «Glemt passord»** (FR-3) og endring av e-post og passord, som ikke er i PRD-en.

## Avgjort i gjennomgangen 11.11.2026

Disse tre var åpne spørsmål i utkastet. Silje avgjorde dem. De to første krever endring i PRD-en.

1. **Øvingshistorikk lagres per økt.** For hver økt lagres dato, type (flashcards, quiz, huskeregler eller fritekst), omfang (én forelesning eller hele emnet) og poengsum. Enkeltsvar og markeringer lagres ikke. Dette gir «Øvd 03.11», «4 av 8 forelesninger øvd», «Siste økt» og fylte og hule stasjoner på semesterlinjen. *PRD: nytt krav, og FR-25 og FR-51 presiseres.*
2. **Et emne har navn og eksamensdato.** Eksamensdatoen er påkrevd når emnet lages, og kan endres. Semesterlinjen starter ved første forelesning, så semesterstart lagres ikke. *PRD: FR-6 utvides.*
3. **Rediger og slett skjer under øving.** Hvert kort eller spørsmål har «Rediger» (flashcards og modellkort, FR-27 og FR-46) og «Slett» (alle typer, FR-27, FR-37 og FR-52) i bunnfeltet ved kilden. Sletting krever bekreftelse. Det finnes ingen egen listeside i MVP.

4. **«Neste å øve på»** er den eldste forelesningen som har innhold, men ikke er øvd. Er alle øvd: den som ble øvd lengst siden.
5. **Smal skjerm (≤ 768 px og 200 % tekst):** sidemenyen og øktpanelet skjules bak en menyknapp i toppfeltet og legger seg over innholdet når de åpnes.
6. **Hurtigtastdialogen («?»)** viser tastene for siden Klara er på. Enkelttaster virker bare under øving, aldri når fokus står i et tekstfelt (WCAG 2.1.4).
7. **Ny bruker uten emner:** forsiden viser «Lag ditt første emne» og én setning om hva appen gjør. Testbrukeren har eksempelemnet.
8. **Feilmeldinger** (FR-9, FR-10, FR-18, FR-21, FR-47, NFR-16): ordlyden i «Stemme og tone» gjelder. Meldingen vises ved fila eller jobben, ikke som egen side.
9. **Huskeregler for hele emnet** får egen rad i «Øv på hele emnet» (03).
10. **«Avslutt økt»** krever ingen bekreftelse. Resultatet for det som er gjort, vises og lagres.
11. **Fritekst:** Klara velger kortsvar eller langsvar i dialogen, sammen med omfang (FR-48).
12. **Kildehenvisningen** er tekst i MVP, ikke en lenke. Å åpne PDF-en på riktig side er en mulig utvidelse.
13. **Demomodus:** personverntekst og ventetid tilpasses modusen. I demomodus står det at ingenting sendes ut, og at innholdet tar noen sekunder (NFR-2, NFR-17).
14. **Jobber:** én jobb per forelesning om gangen. Når en jobb er ferdig, vises en kort melding som skjermlesere leser opp (NFR-12), uansett hvilken side Klara er på.

## Åpne spørsmål

Ingen. Svarene på 4–14 er Siljes godkjenning av forslag 11.11.2026. Skissene er ikke oppdatert for 3, 7–11 og 13; dokumentet vinner.
