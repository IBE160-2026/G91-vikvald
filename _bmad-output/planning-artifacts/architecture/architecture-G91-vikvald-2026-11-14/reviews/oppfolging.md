# Oppfølging av gjennomgangene

Fem uavhengige gjennomganger leste det første utkastet av arkitekturen (`69ec805`) 2026-11-14. Rapportene i denne mappa beskriver det utkastet. Tabellene viser hva som ble gjort med hvert funn.

**Status:** **Rettet** betyr endret i arkitekturen. **Utsatt** betyr ført som issue eller under «Utsatt» i arkitekturen. **Rettet i andre runde** betyr at funnet først ble oversett og er rettet etterpå, se «Andre runde» nederst.

Rettingene 1–13 ble godkjent av Silje og ligger i `3934a34`. Rettingen av adressen ved utvikling (rubrikk F1) ligger i samme commit som denne fila.

## Rubrikk ([review-rubric.md](review-rubric.md))

| Funn | Status | Hvor |
|---|---|---|
| F1 Utvikling og testing | Rettet | «Utvikling og testing», også `API_INTERNAL_URL=http://localhost:8000` |
| F2 Kaskadesletting i SQLite | Rettet | AD-13, AD-5, AD-7 |
| F3 Én prosess og egen sesjon for jobber | Rettet | AD-5 |
| F4 Hvem som teller innhold | Rettet | Modulgrafen, AD-7 |
| F5 Oppstart i Docker | Rettet | AD-14 |
| F6 Småhull (formelmerke, sidebilder, FR-2, FR-11, demodata, øktformat) | Rettet | AD-3, AD-6, AD-9, AD-14, kravtabellen |

## Avstemming mot PRD-en ([review-reconcile-prd.md](review-reconcile-prd.md))

| Funn | Status | Hvor |
|---|---|---|
| F1 Kritisk: strengt skjema velter hele jobben | Rettet | AD-4 |
| F2 Legge til eller erstatte, og eier av sammendrag | Rettet | AD-4, AD-7 |
| F3 Vilkårsgodkjenning (FR-11) | Rettet | AD-6 |
| F4 Formelmerke (FR-40/41) | Rettet | AD-6 |
| F5 Jobbfelter og ferdigmelding | Rettet | AD-5 |
| F6 Økt lagret to ganger | Rettet | AD-9 |
| F7 Hva mock-modellen får inn | Rettet i andre runde | Andre runde, punkt 1 |
| F8 Egen huskeregel (FR-46) mot kontrollen i FR-45 | Rettet i andre runde | Andre runde, punkt 2 |
| F9 Tenkenivå og mellomlagring som innstillinger | Rettet i andre runde | `VERTEX_THINKING` i AD-3. At README skal vise hvordan mellomlagring slås av: andre runde, punkt 3 |
| F10 Skjermleser og språk (NFR-12) | Rettet | `lang="nb"` i konvensjonene, levende område i AD-5 |
| F11 Små unøyaktigheter | Rettet i andre runde | FR-2 flyttet. Brytere i backend, under 5 sammendragspunkter og avviket fra addendumet: andre runde, punkt 4–6 |

## Avstemming mot technology.md og UX ([review-reconcile-tech-ux.md](review-reconcile-tech-ux.md))

| Funn | Status | Hvor |
|---|---|---|
| A1 SQLite-kaskade og delvis indeks | Rettet | AD-13, AD-5 |
| A2 Oppstart og bygging i Docker | Rettet | AD-14 |
| A3 Innlogging: levetid og testbruker | Rettet i andre runde | Levetid 30 dager i AD-10. Testbrukerens e-post og passord: andre runde, punkt 7 |
| A4 Sikkerhet for generert tekst | Rettet | Konvensjonen «Visning av innhold» |
| A5 Ruter når en bryter er av | Rettet i andre runde | Andre runde, punkt 4 |
| A6 Utelatte biblioteker i kuttlista | Rettet i andre runde | Andre runde, punkt 8 |
| B1 Jobbstatus på tvers av sider | Rettet | AD-5 |
| B2 Økt ved navigering og utlogging | Rettet | AD-9 |
| B3 Tilstand uten eier | Rettet | AD-6, AD-7, AD-11, konvensjonene |
| B4 Hva «øvd» betyr | Rettet | AD-9 |
| B5 Inter fra Google Fonts | Rettet | AD-14, DESIGN.md (`c1988c9`) |

## Versjonskontroll ([review-verify-tech.md](review-verify-tech.md))

| Funn | Status | Hvor |
|---|---|---|
| F1 `google-genai` kan ikke installeres | Rettet | Teknologitabellen |
| F2 Delvis indeks på SQLite | Rettet | AD-5, AD-13 |
| F3 bcrypt og passord over 72 byte | Rettet | AD-10 |
| F4 Grensene for `rewrites` | Rettet | AD-1, Playwright-test i «Utvikling og testing» |
| F5 Modus for strukturert svar | Rettet | `NativeOutput` i AD-3 |
| F6 Lisens | Utsatt | Issue #25 |

## Adversarisk ([review-adversary.md](review-adversary.md))

| Funn | Status | Hvor |
|---|---|---|
| H1 Øktresultat og «øvd» | Rettet i andre runde | AD-9. Hvordan «Kunne» og «Kunne ikke» føres i feltene: andre runde, punkt 9 |
| H2 Sammendraget har to eiere | Rettet | AD-7 |
| H3 Jobbkontrakten | Rettet | AD-5 |
| H4 Feilformat og kodeliste | Rettet | AD-12 |
| H5 API-form og statuskoder | Rettet i andre runde | Nesting i konvensjonen «API». Statuskoder og filnavn i kilden: andre runde, punkt 10 |
| H6 Eier av skjemaene og form på quiz | Rettet | AD-4, konvensjonen «Språk» |
| H7 Mock og demodata utenom løpet | Rettet | AD-3, AD-14 (mock endret i andre runde, punkt 1) |
| H8 Tellinger to steder | Rettet | AD-7 |
| H9 Detaljer i innloggingen | Rettet i andre runde | Cookienavn og levetid i AD-10. Rutene for utlogging og «hvem er jeg»: andre runde, punkt 11 |
| H10 Sletting mens en jobb kjører | Rettet | AD-7 (`409`) |
| Mindre funn | Rettet i andre runde | Brytere i backend: punkt 4. Ny fil-ID ved erstatning og fasit sendt med spørsmålet: andre runde, punkt 12 |

## Andre runde

Disse funnene var ikke med i rettingene 1–13. KI oppdaget det da denne fila ble laget, etter at Silje hadde lest rapporten fra rubrikkgjennomgangen. Alle tolv ble godkjent av Silje 2026-11-14 og rettet i arkitekturen. Punkt 1 erstatter mock-løsningen fra retting 13 (`FunctionModel`).

1. Mock-modellen bruker reglene i NFR-2a direkte på sidene, bak en egen port i appen, i stedet for å lese teksten ut av instruksene (PRD F7).
2. Kontrollen av forbokstaver gjelder bare generert innhold. Det studenten skriver selv, sjekkes bare for tomme felt (FR-46).
3. README viser hvordan mellomlagring slås av i Google Cloud (NFR-5).
4. Når en bryter er av, svarer backenden `404 FEATURE_DISABLED`, og frontend skjuler knappene.
5. Består færre enn 5 sammendragspunkter kontrollen, regnes jobben som feilet, og det gamle sammendraget beholdes (FR-53).
6. Én setning i arkitekturen om at stakkforslaget i addendumet er erstattet, med lenke til `beslutninger.md`.
7. Testbrukerens e-post og passord står i README og `.env.example`.
8. Kuttlista i memloggen gjøres komplett, og `python-multipart` legges i teknologitabellen.
9. I flashcardøkter føres «Kunne» som `correct` og «Kunne ikke» som `wrong`.
10. Statuskoder: oppretting `201`, sletting `204`, jobbstart `202`. Kilden på innhold har filnavn i tillegg til fil-ID og side.
11. Rutene for utlogging og «hvem er jeg» navngis.
12. En erstattet fil får ny fil-ID. Fasit og forklaring sendes med quizspørsmålet (bevisst valg, greit lokalt).
