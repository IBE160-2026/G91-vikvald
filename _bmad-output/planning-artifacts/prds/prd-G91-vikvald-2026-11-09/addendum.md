---
title: "Addendum: PRD for Studiekamerat"
created: 2026-11-09
updated: 2026-11-09
---

# Addendum: PRD for Studiekamerat

Tekniske detaljer fra researchen og PRD-arbeidet som ikke hører hjemme i PRD-en, men som arkitekturen skal ta stilling til. Ingenting her er endelig besluttet før det står i arkitekturdokumentet.

## Foreslått teknologistakk

Foreslått av KI 2026-11-05 og godtatt, se [beslutninger](../../../../docs/ki-prosess/beslutninger.md): Next.js med TypeScript, Auth.js, SQLite via Prisma, Vitest og Playwright. Begrunnes nærmere i arkitekturen, særlig opp mot sensorveiledningens krav om at teknologien ikke skal være mer kompleks enn appen trenger.

## Språkmodell

- **Leverandør og endepunkt:** Gemini på Vertex AI med det multiregionale endepunktet `eu`. Ikke det globale endepunktet. I testen 2026-11-05 hadde `europe-west3` bare `gemini-3.5-flash`, og `europe-west4` hadde ingen av de testede modellene.
- **Modell:** `gemini-3.5-flash` er foreløpig anbefalt. Endelig valg etter kvalitetstesten (issue #3, #4). Modellnavnet bør kunne endres i `.env` uten kodeendring, fordi modeller kan bli fjernet (i testen ga `gemini-2.5-flash` feilen 404).
- **Mellomlagring:** Slått av for prosjektet (`disableCache: true`).
- **Innlogging mot Google:** Lokalt brukes `gcloud` uten nøkkelfil (Application Default Credentials). Må passe sammen med NFR-4 og `.env.example`.
- **Tenking:** Modellens tenking (resonneringen før den svarer) sto for 7 112 av 11 689 tokens i quiztesten. Mengden tenking må testes opp mot kvalitet, ventetid (NFR-17) og kostnad.
- **Prisdato:** Prisen på Gemini 3.8 Flash, ikke den foreløpig anbefalte 3.5 Flash, dobles 2027-01-01. Vilkår og priser bør sjekkes på nytt innen 2027-01-28 hvis appen brukes videre.

## Byttbar leverandør og mock-modell

- En modul velger leverandør ut fra én innstilling, for eksempel `LLM_PROVIDER=mock|vertex` (NFR-4).
- Alle leverandører, også mock-modellen, svarer i samme strukturerte format, og svaret kontrolleres mot samme skjema (FR-38).
- Mock-modellen lager innhold ut fra teksten i den opplastede filen og bruker sidetall som finnes i filen (NFR-2). Den bør også kunne gi ugyldige svar med vilje, slik at kontrollen kan testes (SK-4).
- Det samme eksempelinnholdet brukes i demomodus, i testene og i README.

## Kontroll av generert innhold

Kontroller som skal gjøres i kode, ikke av språkmodellen: gyldig PDF-side, nøyaktig fire alternativer, gyldig indeks for riktig svar, påkrevde felt, forbokstaver i huskeregler (FR-45), og eventuelt lengden på alternativene (FR-31).

## PDF og formler

- Tekst leses per PDF-side, og sidetallet er PDF-filens sidenummer (FR-39).
- Regelen for når en side sendes som bilde (FR-40), for eksempel når siden har mange vektortegninger og lite tekst, bygges og testes på *Principles of Economics 3e*, PDF-side 127–128. Bildet kostet omtrent 20 % flere tokens i testen.

## Instrukser til språkmodellen

Testen 2026-11-05 viste at instruksene må forbedres for å gi troverdige feilalternativer og like lange alternativer i quizen (FR-31), og at norske fagbegreper fra notatene må brukes slik de står (FR-2).

## Publisering senere

Ikke med i MVP. Hvis appen publiseres senere, må serveren kjøre i EU. På Vercel må det sjekkes om EU-region er tilgjengelig på gratisplanen.
