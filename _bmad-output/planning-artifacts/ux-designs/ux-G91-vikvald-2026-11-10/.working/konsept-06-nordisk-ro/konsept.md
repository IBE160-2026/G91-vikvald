# Konsept 06: Nordisk ro

**Personlighet:** En stille, lys høstdag på fjellet. Appen senker skuldrene dine og viser deg én ting om gangen.

## Idé

Nordisk ro er skandinavisk minimalisme brukt på øving. Hver skjerm har én tydelig hovedoppgave, mye luft og få elementer. Fargene er dempede naturfarger: furugrønn på havre- og sandflater. Navigasjonen er bare en tynn tekstlinje øverst. Når Klara øver, forsvinner den helt og blir erstattet av en smal fremdriftslinje, et «Avslutt økt» og telleren («Kort 7 av 24»). Kortet eller spørsmålet står alene midt på skjermen. Klara øver ofte sliten, etter en lang dag eller rett før eksamen. Da hjelper det at ingenting konkurrerer om oppmerksomheten. Konseptet passer også Studiekamerat som studentprosjekt: det er enkelt å bygge konsekvent, og den lille paletten gjør det lett å holde kontrastkravene.

## Komposisjon

- **Vanlige sider** (emner, emne, sammendrag, konto) har én smal, sentrert kolonne på 640–800 px. Lister er rader skilt med hårlinjer, ikke kort med skygge.
- **Forelesningssiden** er den eneste med to kolonner: «Notater» og «Øv og lag innhold». Den rolige statusboksen øverst til høyre viser at en jobb pågår («Lager quizspørsmål …»). Raden for jobben har en tynn fremdriftsstrek.
- **Øvingsmodus** (flashcard, quiz, modellkort, fritekst) har ingen toppmeny. Hele bredden viser bare en 3 px fremdriftslinje i furugrønt.
- **Dialoger** legger et dempet slør over siden. Valg som krever litt mer plass, som «Lag quiz», kommer som et rolig sidepanel fra høyre.
- **Dekor** er nesten fraværende. De eneste unntakene er et lite furutre ved navnet og et svakt åslandskap i sand på innloggingssiden.

## Palett

| Rolle | Hex | Bruk |
|---|---|---|
| Havre (bakgrunn) | `#F3F0E8` | sidebakgrunn |
| Flate | `#FBFAF7` | kort, dialoger, felt |
| Sand | `#E7E0D0` | merkelapper, spor i fremdrift, landskap |
| Lys sand | `#EFEADF` | seksjonsflater (modellsvar, opplasting, status) |
| Hårlinje | `#DDD6C6` | skillelinjer (bare dekor) |
| Furugrønn (hovedfarge) | `#2E4A3B` | primærknapper, lenker, fokusring, riktig svar |
| Lys furu | `#E3EBE3` | valgt alternativ, flaten for riktig svar |
| Blekk (tekst) | `#232B27` | brødtekst og overskrifter |
| Skifer | `#56615B` | sekundærtekst, metadata, kilder |
| Feltkant | `#7C8680` | kant på skjemafelt og radioknapper |
| Rust | `#9B3A2C` | feil, feilmeldinger, destruktive handlinger |
| Lys rust | `#F6E4DE` | flaten for «Ditt svar» når svaret er feil |

## Typografi

Humanistisk sans: `'Gill Sans', 'Gill Sans MT', Seravek, 'Segoe UI', Calibri, 'Helvetica Neue', Arial, sans-serif`.

- Sidetitler: 44–52 px, vekt 300 (lett og luftig, bærer ro)
- Spørsmål og korttekst: 22–28 px, vekt 400–500
- Seksjonstitler: 18–24 px, vekt 400–600
- Brødtekst: 17 px, linjehøyde ca. 1,6
- Metadata og kilder: 16 px i skifer. Noen få merknader til sensor er på 14 px.
- Små overtitler («SPØRSMÅL», «SVAR») har store bokstaver og ekstra sperring.

## Form og avstand

- Hjørner: 6 px på knapper, felt og alternativer, og 8 px på kort og dialoger. Merkelapper er pilleformede.
- Ingen skygger. Dybden kommer fra flatefarge og hårlinjer.
- Knapphøyde: 48 px, og 52–56 px for hovedhandlingen i øving.
- Avstandsskala: 4 · 8 · 16 · 24 · 40 · 64 · 104 px. Mye av ro-følelsen kommer fra de store trinnene (64 og 104) mellom seksjonene.

## Universell utforming

- **Kontrast** (målt): brødtekst 12,8:1, skifer på havre 5,7:1, furugrønn tekst 8,5:1, hvit på furugrønn 9,7:1, rust på havre 6,1:1 og rust på lys rust 5,6:1. Feltkanten har 3,6:1 mot flaten, så den oppfyller kravet om 3:1 for skjemakontroller.
- **Riktig og feil** vises med symbol, tekst og farge samtidig: ✓ «Riktig svar», ✗ «Ditt svar» og «Ikke riktig denne gangen». Resultatlisten bruker «Riktig svar:» og «Ditt svar:» som tekst.
- **Synlig fokusring:** en furugrønn ring på 2,5 px med luft rundt. Den vises på «Middels» i Lag quiz, på avkrysningen i vilkårsdialogen og på «Avbryt» i slettedialogen, der fokus starter på det trygge valget.
- **Etiketter:** alle skjemafelt har en synlig etikett over feltet. Feilmeldingen står i tekst under feltet, med et ikon og rød kant.
- **Kilde** står på alt generert innhold, med fil og side.
- **Tastatur:** øvingssidene viser snarveiene («1 = kunne ikke, 2 = kunne, mellomrom = snu»).
- **Lesbarhet:** brødteksten er minst 16–17 px. Få elementer per skjerm gir også lav kognitiv belastning.

## Styrker

- Konseptet er tydelig og konsekvent, og det skiller seg fra standard SaaS-design.
- Øvingsmodus uten meny gir god konsentrasjon.
- Den lille paletten er lett å bygge og å holde innenfor WCAG.
- Den rolige tonen passer en app man bruker når man er stresset før eksamen.

## Svakheter og risiko

- **Kan oppleves som flatt eller kjedelig.** Med så lite kontrast i flater og så lite dekor kan appen virke anonym. Mye hviler på typografien.
- **Gill Sans finnes ikke på alle maskiner.** Uten den faller siden tilbake til Segoe UI eller Calibri, og da forsvinner noe av karakteren. Brede fallback-fonter kan også gjøre lange linjer trangere enn i skissene.
- **Tynne skrifter i store størrelser** (vekt 300) kan bli svake på skjermer med lav oppløsning.
- **Forelesningssiden og quizresultatet bryter med «én ting om gangen»** fordi de har mye innhold. Her blir ro-prinsippet utfordret mest.
- **Hårlinjene `#DDD6C6`** er bevisst svake og bare dekor. Ingen informasjon kan avhenge av dem.
- **Rust brukes både for feil og for sletting.** Det er konsekvent, men brukeren må lese teksten for å skille dem.
