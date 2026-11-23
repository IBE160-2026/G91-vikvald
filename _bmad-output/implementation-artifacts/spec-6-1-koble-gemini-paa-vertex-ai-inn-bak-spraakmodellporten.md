---
title: 'Story 6.1: Koble Gemini på Vertex AI inn bak språkmodellporten'
type: 'feature'
created: '2026-11-23'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** `LLM_PROVIDER=vertex` stopper i dag backenden ved oppstart («not supported yet»). Appen kan bare lage demoinnhold, og studenten får aldri innhold av ekte kvalitet.

**Approach:** Legg til `VertexGenerator` i `generation`, bak den samme porten `generate(kind, pages, options)` som mock-modellene. Den bruker pydantic-ai med `GoogleCloudProvider(location='eu')`, ADC og `NativeOutput` med det løse skjemaet fra registeret. Svaret går gjennom det samme løpet (validering, forkasting, lagring). Frontenden viser de ekte tekstene når `demo_mode` er `false`, og README/`.env.example` forklarer oppsettet med plassholdere.

## Boundaries & Constraints

**Always:**
- Bare `app/modules/generation/` importerer `pydantic_ai`. `location` er alltid den faste verdien `'eu'`, aldri fra miljøet og aldri `global`.
- Modell (`VERTEX_MODEL`) og tenkenivå (`VERTEX_THINKING`) leses fra innstillingene. `.env.example` har `VERTEX_MODEL=gemini-3.5-flash` og `GOOGLE_CLOUD_PROJECT` med plassholder.
- Mangler `GOOGLE_CLOUD_PROJECT` eller `VERTEX_MODEL` når `LLM_PROVIDER=vertex`, stopper oppstarten med én `CRITICAL`-linje som navngir innstillingen, uten verdier.
- Feil og tidsavbrudd i kallet gir `GENERATION_FAILED` / `GENERATION_TIMEOUT` gjennom det eksisterende løpet. Loggen har aldri notattekst eller modellsvar.
- Tester kaller aldri Vertex: `pydantic_ai.models.ALLOW_MODEL_REQUESTS = False` i `conftest.py`, og `FunctionModel`/`TestModel` brukes i stedet.
- Kode, navn og kommentarer på engelsk. UI-tekst på norsk ordrett fra skissene.

**Never:**
- Ingen ekte nøkler, prosjekt-ID-er eller legitimasjon i repoet. Ingen `NEXT_PUBLIC_`-innstilling for Vertex. `/api/config` får ingen nye felt.
- Ikke fastsett de endelige instruksene til modellen (story 6.2), ikke send sidebilder (story 6.3).
- Ikke endre løpet i `service.py` utover det som trengs, og ikke endre planleggingsdokumentene.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Vertex valgt | `LLM_PROVIDER=vertex`, prosjekt og modell satt | `select_generator` gir `VertexGenerator`, oppstarten går videre | – |
| Mangler innstilling | `vertex` uten `GOOGLE_CLOUD_PROJECT` (eller `VERTEX_MODEL`) | Oppstart stopper | `CRITICAL`: `LLM_PROVIDER=vertex needs GOOGLE_CLOUD_PROJECT …`, ingen verdier |
| Gyldig svar | Modellen gir `{"items": [...]}` | Gyldige elementer lagres, ugyldige forkastes og telles | – |
| Ett element med feil type | f.eks. `file_id: "bad"` eller et element som er en streng | Bare det elementet forkastes, jobben blir `done` | `validate_item` gir `None` |
| Kallet feiler | Unntak fra modellen (ingen ADC, nett) | Jobben `failed` med `GENERATION_FAILED`, ingenting lagres | Logg har jobb-id og unntakstype |
| Kallet tar for lang tid | Over `GENERATION_TIMEOUT_SECONDS` | `failed` med `GENERATION_TIMEOUT` | Eksisterende `wait_for` |
| Quiz med vanskelighetsgrad | `options.difficulty="hard"` | `{difficulty}` i instruksene erstattes med «vanskelig» | – |

</intent-contract>

## Code Map

- `backend/app/modules/generation/port.py` -- porten `Generator`, `Page`, `GenerationOptions`. Uendret.
- `backend/app/modules/generation/providers.py` -- `select_generator` kaster i dag `UnsupportedProviderError` for `vertex`. Utvides med Vertex og sjekk av påkrevde innstillinger.
- `backend/app/modules/generation/registry.py` -- `ContentType.loose_model` og `prompt_file` brukes av den nye generatoren.
- `backend/app/modules/generation/flashcards.py`, `quiz.py` -- løse modeller (`LooseFlashcard`, `LooseQuizQuestion`), `prompts/*.txt`. `quiz.txt` har `{difficulty}`.
- `backend/app/modules/generation/service.py` -- `run_job`/`_generate_and_save`: tidsgrense, `GENERATION_FAILED`, logger bare id og unntakstype. Gjenbrukes uendret.
- `backend/app/main.py:lifespan` -- kaller `select_generator` og logger `CRITICAL` ved `UnsupportedProviderError`.
- `backend/app/core/config.py` -- `Settings`. Får `GOOGLE_CLOUD_PROJECT`, `VERTEX_MODEL`, `VERTEX_THINKING`.
- `backend/app/core/public_config.py` -- `/api/config`. Uendret, men testes for vertex.
- `backend/tests/conftest.py` -- setter `LLM_PROVIDER=mock`. Får `ALLOW_MODEL_REQUESTS = False`.
- `backend/tests/test_generation.py:188-209` -- to tester som forventer at vertex er «not supported». Skrives om.
- `backend/tests/test_config.py` -- `test_nfr4_alle_innstillinger_staar_i_env_example` krever at alle innstillinger står i `.env.example`.
- `docker-compose.yml` -- backendens `environment`. Får Vertex-innstillingene.
- `backend/Dockerfile` -- brukeren `app` med hjem `/home/app`, så ADC monteres til `/home/app/.config/gcloud`.
- `frontend/modules/identity/pages/account-page.tsx:127` -- Språkmodell-raden. Uten demo: «Gemini fra Google, behandlet i EU».
- `frontend/modules/subjects/pages/lecture-page.tsx:228` -- merknadsflaten under opplastingen. Uten demo: personvernmerknaden fra skisse 04.
- `frontend/components/note-surface.tsx` -- `NoteSurface` (lås som standard).
- `frontend/modules/generation/components/scope-dialog.tsx:162`, `components/terms-text.tsx:42` -- har allerede demo-bryterne. Uendret.

## Tasks & Acceptance

**Execution:**
- `backend/pyproject.toml`, `backend/uv.lock` -- legg til `pydantic-ai-slim[google]==2.68.0` med `uv add` -- versjonen fra arkitekturen.
- `backend/app/core/config.py` -- `GOOGLE_CLOUD_PROJECT: str | None`, `VERTEX_MODEL: str | None`, `VERTEX_THINKING: Literal["minimal","low","medium","high"] = "low"` -- påkrevd-sjekken ligger i `providers`, så demomodus aldri krever dem.
- `backend/app/modules/generation/vertex.py` (ny) -- `VertexGenerator(model, model_settings)` som bygger instruksene fra `prompt_file` og sidene i brukermeldingen, kaller en `Agent` med `NativeOutput` av et omslag `{items: [løst element]}` og returnerer elementene som de er. `build_vertex_model(project, model_name)` lager `GoogleModel` med `GoogleCloudProvider(project=..., location=VERTEX_LOCATION)`, der `VERTEX_LOCATION = "eu"`. Slå av pydantic-ais oppstartsbanner -- egen fil holder pydantic-ai inne i `generation`.
- `backend/app/modules/generation/providers.py` -- `vertex` gir `VertexGenerator` (bufret per innstillinger). Manglende innstilling gir `MissingProviderSettingError` (underklasse av `UnsupportedProviderError`, så `lifespan` logger den uendret) med navnet på innstillingen.
- `backend/tests/conftest.py` -- `models.ALLOW_MODEL_REQUESTS = False`.
- `backend/tests/test_vertex.py` (ny) -- tester med krav-ID: EU-lokasjon og aldri `global`, skjema og instruksene via `FunctionModel`, løpet med forkasting og lagring, feil gir `GENERATION_FAILED` uten notattekst i loggen, manglende innstillinger, `/api/config` uten hemmeligheter, ingen `pydantic_ai`-import utenfor `generation`, ingen `NEXT_PUBLIC_` i `.env.example`/`docker-compose.yml`.
- `backend/tests/test_generation.py` -- skriv om de to vertex-testene til de nye reglene.
- `.env.example`, `docker-compose.yml` -- Vertex-innstillingene med plassholdere. Compose sender dem videre til `backend`.
- `README.md` -- avsnitt «Bruk Gemini (Vertex AI)»: `.env`, `docker-compose.override.yml` med skrivebeskyttet `~/.config/gcloud`, hvordan mellomlagring slås av og sjekkes. Oppdater `LLM_PROVIDER`-raden og innstillingstabellen.
- `frontend/modules/identity/pages/account-page.tsx`, `frontend/modules/subjects/pages/lecture-page.tsx` og testene deres -- tekstene uten demo fra skisse 04 og storien.

**Acceptance Criteria:**
- Given `LLM_PROVIDER=vertex` med prosjekt og modell, when backend starter, then `lifespan` fullfører uten `CRITICAL`, og `get_generator()` er en `VertexGenerator`.
- Given en `VertexGenerator` bygd fra innstillingene, when leverandøren inspiseres, then klientens `location` er `eu`, endepunktet er `aiplatform.eu.rep.googleapis.com`, og `global` forekommer ikke.
- Given `VERTEX_MODEL` og `VERTEX_THINKING` i miljøet, when generatoren bygges, then modellnavnet og `thinking` er hentet derfra.
- Given `demo_mode` `false`, when kontosiden og forelesningssiden vises, then står «Gemini fra Google, behandlet i EU», og personvernmerknaden har «Notatene sendes til Googles språkmodell i EU.» og «Ikke last opp personopplysninger, f.eks. navn på medstudenter.».

## Spec Change Log

## Review Triage Log

## Design Notes

**Løst skjema som ikke velter jobben:** Gemini får JSON-skjemaet til den løse modellen gjennom `WithJsonSchema`, men pydantic-ai validerer hvert element bare som `Any`. Et element med feil type gjør da ikke hele svaret ugyldig. Det forkastes og telles av `validate_item`, slik det skjer i demomodus.

```python
item = Annotated[Any, WithJsonSchema(content_type.loose_model.model_json_schema())]
wrapper = create_model(f"{kind}_items", items=(list[item], ...))
agent = Agent(model, output_type=NativeOutput(wrapper), instructions=instructions, model_settings=settings)
```

**Instruksene:** Innholdet i `prompt_file` (der `{difficulty}` blir «lett», «middels» eller «vanskelig»). Brukermeldingen har antallet, eksisterende nøkler og hver side som `file_id`, `page_no` og tekst. Story 6.2 fastsetter de endelige instruksene.

**Tenkenivå `low` som standard** hvis `VERTEX_THINKING` ikke er satt. Det er raskt og billig, og nok til å lage kort fra én forelesning.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alle grønne, ingen nettverkskall.
- `cd frontend && npm run test` -- expected: alle grønne.
- `cd frontend && npx playwright test` mot `docker compose up --build -d` -- expected: alle grønne.
