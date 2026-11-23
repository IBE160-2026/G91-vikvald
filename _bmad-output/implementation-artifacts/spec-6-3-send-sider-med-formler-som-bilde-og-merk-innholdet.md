---
title: 'Story 6.3: Send sider med formler som bilde og merk innholdet'
type: 'feature'
created: '2026-11-23'
status: 'done'
baseline_revision: 'cef8beac61eecefb00ab62f6e268e75d5605963c'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-2-fastsett-instruksene-til-modellen-for-flashcards-og-quiz.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Silje har ikke lastet opp Principles of Economics 3e side 127–128 i appen selv.
    evidence: |-
      Akseptkriteriet sier at Silje laster opp fila lokalt og noterer resultatet i issue #9. Regelen er målt direkte med PyMuPDF på hele boka (263 og 155 sammensatte tegninger mot 0 på tekstsider), men hele boka har 995 sider og må deles opp under grensen på 50 sider før opplasting.
    location: >-
      issue #9
    severity: low
  - summary: >-
      Ingenting er prøvd mot ekte Gemini med sidebilder.
    evidence: |-
      Testene bruker FunctionModel og sjekker forespørselen. Om Gemini leser formlene riktig fra bildet (SK-16), måles i stikkprøvene i story 6.6.
    location: >-
      backend/app/modules/generation/vertex.py
    severity: low
---

<intent-contract>

## Intent

**Problem:** Formler som er tegnet som vektorgrafikk i en PDF, finnes ikke i teksten PyMuPDF leser ut. Modellen ser dem derfor ikke, og studenten får ingen beskjed om at et kort eller spørsmål bygger på en side der noe kan mangle. `file_pages.needs_image` og `formula_flag` finnes allerede i databasen, men er alltid `false` (FR-40, FR-41, AR-6, UX-DR37).

**Approach:** `files` setter `needs_image` ved opplasting etter en fast regel (vektortegninger eller bilder over en lav terskel). Genereringsløpet lager et PNG-bilde av hver slik side fra den lagrede PDF-en (aldri lagret) og sender det med teksten til porten. Skjemaene får `formula_missing`, instruksene ber modellen bruke det, og løpet setter `formula_flag` ett sted for alle innholdstyper. Frontenden viser en felles `formula-flag`-komponent rett over kildelenken.

## Boundaries & Constraints

**Always:**
- Regelen og tersklene står i en kodekommentar i `files/pdf.py` og i en kommentar på issue #9 (med målingene fra *Principles of Economics 3e* side 120–135).
- Regel: `needs_image = true` når siden har minst `MIN_COMPLEX_DRAWINGS` (3) «sammensatte» vektortegninger (en tegning med minst 5 linje-/kurvestykker eller minst én kurve), eller et innebygd bilde som dekker minst `MIN_IMAGE_AREA_SHARE` (0,5 %) av siden. Enkle streker og rammer (topptekst, tabellinjer) teller ikke.
- Bildet lages på forespørsel gjennom `core/storage.read_pdf` og PyMuPDF i en tråd, holdes bare i minnet mens jobben går, og skrives aldri til disk eller database.
- `formula_flag = page.needs_image OR item.formula_missing is True`, regnet ut ett sted i `generation/service.py`, og sendt videre til `save` for alle typer i registeret. Gjelder også i demomodus.
- `formula_missing` ligger i en felles basemodell i `port.py` som de løse modellene arver. En verdi som ikke er `true`/`false`/mangler, regnes som `true` (heller et merke for mye), og forkaster aldri elementet.
- Formelmerket viser ordrett «Inneholder formel – sjekk mot kilden», bruker `NoteSurface` med `Info`-ikonet, står rett over `SourceLink`, og leses som tekst av skjermleser.
- Tester kaller aldri Vertex (`FunctionModel`, `ALLOW_MODEL_REQUESTS = False`). Testnavn har krav-ID.

**Never:**
- Ingen ny migrering (kolonnene finnes). Ingen lagring av sidebilder. Ingen OpenStax-PDF i repoet.
- `MockGenerator` og `InvalidMockGenerator` setter aldri `formula_missing`.
- Ingen oransje eller rød farge på merket. Ikke endre modellvalg (#4).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Vektorformel | PDF-side med ≥ 3 sammensatte tegninger | `needs_image = true` | – |
| Bare tekst | Side med tekst og en understrek | `needs_image = false` | – |
| Stort bilde | Side med et bilde over 0,5 % av flaten | `needs_image = true` | – |
| Jobb med bildeside | Side med `needs_image` | Porten får `Page.image` (PNG-bytes); andre sider har `image = None` | – |
| Mange bildesider | Flere enn `MAX_PAGE_IMAGES` (20) | Bare de 20 første (i fast rekkefølge) får bilde; alle beholder `needs_image` og merkes | WARNING med antall, aldri tekst |
| PDF borte fra disk | Lagret fil mangler | Siden sendes uten bilde, jobben går videre, innholdet merkes likevel | WARNING med fil-id |
| Modellen melder mangel | `formula_missing: true` på side uten bilde | `formula_flag = true` | – |
| Rar verdi | `formula_missing: "ja"` | Elementet beholdes, `formula_flag = true` | – |
| Vertex med bilde | Side med `image` | Brukermeldingen blir en liste: tekst, så `BinaryContent(image/png)` rett etter sidens tekst; uten bilder er den en vanlig streng | – |

</intent-contract>

## Code Map

- `backend/app/modules/files/pdf.py` -- `read_pages` gir i dag `list[str]`. Skal gi `list[PdfPage]` (`text`, `needs_image`) og få `page_needs_image(page)` og `render_page_png(data, page_no)`.
- `backend/app/modules/files/service.py:30-70` -- `store_file` lager `FilePage(..., needs_image=False)`. Bruk verdien fra `PdfPage`. `pages_for_lecture` (174) gir også `needs_image`. Ny `page_images(user_id, wanted)` leser PDF-ene via `storage.read_pdf`.
- `backend/app/modules/files/router.py:189,208` -- kallere av `read_pages`/`store_file` (uendret signatur bortsett fra typen).
- `backend/app/modules/files/models.py:43`, `content/models.py:36,57` -- kommentarene «Always false for now» oppdateres.
- `backend/app/modules/generation/port.py` -- `Page` får `needs_image: bool = False`, `image: bytes | None = None`; ny `FormulaReport`-basemodell.
- `backend/app/modules/generation/registry.py` -- `Save` tar `list[ValidItem]` (`item`, `formula_flag`).
- `backend/app/modules/generation/service.py:169-215` -- `_generate_and_save`: hent eier, lag bilder (utenfor tidsgrensen, etter commit), regn ut `formula_flag`.
- `backend/app/modules/generation/flashcards.py`, `quiz.py` -- løse modeller arver `FormulaReport`; `save` sender flagget videre.
- `backend/app/modules/content/service.py:28-120` -- `NewFlashcard`/`NewQuizQuestion` får `formula_flag`; ut-skjemaene (`schemas.py`) og byggerne (164-358) får `formula_flag`.
- `backend/app/modules/generation/vertex.py:84-105` -- `user_message` og `generate`: bilde etter sidens tekst, merknad i sidemerket.
- `backend/app/modules/generation/instructions/*.md` -- nytt avsnitt om sidebilder og `formula_missing`.
- `backend/tests/test_files.py:540-555`, `test_generation.py:30`, `test_replace.py:261` -- bruker `read_pages`/`store_file`.
- `backend/tests/test_vertex.py:59` -- `_prompt_text` forutsetter streng; tåler liste ved å hoppe over bilder.
- `frontend/components/note-surface.tsx`, `source-link.tsx` -- gjenbrukes av ny `formula-flag.tsx`.
- `frontend/modules/practice/components/flashcard.tsx:105`, `explanation-card.tsx:26`, `missed-list.tsx:64,87`, `pages/flashcard-session-page.tsx:493`, `pages/quiz-session-page.tsx:561`, `quiz-question.tsx:165`, `types.ts` -- der merket vises og flagget sendes videre.
- `frontend/e2e/pdf.ts` -- PDF-byggeren får vektorkurver på valgte sider.

## Tasks & Acceptance

**Execution:**
- `backend/app/modules/files/pdf.py` -- `PdfPage`, regelen med konstanter og kommentar, `render_page_png` (150 dpi) -- FR-40.
- `backend/app/modules/files/service.py`, `router.py` -- lagre `needs_image`, gi den ut i `pages_for_lecture`, ny `page_images` -- AR-6.
- `backend/app/modules/generation/port.py`, `registry.py`, `service.py`, `flashcards.py`, `quiz.py` -- bilder til porten, `FormulaReport`, `ValidItem`, flagget ett sted -- FR-40/41.
- `backend/app/modules/content/service.py`, `schemas.py`, `models.py` -- lagre og vise `formula_flag`.
- `backend/app/modules/generation/vertex.py`, `instructions/flashcards.md`, `quiz.md` -- bilder i forespørselen, instruks om `formula_missing`.
- `backend/tests/fixtures/formula_pdf.py` (ny) -- bygger en liten PDF med en vektorformel på side 1 og bare tekst på side 2.
- `backend/tests/test_formula.py` (ny) -- `test_fr40_vector_formula_page_needs_image`, tekstside `false`, bilde over/under terskel, bilde til porten og ikke på disk/DB, taket på 20, PDF borte, `test_fr41_flag_set_when_model_reports_missing`, rar verdi, mock setter aldri feltet, flagget i API-et for begge typer, Vertex-meldingen med `BinaryContent`.
- Eksisterende tester -- tilpass til `PdfPage` og listeformen.
- `frontend/components/formula-flag.tsx` (+ test) -- felles komponent.
- `frontend/modules/practice/...` -- `formula_flag` i typene; merket i kortet, forklaringen og begge feillistene.
- `frontend/e2e/pdf.ts`, `frontend/e2e/formelmerke.spec.ts` (ny) -- opplasting av PDF med vektorformel → merket vises i øving, forklaring og feilliste, med axe; ikke vist for tekstsider.

**Acceptance Criteria:**
- Given en opplastet PDF med en vektorformel på side 1 og bare tekst på side 2, when sidene lagres, then har side 1 `needs_image = true` og side 2 `false`.
- Given en jobb med en bildeside, when løpet kjører, then får porten PNG-bytes for den siden, og ingen ny fil finnes i `UPLOAD_DIR` og ingen bildedata i databasen.
- Given et gyldig element fra en bildeside eller med `formula_missing: true`, when det lagres, then er `formula_flag = true` i API-svaret; ellers `false`.
- Given et kort eller spørsmål med `formula_flag = true`, when det vises under øving, i forklaringen eller i feillisten, then står «Inneholder formel – sjekk mot kilden» rett over kilden, og axe har ingen brudd.

## Spec Change Log

## Review Triage Log

### 2026-11-23 — Review pass
- verdicts: 32 findings — high 0, medium 3, low 25, false 4, maybe-false 0
- findings:
  - `[low]` `[reject]` (blind) Bildebudsjettet brukes på sider som tegngrensen senere kutter — krever over 400 000 tegn sidetekst før en bildeside; å flytte grensen inn i løpet gir ny kobling mellom service og vertex for et sjeldent tilfelle.
  - `[low]` `[reject]` (blind) Bakgrunnsbilde over hele lysbildet merker alle sider — i tråd med «heller en side for mye» i storien; ført som kanttilfelle-issue så Silje kan stramme inn regelen.
  - `[low]` `[reject]` (blind) Regelen er bare målt på én lærebok; avrundede rammer teller som sammensatte — samme rot og samme kanttilfelle-issue; ingen ekte lysbildenotater å måle på uten personopplysninger.
  - `[low]` `[reject]` (blind) Filer lastet opp før endringen får aldri `needs_image` — appen er ikke tatt i bruk ennå; en ny opplasting retter det.
  - `[low]` `[patch]` (blind) PDF-en åpnes på nytt for hver side og alle PDF-er holdes i minnet — hver PDF åpnes nå én gang, alle ønskede sider tegnes fra den, og bytene slippes etterpå.
  - `[low]` `[reject]` (blind) Bildetegningen har ingen tidsgrense — 20 sider tar sekunder; med pikseltaket under er en patologisk side begrenset.
  - `[low]` `[reject]` (blind) Strengen «false» regnes som `true` — skjemaet sier boolean, og Gemini følger `responseSchema`; et merke for mye er den trygge feilen.
  - `[false]` `[reject]` (blind) Merketeksten sier «formel» også for figurer — teksten og regelen er ordrett fra akseptkriteriet (UX-DR37, FR-41).
  - `[low]` `[patch]` (blind) Manglende testtilfeller — lagt til: `(True, True)`, tegnefeil, emnenivå-endepunktene og at `output_wrapper` har `formula_missing`. `owner_id is None` avvist: skjer bare når forelesningen er slettet midt i jobben, og da lagres ingenting uansett.
  - `[low]` `[patch]` (blind) Fargesjekken i `formula-flag.test.tsx` treffer «centered» — regex matcher nå hele klasser. Testen av konstantene beholdes som dokumentasjon.
  - `[false]` `[reject]` (blind) KI-sporet mangler i diffen — skrives etter byggeløpet i samme økt.
  - `[low]` `[reject]` (blind) Merket står igjen etter at studenten redigerer kortet — kildesiden har fortsatt formelen; ført som kanttilfelle-issue.
  - `[medium]` `[patch]` (edge) `page_needs_image` kunne gjøre en lesbar PDF til PDF_UNREADABLE — regelen har nå egen try, og en feil gir `needs_image = true`.
  - `[low]` `[reject]` (edge) Avrundede rammer og kulepunkter — samme som blind-funnet om lysbilder.
  - `[low]` `[reject]` (edge) Bakgrunnsbilde på hver side — samme som blind-funnet.
  - `[medium]` `[patch]` (edge) Svær sideflate gir et enormt bilde i minnet — lengste side er nå høyst 2000 piksler.
  - `[medium]` `[patch]` (edge) Ingen grense for samlet bildestørrelse — `MAX_PAGE_IMAGE_BYTES` (15 MB); sider etter grensen sendes uten bilde, men merkes.
  - `[low]` `[reject]` (edge) Bildetegningen ligger utenfor tidsgrensen — samme som blind-funnet.
  - `[low]` `[reject]` (edge) Bilder lages for sider tegngrensen kutter — samme som blind-funnet.
  - `[low]` `[reject]` (edge) Gamle opplastinger får ikke regelen — samme som blind-funnet.
  - `[low]` `[reject]` (edge, påstand) «Enkle streker og rammer teller ikke», men avrundede rammer teller — en avrundet ramme har kurver og er ikke «enkel» i regelens forstand; samme kanttilfelle-issue.
  - `[low]` `[patch]` (edge, påstand) 100–400 kB gjelder bare tekstsider — dekket av byte-taket over; kommentaren nevner nå bildesider.
  - `[low]` `[defer]` (intent) Ekte Gemini med bilder er ikke prøvd — ingen test kaller modellen; måles i story 6.6 (SK-16).
  - `[low]` `[defer]` (intent) OpenStax-sjekken er gjort med PyMuPDF, ikke ved Siljes opplasting — ført som utsatt og åpent punkt.
  - `[false]` `[reject]` (intent) Merket vises ikke på forsiden av kortet — akseptkriteriet plasserer det rett over kildelenken, som bare vises når kortet er snudd og etter bekreftet svar.
  - `[low]` `[reject]` (intent) Ingen registertest for at alle typer arver `FormulaReport` — epic 7–9 legger til typene; `needs_image`-delen gjelder uansett.
  - `[low]` `[reject]` (intent) Tastatur og skjermleser bare delvis testet — merket er ren tekst uten interaksjon; eksisterende tastaturtester dekker øktene, og axe kjører på sidene med merket.
  - `[low]` `[patch]` (intent) Emnenivå-øving er ikke testet med merket — samme som verifiseringsfunnet; test lagt til.
  - `[false]` `[reject]` (intent) Bilder kan havne andre steder på disk — `page_images` skriver ingenting; bare `storage.read_pdf` brukes.
  - `[low]` `[reject]` (intent) Tak og reservevalg går utover storien — begrunnet med «heller en side for mye», testet og ført i `beslutninger.md`.
  - `[low]` `[patch]` (verification) Emnenivå-endepunktene har ingen test av verdien til `formula_flag` — test lagt til for flashcards og quiz.
  - `[low]` `[patch]` (verification) Grenen der tegningen av en side feiler, er ikke testet — test lagt til.

## Design Notes

**Tersklene (målt 2026-11-23 på *Principles of Economics 3e*, 995 sider, utenfor repoet):** Hver side har fem enkle rammer i layouten, og tabeller har mange enkle linjer, så «antall tegninger» alene skiller dårlig. Formelsidene 127 og 128 har 263 og 155 sammensatte tegninger (glyfer tegnet som kurver), mens vanlige tekstsider (121, 124, 126) har 0. Terskelen 3 fanger også en liten formel med noen få tegn. Bilder: 0,5 % av en A4-side er omtrent 70 × 35 pt, så en liten logo slipper unna, men et lite formelbilde i linja kan bli tatt med. Heller en side for mye.

**Taket på 20 bilder:** En PNG i 150 dpi av en tekstside er om lag 100–400 kB. 20 bilder holder forespørselen godt under grensene for innebygd data, og en vanlig forelesning merker ingenting.

```python
flag = page.needs_image or getattr(item, "formula_missing", None) is True
```

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: alle grønne, ingen nettverkskall.
- `cd frontend && npm run test` -- expected: alle grønne.
- `cd frontend && npx playwright test` mot `docker compose up --build -d` -- expected: alle grønne.

## Auto Run Result

Status: done

**Hva som ble bygd:** `files` setter `file_pages.needs_image` ved opplasting etter regelen i `files/pdf.py` (minst 3 sammensatte vektortegninger, eller et bilde over 0,5 % av siden; kan ikke regelen lese siden, blir den `true`). Genereringsløpet lager PNG-bilder av slike sider fra den lagrede PDF-en (høyst 20 bilder, høyst 15 MB, lengste side høyst 2000 piksler), bare i minnet, og sender dem med teksten til porten. `VertexGenerator` legger bildet rett etter sidens tekst. Skjemaene har `formula_missing` (felles `FormulaReport`), instruksene forklarer det, og `formula_flag` regnes ut ett sted i løpet for alle innholdstyper. Frontenden viser `formula-flag` («Inneholder formel – sjekk mot kilden») rett over kilden i kortet, i forklaringen og i begge feillistene.

**Filer:**
- `backend/app/modules/files/pdf.py`, `service.py`, `models.py` -- regelen, `PdfPage`, `render_pages_png`, `page_images`.
- `backend/app/modules/generation/port.py`, `registry.py`, `service.py` -- `Page.needs_image`/`image`, `FormulaReport`, `ValidItem`, bilder og flagget.
- `backend/app/modules/generation/flashcards.py`, `quiz.py`, `vertex.py`, `instructions/*.md` -- skjema, lagring, bilder i forespørselen, instruks.
- `backend/app/modules/content/service.py`, `schemas.py`, `models.py` -- lagre og vise `formula_flag`.
- `backend/tests/test_formula.py`, `fixtures/formula_pdf.py` (nye) og tilpassede tester.
- `frontend/components/formula-flag.tsx` (ny), `modules/practice/*` -- merket og flagget i typene.
- `frontend/e2e/formelmerke.spec.ts` (ny), `e2e/pdf.ts` -- ende-til-ende med axe.

**Gjennomgang:** 32 funn. 11 rader rettet (3 middels, 8 lave), 2 utsatt, 19 avvist (4 som feil). Rettingene ble gjort av implementasjonsagenten.

**Oppfølgingsgjennomgang:** `false`. Rettet: høy 0, middels 3, lav 8. Ingen høye; de tre middels rettingene er små, avgrensede og testet.

**Verifisering:** `uv run pytest` 678 grønne, `ruff check` rent. `npm run test` 918 grønne, `tsc --noEmit` rent. `npx playwright test` mot `docker compose up --build -d`: 178 grønne.

**Gjenværende risiko:** Regelen er målt på én lærebok, ikke på lysbilder; avrundede rammer og bakgrunnsbilder kan merke for mange sider (kanttilfelle-issue). Ingenting er prøvd mot ekte Gemini med bilder (SK-16, story 6.6), og Siljes egen opplasting av side 127–128 gjenstår.
