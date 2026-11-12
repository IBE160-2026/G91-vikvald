# Beslutninger

Viktige valg med begrunnelse. Nyeste først.

| Dato | Beslutning | Begrunnelse | Spor |
|---|---|---|---|
| 2026-11-13 | Nye suksesskriterier: SK-21 tester reglene for mock-modellen, SK-22 tester semesterlinja, og SK-18 vurderer om semesterlinja hjalp. | Tilbakemeldingen påpekte at hovedideen «bygd for semesteret» knapt ble målt. Ingen nye funksjoner, bare tester av det som skal bygges. | `5c1d60f` |
| 2026-11-13 | Stikkprøvene (SK-13 til SK-17) vurderes av meg mot læreboka, ikke av KI. Kort jeg er usikker på etter å ha slått opp, teller som faglig feil. | KI skal ikke bedømme sitt eget arbeid, og usikre kort skal ikke tolkes i min favør. Jeg har fagbakgrunn i markedsføring. Svar på refleksjonsspørsmål i tilbakemeldingen. | `f5c6c82` |
| 2026-11-12 | Modellkort er flashcards. De øves i flashcard-økten, uten egen rad, og «Lag modellkort» står på Flashcards-raden. Huskeregler er ikke en øktype. | Huskeregelen er bare en hjelp til å huske punktene på kortet. PRD-en sa allerede at modellkort er en type flashcard; UX-designet hadde en egen rad som ikke stemte. Mindre å bygge. | `4d303ac`, `16e7f99` |
| 2026-11-12 | En økt lagres bare når minst ett kort er markert eller ett spørsmål besvart. Første markering på hvert kort teller i resultatet. | Ellers regnes forelesningen som øvd uten øving, og en fullført økt ville alltid vist at alt satt. Svar på tilbakemelding 4.4. | `4d303ac` |
| 2026-11-12 | Mock-modellen lager innhold fra definisjonssetninger («er»/«is») og punktlister etter faste regler, på norsk og engelsk. | Gjør demomodus testbar og forutsigbar. Testmaterialet fra OpenStax er på engelsk. Svar på tilbakemelding 4.3. | `c201381` |
| 2026-11-12 | Plan B: er det ikke bekreftet innen 14. november at Gemini-bruken trekkes fra prøvekreditten (#8), leveres appen med demomodus alene. | Tilbakemeldingen pekte på manglende reserveplan. Vertex-kall virket allerede 2026-11-05, så det uavklarte er kostnaden. Fristen er satt før 15. november. | `9e61265` |
| 2026-11-12 | Milepæler 14.11, 27.11, 1.12 og 5.12, og kuttrekkefølge: kan kuttes-krav, bør ha bakfra, så Safari og automatisk UU-test på bare tre sider. | Tilbakemeldingen sa at omfanget er stort og at de tyngste kravene ikke kunne kuttes. Funksjoner kuttes før kvalitet og testing. | `9e61265` |
| 2026-11-11 | Semesterlinje, «Neste å øve på», hurtigtastoversikt og ferdigmelding på andre sider er merket «kan kuttes» i PRD-en. | Faglærer advarte mot omfang. Kjerneflyten virker uten dem, og semesterlinjen har tekst som reserve. | `2ff0218` |
| 2026-11-11 | Rediger og slett kort og spørsmål skjer under øving, uten egen listeside. | Feil oppdages mens jeg øver og sjekker kilden. Én side mindre å bygge. | `2ff0218` |
| 2026-11-11 | Et emne har eksamensdato (påkrevd). | Semesterlinjen viser tiden til eksamen, som var det jeg likte best. | `2ff0218` |
| 2026-11-11 | Appen lagrer dato, type og resultat for hver øvingsøkt, men ikke enkeltsvar. | Uten det kan appen ikke vise hva som er øvd. PRD-en sa før at ingenting lagres. | `2ff0218` |
| 2026-11-11 | Designretning: F2-V1 «Signaturfarge». Utformingen fra F2 (ryddig, presis, SF Pro/Inter) med én egen merkefarge (ultramarin) på hovedknapper, handlinger, valgt rad og «I dag». | Ryddig og oversiktlig, og merkefargen løser at alt var «i samme tone». Valgt etter ti konsepter, seks hybrider, tre ferdigstilte varianter og fire fargevarianter. | `790efa7` |
| 2026-11-11 | «Lag fritekstspørsmål» og «Lag sammendrag» blir omrissknapper. Bare «Øv nå» er svart på forelesningssiden. | Svart knapp bare for det Klara gjør oftest, så siden blir roligere. | Hybrid F, side 04 |
| 2026-11-10 | Hybrid F er det forslaget jeg liker best så langt. Det er ikke valgt som endelig designretning. | Oversiktlig og rolig, og tidslinjen viser tiden til eksamen. Rettet 2026-11-11: KI hadde ført dette opp som et endelig valg. | `2c00ce9` |
| 2026-11-10 | UX starter med ti vidt forskjellige designkonsepter for alle sidene, før én retning velges og detaljeres. | Jeg vil se reelle alternativer før jeg velger, slik at jeg kan begrunne designvalget (design teller 10 %). | `44a7164` |
| 2026-11-09 | Ny tidsplan: kjerneflyten virker 27. november, og appen er ferdig 5. desember. Rapporten skrives 6.–13. desember. | Justert tidsplan. Funksjoner kuttes fortsatt før kvalitet. | Brief og PRD |
| 2026-11-09 | Konfidensnivå: appen viser ikke språkmodellens egen sikkerhet, men bygger på kontroller som kan sjekkes (kilde, kontroll før lagring, stikkprøver). | Språkmodeller vurderer ikke sin egen sikkerhet pålitelig. Faglærer ba om en beslutning. | `b3c1e24` |
| 2026-11-09 | Ett detaljnivå på sammendrag. | Lavest prioritet, og tre nivåer gir tre varianter å teste. Faglærer ba om en beslutning. | `b3c1e24` |
| 2026-11-09 | Googles logging av forespørsler godtas med tiltak: vilkårstekst og ingen personopplysninger (#2). | Studienotater er lite sensitive, dataene behandles i EU, og demomodus sender ingenting ut. | `62a095c` |
| 2026-11-09 | Universell utforming etter WCAG 2.1 nivå AA, PC ned til 768 piksler. | Standarden norsk regelverk bruker. Teller i designkriteriet. | `62a095c` |
| 2026-11-09 | Sky i EU, ikke lokal modell. Konkret Gemini-modell velges i arkitekturen. | Ollama er svakere på norsk. Demomodus dekker kjøring uten skytjeneste. | `8dac0a2` |
| 2026-11-09 | Huskeregler er forbokstavregel på modellkort, en type flashcard. Ingen regel når alle punktene har samme forbokstav. | Min egen læringsmetode, og aktiv øving. «PPPP» hjelper ikke. | `8dac0a2` |
| 2026-11-09 | Studenten kan slette kontoen og alt innhold. Ingen e-postbekreftelse eller «glemt passord». | Rett til sletting etter GDPR. E-post krever en tjeneste med nøkkel, som sensor ikke skal trenge. | `d7bd827` |
| 2026-11-09 | Nøkkelbegreper blir begrepskort, og fritekst med selvvurdering blir bør ha nr. 7. | Aktiv øving, mindre å bygge. KI-vurdering av fritekst har usikker kvalitet og er første utvidelse. | `69e4340` |
| 2026-11-09 | Bare PDF i MVP. Word avvises med beskjed om å lagre som PDF. | Kilden skal vise side, og Word-filer har ikke faste sider. | `69e4340` |
| 2026-11-09 | Appen får en vilkårstekst der brukeren tar ansvar for materialet de laster opp. | Faglærer bekreftet at dette er greit, og at appen ikke er ansvarlig for brukerens opplastinger. Blir et krav i PRD-en. | Issue #7 |
| 2026-11-05 | Prompts og korrigeringer lagres i denne mappen. Åpne punkter føres også i GitHub Issues. | Sensorveiledningen ser etter sporbar KI-bruk og organisert arbeid. | Denne mappen |
| 2026-11-05 | Foreslått stakk: Next.js med TypeScript, Auth.js, SQLite via Prisma, Vitest og Playwright. | Vanlig og godt dokumentert, og kan kjøres lokalt uten betalte kontoer. Valgt av KI fordi jeg ikke har forkunnskaper, og skal begrunnes nærmere i arkitekturen. | Se `.logs/` |
| 2026-11-05 | Appen er ferdig 4. desember. Funksjoner kuttes før kvalitet. | Del 2 teller 30 %. Prosjektet er vurdert som enkelt, så gjennomføringen teller mye. | `99f4ecd` |
| 2026-11-05 | MVP-en bruker tekst som standard, og bilde av siden der formler mangler. | Formler tegnet som vektorgrafikk forsvinner fra tekstuttrekket, men ble lest riktig fra bilde. | `70299cd` |
| 2026-11-05 | Markedsføring er hovedemne, og økonomi er formeltest. Repetisjonen simuleres. | Jeg kan vurdere markedsføring faglig, men har ikke et passende emne dette semesteret. | `22ecb39` |
| 2026-11-05 | Foiler brukes ikke som testmateriale. | Opphavsrett. Egne notater og åpent lisensiert materiale er nok. | `ec111dd` |
| 2026-11-05 | Intervjuer med medstudenter er erstattet av offentlige kilder. | Jeg kjenner ingen med puggefag. Grunnlaget er svakere, så begrensningen skal stå i PRD-en. | `2d18419` |
| 2026-10-29 | Hver story bygges på egen branch og flettes via pull request. | Sensorveiledningen ser etter organisert arbeidsflyt. | `research-temaer.md` |
| 2026-10-29 | Ikke publisering og bare PC i MVP. | Lokal kjøring er det som kreves, og det holder omfanget nede. Appen bør tåle ulike vindusstørrelser. | `research-temaer.md` |
| 2026-10-28 | Gemini på Vertex AI i EU er hovedvalg, med mock-modell for demomodus. | Krav om data i EU og ingen trening. Azure-kvote i EU ble avslått. | `4ae8e4e` |
