# Digest: norsk språkkvalitet + pris for LLM-kandidater (r1-1)

Accessed: 2026-10-28. Researcher: subagent (web only, no project files read).

## 1. Price table (standard/global list prices, USD)

**Baseline assumption:** 15k input tokens + 5k output tokens per lecture (one lecture = 20 flashcards + 10 MC questions + summary). Semester = 12 lectures = 180k in + 60k out.
Cost per lecture = 0.015 x input price + 0.005 x output price.

| Model | Input $/1M | Output $/1M | Est. per lecture | Per semester (12) | Source |
|---|---|---|---|---|---|
| Gemini 2.5 Flash-Lite | 0.10 | 0.40 | $0.0035 | $0.04 | Google, official |
| Gemini 2.5 Flash | 0.30 | 2.50 | $0.017 | $0.20 | Google, official |
| Gemini 3.5 Flash-Lite | 0.30 | 2.50 | $0.017 | $0.20 | Google, official |
| Gemini 3.8 Flash (intro price until 2026-12-31) | 0.75 | 3.75 | $0.030 | $0.36 | Google, official |
| Gemini 3.8 Flash (from 2027-01-01) | 1.50 | 7.50 | $0.060 | $0.72 | Google, official |
| Gemini 2.5 Pro (<=200k) | 1.25 | 10.00 | $0.069 | $0.83 | Google, official |
| Gemini 3.1 Pro Preview (<=200k) | 2.00 | 12.00 | $0.090 | $1.08 | Google, official |
| GPT-5-nano | 0.05 | 0.40 | $0.0028 | $0.03 | OpenAI, official |
| GPT-5.4-nano | 0.20 | 1.25 | $0.009 | $0.11 | OpenAI, official |
| GPT-5-mini | 0.25 | 2.00 | $0.014 | $0.17 | OpenAI, official |
| GPT-4.1-mini | 0.40 | 1.60 | $0.014 | $0.17 | OpenAI, official |
| GPT-5.4-mini | 0.75 | 4.50 | $0.034 | $0.41 | OpenAI, official |
| Claude Haiku 5.5 (prompts <=100k) | 0.10 | 0.50 | $0.004 | $0.05 | Anthropic, official |
| Claude Haiku 4.5 | 1.00 | 5.00 | $0.040 | $0.48 | Anthropic, official |
| Claude Sonnet 5.5 | 2.00 | 10.00 | $0.080 | $0.96 | Anthropic, official |
| Claude Sonnet 4.6 | 3.00 | 15.00 | $0.120 | $1.44 | Anthropic, official |
| Mistral Small 4 | 0.15 | 0.60 | $0.005 | $0.06 | third-party aggregator (NOT official) |
| Mistral Large (as quoted in example text on mistral.ai/pricing) | 0.50 | 1.50 | $0.015 | $0.18 | Mistral, official page (example sentence only) |
| Local Ollama (Gemma / Qwen / Ministral / Borealis) | 0 | 0 | $0 (electricity/hardware) | $0 | n/a |

Notes on the table:
- OpenAI prices are from OpenAI's own API page. **Azure OpenAI list prices could not be read**: the Azure pricing page renders "$-" placeholders without JS. Global Azure deployment is usually priced the same as OpenAI direct, with Data Zone (EU) at roughly +10%. That is **unverified this run** (training-data belief).
- Reasoning/"thinking" models (GPT-5-mini/nano, Gemini 2.5/3.x with thinking, Claude with extended thinking) bill hidden reasoning tokens as output. Real output can be 2-4x the 5k baseline. That is **unverified this run** (training-data belief). Even at 4x output, every cheap-tier model stays under ~$1 per semester.
- Sensitivity check: the worst case is 10,000 words x ~1.8 tok/word ≈ 18k tokens of lecture text, plus a prompt of about 1-2k tokens, so ≈ 20k input. Costs then rise about 1.3x on the input side. That is negligible at these prices.
- Bottom line: for one student, API cost is **cents per semester** on every cheap-tier model and under $1.50 even on Sonnet/Pro-class. Cost is not a discriminator. Quality, data location and the free-tier terms are.

### Regional / data-residency surcharges
- **Anthropic:** for Claude 4.6+, `inference_geo: "us"` costs 1.1x. Global (the default) is standard price. Bedrock regional endpoints and Google Cloud multi-region/regional endpoints carry a +10% premium over global. Foundry "US Data Zone Standard" is also 1.1x. No EU first-party residency option was mentioned on the page.
- **Azure OpenAI:** offers Global, Data Zone (EU or US) and Regional (up to 27 regions) deployment types. Prices were not readable (see above).
- **Vertex AI regional pricing for Gemini:** not checked (no budget left).

## 2. Norwegian language quality: EuroEval

**Source:** EuroEval leaderboards repository, `leaderboards/norwegian_all.csv` and `norwegian_all_simplified.csv`. The euroeval.com page is JS-rendered, so the raw CSV was read directly from GitHub.
**Snapshot:** the last commit to the Norwegian CSV is dated 2026-04-17, and the last commit to the repo is 2026-04-20. **The snapshot is about 6 months old.** Newer models (Claude Haiku 5.5 / Sonnet 5.5, Gemini 3.5/3.8, Mistral Small 4 / Medium 3.5 / Large 4) are **not on it**.
**Metric:** "Rank" is a mean rank score across Norwegian NLU and NLG tasks (NoReC sentiment, NER, linguistic acceptability, reading comprehension, summarisation, knowledge, reasoning and so on). Lower is better. The best score is 1.19.
The 145 models with a complete current-version result are ranked. Older or incomplete entries show "-".

### Frontier / API models (ranked, Norwegian overall)

| Pos | Model | Rank score |
|---|---|---|
| 1 | gemini-3-pro-preview | 1.19 |
| 2 | gemini-3-flash-preview (no-thinking) | 1.33 |
| 4 | gemini-3-flash-preview (thinking) | 1.37 |
| 5 | gpt-5.4-mini (high) | 1.38 |
| 6 | claude-sonnet-4-5 (thinking) | 1.39 |
| 8 | gemini-3.1-flash-lite-preview | 1.45 |
| 10 | claude-sonnet-4-6 | 1.49 |
| 13 | gpt-4.1 | 1.56 |
| 14 | gpt-5-mini | 1.60 |
| 19 | gemini-2.5-flash-lite (thinking) | 1.67 |
| 29 | gpt-5-nano | 1.80 |
| 37 | gemini-2.5-flash-lite (no-thinking) | 1.92 |
| 43 | claude-haiku-4-5 | 1.98 |

Unranked (incomplete on the current benchmark version) are gpt-4.1-mini, gpt-4o-mini, gemini-2.5-flash, gemini-2.5-pro and the Claude 3.x models.

### Open-weight models (laptop-relevant sizes in bold)

| Pos | Model | Params | Rank score |
|---|---|---|---|
| 3 | google/gemma-4-31B-it | 31B | 1.33 |
| 11 | google/gemma-4-26B-A4B-it (MoE, 4B active) | 26B | 1.52 |
| 17 | google/gemma-3-27b-it | 27B | 1.66 |
| 23 | mistralai/Mistral-Small-3.2-24B-Instruct | 24B | 1.72 |
| 30 | NbAiLab/borealis-27b-instruct-preview (NB AI-lab) | 29B | 1.81 |
| **32** | **google/gemma-3-12b-it** | **12B** | **1.83** |
| **40** | **NbAiLab/borealis-12b-instruct-preview (NB AI-lab)** | **13B** | **1.95** |
| **41** | **Qwen/Qwen3-14B (no-thinking)** | **15B** | **1.96** |
| **47** | **mistralai/Ministral-3-14B-Instruct-2512** | **12B** | **2.01** |
| **48** | **Qwen/Qwen3.5-9B** | **10B** | **2.01** |
| **49** | **google/gemma-4-E4B-it** | **8B** | **2.06** |
| **51** | **mistralai/Ministral-3-8B-Instruct-2512** | **7B** | **2.07** |
| 55 | openai/gpt-oss-20b (medium) | 21B | 2.11 |
| 58 | Qwen/Qwen3-8B (no-thinking) | 8B | 2.16 |

Unranked or incomplete are meta-llama/Llama-3.1-8B-Instruct, gemma-2-9b-it, norallm/normistral-11b-(long/warm/thinking), NorwAI/NorwAI-Mistral-7B and NorwAI-Mixtral-8x7B(-instruct). The NorMistral and NorwAI entries are mostly base models (🧠 pretrained type).

### Interpretation
- Cheap API models score close to frontier in Norwegian. Gemini 3 Flash (1.33), GPT-5.4-mini (1.38) and Gemini 3.1 Flash-Lite (1.45) all sit in the top 10, alongside Sonnet 4.5/4.6.
- Claude Haiku 4.5 (1.98) is notably weaker in Norwegian than Sonnet and than the Gemini/GPT small models. Haiku 5.5 is not yet measured.
- Laptop-class open-weight models (7-14B) score about 1.83-2.07, roughly the level of gpt-5-nano or gemini-2.5-flash-lite without thinking. The gap to the top is about 0.5-0.7 rank points. The best 7-14B option is gemma-3-12b-it, then NB AI-lab's borealis-12b and Qwen3-14B.
- Gemma-4-26B-A4B (1.52, MoE) is near frontier, but is likely only feasible on a machine with about 32GB RAM when quantized (**unverified**).
- The dedicated Norwegian models (NorMistral-11B, NorwAI) have **no current complete EuroEval ranking**. NB AI-lab's newer Borealis line is ranked and is competitive but not top.

## 3. Norwegian token overhead

From the NbAiLab tokenizer-benchmark (efficiency = words/tokens, measured on 100k Wikipedia words; README undated, approx. 2024):

| Tokenizer | English | Bokmål | Nynorsk |
|---|---|---|---|
| Llama 3 (128k vocab) | 84% (~1.19 tok/word) | 55% (~1.82 tok/word) | 54% |
| Gemma (256k vocab) | 81% (~1.23 tok/word) | 61% (~1.64 tok/word) | 60% |
| Mistral 7B v0.2 (32k vocab) | 72% (~1.39 tok/word) | 48% (~2.08 tok/word) | 48% |
| NorMistral (32k, Norwegian-trained) | 62% | 70% (~1.43 tok/word) | 66% |

This works out to about **1.3-1.5x more tokens for Norwegian than English** on multilingual tokenizers. The OpenAI o200k, Claude and Tekken tokenizers were not in the benchmark. Applied to a lecture: 3,000-10,000 words x ~1.6-1.8 tok/word ≈ **5k-18k input tokens**. That is consistent with the 15k baseline, which covers a mid-to-large lecture plus the prompt.

## 4. Free tiers / student credits
- **Azure for Students:** $100 credit for 12 months, no credit card, full-time university students only, one account per person. The credit covers "most Azure products" but not Marketplace offers. The page lists Azure OpenAI / Foundry models as available, but it does not explicitly say the credit applies to them.
- **Gemini API:** has a free tier for 2.5 Flash, 2.5 Flash-Lite, 2.5 Pro, 3.8 Flash and 3.5 Flash-Lite, but not for 3.1 Pro Preview. Exact RPM/TPM/RPD limits are only shown inside AI Studio, not in the docs. Whether free-tier data is used for product improvement, and whether the free tier is available in the EEA/Norway, was **not verified** (training-data belief: free-tier content may be used to improve products, and the free tier is restricted in the EU/EEA — check).
- **Mistral:** the pricing page mentions a "Free plan", but it describes Le Chat/Vibe consumer limits. The free API ("Experiment") tier limits were **not found** this run.
- **Anthropic:** the API is postpaid, with no free tier or credits mentioned on the pricing page.
- **Google Cloud $300 trial credit:** not checked this run.

## 5. Findings (claims)

| # | Claim | Source URL | Publisher | Pub date | Accessed | Confidence | Class |
|---|---|---|---|---|---|---|---|
| 1 | Gemini 2.5 Flash-Lite costs $0.10 in / $0.40 out per 1M; 2.5 Flash $0.30/$2.50; 2.5 Pro $1.25/$10 (<=200k) | https://ai.google.dev/gemini-api/docs/pricing | Google | 2026-10-27 (last updated) | 2026-10-28 | High | pricing |
| 2 | Gemini 3.8 Flash costs $0.75/$3.75 until 2026-12-31, then $1.50/$7.50; 3.5 Flash-Lite $0.30/$2.50; 3.1 Pro Preview $2/$12, with no free tier | same | Google | 2026-10-27 | 2026-10-28 | High | pricing |
| 3 | The Gemini API free tier covers the 2.5 models, 3.8 Flash and 3.5 Flash-Lite; the limits are shown only in AI Studio | https://ai.google.dev/gemini-api/docs/pricing ; https://ai.google.dev/gemini-api/docs/rate-limits | Google | 2026-10-26/27 | 2026-10-28 | Medium-High | feature |
| 4 | OpenAI standard prices per 1M: GPT-5-mini $0.25/$2.00, GPT-5-nano $0.05/$0.40, GPT-5.4-mini $0.75/$4.50, GPT-5.4-nano $0.20/$1.25, GPT-4.1-mini $0.40/$1.60, GPT-4.1-nano $0.10/$0.40 | https://developers.openai.com/api/docs/pricing | OpenAI | undated (live page) | 2026-10-28 | High (OpenAI direct); Azure equivalence unverified | pricing |
| 5 | Azure OpenAI offers Global, Data Zone (EU/US) and Regional deployment types, but the price cells did not render | https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/ | Microsoft | undated | 2026-10-28 | Medium | pricing |
| 6 | Claude Haiku 5.5 costs $0.10/$0.50 (prompts <=100k; $0.50/$2.50 above); Haiku 4.5 $1/$5; Sonnet 5.5 $2/$10; Sonnet 4.6 $3/$15 | https://platform.claude.com/docs/en/about-claude/pricing | Anthropic | undated (live docs) | 2026-10-28 | High | pricing |
| 7 | For Claude 4.6+, US-only `inference_geo` costs 1.1x; Bedrock/GCP regional endpoints carry a +10% premium; the API is postpaid with no credits | same | Anthropic | undated | 2026-10-28 | High | pricing |
| 8 | Mistral's pricing page quotes Mistral Large at $0.5/M in and $1.5/M out (in example text); the full table is JS-rendered and was not read | https://mistral.ai/pricing | Mistral AI | undated | 2026-10-28 | Medium | pricing |
| 9 | Mistral Small 4 costs $0.15/$0.60 per 1M | https://anotherwrapper.com/llm-pricing/mistral-small-latest | anotherwrapper (third party) | unknown | 2026-10-28 | Low-Medium | pricing |
| 10 | The current Mistral lineup is Large 4 (open-weight, v26.10), Medium 3.5, Small 4 (Apache 2.0) and Ministral 3 at 3B/8B/14B | https://docs.mistral.ai/getting-started/models/ | Mistral AI | undated | 2026-10-28 | High | feature |
| 11 | On EuroEval Norwegian (overall), Gemini 3 Pro preview ranks #1 (1.19); Gemini 3 Flash scores 1.33; GPT-5.4-mini (high) 1.38; Sonnet 4.5 (thinking) 1.39; Gemini 3.1 Flash-Lite 1.45; Sonnet 4.6 1.49; GPT-4.1 1.56; GPT-5-mini 1.60; Haiku 4.5 1.98 | https://github.com/EuroEval/leaderboards/blob/main/leaderboards/norwegian_all.csv | EuroEval (Alexandra Institute) | snapshot 2026-04-17 | 2026-10-28 | High (for snapshot) | benchmark |
| 12 | On EuroEval Norwegian, laptop-class open models score: Gemma-3-12B-it 1.83, Borealis-12B (NB AI-lab) 1.95, Qwen3-14B 1.96, Ministral-3-14B 2.01, Qwen3.5-9B 2.01, Gemma-4-E4B 2.06, Ministral-3-8B 2.07; Gemma-4-31B scores 1.33 and Gemma-4-26B-A4B 1.52 | same | EuroEval | 2026-04-17 | 2026-10-28 | High | benchmark |
| 13 | NorMistral-11B, the NorwAI models, Llama-3.1-8B-Instruct, gpt-4.1-mini and gemini-2.5-flash are listed without a rank (incomplete on the current benchmark version) | same | EuroEval | 2026-04-17 | 2026-10-28 | High | benchmark |
| 14 | Norwegian Bokmål tokenizes at 55% efficiency vs 84% for English with Llama 3, 61% vs 81% with Gemma and 48% vs 72% with Mistral-7B, i.e. about 1.3-1.5x token overhead | https://github.com/NbAiLab/tokenizer-benchmark | NB AI-lab (National Library of Norway) | approx. 2024 (undated) | 2026-10-28 | Medium-High (old tokenizers) | benchmark |
| 15 | Azure for Students gives $100 credit for 12 months with no credit card (full-time students); it is not usable for Marketplace; it is not explicit whether it covers Azure OpenAI | https://azure.microsoft.com/en-us/free/students | Microsoft | undated | 2026-10-28 | Medium-High | feature |

## 6. Leads (not followed, budget)
- Read NorEval directly (ltg/UiO, 2025 paper and GitHub) for Norwegian generation tasks, especially Nynorsk and summarisation.
- Look for a newer EuroEval snapshot after April 2026. Check the euroeval.com page in a JS browser, or check whether the leaderboards repo moved.
- Read the Azure pricing calculator or Azure retail prices API (`https://prices.azure.com/api/retail/prices?$filter=productName eq 'Azure OpenAI'`) for Data Zone EU prices.
- Check the Vertex AI pricing page for Gemini regional (europe-north1 / europe-west4) surcharges.
- Mistral: read docs.mistral.ai pricing and rate-limit pages for the official Small 4 / Medium 3.5 / Large 4 prices and the free "Experiment" API tier limits.
- Gemini free tier: check data-use terms and EEA availability in the Gemini API additional terms.
- Check Ollama library availability and the quantized RAM needs of gemma3:12b, qwen3:14b, ministral-3 and borealis.

## 7. Could not find / unverified
- Official Azure OpenAI prices, including the Data Zone EU surcharge.
- Official Mistral per-model API prices (Small 4 came from a third party; Large came from one example sentence) and Mistral free API tier limits.
- Gemini free-tier numeric limits and its EEA/Norway data-use terms.
- Any EuroEval score for Claude Haiku 5.5 / Sonnet 5.5, Gemini 3.5/3.8, Mistral Small 4 / Medium 3.5 / Large 4, or GPT-5.x beyond 5.4.
- Any current ranking for NorMistral / NorwAI / NorLLM; NorEval and Sikt evaluations were not read.
- Token overhead figures for the OpenAI (o200k), Claude, Gemini-3 or Tekken tokenizers on Norwegian.
- Google Cloud trial credit terms.
