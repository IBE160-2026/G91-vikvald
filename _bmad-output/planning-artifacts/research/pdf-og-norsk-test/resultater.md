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

## Beslutning og anbefaling

- **PDF-lesing (bestemt 2026-11-05):** MVP-en bruker teksten som standard, og sender bilde av siden når siden ser ut til å ha formler som ikke er med i teksten, for eksempel mange vektortegninger. Reglene for å oppdage slike sider er ikke testet.
- **Modell (foreløpig anbefaling):** Bruk `gemini-3.5-flash` videre, og vurder valget når stikkprøven er gjort.
