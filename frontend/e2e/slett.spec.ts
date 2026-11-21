import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { makePdf } from "./pdf";

// Story 2.5: delete a file (04), a lecture (04) and a subject (03) through the
// shared delete confirmation (FR-6, FR-7, FR-12, FR-14, NFR-8, UX-DR21, UX-DR22).

const PASSWORD = "hemmelig1";

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

async function createSubjectViaApi(page: Page, name: string): Promise<string> {
  const response = await page.request.post("/api/subjects", { data: { name, exam_date: "2026-12-04" } });
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

async function filesViaApi(page: Page, lectureId: string): Promise<string[]> {
  const response = await page.request.get(`/api/lectures/${lectureId}/files`);
  expect(response.status()).toBe(200);
  return ((await response.json()) as { original_name: string }[]).map((file) => file.original_name);
}

function fileRows(page: Page): Locator {
  return page.getByRole("list", { name: "Filer" }).getByRole("listitem");
}

// A subject with two lectures; the first has two files (2 + 3 pages).
async function setUp(page: Page) {
  await registerNewUser(page);
  const subjectId = await createSubjectViaApi(page, "Markedsføring");
  const lectureId = await createLectureViaApi(page, subjectId, "Uke 37: Merkevare", "2026-09-11");
  await createLectureViaApi(page, subjectId, "Uke 38: Prising", "2026-09-18");
  await uploadViaApi(page, lectureId, "merkevare.pdf", ["Side en", "Side to"]);
  await uploadViaApi(page, lectureId, "prising.pdf", ["En", "To", "Tre"]);
  return { subjectId, lectureId };
}

test.describe("Sletting (story 2.5)", () => {
  test("FR-14: slett en fil med bare tastatur; Esc sletter ingenting; fokus går til «Filer»", async ({ page }) => {
    const { lectureId } = await setUp(page);
    await page.goto(`/forelesninger/${lectureId}`);
    await expect(page.getByText("Forelesning fredag 11.09.2026 · 2 filer · 5 sider")).toBeVisible();

    const slett = page.getByRole("button", { name: "Slett merkevare.pdf" });
    await tabTo(page, slett);
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Slette fila?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Avbryt" })).toBeFocused();
    await expect(dialog.getByText("merkevare.pdf")).toBeVisible();
    await expect(dialog.getByText("2 sider · Uke 37: Merkevare")).toBeVisible();
    await expect(dialog.getByText("Det kan ikke angres.")).toBeVisible();
    await expect(dialog).not.toContainText("Dette sletter også");
    await expectNoAxeViolations(page);

    // Esc: nothing is deleted, and focus is back on «Slett».
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(slett).toBeFocused();
    expect(await filesViaApi(page, lectureId)).toEqual(["merkevare.pdf", "prising.pdf"]);

    // Open again and confirm with the keyboard: «Avbryt» -> Tab -> «Slett fila».
    await page.keyboard.press("Enter");
    await expect(dialog.getByRole("button", { name: "Avbryt" })).toBeFocused();
    const confirm = dialog.getByRole("button", { name: "Slett fila" });
    await expect(confirm).toBeEnabled();
    await page.keyboard.press("Tab");
    await expect(confirm).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(dialog).toBeHidden();
    await expect(fileRows(page)).toHaveCount(1);
    await expect(fileRows(page)).toContainText("prising.pdf");
    await expect(page.getByText("Forelesning fredag 11.09.2026 · 1 fil · 3 sider")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Filer" })).toBeFocused();
    expect(await filesViaApi(page, lectureId)).toEqual(["prising.pdf"]);
  });

  test("FR-7: slett forelesningen med bare tastatur; axe uten brudd; hun lander på emnesiden med fokus på h1", async ({
    page,
  }) => {
    const { subjectId, lectureId } = await setUp(page);
    await page.goto(`/forelesninger/${lectureId}`);
    await expect(page.getByText("Forelesning fredag 11.09.2026 · 2 filer · 5 sider")).toBeVisible();

    await tabTo(page, page.getByRole("button", { name: "Slett forelesningen" }));
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Slette forelesningen?" });
    await expect(dialog.getByRole("button", { name: "Avbryt" })).toBeFocused();
    await expect(dialog.getByText("Dette sletter også 2 filer.")).toBeVisible();
    await expect(dialog.getByText("Det kan ikke angres.")).toBeVisible();
    await expectNoAxeViolations(page);
    const confirm = dialog.getByRole("button", { name: "Slett forelesningen" });
    await expect(confirm).toBeEnabled();
    await page.keyboard.press("Tab");
    await expect(confirm).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(new RegExp(`/emner/${subjectId}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Markedsføring" })).toBeFocused();
    await expect(page.getByText("1 forelesning · 0 filer · eksamen fredag 04.12.2026")).toBeVisible();
    await expect(page.getByRole("link", { name: /Uke 37: Merkevare/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Uke 38: Prising/ }).first()).toBeVisible();
    expect((await page.request.get(`/api/lectures/${lectureId}`)).status()).toBe(404);
  });

  test("FR-6: slett emnet med bare tastatur; axe uten brudd; hun lander på forsiden med fokus på «Dine emner»", async ({
    page,
  }) => {
    const { subjectId } = await setUp(page);
    await createSubjectViaApi(page, "Samfunnsøkonomi");
    await page.goto(`/emner/${subjectId}`);
    await expect(page.getByText("2 forelesninger · 2 filer · eksamen fredag 04.12.2026")).toBeVisible();

    const slett = page.getByRole("button", { name: "Slett emnet" });
    await tabTo(page, slett);
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Slette emnet?" });
    await expect(dialog.getByRole("button", { name: "Avbryt" })).toBeFocused();
    await expect(dialog.getByText("Dette sletter også 2 forelesninger og 2 filer.")).toBeVisible();
    await expect(dialog.getByText("Det kan ikke angres.")).toBeVisible();
    await expectNoAxeViolations(page);

    // Esc first: nothing is deleted.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(slett).toBeFocused();
    expect((await page.request.get(`/api/subjects/${subjectId}`)).status()).toBe(200);

    await page.keyboard.press("Enter");
    await expect(dialog.getByRole("button", { name: "Slett emnet" })).toBeEnabled();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "Slett emnet" })).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "Dine emner" })).toBeFocused();
    await expect(page.getByRole("link", { name: "Samfunnsøkonomi" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Markedsføring" })).toHaveCount(0);
    expect((await page.request.get(`/api/subjects/${subjectId}`)).status()).toBe(404);
  });
});
