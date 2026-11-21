import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import {
  createLectureViaApi,
  createSubjectViaApi,
  expectNoAxeViolations,
  fileNamesViaApi,
  fileRows,
  pdfFile,
  registerWithTermsViaApi,
  today,
  uploadViaApi,
} from "./felles";

// Flow 3 in EXPERIENCE.md («Brukerreiser (Key Flows)»), a support flow for FR-12 and FR-13.
// The flow starts on the lecture page (04) and has no login step of its own, so
// the account, subject, lecture and the old file are made through the API first.
// The generated content the dialogs and «Lag og øv» will count comes in epic 3,
// 4 and 7; see docs/testing/brukerreiser.md.
// The steps share one browser context and run in order, like one visit by Klara.
test.describe("FR-12, FR-13 / flyt 3: Klara rydder i filene", () => {
  test.describe.configure({ mode: "serial" });

  let context: BrowserContext;
  let page: Page;
  let lectureId: string;

  test.beforeAll(async ({ browser }, testInfo) => {
    context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    page = await context.newPage();
    await registerWithTermsViaApi(page);
    const subjectId = await createSubjectViaApi(page, "Markedsføring", "2026-12-04");
    lectureId = await createLectureViaApi(page, subjectId, "Uke 37: Merkevare", "2026-09-11");
    // The old version (2 pages) and another file from the same lecture.
    await uploadViaApi(page, lectureId, pdfFile("merkevare-notater.pdf", ["Gammel side en", "Gammel side to"]));
    await uploadViaApi(page, lectureId, pdfFile("merkevare-lysark.pdf", ["Lysark"]));
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("Steg 1 – FR-8, UX-DR16: forelesningssiden (04) viser den gamle versjonen av fila", async () => {
    await page.goto(`/forelesninger/${lectureId}`);
    await expect(page.locator("main h1")).toHaveText("Uke 37: Merkevare");
    await expect(page.getByText("Forelesning fredag 11.09.2026 · 2 filer · 3 sider")).toBeVisible();
    await expect(fileRows(page)).toHaveCount(2);
    await expect(fileRows(page).nth(0)).toContainText("merkevare-notater.pdf");
    await expect(fileRows(page).nth(0)).toContainText(`2 sider · lastet opp ${(await today(page)).dayMonth}`);
    await expect(fileRows(page).nth(0).getByRole("button", { name: "Slett merkevare-notater.pdf" })).toBeVisible();
    await expect(fileRows(page).nth(0).getByRole("button", { name: "Erstatt merkevare-notater.pdf" })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("Steg 2 – FR-12, UX-DR22: «Slett» på fila åpner dialogen (14) som viser fila og at det ikke kan angres", async () => {
    await page.getByRole("button", { name: "Slett merkevare-notater.pdf" }).click();
    const dialog = page.getByRole("dialog", { name: "Slette fila?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("merkevare-notater.pdf")).toBeVisible();
    await expect(dialog.getByText("2 sider · Uke 37: Merkevare")).toBeVisible();
    // Nothing has been generated from the file yet, so there is no «Dette sletter også …».
    await expect(dialog).not.toContainText("Dette sletter også");
    await expect(dialog.getByText("Det kan ikke angres.")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Slett fila" })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("Steg 3 – FR-12, UX-DR21, UX-DR22: fokus står på «Avbryt», hun trykker Esc, og ingenting er slettet", async () => {
    const dialog = page.getByRole("dialog", { name: "Slette fila?" });
    await expect(dialog.getByRole("button", { name: "Avbryt" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Slett merkevare-notater.pdf" })).toBeFocused();
    await expect(fileRows(page)).toHaveCount(2);
    expect(await fileNamesViaApi(page, lectureId)).toEqual(["merkevare-notater.pdf", "merkevare-lysark.pdf"]);
    await expectNoAxeViolations(page);
  });

  test("Steg 4 – FR-13, UX-DR21, UX-DR22: «Erstatt» og den nye fila, bekreftelsen sier hva som slettes", async () => {
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Erstatt merkevare-notater.pdf" }).click();
    await (await chooser).setFiles(pdfFile("merkevare-notater-v2.pdf", ["Ny side en", "Ny side to", "Ny side tre"]));

    const dialog = page.getByRole("dialog", { name: "Erstatte fila?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Avbryt" })).toBeFocused();
    await expect(dialog.getByText("merkevare-notater.pdf", { exact: true })).toBeVisible();
    await expect(dialog.getByText("2 sider · Uke 37: Merkevare")).toBeVisible();
    await expect(dialog.getByText("Erstattes med merkevare-notater-v2.pdf.")).toBeVisible();
    await expect(dialog.getByText("Det kan ikke angres.")).toBeVisible();
    await expectNoAxeViolations(page);
    // Nothing is replaced before she confirms.
    expect(await fileNamesViaApi(page, lectureId)).toEqual(["merkevare-notater.pdf", "merkevare-lysark.pdf"]);
  });

  test("Steg 5 – FR-13, UX-DR16: hun bekrefter, den gamle fila er borte og den nye står i lista", async () => {
    const dialog = page.getByRole("dialog", { name: "Erstatte fila?" });
    await dialog.getByRole("button", { name: "Erstatt fila" }).click();
    await expect(dialog).toHaveCount(0);

    await expect(fileRows(page)).toHaveCount(2);
    await expect(fileRows(page).nth(0)).toContainText("merkevare-lysark.pdf");
    await expect(fileRows(page).nth(1)).toContainText("merkevare-notater-v2.pdf");
    await expect(fileRows(page).nth(1)).toContainText(`3 sider · lastet opp ${(await today(page)).dayMonth}`);
    await expect(page.getByRole("button", { name: "Slett merkevare-notater.pdf" })).toHaveCount(0);
    await expect(page.getByText("Forelesning fredag 11.09.2026 · 2 filer · 4 sider")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Filer" })).toBeFocused();
    expect(await fileNamesViaApi(page, lectureId)).toEqual(["merkevare-lysark.pdf", "merkevare-notater-v2.pdf"]);
    await expectNoAxeViolations(page);
  });
});
