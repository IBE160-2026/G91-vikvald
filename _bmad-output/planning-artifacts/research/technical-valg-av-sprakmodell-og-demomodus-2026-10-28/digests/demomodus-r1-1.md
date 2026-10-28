# Digest: Demo mode for an LLM app with no API key (r1-1)

Accessed: 2026-10-28. Research firewall respected (no project files read). Verified in this run: everything in the Findings table. Anything marked "unverified" comes from background knowledge and was not confirmed.

## Options table

| Approach | Examiner setup | What it shows | Reliability | Testability |
|---|---|---|---|---|
| (a) Seeded, pre-generated content in the DB (seed script or fixture loaded on first run) | Lowest: clone, install, run seed. No extra software, no network | The UI, study flow, persistence, quiz/flashcard UX on realistic content. It does NOT show live generation from a newly uploaded PDF | Very high (deterministic, offline) | High for UI/E2E tests. Same fixtures can be reused as mock responses |
| (b) Mock/fake LLM provider behind the interface (AI SDK `MockLanguageModelV4`, LangChain `fakeModel`/`FakeListChatModel`, or an OpenAI-compatible mock server such as mockllm/llmock/fakellm/llmposter) | Low: set `LLM_PROVIDER=mock`, or make it the default. A mock *server* adds one more process or Docker container | The full pipeline end to end: upload, extract, "generate", validate schema, store, render. Output is canned, possibly picked per input, so it is not real model quality | Very high (deterministic) | Highest. This is the standard unit-test pattern: scripted responses and errors, call inspection. Free and fast |
| (c) Local model via Ollama (or LM Studio) on its OpenAI-compatible endpoint `http://localhost:11434/v1` | Medium–high: install Ollama (~1 command or installer), `ollama pull <model>` (1.3–5.2 GB download), 8 GB+ RAM. CPU-only generation is slow | Real generation from the examiner's own PDF, with the same code path as the cloud provider | Medium: small models (1–4B) produce lower-quality questions and can break schemas more often. Default 4k context on machines under 24 GiB VRAM can cut off long PDFs. Speed depends on hardware | Medium: usable for manual or integration tests. Not deterministic, too heavy for CI |
| (d) Bring-your-own-key via `.env` | Requires the examiner to have a paid or free-tier key, which violates the "no paid account" constraint | Production-quality behaviour | High (depends on network/provider) | Low for automated tests (costs money, not deterministic) |

Implication: the combination that satisfies the constraint is (a)+(b) as the zero-setup default, with (c) as an optional "real generation" path and (d) documented for the student's own use. This is synthesis, not a sourced claim.

## Findings

| # | Claim | Source URL | Publisher | Pub date | Accessed | Confidence | Class |
|---|---|---|---|---|---|---|---|
| 1 | Ollama exposes an OpenAI-compatible API locally at `http://localhost:11434/v1/` (chat/completions, completions, models, embeddings, responses, audio). For local use an API key is required by clients, "but Ollama ignores it" | https://docs.ollama.com/api/openai-compatibility | Ollama | undated (living docs) | 2026-10-28 | High | feature |
| 2 | Ollama supports structured outputs: a JSON schema in the `format` parameter, also reachable via OpenAI-compatible `response_format`. Docs recommend Zod (`z.toJSONSchema()`) or Pydantic schemas reused for validation, and temperature 0 for determinism. Caveat: "Ollama's cloud currently does not support structured outputs" (local only) | https://docs.ollama.com/capabilities/structured-outputs | Ollama | undated | 2026-10-28 | High (the openai-compat page itself lists only `response_format` and does not spell out `json_schema`, so verify with a quick test) | feature |
| 3 | Current Ollama release: v0.40.12 (2026-10-27) stable; v0.40.13 pre-release (2026-10-28); v0.40.11 (2026-10-24) | https://github.com/ollama/ollama/releases | Ollama/GitHub | 2026-10-27 | 2026-10-28 | High | version |
| 4 | Install: macOS/Linux `curl -fsSL https://ollama.com/install.sh \| sh` (or .dmg); Windows `irm https://ollama.com/install.ps1 \| iex` (or OllamaSetup.exe); Docker image `ollama/ollama` | https://github.com/ollama/ollama | Ollama/GitHub | undated README | 2026-10-28 | High | practice |
| 5 | Model download sizes: qwen3:0.6b 523 MB, 1.7b 1.4 GB, 4b 2.5 GB, 8b 5.2 GB; llama3.2:1b 1.3 GB, 3b 2.0 GB (128K context) | https://ollama.com/library/qwen3 ; https://ollama.com/library/llama3.2 | Ollama | undated | 2026-10-28 | High | version |
| 6 | Default context length depends on VRAM: under 24 GiB gives 4k, 24–48 GiB gives 32k, 48+ GiB gives 256k. Change it with `OLLAMA_CONTEXT_LENGTH=... ollama serve` or the app slider. Matters for PDF-sized prompts | https://docs.ollama.com/context-length | Ollama | undated | 2026-10-28 | High | feature |
| 7 | RAM rule of thumb: 7B models need at least about 8 GB RAM, 13B about 16 GB. Context and parallelism add memory (KV cache) | https://ollama.com/library/llama2 ; https://docs.ollama.com/faq (via search snippet) | Ollama | older library page | 2026-10-28 | Medium (search snippet, older page) | practice |
| 8 | CPU-only speed for a 7B q4_K_M model: about 5–15 tokens/s on a modern 8-core CPU (e.g. M2, Ryzen 7). Bound by memory bandwidth | https://lumadock.com/tutorials/ollama-hardware-requirements (fetch 403, search snippet only); https://www.sitepoint.com/ollama-setup-guide-2026/ | LumaDock / SitePoint (third-party) | 2026 | 2026-10-28 | Low–Medium | practice |
| 9 | Vercel AI SDK test helpers: `MockLanguageModelV4`, `MockEmbeddingModelV4`, `mockId`, `mockValues` from `ai/test`; `simulateReadableStream` from `ai`. Structured output is mocked by returning JSON text that the SDK parses against an `Output.object()` Zod schema | https://ai-sdk.dev/docs/ai-sdk-core/testing | Vercel | undated (current docs) | 2026-10-28 | High (the version suffix V4 changes across major SDK versions, so pin it) | feature |
| 10 | AI SDK provider abstraction: `createProviderRegistry` (string IDs `provider:model`), `customProvider` (aliases, preset settings, `fallbackProvider`), middleware (`defaultSettingsMiddleware`), global default via `globalThis.AI_SDK_DEFAULT_PROVIDER`. Supports a single "providers file" pattern | https://ai-sdk.dev/docs/ai-sdk-core/provider-management | Vercel | undated | 2026-10-28 | High | practice |
| 11 | `@ai-sdk/openai-compatible` `createOpenAICompatible({ name, baseURL, apiKey, supportsStructuredOutputs })` can point at any OpenAI-compatible server (lists LM Studio. Ollama is not named but is OpenAI-compatible per #1) | https://ai-sdk.dev/providers/openai-compatible-providers | Vercel | undated | 2026-10-28 | High | feature |
| 12 | LangChain JS `fakeModel` (from `langchain`): builder that queues `.respond()`/`.respondWithTools()`, errors (`.alwaysThrow()`), `.structuredResponse()` for `withStructuredOutput()`, and records `calls`/`callCount`. `FakeListChatModel` gives ordered canned responses. Python has `GenericFakeChatModel`/`FakeListChatModel`. Docs frame it as making tests "fast, free, and repeatable without API keys" | https://docs.langchain.com/oss/javascript/langchain/test/unit-testing ; https://docs.langchain.com/oss/python/langchain/test/unit-testing (snippet) | LangChain | undated | 2026-10-28 | High (JS fetched), Medium (Python, snippet) | feature |
| 13 | Several OpenAI-compatible mock servers exist: mockllm (OpenAI+Anthropic formats), llmock, fakellm (YAML-controlled responses), llmposter (Rust, OpenAI/Anthropic/Gemini, streaming), Arize Phoenix mock-llm-server | https://pypi.org/project/mockllm/ ; https://pypi.org/project/llmock/ ; https://pypi.org/project/fakellm/ ; https://docs.rs/crate/llmposter/0.5.0 | various (search results only) | not verified | 2026-10-28 | Low (exists per search. Maturity and maintenance not checked) | feature |

## Provider-abstraction practice (synthesis from #1, #9–#12)
- Define one `getModel()`/provider module that reads `LLM_PROVIDER` (`mock` | `ollama` | `openai`/`anthropic`) and returns a model object. In the AI SDK this is `customProvider`/registry. Ollama goes through `createOpenAICompatible({ baseURL: 'http://localhost:11434/v1' })`. Mock goes through `MockLanguageModelV4` returning fixture JSON.
- Keep the Zod schema as the single contract. Real, local and mock outputs are all validated by the same schema (Ollama docs explicitly recommend schema reuse, #2).
- Seed fixtures (option a) can double as mock responses (option b), giving one dataset for demo, tests and README.
- Using a test-helper class (`ai/test`) in a runtime demo mode is unverified as recommended practice. A small hand-written fake provider may be cleaner. Not checked.

## Leads
- Ollama blog post on structured outputs (Dec 2024) and any newer post on OpenAI `json_schema` via `/v1`. Confirm `response_format: {type:'json_schema'}` works on v0.40.x.
- Community `ollama-ai-provider-v2` for the AI SDK as an alternative to openai-compatible (unverified).
- Ollama `num_ctx` via the OpenAI endpoint (not addressed in the docs fetched). The likely workaround is the `OLLAMA_CONTEXT_LENGTH` env var or a Modelfile.
- Examples of OSS repos with an explicit `DEMO_MODE`/mock provider (not found in this run).
- LM Studio headless (`lms`) as an alternative to Ollama. Not researched.

## Could not find / not verified
- Official Ollama per-model RAM table for current models (only older library-page guidance and third-party numbers).
- Measured CPU-only tokens/s for 1–4B models (the third-party range for 7B only. The 1–4B figure is unverified and probably faster).
- Maintenance status, licence and versions of mock servers (mockllm PyPI page failed to load).
- Quality of small local models at generating valid flashcard/quiz JSON from PDFs. No benchmark found.
