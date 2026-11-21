import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import {
  createLectureViaApi,
  createSubjectViaApi,
  expectNoAxeViolations,
  expectOnHomePage,
  fileRows,
  pdfFile,
  registerWithTermsViaApi,
  sidebarLectures,
  uploadViaApi,
} from "./felles";

// Flow 2 in EXPERIENCE.md («Brukerreiser (Key Flows)»), UJ-2 in the PRD.
// «Three weeks before the exam Klara has uploaded notes from all the lectures
// in Markedsføring»: the account, the subject and eight lectures with one PDF
// each are made through the API first, since the flow has no login step.
// Only the steps that are built are tested; the rest (status «øvd», practice
// for the whole subject, model cards and free text) are listed as
// «ikke bygd ennå» in docs/testing/brukerreiser.md.
// The steps share one browser context and run in order, like one visit by Klara.
test.describe("UJ-2 / flyt 2: Klara før eksamen", () => {
  test.describe.configure({ mode: "serial" });

  // Eight lectures, one a week on Fridays from week 34.
  const LECTURES = [
    ["Uke 34: Introduksjon", "2026-08-21"],
    ["Uke 35: Kjøpsatferd", "2026-08-28"],
    ["Uke 36: Segmentering", "2026-09-04"],
    ["Uke 37: Merkevare", "2026-09-11"],
    ["Uke 38: Prising", "2026-09-18"],
    ["Uke 39: Distribusjon", "2026-09-25"],
    ["Uke 40: Kommunikasjon", "2026-10-02"],
    ["Uke 41: Digital markedsføring", "2026-10-09"],
  ] as const;
  let context: BrowserContext;
  let page: Page;
  let exam: { iso: string; shown: string };

  test.beforeAll(async ({ browser }, testInfo) => {
    context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    page = await context.newPage();
    // The exam is three weeks from today (local date, as the app shows it).
    const date = new Date();
    date.setDate(date.getDate() + 21);
    const pad = (value: number) => String(value).padStart(2, "0");
    const [y, m, d] = [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())];
    exam = { iso: `${y}-${m}-${d}`, shown: `${d}.${m}.${y}` };

    await registerWithTermsViaApi(page);
    const subjectId = await createSubjectViaApi(page, "Markedsføring", exam.iso);
    for (const [name, lectureDate] of LECTURES) {
      const lectureId = await createLectureViaApi(page, subjectId, name, lectureDate);
      const slug = name.split(": ")[1].toLowerCase().replace(/\s+/g, "-");
      await uploadViaApi(page, lectureId, pdfFile(`${slug}.pdf`, [name, "Notater"]));
    }
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("Steg 1 (åpner emnet) – UJ-2, FR-6: forsiden (02) viser Markedsføring med åtte forelesninger og eksamen, og hun åpner emnet", async () => {
    await page.goto("/");
    await expectOnHomePage(page);
    const item = page.locator("main li").filter({ hasText: "Markedsføring" });
    await expect(item).toContainText("8 forelesninger");
    await expect(item).toContainText(`Eksamen ${exam.shown}`);
    await expectNoAxeViolations(page);

    await item.getByRole("link", { name: "Markedsføring" }).click();
    await expect(page).toHaveURL(/\/emner\/[0-9a-f-]{36}$/);
    await expect(page.locator("main h1")).toHaveText("Markedsføring");
  });

  test("Steg 2 (forelesningene med status) – FR-7, FR-15, UX-DR7, UX-DR13: emnesiden (03) viser forelesningene etter dato med filer og status", async () => {
    await expect(
      page.getByText(new RegExp(`^8 forelesninger · 8 filer · eksamen \\S+ ${exam.shown.replace(/\./g, "\\.")}$`)),
    ).toBeVisible();
    const rows = page.locator("main tbody tr");
    await expect(rows).toHaveCount(8);
    await expect(rows.getByRole("link")).toHaveText(LECTURES.map(([name]) => name));
    for (let i = 0; i < LECTURES.length; i += 1) {
      await expect(rows.nth(i).getByRole("cell").nth(2)).toHaveText("1");
      // No practice exists before epic 3, so every lecture with notes is «Ikke øvd ennå».
      await expect(rows.nth(i).getByRole("cell").nth(3)).toHaveText("Ikke øvd ennå");
    }
    await expect(sidebarLectures(page)).toHaveCount(8);
    await expectNoAxeViolations(page);
  });

  test("Steg 4 (åpner forelesningen) – FR-7, UX-DR7: hun åpner «Uke 37: Merkevare» (04) med notatene", async () => {
    await page.getByRole("navigation", { name: "Emner" }).getByRole("link", { name: "Uke 37: Merkevare" }).click();
    await expect(page).toHaveURL(/\/forelesninger\/[0-9a-f-]{36}$/);
    await expect(page.locator("main h1")).toHaveText("Uke 37: Merkevare");
    await expect(page.getByText("Forelesning fredag 11.09.2026 · 1 fil · 2 sider")).toBeVisible();
    await expect(fileRows(page)).toHaveCount(1);
    await expect(fileRows(page).first()).toContainText("merkevare.pdf");
    await expectNoAxeViolations(page);
  });
});
