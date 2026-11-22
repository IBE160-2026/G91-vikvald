---
title: 'Story 3.7: Rett og slett kort, og se hva som slettes'
type: 'feature'
created: '2026-11-22'
baseline_revision: '406425a62f0bd13a0d2fc7cc11ac2ee60e1c7fec'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Studenten kan ikke rette eller slette et dårlig kort mens hun øver, og slettebekreftelsene for fil, erstatning, forelesning, emne og konto teller ikke flashcards, fordi story 3.1 bevisst ikke meldte dem inn i registeret (#134). Sletting mens en jobb pågår blir heller ikke stoppet (story 3.7 i `epics.md`: FR-12, FR-27, AR-4, AR-7, UX-DR22, UX-DR27; E9, E22, E34).

**Approach:** Nye ruter `PATCH`/`DELETE /api/flashcards/{id}` i `content`; flashcards meldes inn i telleregisteret, og et lite vaktregister i samme modul lar `generation` stoppe sletting med `409 JOB_ALREADY_RUNNING` uten at `files` importerer `generation`. Kortet i økten får «Rediger» og «Slett» i bunnfeltet ved kilden, med redigeringsdialog og den felles slettebekreftelsen.

## Boundaries & Constraints

**Always:**
- **API (`content`):** `PATCH /api/flashcards/{id}` med `{front?, back?}` → `200` med `FlashcardOut`; `DELETE /api/flashcards/{id}` → `204`. Begge med `current_user`; eierskap via fil → forelesning → emne (andres, ukjent, ugyldig id → `404 NOT_FOUND`). Tomt felt eller bare mellomrom → `422` med `FLASHCARD_FRONT_REQUIRED` (sjekkes først) eller `FLASHCARD_BACK_REQUIRED`, ingenting lagres. Teksten lagres med mellomrom i begge ender fjernet, linjeskift inni beholdes. Bare tomme felt sjekkes, aldri `validate_item` (AR-4).
- **Telleregisteret (`content/registry.py`):** `flashcards` meldes inn av `content` selv (lazy, som `generation/registry.py`), alltid før typer som meldes inn senere. Teller `qa`/`concept` i `scope.file_ids`. `registered_kinds()` gir `["flashcards"]`.
- **Vaktregisteret:** `register_delete_guard(guard)` og `check_delete_allowed(session, lecture_ids)` i `content/registry.py`; `generation` melder inn en vakt som kaster `AppError(JOB_ALREADY_RUNNING)` når en av forelesningene har en jobb med `status='running'`. Vakten kalles i `files/router.py` før noe slettes: slett fil og erstatt fil (filens forelesning; erstatt etter eierskap og vilkår, før kroppen leses), slett forelesning, slett emne (alle forelesningene) og slett konto (alle forelesningene). Ingenting slettes ved 409.
- **Feilkoder:** `FLASHCARD_FRONT_REQUIRED` og `FLASHCARD_BACK_REQUIRED` (422) i `core/errors.py` og `frontend/lib/messages.ts` med de godkjente tekstene «Skriv inn spørsmålet.» og «Skriv inn svaret.».
- **Slettebekreftelsen (`components/delete-confirm-dialog.tsx`):** en mislykket sletting med `ApiError` viser `messageFor(code)` (for 409: «Det lages innhold i denne forelesningen nå. Vent til det er ferdig, og prøv igjen.»); andre feil som før reserveteksten. `DeleteTarget` får `"flashcard"`.
- **Kortet (`practice/components/flashcard.tsx`):** når kortet er snudd, har bunnfeltet kilden til venstre og tekstknappene «Rediger» og «Slett» (`variant="text"`) til høyre (brytes under på smal skjerm). Klikk på dem snur ikke kortet.
- **Redigeringsdialogen (`practice/components/edit-flashcard-dialog.tsx`):** felles `Dialog`, tittel «Rediger kortet», to tekstområder (shadcn `textarea` tilpasset tokenene) med synlige etiketter «Spørsmål» og «Svar», forhåndsutfylt; «Avbryt» og «Lagre». Tomt felt: sjekkes i nettleseren før kallet (og koden fra API-et vises på riktig felt): rød kant, feilteksten under, koblet med `aria-describedby`/`aria-invalid`, fokus på første ugyldige felt. Esc/«Avbryt» lukker uten endring. Andre feil: reserveteksten i `role="alert"`. Lagret → dialogen lukkes, kortet i økten viser ny tekst med en gang, fokus tilbake til «Rediger».
- **Slett i økten:** `DeleteConfirmDialog` med tittel «Slette kortet?», boksen med kortets spørsmål, «Det kan ikke angres.», «Avbryt» med startfokus, fareknappen «Slett kortet»; ingen telling (tom liste). `204` eller `404` → kortet tas ut (E22).
- **Øktlogikken (`practice/session.ts`):** ren funksjon `removeCard(state, id)`: umarkert kort tas ut av `order`, `queue` og `shown` (ruten og totalen går ned med én); markert kort tas bare ut av `queue` (ruten og første markering står). Blir et nytt kort gjeldende, legges det i `shown`. Er køen tom etterpå og noe er markert → økten er ferdig (lagres, resultatside); er ingenting markert (ingen kort igjen) → tilbake dit økten startet, uten resultat.
- **Cache:** etter lagring eller sletting ugyldiggjøres `["lectures", <kortets forelesning>]` og alle emners kortlister, så «Øv igjen», «Lag og øv» og emnesiden viser riktig tall.
- Testnavn med krav-ID: `test_fr27_…`, `test_sk6_…`, `test_fr12_…`, `test_ar7_…`, `test_ar4_…`; Vitest/Playwright «FR-27: …», «FR-12: …», «AR-7: …», «UX-DR22: …», «UX-DR27: …», «SK-6: …». axe uten brudd på økten med redigeringsdialogen og slettebekreftelsen åpne; begge brukbare med bare tastatur.
- **Brukerreise flyt 4 (#134):** `flyt-4-avslutter-etter-semesteret.spec.ts` og `docs/testing/brukerreiser.md` oppdateres bare for den nye teksten «Alle emner, filer og alt generert innhold slettes for godt: flashcards.»; testen svekkes ikke.

**Never:**
- Ikke rør planleggingsdokumentene, `CLAUDE.md`, `.claude/settings.json`, `.git/hooks/`. Ingen andre endringer i brukerreisetestene enn flyt 4-teksten.
- Ingen egen listeside for kort, ingen redigering av modellkort (epic 7), ingen ny tabell eller migrasjon, ingen nye Python-pakker. Ingen npm-pakker utover det `shadcn add textarea` krever (ingen).
- `files` importerer aldri `generation`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Rett kort | PATCH `{front:" Ny ", back:"Svar"}` | 200, `front:"Ny"`; økten viser ny tekst | — |
| Tomt felt (E34) | PATCH `{front:"   "}` | 422 `FLASHCARD_FRONT_REQUIRED`, uendret i DB; dialogen: rød kant, «Skriv inn spørsmålet.», fokus | — |
| Andres kort | PATCH/DELETE andres, ukjent, ugyldig id | 404 `NOT_FOUND`, ingenting endret | — |
| Slett umarkert kort (E22) | 3 kort, kort 1 vist, slett | ruten borte, «1 / 2» | — |
| Slett markert kort | kort markert «Kunne ikke», kommer igjen, slett | ruten med ✗ står, kortet kommer ikke igjen | — |
| Siste kort, noe markert | resten «Kunne», det siste slettes | økten ferdig, lagres, resultatside | — |
| Siste kort, ingenting markert | 1 kort, slett | tilbake til forelesningen/emnet, ingen lagring | — |
| Forhåndsvisning | fil med 18 kort | «Dette sletter også 18 flashcards laget fra fila.»; forelesning/emne/konto teller også flashcards | — |
| Jobb pågår (AR-7, E9) | jobb `running` på forelesningen; slett/erstatt fil, slett forelesning, emne, konto | 409 `JOB_ALREADY_RUNNING`, alt står; dialogen viser meldingen | — |
| Kontotekst | konto | «Alle emner, filer og alt generert innhold slettes for godt: flashcards.» | — |

</intent-contract>

## Code Map

- `backend/app/modules/content/registry.py` -- telleregisteret (`register_counter`, `content_counts`, `registered_kinds`, `_counters`); får lazy innmelding av flashcards og vaktregisteret.
- `backend/app/modules/content/service.py` -- `lecture_flashcards` (mønster for kilde); nye `get_flashcard` (join `File`, `Lecture`, `Subject`; ugyldig uuid → 404, som `files/service.py:get_file`), `update_flashcard`, `delete_flashcard`, `count_flashcards(session, scope)`.
- `backend/app/modules/content/router.py` -- ny `flashcards_router` (`/api/flashcards`); registreres i `backend/app/main.py`.
- `backend/app/modules/content/schemas.py` -- `FlashcardOut`; ny `FlashcardUpdate`.
- `backend/app/modules/content/models.py` -- `Flashcard`, `PLAIN_FLASHCARD_KINDS`.
- `backend/app/modules/generation/service.py:59` -- `lecture_has_running_job`; ny vakt for flere forelesninger, meldes inn ved import.
- `backend/app/modules/files/router.py:174,246-340` -- `replace_file`, `delete_one_file`, `delete_one_lecture`, `delete_one_subject`, `delete_account`: vakten før sletting. `lecture_ids`, `lecture_ids_for_subjects`, `subject_ids_for_user` finnes.
- `backend/app/core/errors.py` -- nye koder; `tests/test_errors.py` sjekker meldingsfila.
- `backend/tests/test_delete.py:86`, `tests/test_account_delete.py:66-106` -- forventer tomt register («epic 2»); oppdateres til at `flashcards` er innmeldt (`content_kinds: ["flashcards"]`, `["flashcards", TEST_KIND]`).
- `backend/tests/test_flashcards.py`, `test_jobs.py:435` -- hjelpere for kort og `Job(status="running")`-rader.
- `frontend/components/delete-confirm-dialog.tsx` -- feiltekst fra koden; `frontend/lib/delete-text.ts` `DeleteTarget`.
- `frontend/components/dialog.tsx` -- felles dialog (fokus på første felt, Esc).
- `frontend/components/text-field.tsx` -- mønster for etikett/feil; `components/ui/input.tsx` mønster for `ui/textarea.tsx`.
- `frontend/modules/practice/{api,types,session}.ts`, `components/flashcard.tsx`, `pages/flashcard-session-page.tsx` -- `Session.cards`, `mark`, `back`, `finished`; `usePracticeShortcuts` er av når en dialog er åpen.
- `frontend/lib/messages.ts` -- `countNouns.flashcards` finnes; nye koder.
- `frontend/e2e/lagre-okt.spec.ts`, `konto.spec.ts:214`, `brukerreiser/flyt-4-…spec.ts:76,87` -- e2e-mønster og tekster som endres.

## Tasks & Acceptance

**Execution:**
- `backend/app/core/errors.py`, `frontend/lib/messages.ts` -- to nye koder og tekster.
- `backend/app/modules/content/{registry,service,schemas,router}.py`, `backend/app/main.py` -- ruter, innmelding, vaktregister.
- `backend/app/modules/generation/service.py` -- vakten meldes inn.
- `backend/app/modules/files/router.py` -- vakten før hver sletting.
- `backend/tests/test_edit_flashcards.py` -- PATCH/DELETE: lagret og trimmet, tomme felt (begge koder, uendret), 404 andres/ukjent/ugyldig, 401, delete 204 og borte, ikke `validate_item` (side/fil endres ikke, fritekst godtas).
- `backend/tests/test_delete_flashcards_counts.py` -- forhåndsvisning for fil, forelesning, emne, konto (og erstatning via fil) teller flashcards; 409 for fil, erstatt, forelesning, emne, konto med jobb som pågår, og ingenting slettet; oppdater eksisterende registertester.
- `frontend/components/ui/textarea.tsx` -- `npx shadcn add textarea`, tilpasset; sjekk `package.json`.
- `frontend/modules/practice/session.ts` (+ test) -- `removeCard`.
- `frontend/modules/practice/api.ts` -- `updateFlashcard`, `deleteFlashcard`.
- `frontend/modules/practice/components/edit-flashcard-dialog.tsx` (+ test) -- feltene, feil, fokus, Esc.
- `frontend/modules/practice/components/flashcard.tsx` (+ test) -- knappene i bunnfeltet.
- `frontend/modules/practice/pages/flashcard-session-page.tsx` (+ test) -- rett, slett, siste kort, cache.
- `frontend/components/delete-confirm-dialog.tsx` (+ test) -- 409-meldingen.
- `frontend/e2e/rett-og-slett-kort.spec.ts` -- økten: rediger (tom feil, lagre, Esc), slett (Avbryt, Esc, bekreft), axe med begge dialoger åpne, bare tastatur; filsletting viser «Dette sletter også N flashcards laget fra fila.».
- `frontend/e2e/konto.spec.ts`, `frontend/e2e/brukerreiser/flyt-4-avslutter-etter-semesteret.spec.ts`, `docs/testing/brukerreiser.md` -- ny kontotekst.

**Acceptance Criteria:**
- Given et snudd kort i økten, when hun trykker «Rediger», endrer «Svar» og trykker «Lagre», then lagres det med `PATCH`, dialogen lukkes og kortet viser det nye svaret med en gang.
- Given slettebekreftelsen for et kort, when hun trykker «Avbryt» eller Esc, then er kortet fortsatt i økten og i API-et.
- Given en fil med flashcards, when slettedialogen for fila åpnes, then står «Dette sletter også N flashcards laget fra fila.».
- Given en jobb som pågår på forelesningen, when hun sletter fila i dialogen, then viser dialogen «Det lages innhold i denne forelesningen nå. Vent til det er ferdig, og prøv igjen.» og fila står.

## Spec Change Log

## Review Triage Log

### 2026-11-22 — Review pass
- verdicts: 29 findings — high 0, medium 0, low 25, false 4, maybe-false 0
- findings:
  - `[low]` `[patch]` Verifisering: ingen test sjekket at en sletting ugyldiggjør forelesningens og emnenes kortlister — ny Vitest-test spionerer rett før «Slett kortet», både vanlig sletting og siste kort (`e12782e`).
  - `[low]` `[reject]` Intensjon: «Rediger»/«Slett» vises bare på snudd kort — bunnfeltet med kilden finnes bare da, slik skisse 07 og epic-konteksten beskriver; ført som kanttilfelle.
  - `[low]` `[reject]` Intensjon: tomt felt testes i nettleseren uten ekte 422 gjennom UI-et — API-et testes i pytest og koden-til-felt i Vitest; en ekte rundtur krever å slå av nettleserens sjekk.
  - `[low]` `[reject]` Intensjon: 409-meldingen testes i e2e bare for fildialogen, og med mocket svar — alle dialogene bruker samme komponent; demojobber er ferdige før testen rekker å slette.
  - `[low]` `[reject]` Intensjon: tellingene for forelesning, emne og konto testes bare i API-et — frontenden viser listen fra API-et uendret, og setningen er testet fra før.
  - `[low]` `[reject]` Intensjon: bare ett E22-tilfelle i e2e — resten dekkes av `removeCard`- og sidetestene i Vitest.
  - `[low]` `[patch]` Intensjon: eierskapstestene het `test_fr4_…`, men kriteriet er SK-6 — omdøpt til `test_sk6_…` (`b3b6349`).
  - `[low]` `[reject]` Intensjon: tidsluken mellom vakten og slettingen — ført i spesifikasjonen; jobben feiler da uten å lagre.
  - `[false]` `[reject]` Blind: KI-sporet mangler — føres i senere steg på samme branch (story-prompten punkt 5).
  - `[low]` `[reject]` Blind: testen for at vakten er meldt inn importerer selv modulen — den parametriserte 409-testen går gjennom appen fra `create_app()` og ville feilet uten vakten.
  - `[low]` `[patch]` Blind: vakten ble sjekket før låsen i `delete_one_lecture` — flyttet etter `lock_lecture` (`b2a9f7d`). At de andre rutene ikke låser, er avvist: samme tidsluke som over.
  - `[false]` `[reject]` Blind og kant: «denne forelesningen» passer ikke for emne og konto — storien (E9) krever akkurat denne teksten fra meldingsfila for emne og konto.
  - `[low]` `[reject]` Blind: et rettet kort ser ut som et generert kort med kilde — kilden er der kortet kom fra; ingen krav om merking, og det ville trengt en migrasjon.
  - `[low]` `[reject]` Blind og kant: `FlashcardUpdate` har ingen lengdegrense, og `PATCH {}` er en no-op — ingen krav om grense; en tom endring endrer ingenting og skader ikke.
  - `[low]` `[patch]` Blind og kant: flagget i `_ensure_builtin_counters` ble satt før innmeldingen — settes nå etter (`e24329a`).
  - `[low]` `[patch]` Blind: feilen i redigeringsdialogen ble stående når hun skrev — feltets feil fjernes ved endring, som i `name-date-dialog` (`b327e24`). PATCH uten endring er avvist: ufarlig.
  - `[low]` `[reject]` Blind: backendtestene sjekker ikke at kortene forsvinner med forelesning, emne og konto — kaskaden går gjennom fila, og kaskaden er testet i epic 2; erstatning bruker filens forhåndsvisning.
  - `[low]` `[reject]` Blind: fokus finnes med `document.querySelector("[data-flip-button]")` — det er bare ett kort på siden; en ref gjennom flere komponenter er mer kode for ingen gevinst.
  - `[low]` `[reject]` Blind: e2e for AR-7 går mot mocket svar — samme som over.
  - `[low]` `[patch]` Blind: kommentaren i `delete-confirm-dialog.tsx` var brutt midt i en setning — brukket om (`aefd2e9`).
  - `[low]` `[patch]` Kant: «Øv igjen» rett etter en sletting eller lagring brukte gammel kortliste til ny henting var ferdig (eller for alltid om den feilet) — cachen oppdateres med `setQueryData` før ugyldiggjøringen, med tester (`e12782e`).
  - `[false]` `[reject]` Kant (dublett av lengdegrense) — se over.
  - `[false]` `[reject]` Kant (dublett av 409-teksten) — se over.
  - `[low]` `[patch]` Kant (dublett av flagget i registeret) — rettet sammen med raden over (`e24329a`).
  - `[low]` `[reject]` Intensjon: R2 er lest med alle akseptkriteriene — beskrivende, ingen feil.
  - `[low]` `[reject]` Intensjon: kontoteksten og brukerreise flyt 4 er endret — følger av #134 og er tillatt for denne storien.
  - `[low]` `[reject]` Intensjon: redigering og sletting stoppes ikke av en jobb — valgt og testet; kortene hører til fila.
  - `[low]` `[reject]` Intensjon: 404 ved sletting regnes som slettet — samme regel som den felles slettebekreftelsen fra 2.5.
  - `[low]` `[reject]` Intensjon: aksen og tastaturet — beskrivende, stemmer med storien.

## Design Notes

- **Hvorfor et vaktregister:** arkitekturen lar `files` kalle `content`, ikke `generation`, og `generation` eier `jobs`. Vakten følger samme mønster som telleregisteret: `generation` melder seg inn, `files` spør `content`. Da kan quiz og senere jobbtyper bruke samme vakt uten endring i slettekoden.
- **Valg tatt selv (kanttilfeller):** knappene vises i bunnfeltet som kommer når kortet er snudd (der kilden står, som skissen 07 og epic-konteksten beskriver); tittelen «Rediger kortet» og «Slette kortet?» er laget etter mønsteret i appen; tekstområder i stedet for enlinjefelt fordi svar ofte er hele setninger; tekst trimmes i endene; feilkodene heter `FLASHCARD_FRONT_REQUIRED`/`FLASHCARD_BACK_REQUIRED`; redigering og sletting av kort stoppes ikke av en jobb som pågår (kortene står i fila, ikke i jobben); 404 ved lagring viser reserveteksten; slett-vakten sjekkes før sletting, men en jobb som startes i samme øyeblikk er ikke låst ute (jobben feiler da uten å lagre).

## Verification

**Commands:**
- `cd backend && uv run pytest` -- grønne
- `cd frontend && npm run test && npx tsc --noEmit` -- grønne
- `docker compose up --build -d && cd frontend && npx playwright test` -- grønne

## Auto Run Result

**Sammendrag:** Story 3.7 er bygd. Nye ruter `PATCH`/`DELETE /api/flashcards/{id}` lar studenten rette og slette kort (tomme felt gir `FLASHCARD_FRONT_REQUIRED`/`FLASHCARD_BACK_REQUIRED`, andres kort 404). Flashcards er meldt inn i telleregisteret, så forhåndsvisningene for fil, erstatning, forelesning, emne og konto teller dem, og kontoteksten sier «… slettes for godt: flashcards.» (#134). Et vaktregister i `content` lar `generation` stoppe sletting og erstatning med `409 JOB_ALREADY_RUNNING` mens en jobb pågår, og slettedialogen viser meldingen fra meldingsfila. I økten har det snudde kortet «Rediger» og «Slett» i bunnfeltet, med dialogen «Rediger kortet» og den felles bekreftelsen «Slette kortet?»; et slettet kort tas ut etter reglene i E22.

**Filer:**
- `backend/app/core/errors.py`, `frontend/lib/messages.ts`: to nye feilkoder med godkjente tekster.
- `backend/app/modules/content/{registry,service,schemas,router}.py`, `backend/app/main.py`: rutene, tellingen og vaktregisteret.
- `backend/app/modules/generation/service.py`: vakten `no_running_jobs` meldes inn.
- `backend/app/modules/files/router.py`: vakten før hver sletting og erstatning.
- `backend/tests/test_edit_flashcards.py`, `test_delete_flashcards_counts.py` (nye), `test_delete.py`, `test_account_delete.py` (registeret er ikke lenger tomt).
- `frontend/components/ui/textarea.tsx`: shadcn-tekstområde tilpasset tokenene.
- `frontend/components/delete-confirm-dialog.tsx` (+ test), `frontend/lib/delete-text.ts`: meldingen fra feilkoden, `DeleteTarget` «flashcard».
- `frontend/modules/practice/{session,api}.ts`, `components/{flashcard,edit-flashcard-dialog}.tsx`, `pages/flashcard-session-page.tsx` (+ tester): knappene, dialogen, `removeCard`, cache.
- `frontend/e2e/rett-og-slett-kort.spec.ts` (ny), `konto.spec.ts`, `brukerreiser/flyt-4-…spec.ts`, `docs/testing/brukerreiser.md`: ny kontotekst.

**Gjennomgang:** 29 funn: 9 rader rettet (alle low, 7 rettinger), 16 low avvist med begrunnelse, 4 falske. Ingenting utsatt.

**Oppfølging anbefalt:** nei. Rettet etter alvorlighet: low 7.

**Verifisering:**
- `uv run pytest`: 460 bestått.
- `npm run test`: 700 bestått. `npx tsc --noEmit`: rent.
- `npx playwright test` mot `docker compose up --build`: 121 bestått.

**Gjenstående risiko:** 409-meldingen i nettleseren er bare testet med et falskt svar fra serveren (demojobber er for raske); den ekte 409 er testet i pytest for alle fem rutene. En jobb som startes i samme øyeblikk som en sletting, er ikke låst ute. Bare prøvd i Chromium.
