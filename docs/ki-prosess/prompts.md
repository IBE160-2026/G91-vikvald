# Viktige prompts

Nyeste først. Brukt med Claude Code. Prompts skrevet før 2026-11-05 er hentet tilbake fra øktene.

## 2026-11-10: Fra hybrid til valgt retning

Jeg forkastet hybrid D («for rotete og visuelt dårlig») og ga presise ønsker for E:

> ikke ha sidemeny på første side, gjør første side lik som første side på orginal semesterlinje, ha samme sidemeny som på tastaturet først, inkludert økt, men i farger som passer semesterlinje. ikke ha semesterlinje i sidemeny. […] rotet kom med sidemenyen

Om E spurte jeg «noe du ville endret?», og godtok KIs sju forslag til opprydding.

**Resultat:** Hybrid F er valgt som designretning. Commit `2c00ce9`.

## 2026-11-10: Tre forslag ut fra mine favoritter

> likte at semesterlinjen var oversiktlig, likte linjen som visste hvor lenge det var igjen til eksamen, samt hvor mange forelesninger som har vært, likte at fargene var rolig, men med farger på linjene, den føltes premium og oversiktiglig. Med tastaturet først likte jeg sidemenyene på hver side.

Jeg avbrøt et spørreskjema fra KI og forklarte heller med egne ord. KI lagde så tre forslag som skiller seg på farger, sidemeny og hva menyen gjør under øving.

**Resultat:** Hybrid A, B og C på fem sider, samlet i et galleri. Commit `06730a5`.

## 2026-11-10: Ti designkonsepter før detaljene

> jeg ønsker at du skisserer alle sidene for applikasjonen. jeg ønsker at du lager 10 forskjellige designkonsept. Jeg vil se svg baserte design konsept. Kjør ganske bred variasjon i kreativitet. […] Ikke spør meg nå. Jeg vil vurdere de 10 konseptene, før vi driller inn i detaljenene. Bruk 10 subagenter og sett alt sammen.

KI skrev en felles brief med de 15 sidene og innholdet fra PRD-en, og ga hver subagent en egen retning. Briefen ligger i [brief-konsepter.md](../../_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/.working/brief-konsepter.md).

**Resultat:** Ti konsepter med 15 SVG-skisser hver, samlet i et galleri. Commit `44a7164`.

## 2026-11-09: Fullføre PRD-en etter gjennomgang

Fire KI-assistenter gikk uavhengig gjennom PRD-en mot briefen, sensorveiledningen, researchen og en sjekkliste for PRD-er. Jeg tok de fire beslutningene de reiste:

> a. ja, b. uten huskeregel, ja, c. ja, d. ja

**Resultat:** Formelkravene kan kuttes, modellkort lages uten huskeregel når alle punktene har samme forbokstav, og ventetiden er satt til under to minutter. Commit `8dac0a2`.

## 2026-11-09: Velge eksempelmateriale til sensor

> har egne notater, men mye kan være kopiert fra foiler, så vet ikke om brukbarheten av det

**Resultat:** Eksempelemnet blir korte notater skrevet med egne ord, basert på OpenStax (NFR-3). Commit `62a095c`.

## 2026-11-09: Sjekke PRD-en mot faglærers tilbakemelding underveis

> ja, men stopp opp og tenk på tilbakemeldingene på product brief, er det vi holder på nå tråd med det faglærer ga tilbakemelding på?

> ja, er det ikke noe annet vi bør ta hensyn til? basert på sensorveiledning og tilbakemelding

**Resultat:** Krav som kan kuttes ble merket, PRD-en fikk en del om endringer fra briefen, og ti manglende punkter ble lagt til planen, blant annet formler, konfidensnivå, universell utforming og sletting av konto. Commit `d7bd827`.

## 2026-11-09: Brukerreisen PRD-en bygger på

> Klara har hatt en forelesning i markedsføring, hvor hun har lagd egne notater. Etter forelesningen åpner hun studiekamerat, laster opp sine egne notater fra forelesningen. Hun velger da noen dager senere å teste hvor mye av det hun lærte som sitter … Noen uker før eksamen, så samler hun alle flashcardene fra alle forelesningene og går gjennom alle sammen.

**Resultat:** Brukerreisene UJ-1 og UJ-2. De viste at quizen var glemt, og at fritekst og sammendrag måtte avklares. Commit `69e4340`.

## 2026-11-09: Regel for arbeidet

> bare pass på å alltid ta hensyn til sensorveiledningen i alle valg og ting vi gjør og gjerne forklar hva som skjer underveis

**Resultat:** PRD-en ble skrevet veiledet, del for del, med kobling til sensorveiledningen for hvert valg.

## 2026-11-05: Sjekke arbeidet mot sensorveiledningen

> er ting gjort i tråd med sensorveiledning og tilbakemelding på brief?

> hjelp meg å komme på riktig spor i forhold til veiledningen

**Resultat:** Sammenligningen viste at prompts ikke ble lagret, at GitHub Issues ikke var i bruk, og at commit-meldingene var for like. Dette førte til denne mappen.

## 2026-11-05: Sette ny tidsplan

> som tilbakemelding på brief, var det kanskje et urealistisk krav?

> vil være ferdig med litt margin så jeg har tid til rapport utenom som teller 30% av karakterern

> har ikke kravene til rapporten men er samme frist, vil ha en så god karakter som mulig, og siden prosjektet er klassifisert til enkelt så bør detaljene være på plass

**Resultat:** Mål om ferdig app 4. desember, og prinsippet om å kutte funksjoner før kvalitet. Commit `99f4ecd`.

## 2026-11-05: Velge testemne

> har mye kunnskap om markedsføring f.eks. men kan også teste på økonomifag, hva fungerer best?

> har ikke et fag dette semesteret hvor det er lønnsomt å bruke for har ingen puggefag

**Resultat:** Markedsføring som hovedemne, økonomi som formeltest og simulert repetisjon. Commit `22ecb39`.

## 2026-11-05: Avklare opphavsrett

> kan jeg ta forbehold om at man eier sine egne notater eller må jeg sende mail og spørre?

> tenker ikke å teste på foiler

**Resultat:** E-post til faglærer om brukeransvar, og foiler er tatt ut av testmaterialet. Commit `ec111dd`.

## 2026-11-05: Instrukser til språkmodellen i testene

Instruksene ligger i [generer_kort.py](../../_bmad-output/planning-artifacts/research/pdf-og-norsk-test/generer_kort.py). Denne ble brukt til flashcards:

> Lag 6 flashcards på norsk bokmål fra kildesidene. Bruk bare det som står på sidene, og finn ikke på noe. … Hvis en formel mangler eller er ufullstendig i kilden, skal du ikke gjette. Før den opp i `mangler`. Oppgi side for hvert kort.

**Resultat:** Modellen fant ikke på formler som manglet, og meldte fra om dem. Se [resultatene](../../_bmad-output/planning-artifacts/research/pdf-og-norsk-test/resultater.md). Commit `15e2886`.

## 2026-10-28: Starte research uten å bryte opphavsretten

> men vil ikke laste opp forelesningefoiler hvis det bryter med opphavsrett

**Resultat:** Regelen om at foiler og kurslitteratur ikke lastes opp i KI-verktøy, som står i `research-temaer.md`.
