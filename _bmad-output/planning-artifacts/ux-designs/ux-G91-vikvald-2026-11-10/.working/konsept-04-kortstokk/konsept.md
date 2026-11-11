# Konsept 04: Kortstokk

**Personlighet:** Leken, fargerik og taktil, men voksen. Appen føles som en kortstokk du kan ta i, sortere og bli ferdig med.

## Idé

Alt i Studiekamerat er bygd som bunker av kort. Hvert emne er en farget bunke, og høyden viser hvor mye stoff som ligger i den: Markedsføring har flere kort bak seg enn Organisasjon og ledelse. Forelesninger og innholdstyper vises også som stablede kort. Under øving sorterer Klara kortene i to bunker til hver side, «Kunne» og «Kunne ikke». På resultatsiden blir de to bunkene et søylediagram av ekte kort. Metaforen passer fordi flashcards allerede er kort. Den gjør fremdrift konkret: Klara ser bunken bli mindre og stabelen hun kunne bli høyere. Dermed blir appen motiverende uten poeng, merker eller maskoter.

## Palett

| Rolle | Hex | Bruk |
|---|---|---|
| Papir (bakgrunn) | `#FBF4E6` | Varm kremhvit flate bak alt |
| Blekk (tekst, konturer) | `#1D1A2F` | All brødtekst, 3 px konturer, harde skygger, primærknapper |
| Dempet tekst | `#4A4560` | Sekundærtekst, metadata (8,3:1 på papir) |
| Hvit | `#FFFFFF` | Kortflater |
| Korall | `#FF6F4F` | Emnefarge Markedsføring, aktiv øvingslinje, valgt alternativ (blekk på korall 6,2:1) |
| Korall lys | `#FFD9CF` | Bunkekort bak, toppfelt på kort, opplastingsflate |
| Kobolt | `#2B50D8` | Emnefarge Samfunnsøkonomi (hvit tekst 6,5:1) |
| Kobolt lys | `#D6E0FF` | Bunkekort bak for kobolt |
| Salvie | `#9CC5A1` | Emnefarge Organisasjon og ledelse (blekk 8,8:1) |
| Sol | `#FFC83D` | Status og hint: jobb pågår, «Ikke øvd ennå», demomodus, tips |
| Riktig / riktig lys | `#176B3C` / `#D4F0DC` | Riktig svar, «Kunne»-bunken |
| Feil / feil lys | `#A8291F` / `#FBDAD5` | Feil svar, feilmelding, «Kunne ikke»-bunken |
| Destruktiv | `#B3261E` | Bare «Slett fila» og «Slett kontoen» (hvit tekst 6,5:1) |
| Fokus | `#2B50D8` | 4 px ring med 6–8 px avstand rundt elementet |

Emnefargen styrer hele emnet: toppfeltet i øvingsmodus, bunkekortene og fremhevinger. Hvert emne får dermed sin egen stemning. Skissene viser Markedsføring (korall).

## Typografi

Rund, kraftig grotesk: `'Arial Rounded MT Bold', 'Nunito', 'Varela Round', 'Avenir Next', 'Helvetica Neue', Arial, sans-serif`.

- Display 46–58 px / 800 (sidetitler, «Bunken er gjennomgått!»)
- Store tall 48–120 px / 800 (kortantall, «11 av 15»). Tall er helter i denne retningen.
- Overskrift 22–34 px / 800
- Kortinnhold 25–27 px / 700 (svaret på flashcardet skal kunne leses på avstand)
- Brødtekst 18–20 px / 400
- Metadata og kilde 16–17 px / 400–700
- Små etiketter med sperring: 15 px / 800 med letter-spacing (FORSIDE, BAKSIDE, SPØRSMÅL 4)

## Form og hjørner

- Tykke blekkonturer på 3 px (4 px for valgt eller riktig/feil) rundt alle kort, felt og knapper.
- Harde, forskjøvne skygger uten uskarphet (4–10 px blekk nede til høyre). De gjør kortene taktile, som papp på et bord.
- Hjørneradius: kort 24–28 px, felt 16 px, knapper og brikker helt runde (pille).
- Bunker: 1–3 kort bak, vridd ±1–4°, eller forskjøvet trappevis. Antallet viser mengden innhold.
- Tomme tilstander og ting som ikke finnes ennå, har stiplet kontur. Det er en ledig plass i stokken.

## Avstandsskala

Basis 4 px: 4 · 8 · 12 · 16 · 24 · 32 · 48 px. Sidemarg 48 px, kolonneavstand 32–40 px og indre polstring i kort 24–40 px.

## Komposisjon

- **Oversikt:** en toppnavigasjon med logo (tre vridde kort i emnefargene), «Emner» og «Konto» som piller og «Logg ut» til høyre. Jobbstatus vises som en sol-gul pille i toppen, så den synes overalt.
- **Øvingsmodus:** Navigasjonen erstattes av en linje i emnefargen med «Avslutt økt», tittel og telleren («Kort 7 av 24»). Under ligger en fremdriftsstripe av små kort. Kortet står midt på siden med resten av bunken bak, og sorteringsbunkene ligger til venstre og høyre.
- **Resultat:** Tallene presenteres stort, og resultatet vises med kortene selv: bunker som søyler, og et rutenett med ett kort per spørsmål.

## Universell utforming

- All tekst er sjekket mot WCAG 2.1 AA (4,5:1). Riktig- og feilfarge brukes bare som tekst på hvit bakgrunn. På lyse tonede flater står teksten alltid i blekk.
- Riktig og feil vises aldri bare med farge. Det brukes alltid symbol og tekst («✓ Riktig svar», «✗ Ditt svar», «✗ Spørsmål 7»), og konturtykkelsen øker i tillegg.
- Alle skjemafelt har synlige etiketter over feltet. Feilmeldinger står i tekst med ikon under feltet, og feltet får tykkere rød kontur.
- Synlig fokusring på 4 px i kobolt med luft rundt elementet er vist på ett element per skjerm. Ved sletting har «Avbryt» fokus som trygt standardvalg.
- Brødtekst er minst 16 px, og innholdet på kortene er 25–27 px.
- Radiovalg har både fylt prikk og fargeendring, og valgt omfang har hake og ordet «Valgt».
- Kilde vises som tekst på alt generert innhold (fil og side), med et dokumentikon som bare er pynt.
- Destruktive handlinger har egen farge og egne ord, og dialogen forklarer konsekvensen med tall.

## Styrker

- Metaforen er sterk og konsekvent. Den gir mening i hele appen, ikke bare som pynt, fordi bunkehøyde, sorteringsbunker og søyler av kort sier noe om innholdet.
- Emnefargene gjør det lett å se hvor man er, og gjør det lett å skille emnene fra hverandre.
- Resultatsidene belønner med tall og stabler i stedet for poeng og merker. Det passer en voksen student.
- Høy kontrast og tykke konturer er bra for svaksynte og ser bevisst ut.

## Svakheter og risiko

- Bunker, vridde kort og harde skygger er mer arbeid å bygge i CSS enn flate kort, og kan bli rotete hvis detaljene ikke følges presist.
- Tre mettede emnefarger pluss sol, riktig og feil gir mange farger. Det krever disiplin for at det ikke blir et fargekart. Et fjerde eller femte emne trenger flere farger som også består kontrastkravet.
- Kobolt er både emnefarge og fokusfarge. På Samfunnsøkonomi-sider bør fokusringen kanskje være blekk i stedet.
- Arial Rounded finnes ikke på alle maskiner. Reserveskriften Helvetica/Arial gjør uttrykket mindre lekent.
- Den leke tonen kan oppleves som mindre seriøs av sensor hvis den drives lenger. Den må holdes nede i tekst og ikoner.
