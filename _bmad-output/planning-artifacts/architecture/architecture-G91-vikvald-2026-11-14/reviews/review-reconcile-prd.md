---
title: 'Avstemming: arkitekturspine mot PRD og addendum'
reviewed: ARCHITECTURE-SPINE.md (2026-11-14, draft)
against: prd.md (2026-11-13, final), addendum.md (2026-11-09)
created: '2026-11-14'
---

# Avstemming: arkitekturspine mot PRD og addendum

## Konklusjon

Spinen dekker de store kravene godt (én jobb per forelesning, 3-minuttersgrense, ett genereringsløp, sidetekst ved opplasting, eierskap, demomodus, EU-endepunkt, modellnavn i `.env`). Men den har én regel som i praksis bryter FR-38 (AD-4), én intern motsetning i datamodellen (sammendrag eies av forelesningen, men AD-7 sier at innhold eies av fila), og flere stille krav som mangler. Der kan to moduler som bygges hver for seg, ende opp ulikt: vilkårsgodkjenning (FR-11), legge til eller erstatte (FR-22/33/55), formelmerket (FR-40/41), dobbel lagring av økter og hvilke felt jobben har.

Alvorlighet: **critical** = bryter et hardt krav slik regelen står, **high** = moduler vil nesten sikkert ende opp ulikt, **medium** = sannsynlig avvik, **low** = presisering.

## Funn

### F1 (critical): AD-4 bruker samme strenge skjema som `output_type` og som kontroll. Det bryter «forkast og tell» i FR-38

- **Krav:** FR-38, FR-18, SK-4 og addendum («kontroller i kode»). Elementer som ikke består, skal *forkastes og telles*, og resten skal lagres.
- **Spinen:** «Skjemaet for hver innholdstype defineres én gang som en Pydantic-modell, som brukes både som `output_type` mot modellen og som kontroll.»
- **Problem:** Er `output_type` den strenge modellen (for eksempel nøyaktig fire alternativer og `min_length` på felt), validerer pydantic-ai hele svaret samlet. Ett ugyldig element gir en ny runde mot modellen, og til slutt `UnexpectedModelBehavior`. Da feiler hele jobben i stedet for at det ene elementet forkastes. SK-4 (mock som med vilje gir ugyldige svar, og der studenten skal få beskjed om at det ble laget *færre*) vil da vise feilmeldingen fra FR-21 i stedet. Sidetallssjekken krever i tillegg å vite hvilke sider fila har, og det kan ikke uttrykkes i et fast skjema.
- **Rettelse:** Del opp i to modeller per innholdstype. (1) En løs *transportmodell* for `output_type`: liste av elementer med valgfrie og ubegrensede felt, slik at svaret alltid kan leses. (2) En streng *kontrollfunksjon* `validate_item(item, file_pages) -> Item | Rejected` som kjøres per element etter kallet. Den sjekker sidetall, nøyaktig fire alternativer, gyldig indeks for riktig svar, påkrevde felt og forbokstaver (FR-45). Skriv i AD-4 at bare et kall som ikke kan leses i det hele tatt, eller som går over tidsgrensen, gir «feilet». Ugyldige elementer gir «ferdig, med N forkastet».

### F2 (high): Legge til eller erstatte er ikke fastsatt, og sammendraget står i strid med AD-7

- **Krav:** FR-22, FR-33 og FR-48 sier at nytt innhold *legges til*. FR-55 sier at nytt sammendrag *erstatter* det gamle. FR-21 sier at ingenting endres hvis kallet feiler.
- **Spinen:** AD-4 sier bare «lagres i én transaksjon». ER-diagrammet har `LECTURE ||--o| SUMMARY`, altså ett sammendrag per forelesning, og `FILE ||--o{ SUMMARY_POINT`. AD-7 sier at «generert innhold er knyttet til fila det kom fra, og forsvinner med den».
- **Problem:** (a) Ingen regel sier at sammendrag skal slette det gamle. En som bygger på mønsteret for flashcards, vil legge til. (b) Hvis det gamle sammendraget slettes *før* jobben, bryter det FR-21 når kallet feiler. (c) Slettes én fil, forsvinner punktene derfra, mens selve sammendraget blir stående med kanskje under 5 punkter. Det bryter FR-53 (5–15 punkter) og gjør opptellingen i FR-12 (`delete-preview`) uklar.
- **Rettelse:** Legg til i AD-4: «flashcard, quiz_question og freetext_question: nye rader legges til. summary: det gamle sammendraget slettes og det nye settes inn i *samme* transaksjon, først etter at kontrollen er bestått. Feiler jobben, står det gamle urørt.» Bestem i AD-7 at et sammendrag gjelder hele forelesningen og slettes helt når en fil i forelesningen slettes eller erstattes. Alternativt kan punktene beholde `file_id` bare som kilde, uten kaskadesletting. Velg én løsning, og la `delete-preview` telle sammendraget.

### F3 (high): FR-11 (vilkårsgodkjenning) er ikke dekket

- **Krav:** FR-11 og NFR-6. Studenten må godta vilkårene før første opplasting.
- **Spinen:** Nevnes ingen steder. FR-11 står i tabellen over krav og moduler (FR-8 til FR-13 under `files`), men ingen regel og ikke noe felt dekker det.
- **Problem:** Uten en lagret godkjenning vil frontend sannsynligvis løse det med `localStorage` eller som tilstand i én dialog. Da vises vilkårene på nytt i en ny nettleser, og backenden tar imot opplastinger som ikke er godkjent. Det bryter AD-1, som sier at backenden eier logikken.
- **Rettelse:** Legg til `users.terms_accepted_at` (datetime, kan være tom), og gjerne `terms_version`. Lag `POST /api/identity/accept-terms`. Opplastingsruten i `files` avviser med `TERMS_NOT_ACCEPTED` (AD-12) når feltet er tomt. Teksten i vilkårene ligger i frontend (AD-12).

### F4 (medium): Merket for formler (FR-40/41) mangler i skjemaet og i `file_pages`

- **Krav:** FR-40 sier at sider der formler mangler i teksten, sendes som bilde. FR-41 sier at innhold fra slike sider, *eller* der modellen melder at noe mangler, får merket «Inneholder formel – sjekk mot kilden».
- **Spinen:** Selve regelen er utsatt (#9). Det er greit. Men spinen sier ikke *hvor* merket ligger.
- **Problem:** Hver innholdstype (kort, quiz, fritekst, sammendragspunkt) vil ellers løse merket på sin måte, eller ikke i det hele tatt. Hvis det ikke er bestemt om avgjørelsen om bilde tas ved opplasting eller ved generering, kan opplasting og generering bruke ulike regler.
- **Rettelse:** Legg til i AD-6 at `file_pages` får `needs_image bool`, som settes ved opplasting med regelen fra #9. Legg til i AD-4 at hver innholdsmodell har `formula_flag bool`. Det settes i kode når kildesiden har `needs_image`, eller når transportmodellen har `missing_content: true` fra språkmodellen. Feltene lages fra starten, selv om FR-40/41 kuttes (da er de alltid `false`).

### F5 (medium): Feltene i jobben og hvordan ferdigmeldingen hentes er ikke fastsatt

- **Krav:** FR-18 (beskjed om at det ble laget færre *enn valgt*), FR-21 (meldingen nevner innholdstypen), FR-47 (ingen modeller funnet) og NFR-17 (kort melding på *andre* sider).
- **Spinen:** AD-5 har status, antall laget og antall forkastet, og frontend spør etter status «mens jobben pågår».
- **Problem:** Uten `kind` og `requested` kan frontend ikke vise «laget 14 av 20 flashcards» eller riktig feilmelding. Uten et felles endepunkt for brukerens aktive jobber vil hver side lage sin egen polling, og meldingen på andre sider blir borte eller vist to ganger.
- **Rettelse:** Utvid AD-5 med feltene `kind`, `requested`, `created`, `discarded`, `error_code`, `started_at` og `finished_at`. Lag én rute, `GET /api/generation/jobs?active_or_recent=1`, som spørres fra én global hook i rot-layouten. Den står for meldingen (sonner) på andre sider. La 3-minuttersgrensen gjelde hele jobben, ikke bare modellkallet.

### F6 (medium): Lagring av en økt kan skje to ganger (AD-9)

- **Krav:** FR-56 sier at hver økt lagres *én* gang, også når den avbrytes.
- **Spinen:** Resultatet sendes når økten er ferdig, ved «Avslutt» *eller* ved `pagehide`.
- **Problem:** Hvis studenten fullfører økten og deretter lukker fanen, eller trykker «Avslutt» og navigerer bort, sendes resultatet to ganger. Det gir doble økter i «øvd» og i semesterlinja.
- **Rettelse:** Frontend lager en UUID for økten ved start. Backenden bruker den som primærnøkkel med `INSERT … ON CONFLICT DO NOTHING`, i tråd med konvensjonen som allerede finnes i spinen.

### F7 (medium): Hva mock-porten får inn er uklart (NFR-2a og AD-3)

- **Krav:** NFR-2a og SK-21. Mocken lager innhold ut fra sideteksten, og samme fil gir samme resultat.
- **Spinen:** «Bare `generation` kaller modellen, gjennom pydantic-ai.» Mocken nevnes, men ikke hva den tar imot.
- **Problem:** Lages mocken som `FunctionModel` i pydantic-ai, må den lese sideteksten ut av instruksene til modellen. Da blir mocken avhengig av hvordan instruksene er skrevet, og de er utsatt til storyen for hver innholdstype. Blir instruksene endret, brytes SK-21.
- **Rettelse:** Definer porten i appen, over pydantic-ai: `generate(kind, pages: list[FilePage], options) -> TransportResult`. `VertexGenerator` bruker pydantic-ai, og `MockGenerator` bruker reglene i NFR-2a direkte på `pages`. Varianten som gir ugyldige svar (SK-4), er en tredje implementasjon av samme port.

### F8 (low): Brukerens egen huskeregel (FR-46) og kontrollen i FR-45

- **Problem:** Det er ikke sagt om kontrollen av forbokstaver også skal gjelde når studenten skriver sin egen huskeregel. Gjør den det, kan hun ikke lagre en egen huskeregel (for eksempel et ord), og FR-46 blir umulig å oppfylle.
- **Rettelse:** Én linje i AD-4: «Kontrollene gjelder bare generert innhold. Redigering gjort av studenten (FR-27, FR-46) kontrolleres bare for påkrevde felt.»

### F9 (low): Tenkenivå og mellomlagring er ikke navngitt som innstillinger (addendum og NFR-4/5)

- Spinen sier at tenkenivået er «bare innstillinger i `.env`», men gir ingen navn på dem. Gi dem navn i AD-3 og AD-11, for eksempel `VERTEX_THINKING_BUDGET`, slik at `.env.example` viser dem (NFR-4).
- At mellomlagring er slått av (NFR-5), er en innstilling i Google Cloud-prosjektet og ikke noe koden gjør. Skriv at README skal dokumentere steget og hvordan det sjekkes. Ellers finnes det ikke spor av at kravet er oppfylt.

### F10 (low): Skjermleser og språk (NFR-12)

- AD-12 binder NFR-12, men har ingen regel for det. Legg til i Konvensjoner: `<html lang="nb">` i rot-layouten, at alle statusmeldinger går gjennom én kanal (sonner eller en felles `aria-live`-region), og at jobbstatus på forelesningssiden ligger i en `role="status"`-region. Da gjør ikke hver modul dette på sin egen måte.

### F11 (low): Mindre unøyaktigheter

- **FR-2** (norsk i generert innhold) står under «frontend» i tabellen over krav. Kravet hører til `generation` (instruksene), og FR-1 hører til frontend.
- **AD-11:** Si at backenden også avviser generering for funksjoner som er slått av (`FEATURE_DISABLED`), ikke bare at frontend skjuler knappene.
- **Addendum, foreslått stakk** (Next.js + Auth.js + Prisma + SQLite): Avviket er begrunnet i `.memlog.md`, men addendumet ber om at det begrunnes «i arkitekturen». Én setning i spinen under Designparadigme, med lenke til `beslutninger.md`, er nok.
- **FR-53** (5–15 punkter): Si i AD-4 hva som skjer når færre enn 5 punkter består kontrollen. Det kan for eksempel regnes som «feilet», så det gamle sammendraget beholdes.

## Sjekket og funnet i orden

- NFR-17, én jobb per forelesning: AD-5, med delvis unik indeks.
- FR-21, 3 minutter og ingenting lagret: AD-4, med `wait_for` og én transaksjon.
- FR-39 og NFR-16, PDF-sidenummer og grensen på 50 sider: AD-6.
- FR-4, FR-5, FR-12–FR-14, eierskap og kaskadesletting: AD-2 og AD-7.
- NFR-2, NFR-3, NFR-4, demomodus, seed og én bryter: AD-3, AD-11 og AD-14.
- NFR-5, EU-endepunkt og ikke det globale: AD-3.
- Addendum, modellnavn i `.env` og ADC: `VERTEX_MODEL` og montering av gcloud.
- FR-56–FR-58, økter og beregning av «øvd» i backend: AD-9 (se F6).
- NFR-7, bcrypt: AD-10.

## Motsetninger mellom spinen og PRD-en

1. AD-4 (strengt `output_type`) mot FR-38 og SK-4. Se F1.
2. ER-diagrammet (sammendrag hører til forelesningen) mot AD-7 (innhold eies av fila) og FR-53. Se F2.

Utover dette er ingen regler i direkte strid med PRD-en. Minstelengden på 8 tegn for passord (AD-10) står ikke i PRD-en, men er ikke i strid med den.
