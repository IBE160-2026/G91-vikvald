---
title: Avstemming av PRD mot research
created: 2026-11-09
prd: prd.md (utkast 2026-11-09)
inndata:
  - research/technical-valg-av-sprakmodell-og-demomodus-2026-10-28/research.md (Azure-anbefalingen er erstattet av Gemini på Vertex AI, endepunkt `eu`)
  - research/pdf-og-norsk-test/resultater.md
  - research/research-temaer.md (alle deler unntatt F)
---

# Avstemming av PRD mot research

Her står funn fra researchen som burde påvirke krav eller begrensninger i PRD-en, men som mangler eller strider mot PRD-en. Valg av bibliotek, endepunkt og modellnavn hører hjemme i arkitekturen eller et addendum. Slike ting står samlet til slutt under «Kandidater for addendum».

Linjenumrene viser til filene slik de så ut 2026-11-09.

**Oversikt**

| # | Gap | Alvor |
|---|---|---|
| 1 | Formelsider: regelen for å oppdage dem er ikke testet, og formler kan forsvinne uten at noen merker det | Høy |
| 2 | Quiz: det riktige svaret er ofte lengst, feilsvarene er ikke troverdige, og quizen er ikke med i stikkprøven | Høy |
| 3 | Det står ikke om sidetall betyr PDF-side eller sidetallet som er trykt på siden | Middels |
| 4 | Huskeregler: regelen om forbokstaver passer dårlig til lister som 4P, og testen laget setninger, ikke forkortelser | Middels |
| 5 | Ventetid: NFR-16 er en antagelse som testene ikke støtter, og det står ikke om skjermen er låst mens innhold lages | Middels |
| 6 | Fagbegreper oversettes feil fra engelske kilder, quizspørsmål kan ikke rettes, og norsken måles ikke | Middels |
| 7 | Mock-modellen med faste svar kan stoppes av sidetallskontrollen når sensor laster opp en egen PDF | Middels |
| 8 | Kostnad og prøvekreditt er ikke nevnt som forutsetning eller begrensning | Lav |
| 9 | Personvern: databehandleravtale, at modellen bare kalles fra serveren, og hva som skjer ved publisering | Lav |
| 10 | Ingen grense for samlet mengde stoff per forelesning | Lav |
| 11 | Det står ikke hvordan formler vises for studenten | Lav |
| 12 | Ollama er tatt ut uten at valget er dokumentert | Lav |
| 13 | Lisensen for eksempelinnholdet: «del på samme vilkår» er ikke nevnt | Lav |

---

## 1. Formelsider: regelen for å oppdage dem er ikke testet, og formler kan forsvinne uten at noen merker det — **Høy**

**Kilde**
- resultater.md L24: «På side 127 og 128 i økonomiboka er formlene tegnet som vektorgrafikk, så de mangler helt i tekstuttrekket. […] Ingen av sidene har matematikkfont, og det kommer ingen feilmelding. Hvor mange sider som rammes i hele boka, er ikke målt.»
- resultater.md L91: «sender bilde av siden når siden ser ut til å ha formler som ikke er med i teksten, for eksempel mange vektortegninger. **Reglene for å oppdage slike sider er ikke testet.**»
- resultater.md L33: Med bare tekst meldte modellen fra om at formlene manglet, «begge stedene».

**Hva PRD-en mangler**
- FR-37 (L119) bruker formuleringen «ser ut til å ha formler». Den kan ikke testes, og PRD-en sier ikke at regelen er utestet.
- Det finnes ikke noe krav for tilfeller der regelen bommer. Da forsvinner formlene uten varsel, og FR-39 merker heller ikke innholdet, fordi merkingen avhenger av den samme regelen.
- Når modellen selv melder at noe mangler (L33), brukes ikke meldingen til noe.
- Suksesskriteriet «Formler» (L219) har ikke noe mål for hvor mange formelsider som oppdages.

**Forslag til retting**
- Gjør FR-37 testbar, for eksempel slik: «Sider der tekstuttrekket mangler formler, sendes som bilde. Kontrolleres på kjente testsider, for eksempel økonomiboka s. 127–128. Det er bedre å sende en side for mye som bilde enn en for lite.» Testen viste at bildet kostet bare omtrent 20 % flere tokens (4678 mot 5607, L35).
- Legg til en reserveløsning: melder modellen at noe ser ut til å mangle på en side, blir innholdet merket som i FR-39, eller siden sendes på nytt som bilde.
- Før regelen som en risiko eller et åpent punkt (issue) til den er testet.

## 2. Quiz: det riktige svaret er ofte lengst, feilsvarene er ikke troverdige, og quizen er ikke med i stikkprøven — **Høy**

**Kilde**
- resultater.md L79: «Det riktige svaret var det lengste alternativet i 7 av 9 spørsmål, selv om instruksen ba om like lange svar. Dette kan avsløre svaret.»
- resultater.md L78: «Feilsvar: Flere er ikke troverdige, for eksempel at en bilprodusent bør slutte å selge biler.»
- resultater.md L77: «Noen middels spørsmål er bare gjengivelse.»
- resultater.md L85: Appen bør sjekke i kode: «… gyldig indeks, gyldig side og **lengden på alternativene**.»

**Hva PRD-en mangler**
- FR-25 (L77) sier at plasseringen av det riktige svaret varierer, men ikke at lengden ikke skal avsløre det.
- FR-38 (L120) kontrollerer ikke lengden på alternativene.
- Ingen krav sier at feilsvarene skal være troverdige.
- Stikkprøven under «Kvalitet med ekte språkmodell» (L215–220) gjelder bare flashcards. Quizen er også må ha, men kvaliteten på den måles ikke, og det sjekkes heller ikke at nivåene i FR-23 faktisk er forskjellige.

**Forslag til retting**
- Utvid FR-25 eller FR-38: «Det riktige alternativet er ikke systematisk det lengste. Appen kontrollerer at det ikke er mye lengre enn feilsvarene.» Selve terskelen hører hjemme i arkitekturen.
- Legg til i FR-25: «Feilsvarene er troverdige for en student som ikke kan stoffet.»
- Legg til en stikkprøve av quizen under Suksesskriterier, for eksempel 20–30 spørsmål. Den sjekker faglige feil, troverdige feilsvar, om det riktige svaret er lengst, og at vanskelighetsgradene skiller seg.

## 3. Det står ikke om sidetall betyr PDF-side eller sidetallet som er trykt på siden — **Middels**

**Kilde**
- resultater.md L10: «Sidetall er PDF-sider.»

**Hva PRD-en mangler**
- FR-15, FR-26, FR-46 og FR-51 (L55, L78, L146, L154) og FR-38 sier «sidetall» uten å si hva det er.
- I bøker og foiler er sidetallet som står trykt på siden, ofte et annet enn PDF-sidetallet, for eksempel fordi forord og innholdsliste ikke er nummerert på samme måte. Da kan studenten lete på feil side, og den automatiske testen «sidetallet finnes i filen» kan bestå selv om studenten ikke finner siden.

**Forslag til retting**
- Presiser i FR-15: «Sidetallet er sidenummeret i PDF-filen, slik PDF-leseren viser det, ikke sidetallet som er trykt på siden.» Det kan også stå én gang under «Felles for alt generert innhold».
- Vurder om kilden skal vise begge når de er forskjellige. Det kan i så fall være en mulig utvidelse.

## 4. Huskeregler: regelen om forbokstaver passer dårlig til lister som 4P, og testen laget setninger, ikke forkortelser — **Middels**

**Kilde**
- resultater.md L62–66: Testen laget **setninger** der hvert ord begynner med riktig bokstav, for eksempel «Gamle Damer Aker Påskeski» (vurdert som lett å huske). For de fire P-ene ble huskeregelen «PPPP», som «gir ingen hjelp».
- resultater.md L69: «Modellen laget ingen huskeregel for en lang liste med demografiske faktorer, og meldte fra i stedet.»

**Hva PRD-en mangler**
- FR-41 (L134) sier «forbokstaven i hvert punkt satt sammen», altså en forkortelse. Memloggen (L38) gjør setninger til en mulig utvidelse. Det formatet som faktisk ble testet og vurdert som nyttig, er dermed tatt ut, og det som er beholdt, er ikke testet.
- Ingen krav sier hva som skjer når forbokstavene ikke gir en nyttig huskeregel, som ved like bokstaver (PPPP).
- Ingen krav sier hva som skjer når lista er for lang. FR-44 dekker bare at det ikke finnes noen modeller eller lister.

**Forslag til retting**
- Avklar med brukeren om FR-41 skal tillate en setning der hvert ord begynner med forbokstaven i punktet. FR-42 kan kontrollere begge formene.
- Legg til: «Gir forbokstavene ingen nyttig huskeregel (for eksempel bare like bokstaver), eller er lista for lang, lages modellkortet uten huskeregel, og studenten får beskjed og kan skrive sin egen (FR-43).»

## 5. Ventetid: NFR-16 er en antagelse som testene ikke støtter, og det står ikke om skjermen er låst mens innhold lages — **Middels**

**Kilde**
- resultater.md L80: Quiz fra 3 sider: «52,7 sekunder og 11 689 tokens, hvorav 7 112 til modellens tenking.»
- resultater.md L50–51: Flashcards fra 3 sider tok 17,3 sekunder med `3.5-flash` og 67,9 sekunder med `3.8-flash`.
- resultater.md L84: «Generering kan ta opptil ett minutt, så appen må vise fremdrift og **ikke låse skjermen**.»
- research.md L70: En forelesning på 3 000–10 000 ord gir 5 000–18 000 tokens inn.

**Hva PRD-en mangler**
- NFR-16 (L194) antar under ett minutt for 20 kort fra en hel forelesning. Testen målte nesten ett minutt for 9 quizspørsmål fra bare 3 sider. Antagelsen bygger ikke på målinger.
- FR-16 (L56) sier at studenten ser at appen jobber. Den sier ikke om hun kan bruke resten av appen imens, eller hva som skjer hvis hun går til en annen side.

**Forslag til retting**
- Endre NFR-16 til et mål som bygger på en måling med en realistisk forelesning, for eksempel 10–30 sider. Eller behold antagelsen og legg til «måles før arkitekturen».
- Legg til i FR-16: «Mens innhold lages, kan studenten bruke resten av appen. Hva som skjer hvis hun forlater siden, er bestemt: enten fortsetter genereringen, eller den avbrytes uten at noe lagres.»

## 6. Fagbegreper oversettes feil fra engelske kilder, quizspørsmål kan ikke rettes, og norsken måles ikke — **Middels**

**Kilde**
- resultater.md L70: «Modellen brukte "Promotering" om den fjerde P-en, men riktig norsk begrep er "Påvirkning" […]. Kortene må derfor kunne rettes, og testen må også kjøres på norske notater.»
- resultater.md L51–52: Fornorskede lånord («ruralt», «lokasjon») og skrivefeil («jobtype»).
- resultater.md L86: «Brukeren må kunne rette eller slette innhold, også når begrepene er feil oversatt.»

**Hva PRD-en mangler**
- FR-33 (L105) sier at innholdet skal være på bokmål, men ikke at norske fagbegreper som står i notatene, skal brukes som de står.
- FR-31 (L87) lar studenten slette, men ikke rette, quizspørsmål. Et spørsmål med feil begrep må da slettes, selv om resten er bra. Det er et bevisst valg (memlogg L31–32), men PRD-en nevner ikke denne ulempen.
- Suksesskriteriene teller faglige feil, men ikke språkfeil eller feil fagbegreper.

**Forslag til retting**
- Legg til i FR-33: «Står et norsk fagbegrep i notatene, brukes det begrepet.»
- La stikkprøven også telle feil norske fagbegreper og språkfeil, enten som en del av «faglige feil» eller som et eget tall.
- Skriv i begrunnelsen for FR-31 at quizspørsmål med feil begrep må slettes og lages på nytt.

## 7. Mock-modellen med faste svar kan stoppes av sidetallskontrollen når sensor laster opp en egen PDF — **Middels**

**Kilde**
- research.md L119: Mock-modellen viser «Hele flyten: last opp → "generer" → valider → lagre → vis» og «gir samme svar hver gang».
- research.md L127: «valider alle svar mot samme skjema» uansett leverandør.

**Hva PRD-en mangler**
- NFR-2 (L164) sier at mock-modellen gir faste svar, og at alle funksjoner kan prøves i demomodus.
- FR-38 forkaster innhold med sidetall som ikke finnes i filen. Laster sensor opp en egen PDF på 2 sider, og de faste svarene viser til side 5, blir alt forkastet. Da ser det ut som om genereringen feiler.
- Det står ikke hva sensor skal se når hun genererer fra en egen fil i demomodus.

**Forslag til retting**
- Presiser i NFR-2: «Mock-modellens svar tilpasses den opplastede filen (sidetallene finnes alltid i filen), slik at hele flyten med kontroll (FR-38) kan prøves på en hvilken som helst PDF. Det går tydelig fram at innholdet er eksempelinnhold.»

## 8. Kostnad og prøvekreditt er ikke nevnt som forutsetning eller begrensning — **Lav**

**Kilde**
- research.md L24: «Pris avgjør ikke», under $1–2 per semester.
- research.md L95: Google Cloud-prøveperioden gir $300 i 90 dager og krever kredittkort. Det er «ikke sagt eksplisitt at den dekker Gemini på Vertex».
- research-temaer.md L110: «Ikke bekreftet: at kallene trekkes fra prøvekreditten.»
- research.md L88 og resultater.md L80: Tenkingen kan stå for over halvparten av tokenene.

**Hva PRD-en mangler**
- PRD-en sier ingenting om at bruk med ekte modell krever en egen Google Cloud-konto med kredittkort, eller at kostnaden er antatt å være lav, men ikke bekreftet.

**Forslag til retting**
- Legg til en linje under Begrensninger eller som forutsetning: «Ekte språkmodell krever et eget Google Cloud-prosjekt. Kostnaden er anslått til under noen kroner per semester, men det er ikke bekreftet at bruken dekkes av prøvekreditten. Sensor trenger ikke dette (NFR-2).»

## 9. Personvern: databehandleravtale, at modellen bare kalles fra serveren, og hva som skjer ved publisering — **Lav**

**Kilde**
- research.md L37: Databehandleravtale hos Google: «Trolig. Google Clouds DPA inngår i avtalen med "entity or person"».
- research.md L35–43: Databehandleravtale var ett av de fire kravene leverandørene ble vurdert etter.
- research-temaer.md L21: «Modellkallet bør uansett gå via serveren […]. Aldri i repoet, og aldri i variabler med `VITE_` eller `NEXT_PUBLIC_`.»
- research-temaer.md L22: Vercel kjører som standard i USA. Da kan brukerdata gå via USA selv om Vertex ligger i EU.

**Hva PRD-en mangler**
- NFR-5 (L170) nevner EU/EØS, ingen trening og at mellomlagring er slått av, men ikke databehandleravtalen.
- Ingen krav sier at hemmeligheter og modellkall aldri skal kunne nås fra nettleseren. NFR-4 dekker bare at hemmelighetene holdes utenfor Git.
- «Publisering på nett» er utenfor (L253), men det står ikke at publisering ville kreve at også serveren kjører i EU.

**Forslag til retting**
- Legg til i NFR-5: «… og med databehandleravtale gjennom leverandørens vilkår (antatt dekket av Google Clouds DPA).»
- Legg til i NFR-4 eller NFR-7: «Modellen kalles bare fra serveren. Nøkler og tilgang til modellen sendes aldri til nettleseren.»
- Legg til i Utenfor: «Publiseres appen senere, må også serveren kjøre i EU for å oppfylle NFR-5.»

## 10. Ingen grense for samlet mengde stoff per forelesning — **Lav**

**Kilde**
- research.md L70: Anslaget for tokens per forelesning gjelder 3 000–10 000 ord.
- research.md L120: Begrenset kontekst kan kutte lange PDF-er. Det gjelder Ollama, men viser at lengden har betydning.

**Hva PRD-en mangler**
- NFR-15 setter en grense på 50 sider per fil. FR-3 tillater flere filer per forelesning, men ingen krav begrenser summen. Da gjelder antagelsen om ventetid i NFR-16 og kostnadsanslaget ikke lenger.

**Forslag til retting**
- Sett en grense for samlet antall sider per forelesning (for eksempel 50 eller 100), eller skriv at grensen avklares i arkitekturen.

## 11. Det står ikke hvordan formler vises for studenten — **Lav**

**Kilde**
- resultater.md L41–42: Formlene fra bildekjøringen ble gjengitt som ren tekst, for eksempel `((Q2 - Q1) / ((Q2 + Q1) / 2)) * 100`.

**Hva PRD-en mangler**
- PRD-en sier ikke om formler vises som ren tekst eller med matematisk notasjon. Det påvirker suksesskriteriet «gjengir formlene riktig» (L219) og universell utforming (skjermlesere).

**Forslag til retting**
- Bestem det på kravnivå, for eksempel «Formler vises som lesbar tekst i MVP. Matematisk notasjon er en mulig utvidelse», eller overlat valget til UX-arbeidet.

## 12. Ollama er tatt ut uten at valget er dokumentert — **Lav**

**Kilde**
- research.md L123 og L137: Anbefalingen er mock-modell som standard, «med Ollama som valgfritt tillegg».

**Hva PRD-en mangler**
- NFR-4 (L166) gir bare valget mellom mock og Gemini. Det er greit, men PRD-en og memloggen sier ikke at Ollama ble valgt bort, eller hvorfor. Sensorveiledningen ser etter sporbare beslutninger.

**Forslag til retting**
- Legg til én linje under Mulige utvidelser eller i en beslutningslogg: «Lokal modell (Ollama) for sensor er valgt bort i MVP: svakere norsk og tungt oppsett (research.md seksjon 3–4).»

## 13. Lisensen for eksempelinnholdet: «del på samme vilkår» er ikke nevnt — **Lav**

**Kilde**
- research-temaer.md L31: «PDF-ene legges ikke i repoet, og generert innhold fra bøkene som legges i repoet, må krediteres og deles under samme lisens.»
- resultater.md L10: Kortene er bearbeidet fra bøkene og deles under samme lisens.

**Hva PRD-en mangler**
- NFR-3 (L165) sier «kreditert der lisensen krever det», men ikke at innholdet må deles under samme lisens (CC BY-NC-SA). Det sier heller ikke at OpenStax-PDF-ene ikke skal ligge i repoet. Formeltesten (L219) bygger på sider fra økonomiboka som sensor da ikke har tilgang til.

**Forslag til retting**
- Utvid NFR-3: «… og deles under samme lisens (CC BY-NC-SA 4.0). PDF-er fra OpenStax legges ikke i repoet. README forklarer hvor de lastes ned for å gjenta formeltesten.»

---

## Kandidater for addendum

Dette er implementasjonsdetaljer fra researchen som ikke hører hjemme i PRD-en, men som bør tas med i arkitekturen eller et teknisk addendum:

- **Leverandør og endepunkt:** Gemini på Vertex AI med multiregionalt endepunkt `eu`. Ikke bruk det globale endepunktet. `europe-west3` har bare `gemini-3.5-flash`, og `europe-west4` hadde ingen av de testede modellene (research-temaer.md L104–108). Azure er utelukket fordi studentabonnementet ikke fikk kvote i EU (L95–101).
- **Modell:** `gemini-3.5-flash` er foreløpig anbefalt (resultater.md L92). Modellnavnet bør kunne endres i `.env` uten kodeendring, fordi modeller forsvinner (2.5-flash ga 404).
- **Mellomlagring:** `disableCache: true` på prosjektet (research.md L46, research-temaer.md L103).
- **Autentisering:** Lokalt brukes `gcloud` uten nøkkelfil (Application Default Credentials). Det må stemme med NFR-4, som sier at hemmeligheter ligger i `.env`.
- **Byttbar leverandør:** En modul som leser `LLM_PROVIDER` (`mock` | `vertex`), og samme valideringsskjema for alle leverandører, også mock. Strukturert output med `responseSchema` (research.md L37, L127).
- **Validering i kode:** Forbokstaver i huskeregler, nøyaktig 4 alternativer, gyldig indeks for riktig svar, gyldig PDF-side, lengden på alternativene og påkrevde felt (resultater.md L85).
- **PDF-uttrekk:** Tekst per PDF-side som standard. Regelen for å sende bilde av siden (for eksempel mange vektortegninger og lite tekst) bygges og testes på økonomiboka s. 127–128 (resultater.md L24, L91).
- **Tenking:** Mengden tenking (thinking budget) må testes opp mot kvalitet, tid og kostnad. Tenkingen sto for 7 112 av 11 689 tokens i quiztesten (resultater.md L80, L87).
- **Instrukser (prompts):** Må forbedres for feilsvar i quizen og like lange alternativer (resultater.md L87).
- **Prisdato:** Prisen på Gemini 3.8 Flash dobles 2027-01-01, og vilkår og priser bør sjekkes på nytt innen 2027-01-28 (research.md L195–202). Det er etter innleveringsfristen, men er relevant hvis appen brukes videre.
- **Publisering senere:** Velg en stakk som kan kjøre på Vercel, og sjekk om EU-region (`fra1`/`arn1`) er tilgjengelig på Hobby-planen (research-temaer.md L19–22).
- **Mock og eksempeldata:** Det samme eksempelinnholdet brukes i demoen, i testene og i README (research.md L123).
