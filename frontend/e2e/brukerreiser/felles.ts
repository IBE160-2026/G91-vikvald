import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";

import { makePdf } from "../pdf";

// Shared helpers for the user-journey tests (EXPERIENCE.md, «Brukerreiser»).

export const PASSWORD = "hemmelig1";

// A new address per run, so the journeys can run again against the same database.
export function uniqueEmail(): string {
  return `klara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@eksempel.no`;
}

// Every page a journey visits is checked with axe (NFR-13, AR-17).
export async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// The login page (01). Its status area is empty unless the login ran out in this tab.
export async function expectOnLoginPage(page: Page, message = "") {
  await expect(page).toHaveURL(/\/logg-inn$/);
  await expect(page).toHaveTitle("Logg inn – Studiekamerat");
  await expect(page.locator("main h1")).toHaveText("Logg inn");
  await expect(page.locator("main").getByRole("status")).toHaveText(message);
}

// The front page «Dine emner» (02) with the full top bar.
export async function expectOnHomePage(page: Page) {
  await expect(page).toHaveURL(/\/$/);
  await expect(page).toHaveTitle("Dine emner – Studiekamerat");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("main h1")).toHaveText("Dine emner");
}

// A PDF made by the test itself (e2e/pdf.ts), so no real notes are used.
export type TestFile = { name: string; mimeType: string; buffer: Buffer };

export function pdfFile(name: string, pages: string[]): TestFile {
  return { name, mimeType: "application/pdf", buffer: makePdf({ pages }) };
}

// The start of a .docx file (a zip archive): not a PDF.
export const WORD_FILE: TestFile = {
  name: "merkevare-notater.docx",
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  buffer: Buffer.concat([Buffer.from("PK\u0003\u0004"), Buffer.alloc(200)]),
};

// A new student, logged in through the API in the page's browser context, who
// has accepted the terms. For flows that start after the account exists.
export async function registerWithTermsViaApi(page: Page): Promise<string> {
  const email = uniqueEmail();
  const response = await page.request.post("/api/identity/register", { data: { email, password: PASSWORD } });
  expect(response.status()).toBe(201);
  expect((await page.request.post("/api/identity/terms")).status()).toBe(200);
  return email;
}

export async function createSubjectViaApi(page: Page, name: string, examDate: string): Promise<string> {
  const response = await page.request.post("/api/subjects", { data: { name, exam_date: examDate } });
  expect(response.status()).toBe(201);
  return (await response.json()).id;
}

export async function createLectureViaApi(page: Page, subjectId: string, name: string, date: string): Promise<string> {
  const response = await page.request.post(`/api/subjects/${subjectId}/lectures`, { data: { name, date } });
  expect(response.status()).toBe(201);
  return (await response.json()).id;
}

export async function uploadViaApi(page: Page, lectureId: string, file: TestFile) {
  const response = await page.request.post(`/api/lectures/${lectureId}/files`, { multipart: { file } });
  expect(response.status()).toBe(201);
}

export async function fileNamesViaApi(page: Page, lectureId: string): Promise<string[]> {
  const response = await page.request.get(`/api/lectures/${lectureId}/files`);
  expect(response.status()).toBe(200);
  return ((await response.json()) as { original_name: string }[]).map((file) => file.original_name);
}

// Drags files from the desktop and drops them on the upload box (04), the way
// Klara does it in flow 1: dragenter, dragover and drop with the files.
export async function dropFiles(page: Page, files: TestFile[]) {
  const dataTransfer = await page.evaluateHandle(
    (items) => {
      const transfer = new DataTransfer();
      for (const item of items) {
        transfer.items.add(new File([new Uint8Array(item.bytes)], item.name, { type: item.mimeType }));
      }
      return transfer;
    },
    files.map((file) => ({ name: file.name, mimeType: file.mimeType, bytes: Array.from(file.buffer) })),
  );
  const zone = page.locator('[data-slot="upload-zone"]');
  await zone.dispatchEvent("dragenter", { dataTransfer });
  await zone.dispatchEvent("dragover", { dataTransfer });
  await zone.dispatchEvent("drop", { dataTransfer });
}

// The file rows on the lecture page (04).
export function fileRows(page: Page): Locator {
  return page.getByRole("list", { name: "Filer" }).getByRole("listitem");
}

// The lecture links in the sidebar.
export function sidebarLectures(page: Page): Locator {
  return page.getByRole("navigation", { name: "Emner" }).locator('a[href^="/forelesninger/"]');
}

// Today's date as dd.mm and dd.mm.åååå, in the browser's local time.
export async function today(page: Page): Promise<{ dayMonth: string; full: string }> {
  return page.evaluate(() => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    const dayMonth = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}`;
    return { dayMonth, full: `${dayMonth}.${now.getFullYear()}` };
  });
}
