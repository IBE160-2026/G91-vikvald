---
title: 'Teknisk research: valg av språkmodell og demomodus'
type: 'technical'
topic: 'Valg av språkmodell (EU/EØS) og demomodus for Studiekamerat'
decision: 'Hvilken språkmodell Studiekamerat skal bruke, og hvordan sensor kan kjøre appen lokalt uten studentens API-nøkkel'
source: 'native run'
status: complete
preset: 'standard'
validation: 'normal'
created: '2026-10-28'
updated: '2026-10-28'
---

# Teknisk research: valg av språkmodell og demomodus

**Beslutningen researchen skal støtte:** Hvilken språkmodell Studiekamerat skal bruke, og hvordan sensor kan kjøre appen lokalt uten studentens API-nøkkel.

## Sammendrag

**Anbefaling:** Bruk **Azure OpenAI** gjennom **Azure for Students**, med en mini-modell (GPT-5-mini eller GPT-5.4-mini) i en **EU-region eller «Data Zone EU»**. Velg **Gemini Flash på Vertex AI i en EU-region** som alternativ. Sensor kjører appen i **demomodus**: ferdiglaget eksempelinnhold og en falsk («mock») modell, uten nøkkel og uten internett.

Tre funn bærer anbefalingen:

1. **Pris avgjør ikke.** Alle billige modeller koster fra noen øre til noen få kroner per semester (12 forelesninger) [25][26][27][4]. Det som skiller, er datavilkår, kvalitet på norsk og om du kan bruke tjenesten gratis.
2. **Bare fire alternativer består alle de fire kravene:** Azure OpenAI i EU [1], Gemini på Vertex AI i EU [5][6][7], Claude via AWS Bedrock i EU [12][13][14][15] og en lokal modell med Ollama [29]. Anthropics eget API [11], Gemini via AI Studio [9] og Sikt KI [22] faller bort. Mistral er usikker [17][18][20].
3. **Azure for Students er det eneste gratisalternativet uten kredittkort** ($100 i 12 måneder). Når kreditten er brukt opp, blir abonnementet stengt i stedet for at du får en regning [3].

**Største forbehold:** Det er ikke bekreftet at et studentabonnement i Azure får kvote til å kjøre modeller i «Data Zone EU» uten å søke om det [2]. Sjekk dette i Azure-portalen før du bestemmer deg. Får du ikke kvote, bytter du til alternativet (Vertex AI). Det krever kredittkort, men gir $300 i 90 dager [8].

Tabellen i seksjon 2 er nesten uavgjort mellom Azure og Vertex: Gemini er litt bedre på norsk, mens Azure er enklere å få gratis. Lag derfor appen slik at det er lett å bytte leverandør (seksjon 4).

## 1. Vilkår: hvem oppfyller kravene?

| Leverandør | Data i EU/EØS | Ingen trening på data | Databehandleravtale | JSON-output | Resultat |
|---|---|---|---|---|---|
| **Azure OpenAI**, EU-region eller Data Zone EU | Ja. Data Zone EU behandler bare i EU-land. Unngå «Global» og «Batch» [1] | Ja: «NOT used to train … without your permission» [1] | Ja, Microsofts DPA [1]. *Ikke bekreftet* at den gjelder Azure for Students | Ja, `json_schema` med `strict` [1] | **Består** |
| **Gemini på Vertex AI**, europe-west3/4/9 | Ja, på regionale endepunkter. Det globale endepunktet gir ingen garanti [5] | Ja: «won't use your data to train …» [6] | Trolig. Google Clouds DPA inngår i avtalen med «entity or person» [10] | Ja, `responseSchema` [7] | **Består** (bruk regionalt endepunkt) |
| **Claude via AWS Bedrock**, EU-profil (`eu.*`) | Ja, men AWS ber deg sjekke målregionene selv. Unngå London og Zürich som utgangsregion [12] | Ja: inndata «not shared with any model providers» [13] | Ja, «applies automatically to all customers» [14] | Ja [15] | **Består** (mest oppsett) |
| **Lokal modell med Ollama** | Ja, data forlater ikke maskinen | Ja | Ikke relevant | Ja, JSON-schema i `format` [29] | **Består** |
| **Mistral** | Ja, som standard [36] | Gratisnivået trener som standard [18]. For betalt bruk er standarden uklar, så slå av treningen selv under Admin > Privacy [17][19] | Gjelder «commercial customers»; privatpersoner henvises til forbrukervilkår [17][20] | Ja | **Usikker** |
| **Anthropics eget API** | Nei: bare «us» eller «global» [11] | – | – | – | **Faller bort** |
| **Gemini via AI Studio** | Nei, ingen styring av hvor data lagres [9] | Gratisnivået kan ikke brukes til apper for brukere i EØS [9] | – | – | **Faller bort** |
| **Sikt KI** | Ja | Ja | Via institusjonen | Ikke noe API for studenter funnet [22] | **Faller bort** |

To ting å være obs på:
- Vertex AI mellomlagrer inndata i opptil 24 timer som standard. Det kan slås av med `disableCache` [6].
- På Bedrock er det strengere krav til JSON-skjemaet: maks 12 valgfrie felt, og `additionalProperties: false` må være satt [15].

## 2. Kvalitet på norsk, pris og vektet sammenligning

### Kvalitet på norsk (EuroEval, lavere er bedre)

Tallene er fra EuroEvals norske rangering, øyeblikksbilde fra 2026-04-17 [23]. Det er omtrent seks måneder gammelt, så de nyeste modellene mangler.

| Modell | Score | Kommentar |
|---|---|---|
| Gemini 3 Pro | 1,19 | Best |
| Gemini 3 Flash | 1,33 | Billig og svært god |
| GPT-5.4-mini | 1,38 | Billig og svært god |
| Claude Sonnet 4.5 / 4.6 | 1,39 / 1,49 | Dyrere, men fortsatt under $1,50 per semester |
| Gemini 3.1 Flash-Lite | 1,45 | |
| GPT-5-mini | 1,60 | |
| Gemma-3-12B (lokal) | 1,83 | Beste modell som passer på en vanlig laptop |
| NB AI-lab Borealis-12B (lokal) | 1,95 | Norsk modell fra Nasjonalbiblioteket |
| Claude Haiku 4.5 | 1,98 | Tydelig svakere på norsk |

- Billige skymodeller ligger nær toppen [23].
- Lokale modeller på 7–14B ligger 0,5–0,7 poeng bak, omtrent på nivå med de aller minste skymodellene [23].
- Norske spesialmodeller som NorMistral og NorwAI har ingen fullstendig rangering ennå [23].
- Norsk tekst bruker omtrent 1,3–1,5 ganger så mange tokens som engelsk [24]. En forelesning på 3 000–10 000 ord blir da 5 000–18 000 tokens inn.

### Pris

Anslaget bygger på 15 000 tokens inn og 5 000 tokens ut per forelesning, og 12 forelesninger per semester.

| Modell | Inn / ut per 1M tokens | Per semester |
|---|---|---|
| Gemini 2.5 Flash-Lite | $0,10 / $0,40 [25] | $0,04 |
| GPT-5-mini (OpenAI-pris) | $0,25 / $2,00 [26] | $0,17 |
| GPT-4.1-mini, Azure Data Zone | $0,44 / $1,76 [4] | ca. $0,19 |
| Gemini 3.8 Flash (introduksjonspris til 31.12.2026) | $0,75 / $3,75 [25] | $0,36 |
| GPT-5.4-mini | $0,75 / $4,50 [26] | $0,41 |
| Claude Sonnet 5.5 | $2 / $10 [27] | $0,96 |
| Mistral Small 4 | $0,15 / $0,60 [21] | $0,06 |
| Ollama (lokalt) | 0 | 0 |

- Data Zone og regionale endepunkter koster omtrent 10 % mer enn global bruk, både hos Azure [4] og Anthropic/Bedrock [27].
- Modeller som «tenker» før de svarer, kan bruke flere output-tokens. Selv med det er alt under $2 per semester (anslag, ikke verifisert).

### Gratis bruk

| Tilbud | Kreditt | Kredittkort? | Merknad |
|---|---|---|---|
| Azure for Students | $100 i 12 mnd | Nei | Stenges når kreditten er brukt opp [3]. Kvote for Data Zone EU må sjekkes [2] |
| Google Cloud, prøveperiode | $300 i 90 dager | Ja | Dekker ikke AI Studio. Det er ikke sagt eksplisitt at den dekker Gemini på Vertex [8] |
| AWS, nye kontoer | Opptil $200 i 6 mnd | Ikke sjekket | Ikke bekreftet at kreditten dekker Claude-modeller [16] |
| Mistral, gratisnivå | – | – | Trener på data som standard [18] |

### Vektet sammenligning

Skala 1–5 per kriterium. Vektene er standardforslaget fra planen. Endre dem gjerne og regn ut på nytt: poeng = sum av (score / 5 × vekt).

| Kriterium (vekt) | Azure GPT-5.4-mini | Vertex Gemini Flash | Bedrock Claude Sonnet | Mistral Small | Ollama lokalt |
|---|---|---|---|---|---|
| Norsk (30) | 4,5 | 5 | 4,5 | 3 (ikke målt) | 2,5 |
| Kostnad (25) | 5 | 5 | 5 | 5 | 5 |
| Enkelt å komme i gang (20) | 3 | 3 | 2,5 | 4,5 | 3 |
| Gratis bruk (15) | 5 | 3,5 | 3 | 1 | 5 |
| Lange tekster (10) | 5 | 5 | 5 | 5 | 2 |
| **Sum (av 100)** | **89** | **87,5** | **81** | **74** (usikre vilkår) | **71** |

Poengene er mine vurderinger basert på kildene over. Forskjellen mellom de to øverste er liten.

## 3. Demomodus for sensor

| Tilnærming | Oppsett for sensor | Hva det viser | Pålitelighet | Nytte i tester |
|---|---|---|---|---|
| **Ferdiglaget innhold** i databasen | Lavest: klon, installer, kjør seed-skript | Hele grensesnittet med ekte innhold, men ikke ny generering | Svært høy | Høy |
| **Mock-modell** bak samme grensesnitt | Lav: `LLM_PROVIDER=mock` | Hele flyten: last opp → «generer» → valider → lagre → vis | Svært høy, gir samme svar hver gang | Høyest. Vanlig mønster for enhetstester [33][35] |
| **Lokal modell med Ollama** | Middels til høy: installer Ollama, last ned 1,3–5,2 GB, minst 8 GB RAM [31][32] | Ekte generering fra sensors egen PDF | Middels. Små modeller er svakere på norsk [23], og standard kontekst på 4 000 tokens kan kutte lange PDF-er [30] | Middels |
| **Egen nøkkel i `.env`** | Krever konto, så det bryter kravet | Full kvalitet | Høy | Lav |

**Anbefaling:** Bruk ferdiglaget innhold og en mock-modell som standard. Samme eksempeldata kan brukes både i demoen, i testene og i README. Ollama kan være et valgfritt tillegg for sensor som vil se ekte generering. Ollama har et OpenAI-kompatibelt endepunkt på `localhost:11434/v1` [28] og støtter JSON-schema [29].

## 4. Det kombinasjonen viser

- **Byttbar leverandør gjør valget billig å angre.** Azure og Vertex er nesten likt plassert. Både mock-modellen og Ollama krever uansett et felles grensesnitt for modellkall. Bygg derfor én modul som leser `LLM_PROVIDER` (`mock` | `ollama` | `azure` | `vertex`), og valider alle svar mot samme skjema. Med Vercel AI SDK finnes dette ferdig som `customProvider` og `createOpenAICompatible` [34]. Dette blir en arkitekturbeslutning.
- **Lokal modell løser personvernet, men ikke kvaliteten.** Ollama består alle kravene, men er klart svakere på norsk [23]. Da blir kvalitetskriteriet i briefen (under 5 % feil i flashcards) vanskeligere å nå. Ollama passer derfor som demoalternativ, ikke som hovedmodell.
- **Gratisnivåene er fellen.** Gratisnivåene hos Mistral og Gemini (AI Studio) bryter kravene [9][18]. Den betalte varianten av samme modell gjør det ikke. «Gratis» og «oppfyller kravene» går bare sammen hos Azure for Students og Ollama.

## 5. Anbefalinger

1. **Hovedvalg: Azure OpenAI (GPT-5.4-mini eller GPT-5-mini) via Azure for Students, i Data Zone EU eller en EU-region som Sweden Central.** Grunnlag: vilkår med høy sikkerhet [1], gratis uten kort [3] og god norsk [23]. *Blir input til arkitekturen.*
   - Første steg er å opprette Azure for Students og sjekke kvoten for Data Zone EU i portalen [2]. Konfidens: middels, fordi kvoten for studenter ikke er bekreftet.
2. **Alternativ: Gemini Flash på Vertex AI, europe-west4 (Nederland) eller europe-west3 (Tyskland).** Velg det hvis Azure-studentabonnementet ikke får kvote i EU, eller hvis Gemini gir merkbart bedre norsk når du tester. Krever kredittkort [8]. Slå av mellomlagring med `disableCache` [6].
3. **Ikke velg:** Anthropics eget API, Gemini via AI Studio, Sikt KI eller Mistrals gratisnivå (se seksjon 1).
4. **Demomodus:** ferdiglaget innhold og en mock-modell som standard, med Ollama som valgfritt tillegg. *Blir input til PRD-en (krav om kjørbarhet) og arkitekturen.*
5. **Byttbar leverandør** via `LLM_PROVIDER`, med samme valideringsskjema for alle. *Blir input til arkitekturen.*
6. **Før PRD-en:** Lag 2–3 prøvesett med flashcards og quiz fra åpent materiale med både Azure og Gemini, og sammenlign kvaliteten på norsk selv. Benchmarken er seks måneder gammel og måler ikke akkurat denne oppgaven.

## 6. Åpne spørsmål

- **Kvote for studenter:** Får Azure for Students kvote for Data Zone EU uten søknad? Svar: sjekk i portalen under Quotas, eller søk via aka.ms/oai/stuquotarequest [2].
- **Microsofts DPA:** Gjelder den uttrykkelig Azure for Students? Svar: spør Microsoft Support, eller godta at DPA-en gjelder alle Azure-kunder [1].
- **Google Cloud for privatpersoner:** Kan en privatperson i Norge få prøveperioden, og dekker kreditten Gemini på Vertex? Svar: prøv å registrere deg, og se faktureringssiden [8].
- **Hvor godt små lokale modeller lager gyldig quiz-JSON:** Ingen benchmark ble funnet. Svar: en rask egen test med Ollama.
- **Nyere norsk benchmark:** Gemini 3.8, Claude 5.5 og Mistral Small 4 er ikke målt [23]. Svar: sjekk euroeval.com senere, eller test selv.
- **Mistral:** Er betalt API-bruk unntatt fra trening som standard, og kan en privatperson få databehandleravtalen [17][20]? Svar: spør Mistral Support. Lav prioritet, siden Mistral ikke er anbefalt.

## Kilder

| # | Støtter | Utgiver | Publisert | Lest | Konfidens |
|---|---|---|---|---|---|
| 1 | Azure: ingen trening, Data Zone EU, DPA, JSON | [Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-foundry/responsible-ai/openai/data-privacy) | 2026-06-05 | 2026-10-28 | høy |
| 2 | Azure-kvoter, egen kolonne for studentabonnement | [Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/quotas-limits) | 2026-08-20 | 2026-10-28 | høy |
| 3 | Azure for Students: $100, uten kort, stenges når kreditten er brukt | [Microsoft](https://azure.microsoft.com/en-us/pricing/offers/ms-azr-0170p) | ukjent | 2026-10-28 | høy |
| 4 | Azure-priser, gpt-4.1-mini Global og Data Zone | [Microsoft Retail Prices API](https://prices.azure.com/api/retail/prices) | 2025-11 | 2026-10-28 | høy |
| 5 | Vertex AI: regional behandling, EU-regioner | [Google Cloud](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency) | 2026-10-28 | 2026-10-28 | høy |
| 6 | Vertex AI: ingen trening, mellomlagring | [Google Cloud](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/data-governance) | 2026-10-28 | 2026-10-28 | høy |
| 7 | Vertex AI: responseSchema | [Google Cloud](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output) | 2026-10-28 | 2026-10-28 | høy |
| 8 | Google Cloud-prøveperiode: $300, 90 dager, kort | [Google Cloud](https://docs.cloud.google.com/free/docs/free-cloud-features) | 2026-10-27 | 2026-10-28 | høy |
| 9 | Gemini API-vilkår: EØS, gratisnivå | [Google](https://ai.google.dev/gemini-api/terms) | 2026-04-28 | 2026-10-28 | middels (eldre enn 3 mnd) |
| 10 | Google Cloud DPA og «entity or person» | [Google Cloud](https://cloud.google.com/terms/data-processing-addendum) | ukjent | 2026-10-28 | middels |
| 11 | Anthropic: bare «us» og «global» | [Anthropic](https://platform.claude.com/docs/en/manage-claude/data-residency) | ukjent | 2026-10-28 | høy (to uavhengige uthentinger) |
| 12 | Bedrock: EU-profiler holder seg i EU | [AWS](https://docs.aws.eu/bedrock/latest/userguide/geographic-cross-region-inference.html) | ukjent | 2026-10-28 | høy |
| 13 | Bedrock: ingen trening, deles ikke | [AWS](https://aws.amazon.com/bedrock/faqs/) | ukjent | 2026-10-28 | høy |
| 14 | AWS DPA gjelder alle kunder | [AWS](https://docs.aws.amazon.com/whitepapers/latest/navigating-gdpr-compliance/aws-data-processing-addendum-dpa.html) | ukjent | 2026-10-28 | høy |
| 15 | Bedrock: structured output for Claude | [AWS](https://docs.aws.amazon.com/bedrock/latest/userguide/structured-output.html) | ukjent | 2026-10-28 | høy |
| 16 | AWS-kreditt for nye kontoer | [AWS](https://aws.amazon.com/free/) | 2026 | 2026-10-28 | middels |
| 17 | Mistral Commercial ToS §4.2 og §12.3 | [Mistral AI](https://legal.mistral.ai/terms/commercial-terms-of-service) | 2026-09-25 | 2026-10-28 | høy |
| 18 | Mistral gratisnivå trener som standard | [Mistral AI](https://help.mistral.ai/en/articles/347617-do-you-use-my-user-data-to-train-your-artificial-intelligence-models) | ca. 2026-10 | 2026-10-28 | høy |
| 19 | Mistral: reservasjon mot trening | [Mistral AI](https://help.mistral.ai/en/articles/455207-can-i-opt-out-of-my-input-or-output-data-being-used-for-training) | 2026-09-03 | 2026-10-28 | høy |
| 20 | Mistral DPA | [Mistral AI](https://legal.mistral.ai/terms/data-processing-addendum) | 2026-07-27 | 2026-10-28 | middels |
| 21 | Mistral-priser | [Mistral AI](https://docs.mistral.ai/inference/pricing) | ukjent | 2026-10-28 | middels |
| 22 | Sikt KI: ingen API for studenter | [Sikt](https://ki.sikt.no/en) | ukjent | 2026-10-28 | middels (ikke funnet) |
| 23 | EuroEval, norsk rangering | [EuroEval](https://github.com/EuroEval/leaderboards/blob/main/leaderboards/norwegian_all.csv) | 2026-04-17 | 2026-10-28 | høy (for øyeblikksbildet) |
| 24 | Tokens per ord på norsk | [NB AI-lab](https://github.com/NbAiLab/tokenizer-benchmark) | ca. 2024 | 2026-10-28 | middels |
| 25 | Gemini-priser | [Google](https://ai.google.dev/gemini-api/docs/pricing) | 2026-10-27 | 2026-10-28 | høy |
| 26 | OpenAI-priser | [OpenAI](https://developers.openai.com/api/docs/pricing) | ukjent | 2026-10-28 | høy |
| 27 | Anthropic-priser og regionpåslag | [Anthropic](https://platform.claude.com/docs/en/about-claude/pricing) | ukjent | 2026-10-28 | høy |
| 28 | Ollama: OpenAI-kompatibelt API | [Ollama](https://docs.ollama.com/api/openai-compatibility) | ukjent | 2026-10-28 | høy |
| 29 | Ollama: structured outputs | [Ollama](https://docs.ollama.com/capabilities/structured-outputs) | ukjent | 2026-10-28 | høy |
| 30 | Ollama: standard kontekstlengde | [Ollama](https://docs.ollama.com/context-length) | ukjent | 2026-10-28 | høy |
| 31 | Ollama-versjon og installasjon | [GitHub](https://github.com/ollama/ollama/releases) | 2026-10-27 | 2026-10-28 | høy |
| 32 | Størrelse på modellnedlasting | [Ollama](https://ollama.com/library/qwen3) | ukjent | 2026-10-28 | høy |
| 33 | Vercel AI SDK: mock-modell | [Vercel](https://ai-sdk.dev/docs/ai-sdk-core/testing) | ukjent | 2026-10-28 | høy |
| 34 | Vercel AI SDK: byttbar leverandør | [Vercel](https://ai-sdk.dev/docs/ai-sdk-core/provider-management) | ukjent | 2026-10-28 | høy |
| 35 | LangChain: falsk modell for tester | [LangChain](https://docs.langchain.com/oss/javascript/langchain/test/unit-testing) | ukjent | 2026-10-28 | høy |
| 36 | Mistral lagrer i EU som standard | [Mistral AI](https://help.mistral.ai/en/articles/347629-where-do-you-store-my-data-or-my-organization-s-data) | ukjent | 2026-10-28 | middels |

## Når bør dette sjekkes på nytt?

En sammenligning av leverandører bør sjekkes på nytt før den er to kvartaler gammel. Det som foreldes først:

| Hva | Sjekk innen |
|---|---|
| Gemini 3.8 Flash-pris (dobles 2027-01-01) [25] | 2026-12-31 |
| Priser generelt [4][21][25][26][27] | 2027-01-28 |
| Vilkår og datalagring [1][5][6][9][11][17] | 2027-01-28 |
| Norsk benchmark [23] | allerede eldre enn 3 måneder; sjekk ved neste korsvei |

Tidligste dato: **2026-12-31**.
