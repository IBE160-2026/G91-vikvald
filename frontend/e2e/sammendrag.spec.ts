import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  createLectureViaApi,
  createSection,
  createSubjectViaApi,
  expectNoAxeViolations,
  pdfFile,
  quizRow,
  registerWithTermsViaApi,
  uploadViaApi,
} from "./brukerreiser/felles";

// Story 9.1: the row «Sammendrag» in «Lag og øv», in the browser against the
// app in demo mode with FEATURE_SUMMARY on (the default). The mock model makes
// one point per page (the page's first sentence), so a file with 6 pages gives
// 6 points and one with 3 pages too few (TOO_FEW_SUMMARY_POINTS).

const WIDE = { width: 1280, height: 900 };
const NARROW = { width: 768, height: 1024 };
const LECTURE_NAME = "Uke 37: Merkevare";
const TOO_FEW = "Notatene ga ikke grunnlag for et sammendrag med minst 5 punkter. Det gamle sammendraget er beholdt.";

function pages(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `Poeng ${index + 1} står på denne siden.\nMer tekst.`);
}

function summaryRow(page: Page): Locator {
  return page.getByRole("region", { name: "Lag og øv" }).getByRole("group", { name: "Sammendrag" });
}

function freetextRow(page: Page): Locator {
  return page.getByRole("region", { name: "Lag og øv" }).getByRole("group", { name: "Fritekstspørsmål" });
}

// Presses Tab until the element has focus (keyboard only, no clicks).
async function tabTo(page: Page, element: Locator, maxPresses = 60) {
  for (let i = 0; i < maxPresses; i += 1) {
    await page.keyboard.press("Tab");
    if (await element.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error("Tab never reached the element");
}

// axe in 1280 and 768 px (NFR-13, NFR-14).
async function axeInBothWidths(page: Page) {
  await page.setViewportSize(WIDE);
  await expectNoAxeViolations(page);
  await page.setViewportSize(NARROW);
  await expectNoAxeViolations(page);
  await page.setViewportSize(WIDE);
}

async function lectureWith(page: Page, pageCount: number): Promise<string> {
  await registerWithTermsViaApi(page);
  const subjectId = await createSubjectViaApi(page, "Markedsføring", "2026-12-04");
  const lectureId = await createLectureViaApi(page, subjectId, LECTURE_NAME, "2026-09-11");
  await uploadViaApi(page, lectureId, pdfFile("sammendrag.pdf", pages(pageCount)));
  return lectureId;
}

async function summaryPoints(page: Page, lectureId: string): Promise<number> {
  const counts = (await (await page.request.get(`/api/lectures/${lectureId}/content-counts`)).json()) as {
    summary_points: number;
  };
  return counts.summary_points;
}

test.describe("Sammendrag (story 9.1)", () => {
  test("FR-53, FR-54, UX-DR18, UX-DR19, NFR-8: med bare tastaturet lager hun et sammendrag av 6 sider, de andre radene venter, og raden viser «6 punkter»", async ({
    page,
  }) => {
    await page.setViewportSize(WIDE);
    const lectureId = await lectureWith(page, 6);
    await page.goto(`/forelesninger/${lectureId}`);
    const row = summaryRow(page);
    await expect(row.getByRole("heading", { level: 3, name: "Sammendrag" })).toBeVisible();
    await expect(row.getByText("Ikke laget")).toBeVisible();
    const create = row.getByRole("button", { name: "Lag sammendrag" });
    await expect(create).toBeEnabled();
    await axeInBothWidths(page);

    // Hold the job until the running state has been checked.
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/jobs/active", async (route) => {
      await held;
      await route.fallback();
    });

    const started = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === `/api/lectures/${lectureId}/jobs` && response.request().method() === "POST",
    );
    await tabTo(page, create);
    await page.keyboard.press("Enter");
    const response = await started;
    expect(response.status()).toBe(202);
    expect(response.request().postDataJSON()).toEqual({ kind: "summary", params: { requested: 15 } });
    // No dialog: the job starts directly.
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await expect(row.getByText("Lager sammendrag …", { exact: true }).first()).toBeVisible();
    await expect(row.getByText("Du kan bruke resten av appen imens.")).toBeVisible();
    for (const [other, label] of [
      [createSection(page), "Lag flashcards"],
      [quizRow(page), "Lag quiz"],
      [freetextRow(page), "Lag fritekstspørsmål"],
    ] as const) {
      await expect(other.getByText("Venter til sammendraget er ferdig")).toBeVisible();
      await expect(other.getByRole("button", { name: label })).toBeDisabled();
    }
    await expectNoAxeViolations(page);

    release();
    await expect.poll(async () => summaryPoints(page, lectureId), { timeout: 15_000 }).toBe(6);
    await page.unroute("**/api/jobs/active");
    await expect(row.getByText("6 punkter", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(row.getByRole("status")).toHaveText(`Sammendraget er ferdig: 6 punkter i ${LECTURE_NAME}.`);
    // With a summary the row has no button (the link comes in story 9.2).
    await expect(row.getByRole("button")).toHaveCount(0);
    await expect(createSection(page).getByText("Venter til sammendraget er ferdig")).toHaveCount(0);
    await axeInBothWidths(page);
  });

  test("FR-53, NFR-8: en fil med 3 sider gir meldingen for for få punkter og «Prøv igjen»", async ({ page }) => {
    const lectureId = await lectureWith(page, 3);
    await page.goto(`/forelesninger/${lectureId}`);
    const row = summaryRow(page);
    const create = row.getByRole("button", { name: "Lag sammendrag" });
    await expect(create).toBeEnabled();
    await tabTo(page, create);
    await page.keyboard.press("Enter");

    const alert = row.getByRole("alert");
    await expect(alert).toHaveText(TOO_FEW, { timeout: 15_000 });
    await expect(row.getByText("færre enn", { exact: false })).toHaveCount(0);
    const retry = row.getByRole("button", { name: "Prøv igjen" });
    await expect(retry).toBeVisible();
    await expect(row.getByText("Ikke laget")).toBeVisible();
    expect(await summaryPoints(page, lectureId)).toBe(0);
    await axeInBothWidths(page);

    // «Prøv igjen» with the keyboard starts the same job again.
    const again = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === `/api/lectures/${lectureId}/jobs` && response.request().method() === "POST",
    );
    await tabTo(page, retry);
    await page.keyboard.press("Enter");
    expect((await again).request().postDataJSON()).toEqual({ kind: "summary", params: { requested: 15 } });
    await expect(row.getByRole("alert")).toHaveText(TOO_FEW, { timeout: 15_000 });
  });

  test("FR-12, UX-DR22: slettebekreftelsen for fila nevner sammendraget, og det slettes med fila", async ({ page }) => {
    const lectureId = await lectureWith(page, 6);
    const response = await page.request.post(`/api/lectures/${lectureId}/jobs`, { data: { kind: "summary" } });
    expect(response.status()).toBe(202);
    await expect.poll(async () => summaryPoints(page, lectureId), { timeout: 15_000 }).toBe(6);
    await page.goto(`/forelesninger/${lectureId}`);
    await expect(summaryRow(page).getByText("6 punkter", { exact: true })).toBeVisible();

    const remove = page.getByRole("button", { name: "Slett sammendrag.pdf" });
    await tabTo(page, remove);
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Slette fila?" });
    await expect(dialog.getByText("Dette sletter også sammendraget av forelesningen.")).toBeVisible();
    await axeInBothWidths(page);
    await tabTo(page, dialog.getByRole("button", { name: "Slett fila" }));
    await page.keyboard.press("Enter");
    await expect(dialog).toHaveCount(0);
    await expect(summaryRow(page).getByText("Ikke laget")).toBeVisible();
    expect(await summaryPoints(page, lectureId)).toBe(0);
  });
});
