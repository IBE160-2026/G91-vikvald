# Beslutninger

Viktige valg med begrunnelse. Nyeste først.

| Dato | Beslutning | Begrunnelse | Spor |
|---|---|---|---|
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
