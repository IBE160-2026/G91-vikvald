import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { makePdf } from "./pdf";

const PASSWORD = "hemmelig1";
const MIB = 1024 * 1024;
// The backend's default MAX_UPLOAD_MB (docker compose up without a .env).
const LIMIT_MB = 20;

const NOT_PDF =
  "Bare PDF-filer kan lastes opp. Lagre Word-dokumentet som PDF (Fil → Lagre som → PDF) og prøv igjen.";

function uniqueEmail(): string {
  return `klara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@eksempel.no`;
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// The focus ring from DESIGN.md: 2 px ink with 2 px space (same check as emner.spec.ts).
async function expectFocusRing(element: Locator) {
  const ring = await element.evaluate((el) => {
    const style = getComputedStyle(el);
    return { style: style.outlineStyle, width: style.outlineWidth, offset: style.outlineOffset, color: style.outlineColor };
  });
  expect(ring).toEqual({ style: "solid", width: "2px", offset: "2px", color: "rgb(21, 24, 31)" });
}

// Presses Tab until the element has focus (keyboard only, no clicks).
async function tabTo(page: Page, element: Locator, maxPresses = 40) {
  for (let i = 0; i < maxPresses; i += 1) {
    await page.keyboard.press("Tab");
    if (await element.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error("Tab never reached the element");
}

// A new, logged-in student who has accepted the terms (story 2.4) through the
// API, so these tests upload without the terms dialog (e2e/vilkar.spec.ts covers it).
async function registerNewUser(page: Page) {
  const response = await page.request.post("/api/identity/register", {
    data: { email: uniqueEmail(), password: PASSWORD },
  });
  expect(response.status()).toBe(201);
  const terms = await page.request.post("/api/identity/terms");
  expect(terms.status()).toBe(200);
}

async function createSubjectViaApi(page: Page, name: string, examDate = "2026-12-04"): Promise<string> {
  const response = await page.request.post("/api/subjects", { data: { name, exam_date: examDate } });
  expect(response.status()).toBe(201);
  return (await response.json()).id;
}

async function createLectureViaApi(page: Page, subjectId: string, name: string, date: string): Promise<string> {
  const response = await page.request.post(`/api/subjects/${subjectId}/lectures`, { data: { name, date } });
  expect(response.status()).toBe(201);
  return (await response.json()).id;
}

async function uploadViaApi(page: Page, lectureId: string, name: string, pages: string[]) {
  const response = await page.request.post(`/api/lectures/${lectureId}/files`, {
    multipart: { file: { name, mimeType: "application/pdf", buffer: makePdf({ pages }) } },
  });
  expect(response.status()).toBe(201);
}

function pdfFile(name: string, pages: string[], totalBytes?: number) {
  return { name, mimeType: "application/pdf", buffer: makePdf({ pages, totalBytes }) };
}

// The start of a .docx file (a zip archive): not a PDF.
const DOCX = {
  name: "notater.docx",
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  buffer: Buffer.concat([Buffer.from("PK\u0003\u0004"), Buffer.alloc(200)]),
};

// Today's upload date as the file row shows it (dd.mm, local time).
async function todayDayMonth(page: Page): Promise<string> {
  return page.evaluate(() => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${pad(now.getDate())}.${pad(now.getMonth() + 1)}`;
  });
}

function fileRows(page: Page): Locator {
  return page.getByRole("list", { name: "Filer" }).getByRole("listitem");
}

async function newLecturePage(page: Page): Promise<{ subjectId: string; lectureId: string }> {
  await registerNewUser(page);
  const subjectId = await createSubjectViaApi(page, "Markedsføring");
  const lectureId = await createLectureViaApi(page, subjectId, "Uke 37: Merkevare", "2026-09-11");
  await page.goto(`/forelesninger/${lectureId}`);
  await expect(page.getByText("Forelesning fredag 11.09.2026 · 0 filer · 0 sider")).toBeVisible();
  return { subjectId, lectureId };
}

test.describe("Filer (story 2.3)", () => {
  test("FR-8: to PDF-er med «Velg PDF» og bare tastatur, «Laster opp …» mens det pågår, og begge i lista uten omlasting", async ({
    page,
  }) => {
    await newLecturePage(page);
    await expect(page.getByRole("heading", { level: 2, name: "Filer" })).toBeVisible();
    await expect(page.getByText("Dra og slipp PDF-filer hit")).toBeVisible();
    await expect(page.getByText("Bare PDF. Hver fil får sin egen kilde med sidetall.")).toBeVisible();
    await expect(page.getByText("I demomodus sendes ingenting ut.")).toBeVisible();

    // Hold the uploads a moment, so «Laster opp …» can be seen.
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/api/lectures/*/files", async (route) => {
      if (route.request().method() === "POST") await held;
      await route.continue();
    });

    const button = page.getByRole("button", { name: "Velg PDF" });
    await tabTo(page, button);
    await expectFocusRing(button);
    const chooser = page.waitForEvent("filechooser");
    await page.keyboard.press("Enter");
    await (await chooser).setFiles([
      pdfFile("merkevare-notater.pdf", ["Side en", "Side to", "Side tre"]),
      pdfFile("merkevare-forelesning2.pdf", ["Side en", "Side to"]),
    ]);

    const status = page.getByRole("status").filter({ hasText: "Laster opp" });
    await expect(status).toHaveText("Laster opp …");
    await expect(button).toHaveAttribute("aria-disabled", "true");
    release();

    await expect(page.getByText("Forelesning fredag 11.09.2026 · 2 filer · 5 sider")).toBeVisible();
    const today = await todayDayMonth(page);
    await expect(fileRows(page)).toHaveCount(2);
    await expect(fileRows(page).nth(0)).toContainText("merkevare-notater.pdf");
    await expect(fileRows(page).nth(0)).toContainText(`3 sider · lastet opp ${today}`);
    await expect(fileRows(page).nth(1)).toContainText("merkevare-forelesning2.pdf");
    await expect(fileRows(page).nth(1)).toContainText(`2 sider · lastet opp ${today}`);
    await expect(page.getByText("Laster opp …")).toHaveCount(0);
    await expect(button).not.toHaveAttribute("aria-disabled", "true");
    await expectNoAxeViolations(page);
  });

  test("FR-9: én av flere filer avvises, meldingen står med filnavnet til neste opplasting starter", async ({ page }) => {
    await newLecturePage(page);
    const input = page.getByTestId("upload-input");
    await input.setInputFiles([pdfFile("notater.pdf", ["Mine notater"]), DOCX]);

    const message = page.getByText(`notater.docx: ${NOT_PDF}`);
    await expect(message).toBeVisible();
    await expect(page.getByText("Forelesning fredag 11.09.2026 · 1 fil · 1 side")).toBeVisible();
    await expect(fileRows(page)).toHaveCount(1);
    await expect(fileRows(page).first()).toContainText("notater.pdf");
    // The message is in a live region by the upload box, and stays.
    expect(await message.evaluate((el) => el.closest("[aria-live]") !== null)).toBe(true);
    await page.waitForTimeout(500);
    await expect(message).toBeVisible();
    await expectNoAxeViolations(page);

    // A new upload starts: the old lines go away.
    await input.setInputFiles([pdfFile("neste.pdf", ["Neste"])]);
    await expect(message).toHaveCount(0);
    await expect(page.getByText("Forelesning fredag 11.09.2026 · 2 filer · 2 sider")).toBeVisible();
  });

  test("NFR-16: en fil like under grensen kommer fram gjennom frontend, en like over gir FILE_TOO_LARGE-teksten", async ({
    page,
  }) => {
    await newLecturePage(page);
    const input = page.getByTestId("upload-input");

    await input.setInputFiles([pdfFile("nesten-stor.pdf", ["Stor fil"], LIMIT_MB * MIB - 1024)]);
    await expect(fileRows(page)).toHaveCount(1, { timeout: 30_000 });
    await expect(fileRows(page).first()).toContainText("nesten-stor.pdf");

    await input.setInputFiles([pdfFile("for-stor.pdf", ["For stor"], LIMIT_MB * MIB + 1)]);
    await expect(
      page.getByText(
        "for-stor.pdf: Fila er på 21 MB. Grensen er 20 MB. Lagre den på nytt med mindre bilder, eller del den opp.",
      ),
    ).toBeVisible({ timeout: 30_000 });
    await expect(fileRows(page)).toHaveCount(1);
  });

  test("UX-DR13: emnesiden viser antall filer under h1 og Filer og Status i tabellen, uten axe-brudd", async ({
    page,
  }) => {
    await registerNewUser(page);
    const subjectId = await createSubjectViaApi(page, "Markedsføring");
    const withFiles = await createLectureViaApi(page, subjectId, "Uke 37: Merkevare", "2026-09-11");
    await createLectureViaApi(page, subjectId, "Uke 38: Prising", "2026-09-18");
    await uploadViaApi(page, withFiles, "a.pdf", ["En", "To"]);
    await uploadViaApi(page, withFiles, "b.pdf", ["En"]);

    await page.goto(`/emner/${subjectId}`);
    await expect(page.getByText("2 forelesninger · 2 filer · eksamen fredag 04.12.2026")).toBeVisible();
    const table = page.locator("main table");
    await expect(table.getByRole("columnheader")).toHaveText(["Dato", "Forelesning", "Filer", "Status"]);
    const rows = table.locator("tbody tr");
    await expect(rows.nth(0).getByRole("cell")).toHaveText(["11.09", "Uke 37: Merkevare", "2", "Ikke øvd ennå"]);
    await expect(rows.nth(1).getByRole("cell")).toHaveText(["18.09", "Uke 38: Prising", "–", "Ingen filer ennå"]);
    await expectNoAxeViolations(page);

    // The whole row still leads to the lecture page.
    await rows.nth(0).getByRole("link").click();
    await expect(page).toHaveURL(new RegExp(`/forelesninger/${withFiles}$`));
    await expect(page.getByText("Forelesning fredag 11.09.2026 · 2 filer · 3 sider")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("FR-4: en annen students forelesning gir «Fant ikke siden», og opplasting til den gir 404", async ({ page }) => {
    await registerNewUser(page);
    const subjectId = await createSubjectViaApi(page, "Olas emne");
    const olasLecture = await createLectureViaApi(page, subjectId, "Olas forelesning", "2026-09-11");

    await registerNewUser(page);
    const response = await page.request.post(`/api/lectures/${olasLecture}/files`, {
      multipart: { file: { name: "a.pdf", mimeType: "application/pdf", buffer: makePdf({ pages: ["x"] }) } },
    });
    expect(response.status()).toBe(404);
    const counts = await page.request.get(`/api/subjects/${subjectId}/file-counts`);
    expect(counts.status()).toBe(404);

    await page.goto(`/forelesninger/${olasLecture}`);
    await expect(page.locator("main h1")).toHaveText("Fant ikke siden");
  });
});
