---
title: "DESIGN: Studiekamerat"
status: draft
created: 2026-11-10
updated: 2026-11-11
name: Studiekamerat
description: Norskspråklig studieverktøy for PC-nettleser. Designretning F2-V1 «Signaturfarge»: rolig papir, presis grotesk og én ultramarin merkefarge for handling og posisjon.
sources:
  - ../../prds/prd-G91-vikvald-2026-11-09/prd.md
colors:
  # Fargene er foreløpige, se avsnittet «Farger».
  paper: '#F8F7F3'
  surface: '#FFFFFF'
  ink: '#15181F'
  ink-muted: '#5A6070'
  brand: '#3A3FB0'
  on-brand: '#FFFFFF'
  brand-tint: '#EBEBF8'
  focus-ring: '#15181F'
  border-control: '#858B96'
  border-card: '#DDDCD5'
  divider: '#EAE9E3'
  gridline: '#EDECE6'
  progress-track: '#E4E4DF'
  surface-note: '#F0EFE9'
  surface-partial: '#EEEDE7'
  row-hover: '#F6F5F1'
  icon-faint: '#A3A8B2'
  subject-1: '#B83E0C'
  subject-2: '#0B6585'
  subject-3: '#2D6A3B'
  success: '#1C6E36'
  success-tint: '#E8F3EB'
  danger: '#B42318'
  danger-tint: '#FCEBE9'
  on-danger: '#FFFFFF'
  scrim: '#15181F'
typography:
  # Skissene bruker SF Pro (-apple-system). Den ekte appen bruker Inter fra Google Fonts
  # med tabulære tall (font-feature-settings: "tnum") på all tekst.
  page-title:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    letterSpacing: -0.5px
  session-counter:
    fontFamily: Inter
    fontSize: 44px
    fontWeight: '600'
    letterSpacing: -0.5px
  result-title:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '600'
    letterSpacing: -0.5px
  quiz-question:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '600'
    letterSpacing: -0.4px
  dialog-title:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    letterSpacing: -0.3px
  card-answer:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 36px
  card-question:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    letterSpacing: -0.2px
  section-title:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    letterSpacing: -0.2px
  item-title:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    letterSpacing: -0.1px
  body:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
  label:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
  meta:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
  meta-strong:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
  caption:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
  overline:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    letterSpacing: 0.8px
  kbd:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
rounded:
  xs: 2px
  kbd: 5px
  sm: 6px
  md: 8px
  option: 10px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 16px
  '4': 24px
  '5': 32px
  '6': 40px
  '7': 48px
  '8': 64px
  '9': 80px
  topbar-height: 64px
  sidebar-width: 288px
  content-inset: 64px
  content-margin-right: 48px
  home-margin: 80px
  card-gap: 16px
  column-gap: 32px
  menu-row: 32px
  table-row: 44px
  file-row: 80px
  create-row: 96px
  button-height: 40px
  button-height-lg: 48px
  grid-cell: 35px
  grid-gap: 6px
  flashcard-width: 768px
  quiz-column: 832px
  article-width: 568px
components:
  top-bar:
    height: '{spacing.topbar-height}'
    background: '{colors.paper}'
    border-bottom: '1px {colors.divider}'
  sidebar-tree:
    width: '{spacing.sidebar-width}'
    background: '{colors.paper}'
    border-right: '1px {colors.divider}'
  menu-row:
    height: '{spacing.menu-row}'
    radius: '{rounded.sm}'
    typography: '{typography.body-sm}'
  menu-row-selected:
    background: '{colors.brand-tint}'
    indicator: '2px {colors.brand}'
  session-panel:
    width: '{spacing.sidebar-width}'
    counter: '{typography.session-counter}'
    progress: '{colors.brand}'
    track: '{colors.progress-track}'
  answer-grid-cell:
    size: '{spacing.grid-cell}'
    gap: '{spacing.grid-gap}'
    radius: '{rounded.sm}'
    correct: '{colors.success-tint}'
    wrong: '{colors.danger-tint}'
    partial: '{colors.surface-partial}'
    current-border: '1.5px {colors.brand}'
    empty-border: '1px {colors.border-card}'
  button-primary:
    background: '{colors.brand}'
    foreground: '{colors.on-brand}'
    radius: '{rounded.md}'
    height: '{spacing.button-height}'
  button-outline:
    background: '{colors.surface}'
    foreground: '{colors.ink}'
    border: '1px {colors.border-control}'
    radius: '{rounded.md}'
    height: '{spacing.button-height}'
  button-text:
    foreground: '{colors.brand}'
    hover-background: '{colors.brand-tint}'
    icon-stroke: 1.5px
  button-danger:
    background: '{colors.danger}'
    foreground: '{colors.on-danger}'
    radius: '{rounded.md}'
  focus-ring:
    color: '{colors.focus-ring}'
    width: 2px
    offset: 2px
  card:
    background: '{colors.surface}'
    border: '1px {colors.border-card}'
    radius: '{rounded.lg}'
    shadow: 'lift'
  flashcard:
    width: '{spacing.flashcard-width}'
    background: '{colors.surface}'
    border: '1px {colors.border-card}'
    radius: '{rounded.xl}'
    shadow: 'float'
  dialog:
    background: '{colors.surface}'
    border: '1px {colors.border-card}'
    radius: '{rounded.xl}'
    shadow: 'float'
    scrim: '{colors.scrim} @ 42 %'
  quiz-option:
    background: '{colors.surface}'
    border: '1px {colors.border-card}'
    radius: '{rounded.option}'
    correct: '{colors.success-tint} + 1.5px {colors.success}'
    wrong: '{colors.danger-tint} + 1.5px {colors.danger}'
  choice-option-selected:
    background: '{colors.brand-tint}'
    border: '1.5px {colors.brand}'
    radius: '{rounded.option}'
  text-field:
    background: '{colors.surface}'
    border: '1px {colors.border-control}'
    radius: '{rounded.md}'
    error-border: '1.5px {colors.danger}'
  source-link:
    typography: '{typography.caption}'
    foreground: '{colors.ink}'
    underline: '1px {colors.border-card}'
  semester-timeline:
    background: '{colors.surface}'
    line-width: 4px
    line-past: 'heltrukket i emnefargen'
    line-ahead: 'stiplet i emnefargen'
    station-done: 'fylt sirkel i emnefargen'
    station-open: 'hul sirkel i emnefargen'
    exam-marker: '{colors.ink}'
  job-status:
    background: '{colors.paper}'
    border: '1px {colors.border-card}'
    spinner-track: '{colors.progress-track}'
    spinner-arc: '{colors.brand}'
  timeline-today-pill:
    background: '{colors.brand}'
    foreground: '{colors.on-brand}'
    radius: '{rounded.full}'
  note-surface:
    background: '{colors.surface-note}'
    radius: '{rounded.option}'
  demo-badge:
    background: '{colors.surface-note}'
    foreground: '{colors.ink-muted}'
    radius: '{rounded.full}'
  kbd:
    background: '{colors.surface}'
    border: '1px {colors.border-card}'
    radius: '{rounded.kbd}'
    typography: '{typography.kbd}'
---

# Studiekamerat: visuell identitet

Dette dokumentet sier hvordan Studiekamerat ser ut. Hvordan appen virker, står i [EXPERIENCE.md](EXPERIENCE.md). Begge bygger på designretningen **F2-V1 «Signaturfarge»** og de 15 skissene i [`.working/hybrid-f2-v1/`](.working/hybrid-f2-v1/). Skissene flyttes senere til `mockups/`.

**Dokumentene vinner ved konflikt.** Står noe annet i en skisse enn her eller i EXPERIENCE.md, er det dokumentene som gjelder.

## Merkevare og stil (Brand & Style)

Studiekamerat er et arbeidsverktøy for en student som skal lære et helt semester med stoff. Det skal føles rolig, presist og ferdig, som et godt laget verktøy og ikke som en lekeapp. Forbildene var lyse, ryddige verktøy som Linear, Things og Stripe Dashboard.

Tre grep bærer uttrykket:

1. **Papir og blekk.** En varm, lys bakgrunn med hvite kort og tynne kanter. Teksten er nesten svart. Ingen mønstre, ingen gradienter.
2. **Én merkefarge med én betydning.** Ultramarin betyr «her kan du gjøre noe» eller «her er du». Den brukes aldri til pynt.
3. **Tiden er synlig.** Semesterlinjen viser hvor mange forelesninger som har vært, og hvor lenge det er igjen til eksamen. Den er appens kjennetegn og står én gang per side der den hører hjemme.

Resultater vises sakelig. «11 av 15 riktige» står uten feiring, konfetti eller strek-teller. Det er stoffet som er viktig, ikke poengene.

Skisser: [02 Dine emner](.working/hybrid-f2-v1/02-emner.svg) viser hele uttrykket på forsiden, og [07 Flashcard](.working/hybrid-f2-v1/07-flashcard.svg) viser øvingsmodusen.

## Farger (Colors)

> **Fargene er foreløpige.** Silje syntes de opprinnelige F2-fargene var for kjedelige («alt er i samme tone») og valgte variant V1 med ultramarin merkefarge. Fargene kan justeres før koding. Rollene under (hva hver farge brukes til) står fast, selv om verdiene endres. Endres en verdi, må kontrasten måles på nytt.

### Grunnfarger

- **Papir `{colors.paper}` (#F8F7F3)** er bakgrunnen på alle sider, også i sidemenyen. Den er litt varm, slik at den kjølige merkefargen virker klarere.
- **Flate `{colors.surface}` (#FFFFFF)** brukes på kort, paneler, flashcard, dialoger, svaralternativer og tekstfelt.
- **Blekk `{colors.ink}` (#15181F)** er all hovedtekst. 16,6:1 på papir og 17,8:1 på hvitt.
- **Dempet grå `{colors.ink-muted}` (#5A6070)** er undertekst, status, etiketter, hurtigtasthint og «Logg ut». 5,9:1 på papir, 6,3:1 på hvitt.

### Merkefarge

- **Ultramarin `{colors.brand}` (#3A3FB0)** brukes bare på
  - hovedknapper («Øv nå», «Øv på flashcards», «Kunne», «Neste spørsmål», «Lag quiz», «Godta og last opp», «Logg inn»)
  - tekstknapper som er handlinger («Åpne», «Start», «Lag flere», «Erstatt»)
  - posisjon: valgt rad i menyen, «I dag» og «Du er her» på semesterlinjen, gjeldende rute i svarrutenettet
  - fremdrift (stolper på emnekortene og i øktpanelet)
  - valgt radioknapp og avkrysning
  - prikken i logoen.
- Hvit tekst på ultramarin har 8,3:1. Ultramarin på papir har 7,8:1.
- **Merketone `{colors.brand-tint}` (#EBEBF8)** er bakgrunnen på valgt menyrad, valgt alternativ i dialoger, hover på tekstknapp, filikon-flisen og initialsirkelen ved «Konto». Blekk har 15,0:1 og dempet grå 5,3:1 på denne tonen.
- Merkefargen er bevisst mer fiolett enn petrol-blåen i `{colors.subject-2}`, slik at den ikke leses som et emne.

### Emnefarger

- **`{colors.subject-1}` (#B83E0C, oransje), `{colors.subject-2}` (#0B6585, petrol) og `{colors.subject-3}` (#2D6A3B, grønn)** markerer et emne: emnelinjen på semesterlinjen, stasjonene på linjen og emneprikken foran emnenavnet.
- I skissene er de knyttet til Markedsføring, Samfunnsøkonomi og Organisasjon og ledelse. Det er eksempelinnhold.
- Kontrast: 5,3:1 (oransje på papir), 6,1:1 (petrol på papir), 6,1:1 (grønn på papir).
- Emnefarger brukes aldri på knapper, flater eller tekst. Oransje er særlig utsatt: den skal ikke brukes til advarsler eller «delvis riktig», fordi den da forveksles med emnet.
- [ASSUMPTION] Hvordan et nytt emne får farge, og hva som skjer med flere enn tre emner, er ikke bestemt. Se Åpne spørsmål.

### Riktig, feil og delvis

- **Riktig `{colors.success}` (#1C6E36) på `{colors.success-tint}` (#E8F3EB)**: «✓ Riktig svar», «Kunne», grønne ruter i rutenettet. 5,5:1.
- **Feil `{colors.danger}` (#B42318) på `{colors.danger-tint}` (#FCEBE9)**: «✗ Ditt svar», «Kunne ikke», røde ruter, feilmelding i skjemafelt, tekstknappen «Slett» og knappen «Slett kontoen …». 5,7:1 på tonen, 6,6:1 på hvitt.
- **Fareknappen** (hvit tekst på `{colors.danger}`, 6,6:1) brukes bare i bekreftelsesdialoger for sletting.
- **Delvis riktig** har ingen egen farge. Den vises med en halvfylt sirkel (◐) i blekk på `{colors.surface-partial}` (#EEEDE7), 15,1:1. Det er formen som skiller den fra ✓ og ✗.
- Farge står aldri alene. Riktig og feil har alltid symbol og tekst i tillegg (NFR-10).

### Kanter, linjer og flater

- **`{colors.border-control}` (#858B96)** er kanten på det man kan trykke på eller skrive i: omrissknapper, tekstfelt, radioknapper og opplastingsfeltet. 3,2:1 mot papir, nok for grafikk (WCAG 1.4.11).
- **`{colors.border-card}` (#DDDCD5)** er kanten på kort, dialoger, svaralternativer, tomme ruter og tastaturknapper. Den er også den svake streken under kildelenken.
- **`{colors.divider}` (#EAE9E3)** er skillelinjer inne i kort og under toppfeltet. **`{colors.gridline}` (#EDECE6)** er de loddrette månedslinjene på semesterlinjen.
- **`{colors.progress-track}` (#E4E4DF)** er sporet bak fremdriftsstolper.
- **`{colors.surface-note}` (#F0EFE9)** er merknadsflaten (personvernmerknad, huskeregel, «sjekk mot kilden») og demomerket. Dempet grå har 5,5:1 på den.
- **`{colors.row-hover}` (#F6F5F1)** er hover på en tabellrad.
- **`{colors.icon-faint}` (#A3A8B2)** brukes bare på pilen (›) ytterst i tabellrader. Den har 2,4:1 og er pynt, fordi hele raden er lenken. Bør sjekkes i den ekte appen.
- **Slør `{colors.scrim}`** med 42 % dekkevne ligger bak dialoger.
- **Fokusring `{colors.focus-ring}`** er blekk, ikke blå, slik at den ikke forveksles med merkefargen.

Skissene bruker noen nesten like verdier om hverandre (#DCDCD6 og #E9E9E4 fra F2, #E5E4DE). Bruk tokenene over.

### Kontrast for viktige fargepar (målt, WCAG)

| Forgrunn | Bakgrunn | Kontrast | Brukes til |
|---|---|---|---|
| `{colors.ink}` | `{colors.paper}` | 16,6:1 | All hovedtekst |
| `{colors.ink-muted}` | `{colors.paper}` | 5,9:1 | Undertekst, status |
| `{colors.ink-muted}` | `{colors.brand-tint}` | 5,3:1 | Tall i valgt menyrad |
| `{colors.on-brand}` | `{colors.brand}` | 8,3:1 | Hovedknapp |
| `{colors.brand}` | `{colors.paper}` | 7,8:1 | Tekstknapp |
| `{colors.brand}` | `{colors.brand-tint}` | 7,1:1 | Tekst i valgt rad |
| `{colors.subject-1}` | `{colors.paper}` | 5,3:1 | Emnelinje (grafikk) |
| `{colors.success}` | `{colors.success-tint}` | 5,5:1 | Riktig |
| `{colors.danger}` | `{colors.danger-tint}` | 5,7:1 | Feil |
| `{colors.on-danger}` | `{colors.danger}` | 6,6:1 | Fareknapp |
| `{colors.border-control}` | `{colors.paper}` | 3,2:1 | Kant på kontroller (grafikk) |
| `{colors.focus-ring}` | `{colors.paper}` | 16,6:1 | Fokusring |

All tekst har minst 4,5:1 (NFR-9).

## Typografi (Typography)

**Én skriftfamilie.** Skissene er tegnet med SF Pro (`-apple-system`). Den ekte appen bruker **Inter** fra Google Fonts, fordi SF Pro bare finnes på Apple-maskiner. Inter ligner i form, har vektene 400, 500 og 600, og har tabulære tall. Reserveskrift: `system-ui, sans-serif`.

**Tabulære tall overalt** (`font-feature-settings: "tnum"`). Datoer, antall kort og quizspørsmål står da i rette kolonner, og tall i tabeller er høyrejustert.

Hierarkiet kommer fra størrelse, vekt og farge, ikke fra flere skrifttyper. Store titler har litt negativ sperring.

| Rolle | Token | Brukes til |
|---|---|---|
| Sidetittel | `{typography.page-title}` | «Dine emner», «Markedsføring», «Uke 37: Merkevare», «Konto» |
| Teller | `{typography.session-counter}` | «7» i øktpanelet. «/ 24» står i 20 px, vekt 400, dempet grå |
| Resultattittel | `{typography.result-title}` | «11 av 15 riktige» |
| Quizspørsmål | `{typography.quiz-question}` | Spørsmålet i quiz og fritekst |
| Dialogtittel | `{typography.dialog-title}` | «Lag quiz», «Slette fila?» |
| Flashcard-svar | `{typography.card-answer}` | Baksiden av kortet, ca. 56 tegn per linje |
| Flashcard-spørsmål | `{typography.card-question}` | Forsiden av kortet |
| Seksjonstittel | `{typography.section-title}` | «Filer», «Lag og øv», temaene i sammendraget |
| Radtittel | `{typography.item-title}` | Emnenavn på kort, «Flashcards» i en rad |
| Brødtekst | `{typography.body}` | Forklaringer, sammendrag, svaralternativer. Linjeavstand 24 px |
| Liten brødtekst | `{typography.body-sm}` | Meny, tabell, undertitler |
| Etikett | `{typography.label}` | Feltetiketter, knappetekst |
| Metatekst | `{typography.meta}`, `{typography.meta-strong}` | «12 sider · lastet opp 11.09», toppfeltet |
| Kilde | `{typography.caption}` | Kildelenken, tall i menyen |
| Overlinje | `{typography.overline}` | EMNER, ØKT, SPØRSMÅL, SVAR, NESTE Å ØVE PÅ, månedene på linjen. Versaler |
| Tast | `{typography.kbd}` | Tastene i hurtigtasthint |

Regler:

- Brødtekst er minst 16 px. Lange tekster (sammendrag, forklaring) har høyst ca. 75 tegn per linje.
- Bare tre vekter: 400 (tekst), 500 (metatekst med vekt) og 600 (titler, knapper). Ingen fet 700.
- Overlinjer i versaler bare for korte etiketter, aldri for setninger.
- Linjeavstand er målt for brødtekst (1,5) og flashcard-svar (1,5). [ASSUMPTION] Titler på flere linjer får ca. 1,25. Det er ikke vist i skissene.

## Utforming og avstand (Layout & Spacing)

**8-punkts rutenett.** Avstander, høyder og bredder er delelige med 8 (`{spacing.1}` til `{spacing.9}`: 4, 8, 16, 24, 32, 40, 48, 64 og 80 px). To unntak: rutene i øktpanelet (`{spacing.grid-cell}` 35 px med `{spacing.grid-gap}` 6 px, slik at seks ruter fyller 240 px) og grunnlinjene til teksten.

Skissene er tegnet for et vindu på 1440 × 900 px.

**Tre sideoppsett:**

1. **Forsiden uten sidemeny** ([02](.working/hybrid-f2-v1/02-emner.svg)). Toppfelt på `{spacing.topbar-height}`, deretter innhold med `{spacing.home-margin}` (80 px) marg på hver side. Semesterlinjen går over hele bredden. Under den står emnekortene i tre kolonner med `{spacing.card-gap}` mellom.
2. **Sider med sidemeny** ([03](.working/hybrid-f2-v1/03-emne.svg), [04](.working/hybrid-f2-v1/04-forelesning.svg), [13](.working/hybrid-f2-v1/13-sammendrag.svg), [15](.working/hybrid-f2-v1/15-konto.svg)). Sidemenyen er `{spacing.sidebar-width}` (288 px) bred og skilt fra innholdet med en hårlinje. Innholdet starter `{spacing.content-inset}` (64 px) etter menyen og slutter `{spacing.content-margin-right}` (48 px) fra kanten. To kolonner har `{spacing.column-gap}` (32 px) mellom seg, og begge kolonnene slutter på samme høyde.
3. **Øving** ([07](.working/hybrid-f2-v1/07-flashcard.svg), [09](.working/hybrid-f2-v1/09-quiz.svg), [11](.working/hybrid-f2-v1/11-modellkort.svg), [12](.working/hybrid-f2-v1/12-fritekst.svg)). Sidemenyen er byttet med øktpanelet i samme bredde. Innholdet står som én gruppe, sentrert både vannrett og loddrett i området til høyre: flashcard `{spacing.flashcard-width}` (768 px), quiz og fritekst `{spacing.quiz-column}` (832 px).

**Felles venstrekanter.** Overskrift, kort og tabell starter på samme linje. På forsiden står emnenavn på linjen og tekst i kortene på samme kant. Emneprikken henger i margen, slik at teksten står rett.

**Faste høyder:** menyrad `{spacing.menu-row}` (32 px), tabellrad `{spacing.table-row}` (44 px), filrad `{spacing.file-row}` (80 px), rad i «Lag og øv» `{spacing.create-row}` (96 px), knapp `{spacing.button-height}` (40 px) og stor knapp under øving `{spacing.button-height-lg}` (48 px).

**Sammendraget** leses som en artikkel i en kolonne på `{spacing.article-width}` (568 px), med et innholdskort til høyre.

Oppførsel ved smalere vinduer (ned til 768 px og 200 % tekst, NFR-14) står i EXPERIENCE.md, «Skjermstørrelse og plattform».

## Høyde og dybde (Elevation & Depth)

Dybde kommer fra hvite flater med tynn kant på papir, ikke fra skygger. Det finnes bare to skygger:

- **`lift`**: 0 1 px 1 px blekk med 4 % dekkevne. Nesten usynlig. Brukes på kort, paneler, omrissknapper og svaralternativer, slik at de ikke ser flate ut.
- **`float`**: `lift` pluss 0 12 px 16 px blekk med 6 % dekkevne. Brukes bare på flashcardet og dialoger, det som ligger «over» resten.

Dialoger ligger over et slør (`{colors.scrim}` med 42 %). Dialogene stables aldri.

Ingen harde skygger, ingen skygge for å vise rekkefølge eller viktighet. Viktighet vises med merkefargen og vekt.

## Former (Shapes)

| Token | Verdi | Brukes til |
|---|---|---|
| `{rounded.xs}` | 2 px | Fremdriftsstolper (4 px høye) |
| `{rounded.kbd}` | 5 px | Tastaturknapper i hurtigtasthint |
| `{rounded.sm}` | 6 px | Menyrader, ruter i svarrutenettet |
| `{rounded.md}` | 8 px | Knapper, tekstfelt, filikon-flis |
| `{rounded.option}` | 10 px | Svaralternativer, valgkort i dialog, merknadsflate, filboks i slettedialog |
| `{rounded.lg}` | 12 px | Kort og paneler |
| `{rounded.xl}` | 16 px | Flashcard, modellkort og dialoger |
| `{rounded.full}` | 9999 px | «I dag»-pillen, demomerket, initialsirkelen |

Jo større og mer «løftet» en flate er, jo rundere er hjørnene. Fokusringen følger hjørnet til elementet med 2–3 px ekstra radius.

**Ikoner** er linjeikoner tegnet på 16 px rutenett med 1,5 px strek og runde ender: fil, opplasting, pil, pil til høyre (›), sjekk, kryss, pluss, erstatt (sirkelpil), slett (søppelbøtte), logg ut, lås og blyant. Ikke emoji.

## Komponenter (Components)

Visuell beskrivelse. Hvordan komponentene oppfører seg, står i EXPERIENCE.md, «Komponentmønstre». Navnene er de samme i begge dokumentene.

### Ramme

- **Toppfelt** (`top-bar`): logo til venstre (svart strek med ultramarin prikk, «Studiekamerat» i 16 px / 600). Til høyre: initialsirkel i `{colors.brand-tint}` med bokstav i `{colors.brand}`, «Konto» i blekk, en kort loddrett hårlinje, og «Logg ut» med utgangsikon i dempet grå. Ingen understreking. På innloggingen vises bare logoen. Skisse: alle sider.
- **Sidemeny med emnetre** (`sidebar-tree`): overlinjen EMNER, deretter emnene med emneprikk, navn (15 px / 600) og antall forelesninger høyrejustert i dempet grå. Det åpne emnet viser forelesningene som menyrader. Nederst: tasten «?» og «Hurtigtaster». Ingen semesterlinje i menyen. Skisse: [03](.working/hybrid-f2-v1/03-emne.svg).
- **Menyrad** (`menu-row`): ukenummer som eget tall i dempet grå foran navnet («37 Merkevare»), statusprikk til høyre (fylt = øvd, hul = ikke øvd). Lange navn kortes av med «…». **Valgt rad** (`menu-row-selected`) har `{colors.brand-tint}` og en loddrett strek i `{colors.brand}` til venstre.
- **Øktpanel** (`session-panel`): erstatter sidemenyen under øving. Overlinjen ØKT, øvingstype og omfang («Flashcards», «Uke 37: Merkevare»), teller («7 / 24»), fremdriftsstolpe i `{colors.brand}` på `{colors.progress-track}`, en linje med «Kunne 5 · Kunne ikke 1», svarrutenettet, symbolforklaring og omrissknappen «Avslutt økt» nederst. Ferdig økt: alle ruter fylt, «Avslutt økt» byttet med «✓ Økten er ferdig og lagret». Skisser: [07](.working/hybrid-f2-v1/07-flashcard.svg), [08](.working/hybrid-f2-v1/08-flashcard-ferdig.svg).
- **Svarrutenett** (`answer-grid-cell`): seks ruter per rad. Riktig/kunne = grønn tone med ✓, feil/kunne ikke = rød tone med ✗, delvis = `{colors.surface-partial}` med ◐, gjeldende = hvit med ultramarin kant og nummer, ikke vist ennå = tom med kant og nummer.

### Oversikt

- **Semesterlinje** (`semester-timeline`): et hvitt kort med symbolforklaring i toppraden (fylt prikk «Øvd», hul prikk «Ikke øvd ennå», firkant «Eksamen», stiplet «Tid igjen»). Månedene AUG–DES som overlinjer med loddrette `{colors.gridline}`. Én linje per emne i emnefargen, 4 px tykk: heltrukket fram til i dag, stiplet fram til eksamen. Stasjonene er sirkler (fylt = øvd, hul = ikke øvd). Eksamen er en svart firkant. «I dag 10.11» er en pille i `{colors.brand}` med loddrett nål. Til venstre: emnenavn, antall forelesninger og «Eksamen 04.12 · om 3 uker». På forelesningssiden viser linjen bare ett emne, og «Du er her» er en ring rundt stasjonen med en nål. Skisser: [02](.working/hybrid-f2-v1/02-emner.svg), [03](.working/hybrid-f2-v1/03-emne.svg), [04](.working/hybrid-f2-v1/04-forelesning.svg). På innloggingen står en grå, forenklet linje som bilde.
- **Emnekort** (`subject-card`): hvitt kort, tre i bredden. Emneprikk og navn, tekstknappen «Åpne ›» øverst til høyre, antall kort og quizspørsmål, en hårlinje, overlinjen NESTE Å ØVE PÅ med forelesning og grunn («16 kort, ikke øvd ennå»), én knapp, og nederst fremdrift som små stolper («4 av 8 forelesninger øvd»). Kort uten øvingsinnhold har NESTE STEG og omrissknappen «Lag flashcards».
- **Forelesningstabell** (`lecture-table`): kolonnene Dato, Forelesning, Kort, Quiz og Status. Tall høyrejustert. Tomme tall vises som «–». Status med fylt eller hul prikk og tekst («Øvd 03.11», «Ikke øvd ennå», «Ingen filer ennå»). Pil (›) i `{colors.icon-faint}` ytterst. Hover gir `{colors.row-hover}` og mørk pil.
- **Kort «Øv på hele emnet»** (`practice-all-card`): hvitt kort ved siden av tabellen, med en rad per øvingstype (tittel, omfang og handling). Flashcards har hovedknappen «Øv på flashcards», de andre har tekstknappen «Start ›». Nederst SISTE ØKT.

### Forelesning

- **Filrad** (`file-row`): filikon på `{colors.brand-tint}`-flis, filnavn (15 px / 600), «12 sider · lastet opp 11.09» i dempet grå, og tekstknappene «Slett» (rød, søppelbøtte) og «Erstatt» (ultramarin, sirkelpil).
- **Opplastingsfelt** (`upload-zone`): stiplet kant i `{colors.border-control}`, opplastingsikon, «Dra og slipp PDF-filer hit», «Bare PDF. Hver fil får sin egen kilde med sidetall.» og omrissknappen «Velg PDF».
- **Merknadsflate** (`note-surface`): `{colors.surface-note}`, lås- eller infoikon, to linjer dempet tekst. Brukes til personvernmerknaden, huskeregelen og «Sjekk viktige punkter mot kilden».
- **Rad i «Lag og øv»** (`create-row`): type og omfang til venstre («Flashcards», «24 kort»), handling til høyre. Har typen innhold: hovedknappen «Øv nå» og tekstknappen «+ Lag flere». Har den ikke innhold: omrissknappen «Lag fritekstspørsmål» eller «Lag sammendrag». Status «Ingen ennå» eller «Ikke laget» i dempet grå.
- **Jobbstatus** (`job-status`): erstatter handlingene i raden mens innhold lages. Boks på papir med kant, en snurr (sporring i `{colors.progress-track}`, bue i `{colors.brand}`), «Lager quizspørsmål …» og «Du kan bruke resten av appen imens.» Skisse: [04](.working/hybrid-f2-v1/04-forelesning.svg).

### Knapper

Tre vanlige stiler og én for fare. Høyde 40 px (48 px under øving), hjørner `{rounded.md}`.

- **Hovedknapp** (`button-primary`): `{colors.brand}` med hvit tekst. Bare for det Klara gjør oftest på stedet, og høyst én per rad eller seksjon.
- **Omrissknapp** (`button-outline`): hvit med kant i `{colors.border-control}` og blekk-tekst. For sjeldnere eller sekundære valg: «Nytt emne», «Ny forelesning», «Lag fritekstspørsmål», «Lag sammendrag», «Lag flashcards», «Velg PDF», «Kunne ikke», «Avslutt økt», «Avbryt», «Tilbake til forelesningen», «Lag nytt sammendrag». Selvvurderingen bruker tre like omrissknapper.
- **Tekstknapp** (`button-text`): tekst i `{colors.brand}` med ikon eller pil, uten understreking. Hover gir `{colors.brand-tint}` bak. «Slett» er unntaket og står i `{colors.danger}`.
- **Fareknapp** (`button-danger`): `{colors.danger}` med hvit tekst. Bare i bekreftelsesdialoger for sletting («Slett fila»). Knappen «Slett kontoen …» på kontosiden er en omrissknapp med rød tekst, fordi den bare åpner bekreftelsen.
- **Fokusring** (`focus-ring`): 2 px blekk, 2 px luft rundt elementet. Gjelder alle elementer som kan få fokus.

### Øving

- **Flashcard** (`flashcard`): hvitt kort, 768 px bredt, `{rounded.xl}` og `float`-skygge. Overlinjen SPØRSMÅL og spørsmålet i `{typography.card-question}`, en hårlinje, overlinjen SVAR og svaret i `{typography.card-answer}`. Nederst kildelenken. Under kortet: «Kunne ikke» (omriss) og «Kunne» (hovedknapp), like brede (208 px), og hurtigtasthint under. Skisse: [07](.working/hybrid-f2-v1/07-flashcard.svg).
- **Modellkort** (`model-card`): samme kort. Svaret viser punktene som rader med en bokstavboks foran hvert (A, I, D, A) bundet sammen av en tynn loddrett linje, det engelske ordet i 600 og den norske oversettelsen i parentes. Under står huskeregelen på merknadsflaten. Nederst kilden og tekstknappen «Endre huskeregel» med blyant. Skisse: [11](.working/hybrid-f2-v1/11-modellkort.svg).
- **Svaralternativ** (`quiz-option`): rad på 62 px med bokstavboks (A–D) og tekst. Etter bekreftet svar: riktig alternativ får grønn tone, grønn kant og «✓ Riktig svar» til høyre. Feil valgt alternativ får rød tone, rød kant og «✗ Ditt svar». De andre står uendret. Skisse: [09](.working/hybrid-f2-v1/09-quiz.svg).
- **Forklaringskort** (`explanation-card`): hvitt kort under alternativene med «Forklaring», brødtekst og kilde med forelesning og emneprikk.
- **Tekstfelt for svar** (`text-field`): synlig etikett «Ditt svar» over, hvit flate med kant i `{colors.border-control}`. Etter levering står «Levert · 37 ord» til høyre for etiketten. Skisse: [12](.working/hybrid-f2-v1/12-fritekst.svg).
- **Modellsvar** (`model-answer`): hvitt kort med overskrift, brødtekst og kilde.
- **Selvvurdering** (`self-assessment`): «Hvordan gikk det?», «Vurder selv mot modellsvaret.» og tre like omrissknapper «✗ Feil», «◐ Delvis riktig», «✓ Riktig». Ingen hovedknapp.
- **Hurtigtasthint** (`kbd`): små hvite taster med kant og tekst i dempet grå etter («Mellomrom snu kortet», «Esc avslutt»). Står sentrert under knappene, eller til venstre på samme linje som hovedknappen i quizen.

### Resultat

- **Resultatsammendrag** (`result-summary`): overlinje («ØKT FERDIG», «QUIZ FERDIG»), tittel i `{typography.result-title}` eller `{typography.page-title}`, og en forklarende undertekst. Flashcards: et kort med to felt, «Kunne 19» og «Kunne ikke 5», med prosent i dempet grå. Ingen feiring. Skisser: [08](.working/hybrid-f2-v1/08-flashcard-ferdig.svg), [10](.working/hybrid-f2-v1/10-quiz-resultat.svg).
- **Liste over feil** (`missed-list`): ett kort med en rad per kort eller spørsmål: nummer, spørsmål, kilde, og for quiz «✗ Ditt svar», «✓ Riktig svar» og en kort forklaring.
- Knapper nederst: tilbakevalget som omrissknapp og «Øv igjen» / «Ta quizen igjen» som hovedknapp.

### Skjema og dialoger

- **Dialog** (`dialog`): hvit, `{rounded.xl}`, tynn kant, `float`-skygge, over sløret. Tittel i `{typography.dialog-title}` og lukkekryss øverst, innhold, en skillelinje og knappene nederst til høyre i rekkefølgen «Avbryt», hovedhandling. Bredde etter innhold: 560 px (slett), 640 px (vilkår), 720 px (lag quiz). Skisser: [05](.working/hybrid-f2-v1/05-vilkar.svg), [06](.working/hybrid-f2-v1/06-lag-innhold.svg), [14](.working/hybrid-f2-v1/14-slett-bekreft.svg).
- **Valgkort** (`choice-option`): hvitt kort med radioknapp, tittel og forklaring. Omfang står som tre kort ved siden av hverandre, vanskelighetsgrad som tre rader. Valgt: `{colors.brand-tint}`, 1,5 px kant i `{colors.brand}` og fylt ultramarin radioknapp.
- **Avkrysning** (`checkbox`): 20 px, `{rounded.kbd}`. Avkrysset: fylt `{colors.brand}` med hvit hake.
- **Skjemafelt** (`text-field`): etikett over feltet (15 px / 600), felt på 48 px med kant i `{colors.border-control}`. Feil: 1,5 px kant i `{colors.danger}`, og under feltet et ikon og teksten i rødt. Passordfeltet har tekstknappen «Vis». Skisse: [01](.working/hybrid-f2-v1/01-logg-inn.svg).
- **Kildelenke** (`source-link`): filikon, «merkevare-notater.pdf, side 4» i `{typography.caption}` med en svak strek under i `{colors.border-card}`. Det er den eneste understrekede teksten i appen.
- **Demomerke** (`demo-badge`): pille på `{colors.surface-note}` med dempet tekst «Demomodus: innholdet lages av en testmodell». Skisse: [15](.working/hybrid-f2-v1/15-konto.svg).
- **Kontokort** (`account-card`): tre hvite kort (Innlogging, Vilkår og personvern, Slett kontoen) med rader som filkortet på forelesningssiden.

### Ikke skissert

- **Formelmerke** (`formula-flag`, FR-41): teksten «Inneholder formel – sjekk mot kilden». [ASSUMPTION] Vises på merknadsflaten (`{colors.surface-note}`) med et infoikon, rett over kildelenken. Ikke oransje eller rød, fordi det er en påminnelse, ikke en feil.
- **Statusmelding** for feil og «færre enn valgt» (FR-18, FR-21) og **hurtigtastdialogen**. [ASSUMPTION] Bruker merknadsflaten og dialogen over. Se EXPERIENCE.md.

## Gjør og unngå (Do's and Don'ts)

| Gjør | Unngå |
|---|---|
| Bruk `{colors.brand}` bare for handling og posisjon | Merkefargen som pynt, bakgrunn eller overskriftsfarge |
| Høyst én hovedknapp per rad eller seksjon | To ultramarine knapper ved siden av hverandre |
| Emnefarger bare på emnelinje, stasjoner og emneprikk | Oransje til advarsler, «delvis riktig» eller pynt |
| Riktig og feil med symbol og tekst i tillegg til farge | Status som bare vises med farge |
| Status med fylt og hul prikk og tekst | Stolpediagram eller andre grafer for status |
| Én semesterlinje per side | Tidslinje i sidemenyen |
| Tekstknapper med ikon eller pil | Understreking, unntatt kildelenken |
| Hvite kort med tynn kant og `lift` | Harde skygger og gradienter |
| Svart fokusring på alt som kan få fokus | Blå fokusring (forveksles med merkefargen) eller å fjerne den |
| Sakelig resultat: «11 av 15 riktige» | Feiring, konfetti, strek-teller |
| Vis informasjonen ett sted | Gjenta «X uker til eksamen» på kort når linjen viser det |
| Tabulære tall og høyrejusterte tallkolonner | Proporsjonale tall i tabeller |
| Rød fylt knapp bare i slettebekreftelse | Rød fylt knapp utenfor dialog |

## Åpne spørsmål

1. **Fargeverdiene** er foreløpige og kan justeres før koding (se «Farger»). Rollene står fast.
2. **Emnefarger:** hvordan får et nytt emne farge, og hva skjer med flere enn tre emner? Kildene sier ikke noe. Flere farger må måles for kontrast og holdes unna merkefargen og rødt/grønt.
3. **Ikke skissert:** formelmerket (FR-41), statusmeldinger for feil og «færre enn valgt», hurtigtastdialogen, dialogene for nytt emne, ny forelesning og lag flashcards/fritekst, og redigering av kort. De følger komponentene over, men har ingen visuell referanse.
