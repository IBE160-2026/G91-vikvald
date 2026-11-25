# Brukerreiser etter epic 8

## 2026-11-26 kl. 00:55 — Silje Krokdal Vikvald

### Oppgave
Den autonome kjøringen ba om å utvide brukerreisetestene med fritekst etter epic 8 (steg 5–7 i flyt 2) og å finne årsaken til at brukerreisetestene feilet av og til i fulle kjøringer (#343).

### Plan
- Les styringsdokumentene, lag branchen `brukerreiser/epic-8` fra `main`.
- Legg steg 5–7 i flyt 2 inn i Playwright-testen, med axe og krav-ID-er i testnavnene.
- Undersøk #343: belastningskjøring, gjennomgang av appens henting av oversikten og ventingen i testene.
- Oppdater `docs/testing/brukerreiser.md` og KI-sporet, kjør alle testene, lag PR og flett.

### Resultat
- Flyt 2 steg 5–7 testes nå i nettleseren: fritekstspørsmål for hele emnet fra emnesiden, «Vis modellsvar», modellsvaret med kilde under hennes eget svar, `2` for «Delvis riktig» med ◐ i rutenettet, resultatet Riktig 3, Delvis riktig 1, Feil 1, lagret for hele emnet uten hennes svar, og SISTE ØKT (`f390e87`). Fritekstspørsmålene lages fra «Uke 36: Segmentering» og «Uke 38: Prising»; spørsmålet om margin har formelmerket. Steg 3 forventer nå raden «Fritekstspørsmål». Flyt 1, 3 og 4 nevner ikke fritekst (flyt 4 sjekket allerede at fritekstspørsmål slettes med kontoen).
- #343, flyt 2 steg 4: testen holdt `Math.random` fast i fem sekunder med en tidtaker. Når maskinen var travel, var kortene ikke lastet innen da, og rekkefølgen ble tilfeldig. Nå settes den tilbake når økten viser første kort (`05ccaad`).
- #343, flyt 1 steg 8: lot seg ikke gjenskape (to fulle kjøringer, 205 bestått hver, og en belastningskjøring). Appen henter oversikten på nytt hver gang siden vises. Maskinen brukte 7 GB vekselfil, så den sannsynlige årsaken er at svaret kom for sent under last. Flyt 1 steg 8 og flyt 2 steg 2, 3 og 7 venter nå på svaret fra `GET /api/overview` og sjekker at det sier «øvd» (`20e7af5`). Appen er ikke endret.
- Oversikten (`785ff7f`) og KI-sporet (`1e8ea55`) er oppdatert.
- Tester: `uv run pytest` 931 bestått; `npm run test` 1050 bestått (77 filer); `npx playwright test` 205 bestått, 4 hoppet over (seed), med appen startet med `docker compose up -d` uten bygg (appkoden er ikke endret). Appen er stoppet med `docker compose down`.
- `docker builder prune` ble nektet av tillatelsene, så byggebufferen (2,9 GB) står igjen.

### Åpne punkter
- Brukerreisetestene utvides med sammendrag (epic 9, steg 11 i flyt 1) når det er bygd.
- Følg med på om flyt 1 steg 8 feiler igjen; årsaken er sannsynlig, men ikke bevist (#343).
