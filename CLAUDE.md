## Sesjonslogg

Når en oppgave eller økt avsluttes, før sluttoppsummeringen, bruk `sesjonslogg`-skillen: dokumenter Oppgave + Plan + Resultat + åpne punkter i `.logs/<bruker>/`, og før åpne punkter i `.logs/<bruker>/issues.md`. Skillen committer loggfila lokalt; push gjør du selv. Gruppens egne regler for commit og språk gjelder foran dette.

Meldingen på logg-commits skal beskrive hva som ble gjort, ikke bare være tittelen: `Logg: <hva økten gjorde>`.

## Prosess

Sensorveiledningen ser etter sporbar KI-bruk. Følg dette i hver økt:

- **Arbeidsflyt:** Hver story og annen endring bygges på egen branch og flettes via pull request. Åpne punkter føres som GitHub Issues i tillegg til `issues.md`. Pull requests lenker til issue og story.
- **KI-spor:** Oppdater `docs/ki-prosess/` i samme økt: viktige prompts i `prompts.md`, avviste eller rettede KI-forslag og feil i `korrigeringer.md`, og beslutninger i `beslutninger.md`. Oppgi commit når det finnes.
- **Fullstendige økter:** Repoet er offentlig. Legg aldri fullstendige KI-økter, personopplysninger eller hemmeligheter i det.
- **Commits:** Lag små, avgrensede commits med beskrivende meldinger, jevnt gjennom arbeidet.
- **Forklaring:** Forklar tekniske valg på vanlig norsk, siden brukeren ikke har forkunnskaper og selv må kunne begrunne dem.
