import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { makePdf } from "./pdf";

// Story 2.6: replace a file with a new version on the lecture page (04)
// through the shared confirmation «Erstatte fila?» (FR-13, NFR-8, E17, E18).

const PASSWORD = "hemmelig1";

const NOT_PDF =
  "Bare PDF-filer kan lastes opp. Lagre Word-dokumentet som PDF (Fil → Lagre som → PDF) og prøv igjen.";

const DOCX = {
  name: "ny.docx",
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  buffer: Buffer.concat([Buffer.from("PK\u0003\u0004"), Buffer.alloc(200)]),
};

function uniqueEmail(): string {
  return `klara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@eksempel.no`;
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// Presses Tab until the element has focus (keyboard only, no clicks).
async function tabTo(page: Page, element: Locator, maxPresses = 40) {
  for (let i = 0; i < maxPresses; i += 1) {
    await page.keyboard.press("Tab");
    if (await element.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error("Tab never reached the element");
}

// A new, logged-in student who has accepted the terms, through the API.
async function registerNewUser(page: Page) {
  const response = await page.request.post("/api/identity/register", {
    data: { email: uniqueEmail(), password: PASSWORD },
  });
  expect(response.status()).toBe(201);
  expect((await page.request.post("/api/identity/terms")).status()).toBe(200);
}

async function uploadViaApi(page: Page, lectureId: string, name: string, pages: string[]) {
  const response = await page.request.post(`/api/lectures/${lectureId}/files`, {
    multipart: { file: { name, mimeType: "application/pdf", buffer: makePdf({ pages }) } },
  });
  expect(response.status()).toBe(201);
}

async function filesViaApi(page: Page, lectureId: string): Promise<string[]> {
  const response = await page.request.get(`/api/lectures/${lectureId}/files`);
  expect(response.status()).toBe(200);
  return ((await response.json()) as { original_name: string }[]).map((file) => file.original_name);
}

function fileRows(page: Page): Locator {
  return page.getByRole("list", { name: "Filer" }).getByRole("listitem");
}

// Today's upload date as the file row shows it (dd.mm, local time).
async function todayDayMonth(page: Page): Promise<string> {
  return page.evaluate(() => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${pad(now.getDate())}.${pad(now.getMonth() + 1)}`;
  });
}

// A lecture with merkevare.pdf (2 pages) and prising.pdf (3 pages); the page is open.
async function setUp(page: Page): Promise<string> {
  await registerNewUser(page);
  const subject = await page.request.post("/api/subjects", { data: { name: "Markedsføring", exam_date: "2026-12-04" } });
  expect(subject.status()).toBe(201);
  const lecture = await page.request.post(`/api/subjects/${(await subject.json()).id}/lectures`, {
    data: { name: "Uke 37: Merkevare", date: "2026-09-11" },
  });
  expect(lecture.status()).toBe(201);
  const lectureId = (await lecture.json()).id as string;
  await uploadViaApi(page, lectureId, "merkevare.pdf", ["Side en", "Side to"]);
  await uploadViaApi(page, lectureId, "prising.pdf", ["En", "To", "Tre"]);
  await page.goto(`/forelesninger/${lectureId}`);
  await expect(page.getByText("Forelesning fredag 11.09.2026 · 2 filer · 5 sider")).toBeVisible();
  return lectureId;
}

test.describe("Erstatning (story 2.6)", () => {
  test("FR-13: erstatt en fil med bare tastatur; axe uten brudd; den nye står sist og fokus går til «Filer»", async ({
    page,
  }) => {
    const lectureId = await setUp(page);
    const erstatt = page.getByRole("button", { name: "Erstatt merkevare.pdf" });
    await tabTo(page, erstatt);
    const chooser = page.waitForEvent("filechooser");
    await page.keyboard.press("Enter");
    await (await chooser).setFiles({
      name: "ny.pdf",
      mimeType: "application/pdf",
      buffer: makePdf({ pages: ["Ny en", "Ny to", "Ny tre"] }),
    });

    const dialog = page.getByRole("dialog", { name: "Erstatte fila?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Avbryt" })).toBeFocused();
    await expect(dialog.getByText("merkevare.pdf")).toBeVisible();
    await expect(dialog.getByText("2 sider · Uke 37: Merkevare")).toBeVisible();
    await expect(dialog.getByText("Erstattes med ny.pdf.")).toBeVisible();
    await expect(dialog.getByText("Det kan ikke angres.")).toBeVisible();
    await expectNoAxeViolations(page);

    const confirm = dialog.getByRole("button", { name: "Erstatt fila" });
    await expect(confirm).toBeEnabled();
    await page.keyboard.press("Tab");
    await expect(confirm).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(dialog).toBeHidden();
    const today = await todayDayMonth(page);
    await expect(fileRows(page)).toHaveCount(2);
    await expect(fileRows(page).nth(0)).toContainText("prising.pdf");
    await expect(fileRows(page).nth(1)).toContainText("ny.pdf");
    await expect(fileRows(page).nth(1)).toContainText(`3 sider · lastet opp ${today}`);
    await expect(page.getByText("Forelesning fredag 11.09.2026 · 2 filer · 6 sider")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Filer" })).toBeFocused();
    expect(await filesViaApi(page, lectureId)).toEqual(["prising.pdf", "ny.pdf"]);
  });

  test("E17: en ikke-PDF lar den gamle stå, meldingen står ved raden, fokus på «Erstatt»; axe uten brudd", async ({
    page,
  }) => {
    const lectureId = await setUp(page);
    const erstatt = page.getByRole("button", { name: "Erstatt merkevare.pdf" });
    await tabTo(page, erstatt);
    const chooser = page.waitForEvent("filechooser");
    await page.keyboard.press("Enter");
    await (await chooser).setFiles(DOCX);

    const dialog = page.getByRole("dialog", { name: "Erstatte fila?" });
    await expect(dialog.getByText("Erstattes med ny.docx.")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Erstatt fila" })).toBeEnabled();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");

    await expect(dialog).toBeHidden();
    const message = page.getByText(`ny.docx: ${NOT_PDF}`);
    await expect(message).toBeVisible();
    expect(await message.evaluate((el) => el.closest("li [aria-live=polite]") !== null)).toBe(true);
    await expect(erstatt).toBeFocused();
    await expect(fileRows(page).nth(0)).toContainText("merkevare.pdf");
    await expect(page.getByText("Forelesning fredag 11.09.2026 · 2 filer · 5 sider")).toBeVisible();
    expect(await filesViaApi(page, lectureId)).toEqual(["merkevare.pdf", "prising.pdf"]);
    await expectNoAxeViolations(page);
  });

  test("E18: en tom filvelger åpner ingen dialog og sender ingenting", async ({ page }) => {
    const lectureId = await setUp(page);
    let replaceCalls = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/replace")) replaceCalls += 1;
    });
    const erstatt = page.getByRole("button", { name: "Erstatt merkevare.pdf" });
    await tabTo(page, erstatt);
    const chooser = page.waitForEvent("filechooser");
    await page.keyboard.press("Enter");
    await (await chooser).setFiles([]);

    await page.waitForTimeout(300);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(erstatt).toBeFocused();
    expect(replaceCalls).toBe(0);
    expect(await filesViaApi(page, lectureId)).toEqual(["merkevare.pdf", "prising.pdf"]);
  });
});
