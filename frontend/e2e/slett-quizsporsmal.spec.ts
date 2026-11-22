import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { makePdf } from "./pdf";

// Story 4.5: delete a bad question during the quiz (FR-37, UX-DR22, UX-DR29, E22).

const PASSWORD = "hemmelig1";

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

// A new, logged-in student with one lecture that has five quiz questions from
// the mock model (one per definition sentence).
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

async function questionTextsViaApi(page: Page, lectureId: string): Promise<string[]> {
  const response = await page.request.get(`/api/lectures/${lectureId}/quiz-questions`);
  expect(response.status()).toBe(200);
  return (await response.json()).map((item: { question: string }) => item.question);
}

function panel(page: Page): Locator {
  return page.getByRole("region", { name: "Quiz" });
}

function title(page: Page): Locator {
  return page.locator("[data-question-title]");
}

async function openQuiz(page: Page, lectureId: string) {
  await page.goto(`/forelesninger/${lectureId}/quiz`);
  await expect(page.getByText("SPØRSMÅL 1 AV 5")).toBeVisible();
}

test.describe("Slett et quizspørsmål (story 4.5)", () => {
  test("FR-37, UX-DR22, UX-DR29: med bare tastatur: avbryt sletter ingenting, Esc heller ikke, bekreftet sletting gir «1 / 4»", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const lectureId = await lectureWithQuiz(page);
    await openQuiz(page, lectureId);
    const text = (await title(page).textContent())!;
    await expect(page.getByRole("button", { name: "Rediger" })).toHaveCount(0);

    const remove = page.getByRole("button", { name: "Slett", exact: true });
    await tabTo(page, remove);
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Slette spørsmålet?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Avbryt" })).toBeFocused();
    await expect(dialog.getByText(text)).toBeVisible();
    await expect(dialog.getByText("Det kan ikke angres.")).toBeVisible();
    await expect(dialog).not.toContainText("Dette sletter også");
    await expect(dialog.getByRole("button", { name: "Slett spørsmålet" })).toBeEnabled();
    await expectNoAxeViolations(page);

    // A–D do nothing while the dialog is open.
    await page.keyboard.press("c");

    // «Avbryt» (Enter on the focused button), then Esc: the question stays.
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();
    await expect(remove).toBeFocused();
    await expect(page.locator('[data-slot="quiz-question"]').getByRole("radio").nth(2)).not.toBeChecked();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(remove).toBeFocused();
    expect(await questionTextsViaApi(page, lectureId)).toHaveLength(5);
    await expect(title(page)).toHaveText(text);
    await expect(panel(page).getByText("/ 5")).toBeVisible();

    // Confirm with the keyboard: «Avbryt» -> Tab -> «Slett spørsmålet».
    await page.keyboard.press("Enter");
    const confirm = dialog.getByRole("button", { name: "Slett spørsmålet" });
    await expect(confirm).toBeEnabled();
    await page.keyboard.press("Tab");
    await expect(confirm).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();

    await expect(panel(page).getByText("/ 4")).toBeVisible();
    await expect(page.getByText("SPØRSMÅL 1 AV 4")).toBeVisible();
    await expect(title(page)).not.toHaveText(text);
    await expect(title(page)).toBeFocused();
    const left = await questionTextsViaApi(page, lectureId);
    expect(left).toHaveLength(4);
    expect(left).not.toContain(text);
  });

  test("FR-37, E22: et bekreftet spørsmål slettes, svaret står, og forelesningssiden viser ett spørsmål færre", async ({
    page,
  }) => {
    const lectureId = await lectureWithQuiz(page);
    await page.goto(`/forelesninger/${lectureId}`);
    const quizRow = page.getByRole("region", { name: "Lag og øv" }).getByRole("group", { name: "Quiz" });
    await expect(quizRow.getByText("5 spørsmål", { exact: true })).toBeVisible();

    await openQuiz(page, lectureId);
    await page.keyboard.press("c");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Neste spørsmål" })).toBeFocused();
    const remove = page.getByRole("button", { name: "Slett", exact: true });
    await expect(remove).toBeVisible();
    await expect(page.getByRole("button", { name: "Rediger" })).toHaveCount(0);
    // «Slett» stands right before the main button.
    await page.keyboard.press("Shift+Tab");
    await expect(remove).toBeFocused();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Slette spørsmålet?" });
    await expect(dialog.getByRole("button", { name: "Slett spørsmålet" })).toBeEnabled();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();

    // The answer stays in the grid and the score; the total stays 5.
    await expect(panel(page).getByText("/ 5")).toBeVisible();
    await expect(page.getByText("SPØRSMÅL 2 AV 5")).toBeVisible();
    await expect(panel(page).getByRole("listitem").first()).toContainText(/Spørsmål 1: (riktig|feil)/);
    await expect(title(page)).toBeFocused();
    expect(await questionTextsViaApi(page, lectureId)).toHaveLength(4);

    await page.goto(`/forelesninger/${lectureId}`);
    await expect(quizRow.getByText("4 spørsmål", { exact: true })).toBeVisible();
  });

  test("FR-37, NFR-14: slettebekreftelsen har ingen axe-brudd på 768 px", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    const lectureId = await lectureWithQuiz(page);
    await openQuiz(page, lectureId);
    await page.getByRole("button", { name: "Slett", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Slette spørsmålet?" });
    await expect(dialog.getByText("Det kan ikke angres.")).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
