---
title: 'Story 5.5: Vis semesterlinja på forsiden, emnesiden og forelesningssiden'
type: 'feature'
created: '2026-11-23'
baseline_revision: 'e84c28a1af39c32f93fea888bb6c5f0fdb08b8df'
status: 'blocked'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Forsiden (02) og emnesiden (03) viser tiden til eksamen bare som tekstlinjer (story 5.3), og forelesningssiden (04) viser den ikke i det hele tatt. Skissene 02–04 har semesterlinja der: studenten skal med ett blikk se hvor mange forelesninger som har vært, hva hun har øvd, og hvor lenge det er igjen (story 5.5 i `epics.md`: FR-57, SK-22, UX-DR11, AR-17, E4, E6).

**Approach:** Én komponent, `SemesterTimeline` (`semester-timeline`), bygd av `GET /api/overview` (forelesninger med dato og `practiced` fra 5.1) og tekstreglene i `frontend/lib/exam.ts`. All geometri regnes ut i én ren funksjon (`timelineLayout`), som testes uten nettleser. Komponenten erstatter tekstlinjene fra 5.3 på 02 og 03, og legges til på 04. Ingen backend-endring.

## Boundaries & Constraints

**Always:**
- **Kortet:** hvitt kort (shadcn `Card` fra `components/ui/card.tsx`) med `h2` «Semesterlinje» (`text-label`) og symbolforklaringen i toppraden: fylt prikk «Øvd», hul prikk «Ikke øvd ennå», svart firkant «Eksamen», stiplet strek «Tid igjen» (strek og prikker i `ink`, tekst `text-caption text-ink-muted`). Symbolforklaringen brytes under tittelen når det er trangt.
- **Én rad per emne:** til venstre emnenavnet (`text-item-title`), antall forelesninger med `lectureCountLabel` («8 forelesninger», «Ingen forelesninger ennå» ved 0) og eksamensteksten med `·`: «Eksamen 04.12 · om 3 uker», «Eksamen 04.12 · i morgen», «Eksamen 04.12 · om 3 dager», «Eksamen i dag», «Eksamen var 04.12» (`text-meta text-ink-muted`). Teksten kommer fra `examCountdownText` i `lib/exam.ts`, som får et valg for skilletegnet (standard «, » som før). Ingen ny regel for uker eller dager.
- **Linja:** 4 px i emnefargen (`var(--color-subject-N)`, samme 0–5-normalisering som `subjectColorClass`), heltrukket fra første forelesning fram til i dag, stiplet (`stroke-dasharray` «0.5 7», runde ender) fra i dag til eksamen. Er eksamen passert, er hele linja heltrukket. Uten forelesninger: bare stiplet linje fra i dag til eksamen, ingen stasjoner. Ligger første forelesning etter i dag, er linja stiplet fra den.
- **Stasjonene:** én sirkel (r 6, strek 2,5) per forelesning etter dato; fylt i emnefargen når oversikten sier `practiced`, ellers hvit med strek i emnefargen. Frontend avgjør aldri «øvd».
- **Eksamen:** svart (`ink`) firkant 14 px med `rounded` 2,5 og en liten hvit firkant inni, som i skissen.
- **I dag:** en pille (`bg-brand text-on-brand rounded-full text-overline`, normal bokstavform) med «I dag 23.11» over linjene og en loddrett nål (1,5 px `brand`) gjennom alle emneradene.
- **Spennet (E4):** fra første dag i måneden med den tidligste av alle forelesningsdatoer, eksamensdatoer og dagens dato, til siste dag i måneden med den seneste av dem (på 02 over alle emner, på 03/04 bare emnet). Månedsoverlinjer (`text-overline text-ink-muted`, «AUG», «SEP» … «DES», «JAN») med loddrette `gridline`-streker lages fra spennet. Datoer regnes som kalenderdager (UTC-dager fra `yyyy-mm-dd`), slik `daysUntilExam` gjør; i dag er studentens lokale dato.
- **Varianter:** `all` (02: alle emner i emnelistens rekkefølge), `subject` (03: bare emnet, med ukenummer (`isoWeek`, fet) og dato (`formatDayMonth`, dempet) under hver stasjon og «Eksamen» / «04.12» under firkanten), `lecture` (04: bare forelesningens emne; stasjonen til denne forelesningen har en ring (r 10, 2 px `brand`), og en pille «Du er her» i `brand` med en kort nål ned til ringen, i en egen rad over linja så den aldri dekker «I dag»).
- **Etiketter som ville overlappe:** etikettene under stasjonene (03) og månedsetikettene tynnes ut etter målt bredde (`ResizeObserver`): en stasjonsetikett vises bare med minst 40 px til forrige viste etikett og til eksamensetiketten; en månedsetikett forkortes til første bokstav når måneden er smalere enn 36 px. Uten målt bredde (jsdom, første tegning) vises alle. «I dag», eksamen og «Du er her» vises alltid.
- **Tilgjengelighet:** alt det grafiske (symbolforklaring, venstretekst, linjer, piller) ligger i én beholder med `aria-hidden="true"`; overskriften står utenfor. For skjermleser står en liste (`sr-only`, én `li` per emne) med teksten «Markedsføring: 4 av 8 forelesninger øvd. Eksamen fredag 04.12, om 3 uker.» — `practicedText` + eksamensteksten med ukedag (nytt valg i `examCountdownText`: ukedag foran datoen; «Eksamen i dag.», «Eksamen var fredag 04.12.»). Ingen del av linja tar tastaturfokus.
- **Bredde:** ingen vannrett rulling ned til 768 px eller 200 % tekst. Når kortets innhold er minst 720 px bredt (containerspørring), står venstreteksten i en kolonne på 176 px ved siden av linja; ellers står den over linja. x-posisjoner er prosent av sporet (SVG med prosent-koordinater, ikke `viewBox`), med 40 px luft på hver side av sporet så piller og etiketter i kantene får plass.
- **Plassering:** 02 under undertittelen og over emnekortene, i stedet for `ExamLines`; 03 under knapperaden («Nytt navn» …) og over «Forelesninger», i stedet for tekstlinja under overskriften; 04 under knapperaden og over «Filer»/«Lag og øv».
- **Lasting og feil:** til oversikten er lastet, vises bare kortet med overskriften (ingen gjettet linje). Feiler oversikten (uten data fra før), står `FALLBACK_MESSAGE` i `role="alert"` i kortet. Mangler emnet i en lastet oversikt (03/04), vises ikke kortet.
- **Ferskhet:** linja bygges av `OVERVIEW_QUERY_KEY`, som alt invalideres etter økter og endringer i emner og forelesninger, så ny status vises uten omlasting.
- Testnavn med krav-ID («FR-57: …», «SK-22: …», «UX-DR11: …», «E4: …», «E6: …»). E2e styrer klokka (`timezoneId: "Europe/Oslo"`, `page.clock`) som `e2e/eksamenslinje.spec.ts`. axe uten brudd på 02, 03 og 04 i 1280 og 768 px.

**Never:** Ingen backend-endring, ny rute, migrering eller ny pakke (shadcn-kort og SVG er nok; ingen diagrambibliotek). Ingen egen regel for «øvd», uker eller dager (gjenbruk `lib/exam.ts`). Ingen semesterlinje i sidemenyen. Ingen endring i `CLAUDE.md`, planleggingsdokumentene eller `.claude/settings.json`. Brukerreisetestene endres bare der teksten med vilje er endret (tekstlinjene er borte), aldri svakere. Ingen kall til Gemini.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Vanlig emne | i dag 10.11.2026; forelesninger 11.09 (øvd), 18.09; eksamen 04.12 | spenn 01.09–31.12; månedene SEP–DES; to stasjoner, første fylt; heltrukket 11.09→10.11, stiplet 10.11→04.12; venstretekst «2 forelesninger», «Eksamen 04.12 · om 3 uker»; sr «Markedsføring: 1 av 2 forelesninger øvd. Eksamen fredag 04.12, om 3 uker.» | — |
| Flere emner (02) | emne A: første forelesning 21.08, eksamen 04.12; emne B: ingen forelesninger, eksamen 14.01.2027 | spenn 01.08.2026–31.01.2027, månedene AUG…JAN; én rad per emne i emnelistens rekkefølge | — |
| Uten forelesninger (E6) | 0 forelesninger | ingen stasjoner, bare stiplet i dag→eksamen; «Ingen forelesninger ennå»; sr «X: Ingen forelesninger ennå. Eksamen …» | — |
| Eksamen i dag | eksamen = i dag | «Eksamen i dag»; sr «Eksamen i dag.»; ingen stiplet del | — |
| Eksamen passert | eksamen 04.12, i dag 10.12 | «Eksamen var 04.12»; hele linja heltrukket; sr «Eksamen var fredag 04.12.» | — |
| Under en uke | eksamen om 3 dager / i morgen | «Eksamen 04.12 · om 3 dager» / «· i morgen» | — |
| I dag før første forelesning | forelesninger i framtida | i dag inne i spennet; stiplet fra første forelesning | — |
| Forelesningssiden | Uke 37 åpen | ring rundt Uke 37-stasjonen og «Du er her»; andre stasjoner uten ring | — |
| Trangt (03) | stasjoner 7 dager fra hverandre, spor ~500 px | etiketter tynnes så ingen overlapper; eksamensetiketten står | — |
| Lasting | oversikten ikke svart | bare kortets overskrift | — |
| Feil | oversikten svarer 500 | reserveteksten i `role="alert"` i kortet | ingen linje, ingen tall |

</intent-contract>

## Code Map

- `frontend/lib/exam.ts` (`examCountdownText`, `practicedText`, `daysUntilExam`) -- får valg for skilletegn og ukedag; ellers uendret. `lib/exam.test.ts` utvides.
- `frontend/lib/dates.ts` (`formatDayMonth`) -- gjenbrukes; ukedagsnavnet flyttes hit (`WEEKDAYS` ligger i dag i `modules/subjects/format.ts` og brukes av `formatWeekdayDate`/`semesterLabel`, som da importerer det).
- `frontend/modules/subjects/format.ts` (`isoWeek`, `lectureCountLabel`) -- gjenbrukes for ukenummer og antall.
- `frontend/lib/subject-colors.ts` (`subjectColorClass`) -- normaliseringen av `color_index` gjenbrukes til en `subjectColorVar(index)` som gir `var(--color-subject-N)`.
- `frontend/modules/practice/types.ts` (`OverviewSubject`, `OverviewLecture`) og `api.ts` (`OVERVIEW_QUERY_KEY`, `fetchOverview`) -- datakilden; lectures kommer i datorekkefølge.
- `frontend/components/ui/card.tsx` -- kortet (allerede tilpasset tokenene).
- `frontend/app/globals.css` -- tokenene (`gridline`, `brand`, `ink`, `subject-1..6`, `text-overline`, spacing `1..9` der `7` = 48 px; Tailwind-standardskalaen er slått av).
- `frontend/modules/subjects/pages/home-page.tsx` (`ExamLines` l. 109–127, brukt l. 77) -- byttes med `SemesterTimeline variant="all"`; kommentarene om `main li` beholdes (kortene er fortsatt eneste `li` i `main` utenom den skjulte sr-lista — se e2e under).
- `frontend/modules/subjects/pages/subject-page.tsx` (l. 153–157 tekstlinja, `overviewSubject` l. 87) -- tekstlinja fjernes, linja settes inn mellom knapperaden og `@container`-blokken.
- `frontend/modules/subjects/pages/lecture-page.tsx` (knapperaden l. ~180, `lecture.data.subject_id`) -- henter oversikten (`useQuery` med `OVERVIEW_QUERY_KEY`) og viser linja med `currentLectureId`.
- `frontend/modules/subjects/home-page.test.tsx` (`respond`, `overviewFor`, `examLines` l. 94, 5.3-testene l. 305–379), `subject-page.test.tsx` (5.3-testene l. 942–1035), `lecture-page.test.tsx` -- 5.3-testene skrives om til linja og sr-teksten; lecture-page-testens fetch-mock må svare på `/api/overview`.
- `frontend/e2e/eksamenslinje.spec.ts` (`homeLine`, `twoSubjects`) -- skrives om til semesterlinja (sr-teksten og venstreteksten), samme klokke.
- `frontend/e2e/emner.spec.ts` l. 156–160, `brukerreiser/flyt-1-etter-forelesning.spec.ts` l. 158–159, `brukerreiser/flyt-2-for-eksamen.spec.ts` l. 131–132, `emnekort.spec.ts` l. 135–136, `forelesninger.spec.ts` l. 167 -- bruker `main [role="listitem"]` / `main li` for tekstlinjene; oppdateres til semesterlinjas sr-tekst (like strenge: samme dato og «om 3 uker» der de sjekket det).

## Tasks & Acceptance

**Execution:**
- `frontend/lib/dates.ts`, `frontend/modules/subjects/format.ts` -- `weekdayName(iso)` i `lib/dates.ts`; `format.ts` bruker den.
- `frontend/lib/exam.ts` + `exam.test.ts` -- `examCountdownText(examDate, today, { separator?, weekday? })`; tester for «·», ukedag, i dag, var, i morgen.
- `frontend/lib/subject-colors.ts` -- `subjectColorVar`.
- `frontend/modules/subjects/timeline.ts` (ny) + `timeline.test.ts` -- `timelineLayout(subjects, today)`: spennet, månedene (start/slutt som brøk 0–1, lang og kort etikett), `todayX`, per emne stasjoner (`x`, `practiced`, `week`, `dayMonth`, `lectureId`), `solid`/`dashed` som [fra, til] eller `null`, `examX`; og `thinLabels(xs, widthPx, minGapPx, reservedXs)`. Alle radene i matrisen, med krav-ID i navnet («E4: spennet …», «E6: uten forelesninger …», «FR-57: stasjoner fylt etter øvd …»).
- `frontend/modules/subjects/components/semester-timeline.tsx` (ny) -- komponenten med de tre variantene, lasting/feil og sr-lista.
- `frontend/modules/subjects/semester-timeline.test.tsx` (ny) -- sr-teksten per emne («UX-DR11: tekstlig versjon …»), grafikken `aria-hidden` og uten fokuserbare elementer, fylte/hule stasjoner, «Du er her» bare ved riktig stasjon («UX-DR11: du er her …»), ukenummer og dato på 03, «Ingen forelesninger ennå», lasting og feil.
- `frontend/modules/subjects/pages/home-page.tsx`, `subject-page.tsx`, `lecture-page.tsx` -- linja inn, tekstlinjene ut.
- `frontend/modules/subjects/home-page.test.tsx`, `subject-page.test.tsx`, `lecture-page.test.tsx` -- 5.3-testene erstattes av tilsvarende for linja (ny status etter invalidert oversikt uten omlasting, lasting, feil, ingen linje uten emner).
- `frontend/e2e/semesterlinje.spec.ts` (ny, erstatter `eksamenslinje.spec.ts`) -- klokke 10.11.2026 i Oslo; 02 med to emner (stasjoner fylt/hule, «Ingen forelesninger ennå», sr-tekst), 03 med ukenummer/dato, 04 med «Du er her»; etter en økt viser linja ny fylt stasjon uten omlasting; ingen vannrett rulling (`scrollWidth <= clientWidth`) og «I dag»/eksamen synlige i 768 px; linja tar ikke fokus (Tab går forbi); axe på 02, 03 og 04 i 1280 og 768.
- `frontend/e2e/emner.spec.ts`, `emnekort.spec.ts`, `forelesninger.spec.ts`, `brukerreiser/flyt-1-etter-forelesning.spec.ts`, `brukerreiser/flyt-2-for-eksamen.spec.ts` -- finner det samme i semesterlinja.

**Acceptance Criteria:**
- Given forsiden med emner, when siden vises, then står semesterlinja mellom undertittelen og emnekortene, og tekstlinjene fra 5.3 finnes ikke lenger på 02 eller 03.
- Given en økt som nettopp er lagret, when studenten går tilbake til 02 eller 03, then er stasjonen fylt og sr-teksten viser nytt antall uten omlasting.
- Given 02, 03 og 04 i 768 px, when linja vises, then er det ingen vannrett rulling, «I dag» og eksamen synes, axe finner ingen brudd, og Tab hopper over linja.

## Spec Change Log

## Review Triage Log

### 2026-11-23 — Review pass
- verdicts: 39 findings — high 0, medium 0, low 31, false 8, maybe-false 0
- findings:
  - `[low]` `[patch]` (verification-gap) «Endre dato» on 04 never checked the line — FR-15 test in `lecture-page.test.tsx` now asserts «AUG» appears and the station's `cx` moves after saving.
  - `[low]` `[reject]` (intent) station labels on 03 are thinned instead of all shown as in mockup 03 — with weekly lectures and a ~500 px track the labels would overlap; thinning keeps them readable (spec rule, recorded as an edge case for Silje).
  - `[low]` `[reject]` (intent) on 03 the line sits under the button row, not where the 5.3 text line was — the AC only says the text line is replaced; mockup 03 has no button row; placing it above the table matches the mockup's order (recorded as an edge case).
  - `[low]` `[reject]` (intent) left text stands above the line under 720 px — needed so there is no horizontal scroll at 768 px; recorded as an edge case.
  - `[low]` `[patch]` (intent) 200 % text not exercised — new e2e test at 640 px (200 % zoom of 1280) on 02, 03, 04: no horizontal scroll, «I dag» and exam visible.
  - `[low]` `[patch]` (intent) «I dag»/exam visibility only at 1280/768 — covered by the same 640 px test.
  - `[low]` `[patch]` (intent) Tab check on 03/04 weaker than on 02 — now asserts the exact next focused element and the `:focus` count on 04.
  - `[false]` `[reject]` (intent) test names not snake_case — frontend tests in this repo carry the ID as a «FR-57: …» prefix (stories 5.1–5.4); AR-17 asks for the ID in the name, which they have.
  - `[low]` `[patch]` (intent) «Eksamen i dag»/«Eksamen var» not rendered in a component test — two component tests added in `semester-timeline.test.tsx`.
  - `[false]` `[reject]` (intent) tests check structure, not pixels — the visual check is the screenshots in `docs/skjermbilder/story-5-5/`, compared with the mockups.
  - `[false]` `[reject]` (intent) selector and dialog-invalidation side effects — the sr-only list adds `li` to `main`, so `main li:has(h2)` finds exactly the cards as before; the dialog invalidation is required for the line to show edited dates.
  - `[low]` `[reject]` (blind) 02 loses all exam information when the overview fails — only on a server error; the cards show the same fallback since 5.4, and a parallel text fallback adds a second rendering path (recorded as an edge case).
  - `[low]` `[reject]` (blind) repeated alerts on 02 when the overview fails — same per-card fallback pattern accepted in 5.4; only on server failure.
  - `[low]` `[patch]` (blind) `examLine` dead code — deleted with its tests; `practicedText` tests keep the singular and «Ingen forelesninger ennå» coverage.
  - `[low]` `[reject]` (blind) lecture dated after the exam draws the dashed part backwards — a lecture after the exam is not a real use case; the fix adds branches.
  - `[low]` `[patch]` (blind) `expectTodayAndExamVisible` could pass vacuously — now asserts the marker count first.
  - `[low]` `[patch]` (blind) weak Tab tests — same fix as the intent row above.
  - `[low]` `[patch]` (blind) 200 % text untested — same fix as the intent row above.
  - `[low]` `[reject]` (blind) the hidden-label e2e assertion depends on layout pixels — it pins the thinning rule on purpose; a layout change that alters it should be looked at.
  - `[low]` `[reject]` (blind) thinning keeps early labels, hides later ones — either direction hides some; left-to-right is predictable (recorded with the thinning edge case).
  - `[low]` `[reject]` (blind) labels jump after the first draw — one frame before ResizeObserver reports; not worth a layout-effect path.
  - `[low]` `[reject]` (blind) today fixed at render time — same as 5.3; the page re-renders on every query refetch.
  - `[low]` `[reject]` (blind) on 02 the card disappears until the overview includes a new subject — creating a subject invalidates the overview; lasts one refetch.
  - `[low]` `[reject]` (blind) e2e setup copied between specs — existing pattern in the suite; refactor is outside this story.
  - `[false]` `[reject]` (blind) KI trail missing — written later in the same run, before the PR.
  - `[low]` `[patch]` (blind) broken comments in `home-page.tsx` and `lecture-page.tsx` — reflowed and corrected.
  - `[low]` `[reject]` (edge) a failed refetch keeps old data silently — standard react-query behaviour, as in 5.4.
  - `[low]` `[reject]` (edge) lecture after the exam — same as the blind row.
  - `[low]` `[reject]` (edge) outlier dates years away squeeze the track — month labels shorten to one letter; a typo in a date is visible and fixable by the student.
  - `[low]` `[reject]` (edge) «Du er her» missing with a stale overview — the overview is refetched on mount and invalidated when a lecture is created.
  - `[false]` `[reject]` (edge) `weekdayName` on malformed date — `exam_date` is a validated `date` in the API.
  - `[low]` `[patch]` (edge) `examLine` dead — same fix as the blind row.
  - `[low]` `[reject]` (edge) a new exam date waits for the overview refetch — the subject dialog now invalidates the overview, tested in `subject-page.test.tsx`.
  - `[false]` `[reject]` (edge) lecture page loading state untested — the loading state is the component's and is tested in `semester-timeline.test.tsx`.
  - `[low]` `[reject]` (intent) R3–R7 readings where the diff took reading (b) — recorded above per item; no further divergence.
  - `[false]` `[reject]` (intent) «I dag» pills could collide on long spans — «Du er her» has its own row; only one «I dag» pill exists.
  - `[low]` `[reject]` (blind) `main ul:not(.sr-only)` ties tests to a class — the class is the a11y contract being tested.
  - `[false]` `[reject]` (blind) spec triage log empty while in-review — filled now, at triage.
  - `[low]` `[reject]` (edge) lecture-page loading state — duplicate of the row above.

## Design Notes

SVG med prosent-x (for eksempel `<circle cx="37.5%" cy="28" r="6"/>`, `<line x1="10%" x2="62%" …/>`, `<rect x="80%" y="28" transform="translate(-7 -7)"/>`) skalerer med bredden uten å strekke streker og tekst, så linja trenger ingen måling for å tegnes riktig. Bare utynningen av etiketter trenger bredden i piksler. Pillene er HTML (`absolute`, `left: x%`, `-translate-x-1/2`, `whitespace-nowrap`).

Hver emnerad tegner sine egne gridlinjer og sin del av i dag-nåla i full høyde, og radene står uten mellomrom, så strekene ser sammenhengende ut når venstreteksten står ved siden av linja. Når teksten står over linja (smalt), blir strekene avbrutt av teksten; det er godtatt.

## Verification

**Commands:**
- `cd frontend && npm run test && npx tsc --noEmit` -- expected: alt grønt
- `cd backend && uv run pytest` -- expected: alt grønt (ingen endring)
- `cd frontend && npx playwright test` mot `docker compose up --build` -- expected: alt grønt (kjøres av orkestreringen etter gjennomgangen, ikke av implementasjonen)

## Auto Run Result

Status: blocked
Blocking condition: free disk space fell under 5 GB (4.7 GB) after the second `docker compose up --build`; the run stopped by the disk rule before screenshots, KI trail, PR and merge.

**Done:** spec, implementation, review (39 findings: 10 patched, all low; the rest rejected with reasons in the triage log). After the review, «Du er her» was moved into the subject's own row (its pin was cut off by the left text at 768 px) and the left column widened from 176 to 200 px (the exam text wrapped at 1280 px), both found in the screenshots.

**Verification:** `npm run test` 910 passed, `npx tsc --noEmit` clean, `uv run pytest` 567 passed, `npx playwright test` 176 passed — all before the two layout fixes. After them: `npx vitest run modules/subjects` 245 passed and `tsc` clean; Playwright and the screenshots have not been run on the final code.

**Left:** Playwright on the final code, screenshots in `docs/skjermbilder/story-5-5/`, sprint status (5-5 and epic-5 `done`), `docs/ki-prosess/`, session log, `kanttilfelle` issues, PR and merge.
