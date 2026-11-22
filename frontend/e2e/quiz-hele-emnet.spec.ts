import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page, type Request } from "@playwright/test";

import { makePdf } from "./pdf";

// Story 4.4: the Quiz row in «Øv på hele emnet» on the subject page (mockup
// 03) and the quiz over all the subject's lectures (mockups 09 and 10).

const PASSWORD = "hemmelig1";
const SAVE_PATH = "/api/practice-sessions";
const LETTERS = ["a", "b", "c", "d"] as const;
const FIRST = "Uke 37: Merkevare";
const SECOND = "Uke 38: Pris";

type ApiQuestion = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  lecture: { id: string; name: string };
};

function uniqueEmail(): string {
  return `klara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@eksempel.no`;
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

// Presses Tab until the element has focus (keyboard only, no clicks).
async function tabTo(page: Page, element: Locator, maxPresses = 80) {
  for (let i = 0; i < maxPresses; i += 1) {
    await page.keyboard.press("Tab");
    if (await element.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error("Tab never reached the element");
}

// A new, logged-in student with the subject «Markedsføring».
async function newSubject(page: Page): Promise<string> {
  const register = await page.request.post("/api/identity/register", {
    data: { email: uniqueEmail(), password: PASSWORD },
  });
  expect(register.status()).toBe(201);
  expect((await page.request.post("/api/identity/terms")).status()).toBe(200);
  const subject = await page.request.post("/api/subjects", { data: { name: "Markedsføring", exam_date: "2026-12-04" } });
  return (await subject.json()).id;
}

async function newLecture(page: Page, subjectId: string, name: string, date: string): Promise<string> {
  const lecture = await page.request.post(`/api/subjects/${subjectId}/lectures`, { data: { name, date } });
  return (await lecture.json()).id;
}

async function upload(page: Page, lectureId: string, fileName: string, pages: string[]) {
  const response = await page.request.post(`/api/lectures/${lectureId}/files`, {
    multipart: { file: { name: fileName, mimeType: "application/pdf", buffer: makePdf({ pages }) } },
  });
  expect(response.status()).toBe(201);
}

// Makes quiz questions from the lecture's files with the mock model (one per
// definition sentence).
async function addQuiz(page: Page, lectureId: string, expected: number) {
  const job = await page.request.post(`/api/lectures/${lectureId}/jobs`, {
    data: { kind: "quiz", params: { requested: 10, difficulty: "medium" } },
  });
  expect(job.status()).toBe(202);
  await expect
    .poll(
      async () => (await (await page.request.get(`/api/lectures/${lectureId}/content-counts`)).json()).quiz_questions,
      { timeout: 10_000 },
    )
    .toBe(expected);
}

// A subject with two lectures with four quiz questions each. Returns the
// subject and its questions (with the answer key and lecture).
async function subjectWithQuiz(page: Page): Promise<{ subjectId: string; questions: ApiQuestion[] }> {
  const subjectId = await newSubject(page);
  const first = await newLecture(page, subjectId, FIRST, "2026-09-11");
  const second = await newLecture(page, subjectId, SECOND, "2026-09-18");
  await upload(page, first, "merkevare.pdf", [
    "Merkevare er et navn som skiller et produkt fra andre.",
    "Segment er en gruppe kunder med like behov.",
    "Kanal er veien varen tar fram til kunden.",
    "Posisjon er plassen produktet har hos kunden.",
  ]);
  await upload(page, second, "pris.pdf", [
    "Pris er det kunden betaler for varen.",
    "Rabatt er et avslag i prisen.",
    "Kampanje er et tilbud i en kort periode.",
    "Margin er forskjellen mellom pris og kostnad.",
  ]);
  await addQuiz(page, first, 4);
  await addQuiz(page, second, 4);
  const response = await page.request.get(`/api/subjects/${subjectId}/quiz-questions`);
  expect(response.status()).toBe(200);
  return { subjectId, questions: (await response.json()) as ApiQuestion[] };
}

function captureSaves(page: Page): Request[] {
  const saves: Request[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === SAVE_PATH) saves.push(request);
  });
  return saves;
}

const panel = (page: Page) => page.getByRole("region", { name: "Quiz" });
const quizQuestion = (page: Page) => page.locator('[data-slot="quiz-question"]');
const result = (page: Page) => page.locator('[data-slot="quiz-result"]');
const missedList = (page: Page) => page.locator('[data-slot="missed-list"]');
const practiceSection = (page: Page) => page.getByRole("region", { name: "Øv på hele emnet" });

// Answers the question on screen with the keyboard: right or wrong (the next
// option after the correct one). Returns the question.
async function answerShown(page: Page, questions: ApiQuestion[], right: boolean): Promise<ApiQuestion> {
  const text = await quizQuestion(page).getByRole("heading", { level: 2 }).textContent();
  const question = questions.find((item) => item.question === text);
  expect(question).toBeDefined();
  const chosen = right ? question!.correct_index : (question!.correct_index + 1) % 4;
  await page.keyboard.press(LETTERS[chosen]);
  await page.keyboard.press("Enter");
  await expect(quizQuestion(page).getByRole("status")).toContainText(right ? "Riktig." : "Feil.");
  return question!;
}

test.describe("Quiz på hele emnet (story 4.4)", () => {
  test("FR-34, UX-DR14: emnesiden har Quiz-raden under Flashcards uten axe-brudd på 1280 og 768 px, og «Start» nås med tastaturet", async ({
    page,
  }) => {
    const { subjectId } = await subjectWithQuiz(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/emner/${subjectId}`);
    const section = practiceSection(page);
    await expect(section.getByRole("heading", { level: 3, name: "Quiz" })).toBeVisible();
    await expect(section.getByText("8 spørsmål fra 2 forelesninger")).toBeVisible();
    // No flashcards made: only the Quiz row.
    await expect(section.getByRole("heading", { level: 3 })).toHaveText(["Quiz"]);
    const start = section.getByRole("link", { name: "Start quiz på hele emnet" });
    await expect(start).toHaveAttribute("href", `/emner/${subjectId}/quiz`);
    // Seen: «Start» and the arrow; the rest of the name is visually hidden.
    await expect(start.locator(".sr-only")).toHaveText("quiz på hele emnet");
    await expect(start.locator("svg")).toHaveCount(1);
    await expectNoHorizontalScroll(page);
    await expectNoAxeViolations(page);

    await page.setViewportSize({ width: 768, height: 900 });
    await expect(start).toBeVisible();
    // The action stays on the row's line, to the right of the title.
    const title = section.getByRole("heading", { level: 3, name: "Quiz" });
    expect((await start.boundingBox())!.x).toBeGreaterThan((await title.boundingBox())!.x + (await title.boundingBox())!.width);
    await expectNoHorizontalScroll(page);
    await expectNoAxeViolations(page);

    await page.setViewportSize({ width: 1280, height: 900 });
    await tabTo(page, start);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`/emner/${subjectId}/quiz`);
    await expect(panel(page).getByText("/ 8")).toBeVisible();
  });

  test("FR-34: med både kort og quiz står Quiz-raden under Flashcards", async ({ page }) => {
    const subjectId = await newSubject(page);
    const lectureId = await newLecture(page, subjectId, FIRST, "2026-09-11");
    await upload(page, lectureId, "merkevare.pdf", [
      "Merkevare er et navn som skiller et produkt fra andre.",
      "Segment er en gruppe kunder med like behov.",
      "Kanal er veien varen tar fram til kunden.",
      "Posisjon er plassen produktet har hos kunden.",
    ]);
    const cards = await page.request.post(`/api/lectures/${lectureId}/jobs`, {
      data: { kind: "flashcards", params: { requested: 10 } },
    });
    expect(cards.status()).toBe(202);
    await expect
      .poll(async () => (await (await page.request.get(`/api/lectures/${lectureId}/content-counts`)).json()).flashcards, {
        timeout: 10_000,
      })
      .toBe(4);
    await addQuiz(page, lectureId, 4);
    await page.goto(`/emner/${subjectId}`);
    await expect(practiceSection(page).getByRole("heading", { level: 3 })).toHaveText(["Flashcards", "Quiz"]);
    await expect(practiceSection(page).getByText("4 spørsmål fra 1 forelesning")).toBeVisible();
  });

  test("FR-34, FR-56, AR-9: økten har spørsmålene fra begge forelesningene, viser forelesningen og lagres med lecture_id null", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const { subjectId, questions } = await subjectWithQuiz(page);
    expect(new Set(questions.map((item) => item.lecture.name))).toEqual(new Set([FIRST, SECOND]));
    const saves = captureSaves(page);
    await page.goto(`/emner/${subjectId}/quiz`);
    await expect(page).toHaveTitle("Quiz – Markedsføring – Studiekamerat");
    await expect(panel(page).getByText("Markedsføring, hele emnet")).toBeVisible();
    await expect(panel(page).getByText("/ 8")).toBeVisible();
    await expect(page.getByText("SPØRSMÅL 1 AV 8")).toBeVisible();
    await expectNoAxeViolations(page);

    // Only the keyboard: every other question wrong.
    const seen: ApiQuestion[] = [];
    for (let number = 1; number <= 8; number += 1) {
      await expect(page.getByText(`SPØRSMÅL ${number} AV 8`)).toBeVisible();
      const question = await answerShown(page, questions, number % 2 === 0);
      seen.push(question);
      // The explanation card shows the question's own lecture.
      await expect(page.locator('[data-slot="explanation-card"]')).toContainText(question.lecture.name);
      if (number === 1) {
        await expectNoAxeViolations(page);
        await page.setViewportSize({ width: 768, height: 900 });
        await expectNoHorizontalScroll(page);
        await expectNoAxeViolations(page);
        await page.setViewportSize({ width: 1280, height: 900 });
      }
      await page.keyboard.press("Enter");
    }
    expect(new Set(seen.map((item) => item.question)).size).toBe(8);

    await expect(page.getByRole("heading", { level: 2, name: "4 av 8 riktige" })).toBeFocused();
    await expect(
      result(page).getByText("Markedsføring, hele emnet · her er de 4 du svarte feil på, med riktig svar og kilde"),
    ).toBeVisible();
    const rows = missedList(page).getByRole("listitem");
    await expect(rows).toHaveCount(4);
    const missed = seen.filter((_, index) => (index + 1) % 2 === 1);
    for (let i = 0; i < 4; i += 1) {
      await expect(rows.nth(i)).toContainText(missed[i].question);
      await expect(rows.nth(i).locator('[data-slot="missed-lecture"]')).toHaveText(`Forelesning: ${missed[i].lecture.name}`);
    }
    await expect(page.getByRole("list", { name: "Hurtigtaster" })).toHaveText("Enter ta quizen igjenEsc tilbake til emnet");
    await expect(page.getByRole("link", { name: "Tilbake til emnet" })).toHaveAttribute("href", `/emner/${subjectId}`);
    await expect.poll(() => saves.length).toBe(1);
    expect(saves[0].postDataJSON()).toMatchObject({
      subject_id: subjectId,
      lecture_id: null,
      kind: "quiz",
      aborted: false,
      answered: 8,
      correct: 4,
      wrong: 4,
      partial: 0,
    });
    await expectNoAxeViolations(page);
    await page.setViewportSize({ width: 768, height: 900 });
    await expectNoHorizontalScroll(page);
    await expectNoAxeViolations(page);

    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(`/emner/${subjectId}`);
    expect(saves).toHaveLength(1);
  });

  test("FR-56, UX-DR33: avsluttet etter ett svar lagres som avbrutt med lecture_id null; Esc og «Tilbake til emnet» går til emnesiden", async ({
    page,
  }) => {
    const { subjectId, questions } = await subjectWithQuiz(page);
    const saves = captureSaves(page);

    // Nothing confirmed: straight back, nothing sent.
    await page.goto(`/emner/${subjectId}/quiz`);
    await expect(page.getByText("SPØRSMÅL 1 AV 8")).toBeVisible();
    await page.keyboard.press("a");
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(`/emner/${subjectId}`);
    expect(saves).toHaveLength(0);

    await page.goto(`/emner/${subjectId}/quiz`);
    await expect(page.getByText("SPØRSMÅL 1 AV 8")).toBeVisible();
    await answerShown(page, questions, false);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { level: 2, name: "Avbrutt etter 1 av 8" })).toBeFocused();
    await expect.poll(() => saves.length).toBe(1);
    expect(saves[0].postDataJSON()).toMatchObject({
      subject_id: subjectId,
      lecture_id: null,
      kind: "quiz",
      aborted: true,
      answered: 1,
      correct: 0,
      wrong: 1,
    });
    await expectNoAxeViolations(page);

    const back = page.getByRole("link", { name: "Tilbake til emnet" });
    await tabTo(page, back);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`/emner/${subjectId}`);
    expect(saves).toHaveLength(1);
  });

  test("A15: et emne uten quizspørsmål har ingen Quiz-rad, og økten viser tomtilstanden", async ({ page }) => {
    const subjectId = await newSubject(page);
    await newLecture(page, subjectId, FIRST, "2026-09-11");
    const loaded = page.waitForResponse(
      (response) => new URL(response.url()).pathname === `/api/subjects/${subjectId}/quiz-questions`,
    );
    await page.goto(`/emner/${subjectId}`);
    expect(await (await loaded).json()).toEqual([]);
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("Øv på hele emnet")).toHaveCount(0);

    await page.goto(`/emner/${subjectId}/quiz`);
    await expect(page.getByRole("heading", { level: 1, name: "Det finnes ingen quizspørsmål her ennå." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tilbake til emnet" })).toHaveAttribute("href", `/emner/${subjectId}`);
    await expectNoAxeViolations(page);
  });

  test("FR-4: andres emne gir 404 NOT_FOUND i API-et og «Fant ikke siden» på siden", async ({ page }) => {
    const subjectId = await newSubject(page);
    await page.request.post("/api/identity/logout");
    await newSubject(page);
    const response = await page.request.get(`/api/subjects/${subjectId}/quiz-questions`);
    expect(response.status()).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_FOUND");
    await page.goto(`/emner/${subjectId}/quiz`);
    await expect(page.locator("main h1")).toHaveText("Fant ikke siden");
  });
});
