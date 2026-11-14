---
title: Teknologigjennomgang av ARCHITECTURE-SPINE.md
lens: verify-tech (er hvert valg sjekket mot virkeligheten, ikke bare antatt?)
date: 2026-11-14
reviewed: ARCHITECTURE-SPINE.md, .memlog.md
---

# Teknologigjennomgang

**Dom:** Versjonene finnes og er riktige, men én av dem kan ikke installeres sammen med en annen. pydantic-ai-slim 2.68.0 krever google-genai <3, mens spinen låser google-genai til 3.3.0. I tillegg avhenger tre regler av oppførsel som ikke er sjekket: rewrites, partial index på SQLite og bcrypt-grensen.

## Hva som ble sjekket (2026-11-14)

| Sjekk | Metode | Resultat |
| --- | --- | --- |
| 17 PyPI-pakker i tabellen | `pypi.org/pypi/<pkg>/json` | Alle samsvarer med siste versjon (fastapi 0.162.7 … pymupdf 2.1). |
| 14 npm-pakker i tabellen | `registry.npmjs.org/<pkg>/latest` | Alle samsvarer. TypeScript `latest` = 7.0.2; spinen låser 5.9.3 med vilje. |
| Avhengigheter mellom pakkene | `requires_dist` for pydantic-ai-slim 2.68.0 | **Konflikt:** `google-genai<3,>=2.30.0; extra == "google"`. Siste 2.x er 2.34.0. |
| Extras-navn | `provides_extra` | `google` (og `google-realtime`). `pydantic-ai-slim[google]` er riktig. |
| Next 16.4.6 ↔ React 19.3.1 | peerDependencies | `react ^18.2.0 \|\| ^19.0.0` – OK. engines node >=20.9.0. |
| Node-krav | engines | vitest 5.1.0: node `^22.12.0`; @axe-core/playwright 4.14.0: node `>=22.12.0`; shadcn 4.23.0: `>=20.18.1`. node:22 (22.23.5) dekker alt. |
| Støttevinduer | endoflife.date API | Node 22 EOL 2027-04-30 (vedlikehold, ikke aktiv). Python 3.12 EOL 2028-10-31 (bare sikkerhetsfiks). Postgres 16 EOL 2028-11-09. Alle dekker desember 2026. |
| Gemini i EU | docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency | `gemini-3.5-flash` = «Yes» for EU multi-region. «The European Union multi-region (`eu`) endpoint strictly covers data residency within EU member states.» |
| GoogleCloudProvider(location='eu') | pydantic.dev/docs/ai/models/google-cloud | Støttet. «The multi-region values are routed to the `aiplatform.{us,eu}.rep.googleapis.com` data-residency endpoints.» Eksplisitt `project`/`location` gir ADC. |
| Strukturert svar på Gemini | pydantic.dev/docs/ai/core-concepts/output | Standard er **Tool Output**. Native Output støttes. Gemini 3 kan kombinere Native Output med verktøy. |
| PyMuPDF 2.x | pymupdf.readthedocs.io/en/latest/changes.html + PyPI-filer | 2.0 kom 2026-10-19 og 2.1 kom 2026-11-02. Ingen endring i `get_text`/`get_pixmap` er nevnt. Krever Python 3.11–3.15. Det finnes hjul for manylinux x86_64 og aarch64. Lisens: AGPL-3.0 eller kommersiell. |
| bcrypt 5.0.0 | github.com/pyca/bcrypt CHANGELOG | «Passing `hashpw` a password longer than 72 bytes now raises a `ValueError`.» |
| Next rewrites til ekstern URL | nextjs.org/docs/app/api-reference/config/next-config-js/rewrites | Støttet («act as a URL proxy»). Dokumentasjonen sier ingenting om cookies, tidsavbrudd eller kroppsstørrelse. |
| Tidsavbrudd i rewrites | github.com/vercel/next.js/issues/36251 | Kildekoden har `proxyTimeout: 30_000`. Verdien kan endres med `experimental.proxyTimeout` (PR #40289). |
| Kroppsgrense ved proxy | nextjs.org/docs/app/api-reference/config/next-config-js/proxyClientMaxBodySize | 10 MB. Gjelder **bare når `proxy.ts` brukes**. Over grensen kuttes kroppen **uten feilmelding**. |
| shadcn + Tailwind 4 | ui.shadcn.com/docs/tailwind-v4 | Nye prosjekter starter på Tailwind v4 + React 19. Siden nevner ikke Next 16 eksplisitt. |
| Partial index | docs.sqlalchemy.org/en/21/dialects/sqlite.html | SQLite: `sqlite_where`. Postgres: `postgresql_where`. Argumentene gjelder hver sin dialekt. |

## Funn

### F1 – HØY: google-genai 3.3.0 kan ikke installeres sammen med pydantic-ai-slim[google] 2.68.0

- **Hvor:** Teknologitabellen og `(version)`-linja i .memlog.md.
- **Problem:** pydantic-ai-slim 2.68.0 (utgitt 2026-11-12, nyeste) krever `google-genai<3,>=2.30.0`. google-genai 3.0.0 kom 2026-11-06. Sjekken bekreftet at hver versjon finnes, men ikke at de kan brukes sammen. Med `uv` gir dette en løsningsfeil, og backend-bildet kan ikke bygges.
- **Rettelse:** Fjern den egne låsen på google-genai, og la `pydantic-ai-slim[google]==2.68.0` styre den. I dag blir det 2.34.0. Skriv `google-genai 2.34.0 (styrt av pydantic-ai)` i tabellen. Legg til en regel i .memlog: versjonssjekker skal også kjøre `uv lock`/`uv pip compile`.
- **Kilde:** https://pypi.org/pypi/pydantic-ai-slim/2.68.0/json (`requires_dist`)

### F2 – MIDDELS: AD-13 + AD-5 – den delvise unike indeksen blir en vanlig unik indeks på SQLite, hvis bare `postgresql_where` er satt

- **Problem:** SQLAlchemy og Alembic tar betingelsen for hver dialekt for seg: `postgresql_where` og `sqlite_where`. Hvis bare den ene er satt, lager SQLite en **full** unik indeks på `lecture_id`. Da feiler alle tester som lager en ny jobb på samme forelesning etter en `done`/`failed`-jobb. AD-13 er nettopp ment å hindre at testene og appen oppfører seg ulikt.
- **Rettelse:** Legg til i AD-5: `Index("uq_jobs_active", Job.lecture_id, unique=True, postgresql_where=text("status='running'"), sqlite_where=text("status='running'"))`, og samme argumenter i Alembic-migreringen. Lag en test som kjører på SQLite: to jobber etter hverandre på samme forelesning skal gå bra, og to samtidige skal feile. Tilsvarende for `ON CONFLICT DO NOTHING` (konvensjonene): `insert()` må hentes fra riktig dialekt (`sqlalchemy.dialects.postgresql`/`sqlite`). Ellers finnes ikke `.on_conflict_do_nothing()`.
- **Kilde:** https://docs.sqlalchemy.org/en/21/dialects/sqlite.html (Partial Indexes, `sqlite_where`)

### F3 – MIDDELS: AD-10 – bcrypt 5 kaster feil for passord over 72 bytes

- **Problem:** AD-10 sier bare «minst 8 tegn». Med bcrypt 5.0.0 gir et langt passord, eller et kort passord med mange flerbyte-tegn som æøå, `ValueError` og dermed 500 ved registrering eller innlogging.
- **Rettelse:** Legg til en øvre grense i AD-10: maks 72 **bytes** i UTF-8, sjekket i Pydantic-skjemaet. Gi en egen feilkode `PASSWORD_TOO_LONG` (AD-12) og en test.
- **Kilde:** https://github.com/pyca/bcrypt/blob/main/CHANGELOG.rst (5.0.0)

### F4 – MIDDELS: AD-1 – grensene i rewrites-proxyen er ikke dokumentert eller sjekket

- **Problem 1 (byggetid):** `rewrites()` kjøres under `next build` og skrives til `routes-manifest.json`. En `API_INTERNAL_URL` som bare settes i compose ved kjøring, blir trolig ikke brukt i en standalone-build. *Dette er ikke bekreftet i offisiell dokumentasjon, og bør testes.*
- **Problem 2 (tidsavbrudd):** Rewrites har 30 s grense (`proxyTimeout: 30_000`). Generering er en jobb (AD-5) og rammes ikke. Opplasting, der PyMuPDF leser 50 sider, og kontosletting bør likevel holde seg under grensen. Ellers bør grensen settes opp.
- **Problem 3 (proxy.ts):** Hvis noen senere lager `proxy.ts`, for eksempel for å sende uinnloggede brukere videre, kuttes PDF-opplastinger over 10 MB **uten feilmelding**.
- **Cookies:** Dokumentasjonen sier ingenting eksplisitt om `Set-Cookie`. Rewrites er en vanlig HTTP-proxy, så det bør virke, men det er ikke verifisert. En e2e-test for innlogging bør bekrefte at `Set-Cookie` kommer gjennom på `localhost:3000`.
- **Rettelse:** Utvid AD-1 slik:
  - `API_INTERNAL_URL` har standardverdien `http://backend:8000` i `next.config.ts`, og settes som `ARG` i Dockerfile.
  - Ingen `proxy.ts` i MVP, eller `proxyClientMaxBodySize` hvis den legges til.
  - Én Playwright-test sjekker innlogging og opplasting gjennom porten 3000.
- **Kilder:** https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites · https://github.com/vercel/next.js/issues/36251 · https://nextjs.org/docs/app/api-reference/config/next-config-js/proxyClientMaxBodySize

### F5 – LAV/MIDDELS: AD-4 – modus for strukturert svar er ikke valgt, og pydantic-ai-veien er ikke testet

- **Problem:** Testen 2026-11-05 brukte REST med `responseSchema`, altså Geminis egen strukturerte utdata. pydantic-ai bruker **Tool Output** som standard. Det er en annen mekanisme, og den er ikke testet på norsk på `gemini-3.5-flash`.
- **Rettelse:** I AD-4: `output_type=NativeOutput(<Modell>)`. Da tilsvarer kallet det som ble testet. Første generation-story kjører én ekte prøve mot Vertex med pydantic-ai.
- **Kilde:** https://pydantic.dev/docs/ai/core-concepts/output

### F6 – LAV: AGPL og at repoet mangler lisens

- **Problem:** AD-6 og .memlog sier «AGPL er greit med offentlig repo». Repoet har ingen `LICENSE`-fil. Uten lisens er koden «alle rettigheter forbeholdt», og det passer dårlig med AGPL hvis appen noen gang publiseres eller deles.
- **Rettelse:** Legg til AGPL-3.0 i `LICENSE`, eller skriv eksplisitt i AD-6 at det skjer før eventuell publisering.
- **Kilde:** https://pypi.org/pypi/pymupdf/json (`license`)

## Bekreftet uten anmerkning

- Next 16.4.6 + React 19.3.1 + TypeScript 5.9.3: peer-krav er oppfylt. Å låse TS 5.9.3 og vente på TS 7 er et fornuftig valg.
- `GoogleCloudProvider(location='eu')` + ADC, og at `gemini-3.5-flash` finnes i EU multi-region.
- PyMuPDF 2.1: samme API som i testskriptene (`pymupdf.open`, `page.get_text()`, `page.get_pixmap(dpi=…).tobytes("png")`). Ingen endring er nevnt i endringsloggen for 2.0 eller 2.1. Hjul finnes for linux/aarch64, så Docker på Mac (Apple Silicon) virker.
- `@fontsource-variable/inter` 5.3.0: ren CSS og fonter uten peer-krav, og passer med Next 16 og AD-14.
- `@axe-core/playwright` 4.14.0: peer `playwright-core >=1.0.0`. Krever Node ≥22.12 der e2e kjøres, også på vertsmaskinen.
- shadcn CLI 4.23.0: nye prosjekter starter på Tailwind v4 og React 19.
- Støttevinduer for Node 22, Python 3.12 og Postgres 16 dekker fristen 2026-12-15.

## Ikke verifisert

- Om `google_thinking_config` / Thinking-capability (`.memlog`) heter det samme i pydantic-ai 2.68.0. Det ble ikke sjekket her.
- Hvordan «mellomlagring er slått av» konfigureres for EU multi-region. Data residency-siden nevner det ikke.
