import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { makePdf } from "./pdf";

const PASSWORD = "hemmelig1";
const NOTHING_MADE = "Notatene ga ikke grunnlag for flashcards. Ingenting er lagret.";
const FAILED = "Vi klarte ikke å lage flashcardene. Ingenting er lagret. Prøv igjen.";
const FEWER_3_OF_10 = "Det ble laget 3 av inntil 10 flashcards. Notatene ga ikke grunnlag for flere.";

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

async function uploadDefinitions(page: Page, lectureId: string) {
  // Three definition sentences (the mock model makes one card per sentence).
  const pages = ["Merkevare er et navn som skiller et produkt fra andre. Pris er det kunden betaler.", "Segment er en gruppe kunder."];
  const response = await page.request.post(`/api/lectures/${lectureId}/files`, {
    multipart: { file: { name: "definisjoner.pdf", mimeType: "application/pdf", buffer: makePdf({ pages }) } },
  });
  expect(response.status()).toBe(201);
}

function createSection(page: Page): Locator {
  return page.getByRole("region", { name: "Lag og øv" });
}

function scopeDialog(page: Page): Locator {
  return page.getByRole("dialog", { name: "Lag flashcards" });
}

function job(lectureId: string, changes: Record<string, unknown> = {}) {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    lecture_id: lectureId,
    kind: "flashcards",
    status: "running",
    requested: 20,
    created: null,
    discarded: null,
    error_code: null,
    started_at: "2026-11-21T10:00:00Z",
    finished_at: null,
    ...changes,
  };
}

test.describe("Flashcards (story 3.1 og 3.2)", () => {
  test("FR-17, FR-18, UX-DR44: dialogen med bare tastaturet: «Rask» gir 3 av inntil 10, færre-meldingen står på merknadsflaten og leses opp", async ({
    page,
  }) => {
    const lectureId = await newLecture(page);
    await uploadDefinitions(page, lectureId);
    await page.goto(`/forelesninger/${lectureId}`);
    const section = createSection(page);
    await expect(section.getByRole("heading", { level: 2, name: "Lag og øv" })).toBeVisible();
    await expect(section.getByText("Ingen ennå")).toBeVisible();
    const create = section.getByRole("button", { name: "Lag flashcards" });
    await expect(create).toBeEnabled();
    await expectNoAxeViolations(page);

    // Esc closes without a job, and focus goes back to the button.
    await tabTo(page, create);
    await page.keyboard.press("Enter");
    const dialog = scopeDialog(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("radio", { name: "Vanlig" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(create).toBeFocused();
    await expect(section.getByText("Ingen ennå")).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Uke 37: Merkevare · 1 fil, 2 sider")).toBeVisible();
    await expect(dialog.getByText("Tar noen sekunder.")).toBeVisible();
    await expect(dialog.getByRole("radio", { name: "Vanlig" })).toBeChecked();
    await expectNoAxeViolations(page);
    await page.keyboard.press("ArrowLeft");
    await expect(dialog.getByRole("radio", { name: "Rask" })).toBeChecked();
    await expect(dialog.getByRole("radio", { name: "Rask" })).toBeFocused();
    await tabTo(page, dialog.getByRole("button", { name: "Lag flashcards" }), 4);
    const started = page.waitForRequest(
      (request) => request.method() === "POST" && request.url().endsWith(`/api/lectures/${lectureId}/jobs`),
    );
    await page.keyboard.press("Enter");
    expect((await started).postDataJSON()).toEqual({ kind: "flashcards", params: { requested: 10 } });
    await expect(dialog).toBeHidden();

    await expect(section.getByText("3 kort", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(section.getByRole("button", { name: "Øv nå" })).toBeVisible();
    await expect(section.getByRole("status")).toHaveText(FEWER_3_OF_10);
    await expect(section.locator('[data-slot="note-surface"]')).toHaveText(FEWER_3_OF_10);
    await expectNoAxeViolations(page);

    // Still there after a reload, until the next job starts.
    await page.reload();
    await expect(section.locator('[data-slot="note-surface"]')).toHaveText(FEWER_3_OF_10);

    // «Lag flere» with the same file makes nothing new.
    await section.getByRole("button", { name: "Lag flere" }).click();
    await expect(dialog.getByText("Nye kort legges til de 3 du har fra før.")).toBeVisible();
    await dialog.getByRole("button", { name: "Lag flashcards" }).click();
    await expect(section.getByRole("status")).toHaveText(NOTHING_MADE, { timeout: 10_000 });
    await expect(section.locator('[data-slot="note-surface"]')).toHaveText(NOTHING_MADE);
    await expect(section.getByText("3 kort", { exact: true })).toBeVisible();
  });

  test("UX-DR18: uten filer er «Lag flashcards» ikke aktiv, og «Last opp notater først.» står under", async ({ page }) => {
    const lectureId = await newLecture(page);
    await page.goto(`/forelesninger/${lectureId}`);
    const section = createSection(page);
    await expect(section.getByText("Last opp notater først.")).toBeVisible();
    await expect(section.getByRole("button", { name: "Lag flashcards" })).toBeDisabled();
    await expectNoAxeViolations(page);
  });

  test("UX-DR19: mens jobben pågår, står job-status i raden, og axe finner ingen brudd", async ({ page }) => {
    const lectureId = await newLecture(page);
    await uploadDefinitions(page, lectureId);
    // The latest job is held as running, so the state can be checked.
    await page.route("**/api/lectures/*/jobs/latest", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([job(lectureId)]) }),
    );
    await page.goto(`/forelesninger/${lectureId}`);
    const section = createSection(page);
    await expect(section.getByText("Lager flashcards …", { exact: true }).first()).toBeVisible();
    await expect(section.getByText("Du kan bruke resten av appen imens.")).toBeVisible();
    await expect(section.getByRole("button")).toHaveCount(0);
    await expectNoAxeViolations(page);
  });

  test("FR-21: en feilet jobb gir feilteksten og «Prøv igjen», som starter med samme omfang; axe finner ingen brudd", async ({
    page,
  }) => {
    const lectureId = await newLecture(page);
    await uploadDefinitions(page, lectureId);
    // The latest job failed on a time limit (scope «Dyp»), until a new one starts.
    let failed = true;
    await page.route("**/api/lectures/*/jobs/latest", async (route) => {
      if (!failed) return route.continue();
      const body = [job(lectureId, { status: "failed", requested: 30, error_code: "GENERATION_TIMEOUT", finished_at: "2026-11-21T10:00:05Z" })];
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.goto(`/forelesninger/${lectureId}`);
    const section = createSection(page);
    await expect(section.getByRole("alert")).toHaveText(FAILED);
    const retry = section.getByRole("button", { name: "Prøv igjen" });
    await expect(retry).toBeVisible();
    await expect(section.locator('[data-slot="note-surface"]')).toHaveCount(0);
    await expectNoAxeViolations(page);

    failed = false;
    const started = page.waitForRequest(
      (request) => request.method() === "POST" && request.url().endsWith(`/api/lectures/${lectureId}/jobs`),
    );
    await retry.click();
    expect((await started).postDataJSON()).toEqual({ kind: "flashcards", params: { requested: 30 } });
    await expect(scopeDialog(page)).toHaveCount(0);
    await expect(section.getByText("3 kort", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(section.getByRole("alert")).toHaveCount(0);
    await expect(section.getByRole("status")).toHaveText(
      "Det ble laget 3 av inntil 30 flashcards. Notatene ga ikke grunnlag for flere.",
    );
  });

  test("NFR-12, NFR-17: en jobb som blir ferdig mens hun er på forsiden, gir ferdigmeldingen i et levende område", async ({ page }) => {
    const lectureId = await newLecture(page);
    await uploadDefinitions(page, lectureId);
    // The job is shown as running until she is on the front page.
    let running: Record<string, unknown> | null = null;
    let hold = true;
    await page.route("**/api/jobs/active", async (route) => {
      if (!hold || !running) return route.continue();
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([running]) });
    });
    await page.goto(`/forelesninger/${lectureId}`);
    const section = createSection(page);
    await section.getByRole("button", { name: "Lag flashcards" }).click();
    const answer = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.url().endsWith(`/api/lectures/${lectureId}/jobs`),
    );
    await scopeDialog(page).getByRole("button", { name: "Lag flashcards" }).click();
    running = { ...(await (await answer).json()), lecture_name: "Uke 37: Merkevare" };

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Dine emner" })).toBeVisible();
    const toasts = page.getByRole("region", { name: /Varsler/ });
    await expect(toasts).toHaveAttribute("aria-live", "polite");
    hold = false;
    await expect(toasts).toContainText("Flashcardene er ferdige: 3 kort i Uke 37: Merkevare.", { timeout: 10_000 });
    await expectNoAxeViolations(page);
  });
});
