# Viktige prompts

Nyeste først. Brukt med Claude Code. Prompts skrevet før 2026-11-05 er hentet tilbake fra øktene.

## 2026-11-21: Story 2.2 bygd av den autonome kjøringen

Storien ble bygd av en subagent i den autonome kjøringen, med story-prompten i [autonom-kjoring.md](../../_bmad-output/implementation-artifacts/autonom-kjoring.md) (avsnittet «Story-prompten») og nøkkelen `2-2-legg-til-forelesninger-og-finn-dem-i-sidemenyen`. Hensikten til `bmad-build-auto` var «Story 2.2 fra `_bmad-output/planning-artifacts/epics.md`: Legg til forelesninger og finn dem i sidemenyen».

**Resultat:** Tabellen `lectures` med migrering, rutene for forelesninger, forelesningstabellen på emnesiden, forelesningssiden, dialogene «Ny forelesning», «Nytt navn» og «Endre dato», og en sidemeny der emner åpnes og lukkes. Spesifikasjon og gjennomgang i [spec-2-2](../../_bmad-output/implementation-artifacts/spec-2-2-legg-til-forelesninger-og-finn-dem-i-sidemenyen.md).

## 2026-11-21: Story 2.1 bygd av den autonome kjøringen

Storien ble bygd av en subagent i den autonome kjøringen, med story-prompten i [autonom-kjoring.md](../../_bmad-output/implementation-artifacts/autonom-kjoring.md) (avsnittet «Story-prompten») og nøkkelen `2-1-opprett-emner-og-se-dem-på-forsiden`. Hensikten til `bmad-build-auto` var «Story 2.1 fra `_bmad-output/planning-artifacts/epics.md`: Opprett emner og se dem på forsiden».

**Resultat:** Tabellen `subjects` med migrering, rutene for emner, forsiden med emneliste og tom-tilstand, emnesiden med sidemeny og dialogene «Nytt emne», «Nytt navn» og «Endre eksamensdato». Spesifikasjon og gjennomgang i [spec-2-1](../../_bmad-output/implementation-artifacts/spec-2-1-opprett-emner-og-se-dem-paa-forsiden.md).

## 2026-11-21: Funn #69 rettet av den autonome kjøringen

Funnet fra Siljes gjennomgang av epic 1 (#67) ble rettet av en subagent i den autonome kjøringen, etter avsnittet «Siljes gjennomgang» i [autonom-kjoring.md](../../_bmad-output/implementation-artifacts/autonom-kjoring.md). Det var bare en endring i dokumentasjonen, så `bmad-build-auto` ble ikke brukt.

**Resultat:** Teksten om «Fant ikke siden», databaseendringene og hvordan appen stoppes, er flyttet ordrett fra «Logg ut» til «Start appen» i README. Commit `329223e`.

## 2026-11-20: Funn #68 rettet av den autonome kjøringen

Funnet fra Siljes gjennomgang av epic 1 (#67) ble rettet av en subagent i den autonome kjøringen, etter avsnittet «Siljes gjennomgang» i [autonom-kjoring.md](../../_bmad-output/implementation-artifacts/autonom-kjoring.md). Hensikten til `bmad-build-auto` var å ta i bruk shadcn/ui og bytte ut de håndlagde komponentene, slik issue #68 beskriver.

**Resultat:** Knappene, feltene og dialogen er shadcn-komponenter tilpasset DESIGN.md, og sidene ser ut som før. Spesifikasjon: [spec-gh-68-ta-i-bruk-shadcn-ui.md](../../_bmad-output/implementation-artifacts/spec-gh-68-ta-i-bruk-shadcn-ui.md).

## 2026-11-20: Brukerreisetestene utvidet etter epic 1

Brukerreisetestene ble utvidet av en subagent i den autonome kjøringen etter at epic 1 var ferdig, etter avsnittet «Brukerreiser» i [autonom-kjoring.md](../../_bmad-output/implementation-artifacts/autonom-kjoring.md).

**Resultat:** Én Playwright-fil per flyt i `frontend/e2e/brukerreiser/`, med de bygde stegene i flyt 1 (konto, innlogging, forsiden og utlogging), og oversikten [brukerreiser.md](../testing/brukerreiser.md).

## 2026-11-20: Story 1.6 bygd av den autonome kjøringen

Storien ble bygd av en subagent i den autonome kjøringen, med story-prompten i [autonom-kjoring.md](../../_bmad-output/implementation-artifacts/autonom-kjoring.md) (avsnittet «Story-prompten») og nøkkelen `1-6-bruk-appen-innlogget-logg-ut-og-få-fant-ikke-siden`. Hensikten til `bmad-build-auto` var «Story 1.6 fra `_bmad-output/planning-artifacts/epics.md`: Bruk appen innlogget, logg ut og få «Fant ikke siden»».

**Resultat:** Rammen med toppfelt og forsiden «Dine emner», vakt med `/me`, utlogging, «Du er logget ut» bare i fanen som var innlogget, «Fant ikke siden», `get_owned`, rutetest for `current_user` og felles dialog. Spesifikasjon og gjennomgang i [spec-1-6](../../_bmad-output/implementation-artifacts/spec-1-6-bruk-appen-innlogget-logg-ut-og-faa-fant-ikke-siden.md).

## 2026-11-20: Story 1.5 bygd av den autonome kjøringen

Storien ble bygd av en subagent i den autonome kjøringen, med story-prompten i [autonom-kjoring.md](../../_bmad-output/implementation-artifacts/autonom-kjoring.md) (avsnittet «Story-prompten») og nøkkelen `1-5-logg-inn`. Hensikten til `bmad-build-auto` var «Story 1.5 fra `_bmad-output/planning-artifacts/epics.md`: Logg inn».

**Resultat:** Innlogging med likt svar for feil e-post og feil passord, `current_user`, `/me` og siden «Logg inn» med lenker begge veier. Spesifikasjon og gjennomgang i [spec-1-5](../../_bmad-output/implementation-artifacts/spec-1-5-logg-inn.md).

## 2026-11-20: Story 1.4 bygd av den autonome kjøringen

Storien ble bygd av en subagent i den autonome kjøringen, med story-prompten i [autonom-kjoring.md](../../_bmad-output/implementation-artifacts/autonom-kjoring.md) (avsnittet «Story-prompten») og nøkkelen `1-4-opprett-konto`. Hensikten til `bmad-build-auto` var «Story 1.4 fra `_bmad-output/planning-artifacts/epics.md`: Opprett konto».

**Resultat:** Registrering med tabellen `users`, bcrypt og innloggingscookie, designtokens, Inter, felles komponenter og siden «Opprett konto». Spesifikasjon og gjennomgang i [spec-1-4](../../_bmad-output/implementation-artifacts/spec-1-4-opprett-konto.md).

## 2026-11-20: Story 1.3 bygd av den autonome kjøringen

Storien ble bygd av en subagent i den autonome kjøringen, med story-prompten i [autonom-kjoring.md](../../_bmad-output/implementation-artifacts/autonom-kjoring.md) (avsnittet «Story-prompten») og nøkkelen `1-3-vis-feil-på-norsk-og-les-innstillinger-fra-ett-sted`. Hensikten til `bmad-build-auto` var «Story 1.3 fra `_bmad-output/planning-artifacts/epics.md`: Vis feil på norsk og les innstillinger fra ett sted».

**Resultat:** Felles feilformat, meldingsfil, fetch-transport, TanStack Query og innstillingene `LLM_PROVIDER` og de tre bryterne med `GET /api/config`. Spesifikasjon og gjennomgang i [spec-1-3](../../_bmad-output/implementation-artifacts/spec-1-3-vis-feil-paa-norsk-og-les-innstillinger-fra-ett-sted.md).

## 2026-11-20: Story 1.2 bygd av den autonome kjøringen

Storien ble bygd av en subagent i den autonome kjøringen, med story-prompten i [autonom-kjoring.md](../../_bmad-output/implementation-artifacts/autonom-kjoring.md) (avsnittet «Story-prompten») og nøkkelen `1-2-kjør-testene-automatisk-ved-hver-pull-request-kan-kuttes`. Hensikten til `bmad-build-auto` var «Story 1.2 fra `_bmad-output/planning-artifacts/epics.md`: Kjør testene automatisk ved hver pull request».

**Resultat:** CI i GitHub Actions som kjører pytest og Vitest ved hver pull request. Spesifikasjon og gjennomgang i [spec-1-2](../../_bmad-output/implementation-artifacts/spec-1-2-kjor-testene-automatisk-ved-hver-pull-request.md). PR #38.

## 2026-11-20: Story 1.1 bygd av den autonome kjøringen

Storien ble bygd av en subagent i den autonome kjøringen, med story-prompten i [autonom-kjoring.md](../../_bmad-output/implementation-artifacts/autonom-kjoring.md) (avsnittet «Story-prompten») og nøkkelen `1-1-sett-opp-skjelettet-som-starter-med-én-kommando`. Hensikten til `bmad-build-auto` var «Story 1.1 fra `_bmad-output/planning-artifacts/epics.md`: Sett opp skjelettet som starter med én kommando».

**Resultat:** Skjelettet med Docker Compose, backend og frontend. Spesifikasjon og gjennomgang i [spec-1-1](../../_bmad-output/implementation-artifacts/spec-1-1-sett-opp-skjelettet-som-starter-med-en-kommando.md).

## 2026-11-20: Forberede den autonome kjøringen

> jeg ønsker å bruke goal kommandoen for å gjennomføre alle epics og stories autonomisk uten human in the loop. men før vi gjør det, må vi klargjøre hva jeg må gjøre i forkant, blant annet sørge for at nødvendige API nøkler er på plass, og at nødvendige cli programmer er på plass. Lag en liste over hva jeg må gjøre, slik at du kan gjennomføre alle stories automatisk (du skal da bruke subagenter for hver story).

KI lagde en liste over forberedelser og fem avgjørelser bare jeg kunne ta.

> hvorfor node 22 og ikke node 26?

KI innrømmet at det ikke var noen sterk teknisk grunn, bare at technology.md bruker Node 22.

> vi går for node 22

> 1-4. ja, 5. har ikke skrevet eksempelnotater

> vil ha som målkriterie også at alle user journeys har blitt gjennomført via playwright, slik at all ønsket funksjonalitet på nettsiden er testet

**Resultat:** Avgjørelsene, `sprint-status.yaml` og instruksen til kjøringen (`2267b08`, `ba89386`). Brukerreisene ble en del av målet (`3720846`). Se `beslutninger.md`.

## 2026-11-20: Gjennomgang av epics.md

> bmad-help

> bmad-review

KI valgte selv å gjennomgå `epics.md`, som var det den nettopp hadde foreslått. Fire subagenter brukte hvert sitt perspektiv: kritisk, kanttilfeller, struktur og språk.

> ja

> er dette i tråd med sensorveiledning og tilbakemelding?

Spurt to ganger, om suksesskriteriene og om «Øv nå». Begge gangene fant KI noe å rette i sitt eget forslag.

**Resultat:** De sju funnene flere fant uavhengig av hverandre og fire motsigelser ble rettet, ett punkt om gangen etter godkjenning (`168bfdd`–`795f0b4`). Resten er ført i issue #32.

## 2026-11-14: Epics og stories

> start epics and stories

> ikke bruk techology.md

> jeg ønsker at du legger inn epics som "vertical slices", dvs at koden er så isolert som mulig. men det er selvfølgelig vestentlig at du gjenbruker komponenter (DRY-prinsippet). lag heller fellesfoldere for felles komponenter eller biblioteker

> er dette så langt i tråd med sensorveiledning og tilbakemelding?

KI sjekket forslaget mot sensorveiledningen og tilbakemeldingene og fant at testing og universell utforming lå sist, i epic 6.

> c, bruk subagenter til stories

**Resultat:** Kravlista (`f6cb57f`) og ni epics (`70afae6`). Storiene skrives av subagenter, én per epic.

KI la fram hver epic med forslag til svar på de åpne spørsmålene. Epic 1 og 2 ble godkjent med:

> ja til alt

og epic 3–9 med:

> ja

> er det i tråd med sensorveiledning og tilbakemelding?

KI sjekket epicene mot sensorveiledningen og tilbakemeldingene og fant at omfanget fortsatt er den største risikoen. Det tas med i sprintplanleggingen.

**Resultat:** 9 epics og 43 stories, med dekning av alle 142 krav (`1c93690` til `415bf76`).

## 2026-11-14: Arkitektur

> bmad-architecture bruk technology.md som referanse, men tilpass denne til dette prosjektet for MVP

KI anbefalte én Next.js-app. Jeg valgte oppsettet i technology.md.

> vil i hovedsak bruke det som blir brukt i techology.md, men hvis du har store motsetninger og andre anbefalinger kan jeg få de, men vil ha grundig begrunnelse på hvorfor det er bedre

> hvorfor er vertex ai bedre når faglærer har laget techology.md?

> faglærer lager en dockerfil for å sensurere om dette ikke finnes fra før

**Resultat:** Arkitekturdokumentet (`69ec805`, `3934a34`). Det følger technology.md, med fire begrunnede avvik. Fem uavhengige gjennomganger fant feil som er rettet (#24).

## 2026-11-14: Gjennomgang av UX-dokumentene

> bmad-review

KI kjørte fire uavhengige gjennomlesninger (adversarial, edge-case-hunter, structure og prose) av DESIGN.md og EXPERIENCE.md, og sjekket dem mot PRD-en. Jeg tok de valgene som trengtes underveis, i spørsmålsdialoger.

**Resultat:** Funnene i `review-ux-2026-11-14.md` (`f5134a4`). Gruppe 1 og 2 er rettet (`9f44255`, `fcf09cf`). Gruppe 3 og 4 er ført i #18.

## 2026-11-13: Refleksjonsspørsmålene i PRD-tilbakemeldingen

> jeg synes dette er så vanskelig fordi jeg kan for lite om det

KI forklarte at spørsmålet handler om hvordan jeg tok valget, ikke om hvor mye jeg kan om teknologi.

> jeg sjekker selv mot læreboka, når jeg er usikker slår jeg opp. har bachelorgrad i markedsføringsledelse

**Resultat:** To svar i `refleksjoner.md` (`81e7b3f`, `0f8935e`), og metoden for stikkprøvene er presisert i PRD-en (`f5c6c82`).

## 2026-11-12: Følge opp tilbakemeldingen på PRD-en

> 3. vil være delaktig i alle beslutninger

KI hadde foreslått å gjøre alle endringene i én runde. I stedet ble hvert punkt i tilbakemeldingen lagt fram med forslag til tekst og godkjent før det ble skrevet inn.

> modellkort er flashcards, huskeregler er bare en måte å huske lettere ved å få en enklere måte å huske på

> vil ikke ha modellkort som egen rad

> trosser dette noe i tilbakemeldingen?

KI fant ingen konflikt, men pekte på at huskeregler blir et mindre synlig særtrekk.

**Resultat:** Milepæler, kuttrekkefølge og plan B, mock-regler, definisjon av økt og resultat, testbare krav, og fjerning av Huskeregler-raden i UX-designet. Commits `9e61265` til `8de0d81`, issue #20.

## 2026-11-11: Sjekke UX-arbeidet mot sensorveiledningen

> godkjenner, men er det vi har gjort i tråd med sensorveiledning og tilbakemelding?

KI fant at designet dekker det faglærer ba om, men at omfanget hadde vokst, og at PRD-en ikke hadde de nye kravene. Jeg svarte «ta begge nå».

**Resultat:** PRD-en fikk FR-56 til FR-58, og fire tillegg er merket «kan kuttes». Commit `2ff0218`.

## 2026-11-11: Fra «førsteutkast» til valgt retning

> ja, det ser ut som noe som var et førsteutkast og at man ikke orket å gjøre mer

KI lagde tre ferdigstilte varianter av F. Jeg likte F2 best, men:

> liker designet veldig godt og oppleves som ryddig og oversiktlig, men alt er i samme tone fargemessig, vet ikke hva som ville gjort det bedre

KI viste fire fargevarianter i stedet for å spørre mer. Jeg valgte: «velg f2 og gå videre», og presiserte «mente f2-v1:signaturfarge».

**Resultat:** Designretning F2-V1. Commits `b04c0de` og `790efa7`.

## 2026-11-10: Fra hybrid til valgt retning

Jeg forkastet hybrid D («for rotete og visuelt dårlig») og ga presise ønsker for E:

> ikke ha sidemeny på første side, gjør første side lik som første side på orginal semesterlinje, ha samme sidemeny som på tastaturet først, inkludert økt, men i farger som passer semesterlinje. ikke ha semesterlinje i sidemeny. […] rotet kom med sidemenyen

Om E spurte jeg «noe du ville endret?», og godtok KIs sju forslag til opprydding.

**Resultat:** Hybrid F, som jeg liker best så langt. Den er ikke valgt som endelig retning. Commit `2c00ce9`.

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
