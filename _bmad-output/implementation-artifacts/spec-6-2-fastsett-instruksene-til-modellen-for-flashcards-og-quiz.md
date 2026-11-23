---
title: 'Story 6.2: Fastsett instruksene til modellen for flashcards og quiz'
type: 'feature'
created: '2026-11-23'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-1-koble-gemini-paa-vertex-ai-inn-bak-spraakmodellporten.md'
warnings: ['oversized']
deferred: []
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
