import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page, type Request } from "@playwright/test";

import { makePdf } from "./pdf";

const PASSWORD = "hemmelig1";
const SAVE_PATH = "/api/practice-sessions";

function uniqueEmail(): string {
  return `klara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@eksempel.no`;
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// Presses Tab until the element has focus (keyboard only, no clicks).
async function tabTo(page: Page, element: Locator, maxPresses = 60) {
  for (let i = 0; i < maxPresses; i += 1) {
    await page.keyboard.press("Tab");
    if (await element.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error("Tab never reached the element");
}

// A new, logged-in student who has accepted the terms, with one lecture that
// has five quiz questions (the mock model makes one per definition sentence).
async function lectureWithQuiz(page: Page): Promise<string> {
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
  return lectureId;
}

// Every POST /api/practice-sessions the page sends.
function captureSaves(page: Page): Request[] {
  const saves: Request[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === SAVE_PATH) saves.push(request);
  });
  return saves;
}

function question(page: Page): Locator {
  return page.locator('[data-slot="quiz-question"]');
}

function quizStatus(page: Page): Locator {
  return question(page).getByRole("status");
}

test.describe("Quizøkt (story 4.2)", () => {
  test("NFR-8, FR-32, FR-34, FR-35, FR-56: hele quizen med bare tastatur, axe før og etter bekreftelse, lagret én gang", async ({
    page,
  }) => {
    const lectureId = await lectureWithQuiz(page);
    const saves = captureSaves(page);
    await page.goto(`/forelesninger/${lectureId}`);
    const practice = page
      .getByRole("region", { name: "Lag og øv" })
      .getByRole("group", { name: "Quiz" })
      .getByRole("button", { name: "Øv nå" });
    await expect(practice).toBeEnabled();
    await tabTo(page, practice);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/forelesninger/${lectureId}/quiz$`));

    const panel = page.getByRole("region", { name: "Quiz" });
    await expect(panel.getByRole("heading", { level: 1, name: "Quiz" })).toBeVisible();
    await expect(panel.getByText("Uke 37: Merkevare")).toBeVisible();
    await expect(panel.getByText("/ 5")).toBeVisible();
    await expect(panel.getByText("0 riktige · 0 feil")).toBeVisible();
    await expect(page.getByText("SPØRSMÅL 1 AV 5")).toBeVisible();
    await expect(question(page).getByRole("radio")).toHaveCount(4);
    await expect(page.getByText("Forklaring")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Bekreft svar" })).toBeDisabled();
    await expectNoAxeViolations(page);

    // Enter with nothing chosen does nothing.
    await page.keyboard.press("Enter");
    await expect(quizStatus(page)).toHaveText("");

    for (let number = 1; number <= 5; number += 1) {
      await expect(page.getByText(`SPØRSMÅL ${number} AV 5`)).toBeVisible();
      await page.keyboard.press("c");
      await expect(question(page).getByRole("radio").nth(2)).toBeChecked();
      await page.keyboard.press("Enter");
      await expect(quizStatus(page)).toContainText("Du svarte C. Svaret er bekreftet.");
      await expect(question(page).getByRole("radiogroup")).toBeVisible();
      for (const radio of await question(page).getByRole("radio").all()) await expect(radio).toBeDisabled();
      await expect(page.getByText("Forklaring")).toBeVisible();
      await expect(page.getByText(/definisjoner\.pdf, side \d/)).toBeVisible();
      // A–D after confirmation changes nothing.
      await page.keyboard.press("a");
      await expect(question(page).getByRole("radio").nth(2)).toBeChecked();
      const next = page.getByRole("button", { name: number === 5 ? "Se resultatet" : "Neste spørsmål" });
      await expect(next).toBeFocused();
      if (number === 1) {
        await expect(panel.getByRole("listitem").first()).toContainText(/Spørsmål 1: (riktig|feil)/);
        await expectNoAxeViolations(page);
      }
      await page.keyboard.press("Enter");
    }

    const title = page.getByRole("heading", { level: 2, name: /av 5 riktige$/ });
    await expect(title).toBeFocused();
    await expect(page.getByText("QUIZ FERDIG")).toBeVisible();
    await expect(panel.getByText("Økten er ferdig og lagret")).toBeVisible();
    expect(saves).toHaveLength(1);
    const body = saves[0].postDataJSON();
    expect(body).toMatchObject({ kind: "quiz", lecture_id: lectureId, aborted: false, shown: 5, answered: 5, partial: 0 });
    await expectNoAxeViolations(page);

    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(new RegExp(`/forelesninger/${lectureId}$`));
    expect(saves).toHaveLength(1);
  });

  test("NFR-8, FR-35: uten hurtigtaster virker Tab, piltaster, Mellomrom og Enter; Esc etter to svar gir «Avbrutt etter 2 av 5»", async ({
    page,
  }) => {
    const lectureId = await lectureWithQuiz(page);
    await page.addInitScript(() => window.localStorage.setItem("sk_shortcuts", "off"));
    const saves = captureSaves(page);
    await page.goto(`/forelesninger/${lectureId}/quiz`);
    await expect(page.getByText("SPØRSMÅL 1 AV 5")).toBeVisible();
    await expect(page.getByRole("list", { name: "Hurtigtaster" })).toHaveCount(0);

    // «c» is a single key and does nothing with the switch off.
    await page.keyboard.press("c");
    await expect(question(page).getByRole("radio").nth(2)).not.toBeChecked();

    for (let number = 1; number <= 2; number += 1) {
      await tabTo(page, question(page).getByRole("radio").first());
      await page.keyboard.press("Space");
      await expect(question(page).getByRole("radio").first()).toBeChecked();
      await page.keyboard.down("ArrowDown");
      await expect(question(page).getByRole("radio").nth(1)).toBeChecked();
      await page.keyboard.up("ArrowDown");
      await page.keyboard.press("Enter");
      await expect(quizStatus(page)).toContainText("Du svarte B. Svaret er bekreftet.");
      await expect(page.getByRole("button", { name: "Neste spørsmål" })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByText(`SPØRSMÅL ${number + 1} AV 5`)).toBeVisible();
      await expect(page.getByRole("heading", { level: 2 })).toBeFocused();
    }

    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { level: 2, name: "Avbrutt etter 2 av 5" })).toBeFocused();
    await expect.poll(() => saves.length).toBe(1);
    expect(saves[0].postDataJSON()).toMatchObject({ kind: "quiz", aborted: true, answered: 2 });
    await expectNoAxeViolations(page);
  });

  test("FR-56: Esc uten bekreftet svar går rett tilbake og sender ingenting", async ({ page }) => {
    const lectureId = await lectureWithQuiz(page);
    const saves = captureSaves(page);
    await page.goto(`/forelesninger/${lectureId}/quiz`);
    await expect(page.getByText("SPØRSMÅL 1 AV 5")).toBeVisible();
    await page.keyboard.press("a");
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(new RegExp(`/forelesninger/${lectureId}$`));
    expect(saves).toHaveLength(0);
  });

  test("E26: en holdt Enter bekrefter, men går ikke videre i samme trykk", async ({ page }) => {
    const lectureId = await lectureWithQuiz(page);
    await page.goto(`/forelesninger/${lectureId}/quiz`);
    await expect(page.getByText("SPØRSMÅL 1 AV 5")).toBeVisible();
    await page.keyboard.press("b");
    await page.keyboard.down("Enter");
    await expect(page.getByRole("button", { name: "Neste spørsmål" })).toBeFocused();
    // The same key, still held: the browser sends it again with repeat=true.
    await page.keyboard.down("Enter");
    await page.keyboard.down("Enter");
    await page.keyboard.up("Enter");
    await expect(page.getByText("SPØRSMÅL 1 AV 5")).toBeVisible();
    await expect(quizStatus(page)).toContainText("Du svarte B. Svaret er bekreftet.");
    await page.keyboard.press("Enter");
    await expect(page.getByText("SPØRSMÅL 2 AV 5")).toBeVisible();
  });
});
