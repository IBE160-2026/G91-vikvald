# Epic 5 Context: Oversikt fram mot eksamen

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Show the student where she stands in the semester: which lectures are practised («øvd») and when, counts per lecture, time to the exam, and what to practise next. The epic adds one shared «øvd» calculation and an overview API, then builds the views on top: sidebar status dots and SISTE ØKT, lecture-table counts and status, the exam text line, subject cards with «Neste å øve på», and the semester timeline. Much of it is cuttable; story order puts cuttable parts last or in their own stories so the text fallback for FR-57 (5.3) survives even if the timeline (5.5) is cut.

## Stories

- Story 5.1: Regn ut «øvd» ett sted og vis det i sidemenyen og SISTE ØKT
- Story 5.2: Vis tellinger og «Øvd 03.11» i forelesningstabellen *(Kan kuttes)*
- Story 5.3: Vis «Eksamen 04.12, om 3 uker · 4 av 8 forelesninger øvd» på forsiden og emnesiden
- Story 5.4: Vis emnekort med «Neste å øve på» på forsiden
- Story 5.5: Vis semesterlinja på forsiden, emnesiden og forelesningssiden *(Kan kuttes)*

## Requirements & Constraints

- **«Øvd» rule:** a lecture is practised when it has at least one saved session that counts for it, including aborted sessions; last practised = that session's `started_at`. A whole-subject session (`lecture_id` empty) counts for every lecture in the subject that had content of the session's kind (flashcards / quiz / freetext) created at or before its `started_at`; not for lectures whose first content of that kind came later, nor for lectures without that kind. Only flashcards, quiz and freetext count; a summary is not a session.
- **Accepted limitation:** if all content of a lecture is deleted (also via file replace), it loses «øvd» from subject sessions. No extra table to prevent this.
- **Per-lecture counts (cuttable):** files, cards (flashcards, model cards included when they exist) and quiz questions; 0 shown as «–».
- **Exam text (FR-57 fallback, SK-22):** exactly «Eksamen 04.12, om 3 uker · 4 av 8 forelesninger øvd». N = practised lectures per the shared function, M = all lectures in the subject, including those without files. Weeks rounded to nearest whole week (24 d → 3, 34 d → 5, 21 d → 3); «om 1 uke» singular; under seven days show days («om 3 dager», «i morgen»); exam today «Eksamen i dag · …»; past «Eksamen var 04.12 · …»; no lectures «… · Ingen forelesninger ennå». Today = student's local date.
- **«Neste å øve på» (FR-58, cuttable, SK-20):** oldest lecture (by date) with content that is not practised; if all practised, the one practised longest ago («16 kort, sist øvd 03.11»). «Øv nå» starts the first kind with content in order flashcards → quiz → freetext (freetext only when enabled), and must never start an empty session (test: quiz-only lecture starts quiz).
- **Freshness:** after finishing or aborting a session, returning views show new status without reload (overview refetched).
- **Ownership/auth:** overview contains only the student's data; unauthenticated → `401 UNAUTHENTICATED`.
- **Tests** carry requirement IDs (e.g. `test_ar9_…`, `test_fr56_…`, `test_ux_dr14_…`, `test_fr16_…`, `test_sk22_…`, `test_fr57_…`, `test_fr58_…`, `test_sk20_…`, `test_ux_dr11_…`, `test_ux_dr12_…`), run via `uv run pytest`, `npm run test`, `npx playwright test`. axe zero violations on every touched page (02, 03, 04, 13, 15).

## Technical Decisions

- **Single «øvd» function** in `backend/app/modules/practice/service.py` (e.g. `practiced_lectures(db, user_id, subject_id)`) returning per lecture `practiced` and `last_practiced_at`. No other backend or frontend code computes «øvd»; sidebar, table, overview, «Neste å øve på» and timeline all use it.
- **Module boundary:** «did this lecture have content of kind X at time T» is answered by one function in `content`, parameterised by kind, reusing the counting registry from epics 2–4; `practice` never reads content tables directly. Lecture-table counts also come from that counting registry (same as delete preview), so new content types register in one place. Only the owner module writes its tables.
- **Times:** `started_at` is set by the server (receive time minus browser-sent `duration_seconds`), so «øvd» compares server-clock times only. UTC timestamps, ISO 8601 in JSON.
- **`GET /api/overview`:** subjects (`id`, `name`, `color_index`, `exam_date`), per subject lectures (`id`, `name`, date, `practiced`, `last_practiced_at`) and `last_session` (kind, lecture or whole subject, `started_at`, `aborted`, the session numbers). `snake_case`, ISO 8601.
- **Frontend shared helpers in `frontend/lib/`:** one date formatter (dd.mm) and one `weeksUntilExam(examDate, today)`-style function taking today as an argument for testability; the timeline reuses it, never copies.
- **Conventions:** code/tables/API fields in English, UI in Norwegian; tabular numbers (`tnum`) everywhere, numeric columns right-aligned.

## UX & Interaction Patterns

- **Sidebar (`sidebar-tree`, 03/04/13/15):** menu rows get filled dot when practised, hollow when not, with accessible name «Øvd» / «Ikke øvd ennå» (not shape alone).
- **SISTE ØKT** at the bottom of «Øv på hele emnet» on 03: kind and scope plus date and result, e.g. «Quiz · Uke 37: Merkevare» / «09.11 · 12 av 15 riktige»; whole-subject session shows «Hele emnet»; hidden when the subject has no sessions.
- **Lecture table (`lecture-table`, 03):** columns Dato, Forelesning, Filer, Kort, Quiz, Status; status «● Øvd 03.11», «○ Ikke øvd ennå» or «Ingen filer ennå». Whole row links to 04, reachable with Tab, Enter opens.
- **Exam text line:** per subject on 02 (name + text), under the heading on 03; plain text read by screen readers.
- **Subject card (`subject-card`, 02):** three columns, two/one in narrower windows; dot in subject colour + name, «Åpne ›» to 03, «120 kort · 64 quizspørsmål», hairline, NESTE Å ØVE PÅ with lecture, reason («16 kort, ikke øvd ennå» / «12 quizspørsmål, ikke øvd ennå») and primary «Øv nå»; progress bars per lecture (aria-hidden) with «4 av 8 forelesninger øvd». Exam text line stays above the cards. Empty states use NESTE STEG with outline button: no content → «Ingen øvingsinnhold ennå», oldest lecture with files, «2 filer lastet opp, klare til bruk», «Lag flashcards» → 04; no lectures → «Ingen forelesninger ennå», «Ny forelesning» → 03; lectures without files → oldest lecture, «Ingen filer ennå», «Last opp PDF» → 04. If FR-58 is cut the card still shows name, «Åpne ›», counts, progress and NESTE STEG. Subject name is each card's heading; Tab order follows reading order.
- **Semester timeline (`semester-timeline`, cuttable):** white card with legend «Øvd», «Ikke øvd ennå», «Eksamen», «Tid igjen»; month overlines computed from the span (first lecture month → exam month; on 02 across all subjects; today always included; not locked to Aug–Dec); one 4 px line per subject in subject colour, solid to today, dashed to exam; stations filled/hollow; exam a black square; «I dag» pill with date and vertical pin. Left text: name, lecture count, «Eksamen 04.12 · om 3 uker» (or «i dag» / «var» variants). 02 replaces the text lines; 03 shows one subject with week number and dates at stations; 04 shows the lecture's subject with a ring, pin and «Du er her». No lectures → no stations, dashed line from today to exam, «Ingen forelesninger ennå». Graphic hidden from screen readers with a per-subject text version («Markedsføring: 4 av 8 forelesninger øvd. Eksamen fredag 04.12, om 3 uker.»); takes no keyboard focus; no horizontal scroll down to 768 px or 200 % text, month labels may shorten, «I dag» and exam always visible.

## Cross-Story Dependencies

- 5.1 builds the «øvd» function, the `content` has-content-at-time function, `GET /api/overview` and the shared date helper; 5.2–5.5 all depend on it.
- 5.3 builds the weeks-until-exam helper and text line; 5.4 keeps the line above cards and reuses the «N av M» number; 5.5 reuses the helper and replaces the text lines (on 02 and 03).
- Relies on epic 2 (subjects with `color_index`/`exam_date`, lectures, sidebar tree, lecture table, counting registry), epic 3 (`practice_sessions`, `POST /api/practice-sessions`, `practice-all-card`, flashcard sessions) and epic 4 (quiz sessions, quiz counts). «Øv nå» reuses sessions from epics 3, 4 and 8; freetext only when epic 8 is enabled.
