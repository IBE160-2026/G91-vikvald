---
title: 'Funn #68: ta i bruk shadcn/ui'
type: 'refactor'
created: '2026-11-20'
status: 'in-progress'
baseline_revision: '902f708daa11fb05018ccc50471e53aa1bcce6d9'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/technology.md'
warnings: []
deferred: []
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

## Review Triage Log

## Design Notes

Sløret er `DialogOverlay`, og innholdet ligger inni det (Radix sitt mønster for scrollbart slør). Da sentreres dialogen med flex som før, og `dialog.parentElement` er sløret. Radix bruker `aria-hidden` på bakgrunnen; `inertOthers` fra `aria-hidden` (som Radix allerede bruker) legger i tillegg på `inert`, slik #68 ber om.

## Verification

**Commands:**
- `cd frontend && npm run test && npx tsc --noEmit` -- expected: grønt
- `cd backend && uv run pytest` -- expected: grønt
- `cd frontend && npx playwright test` mot `docker compose up --build` -- expected: grønt, axe uten brudd
