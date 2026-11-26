# Epic 9 Context: Sammendrag (bør ha)

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Studenten skal kunne repetere en forelesning raskt: trykke «Lag sammendrag» og få 5 til 15 hovedpunkter ordnet etter tema, med fil og side som kilde på hvert punkt, lese det som en artikkel og lage et nytt som erstatter det gamle. Sammendraget er ikke en økt og gjør ikke forelesningen øvd. Epicen er en bør ha-funksjon bak bryteren `FEATURE_SUMMARY`. Den bygges sist og kuttes først.

## Stories

- Story 9.1: Lag sammendrag av en forelesning
- Story 9.2: Les sammendraget og lag et nytt

## Requirements & Constraints

- All tekst i grensesnittet og alt generert innhold er på norsk bokmål. Fagbegreper fra notatene brukes slik de står, og engelsk står i parentes når notatene bruker begge.
- Et sammendrag har 5 til 15 punkter, ordnet etter tema. Hvert punkt har høyst 50 ord og viser fil og side det kommer fra. Sidetall er PDF-sidenummeret, telt fra første side. Innholdet lages bare fra forelesningens filer.
- Hvert punkt kontrolleres før lagring. Det forkastes og telles hvis teksten eller temaet er tomt, teksten har over 50 ord, eller siden ikke finnes i fila. Er det over 15 gyldige punkter, lagres de 15 første, og resten telles som forkastet.
- Består færre enn 5 punkter, feiler jobben med `TOO_FEW_SUMMARY_POINTS`. Ingenting lagres, og det gamle sammendraget står urørt. Meldingen er «Notatene ga ikke grunnlag for et sammendrag med minst 5 punkter. Det gamle sammendraget er beholdt.»
- Feiler kallet eller tar det over 3 minutter, lagres ingenting, og det gamle beholdes. Meldingen er «Vi klarte ikke å lage sammendraget. Ingenting er lagret. Prøv igjen.», med «Prøv igjen».
- Et nytt sammendrag erstatter det gamle i én transaksjon, så det aldri finnes to eller et halvt sammendrag.
- Mock-modellen (demomodus er standard) lager ett punkt per side: første setning på siden, med fil og sidetall som kilde. Temaet er filnavnet, altså ett tema per fil. Samme filer gir alltid samme sammendrag.
- Å lese sammendraget lagrer ingen økt og gjør ikke forelesningen øvd.
- Er bryteren av, skjules Sammendrag-raden, `GET …/summary` og jobber med `kind: "summary"` svarer `404 FEATURE_DISABLED`, sammendragssiden viser «Fant ikke siden», og seed lager ikke sammendrag.
- Tester har krav-ID i navnet (`test_fr53_…`, `test_fr54_…`, `test_fr55_…`, `test_ar7_summary_…`, `test_fr56_summary_not_session_…`). Sidene skal ha null axe-brudd, og alt kan brukes med bare tastatur.

## Technical Decisions

- Tabellene `summaries` (`id`, `lecture_id` unik med `ON DELETE CASCADE`, `created_at`) og `summary_points` (`id`, `summary_id` med `ON DELETE CASCADE`, `theme`, `position`, `text`, `file_id`, `page_no`, `formula_flag`) opprettes med Alembic. SQL-en må virke både på Postgres og på SQLite i pytest. Bare modulen `content` skriver til tabellene.
- Sammendraget hører til forelesningen, ikke til fila. Punktene lagrer `file_id` og `page_no` bare som kilde. Slettes eller erstattes en av forelesningens filer, slettes hele sammendraget i samme transaksjon, gjennom en funksjon i `content` som `files` kaller. Sletting av forelesning, emne eller konto skjer gjennom kaskaden.
- Generering bruker samme jobbløp som de andre innholdstypene, med `kind = "summary"`: hent sidetekst, kall porten, kjør `validate_item` per element, forkast og tell, og lagre de gyldige i én transaksjon. I motsetning til kort og spørsmål erstatter sammendraget det gamle i stedet for å legges til. Jobben startes med `POST /api/lectures/{id}/jobs` og svarer `202`. Pågående jobb gir `409 JOB_ALREADY_RUNNING`. Bare `generation` kaller språkmodellen.
- `VertexGenerator` trenger en egen instruks og et løst output-skjema for `summary`. Instruksen sier: bruk bare stoffet på sidene, lag 5 til 15 hovedpunkter ordnet etter tema med en kort tematittel, høyst 50 ord per punkt, oppgi fil og PDF-sidenummer, og skriv på bokmål med fagbegrepene fra notatene. Testen for instruksen kaller ikke Google.
- Innholdstypen `summary` meldes inn i registeret for innholdstyper og i registeret for `delete-preview`, slik at slettebekreftelser teller sammendraget.
- Lesing skjer med `GET /api/lectures/{id}/summary`, som gir temaer og punkter i lagret rekkefølge. Mangler sammendraget, eller tilhører forelesningen en annen bruker, svarer ruten `404 NOT_FOUND`.
- Feil har formen `{"error": {"code", "details"}}`, og hver kode har en norsk melding i meldingsfila i frontend. Generert innhold vises som ren tekst.
- `seed_if_empty` lager et sammendrag for minst én forelesning i eksempelemnet gjennom de vanlige tjenestene med mock-modellen, og den forelesningen har minst 5 sider med tekst. README sin liste over brytere forklarer `FEATURE_SUMMARY`.

## UX & Interaction Patterns

- På forelesningssiden har «Lag og øv» raden «Sammendrag» (`create-row`). Uten sammendrag viser den «Ikke laget» og omrissknappen «Lag sammendrag», som starter jobben direkte uten dialog. Med sammendrag viser den antallet punkter («7 punkter») og knappen «Les sammendrag», som åpner sammendragssiden (skisse 13). Uten filer er knappen ikke aktiv.
- Mens jobben går, viser `job-status` «Lager sammendrag …» og «Du kan bruke resten av appen imens.», og de andre «Lag …»-knappene sier «Venter til sammendraget er ferdig». Status leses opp ved start og slutt.
- Sammendragssiden har sidemeny med forelesningen valgt, h1 «Sammendrag» og en undertekst som «7 punkter i 3 temaer · laget 10.11.2026 fra 2 filer». Teksten står i en artikkelkolonne på 568 px. Temaene er seksjonstitler (h2), med punktene under i lagret rekkefølge. Hvert punkt viser kilden som tekst (`source-link`, for eksempel «merkevare-notater.pdf, side 4»), og formelmerket når punktet har det.
- Innholdskortet til høyre viser INNHOLD (temaer og antall punkter), KILDER (filer og antall sider), knappen «Lag nytt sammendrag» med teksten «Det nye sammendraget erstatter dette. Det gamle blir ikke lagret.», og merknaden «Sammendraget er laget av en språkmodell. Sjekk viktige punkter mot kilden.» på merknadsflaten (`note-surface`).
- Ved «Lag nytt sammendrag» står det gamle sammendraget på siden til det nye er ferdig, og knappen byttes med `job-status`. Feiler jobben, står det gamle urørt med feilmeldingen og «Prøv igjen».
- Slettebekreftelsen tar med sammendraget som «… og sammendraget av forelesningen».
- Sammendragssiden har én h1, landemerker og en tab-rekkefølge som følger leserekkefølgen. En side som ikke finnes, eller en avslått bryter, viser «Fant ikke siden».

## Cross-Story Dependencies

- Epicen bygger på grunnmuren fra epic 3: jobbløpet, `job-status`, registeret for innholdstyper og `delete-preview`, og på slettingen av filer fra epic 2.
- Fra epic 6 gjenbrukes oppsettet for Vertex og instruksene til modellen, og seed-oppsettet for eksempelemnet.
- 9.1 bygges før 9.2. I 9.1 viser raden bare antallet punkter, og lenken «Les sammendrag» og sammendragssiden kommer i 9.2.
- «Øvd»-utregningen i `practice` skal ikke endres: sammendrag er ikke en økt.
