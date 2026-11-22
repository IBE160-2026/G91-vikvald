import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page, type Request } from "@playwright/test";

import { makePdf } from "./pdf";

const PASSWORD = "hemmelig1";
const SAVE_PATH = "/api/practice-sessions";
const LETTERS = ["a", "b", "c", "d"] as const;

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
async function tabTo(page: Page, element: Locator, maxPresses = 60) {
  for (let i = 0; i < maxPresses; i += 1) {
    await page.keyboard.press("Tab");
    if (await element.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error("Tab never reached the element");
}

type ApiQuestion = { question: string; options: string[]; correct_index: number; explanation: string };

// A new, logged-in student who has accepted the terms, with one lecture that
// has five quiz questions (the mock model makes one per definition sentence).
// Returns the lecture and its questions (with the answer key), so the test
// knows which letter is right.
async function lectureWithQuiz(page: Page): Promise<{ lectureId: string; questions: ApiQuestion[] }> {
  const register = await page.request.post("/api/identity/register", {
    data: { email: uniqueEmail(), password: PASSWORD },
  });
  expect(register.status()).toBe(201);
  expect((await page.request.post("/api/identity/terms")).status()).toBe(200);
  const subject = await page.request.post("/api/subjects", { data: { name: "Markedsføring", exam_date: "2026-12-04" } });
  const subjectId = (await subject.json()).id;
  const lecture = await page.request.post(`/api/subjects/${subjectId}/lectures`, {
    data: { name: "Uke 37: Merkevare", date: "2026-09-11" },
  });
  const lectureId = (await lecture.json()).id;
  const pages = [
    "Merkevare er et navn som skiller et produkt fra andre.",
    "Pris er det kunden betaler for varen.",
    "Segment er en gruppe kunder med like behov.",
    "Kanal er veien varen tar fram til kunden.",
    "Posisjon er plassen produktet har hos kunden.",
  ];
  const upload = await page.request.post(`/api/lectures/${lectureId}/files`, {
    multipart: { file: { name: "definisjoner.pdf", mimeType: "application/pdf", buffer: makePdf({ pages }) } },
  });
  expect(upload.status()).toBe(201);
  const job = await page.request.post(`/api/lectures/${lectureId}/jobs`, {
    data: { kind: "quiz", params: { requested: 10, difficulty: "medium" } },
  });
  expect(job.status()).toBe(202);
  await expect
    .poll(
      async () => (await (await page.request.get(`/api/lectures/${lectureId}/content-counts`)).json()).quiz_questions,
      { timeout: 10_000 },
    )
    .toBe(5);
  const questions = (await (await page.request.get(`/api/lectures/${lectureId}/quiz-questions`)).json()) as ApiQuestion[];
  return { lectureId, questions };
}

// Every POST /api/practice-sessions the page sends.
function captureSaves(page: Page): Request[] {
  const saves: Request[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === SAVE_PATH) saves.push(request);
  });
  return saves;
}

function quizQuestion(page: Page): Locator {
  return page.locator('[data-slot="quiz-question"]');
}

// Answers the question on screen with the keyboard: right or wrong (the next
// option after the correct one). Returns the question and what was chosen.
async function answerShown(
  page: Page,
  questions: ApiQuestion[],
  right: boolean,
): Promise<{ question: ApiQuestion; chosen: number }> {
  const text = await quizQuestion(page).getByRole("heading", { level: 2 }).textContent();
  const question = questions.find((item) => item.question === text);
  expect(question).toBeDefined();
  const chosen = right ? question!.correct_index : (question!.correct_index + 1) % 4;
  await page.keyboard.press(LETTERS[chosen]);
  await page.keyboard.press("Enter");
  await expect(quizQuestion(page).getByRole("status")).toContainText(right ? "Riktig." : "Feil.");
  return { question: question!, chosen };
}

const result = (page: Page) => page.locator('[data-slot="quiz-result"]');
const missedList = (page: Page) => page.locator('[data-slot="missed-list"]');

test.describe("Quizresultat (story 4.3)", () => {
  test("FR-36, UX-DR34, UX-DR35: resultat med feilsvar, axe på 1280 og 768 px, og Enter tar quizen igjen med ny session_id", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const { lectureId, questions } = await lectureWithQuiz(page);
    const saves = captureSaves(page);
    await page.goto(`/forelesninger/${lectureId}/quiz`);
    await expect(page.getByText("SPØRSMÅL 1 AV 5")).toBeVisible();

    // Question 2 wrong, the rest right; only the keyboard.
    let missed: { question: ApiQuestion; chosen: number } | null = null;
    for (let number = 1; number <= 5; number += 1) {
      await expect(page.getByText(`SPØRSMÅL ${number} AV 5`)).toBeVisible();
      const answered = await answerShown(page, questions, number !== 2);
      if (number === 2) missed = answered;
      await page.keyboard.press("Enter");
    }

    const title = page.getByRole("heading", { level: 2, name: "4 av 5 riktige" });
    await expect(title).toBeFocused();
    await expect(result(page).getByText("QUIZ FERDIG")).toBeVisible();
    await expect(
      result(page).getByText("Uke 37: Merkevare · her er den ene du svarte feil på, med riktig svar og kilde"),
    ).toBeVisible();
    const rows = missedList(page).getByRole("listitem");
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText("Spørsmål 2:");
    await expect(rows).toContainText(missed!.question.question);
    await expect(rows).toContainText(`Ditt svar${missed!.question.options[missed!.chosen]}`);
    await expect(rows).toContainText(`Riktig svar${missed!.question.options[missed!.question.correct_index]}`);
    await expect(rows).toContainText(missed!.question.explanation);
    await expect(rows.locator('[data-slot="source-link"]')).toHaveText(/^definisjoner\.pdf, side \d$/);
    await expect(page.getByRole("region", { name: "Quiz" }).getByText("Økten er ferdig og lagret")).toBeVisible();
    await expect(page.getByRole("list", { name: "Hurtigtaster" })).toHaveText(
      "Enter ta quizen igjenEsc tilbake til forelesningen",
    );
    await expect(page.getByRole("button", { name: "Ta quizen igjen" })).toBeVisible();
    await expect.poll(() => saves.length).toBe(1);
    await expectNoAxeViolations(page);

    await page.setViewportSize({ width: 768, height: 900 });
    await expect(title).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoAxeViolations(page);
    await page.setViewportSize({ width: 1280, height: 900 });

    // Enter from the page (focus on the title) takes the quiz again.
    await title.focus();
    const refetched = page.waitForResponse(
      (response) => new URL(response.url()).pathname === `/api/lectures/${lectureId}/quiz-questions`,
    );
    await page.keyboard.press("Enter");
    await refetched;
    await expect(page.getByText("SPØRSMÅL 1 AV 5")).toBeVisible();
    await expect(quizQuestion(page).getByRole("heading", { level: 2 })).toBeFocused();
    await expect(page.getByRole("region", { name: "Quiz" }).getByText("0 riktige · 0 feil")).toBeVisible();

    await answerShown(page, questions, false);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { level: 2, name: "Avbrutt etter 1 av 5" })).toBeFocused();
    await expect(
      result(page).getByText("Uke 37: Merkevare · 0 av 1 riktige · her er den ene du svarte feil på, med riktig svar og kilde"),
    ).toBeVisible();
    await expect(missedList(page).getByRole("listitem")).toHaveCount(1);
    await expect.poll(() => saves.length).toBe(2);
    const [first, second] = saves.map((request) => request.postDataJSON());
    expect(first).toMatchObject({ kind: "quiz", aborted: false, answered: 5, correct: 4, wrong: 1 });
    expect(second).toMatchObject({ kind: "quiz", aborted: true, answered: 1, correct: 0, wrong: 1 });
    expect(second.session_id).not.toBe(first.session_id);
    await expectNoAxeViolations(page);

    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(new RegExp(`/forelesninger/${lectureId}$`));
  });

  test("FR-36: alle riktige gir ingen liste, ingen axe-brudd på 1280 og 768 px, og Enter på lenken følger bare lenken", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const { lectureId, questions } = await lectureWithQuiz(page);
    const saves = captureSaves(page);
    await page.goto(`/forelesninger/${lectureId}/quiz`);
    await expect(page.getByText("SPØRSMÅL 1 AV 5")).toBeVisible();
    for (let number = 1; number <= 5; number += 1) {
      await expect(page.getByText(`SPØRSMÅL ${number} AV 5`)).toBeVisible();
      await answerShown(page, questions, true);
      await page.keyboard.press("Enter");
    }

    await expect(page.getByRole("heading", { level: 2, name: "5 av 5 riktige" })).toBeFocused();
    await expect(result(page).getByText("Uke 37: Merkevare", { exact: true })).toBeVisible();
    await expect(missedList(page)).toHaveCount(0);
    await expect.poll(() => saves.length).toBe(1);
    await expectNoAxeViolations(page);
    await page.setViewportSize({ width: 768, height: 900 });
    await expectNoHorizontalScroll(page);
    await expectNoAxeViolations(page);

    const back = page.getByRole("link", { name: "Tilbake til forelesningen" });
    await tabTo(page, back);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/forelesninger/${lectureId}$`));
    expect(saves).toHaveLength(1);
  });
});
