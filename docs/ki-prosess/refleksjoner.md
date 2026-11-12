# Refleksjoner

Egne svar på refleksjonsspørsmål om KI-bruken, som grunnlag for rapporten. Svarene er mine; KI har hjulpet med å formulere dem ut fra det jeg har sagt. Nyeste først.

## 2026-11-13: Hvordan faglige feil avgjøres uten at KI vurderer seg selv

*Spørsmål fra [tilbakemeldingen på PRD-en](../../_bmad-output/planning-artifacts/prds/prd-G91-vikvald-2026-11-09/tilbakemelding-prd.md), del 7: «SK-13 krever under 5 % faglige feil, vurdert manuelt. Hvordan avgjør dere at et kort er faglig feil, og hvordan unngår dere å la KI-en bedømme sitt eget arbeid?»*

Jeg vurderer kortene selv. Jeg sjekker hvert kort mot læreboka og mot siden kortet viser til, og når jeg er usikker, slår jeg opp. Er jeg fortsatt usikker etterpå, teller kortet som feil. Jeg har en bachelorgrad i markedsføringsledelse, så jeg kan vurdere om innholdet er faglig riktig, og ikke bare om det står i kilden. Et kort er faglig feil hvis det sier noe annet enn læreboka, eller bruker feil fagbegrep, for eksempel «Promotering» der kilden sier «Påvirkning».

KI vurderer ikke sitt eget arbeid. Verken Gemini, som lager kortene, eller Claude, som jeg bruker i utviklingen, er med på å avgjøre om et kort er riktig. Resultatet føres i et regneark som legges i repoet, slik at vurderingen kan etterprøves.

## 2026-11-13: Hvordan jeg vurderte teknologistakken

*Spørsmål fra [tilbakemeldingen på PRD-en](../../_bmad-output/planning-artifacts/prds/prd-G91-vikvald-2026-11-09/tilbakemelding-prd.md), del 7: «Addendumet sier at teknologistakken ble «foreslått av KI … og godtatt». Hva gjorde at dere kunne vurdere forslaget, og hva hadde fått dere til å avvise det?»*

Jeg kunne for lite om programmering til å vurdere teknologistakken teknisk, og valgte det KI anbefalte. Jeg vurderte forslaget mot det jeg kunne sjekke: at appen kan gjøre det jeg vil, at det ikke koster noe så lenge det kan unngås, og at verktøyene kommer fra store, kjente aktører. Jeg ville avvist forslaget hvis det hadde kostet penger som kunne vært unngått, eller ikke dekket det appen skal gjøre.

Svakheten er at jeg ikke kjente alternativene og ikke ba om en sammenligning. I arkitekturfasen ber jeg derfor KI om å sammenligne stakken med et enklere alternativ, og begrunne den opp mot kravet i sensorveiledningen om at teknologien ikke skal være mer kompleks enn appen trenger.

Spor: beslutningen 2026-11-05 i [beslutninger.md](beslutninger.md). Til forskjell fra stakken fikk jeg flere alternativer å velge mellom for språkmodellen (se PRD-en, «Valg av språkmodell»).
