# Hybrid C: Mørk sidemeny, lyst innhold

**Personlighet:** Semesterlinjens rolige papirflate, men med en mørk sidemeny som ramme. Menyen gjør at appen ser mer «ferdig» og eksklusiv ut, og innholdet blir stående lyst og luftig.

## Idé

Innholdet er Semesterlinjen (konsept 08) nesten uendret: lyst papir, blekk og én farge per emne. Rundt innholdet ligger en mørk sidemeny i blekkfargen. Den har samme tre som i Tastaturet først (konsept 09): emner, og under det åpne emnet forelesningene etter dato. Treet er tegnet som en emnelinje med stasjoner, så fylt prikk betyr «øvd» og hul prikk betyr «ikke øvd ennå», akkurat som på linjene i innholdet. Øverst i menyen ligger et lite kort som alltid sier «Eksamen om 3 uker», med en liten semesterlinje, «I dag»-strek og antall forelesninger som er holdt og øvd. Klara ser altså hvor hun står i semesteret på hver side, ikke bare på forsiden og emnesiden.

Når Klara øver (flashcards og quiz), krymper menyen til en smal mørk stripe på 64 px. Stripen har ikoner med korte etiketter (Meny, Emner, Konto), fremdriften i økta som en loddrett linje med stopp, og «3 uker til eks.». Kortet og quizen får da nesten hele bredden.

## Hva er hentet fra hvilket konsept

| Fra | Hva |
|---|---|
| 08 Semesterlinjen | Hele innholdsflaten: papirpalett, emnefarger, t-banekartet på 02, den store linjen med søyler og tabellen på 03, filer og «Lag og øv» på 04, flashcardet og quizen på 07 og 09, semesterbåndet nederst under øving, «hører hjemme i»-merket, typografi og formspråk. |
| 09 Tastaturet først | Sidemenyen på hver side: tre med emner og forelesninger, valgt rad med markering, tellere (8, 5, 2), og at menyen blir et øktpanel med fremdrift under øving. Ikke kodeeditor-stilen, ikke monospace overalt, ikke kommandopalett. |
| Nytt i hybrid C | Mørk meny i Semesterlinjens blekk, emnefargene i lysere varianter for mørk bakgrunn, eksamenskortet med mini-semesterlinje, og den smale stripen under øving. |

Brødsmulestien i toppfeltet starter med «Oversikt» (samme navn som i menyen), og Konto og Logg ut har flyttet fra toppfeltet til bunnen av menyen.

## Palett

Innholdsflaten (som i konsept 08):

| Hex | Rolle | Kontrast |
|---|---|---|
| `#F6F5F1` | Bakgrunn (lyst papir) | – |
| `#FFFFFF` | Flater, kort, toppfelt, semesterbånd | – |
| `#161B26` | Blekk: tekst, primærknapper | 15,8:1 på papir |
| `#4B5262` | Sekundærtekst | 7,2:1 på papir, 7,8:1 på hvitt |
| `#D6D3CB` / `#ECEAE4` | Skillelinjer, rutenett (pynt) | – |
| `#B83E0C` / `#FBEDE5` | Markedsføring og aksent / tonet flate | 5,6:1 på hvitt, 4,9:1 på tonet |
| `#0B6585` | Samfunnsøkonomi | 6,5:1 |
| `#2D6A3B` | Organisasjon og ledelse | 6,5:1 |
| `#1D7037` / `#E6F2E9` | Riktig, kunne | 5,3:1 |
| `#B42318` / `#FBE8E6` | Feil, kunne ikke, slett | 5,6:1 |
| `#1F56D6` | Fokusring | 6,3:1 |

Mørk sidemeny (målt mot menyflaten `#161B26`, kortflaten `#232A38` og valgt rad `#2A3244`; den laveste verdien står sist):

| Hex | Rolle | Kontrast (laveste) |
|---|---|---|
| `#161B26` | Menyflate (Semesterlinjens blekk) | – |
| `#232A38` | Eksamenskortet, knappeflater i stripen | – |
| `#2A3244` | Valgt rad i treet | – |
| `#3A4254` | Skillelinjer i menyen (pynt) | – |
| `#F3F1EC` | Tekst i menyen | 15,3:1 / 11,4:1 |
| `#B4BAC7` | Dempet tekst (EMNER, tellere, ukenummer) | 8,9:1 / 6,6:1 |
| `#F0905F` | Markedsføring på mørkt (linje, prikker, tekst) | 7,3:1 / 5,4:1 |
| `#5BB8DE` | Samfunnsøkonomi på mørkt | 7,7:1 |
| `#7BC98A` | Organisasjon og ledelse på mørkt | 8,7:1 |
| `#7FD49B` | Kunne (stopp i fremdriften) | 9,7:1 |
| `#FF9B92` | Kunne ikke (✗ i fremdriften) | 8,5:1 |
| `#8AB4FF` | Fokusring i menyen | 8,3:1 |

Emnefargene fra konsept 08 er for mørke på blekkfargen (om lag 3:1), derfor har hvert emne en lysere variant i menyen. Det er samme fargetone, så Klara kjenner igjen Markedsføring som oransje både i menyen og i innholdet.

## Typografi

- `'Helvetica Neue', Arial, sans-serif` for alt grensesnitt: sidetitler 36–40 px / 800, «Eksamen om 3 uker» i menyen 24 px / 800, seksjonstitler 22 px / 800, brødtekst 16–18 px, menyrader 15 px, kortsvar 30 px / 700.
- `ui-monospace, Menlo, monospace` for data: datoer, ukenummer i treet, månedsetiketter og små etiketter som NESTE EKSAMEN og SPØRSMÅL.
- Etikettene i den smale stripen er 12–13 px fet tekst under ikonet. De er korte (Meny, Emner, Kort, 3 uker, Konto) og har høy kontrast, men de er under 16 px.

## Form og avstand

Som konsept 08: 4 px hjørner på knapper og rader, 6 px på kort og paneler, ingen skygger, linjer 3–8 px med runde ender, eksamen er alltid en firkantet endestasjon. 8-punkts skala (8 / 16 / 24 / 32 / 40 / 64 px). Faste mål: bred meny 304 px, smal stripe 64 px, toppfelt 64 px, innholdsmarg 40 px fra menyen.

## Sidemenyens oppførsel

- **Bred meny (02, 03, 04):** Logo, eksamenskortet, «EMNER» med «+ Nytt emne», raden «Oversikt», emnene med farget linjemerke og antall forelesninger. Det åpne emnet viser forelesningene som stasjoner på en loddrett emnelinje. Valgt rad har lysere flate og en stripe i emnefargen til venstre, og teksten er fet (ikke bare farge). Lange navn kortes av med «…», fullt navn står i innholdet og kan vises som verktøytips. Konto og Logg ut ligger nederst.
- **Eksamenskortet:** Viser emnet med nærmeste eksamen. På forelesningssiden er stasjonen for den forelesningen forstørret i den lille linjen.
- **Smal stripe (07, 09):** 64 px med Meny (åpner den brede menyen igjen, også med tasten M), Emner, fremdrift som en loddrett linje (fylt grønn prikk = kunne/riktig, ✗ = kunne ikke/feil, stor oransje prikk = nå, hul prikk = ikke ennå), «7/24» eller «4/15» som tekst, «3 uker til eks.» og Konto. Teksten over kortet («Kort 7 av 24 · Kunne 5 · Kunne ikke 1») gir det samme som tekst.
- I ekte kode bør menyen være et `nav`-element med `aria-current="page"` på valgt rad, og treet bør kunne brukes med piltaster.

## Universell utforming

- All tekst i både lys og mørk del har minst 4,5:1 kontrast (se tabellene). Lavest i menyen er Markedsføring-oransje på valgt rad med 5,4:1, og lavest i innholdet er oransje på tonet flate med 4,9:1.
- Øvd og ikke øvd skilles på form (fylt eller hul prikk), både i treet, i den lille linjen og i innholdet. Menyen har egen forklaring av prikkene.
- Riktig og feil vises med symbol og tekst: «✓ Riktig svar», «✗ Ditt svar», ✓ og ✗ på knappene, ✗ i fremdriftsstripen.
- Synlig fokusring (blå, 3 px, med luft) på «Kunne» og «Neste spørsmål». I menyen brukes en lys blå ring (`#8AB4FF`) som har 8,3:1 mot blekket.
- Valgt rad markeres med flate, stripe og fet tekst, ikke bare farge.
- Tabellen på emnesiden og tekstene i menyen gir de samme tallene som linjene, så grafikken er aldri eneste kilde.

## Endringer i datagrunnlaget

Eksamen i Markedsføring er satt til fredag 04.12.2026 (om 3 uker og 3 dager, skrevet som «om 3 uker»). For at Markedsføring skal være nærmeste eksamen i menyen, er de andre eksamenene flyttet: Organisasjon og ledelse 11.12 (om 4 uker) og Samfunnsøkonomi 15.12 (om 5 uker). Forelesningen 11.09.2026 er en fredag (konsept 08 skrev torsdag).

## Styrker

- Tydelig ramme: den mørke menyen skiller navigasjon fra innhold, og den lyse flaten blir roligere fordi den ikke trenger egen navigasjon.
- «Eksamen om 3 uker» og hvor mange forelesninger som er holdt, står synlig på hver side, ikke bare på 02 og 03.
- Treet bruker linje- og stasjonsformen fra Semesterlinjen, så menyen og innholdet snakker samme språk.
- Den smale stripen gir kortet plass under øving, men Klara mister ikke fremdriften eller veien tilbake.

## Svakheter og risiko

- Den brede menyen tar 304 px. På smale skjermer (under ca. 1100 px) må den være lukket som standard, ellers blir innholdet trangt, særlig tabellen på emnesiden.
- Mørk og lys flate side om side gir sterk kontrast i synsfeltet. Noen kan oppleve det som uroligere enn helt lyst.
- To sett emnefarger (mørke på lyst, lyse på mørkt) må holdes i takt når nye emner legges til.
- Eksamenskortet trenger eksamensdato, som ikke er et krav i PRD-en i dag. Uten dato må kortet vise noe annet, for eksempel «8 forelesninger holdt · 4 øvd».
- Etikettene i den smale stripen er 12–13 px. De er korte og har høy kontrast, men bør testes med forstørrelse.
- Semesterlinjen vises nå to steder på 02 og 03 (menyen og innholdet). Det kan føles som gjentakelse.
