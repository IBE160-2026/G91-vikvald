---
title: 'Story 3.2: Velg omfang og se hvordan genereringen gikk'
type: 'feature'
created: '2026-11-21'
baseline_revision: '4e2e745cca44aa989d5f1257948488dd3921e20d'
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

**Problem:** Story 3.1 lager alltid inntil 20 kort uten valg, har ingen tidsgrense rundt modellkallet, viser reserveteksten når en jobb feiler, sier ikke fra når det ble færre kort enn valgt, og følger jobben bare mens forelesningssiden er åpen (story 3.2 i `epics.md`: FR-17, FR-18, FR-21, FR-38, NFR-12, NFR-17, AR-4, AR-5, UX-DR19, UX-DR20, UX-DR24, UX-DR44).

**Approach:** Backenden får tidsgrensen `GENERATION_TIMEOUT` (3 min) og rutene `GET /api/jobs/active` og `GET /api/jobs/{id}`. Frontenden får dialogen «Lag flashcards» med omfang (Rask/Vanlig/Dyp), meldingene for færre, ingenting og feil med «Prøv igjen» på Flashcards-raden, og én jobbvakt i `(app)`-layouten som følger jobbene og viser en ferdigmelding med sonner på andre sider.

## Boundaries & Constraints

**Always:**
- **Tidsgrense:** `generation/service.py` har `GENERATION_TIMEOUT_SECONDS = 180` (lest ved kallet, så testene kan sette den ned med `monkeypatch`). Bare portkallet pakkes i `asyncio.wait_for`. `TimeoutError` → rollback, jobben `failed` med `GENERATION_TIMEOUT`, ingen kort. Andre unntak gir `GENERATION_FAILED` som før. `_mark_failed` tar feilkoden som argument.
- **Feilkode:** ny `GENERATION_TIMEOUT` (504) i `core/errors.py`.
- **Nye ruter (`generation/router.py`, ny `jobs_router` med prefiks `/api/jobs`, `current_user` på begge):**
  - `GET /api/jobs/active` → liste med innlogget brukers `running`-jobber (via forelesning → emne → `user_id`), eldste først.
  - `GET /api/jobs/{id}` → jobben hvis forelesningen er brukerens; ukjent, ugyldig id eller andres → `404 NOT_FOUND`.
  - Begge svarer med `TrackedJobOut` = `JobOut` + `lecture_name`. `POST` og `latest` er uendret.
- **API-et for omfang finnes fra 3.1** (`params.requested` 10/20/30, standard 20). Frontenden sender nå alltid `params: {requested}`.
- **Meldingsfila:** `GENERATION_FAILED`, `GENERATION_TIMEOUT` og `JOB_INTERRUPTED` får malen «Vi klarte ikke å lage {content}. Ingenting er lagret. Prøv igjen.», fylt med `messageWithDetails(code, {content: "flashcardene"})`. Kommentaren «Story 3.2 gives these their own texts» fjernes.
- **Tekster per innholdstype** i `modules/generation/texts.ts` (bare flashcards nå): `jobText` «Lager flashcards …», `failed` (malen over), `fewer(created, requested)` «Det ble laget 12 av inntil 20 flashcards. Notatene ga ikke grunnlag for flere.», `nothing` «Notatene ga ikke grunnlag for flashcards. Ingenting er lagret.», `done(created, lecture)` «Flashcardene er ferdige: 18 kort i Uke 37: Merkevare.». Alle er godkjente ordrett i storien.
- **Flashcards-raden (`flashcards-row.tsx`)** utleder meldingen fra siste flashcards-jobb i `jobs/latest`, så den står etter omlasting og til neste jobb starter:
  - `failed` → feilteksten i `role="alert"` med knappen «Prøv igjen» (starter ny jobb med jobbens `requested`, uten dialog).
  - `done`, `created=0` → `nothing` på merknadsflaten.
  - `done`, `0 < created < requested` → `fewer` på merknadsflaten.
  - `done`, `created = requested` → ingen melding.
  - Feil fra selve startkallet (409, 422, nett) vises som før i `role="alert"`, uten «Prøv igjen».
  - Levende område (`role="status"`, alltid montert): «Lager flashcards …» ved start; ved slutt på en jobb fanen fulgte: `fewer`, `nothing` eller `done`-teksten. Feil leses av `role="alert"`, ikke dobbelt. Fokus flyttes aldri.
  - Raden spør ikke lenger `jobs/latest` hvert sekund selv; jobbvakten ugyldiggjør forelesningens spørringer når jobben er ferdig.
- **Merknadsflaten (`note-surface.tsx`)** får en valgfri `icon`-prop (standard `Lock`); raden bruker `Info`. Den brukes aldri for feil.
- **Dialog (`modules/generation/components/scope-dialog.tsx`):** felles `Dialog` (bredde 720), tittel «Lag flashcards», linjen «<forelesning> · 2 filer, 18 sider», «Nye kort legges til de 24 du har fra før.» bare når det finnes kort, overskriften «Omfang» og tre valgkort «Rask / Inntil 10 kort», «Vanlig / Inntil 20 kort» (forhåndsvalgt), «Dyp / Inntil 30 kort» i en radiogruppe (shadcn `radio-group`, piltaster flytter valget, første fokus på valgt kort), så «Tar noen sekunder.» i demomodus ellers «Tar vanligvis under to minutter.», og «Du kan bruke resten av appen imens.». Knappene «Avbryt» og «Lag flashcards». Esc lukker uten jobb, fokus tilbake til knappen som åpnet. Kortene ligger ved siden av hverandre fra 640 px, under hverandre på smalere skjerm.
- **Valgkort (`components/choice-option.tsx`):** felles, bygd på shadcn `RadioGroupItem`. Hvitt, `rounded-option`, 1 px `border-control`; valgt `brand-tint` med 1,5 px `brand`-kant og fylt ultramarin radioknapp. Tittel `text-item-title`, forklaring `text-meta`.
- **Jobbvakt (`modules/generation/components/job-watcher.tsx`):** `JobWatcher` med kontekst og `useFollowJob()`, lagt i `app/(app)/layout.tsx` inni `RequireLogin`. Spør `GET /api/jobs/active` når den monteres, og hvert sekund mens den følger minst én jobb. Følger hver jobb den ser i `active` og hver jobb raden melder inn. Når en fulgt jobb ikke lenger er i `active`, henter den `GET /api/jobs/{id}` og: ugyldiggjør `["lectures", lecture_id]`; viser sonner-melding (`done`/`nothing`/`failed`-teksten) bare når studenten ikke står på `/forelesninger/<lecture_id>`. Monteres `<Toaster />` (shadcn `sonner`, tilpasset tokenene, uten `next-themes`) inni vakten, så ingen melding vises etter utlogging.
- **Pakker:** `sonner` 2.0.8 (versjonen i arkitekturen). Sjekk `package.json` etter `npx shadcn add` (fjern `cn`, lås `radix-ui` til 1.8.1).
- Testnavn har krav-ID (`test_fr21_…`, `test_sk4_…`, `test_sk8_…`, `test_fr17_…`, «FR-18: …», «UX-DR24: …», «NFR-12: …»). Kode og kommentarer på engelsk, synlig tekst på bokmål.

**Never:**
- Ikke rør planleggingsdokumentene, `CLAUDE.md`, `.claude/settings.json`, `.git/hooks/` eller `frontend/e2e/brukerreiser/`.
- Ingen ny migrering, ingen nye Python-pakker, ingen eksterne kall, ingen tekst fra backenden til brukeren.
- Ingen økt («Øv nå» er fortsatt ikke aktiv før 3.3), ingen slette-sperre (3.7), ingen `next-themes`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Rask | dialog, «Rask», «Lag flashcards» | `POST` med `params.requested=10` | — |
| Tidsgrense | generator sover lenger enn grensen (satt til 0,05 s) | `failed`, `GENERATION_TIMEOUT`, ingen kort | logget uten innhold |
| Port feiler | generator kaster | `failed`, `GENERATION_FAILED`, antall uendret | logget uten innhold |
| Lagring feiler | `save` kaster etter `add` | ingen kort lagret | `GENERATION_FAILED` |
| `mock-invalid` | 4 definisjoner | `created 1, discarded 3`; raden: «Det ble laget 1 av inntil 20 flashcards. …» | — |
| Ingenting | ingen definisjoner | `done, created 0`; raden: `nothing`-teksten | — |
| Feilet | siste jobb `failed` (hvilken som helst kode) | feiltekst + «Prøv igjen» → `POST` med samme `requested` | — |
| Aktive | to brukere med hver sin jobb | `active` gir bare egne | — |
| Andres jobb | `GET /api/jobs/{id}` for annen bruker | `404 NOT_FOUND` | — |
| Annen side | jobb ferdig mens studenten er på forsiden | sonner: «Flashcardene er ferdige: N kort i <forelesning>.» | — |
| Utlogget | jobb ferdig etter utlogging | ingen melding; resultatet vises på 04 neste gang | — |

</intent-contract>

## Code Map

- `backend/app/modules/generation/service.py` -- `run_job`, `_generate_and_save` (portkallet), `_mark_failed` (fast `GENERATION_FAILED` i dag); nye `active_jobs`, `get_job_for_user`.
- `backend/app/modules/generation/router.py` -- `lectures_router`, `_job_out`, `_as_utc`; ny `jobs_router`.
- `backend/app/modules/generation/schemas.py` -- `JobParams` (10/20/30), `JobOut`; ny `TrackedJobOut`.
- `backend/app/modules/subjects/models.py` -- `Lecture(subject_id, name)`, `Subject(user_id)` for eierskapssjoinen (som `files/service.py` gjør).
- `backend/app/main.py:71` -- `include_router`; legg til `jobs_router`.
- `backend/app/core/errors.py` -- `ErrorCode`, `ERROR_STATUS`.
- `backend/tests/test_jobs.py` -- hjelpere `_start`, `_finish_jobs`, `_latest`, `_cards`, `pdf_with_pages`, `definitions`; testene `test_ar4_generator_som_feiler…`, `test_ar4_lagring_som_feiler…`, `test_sk4_mock_invalid…` dekker deler av AC-ene og omdøpes til `test_fr21_…`/`test_sk8_…`/`test_sk4_…`.
- `backend/tests/test_route_guard.py`, `test_errors.py` -- fanger nye ruter og koder automatisk.
- `frontend/lib/messages.ts` -- `messages`, `messageWithDetails`, `FALLBACK_MESSAGE`.
- `frontend/modules/generation/{api,types}.ts`, `components/flashcards-row.tsx` -- `startJob(lectureId, kind)` uten params i dag; raden spør `jobs/latest` hvert sekund.
- `frontend/components/{create-row,note-surface,dialog}.tsx` -- `CreateRow` har `message`/`error`; `NoteSurface` har fast `Lock`; `Dialog` med `primaryAction`, bredde 720, fokus på første fokuserbare i innholdet.
- `frontend/modules/subjects/pages/lecture-page.tsx:221` -- `FlashcardsRow`; har `files.data` (antall og `page_count`) og `fileCountLabel`/`pageCountLabel` i `../format`.
- `frontend/app/(app)/layout.tsx`, `modules/identity/components/require-login.tsx` -- barna vises bare innlogget.
- `frontend/lib/config.ts` -- `useAppConfig().data.demo_mode`.
- `frontend/e2e/flashcards.spec.ts` -- 3.1-testene (forventer i dag «Flashcardene er ferdige: 3 kort …» i status og ingen dialog).
- Skisse `mockups/06-lag-innhold.svg` -- dialog 720 bred, linjen «Uke 37: Merkevare · 2 filer, 18 sider», tre valgkort 204×71 ved siden av hverandre.

## Tasks & Acceptance

**Execution:**
- `backend/app/core/errors.py` -- `GENERATION_TIMEOUT` (504).
- `backend/app/modules/generation/service.py` -- tidsgrense, feilkode til `_mark_failed`, `active_jobs`, `get_job_for_user`.
- `backend/app/modules/generation/schemas.py`, `router.py`, `backend/app/main.py` -- `TrackedJobOut`, `jobs_router`.
- `backend/tests/test_jobs.py` -- tidsgrense, `active`/`{id}` (eierskap, 401, 404), omdøping med krav-ID, `test_fr17_…` for 10/20/30.
- `frontend/lib/messages.ts` (+ test) -- malene.
- `frontend/components/ui/radio-group.tsx`, `ui/sonner.tsx` (shadcn, tilpasset), `components/choice-option.tsx`, `note-surface.tsx` (`icon`) + tester.
- `frontend/modules/generation/{texts,api,types}.ts`, `components/scope-dialog.tsx`, `job-watcher.tsx`, `flashcards-row.tsx` + tester.
- `frontend/app/(app)/layout.tsx` -- `JobWatcher`.
- `frontend/modules/subjects/pages/lecture-page.tsx` (+ test) -- sender fil- og sideantall til raden.
- `frontend/e2e/flashcards.spec.ts` -- dialog med tastatur og «Rask», færre, feilet (rute fanget) med «Prøv igjen», axe på alle tre, ferdigmelding på forsiden.

**Acceptance Criteria:**
- Given dialogen åpen, when studenten bruker bare tastaturet (Tab, piltaster, Enter, Esc), then kan hun velge omfang og starte eller lukke, og fokus går tilbake til knappen som åpnet.
- Given en jobb startet fra forelesningssiden, when studenten går til forsiden og jobben blir ferdig, then vises «Flashcardene er ferdige: N kort i <forelesning>.» i et levende område.
- Given forelesningssiden med feilmelding, med «færre enn valgt» og med dialogen åpen, when axe kjører, then er det ingen brudd.
- Given `backend/tests/test_errors.py`, when testene kjøres, then finnes `GENERATION_FAILED`, `GENERATION_TIMEOUT` og `JOB_INTERRUPTED` i meldingsfila.

## Spec Change Log

## Review Triage Log

### 2026-11-21 — Review pass
- verdicts: 28 findings — high 0, medium 2, low 23, false 3, maybe-false 0
- findings:
  - `[low]` `[patch]` Blind: `except TimeoutError` fanger også tidsavbrudd utenfor modellkallet (f.eks. databasen) som `GENERATION_TIMEOUT` — tidsavbruddet fanges nå bare rundt `wait_for` og blir et eget unntak; test for at et tidsavbrudd i lagringen gir `GENERATION_FAILED`.
  - `[low]` `[reject]` Blind: meldingen på andre sider sier ikke hvilken forelesning som feilet — tekstene er godkjent ordrett i storien; ny tekst kan ikke lages uten Silje.
  - `[low]` `[reject]` Blind: stisjekken er eksakt (skråstrek, undersider, flere faner) — Next lager ikke avsluttende skråstrek, og undersider kommer først i 3.3; to faner som begge viser meldingen, er ufarlig.
  - `[low]` `[patch]` Blind: fokus havner på en beholder uten navn — beholderen har nå `role="group"` og `aria-label="Flashcards"`.
  - `[low]` `[reject]` Blind: backendtestene kan henge hvis en påstand feiler før `release.set()` — bare testkode, og testene går grønt.
  - `[low]` `[reject]` Blind: tester som venter på ekte tid — korte ventetider (1,5–2,2 s), stabile i alle kjøringer.
  - `[low]` `[patch]` Blind: ingen test har krav-ID-ene NFR-12 og UX-DR44 — lagt til i titlene på testene for levende område.
  - `[false]` `[reject]` Blind: KI-sporet mangler i diffen — det oppdateres i senere steg i samme branch (story-prompten punkt 5).
  - `[low]` `[reject]` Blind: vakten ugyldiggjør hele forelesningen — én gang per jobb; da oppdateres også tellinger og filer, få ekstra kall.
  - `[low]` `[reject]` Blind: samme feiltekst står tre ganger i `messages.ts` — meldingsfila har én nøkkel per kode med vilje (testen fra epic 1 krever det).
  - `[low]` `[reject]` Blind: «Prøv igjen» stoler på lagret `requested` — backenden lagrer bare 10/20/30 (`Literal`), så andre verdier finnes ikke.
  - `[low]` `[reject]` Blind: vakten spør hvert sekund uten tak ved feil som ikke er 404 — 401 gir utlogging (vakten avmonteres); varige 5xx betyr at backenden er nede, og ett kall i sekundet er greit.
  - `[medium]` `[patch]` Kant: sonner viser aktive meldinger på nytt når `Toaster` monteres igjen (bekreftet i `sonner/dist/index.mjs`), så en melding fra før utlogging kan vises for neste bruker — vakten viser ingen melding etter at den er avmontert, og fjerner meldingene ved avmontering; test.
  - `[low]` `[reject]` Kant: `jobs/active` som feiler, gir spørring hvert sekund — samme som Blind 12.
  - `[low]` `[reject]` Kant: `jobs/{id}` som feiler varig med annet enn 404, holder jobben fulgt — samme som Blind 12.
  - `[false]` `[reject]` Kant: 409 gjør at raden aldri får vite om jobben som kjører — `catch` i `start` ugyldiggjør `jobs/latest` for alle feil, og effekten følger da jobben.
  - `[low]` `[reject]` Kant: jobb startet i en annen fane etter at siden lastet, oppdages ikke — eget valg, ført i `beslutninger.md` og eget kanttilfelle-issue; neste sidelasting finner den.
  - `[low]` `[reject]` Kant: start fra dialogen som feiler raskt, lar fokus stå på radbeholderen — beholderen er i raden, og neste Tab går til knappen; sjelden.
  - `[low]` `[patch]` Kant: tidsavbrudd utenfor `wait_for` lagres som `GENERATION_TIMEOUT` — samme rettelse som Blind 1.
  - `[false]` `[reject]` Kant: ukjent `kind` i `generationTexts` gir TypeError — registeret og `JobKind` har bare `flashcards`; ingen annen type kan komme fra backenden i dag.
  - `[medium]` `[patch]` Verifisering: koblingen av `JobWatcher` i `(app)`-layouten testes bare i e2e, som CI ikke kjører — ny vitest som rendrer `AppLayout` innlogget.
  - `[low]` `[patch]` Verifisering: «prøv igjen etter feil som ikke er 404» er ikke testet — ny test med 500 og så 200.
  - `[low]` `[patch]` Verifisering: fokus etter «Prøv igjen» er ikke testet — påstand lagt til i FR-21-testen.
  - `[low]` `[patch]` Verifisering (annet): `TimeoutError` fanges for bredt — samme rettelse som Blind 1.
  - `[low]` `[reject]` Intensjon: SK-4 testes i to deler (backend med `mock-invalid`, raden med falsk backend) — leverandøren kan ikke byttes mens appen kjører i e2e; delene dekker hele kjeden.
  - `[low]` `[reject]` Intensjon: feilet jobb i e2e er laget med `page.route` — mock-generatoren feiler ikke i Docker; backendløpet for feil er testet i pytest.
  - `[low]` `[reject]` Intensjon: E10 testes ved avmontering, ikke ekte utlogging — `RequireLogin` viser ikke barna uten innlogging; at jobben fortsetter, følger av at den er en egen asyncio-oppgave (3.1).
  - `[low]` `[reject]` Intensjon: jobber startet utenfor fanen etter montering — samme som Kant 5.

## Design Notes

- **Hvorfor meldingen utledes fra siste jobb:** storien krever at «færre» står til neste jobb og at resultatet vises etter ny innlogging (E10). Siste jobb ligger i databasen, så raden trenger ingen egen lagring.
- **Hvorfor vakten ugyldiggjør i stedet for at raden spør selv:** én spørring for alle jobber (arkitekturen: «én hook i `(app)`-layouten»), og ingen dobbel spørring hvert sekund på 04.
- **Hvorfor mal med `{content}`:** samme feilkode gjelder senere quiz («quizspørsmålene»); malen bruker mekanismen som allerede finnes i `messageWithDetails`.

## Verification

**Commands:**
- `cd backend && uv run pytest && uv run ruff check .` -- grønne
- `cd frontend && npm run test && npx tsc --noEmit` -- grønne
- `docker compose up --build -d && cd frontend && npx playwright test` -- grønne

## Auto Run Result

**Sammendrag:** Story 3.2 er bygd. Backenden har tidsgrensen `GENERATION_TIMEOUT` (3 min, bare rundt modellkallet, eget unntak) og rutene `GET /api/jobs/active` og `GET /api/jobs/{id}` (bare egne jobber, 404 ellers). Frontenden har dialogen «Lag flashcards» med Rask/Vanlig/Dyp, meldingene for færre, ingenting og feil med «Prøv igjen» (utledet fra siste jobb, så de står etter omlasting), og én jobbvakt i `(app)`-layouten som følger jobbene og viser ferdigmeldingen med sonner på andre sider.

**Filer:**
- `backend/app/core/errors.py` -- `GENERATION_TIMEOUT` (504).
- `backend/app/modules/generation/service.py` -- tidsgrense, `GenerationTimeoutError`, feilkode til `_mark_failed`, `active_jobs`, `get_job_for_user`.
- `backend/app/modules/generation/{router,schemas}.py`, `backend/app/main.py` -- `jobs_router`, `TrackedJobOut`.
- `backend/tests/test_jobs.py` -- tidsgrense, jobbrutene, omdøping med krav-ID.
- `frontend/lib/messages.ts` -- felles feilmal med `{content}`.
- `frontend/components/{choice-option,note-surface,create-row}.tsx`, `ui/{radio-group,sonner}.tsx` -- valgkort, ikon på merknadsflaten, «Prøv igjen».
- `frontend/modules/generation/{texts,api,types}.ts`, `components/{scope-dialog,job-watcher,flashcards-row}.tsx` -- dialogen, jobbvakten og raden.
- `frontend/app/(app)/layout.tsx` (+ test), `frontend/vitest.config.ts` -- vakten i layouten; vitest tar med `app/`.
- `frontend/modules/subjects/pages/lecture-page.tsx` (+ test), `frontend/e2e/flashcards.spec.ts` -- fil- og sideantall til raden; e2e for dialog, færre, feil, ferdigmelding.
- `frontend/package.json` -- `sonner` 2.0.8 (versjonen i arkitekturen).
- `README.md` -- `mock-invalid` gir nå beskjed om færre kort.

**Gjennomgang:** 28 funn. 7 rettet (2 medium: meldinger som kom igjen etter utlogging, layoutkoblingen uten test; 5 low: tidsavbrudd fanget for bredt, navn på fokusmålet, krav-ID-er, test for feil som ikke er 404, fokus etter «Prøv igjen»). Ingen utsatt. 18 avvist med begrunnelse og 3 falske, se loggen over.

**Oppfølging anbefalt:** ja. To medium-rettelser ble gjort etter gjennomgangen: oppryddingen ved avmontering i `job-watcher.tsx` (`mounted`-ref og `toast.dismiss()`) og den nye layouttesten. De er testet, men ikke gjennomgått av et uavhengig lag. Rettet etter verdi: medium 2, low 5.

**Verifisering:** `uv run pytest` 386 bestått, `ruff check` rent, `npm run test` 524 bestått, `tsc --noEmit` rent, `npx playwright test` 88 bestått mot `docker compose up --build`. Skjermbilder i `docs/skjermbilder/story-3-2/`, sammenlignet med DESIGN.md og skisse 06.

**Gjenstående risiko:** en jobb startet i en annen fane etter at siden lastet, oppdages først ved neste sidelasting (eget valg). Feiltekst på andre sider sier ikke hvilken forelesning det gjelder (godkjent ordlyd).
