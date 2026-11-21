---
title: 'Story 3.4: Hurtigtaster, fokus og smal skjerm i økten'
type: 'feature'
created: '2026-11-21'
baseline_revision: 'b5549e6737cf850bb50ef563cec4bbb065f9a648'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Flashcard-økten fra 3.3 kan bare brukes med Tab, Enter og mus. Mellomrom, `1`, `2`, Esc og `?` virker ikke, hint-linjen og hurtigtastdialogen med bryteren «Bruk hurtigtaster» (WCAG 2.1.4) mangler, og under 768 px står sidemenyen og øktpanelet fast og tar plassen (story 3.4 i `epics.md`: NFR-8, UX-DR10, UX-DR26, UX-DR27, UX-DR31, UX-DR32, UX-DR33).

**Approach:** Én felles tastefunksjon i `frontend/lib/` som økten slår på, en innstilling for bryteren i `localStorage`, hint-linje under kortknappene, hurtigtastdialogen (åpnes fra «? Hurtigtaster» nederst i sidemenyen og med `?` i økten), og en felles sidemeny-ramme: bred skjerm viser sidemenyen eller øktpanelet som før, smal skjerm (≤ 768 px eller 200 % tekst) skjuler den bak menyknappen «Meny» i toppfeltet og viser den som et panel over innholdet (shadcn `sheet`).

## Boundaries & Constraints

**Always:**
- **Tastefunksjon (`frontend/lib/practice-shortcuts.ts`):** en ren funksjon som avgjør hva en `keydown` skal gjøre ut fra tast, mål og om enkelttaster er på, og en hook `usePracticeShortcuts(bindings, { singleKeys })` som bare økten bruker (aktiv bare under øving). Bindingene er en liste fra tast til handling, så quiz og fritekst kan sende egne taster. Reglene: ingenting når fokus står i et tekstfelt (`input`, `textarea`, `select`, `contenteditable`), heller ikke Esc; ingenting når en dialog eller panelet er åpent (`[role="dialog"]` i DOM-en eller `event.defaultPrevented`, Radix har da allerede lukket den med Esc); ingenting med Ctrl, Alt eller Meta, eller når tasten holdes nede (`repeat`). Mellomrom gjør ingenting i økten når fokus står på en kontroll (knapp, lenke, bryter osv.), så knappens egen handling skjer; ellers snur den kortet og hindrer rulling. Enkelttastene (Mellomrom, tall, bokstaver, `?`) virker bare med bryteren på. Esc er ikke en enkelttast og virker også med bryteren av.
- **Innstillingen (samme fil):** nøkkelen `sk_shortcuts` i `localStorage`, `"off"` når bryteren er av. Lesing og skriving er pakket i `try`; kan den ikke leses, er tastene på. `useShortcutsEnabled()` med `useSyncExternalStore`, så dialogen og økten oppdateres med en gang.
- **Taster i flashcard-økten:** Mellomrom snur kortet; `1` «Kunne ikke» og `2` «Kunne», begge bare etter snuing (som knappene); Esc gjør det samme som «Avslutt økt»; `?` åpner hurtigtastdialogen. Når økten er ferdig, virker bare `?`.
- **Fokus:** etter snuing går fokus til «Kunne» (finnes); etter markering til «Snu kortet» på neste kort, så Mellomrom snur det (finnes). Fokus flyttes aldri av seg selv til «Avslutt økt».
- **Hint-linje (`modules/practice/components/shortcut-hints.tsx`):** under kortknappene, sentrert, bare med bryteren på: shadcn `kbd` (hvit, `border-card`, `rounded-kbd`, `text-kbd`) og tekst i `text-body-sm text-ink-muted`, i skissens rekkefølge: «1 Kunne ikke», «2 Kunne», «Mellomrom snu kortet», «Esc avslutt». Bare tekst, ingen knapper. Brytes over flere linjer ved smal bredde.
- **Hurtigtastdialogen (`components/shortcuts-dialog.tsx`):** den felles `Dialog` uten hovedhandling (knappen «Lukk»), tittel «Hurtigtaster». Tabell (shadcn `table`) med kolonnene «Tast» og «Handling» etter tabellen i EXPERIENCE.md for det som er bygd: Øving: `?` «Åpner hurtigtastdialogen», Mellomrom «Snu kortet», `1` «Kunne ikke», `2` «Kunne», Esc «Avslutt økten»; Dialoger: Esc «Lukk uten endring». Under: shadcn `switch` med etiketten «Bruk hurtigtaster», på som standard. Fokus går til første kontroll i dialogen, Esc lukker, fokus går tilbake dit det var.
- **Sidemeny-rammen (`components/side-menu.tsx`):** `SideMenuProvider` (i `RequireLogin`, rundt toppfelt og `main`) holder om siden har en sidemeny, om panelet er åpent, og hurtigtastdialogen (én forekomst; `openShortcuts()` husker hvor fokus var). `SideMenu title=…` registrerer seg og viser barna rett i siden på bred skjerm, og på smal skjerm i en `Sheet` fra venstre, 288 px, over innholdet med sløret. `MenuButton` i toppfeltet (til venstre for logoen) vises bare på smal skjerm og bare på sider med sidemeny: ikonknapp med navnet «Meny», `aria-expanded`. Panelet lukkes med Esc, krysset «Lukk», klikk på sløret og når siden byttes; fokus går tilbake dit det var (menyknappen). Smal skjerm er `matchMedia("(max-width: 48em)")`, så både 768 px og tekst forstørret til 200 % gir smal skjerm.
- **Sidemenyen (`subject-sidebar.tsx`):** pakket i `SideMenu title="Emner"`. Nederst knappen «? Hurtigtaster» (tasten `?` i `kbd` og teksten «Hurtigtaster» i dempet grå, som skisse 03), som åpner dialogen. Fra panelet på smal skjerm lukkes panelet først, så dialogene aldri stables, og fokus går til menyknappen når dialogen lukkes.
- **Økten:** `SessionPanel` pakket i `SideMenu title="Flashcards"`. På smal skjerm blir panelets overskrift `h2`, og innholdet får en skjult `h1` «Flashcards», så siden alltid har én `h1`.
- **Epic 2-sidene** (forsiden, emnesiden, forelesningssiden, kontosiden) har ingen vannrett rulling på 768 px og 640 px (1280 px med 200 %), og to kolonner legges under hverandre. Kortet i økten krymper til bredden som er igjen (finnes).
- **shadcn:** `npx shadcn add sheet switch kbd`, tilpasset tokenene. Sjekk `package.json` etterpå (fjern `cn`, `radix-ui` låst til 1.8.1).
- Testnavn har krav-ID («NFR-8: …», «UX-DR26: …», «UX-DR10: …», «UX-DR27: …», «UX-DR31: …»). Kode og kommentarer på engelsk, synlig tekst på bokmål.

**Never:**
- Ikke rør planleggingsdokumentene, `CLAUDE.md`, `.claude/settings.json`, `.git/hooks/` eller `frontend/e2e/brukerreiser/`.
- Ingen backend-endring, ingen lagring av økten eller resultatside (3.5), ingen redigering eller sletting (3.7), ingen quiz- eller fritekst-taster. Ingen nye pakker utenom det shadcn trenger (ingen nye npm-pakker ventes).
- Forsidekortene i to og én kolonne (epic 5).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Snu og marker | økt, fokus på siden, Mellomrom, så `2` | kortet snus, fokus på «Kunne»; `2` markerer «Kunne», fokus på «Snu kortet» | — |
| Før snuing | `1` eller `2` før kortet er snudd | ingenting | — |
| Knapp i fokus | fokus på «Avslutt økt», Mellomrom | knappens egen handling (avslutter), kortet snus ikke; fokus kom dit bare med Tab | — |
| Esc | Esc i økten | tilbake til forelesningen, som «Avslutt økt» | — |
| Dialog åpen | `?`, så Esc | dialogen åpnes; Esc lukker bare den, fokus tilbake, økten fortsetter; enkelttaster virker ikke imens | — |
| Bryter av | bryteren av, Mellomrom/`1`/`2`/`?` | ingenting, hint-linjen skjult, knappene virker; valget huskes etter ny innlasting | `localStorage` kaster → tastene på |
| Tekstfelt | fokus i et tekstfelt, `1` eller Esc | ingenting i økten | — |
| Smal økt | 768 px | panelet skjult, «Meny» i toppfeltet åpner det over kortet; Esc lukker bare panelet, fokus til «Meny» | — |
| Smal side | emne-, forelesnings- og kontosiden på 768 px og 640 px | sidemenyen bak «Meny», ingen vannrett rulling | — |

</intent-contract>

## Code Map

- `frontend/modules/practice/pages/flashcard-session-page.tsx` -- økten: `flipped`, `mark`, `step`, `finished`, `onEnd` (`router.push(lecturePath)`); her kobles tastene og `SideMenu`.
- `frontend/modules/practice/components/flashcard.tsx` -- «Snu kortet» (`flipRef`, fokus ved `focusOnMount`), «Kunne» (`knownRef`, fokus etter snuing); hint-linjen settes inn under knappene.
- `frontend/modules/practice/components/session-panel.tsx` -- `h1` med `titleId`; får valg for overskriftsnivå.
- `frontend/modules/subjects/components/subject-sidebar.tsx` -- `nav aria-label="Emner"`, brukt av `subject-page.tsx`, `lecture-page.tsx`, `account-page.tsx`.
- `frontend/modules/identity/components/require-login.tsx` -- rammen med `TopBar` og `main`; her kommer `SideMenuProvider` og `MenuButton`.
- `frontend/components/top-bar.tsx` -- får plass til menyknappen før logoen (brukes også uten innlogging).
- `frontend/components/dialog.tsx` -- felles dialog (`returnFocus`, uten `primaryAction` → «Lukk»).
- `frontend/components/ui/dialog.tsx` -- `inertOthers`, mønsteret for slør og `aria-modal`; gjenbrukes i `sheet`.
- `frontend/components/ui/table.tsx`, `components/icon.ts`, `lib/utils.ts` (`cn`).
- `frontend/lib/session.ts` -- mønster for lagring pakket i `try`.
- `frontend/app/globals.css` -- `--text-kbd`, `--radius-kbd`, `--color-scrim-veil`, `--spacing-sidebar-width`, `--spacing-topbar-height`.
- `frontend/e2e/flashcard-okt.spec.ts` -- hjelpere `lectureWithThreeCards`, `expectNoAxeViolations`, `tabTo`.
- Skisser `mockups/07-flashcard.svg` (hint-linjen y≈720–742) og `03-emne.svg` («? Hurtigtaster» nederst i menyen).

## Tasks & Acceptance

**Execution:**
- `frontend/components/ui/{sheet,switch,kbd}.tsx` -- shadcn, tilpasset tokenene, norske navn («Lukk»).
- `frontend/lib/practice-shortcuts.ts` + test -- ren tastefunksjon, hook, innstilling.
- `frontend/lib/use-narrow-screen.ts` + test -- `matchMedia`-hook, bred som standard.
- `frontend/components/side-menu.tsx` + test -- provider, `SideMenu`, `MenuButton`.
- `frontend/components/shortcuts-dialog.tsx` + test -- tabell og bryter.
- `frontend/components/top-bar.tsx`, `modules/identity/components/require-login.tsx` -- menyknapp og provider.
- `frontend/modules/subjects/components/subject-sidebar.tsx` -- `SideMenu`, «? Hurtigtaster».
- `frontend/modules/practice/components/{shortcut-hints,flashcard,session-panel}.tsx` + tester.
- `frontend/modules/practice/pages/flashcard-session-page.tsx` + test -- tastene, `SideMenu`, skjult `h1` på smal skjerm.
- `frontend/e2e/hurtigtaster-og-smal-skjerm.spec.ts` -- hel økt med Mellomrom/`1`/`2`, Esc, bryteren av og husket, `?` og Esc i dialog, axe med dialogen åpen; 768 px med panelet lukket og åpent (axe), Esc lukker bare panelet; epic 2-sidene på 768 og 640 px uten vannrett rulling og med axe.

**Acceptance Criteria:**
- Given en økt med tre kort, when studenten bruker bare Mellomrom, `1` og `2`, then kan hele økten gjøres ferdig, og et kort markert med `1` kommer igjen.
- Given hurtigtastdialogen åpnet fra «? Hurtigtaster» i sidemenyen, when den vises, then har den tastene og bryteren «Bruk hurtigtaster» på, og axe finner ingen brudd.
- Given 768 px, when økten eller en epic 2-side vises, then er sidemenyen eller panelet bak «Meny», `scrollWidth` er ikke større enn vinduet, og axe finner ingen brudd med panelet lukket og åpent.

## Spec Change Log

## Review Triage Log

### 2026-11-21 — Review pass
- verdicts: 33 findings — high 0, medium 4, low 19, false 10, maybe-false 0
- findings:
  - `[low]` `[patch]` Verifisering: at panelet lukkes når skjermen blir bred, er ikke testet — ny test i `side-menu.test.tsx` med styrbar `matchMedia`.
  - `[low]` `[patch]` Verifisering: reserven når lagringen ikke kan skrives, er ikke testet — ny test der `setItem`/`removeItem` kaster.
  - `[low]` `[patch]` Verifisering: oppdatering fra en annen fane (`storage`) er ikke testet — ny test med `StorageEvent`.
  - `[medium]` `[patch]` Verifisering (annet): `readShortcutsEnabled` ser bort fra reserven når lesing virker og skriving feiler, så bryteren hopper tilbake til på — reserven leses først.
  - `[low]` `[reject]` Intensjon: 200 % tekst er ikke testet i nettleseren — mediespørringen i `em` dekker tekststørrelsen, og 640 px dekker zoom på 1280 px; Playwright har ingen enkel innstilling for nettleserens tekststørrelse.
  - `[low]` `[reject]` Intensjon: to kolonner under hverandre er ikke sjekket — sjekkes i skjermbildene på 768 px; kolonnene bryter allerede (`flex-wrap`).
  - `[low]` `[reject]` Intensjon: kortet som krymper mellom 768 og 1279 px er ikke testet — finnes fra 3.3 (`w-full max-w-flashcard-width`), vises i skjermbildene.
  - `[low]` `[patch]` Intensjon: axe med hurtigtastdialogen åpen bare på bred skjerm — axe kjøres nå også med dialogen åpen på 768 px.
  - `[medium]` `[patch]` Intensjon: krav-ID-ene i testnavnene stemmer ikke med definisjonene i `epics.md` (UX-DR10/26/27/31/32 byttet om) — titlene er rettet.
  - `[false]` `[reject]` Intensjon: hint-linjens rekkefølge — storien krever ingen rekkefølge; skisse 07 viser 1, 2, Mellomrom, Esc.
  - `[low]` `[patch]` Intensjon: e2e sjekker ikke hvor fokus går etter `?` og Esc i økten — sjekken er lagt til.
  - `[false]` `[reject]` Intensjon: tekstfelt-regelen bare i enhetstester — økten har ikke noe tekstfelt ennå; regelen er testet i den felles funksjonen og på siden med et innsatt felt.
  - `[false]` `[reject]` Intensjon: forsiden har ingen «Meny» — forsiden har ingen sidemeny (EXPERIENCE.md «Navigasjon»).
  - `[medium]` `[patch]` Blind: reserven for lagring — samme som over.
  - `[low]` `[reject]` Blind: med bryteren av finnes ingen vei tilbake fra økten — bryteren nås fra «? Hurtigtaster» i sidemenyen på alle sider med sidemeny; en knapp i øktpanelet er en ny flate som ikke er i designet. Ført som valg i `beslutninger.md`.
  - `[low]` `[reject]` Blind: Mellomrom to ganger markerer «Kunne» — storien krever både at fokus går til «Kunne» etter snuing (UX-DR31) og at Mellomrom på en knapp gjør knappens handling (E25); det er ønsket oppførsel.
  - `[low]` `[reject]` Blind: kommentaren om `onScrimClick` og Radix sin lukking utenfor — utfallet (panelet lukkes ved klikk på sløret) er riktig og testet i e2e; ingen skade.
  - `[low]` `[reject]` Blind: `handingOver` kan bli hengende hvis arket fjernes samtidig som skjermen blir bred — krever at vinduet endrer bredde i samme øyeblikk som dialogen åpnes fra panelet.
  - `[low]` `[reject]` Blind: fokus går til `body` når skjermen blir bred med panelet åpent — sjeldent (endre vindusbredde med panelet åpent), og retting krever ny fokuslogikk.
  - `[false]` `[reject]` Blind: `[role="dialog"]` er for bred og for smal — appen har ingen ikke-modale dialoger og ingen `alertdialog` (bekreftelsene bruker samme Radix-dialog).
  - `[false]` `[reject]` Blind: blinking ved hydrering — `RequireLogin` tegner ingenting før `me` er hentet i nettleseren, så rammen monteres aldri under hydrering.
  - `[low]` `[reject]` Blind: dialogen sier ikke hvilke taster bryteren skrur av — ville kreve ny tekst som ikke er godkjent i EXPERIENCE.md.
  - `[false]` `[reject]` Blind: lukkekrysset er 24 × 24 px — `size-6` er 40 px med tokenene i dette repoet.
  - `[false]` `[reject]` Blind: ingen test på 320/375 px — mobil er utenfor MVP (EXPERIENCE.md, NFR-14 gjelder ned til 768 px).
  - `[low]` `[reject]` Blind: flere manglende tester (`focusContentFirst` direkte på `Dialog`, `handingOver`, Esc på smal skjerm som enhetstest) — `focusContentFirst` er dekket av dialogtesten for hurtigtaster, Esc på smal skjerm av e2e; fanetesten og breddetesten er lagt til over.
  - `[low]` `[patch]` Blind: `KbdGroup` og `SheetClose` brukes ikke — fjernet.
  - `[false]` `[reject]` Blind: KI-sporet mangler — føres i senere steg i samme branch (story-prompten punkt 5 og 6).
  - `[medium]` `[patch]` Kant: reserven for lagring — samme som over.
  - `[false]` `[reject]` Kant: `MediaQueryList.addEventListener` mangler i Safari < 14 — NFR-15 krever siste Chrome, Safari og Edge.
  - `[low]` `[reject]` Kant: Mellomrom etter snuing markerer «Kunne» — samme som Blind over; ønsket oppførsel.
  - `[false]` `[reject]` Kant: to `SideMenu` samtidig gir to ark — ingen side monterer mer enn én.
  - `[low]` `[reject]` Verifisering/Blind: samme fanefunn telt hos Blind — dekket av testen over.
  - `[low]` `[reject]` Blind: breddefunnet telt hos Blind — dekket av testen over.

## Design Notes

- **Hvorfor én ramme for sidemeny og øktpanel:** menyknappen står i toppfeltet (i `RequireLogin`), mens menyen tegnes av siden. En liten kontekst lar siden si «jeg har en sidemeny» og toppfeltet vise knappen, uten at hver side må kjenne toppfeltet. Samme knapp brukes for sidemenyen og øktpanelet, slik storien krever.
- **Hvorfor `em` i mediespørringen:** 48em er 768 px med vanlig tekst, men blir bredere når nettleserens tekststørrelse er satt opp. Da gir både smalt vindu og 200 % tekst smal visning (NFR-14).
- **Hvorfor Esc virker med bryteren av:** EXPERIENCE.md regner tall, bokstaver, Mellomrom og `?` som enkelttaster; WCAG 2.1.4 gjelder bare tegntaster. Esc er tasten for å komme ut og avsluttes ikke ved et uhell mens man skriver.
- **Valg tatt selv (kanttilfeller):** knappenavnet «Meny»; Esc virker med bryteren av; `?` er en enkelttast og virker ikke med bryteren av (bryteren kan alltid nås fra sidemenyen); `1` virker bare etter snuing; dialogen viser bare tastene for det som er bygd; klikk på sløret lukker panelet (ikke dialogene).

## Verification

**Commands:**
- `cd backend && uv run pytest` -- grønne
- `cd frontend && npm run test && npx tsc --noEmit` -- grønne
- `docker compose up --build -d && cd frontend && npx playwright test` -- grønne

## Auto Run Result

**Sammendrag:** Story 3.4 er bygd. Flashcard-økten har hurtigtastene Mellomrom (snu), `1` (Kunne ikke) og `2` (Kunne), begge bare etter snuing, Esc (som «Avslutt økt») og `?` (hurtigtastdialogen). Tastene styres av én felles funksjon i `frontend/lib/practice-shortcuts.ts`, som bare økten bruker. Under kortknappene står hint-linjen. Hurtigtastdialogen har tastetabellen og bryteren «Bruk hurtigtaster». Bryteren er på som standard, lagres i `localStorage`, og når den er av, virker ingen enkelttaster og hint-linjen er skjult. På smal skjerm (≤ 768 px eller 200 % tekst) ligger sidemenyen og øktpanelet bak menyknappen «Meny» i toppfeltet og åpnes over innholdet. Sidemenyen har «? Hurtigtaster» nederst.

**Filer:**
- `frontend/components/ui/{sheet,switch,kbd}.tsx`: shadcn, tilpasset tokenene.
- `frontend/lib/practice-shortcuts.ts` (+ test): tasteregelen, hooken og bryteren.
- `frontend/lib/use-narrow-screen.ts` (+ test): avgjør om skjermen er smal (`48em`).
- `frontend/components/side-menu.tsx` (+ test): rammen for sidemenyen, menyknappen og den ene hurtigtastdialogen.
- `frontend/components/shortcuts-dialog.tsx` (+ test): tabellen og bryteren.
- `frontend/components/dialog.tsx`: `focusContentFirst`, så fokus starter på bryteren.
- `frontend/components/top-bar.tsx`, `frontend/modules/identity/components/require-login.tsx`: plass til menyknappen og rammen.
- `frontend/modules/subjects/components/subject-sidebar.tsx`: `SideMenu` og «? Hurtigtaster».
- `frontend/modules/practice/components/{shortcut-hints,flashcard,session-panel}.tsx` (+ tester): hint-linjen og overskriftsnivået.
- `frontend/modules/practice/pages/flashcard-session-page.tsx` (+ test): tastene, panelet bak «Meny» og en skjult `h1` på smal skjerm.
- `frontend/e2e/hurtigtaster-og-smal-skjerm.spec.ts`: e2e med axe på 768 og 640 px.

**Gjennomgang:** 33 funn. 9 rader ble rettet, og det tilsvarer 6 rettinger, fordi samme funn kom fra flere gjennomgangslag:
- Medium:
  - Bryteren hoppet tilbake til «på» når lagringen kunne leses, men ikke skrives. Tre lag fant dette.
  - Krav-ID-ene i testnavnene stemte ikke med `epics.md`.
- Low:
  - Tre manglende tester: lagring, en annen fane og bred skjerm.
  - Axe kjøres nå med dialogen åpen på 768 px.
  - E2E sjekker nå hvor fokus går etter `?` og Esc.
  - Ubrukt kode er fjernet.

Ingenting ble utsatt. 14 funn ble avvist med begrunnelse, og 10 var falske. Se loggen over.

**Oppfølging anbefalt:** nei. Rettet etter alvorlighet: medium 2, low 4. Begge medium-rettelsene er dekket av nye eller omdøpte tester, og jeg kan ikke peke på noen risiko som ikke er sjekket.

**Verifisering:**
- `npm run test`: 605 bestått.
- `npx tsc --noEmit`: rent.
- `uv run pytest`: 391 bestått (ingen endring i backend).
- `npx playwright test`: 103 bestått mot `docker compose up --build`.

**Gjenstående risiko:**
- 200 % tekst er ikke testet direkte i nettleseren. Mediespørringen i `em` og testene på 640 px skal dekke det.
- Firefox og Safari er ikke testet. Det gjelder særlig at fokus flyttes til «Kunne» mens Mellomrom fortsatt er trykket ned.
- På lange sider står «? Hurtigtaster» nederst i sidemenyen og kan havne under skjermkanten.
