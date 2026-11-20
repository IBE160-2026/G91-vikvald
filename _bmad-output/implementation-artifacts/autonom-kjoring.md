# Instruks for den autonome kjøringen

Denne fila styrer kjøringen som startes med `/goal`. Hovedøkten er **orkestrator**: den skriver ingen kode selv, men starter én subagent per story i rekkefølge og holder oversikten. Avgjørelsene bak kjøringen står i `docs/ki-prosess/beslutninger.md` (2026-11-20).

## Avgjørelser som gjelder for hele kjøringen

1. **Ingen godkjenning per endring.** Silje går gjennom hver epic når den er ferdig, og kjøringen venter på godkjenningen etter epic 1 (se «Siljes gjennomgang»). Hver PR forklarer derfor endringen på vanlig norsk, slik at hun kan begrunne den.
2. **Subagenten fletter sin egen PR** når testene er grønne.
3. **Kanttilfeller som ikke er avgjort** (#18, #32): velg den enkleste trygge løsningen, før valget i `docs/ki-prosess/beslutninger.md` og lag et GitHub-issue med etiketten `kanttilfelle` som Silje kan se over.
4. **Kuttrekkefølge** hvis tiden blir knapp: først story 1.2, 5.2, 5.5 og 6.3, deretter epic 9, 8 og 7 (bakfra). Se «Kuttregler» under.
5. **Story 6.4** bygges med tydelig merkede plassholdernotater («PLASSHOLDER – skrives av Silje»), og issue #13 står åpent. Ingen KI-tekst skal se ut som Siljes egne notater. **Modell:** `gemini-3.5-flash` brukes til Silje har valgt modell (#4).
6. **Node 22.** Story 1.1 legger inn `"engines": { "node": "22.x" }` i `package.json` og en `.nvmrc` med `22`, i tråd med `node:22-alpine` i Docker.

## Orkestratorens løkke

Gjenta til stoppbetingelsen er nådd:

1. `git switch main && git pull --ff-only`. Arbeidstreet skal være rent. Sjekk at Docker kjører (`docker info`). Gjør den ikke det, stopp med beskjeden «Start Docker Desktop». Følg så «Siljes gjennomgang»: rett åpne issues med `funn-fra-silje` først, og stopp hvis epic 1 venter på godkjenning.
2. Les `_bmad-output/implementation-artifacts/sprint-status.yaml` og velg **første story** i fila med status `backlog`, `ready-for-dev` eller `in-progress` som ikke er kuttet etter kuttreglene.
3. Start **én** subagent (`general-purpose`, i forgrunnen, aldri i bakgrunnen) med story-prompten under, med story-nøkkelen satt inn.
4. Les rapporten. Sjekk selv at PR-en er flettet (`gh pr view <nr> --json state`) og at storien har status `done` på `main`.
5. **Hvis storien ikke ble ferdig:** start én ny subagent for samme story med rapporten fra forrige forsøk som ekstra kontekst. Feiler den også, gjelder stoppregelen.
6. **Kjør testene på `main`** etter flettingen: `uv run pytest` i `backend/` og `npm run test` i `frontend/` (når de finnes). Er noe rødt, gjelder stoppregelen.
7. Skriv én linje i samtalen: `Story <nøkkel>: done, PR #<nr>, tester: <kommandoer og resultat>`. Det er dette `/goal` leser.
8. **Når en epic er ferdig:** start én subagent som utvider brukerreisetestene (se «Brukerreiser»), og lag deretter gjennomgangsissuet (se «Siljes gjennomgang»).

Retrospektivene (`epic-N-retrospective: optional`) hoppes over.

## Story-prompten (sendes til subagenten)

> Du bygger story `<nøkkel>` i Studiekamerat, repoet i `/Users/Silje/Prosjekter/G91-vikvald`. Les `CLAUDE.md` og `_bmad-output/implementation-artifacts/autonom-kjoring.md` først. De gjelder foran alt annet.
>
> 1. `git switch main && git pull --ff-only`, deretter `git switch -c story/<epic>-<story>` (for eksempel `story/1-1`).
> 2. Bruk skillen `bmad-build-auto` med denne hensikten: «Story <N.M> fra `_bmad-output/planning-artifacts/epics.md`: <tittel>». Følg den helt ut. Den lager spesifikasjonen, koder, kjører gjennomgang og committer.
> 3. Kjør alle testene: `uv run pytest` i backend, `npm run test` i frontend, og `npx playwright test` mot appen startet med `docker compose up --build`. Playwright kjøres i hver story fra 1.1, også når storien ikke har lagt til egne Playwright-tester. Alt skal være grønt. Rett og kjør på nytt hvis noe feiler.
> 3b. **Skjermbilder** (bare når storien endrer det brukeren ser): ta skjermbilder med Playwright av hver side storien endrer, i 1280 og 768 piksler bredde, med demodata og testbrukeren. Lagre dem i `docs/skjermbilder/story-<N>-<M>/` med beskrivende navn. Sammenlign dem med `DESIGN.md` og skissene i `_bmad-output/planning-artifacts/ux-designs/`, og rett det som avviker. Avvik du ikke retter, skrives i PR-en. Skjermbildene skal aldri vise andre data enn demodata.
> 4. Sett storien til `done` i `sprint-status.yaml` (og epicen til `in-progress`, eller `done` når siste story er ferdig).
> 5. Oppdater KI-sporet i `docs/ki-prosess/`:
>    - `beslutninger.md`: hvert kanttilfelle eller valg du tok selv, med begrunnelse og commit.
>    - `korrigeringer.md`: funn fra gjennomgangen som ble rettet, og feil KI gjorde underveis.
>    - `prompts.md`: én kort oppføring om at storien ble bygd av den autonome kjøringen med denne story-prompten. Siter aldri noe annet.
> 6. Skriv sesjonsloggen med skillen `sesjonslogg` i `.logs/silje-krokdal-vikvald/` (fila skal ligge i branchen).
> 7. Lag et issue med etiketten `kanttilfelle` for hvert kanttilfelle du avgjorde selv.
> 8. `git push -u origin <branch>`, og lag PR-en med `gh pr create`. Tittelen er `Story <N.M>: <tittel>`, og beskrivelsen er på vanlig norsk: hva som er bygd, hvordan det er testet, valg du tok selv, skjermbildene vist i beskrivelsen (lenket fra `docs/skjermbilder/`) med eventuelle avvik fra designet, lenker til storien i `epics.md` og til issuene (`Closes #<nr>` bare når issuet faktisk løses).
> 9. Vent på CI hvis den finnes (`gh pr checks <nr> --watch`). Flett med `gh pr merge <nr> --merge --delete-branch` når alt er grønt.
> 10. Rapporter: story, PR-nummer, testkommandoer med resultat, issues som ble laget, og om noe er uferdig.
>
> Regler: små commits med beskrivende norske meldinger. Ikke rør `CLAUDE.md`, `.claude/settings.json`, `.git/hooks/` eller planleggingsdokumentene (PRD, arkitektur, UX, `epics.md`). Ingen hemmeligheter, personopplysninger eller hele KI-økter i repoet. Automatiske tester kaller aldri Gemini (`LLM_PROVIDER=mock`). Bruk aldri `--no-verify`. Git-hookene på maskinen avviser commit og push rett til `main`, og blir du stoppet av dem, er det en feil i arbeidsflyten din, ikke i hooken. Får du ikke storien ferdig, flett ingenting, og rapporter hvorfor.

## Kuttregler

Kjøringen bygger alt i rekkefølge så lenge tiden holder. Orkestratoren sjekker datoen før hver story:

«Ferdig» betyr her at alle stories i epicene som ikke er kuttet, er `done`. En kuttet story hindrer altså ikke at epicen regnes som ferdig.

- **Fra 2026-11-27**, hvis epic 1–4 ikke er ferdige: hopp over 1.2, 5.2, 5.5 og 6.3.
- **Fra 2026-12-01**, hvis epic 1–6 ikke er ferdige: hopp over epic 9.
- **Fra 2026-12-03**, hvis epic 1–6 ikke er ferdige: hopp i tillegg over epic 8.
- **Fra 2026-12-05** startes ingen nye stories. Det som gjenstår av epic 7, kuttes.

Kuttene gjelder bare stories som ikke er påbegynt. Kuttbare akseptkriterier inne i andre stories bygges alltid. Det siste trinnet i PRD-ens kuttrekkefølge (Safari og automatisk test av universell utforming på bare tre sider) gjør ikke kjøringen. Det avgjør Silje.

En story som hoppes over, blir stående som `backlog`. Orkestratoren fører kuttet i `beslutninger.md` og lager et issue med etiketten `kuttet`, på en egen branch med PR som flettes.

## Brukerreiser

De fire flytene i `EXPERIENCE.md` (avsnittet «Brukerreiser (Key Flows)») skal testes fra start til slutt med Playwright:

| Flyt | Innhold | Trenger epic |
|---|---|---|
| 1 | UJ-1: Klara etter en forelesning | 1–4, sammendrag i 9 |
| 2 | UJ-2: Klara før eksamen | 3–5, huskeregler i 7, fritekst i 8 |
| 3 | Klara rydder i filene | 2 |
| 4 | Klara avslutter etter semesteret | 2 |

- Én testfil per flyt i Playwright-mappa til frontenden, for eksempel `e2e/brukerreiser/flyt-1-etter-forelesning.spec.ts`. Testen går gjennom stegene i nettleseren i demomodus mot `docker compose up --build`, og kjører axe på hver side den besøker.
- Når en epic er ferdig, utvider en subagent flyttestene med stegene som nå er bygd. Den lager egen branch og PR som lenker til flytene i `EXPERIENCE.md`, kjører alle testene og fletter når alt er grønt. Den følger de samme reglene som story-prompten.
- `docs/testing/brukerreiser.md` har én tabell per flyt: steg, testen som dekker det, og status (`testet`, `ikke bygd ennå` eller `kuttet` med issue-nummer). Stegene hentes fra `EXPERIENCE.md`.
- Steg som hører til en kuttet funksjon, tas ikke med i testen. De står som `kuttet` i oversikten, og kjøringen stopper ikke av den grunn.
- En flyttest som feiler, er en feil i appen. Den rettes i appen, ikke ved å svekke testen.

## Siljes gjennomgang

KI går gjennom KI-ens kode i hver story. Det siste ordet er Siljes, og gjennomgangen hennes skal synes i sporet.

**Når en epic er ferdig**, lager orkestratoren et issue med etiketten `gjennomgang`: «Gjennomgang av epic N». Det inneholder lenker til PR-ene og skjermbildene og denne sjekklista:

- [ ] Gjør appen det storiene sier? Start den med `docker compose up` og prøv.
- [ ] Ser sidene ut som designet? Se skjermbildene i PR-ene.
- [ ] Er valgene KI tok selv (issuene med `kanttilfelle`), greie?
- [ ] Forstår jeg hva hver PR gjør, godt nok til å forklare det i rapporten?
- [ ] Er KI-sporet riktig (`beslutninger.md`, `korrigeringer.md`)?

Silje skriver funnene som kommentarer i issuet og lukker det når epicen er godkjent.

**Etter epic 1 stopper kjøringen** og venter på godkjenning, fordi feil i grunnmuren sprer seg til alt annet. Orkestratoren starter ikke epic 2 før issuet «Gjennomgang av epic 1» er lukket. Er det åpent, stopper den igjen. For de andre epicene fortsetter kjøringen uten å vente.

**Funn fra Silje:** Før hver ny story sjekker orkestratoren om det finnes åpne issues med etiketten `funn-fra-silje`. Slike issues rettes først, hvert på egen branch med PR som lenker til issuet. Funnet føres i `korrigeringer.md` med Silje som den som oppdaget det.

## Stoppregler

Kjøringen stopper og melder fra i samtalen, uten å gjette videre, når:

- samme story feiler to ganger på rad (se løkken, punkt 5)
- testene på `main` er røde etter en fletting
- en handling som trengs, er sperret av `.claude/settings.json`
- epic 1 er ferdig og issuet «Gjennomgang av epic 1» er ikke lukket (se «Siljes gjennomgang»)
- en avgjørelse bare Silje kan ta, mangler (for eksempel ekte innhold i eksempelnotatene, faglig vurdering eller modellvalg)

Ved stopp: skriv hvilken story, hva som feilet og hva som trengs, og lag et issue med etiketten `blokkert`. Stoppet etter epic 1 er planlagt og får ikke `blokkert`. Der holder det å vise til gjennomgangsissuet.

Kjøringen startes igjen med den samme `/goal`-linja. Den fortsetter fra første story som ikke er `done`.

## Slutten av kjøringen

Når alle stories er `done` eller kuttet etter reglene: kjør
`uv run .claude/skills/bmad-sprint-planning/scripts/sprint_plan.py status --status-file _bmad-output/implementation-artifacts/sprint-status.yaml`
og testene på `main`, og vis resultatet i samtalen. Kjør også `npx playwright test e2e/brukerreiser` mot `docker compose up --build`, og vis resultatet og tabellene fra `docs/testing/brukerreiser.md`. Skriv under utskriften hvilke stories som er kuttet, med issue-nummer.

Skriptet vil vise `"all_done": false`, fordi det teller de valgfrie retrospektivene og de kuttede storiene (`backlog`) som uferdige. Det er ventet. Kjøringen er ferdig når ingen story har status `in-progress` eller `review`, og de eneste storiene med `backlog` er de som er kuttet etter reglene. Ikke følg skriptets anbefaling om å kjøre retrospektiver eller bygge kuttede stories.

## Betingelsen til `/goal`

```
/goal Følg _bmad-output/implementation-artifacts/autonom-kjoring.md. Målet er nådd når ingen story i sprint-status.yaml har status in-progress eller review, de eneste storiene med backlog er kuttet etter kuttreglene og har et issue med etiketten kuttet, hver ferdig story er flettet via en PR, alle fire brukerreisene (flyt 1–4 i EXPERIENCE.md) har Playwright-tester som går grønt mot docker compose up, docs/testing/brukerreiser.md viser hvert steg som testet eller som kuttet med issue, og siste melding viser utskriften fra sprint_plan.py status, brukerreisetestene og at testene på main er grønne. "all_done": false er ventet og betyr ikke at målet er uoppfylt. Målet er umulig hvis en stoppregel i instruksen er utløst.
```
