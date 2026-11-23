---
title: 'Story 6.2: Fastsett instruksene til modellen for flashcards og quiz'
type: 'feature'
created: '2026-11-23'
status: 'done'
baseline_revision: '1dae65da53f646ea633c91642209122605d17d03'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-1-koble-gemini-paa-vertex-ai-inn-bak-spraakmodellporten.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Testplanen skal si at FR-2 og FR-31 for ekte modell bare kan måles manuelt (SK-13, SK-15).
    evidence: |-
      Akseptkriteriet i story 6.2 viser til testplanen, men `docs/testplan.md` lages først i story 6.5.
    location: >-
      docs/testplan.md (story 6.5)
    severity: low
  - summary: >-
      Silje har ikke prøvd instruksene med Gemini på åpent lisensierte sider ennå.
    evidence: |-
      Akseptkriteriet krever at det hun retter, føres i docs/ki-prosess/korrigeringer.md. Det krever ekte Vertex-tilgang og hennes vurdering, som den autonome kjøringen ikke har.
    location: >-
      backend/app/modules/generation/instructions/
    severity: medium
---

<intent-contract>

## Intent

**Problem:** Instruksene til Gemini ligger i dag som foreløpige `prompts/*.txt` fra epic 3 og 4. De sier ikke at modellen heller skal lage færre kort enn svake kort, at kortene skal spre seg over overskriftene, hvordan vanskelighetsgradene skiller seg, at feilalternativene skal være troverdige, eller at «alle de ovenfor» er forbudt. Sidene i forespørselen mangler filnavnet, og forespørselen har ingen grense for hvor mye tekst som sendes (utsatt funn og issue #271 fra story 6.1).

**Approach:** Flytt instruksene til `backend/app/modules/generation/instructions/flashcards.md` og `quiz.md`, skriv dem ut etter FR-2, FR-28/FR-31 og SK-17, og la registeret peke på dem (`instructions_file`). Merk hver side i forespørselen med `file_id`, filnavn og `page_no`, be modellen oppgi kilden med disse verdiene, og send sidene bare til en fast tegngrense.

## Boundaries & Constraints

**Always:**
- Instruksene skrives på norsk bokmål (som i dag), fordi modellen skal svare på bokmål og sensor skal kunne lese dem. Kode, navn og kommentarer på engelsk.
- Én instruksfil per innholdstype i `instructions/`, pekt på fra registeret, lest av `VertexGenerator`. Senere typer (epic 7–9) legger til sin egen fil på samme måte.
- `{difficulty}` i `quiz.md` erstattes med beskrivelsen fra `quiz.DIFFICULTIES`, ett sted (`vertex.instructions_for`).
- Hver side i forespørselen merkes med `file_id`, filnavn og `page_no`. Forespørselen har største antall (10, 20 eller 30).
- Sidene sendes i fast rekkefølge til summen av sidetekst når `MAX_REQUEST_PAGE_CHARS` (400 000 tegn, omtrent 100 000 tokens). Hele sider tas med eller utelates, aldri halve. Utelates sider, logges bare antall (WARNING), aldri tekst.
- Tester kaller aldri Vertex. `FunctionModel`/`TestModel` brukes.

**Never:**
- Ikke endre løpet i `service.py` utover å gi `Page` filnavnet. Ikke endre skjemaene (`LooseFlashcard`, `LooseQuizQuestion`), mock-reglene eller frontenden.
- Ikke send sidebilder eller legg til `formula_missing` (story 6.3). Ikke velg modell (#4).
- Ikke skriv testplanen (story 6.5) eller gjør kvalitetsmålingen (story 6.6).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Vanlig forespørsel | 2 sider fra `notater.pdf`, omfang 20 | Brukermeldingen har «Lag høyst 20 …» og hver side merket `file_id: …, filnavn: notater.pdf, page_no: N` med teksten under | – |
| Omfang 10/20/30 | `requested` 10, 20 eller 30 | Tallet står i forespørselen, instruksen står i `instructions` | – |
| For mye tekst | Sider med til sammen mer enn grensen | Sidene tas med i rekkefølge til neste side ville gått over; resten utelates | WARNING med antall sendte og utelatte sider |
| Første side alene over grensen | Én side over 400 000 tegn | Siden tas likevel med (minst én side sendes alltid) | – |
| Quiz uten vanskelighetsgrad i options | `difficulty=None` | `{difficulty}` står igjen urørt (skjer ikke i appen: `JobCreate` setter alltid `medium`) | – |

</intent-contract>

## Code Map

- `backend/app/modules/generation/prompts/flashcards.txt`, `quiz.txt` -- dagens instrukser. Flyttes med `git mv` til `instructions/*.md` og skrives ut.
- `backend/app/modules/generation/registry.py:44-45` -- `ContentType.prompt_file`. Får navnet `instructions_file`.
- `backend/app/modules/generation/flashcards.py:20,146`, `quiz.py:19,29-32,163` -- `PROMPT_FILE` og `quiz.build_prompt` (duplikat av `vertex.instructions_for`). Blir `INSTRUCTIONS_FILE`; `build_prompt` fjernes.
- `backend/app/modules/generation/port.py:13-19` -- `Page(file_id, page_no, text)`. Får `file_name: str = ""` sist, så posisjonelle kall i testene virker.
- `backend/app/modules/files/service.py:174-185` -- `pages_for_lecture` gir `(file_id, page_no, text)`. Utvides med `File.original_name`. Eneste kaller er `generation/service.py:173`.
- `backend/app/modules/generation/vertex.py:52-74` -- `instructions_for` og `user_message`. Merking med filnavn, grense for tegn, logg ved utelatte sider.
- `backend/tests/test_vertex.py:219-256` -- dagens tester av forespørselen; hjelperne `_prompt_text`, `_answer`.
- `backend/tests/test_quiz.py:240-264`, `test_generation.py:175-183` -- tester som bruker `build_prompt`/`prompt_file` og sjekker regler. Skrives om.
- `backend/.dockerignore` -- utelater ikke `.md`, så instruksene kommer med i bildet.

## Tasks & Acceptance

**Execution:**
- `backend/app/modules/generation/instructions/flashcards.md` -- skriv instruksen: bare fra sidene; norsk bokmål; norske fagbegreper slik de står, engelsk i parentes når notatene bruker begge («merkevare (brand)»); begge korttyper (`qa`, `concept`); færre enn største antall heller enn svake kort; spre kortene over overskriftene; kilde med `file_id` og `page_no` fra sidemerket; ikke lage eksisterende kort.
- `backend/app/modules/generation/instructions/quiz.md` -- skriv instruksen: fire alternativer med nøyaktig ett riktig, forklaring, kilde; alle tre vanskelighetsgrader beskrevet etter FR-28 og den valgte (`{difficulty}`); omtrent like lange alternativer; troverdige feilalternativer; ingen «alle de ovenfor», «ingen av de ovenfor», «både A og B» eller lignende; samme språk- og kilderegler som flashcards.
- `registry.py`, `flashcards.py`, `quiz.py` -- `instructions_file` / `INSTRUCTIONS_FILE`, fjern `build_prompt`.
- `port.py`, `files/service.py`, `generation/service.py` -- filnavnet følger siden til porten.
- `vertex.py` -- sidemerket `--- file_id: …, filnavn: …, page_no: … ---`, setning om at kilden oppgis med disse verdiene, `MAX_REQUEST_PAGE_CHARS` og WARNING ved utelatte sider.
- `backend/tests/test_instructions.py` (ny) -- tester med krav-ID for innholdet i instruksfilene (FR-2, FR-28, FR-31, SK-17, AR-3), blant dem `test_fr2_flashcard_instructions_require_norwegian_terms` og `test_fr31_quiz_instructions_require_equal_length`.
- `backend/tests/test_vertex.py` -- `FunctionModel`-test parametrisert over 10/20/30 for sider, filnavn, instruks og antall; tester for grensen og loggen.
- `backend/tests/test_quiz.py`, `test_generation.py` -- skriv om til `instructions_file` og `vertex.instructions_for`.

**Acceptance Criteria:**
- Given registeret, when flashcards og quiz hentes, then peker `instructions_file` på `instructions/flashcards.md` og `instructions/quiz.md`, filene finnes i Git, og `prompts/` finnes ikke lenger.
- Given en forelesning med en opplastet fil, when en jobb kjøres med `VertexGenerator`, then har forespørselen filens ekte filnavn i sidemerket.
- Given `FunctionModel`, when flashcards eller quiz genereres med omfang 10, 20 eller 30, then har `instructions` hele instruksfilen (med vanskelighetsgraden erstattet), og brukermeldingen har tallet og hver side med `file_id`, filnavn og `page_no`.
- Given sider over tegngrensen, when forespørselen bygges, then sendes bare hele sider under grensen, og loggen har antall, ikke tekst.

## Spec Change Log

## Review Triage Log

### 2026-11-23 — Review pass
- verdicts: 21 findings — high 0, medium 0, low 13, false 5, maybe-false 0
- findings:
  - `[low]` `[patch]` (edge) Filnavnet kan etterligne et felt i sidemerket (`x, page_no: 7 ---`) — filnavnet står nå JSON-sitert i merket; ny test `test_ar3_file_name_cannot_fake_a_page_label_field`.
  - `[low]` `[reject]` (edge) Sider over grensen godtas fortsatt av `validate_item` — modellen ser dem ikke og må gjette både `file_id` og `page_no`; å sende med de sendte sidene ut av porten gir ny overflate for et sjeldent tilfelle.
  - `[low]` `[reject]` (edge) Utelatte sider sies ikke fra om til studenten — grensen er over åtte fulle PDF-er; varsel krever nytt felt og UI-tekst. Ført som kanttilfelle-issue til Silje.
  - `[false]` `[reject]` (edge) Ukjent vanskelighetsgrad gir KeyError — `JobCreate.difficulty` er en `Literal` med de tre verdiene, så en ukjent verdi når aldri jobben.
  - `[false]` `[reject]` (edge) Første side sendes selv over grensen — slik matrisen i spesifikasjonen sier («minst én side sendes alltid»), og testet.
  - `[low]` `[reject]` (blind) Stille kutt av slutten av notatene — samme som edge-funnet over.
  - `[low]` `[reject]` (blind) Grensen teller bare sidetekst, ikke eksisterende nøkler og instruksene — de er små (forsider/spørsmål) mot 400 000 tegn; tidsgrensen og `GENERATION_TIMEOUT` dekker resten.
  - `[low]` `[reject]` (blind) Vanskelighetsgraden står to steder og gir to kolon i «Valgt vanskelighetsgrad: Middels: forstå sammenhenger.» — teksten er lesbar for modellen, og testene sjekker begge; å endre `DIFFICULTIES` ville bryte eksisterende FR-31-tester uten gevinst.
  - `[false]` `[reject]` (blind) Quiz uten vanskelighetsgrad sender `{difficulty}` — `JobCreate._difficulty_fits_kind` setter alltid `medium` for quiz.
  - `[low]` `[patch]` (blind) Filnavn kan gjøre sidemerket tvetydig — samme rot som edge-funnet; rettet med JSON-sitering.
  - `[low]` `[reject]` (blind) Kilderegelen står både i instruksen og brukermeldingen — bevisst gjentatt nær sidene; ordlyden motsier ikke instruksen.
  - `[low]` `[patch]` (blind) `quiz.md` manglet regelen om kilde når flere sider brukes — lagt til; testen `test_ar3_instructions_cite_the_main_page_when_several_pages_are_used` dekker begge filene.
  - `[low]` `[patch]` (blind) Instruksene sa ikke hva modellen gjør med sider uten faglig innhold, eller at tom liste er greit — lagt til i begge filene med test.
  - `[low]` `[reject]` (blind) Testene sjekker ordrette setninger, ett navn er smalere enn det dekker, og grensen er hardkodet — testene skal fange at reglene fra akseptkriteriene forsvinner; navnet er storiens eget eksempel.
  - `[false]` `[reject]` (blind) KI-sporet, spesifikasjonen og `frontend/e2e-skjermbilder/` mangler i diffen — KI-sporet skrives etter byggeløpet i samme økt, spesifikasjonen committes, og skjermbildemappa skal ikke røres.
  - `[low]` `[patch]` (blind) Småting: lang linje i `registry.py` — brutt om. Tomt standard-filnavn og tuppel i stedet for NamedTuple avvist: appen sender alltid navnet, og eneste kaller er én linje.
  - `[low]` `[patch]` (verification) Filnavnet settes inn i sidemerket uten sitering — samme rot som edge-funnet; rettet.
  - `[low]` `[defer]` (intent) Siljes prøving med Gemini (AC5) og føring i `korrigeringer.md` er ikke gjort — krever ekte tilgang og hennes vurdering; ført som utsatt og åpent punkt.
  - `[low]` `[defer]` (intent) Testplanen sier ikke at FR-2/FR-31 bare kan måles manuelt — testplanen lages i story 6.5; ført som utsatt.
  - `[low]` `[reject]` (intent) Grensen fra #271 er utenfor storieteksten — oppdraget ba uttrykkelig om å se på #271 i denne storien.
  - `[low]` `[reject]` (intent) FR-2-språkregelen står også i `quiz.md` — i tråd med brukerhistorien («kort og quizspørsmål på norsk med fagbegrepene»).

## Design Notes

**Grensen (#271):** Gemini Flash har et kontekstvindu på om lag 1 million tokens, men tidsgrensen er 3 minutter. 400 000 tegn er omtrent 100 000 tokens, mer enn åtte fulle PDF-er på 50 sider med vanlig notattekst. Det er den enkleste trygge løsningen: jobben feiler ikke uforklarlig, og en vanlig forelesning merker ingenting. Ulempen er at kort fra sider etter grensen ikke lages, uten at studenten får beskjed; det føres som kanttilfelle.

```python
budget, sent = MAX_REQUEST_PAGE_CHARS, []
for page in pages:
    if sent and len(page.text) > budget:
        break
    sent.append(page); budget -= len(page.text)
```

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alle grønne, ingen nettverkskall.
- `cd frontend && npm run test` -- expected: alle grønne (uendret).
- `cd frontend && npx playwright test` mot `docker compose up --build -d` -- expected: alle grønne.

## Auto Run Result

Status: done

**Hva som ble bygd:** Instruksene til Gemini ligger nå i `backend/app/modules/generation/instructions/flashcards.md` og `quiz.md` (flyttet fra `prompts/*.txt` og skrevet ut etter FR-2, FR-28, FR-31 og SK-17). Registeret peker på dem med `instructions_file`, og `vertex.instructions_for` er eneste sted `{difficulty}` erstattes. Hver side i forespørselen merkes med `file_id`, JSON-sitert filnavn og `page_no`, og modellen bes oppgi kilden med disse. Sideteksten sendes i hele sider opp til 400 000 tegn (#271); utelatte sider logges bare som antall.

**Filer:**
- `backend/app/modules/generation/instructions/flashcards.md`, `quiz.md` -- instruksene.
- `registry.py`, `flashcards.py`, `quiz.py`, `mock.py` -- `instructions_file`, `build_prompt` fjernet.
- `port.py`, `files/service.py`, `generation/service.py` -- filnavnet følger siden til porten.
- `vertex.py` -- sidemerket, kildesetningen, `MAX_REQUEST_PAGE_CHARS`, `pages_within_limit`.
- `backend/tests/test_instructions.py` (ny), `test_vertex.py`, `test_quiz.py`, `test_generation.py` -- tester med krav-ID.

**Gjennomgang:** 21 funn. 7 rader rettet (alle lave, 4 med felles rot), 2 utsatt, 12 avvist med begrunnelse i triageloggen. Rettingene ble gjort av hovedøkten direkte.

**Oppfølgingsgjennomgang:** `false`. Ingen høye eller middels funn ble rettet (rettet: høy 0, middels 0, lav 7).

**Verifisering:** `uv run pytest` grønn (158 i de berørte filene etter rettingene, full kjøring i økten). `npm run test` og `npx playwright test` kjøres i økten etter byggeløpet.

**Gjenværende risiko:** Ingenting er prøvd mot ekte Gemini. Om modellen følger instruksene, måles først i stikkprøvene i story 6.6, og Siljes prøving med Gemini gjenstår.
