# Brief: tre hybrider av Semesterlinjen og sidemenyen

Silje har vurdert ti konsepter. Hun likte best:

- **08 Semesterlinjen:** oversiktlig; linjen viser hvor lenge det er igjen til eksamen og hvor mange forelesninger som har vært; rolige farger, men farge på emnelinjene; føles premium og oversiktlig.
- **09 Tastaturet først:** sidemenyen (treet med emner og forelesninger) på hver side.
- **06 Nordisk ro:** likt, men uklart hva (farger, luft, øving uten meny eller skrift).

Du lager ÉN av tre hybrider. Hybridene skiller seg bare på punktene i oppdraget ditt, slik at Silje kan peke på det hun vil ha. Alt annet holdes likt: Semesterlinjen er grunnlaget.

## Les først

- Den felles briefen med innhold og krav: `.working/brief-konsepter.md` (alle krav til innhold, universell utforming, teknikk og SVG-format gjelder, unntatt listen over sider og leveransen).
- Semesterlinjen: `.working/konsept-08-tidslinje/konsept.md` og SVG-ene der. Generatorskriptet ligger i `/private/tmp/claude-502/-Users-Silje-Desktop-G91-vikvald/c9e86afd-a37b-4a8e-854e-b78c11e28a0b/scratchpad/gen08.py` og kan gjenbrukes (kopier det; ikke endre originalen).
- Sidemenyen i Tastaturet først: `.working/konsept-09-tastatur/02-emner.svg`, `04-forelesning.svg`, `07-flashcard.svg` og `konsept.md`. Ta med strukturen (tre med emner → forelesninger, valgt rad, tellere), ikke den mørke kodeeditor-stilen med mindre oppdraget ber om det. Ingen kommandopalett.
- Nordisk ro (bare hvis oppdraget ber om det): `.working/konsept-06-nordisk-ro/konsept.md` og SVG-ene.

Alle stier er relative til `/Users/Silje/Desktop/G91-vikvald/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/`.

## Sider (samme filnavn, innhold og lerret 1440×900 som i brief-konsepter.md)

`02-emner.svg`, `03-emne.svg`, `04-forelesning.svg`, `07-flashcard.svg`, `09-quiz.svg`.

Sidemenyen skal finnes på alle sider (unntatt der oppdraget sier noe annet om øving). Semesterlinjen med «I dag» og «Eksamen om X uker» og antall forelesninger som har vært, skal være tydelig på 02 og 03. Dagens dato i skissene: 10. november 2026, eksamen i Markedsføring 4. desember 2026.

## Leveranse

Mappen du får oppgitt: de 5 SVG-ene og `konsept.md` (navn «Hybrid A/B/C: …», hva som er hentet fra hvilket konsept, palett med hex og kontrast, typografi, sidemeny-oppførsel, styrker og svakheter). Valider XML og se på hver side i headless Chrome; rett overlapp og overløp.

Returner bare: mappesti, én setning om hybriden, og om alle SVG-ene validerte.
