# Gjennomgang: motstander-linse (ARCHITECTURE-SPINE.md, 2026-11-14)

**Metode.** For hvert hull lages to enheter ett nivå ned (stories eller moduler), bygd av hver sin agent som bare har lest spinen og sin egen story. Begge følger alle AD-er bokstavelig, men resultatet passer likevel ikke sammen. Hvert hull får et forslag til ny eller strammere AD eller konvensjon. Rangert etter sannsynlighet × skade. Småting er utelatt.

**Dom.** Spinen stenger de store veivalgene (én port, én genereringsvei, eierskap, feilformat), men flere delte kontrakter er bare navngitt og ikke formet. Det gjelder øktresultatet, jobbstatusen, sammendragets eierskap og API-formen. Der vil to uavhengige agenter nesten sikkert bygge ulikt.

---

## H1. Øktresultatet: form, «øvd» for hele emnet, og dobbel innsending (Høy × Høy)

**Enhet A**, story «Flashcard-øving» (frontend): sender `{"kind":"flashcards","lecture_id":null,"shown":12,"known":9,"not_known":3,"aborted":true}` ved «Avslutt», og så en gang til ved `pagehide`, fordi AD-9 nevner begge utløserne.
**Enhet B**, story «Semesterlinje / Neste å øve på» (`practice`): lagrer `result` som JSON, og regner en forelesning som øvd bare når `practice_session.lecture_id = lecture.id`. Økter for hele emnet (`lecture_id` er tom) gjør da ingen forelesning øvd.
**En tredje agent**, story «Quiz-øving»: bruker `answered`/`correct` i egne kolonner og `scope: "subject"` i stedet for en tom `lecture_id`.

Alle følger AD-9: ett resultat, beregnet i backend. Men semesterlinja (SK-22), FR-16 og FR-58 gir ulike svar avhengig av hvem som skrev hva. Samme økt kan også lagres to ganger, slik at «øvd lengst siden» blir feil. `sendBeacon` sender dessuten ofte `text/plain`, og da avviser FastAPI kroppen med 422 i stillhet.

**Forslag (AD-9, strammet):** `practice_session` har faste kolonner: `id` (UUID laget i klienten ved øktstart), `subject_id`, `lecture_id` (tom = hele emnet), `kind` (`flashcards|quiz|freetext`), `aborted`, `started_at`, `ended_at`, `shown`, `known`, `not_known`, `answered`, `correct`, `partial`, `wrong` (tomme der de ikke gjelder). `POST /api/practice/sessions` er idempotent på `id` (`ON CONFLICT DO NOTHING`) og godtar `text/plain` med JSON-kropp. Bestem uttrykkelig om en økt for hele emnet gjør alle forelesninger i emnet med innhold av den typen øvd. Forslag: ja, og regelen ligger i én funksjon, `practice.service.practiced_lectures()`.

## H2. Sammendraget har to eiere: forelesningen og fila (Høy × Høy)

ER-diagrammet sier `LECTURE ||--o| SUMMARY` og `FILE ||--o{ SUMMARY_POINT`. AD-7 sier at «innhold eies av kildefila».
**Enhet A**, story «Slett fil» (`files`): følger AD-7. Cascade fjerner punktene fra fila, men `summary`-raden blir stående med færre punkter, kanskje under minimumet på 5 i FR-53, eller med 0 punkter. I delete-preview telles «1 sammendrag» eller ikke noe sammendrag, avhengig av hvordan agenten leser modellen.
**Enhet B**, story «Sammendrag» (`generation`): følger FR-55 og sletter det gamle sammendraget før det nye lagres. Den legger `summary.lecture_id` med cascade fra forelesningen, slik diagrammet viser.

**Forslag (AD-7, tillegg):** Sammendraget eies av forelesningen. `summary_point.file_id` har `ON DELETE CASCADE`, og når en fil slettes eller erstattes, slettes hele sammendraget for forelesningen i samme transaksjon (det er avledet av alle filene). Delete-preview for fil, forelesning og emne viser `summaries: 0|1`. FR-55: det nye sammendraget erstatter det gamle i samme transaksjon som lagringen (AD-4).

## H3. Jobbkontrakten mellom generering og frontend er for tynn (Høy × Middels-høy)

AD-5 gir status og to antall, men ikke resten.
**Enhet A**, story «Lag flashcards» (`generation`): `POST /api/generation/lectures/{id}/flashcards` → `201 {"job_id"}`. Får den en ny jobb mens en kjører, kastes `IntegrityError` fra den delvise indeksen, som blir `500`. Tidsavbrudd lagres som `failed` uten årsak.
**Enhet B**, story «Ventestatus og ferdigmelding» (frontend, NFR-17): spør `GET /api/generation/jobs/{id}` og trenger `kind` for å skrive «Vi klarte ikke å lage [flashcardene/…]», `requested` for å vise «færre enn valgt» (FR-18), en årsak for FR-47 («ingen modeller funnet»), og en liste over aktive jobber for brukeren for å vise ferdigmelding på andre sider. «Prøv igjen» krever de opprinnelige valgene.

**Forslag (AD-5, strammet):** Jobbraden har `id, lecture_id, kind (flashcards|models|quiz|freetext|summary), params (JSON: omfang, vanskelighetsgrad), status, requested, created_count, discarded_count, error_code, created_at, finished_at`. Start: `POST /api/generation/lectures/{lecture_id}/jobs {kind, params}` → `202` med jobben. Opptatt forelesning → `409 JOB_ALREADY_RUNNING`. Status: `GET /api/generation/jobs/{id}` og `GET /api/generation/jobs?active=true`. `done` med `created_count=0` og `error_code=NO_MATERIAL` dekker FR-47 og FR-18. Tidsavbrudd gir `failed` med `GENERATION_TIMEOUT`. Polling hvert 1,5 s så lenge status er `running`. Indeksen deklareres med både `postgresql_where` og `sqlite_where` (AD-13).

## H4. Feilformatet i AD-12 brytes av FastAPIs standardsvar, og ingen eier kodelista (Høy × Middels)

**Enhet A**, story «Registrering»: bruker `HTTPException(400, detail="EMAIL_TAKEN")` og stoler på Pydantic-validering, som gir `{"detail":[…]}` med 422.
**Enhet B**, frontendens `lib/`-transport: leser bare `error.code` og viser en generell feil for alt annet. Feilteksten for passord under 8 tegn (FR-3, NFR-11) blir aldri vist. Kodene finnes også bare som løse strenger på hver side, og ingen merker når en kode mangler tekst.

**Forslag (AD-12, tillegg):** `core/errors.py` eier en `ErrorCode`-enum og en `AppError(status, code, details)`. Globale handlere skriver `HTTPException`, `RequestValidationError` (→ `422 VALIDATION_ERROR`, `details.fields: {felt: regel}`) og ukjente feil (→ `500 INTERNAL`) om til `{"error":…}`. En test sammenligner enumen med nøklene i frontendens meldingsfil.

## H5. API-formen: nesting, statuskoder, og hvem leser innhold for øving (Middels-høy × Middels)

**Enhet A** (`subjects`): `GET /api/subjects/{id}/lectures`, opprettelse → `200`, sletting → `200 {"ok":true}`.
**Enhet B** (`content`): `GET /api/content/flashcards?lecture_id=…` og `?subject_id=…`, opprettelse → `201`, sletting → `204`. Hver post har `file_id` og `page_no`, men ikke filnavnet. Øvingssiden må da gjøre et ekstra kall per kilde for å vise FR-20.
Ingen av dem bryter noe, men frontend-transporten og testene får to stiler.

**Forslag (konvensjon «API-form»):** Ressurser nestes ett nivå under eieren ved oppretting og liste (`/api/subjects/{id}/lectures`, `/api/lectures/{id}/files`), og adresseres flatt ellers (`/api/lectures/{id}`). Opprettelse → `201` med objektet, sletting → `204`, jobbstart → `202`. Ingen paginering i MVP. Innhold til øving hentes fra `content` (`GET /api/content/{kind}?lecture_id=|subject_id=`) med `source: {file_id, file_name, page_no}` og `needs_check` (FR-41) på hver post.

## H6. Skjemaet for innholdstypene har to mulige eiere, og quizalternativene har ingen form (Middels × Høy)

AD-4 sier at skjemaet defineres én gang som en Pydantic-modell, men ikke hvor. `generation → content` er tillatt.
**Enhet A** (`generation`): legger `QuizQuestionOut(options: list[str], correct_index: int)` i `generation/schemas.py` og en egen ORM-modell for å lagre.
**Enhet B** (`content`): lager `QuizQuestion` med kolonnene `option_a…option_d` og `correct: "A"` i `content/models.py`.
Det blir to tabeller eller en migrasjonskonflikt. Mock-modellen setter det riktige svaret først (NFR-2a), og det er ikke bestemt om frontend blander alternativene. Da bryter demoen FR-30.

**Forslag (AD-4, tillegg):** `content` eier ORM-modellene og Pydantic-skjemaene for hver innholdstype (`content/schemas.py`). `generation` importerer dem som `output_type` og skriver bare gjennom `content.service.save_batch()`. Flashcards er én tabell med `kind`, og `points` (JSON-liste) og `mnemonic` brukes bare når `kind=model`. Quiz lagrer `options` (JSON, 4) og `correct_index`. Lagringen blander alternativene med et frø fra innholdet, slik at det blir deterministisk, og frontend blander bare rekkefølgen på spørsmålene.

## H7. Mock-modellen og demodataene kan gå utenom løpet i AD-4 (Middels × Middels-høy)

**Enhet A**, story «Mock-modell»: et Python-objekt som returnerer ferdige domeneobjekter direkte fra `core/llm`, utenom pydantic-ai. Kontrollen og forkastingen i AD-4 kjøres da aldri i demomodus, og SK-4 tester en annen vei enn vertex.
**Enhet B**, story «Seed» (NFR-3): setter inn ferdige rader for flashcards og quiz uten `file_pages` og uten en PDF på volumet. Kildevisningen og sidebildet (FR-40) feiler da på eksempelemnet, det første sensor ser.

**Forslag (AD-3/AD-14, strammet):** Mock-modellen er en pydantic-ai `FunctionModel` som returnerer JSON for den samme `output_type`, slik at bare `Model`-objektet skiller mock fra vertex. Seed laster opp PDF-ene i `backend/app/seed/` gjennom `files.service` og lager innholdet gjennom `generation.service` med mock. Seed kjører etter `alembic upgrade head`, og aldri som en migrasjon.

## H8. Opptellingene til delete-preview og FR-16 regnes ut to steder (Middels × Middels)

**Enhet A** (`files`, FR-12) teller flashcards per fil og tar modellkort med. **Enhet B** (`practice`, FR-16) teller per forelesning og skiller modellkort fra andre kort, men tar ikke med fritekst. Brukeren ser ulike tall for det samme.

**Forslag (konvensjon):** `content.service.counts(scope)` er den eneste tellefunksjonen, og scope er `file`, `lecture`, `subject` eller `user`. Den returnerer `{flashcards, model_cards, quiz_questions, freetext_questions, summaries}`. Både delete-preview og forelesningsoversikten bruker den, og delete-preview legger bare til `files`/`lectures`.

## H9. Detaljene i innloggingen (Middels × Lav-middels)

AD-10 sier ikke hva cookien heter, hvor lenge den varer, hvordan utlogging fungerer, eller hvordan frontend vet at brukeren er logget inn. En agent lager Next-middleware som dekoder JWT-en og trenger `JWT_SECRET` i frontend, i strid med AD-1 og NFR-4. En annen bruker `GET /api/identity/me`.

**Forslag (AD-10, tillegg):** Cookien heter `sk_session` og har `Path=/`, `Max-Age=7 dager` og ingen `Secure` lokalt. `POST /api/identity/logout` sletter den. Frontend bestemmer innloggingsstatus bare med `GET /api/identity/me`, og `401 NOT_AUTHENTICATED` sender brukeren til innloggingssiden. JWT-en dekodes aldri i Next.

## H10. Sletting mens en jobb kjører (Lav-middels × Middels)

Sletter brukeren en forelesning eller fil mens en jobb kjører, fjerner cascade jobbraden. Asyncio-oppgaven prøver så å lagre innhold med fremmednøkkel til rader som ikke finnes, eller å oppdatere en jobb som er borte.

**Forslag (AD-5, tillegg):** Når jobben avsluttes, sjekker den først at jobbraden og fila finnes, i samme transaksjon som lagringen. Mangler de, forkastes alt i stillhet. Alternativt avviser sletting `409 JOB_ALREADY_RUNNING` mens en jobb kjører på forelesningen. Velg ett av de to.

---

## Mindre funn (ikke rangert)

- Bryterne i AD-11 bør også stenge rutene i backend (`404 FEATURE_DISABLED`), ikke bare skjule knappene.
- FR-13 (erstatte fil): bestem om den nye fila får ny `file_id` (anbefalt: ja, gammel fil slettes med cascade i samme kall).
- SK-5: fasiten og forklaringen sendes til frontend sammen med spørsmålet. Det er greit lokalt, men bør stå som et bevisst valg.
