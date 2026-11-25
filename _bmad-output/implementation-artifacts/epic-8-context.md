# Epic 8 Context: Fritekstspørsmål med selvvurdering (bør ha)

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Studenten skal kunne øve som på eksamen: be om kortsvar- eller langsvarsspørsmål med modellsvar fra en forelesning, skrive svaret selv, se modellsvaret med kilde og vurdere seg selv som Feil, Delvis riktig eller Riktig. Øktresultatet lagres slik at det teller med i «øvd»-oversikten, men studentens egne svar lagres aldri. Epicen er en bør ha-funksjon bak bryteren `FEATURE_FREETEXT`. Den bygges etter epic 7 og kuttes før epic 7 hvis tiden blir knapp.

## Stories

- Story 8.1: Lag fritekstspørsmål
- Story 8.2: Øv på fritekst og vurder deg selv
- Story 8.3: Fritekst for hele emnet, og slett dårlige spørsmål

## Requirements & Constraints

- All tekst i grensesnittet og alt generert innhold er på norsk bokmål. Fagbegreper fra notatene brukes slik de står, og engelsk står i parentes når notatene bruker begge.
- Type er kortsvar eller langsvar. Omfanget er rask (inntil 5), vanlig (10) eller dyp (15). Nye spørsmål legges til dem som finnes fra før.
- Innholdet lages bare fra forelesningens filer. Gir stoffet grunnlag for færre enn valgt, lages færre, og studenten får beskjed om det.
- Hvert element kontrolleres før lagring: spørsmål og modellsvar er ikke tomme, og sidetallet finnes i fila. Det som ikke består, forkastes og telles. Sidetall er PDF-sidenummeret, telt fra første side.
- Feiler genereringen eller tar den over 3 minutter, lagres ingenting, antallet er uendret, og studenten får feilmeldingen med «Prøv igjen».
- Mock-modellen (demomodus er standard) lager «Forklar [begrep].» per definisjonssetning, med hele setningen som modellsvar og siden som kilde. Samme fil gir alltid samme resultat. «+ Lag flere» hopper over spørsmål med samme tekst som forelesningen har fra før. Rekkefølgen under øving er likevel tilfeldig.
- Modellsvaret vises først når studenten har skrevet noe som ikke bare er mellomrom, og har valgt å se det. Hun vurderer seg selv etterpå. Enkeltsvar lagres ikke, bare øktresultatet: besvart, riktig, delvis og feil.
- En økt lagres bare når minst ett spørsmål er vurdert, også når hun avbryter.
- Hurtigtastene `1`/`2`/`3` (Feil/Delvis/Riktig) virker bare når selvvurderingen er synlig og aldri mens fokus står i et tekstfelt. Esc avslutter. Alt kan gjøres med bare tastatur, med synlig fokus.
- Riktig, delvis og feil vises med symbol eller tekst i tillegg til farge. Statusmeldinger leses opp av skjermleser.
- Er bryteren av, skjules radene og knappene, alle fritekst-rutene svarer `404 FEATURE_DISABLED`, og seed lager ingen fritekstspørsmål.
- Tester har krav-ID i navnet (`test_fr48_…` og lignende). Sidene skal ha null axe-brudd.

## Technical Decisions

- Tabellen `freetext_questions` (`id`, `file_id` med `ON DELETE CASCADE`, `kind` `short`/`long`, `question`, `model_answer`, `page_no`, `formula_flag`, `created_at`) opprettes med Alembic. SQL-en må virke både på Postgres og på SQLite i pytest. Bare modulen `content` skriver til tabellen. Spørsmålene hører til fila og slettes med den.
- Generering bruker samme jobbløp som de andre innholdstypene. Løpet henter sideteksten, kaller porten `generate(kind, pages, options)` med `kind = "freetext"`, kjører `validate_item` per element, forkaster og teller, og lagrer de gyldige i én transaksjon. Jobben startes med `POST /api/lectures/{id}/jobs` og svarer `202`. Er en jobb allerede i gang, svarer den `409 JOB_ALREADY_RUNNING`. Bare `generation` kaller språkmodellen.
- `VertexGenerator` trenger en egen instruks for fritekst og et løst output-skjema. Instruksen skal ikke lage spørsmål om modeller og lister, siden de øves med modellkort. Testen for instruksen kaller ikke Google.
- Den nye innholdstypen meldes inn i registeret for innholdstyper og i registeret for `delete-preview`, slik at slettebekreftelser teller fritekstspørsmål.
- Rutene er `GET /api/lectures/{id}/freetext-questions`, `GET /api/subjects/{id}/freetext-questions` og `DELETE /api/freetext-questions/{id}` (`204`). Hver rute filtrerer på brukeren via `current_user`, og andres data gir `404 NOT_FOUND`.
- Økten lagres via `POST /api/practice-sessions` med `kind = "freetext"` og feltene `shown`, `answered`, `correct`, `partial`, `wrong` og `aborted`. Tom `lecture_id` betyr hele emnet. Resultatet sendes én gang: når økten er ferdig, ved «Avslutt», ved navigering, før utlogging og ved `pagehide`. Øktlogikken ligger i frontend-modulen `practice`.
- Feil har formen `{"error": {"code", "details"}}`, og hver kode har en norsk melding i frontend. Generert innhold vises som ren tekst. Kilden har formen `source: {file_id, file_name, page_no}`.
- `seed_if_empty` lager fritekstspørsmål for minst én forelesning i eksempelemnet. Det skjer gjennom de vanlige tjenestene med mock-modellen. README sin liste over brytere forklarer `FEATURE_FREETEXT`.

## UX & Interaction Patterns

- På forelesningssiden har «Lag og øv» raden «Fritekstspørsmål» (`create-row`). Uten spørsmål viser den «Ingen ennå» og omrissknappen «Lag fritekstspørsmål». Med spørsmål viser den antallet, «Øv nå» og «+ Lag flere». Mens jobben går, viser `job-status` snurr og tekst, og de andre «Lag …»-knappene forklarer hvorfor de venter.
- Lag-dialogen gjenbruker dialogen for Lag quiz, uten vanskelighetsgrad. Type og omfang velges med valgkort, og «Kortsvar» og «Vanlig» er forhåndsvalgt. Piltaster flytter valget, Esc lukker uten endring, og knappene er «Avbryt» og hovedhandlingen.
- Fritekst-økten (skisse 12) bruker øktrammen med øktpanel og svarrutenett (✓/◐/✗), med innholdet sentrert i 832 px.
- Under økten står spørsmålet over tekstfeltet «Ditt svar», og fokus står i feltet. «Vis modellsvar» låser feltet og viser «Levert · N ord». Deretter vises `model-answer` med kilde og eventuelt formelmerket, og selvvurderingen «Hvordan gikk det?» med tre like omrissknapper uten forhåndsvalg.
- Når modellsvaret vises, flyttes fokus til overskriften «Modellsvar» (`tabindex="-1"`), aldri til en vurderingsknapp. Når hun har vurdert seg selv, går økten rett videre til neste spørsmål med fokus i «Ditt svar».
- Resultatsiden (`result-summary`) viser tre tall uten feiring. `missed-list` viser spørsmålene hun vurderte som Feil eller Delvis riktig, med modellsvar og kilde, men uten hennes eget svar. På resultatsiden starter Enter samme økt på nytt, og Esc går tilbake dit økten startet. «Avslutt økt» viser resultatet som avbrutt, for eksempel «Avbrutt etter 4 av 10». Er ingenting vurdert, går hun rett tilbake uten resultatside.
- På emnesiden får `practice-all-card` raden «Fritekstspørsmål» med «Start ›». Raden vises bare når emnet har fritekstspørsmål.
- Sletting under øving bruker slettebekreftelsen, der «Avbryt» har startfokus.

## Cross-Story Dependencies

- Epicen bygger på grunnmuren fra epic 3: jobbløpet, `job-status`, registeret for innholdstyper, `delete-preview`, øktrammen og øktlagringen.
- Fra epic 4 gjenbrukes Lag quiz-dialogen, quizkolonnen og `missed-list`.
- Fra epic 6 gjenbrukes oppsettet for Vertex og instruksene til modellen.
- Rekkefølgen innad i epicen er 8.1, så 8.2, så 8.3. «Øv nå» er skjult til 8.2 er bygd, og 8.3 utvider økten fra 8.2 til hele emnet og legger til sletting.
- «Øvd»-utregningen i `practice` må telle `freetext`-økter. En emneøkt teller for forelesninger som hadde fritekstspørsmål da økten startet.
