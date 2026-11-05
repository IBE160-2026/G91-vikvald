---
title: "Test av PDF-lesing og Gemini på norsk"
created: 2026-11-05
---

# Test av PDF-lesing og Gemini på norsk

Testet 2026-11-05 med `pdf_tall.py` og `generer_kort.py`. Kall gikk til EU-endepunktet `eu` på Vertex AI, med mellomlagring slått av. PDF-ene ligger ikke i repoet.

**Kilder:** *Principles of Marketing* og *Principles of Economics 3e* fra OpenStax, begge CC BY-NC-SA 4.0. Kortene under er bearbeidet fra disse bøkene og deles under samme lisens. Sidetall er PDF-sider.

**Begrensning:** Dette er én kjøring per oppsett på 2–3 sider. Resultatene viser retning, men er ikke en stikkprøve av kvaliteten. Vurderingene av språk og fag er foreløpige og må sjekkes av meg.

## Tekstuttrekk

| | Markedsføring | Økonomi |
|---|---|---|
| Sider | 707 | 995 |
| Tegn per side, median | 2948 | 3085 |
| Sider under 200 tegn | 16 (2,3 %) | 26 (2,6 %) |
| Sider med bilder | 216 | 317 |
| Erstatningstegn | 0 | 0 |

**Hovedfunn:** Disse tallene skjuler at formler forsvinner. På side 127 og 128 i økonomiboka er formlene tegnet som vektorgrafikk, så de mangler helt i tekstuttrekket. Teksten går for eksempel rett fra «the elasticity of demand between these two points is» til «which is 0.45». Ingen av sidene har matematikkfont, og det kommer ingen feilmelding. Hvor mange sider som rammes i hele boka, er ikke målt.

## Formler: bare tekst mot bilde av siden

Økonomiboka, side 127–128, med `gemini-3.5-flash`:

| | Bare tekst | Bilde av siden |
|---|---|---|
| Formler for midtpunktsmetoden | Mangler | Riktig gjengitt |
| Meldte fra om det som manglet | Ja, begge stedene | Ingenting manglet |
| Fant på formler | Nei | Nei |
| Tokens totalt | 4678 | 5607 |

Tekstkjøringen hadde én faglig feil: Ett kort utelot «prosentvise» foran «endringen i etterspurt mengde».

Formlene fra bildekjøringen ble sammenlignet med siden og stemmer:

- `% endring i mengde = ((Q2 - Q1) / ((Q2 + Q1) / 2)) * 100`
- `% endring i pris = ((P2 - P1) / ((P2 + P1) / 2)) * 100`

## Norsk kvalitet

Markedsføringsboka, side 170–172, bare tekst. Alle kort hadde gyldig sidetall.

| Modell | Sekunder | Tokens totalt | Foreløpig vurdering |
|---|---|---|---|
| `gemini-3.5-flash` | 17,3 | 4652 | Ryddig norsk, og konkrete kort |
| `gemini-3.8-flash` | 67,9 | 2893 | Godt strukturert, men noen fornorskede lånord («ruralt», «lokasjon») |
| `gemini-3.5-flash-lite` | 5,0 | 2819 | Raskest, men skrivefeil («jobtype»), og meldte om manglende formler i et stoff uten formler |

Tiden er fra én kjøring og kan variere.

## Huskeregler

Markedsføringsboka, side 170–172 og 32–35, med `gemini-3.5-flash`. Fem huskeregler ble laget.

| Tema | Huskeregel | Foreløpig vurdering |
|---|---|---|
| Fordeler med segmentering | Friske Poteter Modnes | Bokstavene stemmer, men setningen er tilfeldig |
| Fire typer segmentering | Gamle Damer Aker Påskeski | Bokstavene stemmer, og bildet er lett å huske |
| Geografiske parametere | Bare Kule Katter Spiser Bananer | Bokstavene stemmer, men to K-er og to B-er kan forveksles |
| Nytteverdier | Flinke Turister Spiser Epler | Bokstavene stemmer |
| De fire P-ene | PPPP | Gir ingen hjelp |

- **Bokstaver:** De fire setningene stemmer med forbokstavene. Dette kan også sjekkes automatisk i appen.
- **Avslag:** Modellen laget ingen huskeregel for en lang liste med demografiske faktorer, og meldte fra i stedet.
- **Fagbegreper:** Modellen brukte «Promotering» om den fjerde P-en. Så vidt jeg vet er «Påvirkning» vanlig på norsk, men det må jeg sjekke. Dette kan være et svakt punkt når kilden er engelsk.

## Quiz

Markedsføringsboka, side 170–172, med `gemini-3.5-flash`. Modellen laget 9 spørsmål, 3 på hvert nivå, med 4 alternativer hver.

- **Sidetall:** Stikkprøver av fire eksempler sto på oppgitt side.
- **Nivåer:** De vanskelige spørsmålene bruker stoffet på nye situasjoner og skiller seg merkbart fra de lette. Noen middels spørsmål er bare gjengivelse.
- **Feilsvar:** Flere er ikke troverdige, for eksempel at en bilprodusent bør slutte å selge biler.
- **Lengde:** Det riktige svaret var det lengste alternativet i 7 av 9 spørsmål, selv om instruksen ba om like lange svar. Dette kan avsløre svaret.
- **Tid og tokens:** 52,7 sekunder og 11 689 tokens, hvorav 7 112 til modellens tenking.

## Konsekvenser for PRD og arkitektur

- Generering kan ta opptil ett minutt, så appen må vise fremdrift og ikke låse skjermen.
- Appen bør sjekke modellens svar i kode: forbokstaver i huskeregler, antall alternativer, gyldig indeks, gyldig side og lengden på alternativene.
- Brukeren må kunne rette eller slette innhold, også når begrepene er feil oversatt.
- Instruksene må forbedres, særlig for feilsvar i quizen. Mengden tenking bør også testes opp mot kvalitet, tid og kostnad.

## Beslutning og anbefaling

- **PDF-lesing (bestemt 2026-11-05):** MVP-en bruker teksten som standard, og sender bilde av siden når siden ser ut til å ha formler som ikke er med i teksten, for eksempel mange vektortegninger. Reglene for å oppdage slike sider er ikke testet.
- **Modell (foreløpig anbefaling):** Bruk `gemini-3.5-flash` videre, og vurder valget når stikkprøven er gjort.
- **Huskeregler og quiz (foreløpig anbefaling):** Behold begge i planen. Quizen er må ha, og huskeregler er først i bør ha. Begge er gode nok til å bygge videre på, men krever bedre instrukser og sjekker i kode.
