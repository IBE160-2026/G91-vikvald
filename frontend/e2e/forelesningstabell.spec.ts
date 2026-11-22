import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { makePdf } from "./pdf";

// Story 5.2: the lecture table on the subject page (03) shows Kort and Quiz
// from the content registry (FR-16) and Status from GET /api/overview
// («Øvd dd.mm», «Ikke øvd ennå», «Ingen filer ennå», UX-DR13).

const PASSWORD = "hemmelig1";
const SAVE_PATH = "/api/practice-sessions";

function uniqueEmail(): string {
  return `klara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@eksempel.no`;
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

type Counts = { flashcards: number; quiz_questions: number };
type Setup = {
  subjectId: string;
  // Uke 37: one file, cards and quiz questions from the mock model.
  first: string;
  // Uke 38: one file and cards only.
  second: string;
  // Uke 39: no files.
  third: string;
  counts: Record<string, Counts>;
};

async function contentCounts(page: Page, lectureId: string): Promise<Counts> {
  return (await page.request.get(`/api/lectures/${lectureId}/content-counts`)).json();
}

// Starts a job and waits until it has made content of its kind.
async function generate(page: Page, lectureId: string, kind: "flashcards" | "quiz") {
  const params = kind === "quiz" ? { requested: 10, difficulty: "medium" } : { requested: 10 };
  const start = await page.request.post(`/api/lectures/${lectureId}/jobs`, { data: { kind, params } });
  expect(start.status()).toBe(202);
  const field = kind === "quiz" ? "quiz_questions" : "flashcards";
  await expect.poll(async () => (await contentCounts(page, lectureId))[field], { timeout: 10_000 }).toBeGreaterThan(0);
  // Wait for the job itself to finish too, so the next job on the lecture may start.
  await expect
    .poll(async () => ((await (await page.request.get("/api/jobs/active")).json()) as unknown[]).length, {
      timeout: 10_000,
    })
    .toBe(0);
}

// A new, logged-in student with three lectures in Markedsføring.
async function subjectWithContent(page: Page): Promise<Setup> {
  const register = await page.request.post("/api/identity/register", {
    data: { email: uniqueEmail(), password: PASSWORD },
  });
  expect(register.status()).toBe(201);
  expect((await page.request.post("/api/identity/terms")).status()).toBe(200);
  const subject = await page.request.post("/api/subjects", { data: { name: "Markedsføring", exam_date: "2026-12-04" } });
  const subjectId = (await subject.json()).id;
  const lecture = async (name: string, date: string) =>
    (await (await page.request.post(`/api/subjects/${subjectId}/lectures`, { data: { name, date } })).json()).id as string;
  const first = await lecture("Uke 37: Merkevare", "2026-09-11");
  const second = await lecture("Uke 38: Pris", "2026-09-18");
  const third = await lecture("Uke 39: Kanal", "2026-09-25");
  // Five definition sentences: the mock model makes quiz questions only from
  // four or more.
  const pages = [
    "Merkevare er et navn som skiller et produkt fra andre.",
    "Pris er det kunden betaler for varen.",
    "Segment er en gruppe kunder med like behov.",
    "Kanal er veien varen tar fram til kunden.",
    "Posisjon er plassen produktet har hos kunden.",
  ];
  for (const lectureId of [first, second]) {
    const upload = await page.request.post(`/api/lectures/${lectureId}/files`, {
      multipart: { file: { name: "definisjoner.pdf", mimeType: "application/pdf", buffer: makePdf({ pages }) } },
    });
    expect(upload.status()).toBe(201);
  }
  await generate(page, first, "flashcards");
  await generate(page, first, "quiz");
  await generate(page, second, "flashcards");
  const counts = {
    [first]: await contentCounts(page, first),
    [second]: await contentCounts(page, second),
  };
  expect(counts[second].quiz_questions).toBe(0);
  return { subjectId, first, second, third, counts };
}

// The server sets started_at to the time it receives the session minus
// duration_seconds. A whole-subject session must start after the content was
// made to count for it, so those tests pass 0.
async function saveSession(
  page: Page,
  subjectId: string,
  lectureId: string | null,
  kind: "flashcards" | "quiz",
  durationSeconds = 60,
) {
  const body = {
    session_id: crypto.randomUUID(),
    subject_id: subjectId,
    lecture_id: lectureId,
    kind,
    aborted: false,
    shown: 3,
    answered: 3,
    correct: 2,
    partial: 0,
    wrong: 1,
    duration_seconds: durationSeconds,
  };
  expect((await page.request.post(SAVE_PATH, { data: body })).status()).toBe(204);
}

// The «dd.mm» the table should show for a lecture: last_practiced_at from
// GET /api/overview, formatted in the browser's own time zone the way
// formatDayMonth does it (never the test process's clock).
async function expectedPractisedDate(page: Page, subjectId: string, lectureId: string): Promise<string> {
  const overview = await (await page.request.get("/api/overview")).json();
  const subject = overview.subjects.find((item: { id: string }) => item.id === subjectId);
  const lecture = subject.lectures.find((item: { id: string }) => item.id === lectureId);
  expect(lecture.practiced).toBe(true);
  return page.evaluate((iso) => {
    const date = new Date(iso);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;
  }, lecture.last_practiced_at as string);
}

function shown(count: number): string {
  return count === 0 ? "–" : String(count);
}

function rows(page: Page): Locator {
  return page.locator("main table tbody tr");
}

// Presses Tab until the element has focus (keyboard only, no clicks).
async function tabTo(page: Page, element: Locator, maxPresses = 40) {
  for (let i = 0; i < maxPresses; i += 1) {
    await page.keyboard.press("Tab");
    if (await element.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error("Tab never reached the element");
}

test.describe("Tellinger og «Øvd» i forelesningstabellen (story 5.2)", () => {
  test("FR-16, UX-DR13: Kort, Quiz og «Øvd dd.mm» med datoen fra oversikten", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const { subjectId, first, second, counts } = await subjectWithContent(page);
    await saveSession(page, subjectId, first, "flashcards");
    const day = await expectedPractisedDate(page, subjectId, first);

    await page.goto(`/emner/${subjectId}`);
    const table = page.locator("main table");
    await expect(table.getByRole("columnheader")).toHaveText(["Dato", "Forelesning", "Filer", "Kort", "Quiz", "Status"]);
    await expect(rows(page).nth(0).getByRole("cell")).toHaveText([
      "11.09",
      "Uke 37: Merkevare",
      "1",
      shown(counts[first].flashcards),
      shown(counts[first].quiz_questions),
      `Øvd ${day}`,
    ]);
    await expect(rows(page).nth(0).locator('[data-status="practised"]')).toBeVisible();
    await expect(rows(page).nth(1).getByRole("cell")).toHaveText([
      "18.09",
      "Uke 38: Pris",
      "1",
      shown(counts[second].flashcards),
      "–",
      "Ikke øvd ennå",
    ]);
    await expect(rows(page).nth(1).locator('[data-status="not-practised"]')).toBeVisible();
    await expect(rows(page).nth(2).getByRole("cell")).toHaveText(["25.09", "Uke 39: Kanal", "–", "–", "–", "Ingen filer ennå"]);
    await expect(rows(page).nth(2).locator("[data-status]")).toHaveCount(0);
    // At 1280 px every status text fits without «…».
    for (let i = 0; i < 3; i += 1) {
      const text = rows(page).nth(i).locator('[data-column="status"] > span:last-child');
      expect(await text.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
  });

  test("FR-16: en quiz-emneøkt gir «Øvd» bare der det fantes quizspørsmål", async ({ page }) => {
    const { subjectId, first } = await subjectWithContent(page);
    await saveSession(page, subjectId, null, "quiz", 0);
    const day = await expectedPractisedDate(page, subjectId, first);

    await page.goto(`/emner/${subjectId}`);
    await expect(rows(page).nth(0).getByRole("cell").nth(5)).toHaveText(`Øvd ${day}`);
    // Uke 38 has only cards, Uke 39 nothing.
    await expect(rows(page).nth(1).getByRole("cell").nth(5)).toHaveText("Ikke øvd ennå");
    await expect(rows(page).nth(2).getByRole("cell").nth(5)).toHaveText("Ingen filer ennå");
  });

  test("UX-DR13: Tab til raden og Enter åpner forelesningen (04)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const { subjectId, second } = await subjectWithContent(page);
    await page.goto(`/emner/${subjectId}`);
    await expect(rows(page).nth(1).getByRole("cell").nth(5)).toHaveText("Ikke øvd ennå");

    const link = rows(page).nth(1).getByRole("link");
    await tabTo(page, link);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/forelesninger/${second}$`));
    await expect(page.locator("main h1")).toHaveText("Uke 38: Pris");
  });

  for (const width of [1280, 768]) {
    test(`UX-DR13: ingen axe-brudd på 03 med tellinger og status, ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const { subjectId, first } = await subjectWithContent(page);
      await saveSession(page, subjectId, first, "flashcards");

      await page.goto(`/emner/${subjectId}`);
      await expect(rows(page).nth(0).locator('[data-status="practised"]')).toBeVisible();
      await expect(rows(page).nth(2).getByRole("cell").nth(5)).toHaveText("Ingen filer ennå");
      await expectNoAxeViolations(page);
    });
  }
});
