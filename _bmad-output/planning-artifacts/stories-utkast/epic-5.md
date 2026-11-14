## Epic 5: Oversikt fram mot eksamen

Studenten ser hvor hun står i semesteret: semesterlinja med øvd og ikke øvd og tid til eksamen, «Neste å øve på» på forsiden, og tellinger og «sist øvd» i forelesningstabellen. Mye kan kuttes til tekst.

Rekkefølgen er valgt slik at det som kan kuttes, ligger sist eller i egne stories: 5.1 legger grunnlaget (funksjonen for «øvd» og oversikts-API-et), 5.3 er tekstvarianten av FR-57, og 5.5 er selve semesterlinja, som kan kuttes uten at FR-57 mister reserven.

### Story 5.1: Regn ut «øvd» ett sted og vis det i sidemenyen og SISTE ØKT

Som student,
vil jeg se hvilke forelesninger jeg har øvd på, og hva jeg gjorde sist,
slik at jeg vet hva jeg har gjort uten å måtte huske det selv.

**Krav:** FR-56 («øvd»-regelen), AR-2, AR-9, AR-15, AR-16, AR-17, UX-DR7 (statusprikk), UX-DR14 (SISTE ØKT)

**Akseptkriterier:**

**Gitt** at `practice_sessions` og `POST /api/practice-sessions` finnes fra epic 3
**Når** storien er bygd
**Så** finnes det én funksjon i `backend/app/modules/practice/service.py` (for eksempel `practiced_lectures(db, user_id, subject_id)`) som gir, for hver forelesning i emnet, om den er øvd og tidspunktet for siste økt som teller for den
**Og** ingen annen kode i backend eller frontend regner ut «øvd» på egen hånd; oversikten, tabellen, sidemenyen, «Neste å øve på» og semesterlinja bruker bare denne funksjonen (AR-9)

**Gitt** en forelesning med én lagret økt på bare denne forelesningen (også en avbrutt økt)
**Når** funksjonen kjøres
**Så** er forelesningen øvd, og siste tidspunkt er øktens `started_at`

**Gitt** en lagret økt på hele emnet (`lecture_id` tom) med `started_at` T
**Når** funksjonen kjøres
**Så** teller økten for alle forelesninger i emnet som hadde øvingsinnhold (flashcards, quizspørsmål eller fritekstspørsmål) laget før eller ved T
**Og** den teller ikke for forelesninger som fikk sitt første innhold etter T, og heller ikke for forelesninger uten innhold
**Og** spørsmålet «hadde innhold ved T» besvares av én funksjon i `content` (gjenbruker tellingsregisteret fra epic 2–4), slik at `practice` ikke leser innholdstabellene direkte (AR-16)

**Gitt** en forelesning uten noen økt som teller
**Når** funksjonen kjøres
**Så** er den ikke øvd, og siste tidspunkt er tomt

**Gitt** en innlogget student
**Når** frontend kaller `GET /api/overview`
**Så** svarer API-et med studentens emner (id, navn, `color_index`, `exam_date`) og for hvert emne forelesningene (id, navn, dato, `practiced`, `last_practiced_at`) og `last_session` (type, forelesning eller hele emnet, `started_at`, `aborted` og tallene fra økten), i `snake_case` og med ISO 8601-datoer (AR-15)
**Og** svaret inneholder bare studentens egne data, og uten innlogging svarer API-et `401 UNAUTHENTICATED` (AR-2, AR-10)

**Gitt** sidemenyen med emnetre fra epic 2
**Når** et emne er åpent
**Så** har hver menyrad en fylt statusprikk når forelesningen er øvd og en hul prikk når den ikke er det (UX-DR7)
**Og** prikken har et tilgjengelig navn, «Øvd» eller «Ikke øvd ennå», slik at status ikke bare vises med fylt eller hul form

**Gitt** at studenten har fullført eller avbrutt en økt
**Når** hun kommer tilbake til en side med sidemeny eller kortet «Øv på hele emnet»
**Så** viser siden den nye statusen uten at hun må laste siden på nytt (oversikten hentes på nytt etter økten)

**Gitt** emnesiden (03) med kortet «Øv på hele emnet» fra epic 3 og 4
**Når** emnet har minst én lagret økt
**Så** står SISTE ØKT nederst i kortet med type og omfang og dato og resultat, som i skisse 03: «Quiz · Uke 37: Merkevare» og «09.11 · 12 av 15 riktige» (UX-DR14)
**Og** en økt på hele emnet viser «Hele emnet» i stedet for forelesningsnavnet
**Og** datoen vises som dd.mm med en felles datofunksjon i `frontend/lib/`

**Gitt** et emne uten lagrede økter
**Når** emnesiden vises
**Så** vises ikke SISTE ØKT

**Gitt** sidene som er endret (03, 04, 13 og 15 med sidemeny)
**Når** Playwright-testene kjører
**Så** finner axe ingen brudd, og statusprikkene og SISTE ØKT kan nås og leses med tastatur og skjermleser

**Gitt** testene for storien
**Når** de kjøres med `uv run pytest`, `npm run test` og `npx playwright test`
**Så** har testnavnene krav-ID, for eksempel `test_ar9_emneokt_teller_forelesninger_med_innhold_ved_start`, `test_fr56_avbrutt_okt_gir_ovd` og `test_ux_dr14_siste_okt` (AR-17)

### Story 5.2: Vis tellinger og «Øvd 03.11» i forelesningstabellen *(Kan kuttes)*

Som student,
vil jeg se hvor mange filer, kort og quizspørsmål hver forelesning har, og når jeg sist øvde,
slik at jeg ser hvilke forelesninger som er klare og hvilke jeg har latt ligge.

**Krav:** FR-16, UX-DR13 (tellinger og status), AR-15, AR-17

**Akseptkriterier:**

**Gitt** emnesiden (03) med forelesningstabellen fra epic 2
**Når** siden vises
**Så** har tabellen kolonnene Dato, Forelesning, Filer, Kort, Quiz og Status (UX-DR13)
**Og** Kort er antall flashcards (modellkort regnes med når de finnes), og Quiz er antall quizspørsmål

**Gitt** antallene i en rad
**Når** de vises
**Så** er tallene høyrejustert med tabulære tall, og 0 vises som «–»
**Og** tellingene kommer fra tellingsregisteret i `content` (gjenbruker det som delete-preview bruker), slik at en ny innholdstype bare melder seg inn ett sted

**Gitt** en forelesning som er øvd
**Når** raden vises
**Så** står det fylt prikk og «Øvd 03.11», der datoen er siste økt som teller for forelesningen etter funksjonen fra story 5.1

**Gitt** en forelesning med filer som ikke er øvd
**Når** raden vises
**Så** står det hul prikk og «Ikke øvd ennå»

**Gitt** en forelesning uten filer
**Når** raden vises
**Så** står det «Ingen filer ennå»

**Gitt** en økt på hele emnet
**Når** tabellen vises etterpå
**Så** har alle forelesninger som hadde innhold da økten startet, fått «Øvd» med øktens dato, og de andre er uendret

**Gitt** tabellen
**Når** studenten bruker tastatur
**Så** kan hver rad nås med Tab og åpne forelesningen (04) med Enter, som i epic 2
**Og** axe finner ingen brudd på 03

**Gitt** testene for storien
**Når** de kjøres
**Så** har de krav-ID i navnet, for eksempel `test_fr16_tellinger_per_forelesning` og `test_fr16_status_ovd_dato` (AR-17)

### Story 5.3: Vis «Eksamen 04.12, om 3 uker · 4 av 8 forelesninger øvd» på forsiden og emnesiden

Som student,
vil jeg se hvor lenge det er til eksamen og hvor mange forelesninger jeg har øvd på,
slik at jeg vet om jeg ligger an til å rekke det.

Denne storien er tekstvarianten av FR-57. Den bygges først, slik at kravet er oppfylt også om semesterlinja (story 5.5) kuttes.

**Krav:** FR-57 (reserven), SK-22, AR-15, AR-17

**Akseptkriterier:**

**Gitt** forsiden (02) med emnelista fra epic 2
**Når** studenten har emner
**Så** står det for hvert emne en linje med emnenavn og teksten ordrett etter mønsteret «Eksamen 04.12, om 3 uker · 4 av 8 forelesninger øvd»

**Gitt** emnesiden (03)
**Når** siden vises
**Så** står samme tekst for dette emnet under overskriften

**Gitt** antallet øvde forelesninger
**Når** teksten lages
**Så** er N i «N av M» antall forelesninger som er øvd etter funksjonen fra story 5.1, og M er alle forelesningene i emnet, også de uten filer (som i skisse 03: 4 av 8)

**Gitt** dagens dato og eksamensdatoen
**Når** antall uker regnes ut
**Så** gjøres det i én funksjon i `frontend/lib/` (for eksempel `weeksUntilExam(examDate, today)`) som tar dagens dato som argument, slik at den kan testes
**Og** antallet avrundes til nærmeste hele uke, som i skisse 02 (24 dager gir «om 3 uker», 34 dager gir «om 5 uker», 21 dager gir «om 3 uker»)
**Og** «om 1 uke» står i entall
**Og** dagens dato er studentens lokale dato

**Gitt** at eksamen er i dag
**Når** teksten vises
**Så** står det «Eksamen i dag · 4 av 8 forelesninger øvd»

**Gitt** at eksamensdatoen er passert
**Når** teksten vises
**Så** står det «Eksamen var 04.12 · 4 av 8 forelesninger øvd»

**Gitt** et emne uten forelesninger
**Når** teksten vises
**Så** står det «Eksamen 04.12, om 3 uker · Ingen forelesninger ennå» i stedet for «0 av 0 forelesninger øvd» [AVGJØRES: E6]

**Gitt** en økt som studenten nettopp har lagret
**Når** hun går tilbake til forsiden eller emnesiden
**Så** viser teksten det nye antallet øvde forelesninger (SK-22)

**Gitt** sidene 02 og 03
**Når** Playwright-testene kjører
**Så** finner axe ingen brudd, og teksten er vanlig tekst som skjermleseren leser

**Gitt** testene for storien
**Når** de kjøres
**Så** har de krav-ID i navnet, for eksempel `test_sk22_uker_til_eksamen`, `test_sk22_antall_ovd` og `test_fr57_eksamen_i_dag` (AR-17)

### Story 5.4: Vis emnekort med «Neste å øve på» på forsiden

Som student,
vil jeg se ett kort per emne med hva jeg bør øve på nå,
slik at jeg kommer i gang med én knapp i stedet for å lete.

**Krav:** FR-58 (*Kan kuttes*), SK-20, UX-DR12, AR-17

**Akseptkriterier:**

**Gitt** forsiden (02) med emnelista fra epic 2
**Når** studenten har emner
**Så** vises ett emnekort (`subject-card`) per emne i stedet for den enkle lista: emneprikk i emnefargen og navn, tekstknappen «Åpne ›» til emnesiden (03), og antall kort og quizspørsmål, for eksempel «120 kort · 64 quizspørsmål» (UX-DR12)
**Og** kortene står i tre kolonner, og to og én kolonne i smalere vinduer (UX-DR10)
**Og** tekstlinja fra story 5.3 står fortsatt per emne over kortene

**Gitt** et emnekort
**Når** det vises
**Så** står fremdriften nederst som små stolper, én per forelesning, fylt når forelesningen er øvd, med teksten «4 av 8 forelesninger øvd» (samme tall som i story 5.3)
**Og** stolpene er skjult for skjermleser, siden teksten sier det samme

**Gitt** et emne med øvingsinnhold *(Kan kuttes: FR-58)*
**Når** kortet vises
**Så** står NESTE Å ØVE PÅ med den eldste forelesningen (etter dato) som har innhold og ikke er øvd, og en grunn, for eksempel «Uke 38: Markedsmiksen» og «16 kort, ikke øvd ennå»
**Og** hovedknappen «Øv nå» starter flashcards for den forelesningen (gjenbruker økten fra epic 3)
**Og** har forelesningen bare quiz eller fritekst, følger knappen regelen for «Øv nå» som avgjøres i epic 3 (A15, E1)

**Gitt** at alle forelesninger med innhold er øvd *(Kan kuttes: FR-58)*
**Når** kortet vises
**Så** står NESTE Å ØVE PÅ med forelesningen som ble øvd lengst siden, og grunnen «16 kort, sist øvd 03.11»
**Og** «øvd» og «sist øvd» kommer bare fra funksjonen i story 5.1 (SK-20)

**Gitt** et emne med forelesninger og filer, men uten øvingsinnhold
**Når** kortet vises
**Så** står «Ingen øvingsinnhold ennå» i stedet for tellingene, og NESTE STEG med den eldste forelesningen som har filer, grunnen «2 filer lastet opp, klare til bruk» og omrissknappen «Lag flashcards», som åpner forelesningssiden (04)

**Gitt** et emne uten forelesninger
**Når** kortet vises
**Så** står NESTE STEG med «Ingen forelesninger ennå» og omrissknappen «Ny forelesning», som åpner emnesiden (03) [AVGJØRES: E2]

**Gitt** et emne med forelesninger, men uten filer
**Når** kortet vises
**Så** står NESTE STEG med den eldste forelesningen, grunnen «Ingen filer ennå» og omrissknappen «Last opp PDF», som åpner forelesningssiden (04) [AVGJØRES: E2]

**Gitt** at FR-58 kuttes
**Når** kortet vises
**Så** viser det fortsatt navn, «Åpne ›», tellinger, fremdrift og NESTE STEG, og ingen annen story bryter

**Gitt** forsiden
**Når** Playwright-testene kjører
**Så** finner axe ingen brudd, alle knapper kan nås med Tab i leserekkefølge, og hvert kort har emnenavnet som overskrift

**Gitt** testene for storien
**Når** de kjøres
**Så** har de krav-ID i navnet, for eksempel `test_fr58_eldste_ikke_ovd`, `test_fr58_alle_ovd_gir_lengst_siden`, `test_sk20_neste_a_ove_pa` og `test_ux_dr12_neste_steg` (AR-17)

### Story 5.5: Vis semesterlinja på forsiden, emnesiden og forelesningssiden *(Kan kuttes)*

Som student,
vil jeg se forelesningene mine på en linje fram mot eksamen,
slik at jeg ser med ett blikk hvor mye som har vært, hva jeg har øvd, og hvor lenge det er igjen.

Kuttes denne storien, står tekstvarianten fra story 5.3 igjen, og FR-57 er oppfylt med reserven.

**Krav:** FR-57, SK-22, UX-DR11, AR-17

**Akseptkriterier:**

**Gitt** forsiden (02)
**Når** studenten har emner
**Så** vises semesterlinja (`semester-timeline`) over emnekortene, i stedet for tekstlinjene fra story 5.3, som et hvitt kort med symbolforklaringen «Øvd», «Ikke øvd ennå», «Eksamen» og «Tid igjen» (UX-DR11)
**Og** hvert emne har én linje i emnefargen, 4 px tykk, heltrukket fram til i dag og stiplet fram til eksamen
**Og** forelesningene er stasjoner etter dato, fylt når de er øvd og hule når de ikke er det, etter funksjonen fra story 5.1
**Og** eksamen er en svart firkant, og «I dag» er en pille med dato og loddrett nål

**Gitt** semesterlinja
**Når** den vises
**Så** står emnenavn, antall forelesninger og «Eksamen 04.12 · om 3 uker» til venstre for hver linje, med «Eksamen i dag» og «Eksamen var 04.12» som i story 5.3
**Og** antall uker kommer fra samme funksjon som i story 5.3 (gjenbrukes, ikke kopieres)

**Gitt** emnesiden (03)
**Når** siden vises
**Så** viser semesterlinja bare dette emnet, med ukenummer og dato ved stasjonene og eksamensdatoen ved firkanten, som i skisse 03
**Og** tekstlinja fra story 5.3 erstattes av linja

**Gitt** forelesningssiden (04)
**Når** siden vises
**Så** viser semesterlinja bare forelesningens emne, og denne forelesningen er merket med en ring rundt stasjonen, en nål og teksten «Du er her»

**Gitt** emnenes datoer
**Når** linja tegnes
**Så** starter den ved måneden med første forelesning og slutter ved måneden med eksamen, og på forsiden fra den tidligste til den seneste av disse for alle emner
**Og** dagens dato tas med i spennet, slik at «I dag» alltid kan vises
**Og** månedsoverlinjene lages fra spennet og er ikke låst til august–desember [AVGJØRES: E4]

**Gitt** et emne uten forelesninger
**Når** linja tegnes
**Så** har emnet ingen stasjoner, bare en stiplet linje fra i dag til eksamensfirkanten, og teksten til venstre sier «Ingen forelesninger ennå» [AVGJØRES: E6]

**Gitt** semesterlinja
**Når** en skjermleser leser siden
**Så** er grafikken skjult for skjermleseren, og det finnes en tekstlig versjon per emne, for eksempel «Markedsføring: 4 av 8 forelesninger øvd. Eksamen fredag 04.12, om 3 uker.»

**Gitt** et vindu ned til 768 px eller 200 % tekst
**Når** semesterlinja vises
**Så** blir det ingen vannrett rulling, månedsetikettene kan forkortes, og «I dag» og eksamen synes alltid

**Gitt** sidene 02, 03 og 04
**Når** Playwright-testene kjører
**Så** finner axe ingen brudd, og semesterlinja tar ikke tastaturfokus, siden den ikke har noe å trykke på

**Gitt** testene for storien
**Når** de kjøres
**Så** har de krav-ID i navnet, for eksempel `test_fr57_stasjoner_ovd`, `test_sk22_semesterlinje_uker`, `test_ux_dr11_du_er_her` og `test_ux_dr11_tekstlig_versjon` (AR-17)

### Dekning

| Krav | Story |
|---|---|
| FR-16 *(Kan kuttes)* | 5.2 |
| FR-57 *(Kan kuttes)*: reserven (tekst) | 5.3 |
| FR-57 *(Kan kuttes)*: semesterlinja | 5.5 |
| FR-58 *(Kan kuttes)* | 5.4 (egne merkede kriterier) |
| SK-20 («Neste å øve på») | 5.4, med «øvd» fra 5.1 |
| SK-22 | 5.3 og 5.5 |
| AR-9 («øvd» i én funksjon, emneøkt-regelen) | 5.1 |
| UX-DR7 (statusprikk øvd/ikke øvd) | 5.1 |
| UX-DR11 | 5.5 (teksten i 5.3) |
| UX-DR12 | 5.4 |
| UX-DR13 (tellinger og status) | 5.2 |
| UX-DR14 (SISTE ØKT) | 5.1 |
| E2 | 5.4 [AVGJØRES] |
| E4 | 5.5 [AVGJØRES] |
| E6 | 5.3 og 5.5 [AVGJØRES] |

### Spørsmål til Silje

1. **Uker til eksamen under én uke.** Avrunding til nærmeste uke (som skissene viser) gir «om 0 uker» når det er 1–3 dager igjen. Skal det da stå antall dager, for eksempel «om 3 dager»? Det er en ny tekst som ikke står i EXPERIENCE.md.
2. **Innhold som slettes etter en emneøkt.** En emneøkt teller for forelesninger som hadde innhold da den startet. Storien regner dette ut fra når innholdet ble laget. Slettes alt innholdet i en forelesning senere, mister den «øvd» fra emneøkter (men ikke fra økter på bare den forelesningen). Er det greit, eller skal appen lagre hvilke forelesninger økten gjaldt da den ble lagret? Det krever en ekstra tabell.
3. **Tekster som ikke står i EXPERIENCE.md:** grunnen «16 kort, sist øvd 03.11» når alle er øvd, «Hele emnet» i SISTE ØKT, og knappene «Ny forelesning» og «Last opp PDF» i NESTE STEG (E2). Godkjenner du dem?
4. **Sammendrag som innhold.** Storiene regner bare flashcards, quiz og fritekst som innhold for «øvd» og «Neste å øve på», siden et sammendrag ikke er en økt. Stemmer det?
5. **Hvor funksjonen for «øvd» lages.** Kontrakten sier at epic 5 *bruker* funksjonen, men epic 3 lister den ikke blant det den leverer. Storien 5.1 lager den derfor. Skal den heller ligge i epic 3?
