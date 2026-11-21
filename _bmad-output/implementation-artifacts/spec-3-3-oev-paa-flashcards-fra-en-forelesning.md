---
title: 'Story 3.3: Øv på flashcards fra én forelesning'
type: 'feature'
created: '2026-11-21'
baseline_revision: '9a8784f23a3f2d3715732000419339cab8d02712'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Studenten kan lage flashcards (3.1, 3.2), men ikke øve på dem: «Øv nå» er ikke aktiv (#135), det finnes ingen rute som gir kortene, og ingen økt (story 3.3 i `epics.md`: FR-19, FR-20, FR-23, FR-24, FR-25, NFR-10, UX-DR8, UX-DR9, UX-DR27, UX-DR36).

**Approach:** Backenden får `GET /api/lectures/{id}/flashcards` med kilde. Frontenden får modulen `practice` (rene funksjoner for blanding og «Kunne ikke bakerst», øktpanelet med adapter, svarrutenettet), den felles `source-link`, flashcard-økten på `/forelesninger/<id>/flashcards`, og «Øv nå» blir aktiv.

## Boundaries & Constraints

**Always:**
- **Rute (`content/router.py`):** `GET /api/lectures/{id}/flashcards` med `current_user` og `get_lecture` (andres, ukjent eller ugyldig id → `404 NOT_FOUND`). Svar: liste med `{id, kind, front, back, source: {file_id, file_name, page_no}}`, bare `PLAIN_FLASHCARD_KINDS` (samme som tellingen), sortert på fil (`File.created_at`, `File.id`), så `page_no`, så `Flashcard.created_at`, `Flashcard.id`. `file_name` er `File.original_name`. Ny tjenestefunksjon i `content/service.py`.
- **Ren øktlogikk (`frontend/modules/practice/session.ts`, Vitest):** `shuffle(items, random = Math.random)` (Fisher–Yates, ny liste), `startSession(ids)`, `markCurrent(state, "known" | "missed")`, og avledninger. Tilstand: `order` (blandet, låst), `queue` (gjeldende er `queue[0]`), `firstMarks` (første markering per kort teller), `shown` (ulike kort vist). «Kunne» fjerner kortet fra køen; «Kunne ikke» legger det bakerst, så det kommer igjen etter at alle andre er vist én gang, til det markeres «Kunne». Ferdig når køen er tom. Teller = antall ulike viste kort, aldri over totalen. Repetisjon = alle kort er vist og køen er ikke tom; «Repeterer: N kort igjen» med N = køens lengde.
- **Øktpanel (`modules/practice/components/session-panel.tsx`):** tar en adapter (`PracticeAdapter` i `modules/practice/adapter.ts`: `kindLabel`, tekst for tellingene, symbolforklaring for pågående og ferdig økt, tekst per rute). `flashcardAdapter` gir «Flashcards», «Kunne 5 · Kunne ikke 1», forklaringen «Kunne», «Kunne ikke, kommer igjen», «Ikke vist ennå» (ferdig: «Kunne», «Kunne ikke, repetert»), og ruteteksten «kunne»/«kunne ikke». Panelet: 288 px, `paper`, hårlinje til høyre, overlinje ØKT (`aria-hidden`), `h1` «Flashcards», emneprikk + forelesningsnavn, teller «7» (`session-counter`) + «/ 24», fremdriftsstolpe (shadcn `progress`, `brand` på `progress-track`, navn via `aria-labelledby` på telleren), tellelinjen, rutenettet, forklaringen og omrissknappen «Avslutt økt» nederst. Ferdig: alle ruter fylt, ferdigforklaringen, ingen «Avslutt økt».
- **Svarrutenett (`modules/practice/components/answer-grid.tsx`):** `<ol>`, seks ruter per rad (35 px, 6 px mellomrom, `rounded-sm`), ikke knapper. ✓ på `success-tint`, ✗ på `danger-tint` (første markering), gjeldende hvit med 1,5 px `brand`-kant og nummer (`aria-current="step"`), ikke vist tom med `border-card` og nummer. Hver rute har skjult tekst «Kort 4: kunne ikke», «Kort 2: kunne», «Kort 9: ikke vist ennå»; synlig innhold er `aria-hidden`. Over 120 kort vises ikke rutenettet og heller ikke forklaringen.
- **`components/source-link.tsx`:** filikon (`FileText`, `aria-hidden`) og «merkevare-notater.pdf, side 4» i `text-caption`, `text-ink`, ingen lenke, ingen understreking. Sidetallet er `page_no`.
- **Flashcard (`modules/practice/components/flashcard.tsx`):** hvitt, 768 px maks, `rounded-xl`, `border-card`, `float`-skygge. Overlinjen SPØRSMÅL og forsiden (`card-question`). Ikke snudd: baksiden finnes ikke i DOM-en, knappen «Snu kortet» (omriss) i kortet, klikk på kortet snur også. Snudd: hårlinje, overlinjen SVAR, baksiden (`card-answer`), hårlinje og `source-link` nederst. Ingen animasjon. Tekst vises som ren tekst. Under kortet: «Kunne ikke» (omriss, ✗-ikon) og «Kunne» (hoved, ✓-ikon), begge 208 px brede og 48 px høye, `disabled` til kortet er snudd. Begrepskort og spørsmålskort vises likt.
- **Fokus (nok til Tab og Enter, 3.4 bygger videre):** etter snuing går fokus til «Kunne»; etter markering til «Snu kortet» på neste kort; ved ferdig økt til overskriften «Økten er ferdig».
- **Øktsiden (`modules/practice/pages/flashcard-session-page.tsx`, rute `app/(app)/forelesninger/[lectureId]/flashcards/page.tsx`):** henter forelesningen, emnet (emneprikk) og kortene (`["lectures", id, "flashcards"]`). Kortlisten blandes og låses i komponenttilstand når den er hentet første gang; senere omhenting endrer ikke økten (E41). Panelet der sidemenyen er, kortet sentrert i området til høyre. Fanetittel «Flashcards – <forelesning> – Studiekamerat». Andres eller ukjent forelesning → «Fant ikke siden» (`notFoundOnMissing`). Andre feil → reserveteksten i `role="alert"`.
- **Tom økt (A15/E1):** ingen kort → ingen panel og ingen økt; `h1` «Det finnes ingen flashcards her ennå.» og omrissknappen «Tilbake til forelesningen» (lenke til `/forelesninger/<id>`).
- **Ferdig økt (3.3):** panelet i ferdigtilstand; i innholdet `h2` «Økten er ferdig» (fokus) og omrissknappen «Tilbake til forelesningen»; «Økten er ferdig» leses også i et levende område (`role="status"`, alltid montert). Resultatside og lagring kommer i 3.5.
- **«Avslutt økt»:** uten bekreftelse, rett tilbake til `/forelesninger/<id>`, også når kort er markert (lagring og avbrutt resultat kommer i 3.5). Ingenting sendes.
- **«Øv nå» (`flashcards-row.tsx`):** `onPractice` → `router.push("/forelesninger/<id>/flashcards")`. Vises bare med kort (finnes fra 3.1). Kommentaren i `create-row.tsx` om 3.3 oppdateres.
- **shadcn:** `npx shadcn add progress`, tilpasset tokenene. Sjekk `package.json` etterpå (fjern `cn`, lås `radix-ui` til 1.8.1).
- Testnavn har krav-ID (`test_fr20_…`, Vitest/Playwright «FR-23: …», «FR-24: …», «FR-25: …», «FR-20: …», «UX-DR9: …»). Kode og kommentarer på engelsk, synlig tekst på bokmål, bare godkjente tekster.

**Never:**
- Ikke rør planleggingsdokumentene, `CLAUDE.md`, `.claude/settings.json`, `.git/hooks/` eller `frontend/e2e/brukerreiser/`.
- Ingen migrering, ingen `practice_sessions`, ingen `POST /api/practice-sessions`, ingen `session_id` (3.5). Ingen hurtigtaster, hint-linje, smal-skjerm-meny eller «? Hurtigtaster» (3.4). Ingen redigering eller sletting av kort (3.7). Ingen emneøkt (3.6). Ingen nye Python-pakker.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Kortene | forelesning med 3 kort fra 2 filer | 200, 3 kort med `source.file_name` og `page_no`, i fil/side-rekkefølge | — |
| Andres | `GET …/flashcards` for annen bruker eller ukjent id | `404 NOT_FOUND` | — |
| Uten innlogging | ingen cookie | 401 | — |
| Kunne ikke | 3 kort A,B,C; A «Kunne ikke» | kø B,C,A; teller 1→2→3, aldri 4; under A igjen: «Repeterer: 1 kort igjen» | — |
| Første teller | A «Kunne ikke», så «Kunne» | rute A ✗, «Kunne 2 · Kunne ikke 1» etter B,C «Kunne» | — |
| Ferdig | alle kort «Kunne» minst én gang | panel ferdig, «Økten er ferdig» leses opp, fokus på overskriften | — |
| Tom | øktadresse uten kort | «Det finnes ingen flashcards her ennå.» + «Tilbake til forelesningen», ingen panel | — |
| Nye kort under økt | jobben blir ferdig mens økten pågår | økten beholder sin liste | — |
| Mange | 121 kort | ingen rutenett eller forklaring, teller/stolpe/tellelinje står | — |

</intent-contract>

## Code Map

- `backend/app/modules/content/router.py` -- `lectures_router` (prefiks `/api/lectures`), mønsteret fra `lecture_content_counts`.
- `backend/app/modules/content/service.py` -- `flashcard_count` (join `File` på `lecture_id`, filter `PLAIN_FLASHCARD_KINDS`); ny `lecture_flashcards`.
- `backend/app/modules/content/schemas.py` -- ny `FlashcardSource`, `FlashcardOut`.
- `backend/app/modules/files/models.py` -- `File.original_name`, `created_at`, `lecture_id`.
- `backend/app/modules/subjects/service.py:get_lecture` -- eierskap, 404.
- `backend/tests/test_jobs.py` -- hjelpere `lecture`-fixture, `_start`, `_finish_jobs`, `pdf_with_pages`, `definitions`, `_upload`, `_new_lecture`, `_log_in_new_user`, `NOT_FOUND`; ny `backend/tests/test_flashcards.py` bruker dem.
- `backend/tests/test_route_guard.py` -- fanger nye ruter automatisk.
- `frontend/modules/generation/components/flashcards-row.tsx` -- gir ikke `onPractice` i dag.
- `frontend/components/create-row.tsx` -- `onPractice` (knappen `disabled` uten den), kommentar om 3.3.
- `frontend/modules/subjects/pages/lecture-page.tsx` -- mønster for side med sidemeny, `notFoundOnMissing`, `useDocumentTitle`, feilboks.
- `frontend/modules/subjects/{api,types}.ts` -- `fetchLecture`, `lectureQueryKey`, `fetchSubject`, `subjectQueryKey`; `SubjectDot` (`color_index`).
- `frontend/modules/generation/components/job-watcher.tsx` -- ugyldiggjør `["lectures", id]` når en jobb blir ferdig (derfor låses økten i tilstand).
- `frontend/components/ui/button.tsx` -- variantene `primary`/`outline`/`text`, `size="lg"` (48 px).
- `frontend/components/icon.ts` -- `iconProps`.
- `frontend/app/globals.css` -- tokenene (`grid-cell`, `grid-gap`, `flashcard-width`, `session-counter`, `card-question`, `card-answer`, `overline`, `caption`, `success-tint`, `danger-tint`, `progress-track`, `shadow-float`).
- `frontend/vitest.config.ts` -- tar med `modules/**` og `components/**`.
- `frontend/e2e/flashcards.spec.ts` -- `newLecture`, `uploadDefinitions` (3 kort), `expectNoAxeViolations`, `tabTo`.
- Skisser `mockups/07-flashcard.svg` (panel og snudd kort) og `08-flashcard-ferdig.svg` (ferdig panel).

## Tasks & Acceptance

**Execution:**
- `backend/app/modules/content/{schemas,service,router}.py` -- ruten og tjenesten.
- `backend/tests/test_flashcards.py` -- `test_fr20_…` (kilde og rekkefølge), `test_fr4_…` (404 andres/ukjent/ugyldig, 401), bare qa/concept.
- `frontend/components/ui/progress.tsx` -- shadcn, tilpasset tokenene.
- `frontend/components/source-link.tsx` + test.
- `frontend/modules/practice/{session,adapter,types,api}.ts` + `session.test.ts` -- rene funksjoner, adapter, `fetchLectureFlashcards`.
- `frontend/modules/practice/components/{session-panel,answer-grid,flashcard}.tsx` + tester.
- `frontend/modules/practice/pages/flashcard-session-page.tsx` + test, `frontend/app/(app)/forelesninger/[lectureId]/flashcards/page.tsx`.
- `frontend/modules/generation/components/flashcards-row.tsx`, `frontend/components/create-row.tsx` -- «Øv nå» aktiv.
- `frontend/e2e/flashcard-okt.spec.ts` -- hel økt med Tab og Enter, axe før og etter snuing og ferdig, tom økt, «Avslutt økt».

**Acceptance Criteria:**
- Given Flashcards-raden med kort, when studenten trykker «Øv nå», then åpnes økten på `/forelesninger/<id>/flashcards` med panelet der sidemenyen var og kortet sentrert.
- Given en økt med 3 kort, when studenten bruker bare Tab og Enter, then kan hun snu og markere alle kort til økten er ferdig.
- Given økten før og etter snuing og ferdig, when axe kjører, then er det ingen brudd.
- Given et snudd kort, when det vises, then står «<filnavn>, side N» nederst som tekst, ikke lenke.
- Given økten pågår, when studenten trykker «Avslutt økt», then er hun tilbake på forelesningssiden.

## Spec Change Log

## Review Triage Log

### 2026-11-21 — Review pass
- verdicts: 31 findings — high 0, medium 3, low 21, false 7, maybe-false 0
- findings:
  - `[low]` `[patch]` Verifisering: fremdriftsstolpens verdi er ikke testet — `aria-valuenow` for 7 av 24 og 100 ved ferdig økt er nå med i panel-testen.
  - `[low]` `[patch]` Verifisering: feil ved henting av kortene er ikke testet på øktsiden — ny sidetest der kortruten svarer 500 og reserveteksten vises.
  - `[low]` `[reject]` Verifisering (annet): e2e kjøres ikke i CI — eksisterende, dokumentert valg (CI kjører pytest og Vitest); e2e kjøres i hver story mot Docker.
  - `[medium]` `[patch]` Kant: ny økt innen gcTime låser den gamle hurtigbufrede kortlisten (nye kort fra en jobb i mellomtiden mangler; den inaktive spørringen ble bare merket utdatert) — økten låses først når listen er hentet etter montering (`isFetchedAfterMount`); test.
  - `[medium]` `[patch]` Kant: en feilet bakgrunnshenting (jobbvakt, vindusfokus) bytter ut økten som pågår med feilmeldingen — feilgrenene gjelder bare før økten er startet; test.
  - `[false]` `[reject]` Kant: `lectureId` endres uten ny montering — App Router nøkler sidesegmentet på parameterverdien (`createRouterCacheKey`), så en annen forelesning gir ny komponent.
  - `[low]` `[reject]` Kant: Enter holdt nede etter snuing markerer «Kunne» — tastaturgjentakelse krever at tasten holdes ~0,5 s; vakt mot `repeat` er ekstra logikk for noe sjeldent, og 3.4 eier tastene.
  - `[medium]` `[patch]` Blind: feil ved henting i bakgrunnen avbryter økten — samme rettelse som Kant 2.
  - `[low]` `[reject]` Blind: ingen innlastingstilstand — samme mønster som forelesningssiden (innholdet vises når dataene er klare), og innlastingen tar et øyeblikk.
  - `[low]` `[patch]` Blind: API-kontrakten er løsere enn typen (`kind: str`, `back: str | None`) — `kind: Literal["qa", "concept"]` og `back: str`.
  - `[low]` `[patch]` Blind: `onFlip` kalles to ganger per klikk på «Snu kortet» (bobling) — knappen stopper boblingen; test.
  - `[low]` `[reject]` Blind: ingen backendtest for rekkefølge innenfor én side eller lik `uploaded_at` — rekkefølgen er bestemt i spørringen, og blandingen i nettleseren gjør serverrekkefølgen usynlig for studenten.
  - `[low]` `[patch]` Blind: forklaringen kopierer fargene fra rutenettet — forklaringen bruker nå `MARK_CLASSES` fra `answer-grid.tsx`.
  - `[low]` `[patch]` Blind: stolpen leses som prosent, ikke «7 / 24» — `getValueLabel` gir samme tekst som telleren, og `max` er satt.
  - `[low]` `[reject]` Blind: «Øv nå» er en knapp som navigerer — krever ny `href` i `CreateRow` (ny overflate); knappen virker med tastatur og skjermleser.
  - `[low]` `[reject]` Blind: e2e-sjekken for «ingen sidemeny» beviser lite — ufarlig; plasseringen er dekket av målingen av sentrert kort ved siden av panelet.
  - `[low]` `[reject]` Blind: skjøre velgere (`p`.nth(1), `.text-session-counter`) — testkode; endres når oppførselen endres.
  - `[false]` `[reject]` Blind: KI-sporet og loggen mangler — føres i senere steg i samme branch (story-prompten punkt 5 og 6).
  - `[low]` `[reject]` Blind: tjenesten bygger svarskjemaene — ingen navngitt skade; en ruter med én linje er like lett å lese.
  - `[low]` `[reject]` Intensjon: API-et utelater modellkort — modellkort finnes først i epic 7, og tellingen på raden utelater dem også; epic 7 utvider begge.
  - `[false]` `[reject]` Intensjon: øving på hele emnet mangler — story 3.6.
  - `[low]` `[patch]` Intensjon: krav-ID i testnavn stemmer ikke med storiens fordeling (FR-24/FR-25 m.fl.) — titlene er rettet; Vitest/Playwright bruker «FR-NN: …» som resten av repoet.
  - `[low]` `[reject]` Intensjon: bare panelet tar adapter, ikke hele rammen — storien sier panelet tar adapteren; 3.5/3.6 trekker ut mer når de trenger det.
  - `[low]` `[reject]` Intensjon: E41 er bare testet i Vitest — sidetesten ugyldiggjør samme nøkkel som jobbvakten; e2e for en jobb midt i økten gir lite ekstra.
  - `[false]` `[reject]` Intensjon: «ingenting lagres» for tom økt er ikke testet — 3.3 har ingen lagring.
  - `[false]` `[reject]` Intensjon: `prefers-reduced-motion` er ikke testet — det finnes ingen animasjon.
  - `[low]` `[reject]` Intensjon: 208 px og 768 px er bare testet via klasser — skjermbildene sammenlignes med skisse 07.
  - `[false]` `[reject]` Intensjon: tekstversjonen av rutenettet kan bety en egen oppsummering — skjult tekst per rute er tekstversjonen; storien sier rutene «leses som» «Kort 4: kunne ikke».
  - `[low]` `[reject]` Intensjon: 120-grensen er ikke testet ende til ende — dekket i panel-testen med 120 og 121 kort.
  - `[false]` `[reject]` Intensjon: ferdigtilstand i innholdet og «Avslutt økt» med markerte kort — bevisste valg, ført i `beslutninger.md` med kanttilfelle-issue.
  - `[low]` `[reject]` Intensjon: tom økt testes med museklikk — lenken er en vanlig lenke; tastaturdelen er dekket av den hele økten.

## Design Notes

- **Hvorfor tilstanden ligger i én ren reduksjon:** teller, repetisjon, rutenett og ferdig følger av `order`, `queue`, `firstMarks` og `shown`, så de kan ikke komme ut av takt, og 3.5 kan lese tellingene (`shown`, `answered`, `correct`, `wrong`) rett ut.
- **Hvorfor låst i tilstand og ikke i spørringen:** jobbvakten ugyldiggjør hele forelesningen når en jobb er ferdig. Økten kopierer den blandede listen én gang, så nye kort kommer først i neste økt (E41).
- **Valg tatt selv (kanttilfeller):** «Avslutt økt» med markerte kort går rett tilbake i 3.3; ferdig økt viser «Økten er ferdig» og «Tilbake til forelesningen» til resultatsiden kommer i 3.5; ruten `/forelesninger/<id>/flashcards`; fokus etter snuing/markering for at Tab og Enter skal holde.

## Verification

**Commands:**
- `cd backend && uv run pytest && uv run ruff check .` -- grønne
- `cd frontend && npm run test && npx tsc --noEmit` -- grønne
- `docker compose up --build -d && cd frontend && npx playwright test` -- grønne

## Auto Run Result

**Sammendrag:** Story 3.3 er bygd. Backenden har `GET /api/lectures/{id}/flashcards` med kilde (`file_id`, `file_name`, `page_no`), bare egne forelesninger. Frontenden har modulen `practice` med øktlogikken som rene funksjoner (blanding, «Kunne ikke» bakerst, første markering teller, teller og repetisjon), øktpanelet med adapter, svarrutenettet, flashcardet og den felles `source-link`. Økten ligger på `/forelesninger/<id>/flashcards`, og «Øv nå» på Flashcards-raden er aktiv.

**Filer:**
- `backend/app/modules/content/{schemas,service,router}.py` -- ruten og tjenesten.
- `backend/tests/test_flashcards.py` -- kilde, rekkefølge, bare qa/concept, 404 og 401.
- `frontend/components/ui/progress.tsx` -- shadcn progress, tilpasset tokenene.
- `frontend/components/source-link.tsx` (+ test) -- kilden som tekst.
- `frontend/modules/practice/{session,adapter,types,api}.ts` (+ test) -- øktlogikk, adapter, typer, henting.
- `frontend/modules/practice/components/{session-panel,answer-grid,flashcard}.tsx` (+ tester) -- panel, rutenett, kort.
- `frontend/modules/practice/pages/flashcard-session-page.tsx` (+ test), `frontend/app/(app)/forelesninger/[lectureId]/flashcards/page.tsx` -- øktsiden.
- `frontend/modules/generation/components/flashcards-row.tsx`, `frontend/components/create-row.tsx` (+ tester) -- «Øv nå» aktiv.
- `frontend/e2e/flashcard-okt.spec.ts` -- hel økt med Tab og Enter, axe, tom økt, «Avslutt økt», ukjent forelesning.

**Gjennomgang:** 31 funn. 9 rettet (2 medium: gammel hurtigbufret kortliste ved ny økt, feilet bakgrunnshenting som erstattet økten (to funn med samme årsak); 7 low: test for stolpens verdi, test for feil ved henting av kort, strammere skjema, dobbelt `onFlip`, felles merkefarger i forklaringen, stolpen leses som «7 / 24», krav-ID-er i testnavn). Ingen utsatt. 15 avvist med begrunnelse og 7 falske, se loggen over.

**Oppfølging anbefalt:** ja. To medium-rettelser i `flashcard-session-page.tsx` (låsing først etter ferske data med `isFetchedAfterMount`, og feilgrenene bare før økten starter) er testet, men ikke gjennomgått av et uavhengig lag. Rettet etter verdi: medium 2 (3 funn), low 7.

**Verifisering:** `uv run pytest` 391 bestått, `ruff check` rent, `npm run test` 561 bestått, `tsc --noEmit` rent, `npx playwright test` 92 bestått mot `docker compose up --build`. Skjermbilder i `docs/skjermbilder/story-3-3/`, sammenlignet med skisse 07 og 08.

**Gjenstående risiko:** «Avslutt økt» med markerte kort går rett tilbake uten lagring, og ferdig økt viser «Økten er ferdig» til resultatsiden og lagringen kommer i 3.5 (egne valg). Smal skjerm og hurtigtaster kommer i 3.4.
