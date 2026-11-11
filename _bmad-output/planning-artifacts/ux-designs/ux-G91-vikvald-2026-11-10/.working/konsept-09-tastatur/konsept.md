# Konsept 09: Tastaturet først

**Personlighet:** En presis, rask arbeidsbenk for den effektive studenten. Den ser ut som en kodeeditor, og alt kan gjøres uten mus.

## Idé

Studiekamerat bygges som en kodeeditor. Til venstre ligger et tre med emner og forelesninger, til høyre innholdet, og nederst en statuslinje som viser modus (EMNER, FORELESNING, ØKT, QUIZ) og pågående jobber. Hver handling har en synlig hurtigtast som tegnes som en tast ved siden av knappen: Mellomrom snur kortet, 1 og 2 gir Kunne og Kunne ikke, A–D velger svar og Enter bekrefter. Kommandopaletten (⌘K) gjør at Klara kan skrive «øv merk» og være i gang med å øve på sekunder. Det passer en student som øver ofte og i korte økter, fordi hun lærer tastene etter noen få økter og så slipper å lete i menyer. For Studiekamerat gjør konseptet kravet om tastaturbruk (NFR-8) til selve utseendet, i stedet for å være noe som bare står i kravlista.

## Visuelt språk

**Palett (mørk grafitt):**

| Rolle | Hex |
|---|---|
| Bakgrunn | `#15171C` |
| Toppfelt/statuslinje | `#0F1115` |
| Panel (sidepanel, kort) | `#1C1F26` |
| Hevet flate (bakside, taster) | `#252933` |
| Valgt rad | `#2E3442` |
| Linjer/rammer | `#3A4150` |
| Tekst | `#E8EBF0` |
| Dempet tekst | `#AEB6C4` |
| Aksent: handling, modus, jobb, primærknapp | `#F5B942` (rav) |
| Riktig / Kunne | `#6FD39A` (grønn) |
| Feil / destruktiv | `#FF8F87` (lys rød) |
| Fokusring, kilde, lenker | `#79C6EA` (cyan) |

**Typografi:** Monospace overalt (`ui-monospace, 'SF Mono', Menlo, Consolas, monospace`). Hierarkiet lages med størrelse og vekt: sidetittel 30 px fet, kortspørsmål 26 px fet, brødtekst 16–17 px, kortsvar 20 px, seksjonsetiketter 14 px fet versaler med sperring. Tall og tellere står i ravgult.

**Form:** Skarpe hjørner (2–4 px radius) og 1 px rammer. Det er ingen skygger og ingen gradienter. Tastene er små rammer med en tykkere underkant, så de ligner fysiske taster. Dialoger har farget ramme: rav for vanlige dialoger og rød for sletting.

**Avstandsskala:** 4 · 8 · 12 · 16 · 24 · 32 · 40 px. Faste soner: toppfelt 44 px, sidepanel 300 px, statuslinje 34 px og innholdsmarg 40 px.

**Komposisjon:** Delte paneler. I emnevisningen viser venstre panel treet med emner og en liste over hurtigtaster. I øvingsøkter blir det et øktpanel med teller, fremdriftslinje og et rutenett med ✓, ✗ og · per kort. Statuslinjen viser bakgrunnsjobben («⟳ jobb 1/1: Lager quizspørsmål … 60 %») på alle sider. Kommandopaletten vises åpen på `02-emner.svg`.

## Universell utforming

- **Kontrast:** Alle tekstfarger er målt mot alle flater. Den laveste verdien er dempet tekst på valgt rad, som gir 6,1:1. Rødt på valgt rad gir 5,7:1. Mørk tekst på rav knapp gir 10,2:1 og på rød knapp 8,1:1. Alt er over kravet på 4,5:1.
- **Tastatur:** Alle handlinger har en hurtigtast som vises der handlingen står. Fokusringen er en tydelig cyan ramme på 3 px og skiller seg fra ravgult, som betyr «valgt». Det vises på side 6, der «Middels» både har fokus og er valgt. På slettedialogen står fokus på «Avbryt», slik at Enter ikke sletter ved et uhell.
- **Ikke bare farge:** Riktig og feil vises alltid med symbol og tekst: «✓ Riktig svar», «✗ Ditt svar», ✓/✗/◐ i rutenettet og «✗ Feil:» foran feilmeldinger i skjema.
- **Etiketter:** Skjemafelt har synlige etiketter over feltet. Feilmeldingen står i tekst under feltet og forklarer hvordan feilen rettes.
- **Kilder:** Alt generert innhold har en egen cyan linje med «kilde: fil, side» og tasten O for å åpne kilden.
- **Tekststørrelse:** Brødteksten er 16–17 px. Bare hjelpetekst og etiketter er 14–15 px.

## Styrker

- Konseptet skiller seg tydelig ut og har en klar idé. NFR-8 synes på hver side og er lett å forklare for sensor.
- Høy informasjonstetthet. Emnesiden viser filer, kort, quiz og status for alle 8 forelesningene i én tabell.
- Statuslinjen er et naturlig sted å vise at innhold lages i bakgrunnen.
- Konseptet er enkelt å bygge konsekvent, fordi det har få komponenter: panel, rad, tast, knapp og statuslinje.

## Svakheter og risiko

- **Kan virke teknisk og kjølig.** En markedsføringsstudent uten erfaring med kode kan føle seg utenfor. Taster som ⌘K og ⌘⏎ må alltid ha en vanlig knapp ved siden av, ellers blir appen vanskelig å bruke med mus.
- **Monospace er tyngre å lese** i lange tekster, som sammendrag og modellsvar. Det kan være lurt å bruke en proporsjonal skrift i lange tekstblokker.
- **Mørkt tema som eneste valg** kan gi blending og være dårlig for noen med nedsatt syn. Det bør finnes et lyst tema.
- **Konflikter mellom hurtigtaster.** Bokstavtaster må ikke virke når fokus står i et tekstfelt, særlig i fritekstsvaret. Mac-tegn som ⌘ og ⌥ må vises som Ctrl og Alt på Windows. Enkelttaster som ikke bruker Ctrl eller Alt, må kunne skrus av eller bare virke når elementet har fokus (WCAG 2.1.4).
- **Kommandopaletten er en ekstra funksjon** som koster tid å bygge, så den bør vurderes opp mot fristen.
