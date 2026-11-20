---
title: 'Funn #68: ta i bruk shadcn/ui'
type: 'refactor'
created: '2026-11-20'
status: 'done'
baseline_revision: '902f708daa11fb05018ccc50471e53aa1bcce6d9'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/technology.md'
warnings: []
deferred:
  - summary: >-
      Elementer som legges i body etter at dialogen er åpnet (for eksempel toaster fra sonner), får ikke inert.
    evidence: |-
      inertOthers tar ett øyeblikksbilde av body når dialogen åpnes. Radix sin hideOthers har samme begrensning for aria-hidden. Ingen side legger noe i body mens en dialog er åpen ennå.
    location: >-
      frontend/components/ui/dialog.tsx inertOthers
    severity: medium
  - summary: >-
      Nye shadcn-komponenter fra CLI-en bruker shadcn-farger (bg-primary, ring-ring) som ikke finnes i temaet, og ingen test fanger det.
    evidence: |-
      globals.css slår av standardfargene (--color-*: initial), så slike klasser gir ingen CSS og komponenten blir ustylet uten feilmelding. Gjelder neste `shadcn add`.
    location: >-
      frontend/components.json, frontend/components/ui/
    severity: medium
  - summary: >-
      Dialogen har ingen aria-describedby, så skjermlesere leser ikke innholdet sammen med tittelen.
    evidence: |-
      Slik var det også i den håndlagde dialogen. Bør avgjøres når første slettedialog bygges (epic 2).
    location: >-
      frontend/components/dialog.tsx
    severity: low
  - summary: >-
      Fokus går til body hvis knappen som åpnet dialogen er borte når den lukkes.
    evidence: |-
      Slik var det også før. Blir aktuelt når en slettedialog fjerner raden som åpnet den (epic 2).
    location: >-
      frontend/components/dialog.tsx onCloseAutoFocus
    severity: low
---

<intent-contract>

## Intent

**Problem:** Knappene, tekstfeltet, passordfeltet og dialogen i `frontend/components/` er skrevet for hånd uten shadcn/ui (kanttilfelle #46). Silje avviste avviket i gjennomgangen av epic 1 (#67, funn #68): arkitekturen (`ARCHITECTURE-SPINE.md` linje 245, `technology.md` linje 106) sier shadcn/ui med Radix, og dialogen mangler `inert` bakgrunn og scrollelås.

**Approach:** Legg til shadcn/ui med CLI 4.23.0 (`components.json`, `components/ui/`), med `radix-ui`, `class-variance-authority`, `tailwind-merge` og `clsx` låst til eksakte versjoner. Tilpass shadcn-komponentene til tokenene i `app/globals.css` (DESIGN.md), og bygg `TextField`, `PasswordField` og `Dialog` oppå dem med samme API som før.

## Boundaries & Constraints

**Always:** Bare tokenene fra DESIGN.md (ingen shadcn-farger som `bg-primary`). Den globale fokusringen beholdes (ingen `outline-none`). Knappevariantene heter `primary`, `outline`, `text`, `danger`, størrelsene `md` og `lg`, og standard er `type="button"`. Dialogen: Radix gir fokusfelle, Esc, scrollelås og `aria-hidden`; bakgrunnen får i tillegg `inert`. Startfokus er første felt i innholdet, ellers «Avbryt». Klikk på sløret lukker ikke (som før; EXPERIENCE.md: Esc, krysset eller «Avbryt»). Sidene ser ut og oppfører seg som før.

**Never:** Ingen endring i `globals.css`-tokenene eller shadcn sitt fargetema. Ingen svekkede tester. Ingen endring i planleggingsdokumentene.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Åpne dialog | Klikk på åpneren | Fokus på første felt, ellers «Avbryt»; bakgrunnen `inert`, body scrollåst | – |
| Esc / Avbryt / Lukk | Dialog åpen | Lukkes uten hovedhandling, fokus tilbake til åpneren, `inert` fjernet | – |
| Tab fra siste knapp | Fokus på hovedhandlingen | Fokus til «Lukk» (og omvendt med Shift+Tab) | – |
| Fokus på body | Etter klikk på sløret | Tab går inn i dialogen, Esc lukker | – |
| Felt med feil | `error` satt | 1,5 px rød kant, ikon og tekst koblet med `aria-describedby`, `aria-invalid` | – |

</intent-contract>

## Code Map

- `frontend/components/button.tsx` -- håndlaget knapp; erstattes av `components/ui/button.tsx` (cva-varianter). Brukes i `modules/identity/pages/login-page.tsx` og `register-page.tsx`.
- `frontend/components/text-field.tsx` -- etikett, felt og feilmelding; bygges på `ui/input` og `ui/label`.
- `frontend/components/password-field.tsx` -- «Vis»-knappen blir `Button variant="text"`.
- `frontend/components/dialog.tsx` -- håndlaget fokusfelle; bygges på `ui/dialog` (Radix). Ingen side bruker den ennå.
- `frontend/components/*.test.tsx` -- eksisterende tester som skal holde; `dialog.test.tsx` sjekker at sløret er forelderen til dialogen.
- `frontend/lib/design-tokens.test.ts` -- skanner kildefiler for `outline-none` og ulovlige vekter.
- `frontend/app/globals.css` -- tokenene (`--text-*`, `--spacing-*`, `--radius-*`, `--shadow-*`) som `tailwind-merge` må kjenne.
- Radix FocusScope gir fokus tilbake i `setTimeout(0)` (`node_modules/@radix-ui/react-focus-scope`), så testene må vente på det.

## Tasks & Acceptance

**Execution:**
- `frontend/package.json`, `frontend/components.json` -- shadcn-oppsett og pakker med eksakte versjoner -- arkitekturen.
- `frontend/lib/utils.ts` -- `cn()` med `extendTailwindMerge` som kjenner de egne tokenene -- ellers sletter `twMerge` f.eks. `text-label` når `text-ink` står i samme liste.
- `frontend/components/ui/button.tsx` -- shadcn-knapp med variantene og størrelsene fra DESIGN.md; flytt `button.test.tsx` hit og oppdater importene i sidene.
- `frontend/components/ui/input.tsx`, `ui/label.tsx` -- tilpasset tokenene.
- `frontend/components/ui/dialog.tsx` -- Radix-dialog med slør (`bg-scrim-veil`) rundt innholdet, `inert` på bakgrunnen.
- `frontend/components/text-field.tsx`, `password-field.tsx`, `dialog.tsx` -- samme API som før, bygd på `ui/`.
- `frontend/components/dialog.test.tsx` -- vent på at fokus kommer tilbake; nye tester for `inert`, scrollelås og at klikk på sløret ikke lukker.
- `frontend/lib/utils.test.ts` -- tester for `cn()` med egne tokener.

**Acceptance Criteria:**
- Given appen kjører, when innlogging, registrering og «Fant ikke siden» åpnes i 1280 og 768 px, then ser de ut som skjermbildene fra story 1.4–1.6.
- Given alle testene, when `npm run test`, `npx tsc --noEmit`, `uv run pytest` og `npx playwright test` kjøres, then er alt grønt.
- Given `package.json`, when den leses, then har `radix-ui`, `class-variance-authority`, `tailwind-merge` og `clsx` eksakte versjoner.

## Spec Change Log

- 2026-11-20 (under implementasjonen, ikke en gjennomgangssløyfe): forslaget i Design Notes om `inertOthers` fra pakken `aria-hidden` virket ikke. Pakken bruker samme teller for `aria-hidden` (Radix) og `inert`, så ett av attributtene ble liggende igjen etter at dialogen lukket. Erstattet av en egen liten `inertOthers` i `components/ui/dialog.tsx` (`dc5cb40`). BEHOLD: inert settes etter at Radix har flyttet fokus inn i dialogen.

## Review Triage Log

### 2026-11-20 — Review pass
- verdicts: 33 findings — high 0, medium 4, low 16, false 10, maybe-false 3
- findings:
  - `[false]` `[reject]` Intent: «se ut som før» sjekkes ikke på sidene — skjermbildene i `docs/skjermbilder/funn-68/` er piksel-like de fra story 1.4–1.6, og Playwright med axe er grønt (28/28).
  - `[false]` `[reject]` Intent: `inert` kommer ikke fra Radix — Radix 1.8.1 har ikke `inert`, bare `aria-hidden`; resten kommer fra Radix.
  - `[low]` `[reject]` Intent: fokus kommer tilbake i `setTimeout(0)`, og testene venter med `waitFor` — samme sluttresultat for brukeren; påstanden er like streng, bare asynkron. Lagt fram for Silje som kanttilfelle.
  - `[low]` `[reject]` Intent: scrollelåsen testes bare med `data-scroll-locked` — jsdom kan ikke scrolle.
  - `[low]` `[reject]` Intent: shadcn-versjonen 4.23.0 står bare i commit-meldingen — `components.json` har ikke felt for versjon; står også i PR og `beslutninger.md`.
  - `[false]` `[reject]` Blind: KI-sporet mangler — føres i senere steg i samme økt.
  - `[low]` `[defer]` Blind: dialogen har ingen `aria-describedby` — slik var det før.
  - `[low]` `[reject]` Blind: rød kant definert to steder — testen for tekstfeltet krever klassen `border-danger`; å fjerne den i Input ville gjøre Input alene uten feilstil.
  - `[low]` `[reject]` Blind: Next sin `next-route-announcer` blir inert — samme som Radix gjør med `aria-hidden`; dialoger navigerer ikke.
  - `[false]` `[reject]` Blind: tidsrekkefølgen for inert er ikke sikret — effekten kjører etter en ny render som først skjer etter at FocusScope har flyttet fokus i forrige commit.
  - `[low]` `[defer]` Blind: fokus til body når åpneren er borte — slik var det før.
  - `[medium]` `[patch]` Blind: knappens `className`-overstyring er ikke testet — slått sammen med Verifisering under.
  - `[low]` `[reject]` Blind: to lukkekryss-varianter og innebygd kryss kan dekke tittelen — det innebygde brukes ikke.
  - `[low]` `[reject]` Blind: ubrukte eksporter er ikke testet — standardflaten fra shadcn.
  - `[medium]` `[defer]` Blind: neste `shadcn add` gir klasser som ikke finnes i temaet — gjelder neste komponent, ikke denne endringen.
  - `[false]` `[reject]` Blind: scrimtesten bruker `parentElement` — den eksisterende testen krever allerede at forelderen er sløret.
  - `[low]` `[reject]` Blind: død kode i `cssTokens` og fargene er ikke med — ingen skade nå.
  - `[low]` `[reject]` Blind: `"hooks": "@/hooks"` peker på en mappe som ikke finnes — CLI-en lager den ved behov.
  - `[medium]` `[defer]` Edge: elementer lagt i body etter åpning får ikke inert — samme begrensning som Radix; ingen side gjør det ennå.
  - `[low]` `[reject]` Edge: `role=alert` uten `aria-live` blir inert — samme regel som Radix; varsler bak dialogen skal ikke leses opp.
  - `[low]` `[reject]` Edge: `aria-live` inni en knapp — finnes ikke i appen.
  - `[maybe-false]` `[reject]` Edge: lukk og åpne igjen før `setTimeout(0)` — avgjøres ved en nettlesertest; ville bare vært low.
  - `[low]` `[defer]` Edge: åpneren er borte (samme som Blind over).
  - `[low]` `[reject]` Edge: callback-ref med opprydding fra React 19 — ingen bruker det.
  - `[low]` `[reject]` Edge: `variant={null}` gir ustylet knapp — ingen sender null.
  - `[maybe-false]` `[reject]` Edge: Esc stopper ikke lenger propagering — ingen andre Esc-lyttere finnes; ville bare vært low.
  - `[medium]` `[patch]` Verifisering: stilen på «Vis» testes ikke — ny test i `password-field.test.tsx` (`1dd6c14`), som feiler når klassene fjernes.
  - `[false]` `[reject]` Intent: lesning B2 (fjerne innpakningene) — B1 er valgt i spesifikasjonen og holder API-et stabilt.
  - `[false]` `[reject]` Intent: Tab fra body og startfokus er fortsatt egen kode — Radix dekker det ikke; testet.
  - `[false]` `[reject]` Intent: Label hindrer markering ved dobbeltklikk — standard Radix-oppførsel, ingen synlig forskjell.
  - `[false]` `[reject]` Intent: scrollelåsen kan legge til `padding-right` — gjelder bare når en dialog er åpen; ingen side har dialog.
  - `[false]` `[reject]` Intent: placeholder- og disabled-stil i Input — ingen felt bruker dem; skjermbildene er like.
  - `[maybe-false]` `[reject]` Intent: dialogen er bare testet i jsdom — sjekkes med e2e når første side bruker den (issue).

## Design Notes

Sløret er `DialogOverlay`, og innholdet ligger inni det (Radix sitt mønster for scrollbart slør). Da sentreres dialogen med flex som før, og `dialog.parentElement` er sløret. Radix bruker `aria-hidden` på bakgrunnen; `inertOthers` fra `aria-hidden` (som Radix allerede bruker) legger i tillegg på `inert`, slik #68 ber om.

## Verification

**Commands:**
- `cd frontend && npm run test && npx tsc --noEmit` -- expected: grønt
- `cd backend && uv run pytest` -- expected: grønt
- `cd frontend && npx playwright test` mot `docker compose up --build` -- expected: grønt, axe uten brudd

## Auto Run Result

Status: done

**Endringen:** shadcn/ui (CLI 4.23.0) er tatt i bruk med `radix-ui` 1.8.1, `class-variance-authority` 0.7.1, `tailwind-merge` 3.7.1 og `clsx` 2.1.1. Knappen, feltene og dialogen er shadcn-komponenter tilpasset DESIGN.md, og sidene ser ut som før.

**Filer:**
- `frontend/package.json`, `package-lock.json`, `components.json`: pakkene og shadcn-oppsettet.
- `frontend/lib/utils.ts` (+ test): `cn()` som kjenner tokenene.
- `frontend/components/ui/button.tsx` (+ flyttet test): knappen med fire varianter.
- `frontend/components/ui/input.tsx`, `ui/label.tsx`: felt og etikett.
- `frontend/components/ui/dialog.tsx` (+ test): Radix-dialog med slør og `inert`.
- `frontend/components/text-field.tsx`, `password-field.tsx` (+ test), `dialog.tsx` (+ test): samme API, bygd på `ui/`.
- `frontend/components/button.tsx`: slettet.
- `frontend/modules/identity/pages/login-page.tsx`, `register-page.tsx`: ny import.

**Gjennomgang:** 1 patch (medium, test for «Vis»), 4 utsatt (2 medium, 2 low, se `deferred`), resten avvist med begrunnelse i triageloggen. Patchet: high 0, medium 1. Ny gjennomgang anbefales ikke.

**Verifisering:** `npm run test` 251/251, `npx tsc --noEmit` OK, `uv run pytest` 126 passed, `npx playwright test` 28/28 med axe. Skjermbildene i `docs/skjermbilder/funn-68/` er piksel-like de fra story 1.4–1.6.

**Gjenstående risiko:** Ingen side bruker dialogen ennå, så rekkefølgen fokus → `inert` → fokus tilbake er bare sjekket i jsdom og ved å lese koden. Den bør få en e2e-test når første side bruker dialogen.
