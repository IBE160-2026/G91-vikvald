import { expect, test, type BrowserContext, type Page, type Request } from "@playwright/test";

import {
  type ApiFreetextQuestion,
  type ApiQuestion,
  SAVE_PATH,
  answerQuizQuestion,
  cardFront,
  createLectureViaApi,
  createSection,
  createSubjectViaApi,
  dayFromToday,
  expectNoAxeViolations,
  expectFormulaFlagAboveSource,
  expectOnHomePage,
  FORMULA_FLAG_TEXT,
  fileRows,
  flashcardCountViaApi,
  formulaFlag,
  freetextQuestionsViaApi,
  makeFlashcardsViaApi,
  makeFreetextViaApi,
  makeModelCardsViaApi,
  makeQuizViaApi,
  pdfFile,
  quizQuestion,
  quizQuestionsViaApi,
  registerWithTermsViaApi,
  semesterLineGraphic,
  semesterLineItems,
  sessionPanel,
  sidebarLecture,
  sidebarLectures,
  subjectCard,
  uploadViaApi,
} from "./felles";

// Flow 2 in EXPERIENCE.md («Brukerreiser (Key Flows)»), UJ-2 in the PRD.
// «Three weeks before the exam Klara has uploaded notes from all the lectures
// in Markedsføring»: the account, the subject, eight lectures with one PDF
// each and the flashcards from them are made through the API first, since the
// flow has no login step. The mock model makes one card per definition
// sentence: one in each lecture, and four in «Uke 37: Merkevare» and «Uke 38:
// Prising», 14 in all. It makes one quiz question per definition, but nothing
// from fewer than four, so the quiz has four questions from each of those two
// lectures, eight in all.
// «Four of eight lectures are practised» (step 1): Klara has practised the
// four first lectures before, so one flashcard session for each of them is
// saved through the API as well. The server decides «øvd» (story 5.1).
// «Margin er forskjellen mellom pris og kostnad.» on page 5 of prising.pdf
// also has a formula drawn as vector curves (Margin = pris - kostnad). The
// backend marks that page needs_image at upload, so the card and the quiz
// question from it carry «Inneholder formel – sjekk mot kilden» (story 6.3),
// in demo mode too. That is the error path with the formula flag.
// Step 4 has a model card (epic 7): merkevare.pdf has the list «AIDA-modellen»
// on page 6, and the mock model makes one model card from it, «Forklar
// AIDA-modellen.» with the points Attention, Interest, Desire, Action and the
// mnemonic AIDA. Model cards are practised as flashcards (FR-56), so the
// subject has 15 cards, and the session over the whole subject has it too.
// Steps 5–7 are free text (epic 8): she has made short-answer free-text
// questions from «Uke 36: Segmentering» and «Uke 38: Prising» before, one per
// definition sentence, five in all. The one about margin comes from the page
// with a formula, so it carries the flag too.
// The steps share one browser context and run in order, like one visit by Klara.
test.describe("UJ-2 / flyt 2: Klara før eksamen", () => {
  test.describe.configure({ mode: "serial" });

  // Eight lectures, one a week on Fridays from week 34. Each PDF has the
  // lecture's name on page 1 and one definition sentence on each page after it
  // (a line longer than the page would be cut off).
  const LECTURES = [
    ["Uke 34: Introduksjon", "2026-08-21", ["Behov er en mangel kunden kjenner."]],
    ["Uke 35: Kjøpsatferd", "2026-08-28", ["Motiv er grunnen til et valg."]],
    ["Uke 36: Segmentering", "2026-09-04", ["Segment er en gruppe kunder."]],
    [
      "Uke 37: Merkevare",
      "2026-09-11",
      [
        "Merkevare er et navn som skiller et produkt fra andre.",
        "Logo er merkets tegn.",
        "Slagord er en kort setning om merket.",
        "Image er bildet kunden har av merket.",
      ],
    ],
    [
      "Uke 38: Prising",
      "2026-09-18",
      [
        "Pris er det kunden betaler.",
        "Rabatt er et avslag i prisen.",
        "Kampanje er et tilbud i en kort periode.",
        "Margin er forskjellen mellom pris og kostnad.",
      ],
    ],
    ["Uke 39: Distribusjon", "2026-09-25", ["Kanal er veien fra produsent til kunde."]],
    ["Uke 40: Kommunikasjon", "2026-10-02", ["Reklame er betalt kommunikasjon."]],
    ["Uke 41: Digital markedsføring", "2026-10-09", ["Nettbutikk er en butikk i nettleseren."]],
  ] as const;
  const ALL_FRONTS = [
    "Behov", "Motiv", "Segment", "Merkevare", "Logo", "Slagord", "Image",
    "Pris", "Rabatt", "Kampanje", "Margin", "Kanal", "Reklame", "Nettbutikk",
  ];
  // The model card from the list on page 6 of merkevare.pdf (story 7.1, 7.2).
  const MODEL = {
    lecture: "Uke 37: Merkevare",
    heading: "AIDA-modellen",
    points: ["Attention", "Interest", "Desire", "Action"],
    front: "Forklar AIDA-modellen.",
    mnemonic: "AIDA",
    source: "merkevare.pdf, side 6",
  } as const;
  // The points as a screen reader gets them: the letter boxes are aria-hidden,
  // so each point is read once («Attention», not «A Attention»).
  const MODEL_POINTS_SNAPSHOT = `
    - list:
      - listitem: Attention
      - listitem: Interest
      - listitem: Desire
      - listitem: Action
  `;
  const MODEL_PAGE = [MODEL.heading, ...MODEL.points.map((point) => `- ${point}`)].join("\n");
  const ALL_CARDS = [...ALL_FRONTS, MODEL.front];
  const MERKEVARE_FRONTS = ["Merkevare", "Logo", "Slagord", "Image"];
  const PRISING_FRONTS = ["Pris", "Rabatt", "Kampanje", "Margin"];
  // The page with a formula (story 6.3): the card and question from it are flagged.
  const FORMULA = { lecture: "Uke 38: Prising", file: "prising.pdf", page: 5, front: "Margin" } as const;
  const FORMULA_SOURCE = `${FORMULA.file}, side ${FORMULA.page}`;
  // The lectures she practised before the flow starts (step 1: «fire av åtte»).
  const PRACTISED_BEFORE = LECTURES.slice(0, 4).map(([name]) => name);
  // The lectures she has made a quiz from.
  const QUIZ_LECTURES = ["Uke 37: Merkevare", "Uke 38: Prising"];
  // The lectures she has made free-text questions from (steps 5–7).
  const FREETEXT_LECTURES = ["Uke 36: Segmentering", "Uke 38: Prising"];
  const slugOf = (name: string) => name.split(": ")[1].toLowerCase().replace(/\s+/g, "-");
  // The PDF each card comes from: the term before «er» -> the lecture's file.
  const FILE_OF_FRONT = new Map([
    ...LECTURES.flatMap(([name, , definitions]) => definitions.map((d) => [d.split(" er ")[0], `${slugOf(name)}.pdf`] as const)),
    [MODEL.front, "merkevare.pdf"] as const,
  ]);
  let context: BrowserContext;
  let page: Page;
  // The exam is three weeks from today, so the flow is the same whenever it runs.
  const exam = dayFromToday(21);
  // «Øvd dd.mm»: the sessions are saved today.
  const practisedToday = `Øvd ${dayFromToday(0).dayMonth}`;
  const LINE_TEXT = (practised: number) =>
    `Markedsføring: ${practised} av 8 forelesninger øvd. Eksamen ${exam.weekday} ${exam.dayMonth}, om 3 uker.`;
  let subjectId: string;
  let merkevareId: string;
  const lectureIds = new Map<string, string>();
  // Every POST /api/practice-sessions the page sends.
  const saves: Request[] = [];
  // The subject's quiz questions with the answer key (step 3).
  let questions: ApiQuestion[];
  // The subject's free-text questions with the model answers (steps 5–7).
  let freetext: ApiFreetextQuestion[];
  // Her own answers, which are never saved (FR-51).
  const OWN_ANSWER = "Klaras eget svar fra hukommelsen";

  test.beforeAll(async ({ browser }, testInfo) => {
    // Twelve jobs with the mock model take a few seconds each.
    testInfo.setTimeout(180_000);
    context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    page = await context.newPage();
    await registerWithTermsViaApi(page);
    subjectId = await createSubjectViaApi(page, "Markedsføring", exam.iso);
    for (const [name, lectureDate, definitions] of LECTURES) {
      const lectureId = await createLectureViaApi(page, subjectId, name, lectureDate);
      const formulaPages = name === FORMULA.lecture ? [FORMULA.page] : [];
      // The list for the model card is the last page of merkevare.pdf (page 6).
      const pages = name === MODEL.lecture ? [name, ...definitions, MODEL_PAGE] : [name, ...definitions];
      await uploadViaApi(page, lectureId, pdfFile(`${slugOf(name)}.pdf`, pages, formulaPages));
      await makeFlashcardsViaApi(page, lectureId, 10, definitions.length);
      if (QUIZ_LECTURES.includes(name)) await makeQuizViaApi(page, lectureId, 10, definitions.length);
      if (FREETEXT_LECTURES.includes(name)) await makeFreetextViaApi(page, lectureId, 5, definitions.length);
      if (name === MODEL.lecture) await makeModelCardsViaApi(page, lectureId, 1);
      if (name === "Uke 37: Merkevare") merkevareId = lectureId;
      lectureIds.set(name, lectureId);
    }
    // The sessions she had before: one flashcard session in each of the first four lectures.
    for (const name of PRACTISED_BEFORE) {
      const count = LECTURES.find(([lecture]) => lecture === name)![2].length;
      const response = await page.request.post(SAVE_PATH, {
        data: {
          session_id: crypto.randomUUID(),
          subject_id: subjectId,
          lecture_id: lectureIds.get(name),
          kind: "flashcards",
          aborted: false,
          shown: count,
          answered: count,
          correct: count,
          partial: 0,
          wrong: 0,
          duration_seconds: 60,
        },
      });
      expect(response.status()).toBe(204);
    }
    page.on("request", (request) => {
      if (request.method() === "POST" && new URL(request.url()).pathname === SAVE_PATH) saves.push(request);
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("Steg 1 – UJ-2, FR-6, FR-57, FR-58, SK-20, SK-22, UX-DR11, UX-DR12: forsiden (02) viser at eksamen er om tre uker og at fire av åtte forelesninger er øvd, og hun trykker «Åpne» på Markedsføring", async () => {
    await page.goto("/");
    await expectOnHomePage(page);
    // The semester line (story 5.5): the line is aria-hidden, so the screen-reader
    // list carries the text, and the visible exam text stands in the graphic.
    await expect(semesterLineItems(page)).toHaveText([LINE_TEXT(4)]);
    const graphic = semesterLineGraphic(page);
    await expect(graphic.getByText(`Eksamen ${exam.dayMonth} · om 3 uker`, { exact: true })).toBeVisible();
    await expect(graphic.getByText("8 forelesninger", { exact: true })).toBeVisible();
    await expect(graphic.locator("[data-station]")).toHaveCount(8);
    await expect(graphic.locator('[data-station][data-practiced="true"]')).toHaveCount(4);
    for (const name of PRACTISED_BEFORE) {
      await expect(graphic.locator(`[data-station="${lectureIds.get(name)}"]`)).toHaveAttribute("data-practiced", "true");
    }

    // The subject card (story 5.4): the counts, «Neste å øve på» (the first
    // lecture with cards that is not practised) and «4 av 8 forelesninger øvd».
    const card = subjectCard(page, "Markedsføring");
    await expect(card.getByText("15 kort · 8 quizspørsmål", { exact: true })).toBeVisible();
    await expect(card.getByRole("heading", { level: 3, name: "Neste å øve på" })).toBeAttached();
    await expect(card.getByText("Uke 38: Prising", { exact: true })).toBeVisible();
    await expect(card.getByText("4 kort, ikke øvd ennå", { exact: true })).toBeVisible();
    await expect(card.getByRole("link", { name: "Øv nå" })).toHaveAttribute(
      "href",
      `/forelesninger/${lectureIds.get("Uke 38: Prising")}/flashcards`,
    );
    await expect(card.getByText("4 av 8 forelesninger øvd", { exact: true })).toBeVisible();
    await expect(card.locator('[data-slot="progress"] [data-practiced="true"]')).toHaveCount(4);
    await expectNoAxeViolations(page);

    await card.getByRole("link", { name: "Åpne Markedsføring" }).click();
    await expect(page).toHaveURL(`/emner/${subjectId}`);
    await expect(page.locator("main h1")).toHaveText("Markedsføring");
  });

  test("Steg 2 (forelesningene med status) – FR-7, FR-15, FR-16, FR-56, UX-DR7, UX-DR11, UX-DR13: emnesiden (03) viser forelesningene etter dato med filer, kort, quiz og status «Øvd»", async () => {
    await expect(
      page.getByText(`8 forelesninger · 8 filer · eksamen ${exam.weekday} ${exam.full}`, { exact: true }),
    ).toBeVisible();
    await expect(semesterLineItems(page)).toHaveText([LINE_TEXT(4)]);
    const rows = page.locator("main tbody tr");
    await expect(rows).toHaveCount(8);
    await expect(rows.getByRole("link")).toHaveText(LECTURES.map(([name]) => name));
    for (let i = 0; i < LECTURES.length; i += 1) {
      const [name, , definitions] = LECTURES[i];
      const cells = rows.nth(i).getByRole("cell");
      await expect(cells.nth(2)).toHaveText("1");
      // Kort and Quiz (story 5.2): «–» for none.
      // Kort counts the model card in «Uke 37: Merkevare» (story 7.1).
      await expect(cells.nth(3)).toHaveText(String(definitions.length + (name === MODEL.lecture ? 1 : 0)));
      await expect(cells.nth(4)).toHaveText(QUIZ_LECTURES.includes(name) ? "4" : "–");
      // Status (story 5.2): the four first are practised today, the rest not yet.
      const practised = PRACTISED_BEFORE.includes(name);
      await expect(cells.nth(5)).toHaveText(practised ? practisedToday : "Ikke øvd ennå");
      await expect(sidebarLecture(page, name)).toHaveAccessibleName(`${name} ${practised ? "Øvd" : "Ikke øvd ennå"}`);
    }
    await expect(sidebarLectures(page)).toHaveCount(8);
    await expectNoAxeViolations(page);
  });

  test("Steg 2 (øver på hele emnet) – FR-23, FR-24, FR-25, FR-56, UX-DR13, UX-DR14, UX-DR34: i kortet «Øv på hele emnet» trykker hun «Øv på flashcards», og økten (07) blander kort fra alle forelesningene", async () => {
    const practiceAll = page.getByRole("region", { name: "Øv på hele emnet" });
    await expect(practiceAll.getByText("15 kort fra 8 forelesninger")).toBeVisible();
    await practiceAll.getByRole("link", { name: "Øv på flashcards" }).click();

    await expect(page).toHaveURL(`/emner/${subjectId}/flashcards`);
    await expect(page).toHaveTitle("Flashcards – Markedsføring – Studiekamerat");
    await expect(sessionPanel(page).getByText("Markedsføring · hele emnet")).toBeVisible();
    await expect(sessionPanel(page).getByText("/ 15")).toBeVisible();
    await expectNoAxeViolations(page);

    const seen: string[] = [];
    const saved = page.waitForResponse((response) => new URL(response.url()).pathname === SAVE_PATH);
    for (let i = 0; i < ALL_CARDS.length; i += 1) {
      const question = (await cardFront(page).textContent())!;
      seen.push(question);
      await page.keyboard.press(" ");
      // The source names the file from the card's own lecture.
      await expect(page.locator('[data-slot="flashcard"] [data-slot="source-link"]')).toHaveText(
        question === MODEL.front ? MODEL.source : new RegExp(`^${FILE_OF_FRONT.get(question)}, side [2-5]$`),
      );
      // The model card shows its points (story 7.2) among the other cards.
      if (question === MODEL.front) {
        await expect(page.locator('[data-slot="model-card-back"] ol')).toMatchAriaSnapshot(MODEL_POINTS_SNAPSHOT);
      }
      // Only the card from the page with a formula carries the flag (story 6.3).
      const card = page.locator('[data-slot="flashcard"]');
      if (question === FORMULA.front) await expectFormulaFlagAboveSource(card, FORMULA_SOURCE);
      else await expect(formulaFlag(card)).toHaveCount(0);
      if (i === 0) await expectNoAxeViolations(page);
      await page.keyboard.press("2");
    }
    expect((await saved).status()).toBe(204);
    // Every card from all eight lectures, once each, the model card too.
    expect([...seen].sort()).toEqual([...ALL_CARDS].sort());

    await expect(page.getByRole("heading", { level: 2, name: "Du har gått gjennom alle 15 kortene" })).toBeFocused();
    expect(saves.at(-1)!.postDataJSON()).toMatchObject({
      subject_id: subjectId,
      lecture_id: null,
      kind: "flashcards",
      aborted: false,
      answered: 15,
      correct: 15,
    });
    await expectNoAxeViolations(page);

    await page.getByRole("link", { name: "Tilbake til emnet" }).click();
    await expect(page).toHaveURL(`/emner/${subjectId}`);
    await expect(page.locator("main h1")).toHaveText("Markedsføring");
    // The session over the whole subject counts for every lecture with cards,
    // so all eight are now practised, without a reload (story 5.1, 5.2, 5.5).
    await expect(semesterLineItems(page)).toHaveText([LINE_TEXT(8)]);
    for (let i = 0; i < LECTURES.length; i += 1) {
      await expect(page.locator("main tbody tr").nth(i).getByRole("cell").nth(5)).toHaveText(practisedToday);
    }
    const lastSession = page.getByRole("region", { name: "Øv på hele emnet" });
    await expect(lastSession.getByText("Flashcards · Hele emnet", { exact: true })).toBeVisible();
    await expect(lastSession.getByText(`${dayFromToday(0).dayMonth} · Kunne 15 av 15`, { exact: true })).toBeVisible();
  });

  test("Steg 3 (starter quizen på hele emnet) – FR-32, FR-34, UX-DR14, UX-DR29: etterpå tar hun quiz på hele emnet («Start», 09), og kilden ved spørsmålet viser hvilken forelesning det kommer fra", async () => {
    const practiceAll = page.getByRole("region", { name: "Øv på hele emnet" });
    // Flashcards, Quiz and Fritekstspørsmål (story 8.3), and SISTE ØKT since
    // she has practised (story 5.1).
    await expect(practiceAll.getByRole("heading", { level: 3 })).toHaveText([
      "Flashcards",
      "Quiz",
      "Fritekstspørsmål",
      "Siste økt",
    ]);
    await expect(practiceAll.getByText("8 spørsmål fra 2 forelesninger")).toBeVisible();
    await expectNoAxeViolations(page);
    questions = await quizQuestionsViaApi(page, "subjects", subjectId);
    expect(new Set(questions.map((item) => item.lecture.name))).toEqual(new Set(QUIZ_LECTURES));

    await practiceAll.getByRole("link", { name: "Start quiz på hele emnet" }).click();
    await expect(page).toHaveURL(`/emner/${subjectId}/quiz`);
    await expect(page).toHaveTitle("Quiz – Markedsføring – Studiekamerat");
    const panel = page.getByRole("region", { name: "Quiz" });
    await expect(panel.getByText("Markedsføring, hele emnet")).toBeVisible();
    await expect(panel.getByText("/ 8")).toBeVisible();
    await expect(page.getByText("SPØRSMÅL 1 AV 8")).toBeVisible();
    await expectNoAxeViolations(page);

    // She answers the first question, and the source shows its lecture and file.
    const question = await answerQuizQuestion(page, questions, true);
    const card = page.locator('[data-slot="explanation-card"]');
    await expect(card).toContainText(question.lecture.name);
    await expect(card.locator('[data-slot="source-link"]')).toHaveText(
      new RegExp(`^${slugOf(question.lecture.name)}\\.pdf, side [2-5]$`),
    );
    await expect(page.getByRole("button", { name: "Neste spørsmål" })).toBeFocused();
    await expectNoAxeViolations(page);
  });

  test("Feilvei (slett quizspørsmål) – FR-37, UX-DR22, UX-DR29: et spørsmål er faglig feil, hun sjekker kilden og sletter det med «Slett» i bunnfeltet, og svaret hun ga, står", async () => {
    const text = (await quizQuestion(page).getByRole("heading", { level: 2 }).textContent())!;
    // Quiz questions cannot be edited (FR-37), only deleted.
    await expect(page.getByRole("button", { name: "Rediger" })).toHaveCount(0);
    await page.getByRole("button", { name: "Slett", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Slette spørsmålet?" });
    await expect(dialog.getByRole("button", { name: "Avbryt" })).toBeFocused();
    await expect(dialog.getByText(text)).toBeVisible();
    await expect(dialog.getByText("Det kan ikke angres.")).toBeVisible();
    await expectNoAxeViolations(page);
    await dialog.getByRole("button", { name: "Slett spørsmålet" }).click();
    await expect(dialog).toBeHidden();

    // The question is gone; the answer stays, so the quiz still has 8 and goes on.
    const left = await quizQuestionsViaApi(page, "subjects", subjectId);
    expect(left).toHaveLength(7);
    expect(left.map((item) => item.question)).not.toContain(text);
    const panel = page.getByRole("region", { name: "Quiz" });
    await expect(panel.getByText("/ 8")).toBeVisible();
    await expect(page.getByText("SPØRSMÅL 2 AV 8")).toBeVisible();
    await expect(panel.getByText("1 riktige · 0 feil")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("Steg 3 (resten og resultatet) – FR-34, FR-36, FR-56, UX-DR14, UX-DR29, UX-DR34: hver forklaring viser forelesningen spørsmålet kommer fra, og resultatet lagres for hele emnet", async () => {
    const before = saves.length;
    // Question 3 wrong, the rest right.
    let missed: ApiQuestion | undefined;
    const seen: string[] = [];
    for (let number = 2; number <= 8; number += 1) {
      await expect(page.getByText(`SPØRSMÅL ${number} AV 8`)).toBeVisible();
      const question = await answerQuizQuestion(page, questions, number !== 3);
      if (number === 3) missed = question;
      seen.push(question.lecture.name);
      const explanation = page.locator('[data-slot="explanation-card"]');
      await expect(explanation).toContainText(question.lecture.name);
      // The question from the page with a formula carries the flag (story 6.3).
      if (question.source.file_name === FORMULA.file && question.source.page_no === FORMULA.page) {
        await expectFormulaFlagAboveSource(explanation, FORMULA_SOURCE);
      } else {
        await expect(formulaFlag(explanation)).toHaveCount(0);
      }
      await page.keyboard.press("Enter");
    }
    // Questions from both lectures.
    expect(new Set(seen)).toEqual(new Set(QUIZ_LECTURES));

    await expect(page.getByRole("heading", { level: 2, name: "7 av 8 riktige" })).toBeFocused();
    const rows = page.locator('[data-slot="missed-list"]').getByRole("listitem");
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText(missed!.question);
    await expect(rows.locator('[data-slot="missed-lecture"]')).toHaveText(`Forelesning: ${missed!.lecture.name}`);
    await expect.poll(() => saves.length).toBe(before + 1);
    expect(saves.at(-1)!.postDataJSON()).toMatchObject({
      subject_id: subjectId,
      lecture_id: null,
      kind: "quiz",
      aborted: false,
      answered: 8,
      correct: 7,
      wrong: 1,
    });
    await expectNoAxeViolations(page);

    await page.getByRole("link", { name: "Tilbake til emnet" }).click();
    await expect(page).toHaveURL(`/emner/${subjectId}`);
    const practiceAll = page.getByRole("region", { name: "Øv på hele emnet" });
    await expect(practiceAll.getByText("7 spørsmål fra 2 forelesninger")).toBeVisible();
    // SISTE ØKT now shows the quiz (story 5.1).
    await expect(practiceAll.getByText("Quiz · Hele emnet", { exact: true })).toBeVisible();
    await expect(practiceAll.getByText(`${dayFromToday(0).dayMonth} · 7 av 8 riktige`, { exact: true })).toBeVisible();
  });

  test("Steg 4 (åpner forelesningen) – FR-7, UX-DR7: hun åpner «Uke 37: Merkevare» (04) med notatene", async () => {
    await page.getByRole("navigation", { name: "Emner" }).getByRole("link", { name: "Uke 37: Merkevare" }).click();
    await expect(page).toHaveURL(/\/forelesninger\/[0-9a-f-]{36}$/);
    await expect(page.locator("main h1")).toHaveText("Uke 37: Merkevare");
    await expect(page.getByText("Forelesning fredag 11.09.2026 · 1 fil · 6 sider")).toBeVisible();
    await expect(fileRows(page)).toHaveCount(1);
    await expect(fileRows(page).first()).toContainText("merkevare.pdf");
    // The Flashcards row counts the model card with the four flashcards (story 7.1).
    await expect(createSection(page).getByText("5 kort", { exact: true })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("Steg 4 (øver på flashcards) – FR-23, FR-24, UX-DR9, UX-DR27: hun øver på flashcards fra forelesningen (07)", async () => {
    // The session shuffles with Math.random (FR-23). For the flow it is held at
    // 0.5 while the session starts, which gives the order Merkevare, Image,
    // Logo, the model card, Slagord: the error paths for cards land on a plain
    // card, and the model card comes in the middle of the session, as in the flow.
    // It is put back once the session shows its first card, that is, when the
    // shuffle is done. A fixed timer (5 s, as before) ran out before the cards
    // had loaded when the machine was busy, and the order became random (#343).
    await page.evaluate(() => {
      const holder = window as unknown as { __originalRandom?: () => number };
      holder.__originalRandom = Math.random;
      Math.random = () => 0.5;
    });
    await createSection(page).getByRole("button", { name: "Øv nå" }).click();
    await expect(page).toHaveURL(`/forelesninger/${merkevareId}/flashcards`);
    await expect(sessionPanel(page).getByText("Uke 37: Merkevare")).toBeVisible();
    await expect(sessionPanel(page).getByText("/ 5")).toBeVisible();
    await expect(cardFront(page)).toHaveText(MERKEVARE_FRONTS[0]);
    await page.evaluate(() => {
      const holder = window as unknown as { __originalRandom?: () => number };
      if (holder.__originalRandom) Math.random = holder.__originalRandom;
      delete holder.__originalRandom;
    });
    expect(MERKEVARE_FRONTS).toContain(await cardFront(page).textContent());
    await page.keyboard.press(" ");
    await expect(page.getByText("SVAR", { exact: true })).toBeVisible();
    await expect(page.locator('[data-slot="flashcard"] [data-slot="source-link"]')).toHaveText(/^merkevare\.pdf, side [2-5]$/);
    await expectNoAxeViolations(page);
  });

  test("Feilvei (rediger) – FR-27, UX-DR27: et kort er faglig feil, hun sjekker kilden og retter svaret med «Rediger» i bunnfeltet", async () => {
    const question = (await cardFront(page).textContent())!;
    await page.getByRole("button", { name: "Rediger" }).click();
    const dialog = page.getByRole("dialog", { name: "Rediger kortet" });
    await expect(dialog.getByLabel("Spørsmål")).toHaveValue(question);
    await expectNoAxeViolations(page);
    await dialog.getByLabel("Svar").fill("Klaras eget svar, sjekket mot kilden.");
    await dialog.getByRole("button", { name: "Lagre" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Klaras eget svar, sjekket mot kilden.")).toBeVisible();

    const cards = (await (await page.request.get(`/api/lectures/${merkevareId}/flashcards`)).json()) as {
      front: string;
      back: string;
    }[];
    expect(cards.find((card) => card.front === question)!.back).toBe("Klaras eget svar, sjekket mot kilden.");
    await expectNoAxeViolations(page);
  });

  test("Feilvei (slett) – FR-27, UX-DR22: hun sletter et feil kort med «Slett», bekrefter, og kortet er borte", async () => {
    const question = (await cardFront(page).textContent())!;
    await page.getByRole("button", { name: "Slett", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Slette kortet?" });
    await expect(dialog.getByRole("button", { name: "Avbryt" })).toBeFocused();
    await expect(dialog.getByText(question)).toBeVisible();
    await expect(dialog.getByText("Det kan ikke angres.")).toBeVisible();
    await expectNoAxeViolations(page);
    await dialog.getByRole("button", { name: "Slett kortet" }).click();
    await expect(dialog).toBeHidden();

    await expect(sessionPanel(page).getByText("/ 4")).toBeVisible();
    await expect(cardFront(page)).not.toHaveText(question);
    expect(await flashcardCountViaApi(page, merkevareId)).toBe(3);
    await expectNoAxeViolations(page);
  });

  test("Steg 4 (modellkortet) – FR-42, FR-43, FR-56, UX-DR28, NFR-8: midt i økten kommer modellkortet (11), hun snur «Forklar AIDA-modellen» og ser punktene og huskeregelen AIDA", async () => {
    // She knows the flashcards before it.
    let before = 0;
    while ((await cardFront(page).textContent()) !== MODEL.front) {
      expect(MERKEVARE_FRONTS).toContain(await cardFront(page).textContent());
      await page.keyboard.press(" ");
      await expect(page.locator('[data-slot="flashcard"] [data-slot="source-link"]')).toHaveText(/^merkevare\.pdf, side [2-5]$/);
      await page.keyboard.press("2");
      before += 1;
      expect(before).toBeLessThan(3);
    }
    // In the middle of the session: after at least one card, and with one left.
    expect(before).toBeGreaterThan(0);
    await expect(page.getByText(`Kunne ${before} · Kunne ikke 0`)).toBeVisible();

    const card = page.locator('[data-slot="flashcard"]');
    await expect(cardFront(page)).toHaveText(MODEL.front);
    // The back is hidden until she flips the card.
    await expect(card.locator('[data-slot="model-card-back"]')).toHaveCount(0);
    await expectNoAxeViolations(page);
    await page.keyboard.press(" ");

    // The points as an ordered list; the letter boxes are hidden from screen readers.
    const back = card.locator('[data-slot="model-card-back"]');
    await expect(back.locator("ol > li")).toHaveCount(4);
    await expect(back.locator("ol")).toMatchAriaSnapshot(MODEL_POINTS_SNAPSHOT);
    await expect(back.locator('[data-slot="letter-box"]')).toHaveText(["A", "I", "D", "A"]);
    await expect(card.locator('[data-slot="note-surface"]')).toHaveText(`Huskeregel: ${MODEL.mnemonic}`);
    await expect(card.locator('[data-slot="source-link"]')).toHaveText(MODEL.source);
    await expect(formulaFlag(card)).toHaveCount(0);
    // The bottom bar: «Endre huskeregel» before «Rediger» and «Slett».
    await expect(card.getByRole("button", { name: "Endre huskeregel" })).toBeVisible();
    await expect(card.getByRole("button", { name: "Rediger" })).toBeVisible();
    await expect(card.getByRole("button", { name: "Slett", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Kunne", exact: true })).toBeFocused();
    await expectNoAxeViolations(page);
  });

  test("Steg 4 (Endre huskeregel) – FR-46, UX-DR21, UX-DR28: hun vil heller ha sin egen regel, trykker «Endre huskeregel» og lagrer den", async () => {
    const card = page.locator('[data-slot="flashcard"]');
    const change = card.getByRole("button", { name: "Endre huskeregel" });
    await change.click();
    const dialog = page.getByRole("dialog", { name: "Endre huskeregel" });
    const field = dialog.getByLabel("Huskeregel");
    await expect(field).toBeFocused();
    await expect(field).toHaveValue(MODEL.mnemonic);
    await expectNoAxeViolations(page);

    // Her own rule. It is only checked for an empty field, never against the
    // first letters (AR-4).
    const own = "Alle Ivrige Deltakere Applauderer";
    await field.fill(own);
    await dialog.getByRole("button", { name: "Lagre" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(change).toBeFocused();
    await expect(card.locator('[data-slot="note-surface"]')).toHaveText(`Huskeregel: ${own}`);
    // The points stay, and the card is still not marked.
    await expect(card.locator('[data-slot="model-card-back"] ol')).toMatchAriaSnapshot(MODEL_POINTS_SNAPSHOT);
    await expect(page.getByRole("button", { name: "Kunne", exact: true })).toBeEnabled();
    await expect(page.getByText(/Kunne \d+ · Kunne ikke 0/)).toBeVisible();

    const cards = (await (await page.request.get(`/api/lectures/${merkevareId}/flashcards`)).json()) as {
      kind: string;
      front: string;
      points: string[] | null;
      mnemonic: string | null;
    }[];
    const model = cards.find((item) => item.kind === "model")!;
    expect(model).toMatchObject({ front: MODEL.front, points: [...MODEL.points], mnemonic: own });
    await expectNoAxeViolations(page);
  });

  test("Feilvei (Esc) – FR-56, UX-DR33: hun avslutter økten halvveis med Esc, og resultatet for det hun har gjort, vises og lagres", async () => {
    const before = saves.length;
    // She did not know the model card: «Kunne ikke», like any other card.
    await page.keyboard.press("1");
    await expect(cardFront(page)).not.toHaveText(MODEL.front);
    const saved = page.waitForResponse((response) => new URL(response.url()).pathname === SAVE_PATH);
    await page.keyboard.press("Escape");
    expect((await saved).status()).toBe(204);

    // Two flashcards and the model card are marked, of the four left after the delete.
    await expect(page.getByRole("heading", { level: 2, name: "Avbrutt etter 3 av 4" })).toBeFocused();
    await expect(page).toHaveURL(`/forelesninger/${merkevareId}/flashcards`);
    expect(saves).toHaveLength(before + 1);
    expect(saves.at(-1)!.postDataJSON()).toMatchObject({
      subject_id: subjectId,
      lecture_id: merkevareId,
      kind: "flashcards",
      aborted: true,
      answered: 3,
      correct: 2,
      wrong: 1,
    });
    await expectNoAxeViolations(page);

    // Esc again takes her back to the lecture, and nothing more is sent.
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(`/forelesninger/${merkevareId}`);
    await expect(createSection(page).getByText("4 kort", { exact: true })).toBeVisible();
    expect(saves).toHaveLength(before + 1);
  });

  test("Steg 5 – FR-48, FR-50, UX-DR14, UX-DR30: tilbake på emnesiden starter hun fritekstspørsmål for hele emnet (12), skriver svaret i tekstfeltet og trykker «Vis modellsvar»", async () => {
    // Back to the subject page from the sidebar.
    await page.getByRole("navigation", { name: "Emner" }).getByRole("link", { name: "Markedsføring", exact: true }).click();
    await expect(page).toHaveURL(`/emner/${subjectId}`);
    await expect(page.locator("main h1")).toHaveText("Markedsføring");
    freetext = await freetextQuestionsViaApi(page, subjectId);
    expect(freetext).toHaveLength(5);
    expect(new Set(freetext.map((item) => item.lecture.name))).toEqual(new Set(FREETEXT_LECTURES));
    // Only the question from the page with a formula is flagged (story 6.3).
    expect(freetext.filter((item) => item.formula_flag).map((item) => `${item.source.file_name}, side ${item.source.page_no}`)).toEqual([
      FORMULA_SOURCE,
    ]);

    const practiceAll = page.getByRole("region", { name: "Øv på hele emnet" });
    await expect(practiceAll.getByRole("heading", { level: 3, name: "Fritekstspørsmål" })).toBeVisible();
    await expect(practiceAll.getByText("5 spørsmål fra 2 forelesninger")).toBeVisible();
    await expectNoAxeViolations(page);
    await practiceAll.getByRole("link", { name: "Start fritekst på hele emnet" }).click();

    await expect(page).toHaveURL(`/emner/${subjectId}/fritekst`);
    await expect(page).toHaveTitle("Fritekst – Markedsføring – Studiekamerat");
    const panel = page.getByRole("region", { name: "Fritekst" });
    await expect(panel.getByText("Markedsføring, hele emnet")).toBeVisible();
    await expect(panel.getByText("/ 5")).toBeVisible();
    await expect(panel.getByText("Ingen vurdert ennå")).toBeVisible();
    await expect(page.getByText("SPØRSMÅL 1 AV 5")).toBeVisible();
    // The field is open; the model answer and the self-assessment are hidden.
    const field = page.getByRole("textbox", { name: "Ditt svar" });
    await expect(field).toBeFocused();
    await expect(page.getByRole("button", { name: "Vis modellsvar" })).toBeDisabled();
    await expect(page.locator('[data-slot="model-answer"]')).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 3, name: "Hvordan gikk det?" })).toHaveCount(0);
    await expectNoAxeViolations(page);

    await page.keyboard.type(OWN_ANSWER);
    const reveal = page.getByRole("button", { name: "Vis modellsvar" });
    await expect(reveal).toBeEnabled();
    await reveal.click();
    await expect(page.getByRole("heading", { level: 3, name: "Modellsvar" })).toBeFocused();
    await expect(field).toHaveAttribute("readonly", "");
    await expect(page.getByText("Levert · 5 ord", { exact: true })).toBeVisible();
  });

  // The question on screen in the free-text session, from the API list.
  async function currentFreetext(): Promise<ApiFreetextQuestion> {
    const text = await page.locator('[data-slot="freetext-question"] h2').textContent();
    const question = freetext.find((item) => item.question === text);
    expect(question).toBeDefined();
    return question!;
  }

  // The model answer for `question`: the text, its source and lecture, and the
  // formula flag only on the question about margin.
  async function expectModelAnswer(question: ApiFreetextQuestion) {
    const answer = page.locator('[data-slot="model-answer"]');
    await expect(answer.getByRole("heading", { level: 3, name: "Modellsvar" })).toBeVisible();
    await expect(answer.locator("p").first()).toHaveText(question.model_answer);
    await expect(answer.locator('[data-slot="source-link"]')).toHaveText(
      `${question.source.file_name}, side ${question.source.page_no}`,
    );
    await expect(answer.getByText(question.lecture.name, { exact: true })).toBeVisible();
    if (question.formula_flag) await expect(formulaFlag(answer)).toHaveText(FORMULA_FLAG_TEXT);
    else await expect(formulaFlag(answer)).toHaveCount(0);
  }

  test("Steg 6 – FR-49, FR-51, NFR-8, UX-DR8, UX-DR9: modellsvaret står under hennes eget svar, med kilde, hun trykker 2 for «Delvis riktig», og rutenettet i øktpanelet viser ◐", async () => {
    const question = await currentFreetext();
    await expectModelAnswer(question);
    // Under her own answer: after the field in the page and lower on the screen.
    const field = page.getByRole("textbox", { name: "Ditt svar" });
    await expect(field).toHaveValue(OWN_ANSWER);
    const answer = page.locator('[data-slot="model-answer"]');
    const fieldBox = (await field.boundingBox())!;
    const answerBox = (await answer.boundingBox())!;
    expect(answerBox.y).toBeGreaterThanOrEqual(fieldBox.y + fieldBox.height);
    // Feil, Delvis riktig and Riktig, none chosen in advance.
    await expect(page.getByRole("heading", { level: 3, name: "Hvordan gikk det?" })).toBeVisible();
    const assess = page.locator('[data-slot="self-assessment"]').getByRole("button");
    await expect(assess).toHaveText(["Feil", "Delvis riktig", "Riktig"]);
    await expect(page.locator('[data-slot="self-assessment"] [aria-pressed="true"]')).toHaveCount(0);
    await expectNoAxeViolations(page);

    // `2` for «Delvis riktig» (with focus on the model answer, not in the field).
    await expect(page.getByRole("heading", { level: 3, name: "Modellsvar" })).toBeFocused();
    await page.keyboard.press("2");
    await expect(page.getByText("SPØRSMÅL 2 AV 5")).toBeVisible();
    const panel = page.getByRole("region", { name: "Fritekst" });
    await expect(panel.getByText("1 delvis riktig")).toBeVisible();
    // ◐ in the grid: the cell is marked partial, with the half-filled circle and the text.
    const cell = panel.locator('[data-mark="partial"]');
    await expect(cell).toHaveCount(1);
    await expect(cell.locator('svg[data-icon="partial"]')).toHaveCount(1);
    await expect(panel.getByText("Spørsmål 1: delvis riktig")).toBeAttached();
    // The next question starts with an empty field and focus in it.
    await expect(field).toBeFocused();
    await expect(field).toHaveValue("");
    await expectNoAxeViolations(page);
  });

  test("Steg 7 – FR-51, FR-56, UX-DR14, UX-DR34: når økten er ferdig, ser hun hvor mange hun hadde riktig, delvis riktig og feil, og økten lagres for hele emnet", async () => {
    const before = saves.length;
    // Question 3 wrong, the rest right.
    let missed: ApiFreetextQuestion | undefined;
    const seen: string[] = [];
    for (let number = 2; number <= 5; number += 1) {
      await expect(page.getByText(`SPØRSMÅL ${number} AV 5`)).toBeVisible();
      const field = page.getByRole("textbox", { name: "Ditt svar" });
      await expect(field).toBeFocused();
      await page.keyboard.type(OWN_ANSWER);
      await page.getByRole("button", { name: "Vis modellsvar" }).click();
      await expect(page.getByRole("heading", { level: 3, name: "Modellsvar" })).toBeFocused();
      const question = await currentFreetext();
      seen.push(question.question);
      await expectModelAnswer(question);
      if (number === 3) missed = question;
      await page.keyboard.press(number === 3 ? "1" : "3");
    }
    // The first question (step 6) is the one she was partly right on.
    const partial = freetext.find((item) => !seen.includes(item.question));
    expect(new Set(seen).size).toBe(4);
    expect(partial).toBeDefined();

    await expect(page.getByRole("heading", { level: 2, name: "Du har gått gjennom alle 5 spørsmålene" })).toBeFocused();
    await expect(page.locator('[data-slot="result-field"]')).toHaveText(["Riktig3", "Delvis riktig1", "Feil1"]);
    // The questions she marked Feil or Delvis riktig, with model answer and
    // source, and her own answer is not shown, since it is not saved.
    const list = page.getByRole("region", { name: "Feil og delvis riktig" });
    await expect(list.getByText("2 spørsmål")).toBeVisible();
    const rows = list.getByRole("listitem");
    await expect(rows).toHaveCount(2);
    for (const question of [missed!, partial!]) {
      const row = rows.filter({ hasText: question.question });
      await expect(row).toHaveCount(1);
      await expect(row).toContainText(question.model_answer);
      await expect(row.locator('[data-slot="source-link"]')).toHaveText(
        `${question.source.file_name}, side ${question.source.page_no}`,
      );
      await expect(row.locator('[data-slot="missed-lecture"]')).toHaveText(`Forelesning: ${question.lecture.name}`);
    }
    await expect(rows.filter({ hasText: missed!.question })).toContainText("Feil");
    await expect(rows.filter({ hasText: partial!.question })).toContainText("Delvis riktig");
    await expect(list).not.toContainText(OWN_ANSWER);
    await expect(page.getByRole("region", { name: "Fritekst" }).getByText("Økten er ferdig og lagret")).toBeVisible();
    await expectNoAxeViolations(page);

    // Saved once, for the whole subject, with the three numbers and without her answers.
    await expect.poll(() => saves.length).toBe(before + 1);
    const body = saves.at(-1)!.postDataJSON();
    expect(body).toMatchObject({
      subject_id: subjectId,
      lecture_id: null,
      kind: "freetext",
      aborted: false,
      answered: 5,
      correct: 3,
      partial: 1,
      wrong: 1,
    });
    expect(JSON.stringify(body)).not.toContain(OWN_ANSWER);

    // Back on the subject page, SISTE ØKT shows the free-text session.
    await page.getByRole("link", { name: "Tilbake til emnet" }).click();
    await expect(page).toHaveURL(`/emner/${subjectId}`);
    const practiceAll = page.getByRole("region", { name: "Øv på hele emnet" });
    await expect(practiceAll.getByText("Fritekstspørsmål · Hele emnet", { exact: true })).toBeVisible();
    await expect(practiceAll.getByText(`${dayFromToday(0).dayMonth} · 3 av 5 riktige`, { exact: true })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("Feilvei (formelmerke) – FR-40, FR-41, UX-DR37: et kort er merket «Inneholder formel – sjekk mot kilden», og hun slår opp i PDF-en på siden som står i kilden", async () => {
    await sidebarLecture(page, FORMULA.lecture).click();
    await expect(page).toHaveURL(`/forelesninger/${lectureIds.get(FORMULA.lecture)}`);
    await expect(page.locator("main h1")).toHaveText(FORMULA.lecture);
    await createSection(page).getByRole("button", { name: "Øv nå" }).click();
    await expect(page).toHaveURL(`/forelesninger/${lectureIds.get(FORMULA.lecture)}/flashcards`);
    await expect(sessionPanel(page).getByText("/ 4")).toBeVisible();

    // She knows every card but the one with the formula, which she checks against the source.
    const card = page.locator('[data-slot="flashcard"]');
    const seen: string[] = [];
    for (let i = 0; i < PRISING_FRONTS.length; i += 1) {
      const question = (await cardFront(page).textContent())!;
      seen.push(question);
      await page.keyboard.press(" ");
      await expect(card.locator('[data-slot="source-link"]')).toHaveText(/^prising\.pdf, side [2-5]$/);
      if (question === FORMULA.front) {
        // The flag stands directly above the source, which names the page to look up.
        await expectFormulaFlagAboveSource(card, FORMULA_SOURCE);
        await expect(formulaFlag(card).getByText("Inneholder formel – sjekk mot kilden")).toBeVisible();
        await expectNoAxeViolations(page);
        await page.keyboard.press("1");
      } else {
        await expect(formulaFlag(card)).toHaveCount(0);
        await page.keyboard.press("2");
      }
    }
    expect([...seen].sort()).toEqual([...PRISING_FRONTS].sort());

    // The card she did not know comes again, still with the flag.
    await expect(cardFront(page)).toHaveText(FORMULA.front);
    const saved = page.waitForResponse((response) => new URL(response.url()).pathname === SAVE_PATH);
    await page.keyboard.press(" ");
    await expectFormulaFlagAboveSource(card, FORMULA_SOURCE);
    await page.keyboard.press("2");
    expect((await saved).status()).toBe(204);

    // The missed list (08) shows the flag above the source as well.
    await expect(page.getByRole("heading", { level: 2, name: "Du har gått gjennom alle 4 kortene" })).toBeFocused();
    const missed = page.getByRole("region", { name: "Kortene du ikke kunne" }).getByRole("listitem");
    await expect(missed).toHaveCount(1);
    await expect(missed).toContainText(FORMULA.front);
    await expectFormulaFlagAboveSource(missed, FORMULA_SOURCE);
    await expectNoAxeViolations(page);

    // Back on the lecture page (04), the file in the source is in the file list,
    // with enough pages for page 5: that is the PDF she opens to check.
    await page.getByRole("link", { name: "Tilbake til forelesningen" }).click();
    await expect(page).toHaveURL(`/forelesninger/${lectureIds.get(FORMULA.lecture)}`);
    await expect(fileRows(page)).toHaveCount(1);
    await expect(fileRows(page).first()).toContainText(FORMULA.file);
    await expect(fileRows(page).first()).toContainText("5 sider");
    await expectNoAxeViolations(page);
  });
});
