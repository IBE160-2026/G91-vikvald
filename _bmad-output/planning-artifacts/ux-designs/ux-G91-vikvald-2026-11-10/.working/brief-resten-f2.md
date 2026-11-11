# Brief: de ti resterende sidene i stilen til F2-V1 (signaturfarge)

Silje har valgt **F2-V1 «Signaturfarge»** som designretning. Fem sider finnes allerede i `hybrid-f2-v1/` (02, 03, 04, 07, 09). Du lager noen av de ti som mangler, i nøyaktig samme stil, slik at alle 15 sidene ser ut som én app.

Alle stier er relative til `/Users/Silje/Desktop/G91-vikvald/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/.working/`.

## Les først

- `brief-konsepter.md`: innhold og tekst for hver side (sidene 01–15), krav til universell utforming og SVG-teknikk. Innholdet der gjelder.
- `hybrid-f2-v1/konsept.md` og de fem SVG-ene i `hybrid-f2-v1/`: stilen du skal følge (også `hybrid-f2/konsept.md` for utformingen).
- Generatoren: `/private/tmp/claude-502/-Users-Silje-Desktop-G91-vikvald/c9e86afd-a37b-4a8e-854e-b78c11e28a0b/scratchpad/hf/genF2farge.py` kjørt med variant `v1` (tegnbredder i `scratchpad/hf/f2/m/widths.json`). Kopier til en egen fil i samme mappe (navnet står i oppdraget ditt) og gjenbruk tokens, sidemeny, øktpanel, knapper, lenker og hjelpefunksjoner. **Ikke endre genF2.py, genF2farge.py eller de eksisterende SVG-ene.**

## Stilregler fra F2-V1 (må følges)

Følg F2-V1 slik den er i `hybrid-f2-v1/` og `hybrid-f2-v1/konsept.md`: samme farger (papir, flater, blekk, dempet, kanter og linjer som i generatoren med variant v1), merkefargen ultramarin #3A3FB0 på hovedknapper, tekstknapper som er handlinger, valgt rad, «I dag»/«Du er her», fremdrift og logo-prikken, svart fokusring (ikke blå), samme skrift (SF Pro via -apple-system), samme toppfelt med ikoner for Konto og Logg ut, samme sidemeny og øktpanel, samme knappestiler (hovedknapp i merkefargen bare for det Klara gjør oftest, omriss for sjeldnere handlinger, tekstknapper med ikon/pil), ingen understreking utenom kildelenken, tabulære tall, 8-punkts avstandsskala, tynne kanter og svært myke skygger. Oransje #B83E0C bare som Markedsføring-farge. Riktig/feil med symbol + tekst + farge. Synlig fokusring der det er naturlig (startfokus på det trygge valget i bekreftelser). Destruktiv hovedknapp i slettedialogen kan være rød fylt (#B42318), og bare der.

## Hvilken meny på hvilken side

- **01 Logg inn:** ingen sidemeny og ingen Konto/Logg ut. Rolig, sentrert skjema. Gjerne en liten, dempet semesterlinje som bilde/tema, men ikke noe støy.
- **05 Vilkår, 06 Lag quiz, 14 Slett fil:** dialoger over forelesningssiden (04) med et dempet slør (bakgrunnen er F2-V1-siden 04, nedtonet). Dialogen er hvit med tynn kant.
- **15 Konto:** emnemeny i sidemenyen uten valgt forelesning. Demomodus-merke diskret.
- **11 Modellkort, 12 Fritekst:** øktpanel i sidemenyen som på 07/09 (teller, fremdrift, rutenett, symbolforklaring, «Avslutt økt»). For fritekst: selvvurdering i rutenettet (✓ riktig, ◐ delvis, ✗ feil).
- **08 Flashcards ferdig, 10 Quizresultat:** øktpanelet i ferdig tilstand (alle ruter fylt), innholdet viser resultatet. Resultatet skal være rolig, ikke feiring.
- **13 Sammendrag:** emnemeny med «Uke 37: Merkevare» valgt. Sammendraget leses som en artikkel med god linjelengde (maks ca. 75 tegn), kilde på hvert punkt.

## Kvalitet

Valider XML. Gjengi hver side i headless Chrome (`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --window-size=1440,900 --screenshot=<png> file://<svg>`), se på PNG-ene, og rett overlapp, overløp og ubalanse. Minst to runder. Sammenlign side ved side med F2-V1-sidene: samme marger, toppfelt, menybredde, skriftstørrelser og knapper. Kontrast minst 4,5:1. Ikke spør brukeren. Ikke commit.

Legg SVG-ene i `hybrid-f2-v1/`. Skriv ikke over konsept.md; legg i stedet til notater om dine sider i en egen fil `hybrid-f2-v1/notater-<navn>.md` (navnet står i oppdraget).

Returner bare: hvilke filer du laget, én setning om resultatet, om alle SVG-ene validerte, og eventuelle egne tolkninger Silje bør vite om.
