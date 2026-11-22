import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { makePdf } from "./pdf";

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

// Presses an arrow key in a radio group and holds it until the option is
// checked, as a real key press does. Radix moves the focus (and so the choice)
// a moment after keydown; an instant keyup can come first and leave the option
// focused but not chosen.
async function pressArrow(page: Page, key: string, option: Locator) {
  await page.keyboard.down(key);
  await expect(option).toBeFocused();
  await expect(option).toBeChecked();
  await page.keyboard.up(key);
}

// A new, logged-in student who has accepted the terms, with one lecture.
async function newLecture(page: Page): Promise<string> {
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
  return (await lecture.json()).id;
}

// Five definition sentences, one per page: the mock model makes five quiz
// questions (and five flashcards) from them.
async function uploadDefinitions(page: Page, lectureId: string) {
  const pages = [
    "Merkevare er et navn som skiller et produkt fra andre.",
    "Pris er det kunden betaler for varen.",
    "Segment er en gruppe kunder med like behov.",
    "Kanal er veien varen tar fram til kunden.",
    "Posisjon er plassen produktet har hos kunden.",
  ];
  const response = await page.request.post(`/api/lectures/${lectureId}/files`, {
    multipart: { file: { name: "definisjoner.pdf", mimeType: "application/pdf", buffer: makePdf({ pages }) } },
  });
  expect(response.status()).toBe(201);
}

function quizRow(page: Page): Locator {
  return page.getByRole("region", { name: "Lag og øv" }).getByRole("group", { name: "Quiz" });
}

function flashcardsRow(page: Page): Locator {
  return page.getByRole("region", { name: "Lag og øv" }).getByRole("group", { name: "Flashcards" });
}

test.describe("Quiz (story 4.1)", () => {
  test("FR-28, FR-29, FR-30, UX-DR24: «Lag quiz» med bare tastaturet gir 5 spørsmål, og slettebekreftelsen teller dem", async ({
    page,
  }) => {
    const lectureId = await newLecture(page);
    await uploadDefinitions(page, lectureId);
    await page.goto(`/forelesninger/${lectureId}`);
    const row = quizRow(page);
    await expect(row.getByRole("heading", { level: 3, name: "Quiz" })).toBeVisible();
    await expect(row.getByText("Ingen ennå")).toBeVisible();
    const create = row.getByRole("button", { name: "Lag quiz" });
    await expect(create).toBeEnabled();
    await expectNoAxeViolations(page);

    // Esc closes without a job, and focus goes back to the button.
    await tabTo(page, create);
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Lag quiz" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("radio", { name: "Vanlig" })).toBeFocused();
    await expect(dialog.getByRole("radio", { name: "Vanlig" })).toBeChecked();
    await expect(dialog.getByRole("radio", { name: "Middels" })).toBeChecked();
    await expect(dialog.getByText("Inntil 20 spørsmål")).toBeVisible();
    await expect(dialog.getByText("Forstå sammenhenger")).toBeVisible();
    await expectNoAxeViolations(page);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(create).toBeFocused();

    // The arrows move within each group: «Rask» and back in Omfang, then «Vanskelig».
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await pressArrow(page, "ArrowLeft", dialog.getByRole("radio", { name: "Rask" }));
    await pressArrow(page, "ArrowRight", dialog.getByRole("radio", { name: "Vanlig" }));
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("radio", { name: "Middels" })).toBeFocused();
    await pressArrow(page, "ArrowDown", dialog.getByRole("radio", { name: "Vanskelig" }));
    await expect(dialog.getByRole("radio", { name: "Vanlig" })).toBeChecked();
    await tabTo(page, dialog.getByRole("button", { name: "Lag quiz" }), 4);
    const started = page.waitForRequest(
      (request) => request.method() === "POST" && request.url().endsWith(`/api/lectures/${lectureId}/jobs`),
    );
    await page.keyboard.press("Enter");
    expect((await started).postDataJSON()).toEqual({ kind: "quiz", params: { requested: 20, difficulty: "hard" } });
    await expect(dialog).toBeHidden();

    await expect(row.getByText("5 spørsmål", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(row.getByRole("status")).toHaveText("Det ble laget 5 av inntil 20 spørsmål. Notatene ga ikke grunnlag for flere.");
    await expect(row.getByRole("button", { name: "Øv nå" })).toBeDisabled();
    await expect(row.getByRole("button", { name: "Lag flere" })).toBeEnabled();
    await expectNoAxeViolations(page);

    // Flashcards from the same file, then the delete confirmation counts both.
    const flashcards = await page.request.post(`/api/lectures/${lectureId}/jobs`, { data: { kind: "flashcards" } });
    expect(flashcards.status()).toBe(202);
    await expect
      .poll(async () => (await (await page.request.get(`/api/lectures/${lectureId}/content-counts`)).json()).flashcards, {
        timeout: 10_000,
      })
      .toBe(5);
    await page.reload();
    await expect(flashcardsRow(page).getByText("5 kort", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Slett definisjoner.pdf" }).click();
    const confirm = page.getByRole("dialog", { name: "Slette fila?" });
    await expect(confirm.getByText("Dette sletter også 5 flashcards og 5 quizspørsmål laget fra fila.")).toBeVisible();
    await expectNoAxeViolations(page);
    await confirm.getByRole("button", { name: "Slett fila" }).click();
    await expect(confirm).toBeHidden();
    await expect(quizRow(page).getByText("Ingen ennå")).toBeVisible();
  });

  test("UX-DR19: mens flashcardene lages, venter Quiz-raden, og axe finner ingen brudd", async ({ page }) => {
    const lectureId = await newLecture(page);
    await uploadDefinitions(page, lectureId);
    // The latest flashcards job is held as running, so the state can be checked.
    const running = {
      id: "00000000-0000-0000-0000-000000000001",
      lecture_id: lectureId,
      kind: "flashcards",
      params: { requested: 20 },
      status: "running",
      requested: 20,
      created: null,
      discarded: null,
      error_code: null,
      started_at: "2026-11-21T10:00:00Z",
      finished_at: null,
    };
    await page.route("**/api/lectures/*/jobs/latest", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([running]) }),
    );
    await page.goto(`/forelesninger/${lectureId}`);
    const row = quizRow(page);
    await expect(row.getByText("Venter til flashcardene er ferdige")).toBeVisible();
    await expect(row.getByRole("button", { name: "Lag quiz" })).toBeDisabled();
    await expect(flashcardsRow(page).getByText("Lager flashcards …", { exact: true }).first()).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
