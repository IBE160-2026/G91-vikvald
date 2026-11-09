# Korrigeringer av KI

Eksempler på at KI-forslag er avvist eller rettet, og på feil KI gjorde. Nyeste først.

| Dato | Hva KI gjorde | Hvem oppdaget det | Hva som ble gjort | Spor |
|---|---|---|---|---|
| 2026-11-09 | Satte ventetiden til under ett minutt, selv om testen fra 2026-11-05 brukte 53 sekunder på bare 9 spørsmål. | KI, i gjennomgangen mot researchen | Endret til under to minutter, og appen låses ikke mens den venter. | `8dac0a2` |
| 2026-11-09 | Skrev at huskeregelen alltid er forbokstavene, uten å sjekke at de fire P-ene da blir «PPPP». | KI, i gjennomgangen mot researchen | Modellkort lages uten huskeregel når alle punktene har samme forbokstav. | `8dac0a2` |
| 2026-11-09 | Skrev at mock-modellen gir faste svar. Da ville kontrollen av sidetall forkastet alt når sensor laster opp en egen PDF. | KI, i tre av fire uavhengige gjennomganger | Mock-modellen lager innhold ut fra den opplastede fila. | `8dac0a2` |
| 2026-11-09 | La til mange små detaljer i må ha-funksjonene uten å vurdere dem opp mot faglærers advarsel om omfang. | Jeg, da jeg ba KI sjekke mot tilbakemeldingen | Krav som kan kuttes ble merket. | `d7bd827` |
| 2026-11-05 | Testkort brukte «Promotering» om den fjerde P-en. Riktig norsk begrep er «Påvirkning». | Jeg, med fagkunnskap | Noterte feilen. Feil fagbegrep skal telle som feil i stikkprøven, og kort skal kunne rettes. | `5885f27` |
| 2026-11-05 | Foreslo spørreundersøkelse i stedet for intervjuer. | Jeg avviste den | Bruker offentlige kilder, og skriver begrensningen inn i PRD-en. | `2d18419` |
| 2026-11-05 | Beholdt målet om MVP i midten av november i planene. | Jeg stilte spørsmål ved det | Nytt mål, med tid til rapporten. | `99f4ecd` |
| 2026-11-05 | Foreslo å spørre foreleser og la foiler stå som mulig testmateriale. | Jeg bestemte at foiler ikke skal testes | Kortet ned e-posten til faglærer og fjernet spørsmålet. | `ec111dd` |
| 2026-11-05 | Hevdet at briefen manglet inndelingen i «må ha» og «bør ha». Den fantes allerede. | KI, da den leste briefen på nytt | Rettet påstanden og lot inndelingen stå. | Ingen filendring |
| 2026-11-05 | Oppga vektene for testing og README som andeler av hele karakteren. De gjelder del 1. | KI, ved gjennomgang av sensorveiledningen | Rettet opplysningen. | Denne filen |
| 2026-11-05 | Testskript i zsh tolket `$M:g…` som en spesiell endelse og sendte ødelagte adresser. Dette ga misvisende 404-feil. | KI, da samme kall virket 8 av 8 ganger | Rettet syntaksen og kjørte testen på nytt. | `900c650` |
| 2026-11-05 | Ny beslutning om bilde av siden var i strid med «Bare tekst i MVP» i briefen. | KI, ved gjennomgang av briefen | Rettet linjen i briefen. | `5cd30b0` |
| 2026-10-29 | Skrev publisering på nett som om det var bestemt. | Jeg presiserte at det er valgfritt | Skrev om punktet. | Se `.logs/` |
