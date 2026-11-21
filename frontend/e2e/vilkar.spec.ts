import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { makePdf } from "./pdf";

const PASSWORD = "hemmelig1";
const CHECKBOX_LABEL = "Jeg har lest dette og laster bare opp materiale jeg har rett til å bruke.";

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

async function isFocused(element: Locator): Promise<boolean> {
  return element.evaluate((el) => el === document.activeElement);
}

function pdfFile(name: string, pages: string[]) {
  return { name, mimeType: "application/pdf", buffer: makePdf({ pages }) };
}

// A new student who has NOT accepted the terms, on an empty lecture page.
async function newLecturePageWithoutTerms(page: Page): Promise<string> {
  const registered = await page.request.post("/api/identity/register", {
    data: { email: uniqueEmail(), password: PASSWORD },
  });
  expect(registered.status()).toBe(201);
  const subject = await page.request.post("/api/subjects", { data: { name: "Markedsføring", exam_date: "2026-12-04" } });
  const subjectId = (await subject.json()).id;
  const lecture = await page.request.post(`/api/subjects/${subjectId}/lectures`, {
    data: { name: "Uke 37: Merkevare", date: "2026-09-11" },
  });
  const lectureId = (await lecture.json()).id;
  await page.goto(`/forelesninger/${lectureId}`);
  await expect(page.getByText("Forelesning fredag 11.09.2026 · 0 filer · 0 sider")).toBeVisible();
  return lectureId;
}

// Opens the file chooser from «Velg PDF» with the keyboard and picks the files.
async function chooseWithKeyboard(page: Page, files: ReturnType<typeof pdfFile>[]) {
  const button = page.getByRole("button", { name: "Velg PDF" });
  await tabTo(page, button);
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Enter");
  await (await chooser).setFiles(files);
  return button;
}

async function termsAcceptedAt(page: Page): Promise<string | null> {
  const me = await page.request.get("/api/identity/me");
  return (await me.json()).terms_accepted_at;
}

test.describe("Vilkår (story 2.4)", () => {
  test("FR-11: vilkårsdialogen med bare tastatur: fokus fanget, avkrysning, godta og last opp, ingen dialog neste gang", async ({
    page,
  }) => {
    await newLecturePageWithoutTerms(page);
    const uploads: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().endsWith("/files")) uploads.push(request.url());
    });

    await chooseWithKeyboard(page, [pdfFile("merkevare-notater.pdf", ["Side en", "Side to"])]);

    const dialog = page.getByRole("dialog", { name: "Før du laster opp" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText("Du har valgt merkevare-notater.pdf. Vi viser dette bare før den første opplastingen."),
    ).toBeVisible();
    await expect(dialog.getByText("I demomodus sendes ingenting ut.")).toBeVisible();
    const box = dialog.getByRole("checkbox", { name: CHECKBOX_LABEL });
    const accept = dialog.getByRole("button", { name: "Godta og last opp" });
    await expect(box).toBeFocused();
    await expect(accept).toBeDisabled();
    expect(uploads).toEqual([]);
    await expectNoAxeViolations(page);

    // Tab and Shift+Tab stay inside the dialog (the disabled button is skipped).
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press("Shift+Tab");
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }

    await tabTo(page, box);
    await page.keyboard.press("Space");
    await expect(box).toBeChecked();
    await expect(accept).toBeEnabled();
    await expectNoAxeViolations(page);
    await tabTo(page, accept);
    await page.keyboard.press("Enter");

    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("Forelesning fredag 11.09.2026 · 1 fil · 2 sider")).toBeVisible();
    await expect(page.getByRole("list", { name: "Filer" }).getByRole("listitem")).toHaveCount(1);
    expect(await termsAcceptedAt(page)).not.toBeNull();

    // After a reload: no dialog, the file goes straight up.
    await page.reload();
    await expect(page.getByText("Forelesning fredag 11.09.2026 · 1 fil · 2 sider")).toBeVisible();
    await chooseWithKeyboard(page, [pdfFile("neste.pdf", ["Neste"])]);
    await expect(page.getByText("Forelesning fredag 11.09.2026 · 2 filer · 3 sider")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("FR-11: Esc lukker dialogen, ingenting lastes opp, vilkårene er ikke godtatt, og fokus står på «Velg PDF»", async ({
    page,
  }) => {
    await newLecturePageWithoutTerms(page);
    const calls: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST") calls.push(new URL(request.url()).pathname);
    });

    const button = await chooseWithKeyboard(page, [
      pdfFile("en.pdf", ["En"]),
      pdfFile("to.pdf", ["To"]),
      pdfFile("tre.pdf", ["Tre"]),
    ]);
    const dialog = page.getByRole("dialog", { name: "Før du laster opp" });
    await expect(dialog.getByText("Du har valgt 3 filer. Vi viser dette bare før den første opplastingen.")).toBeVisible();
    await page.keyboard.press("Space");
    await page.keyboard.press("Escape");

    await expect(dialog).toHaveCount(0);
    await expect.poll(() => isFocused(button)).toBe(true);
    await page.waitForTimeout(300);
    expect(calls).toEqual([]);
    expect(await termsAcceptedAt(page)).toBeNull();
    await expect(page.getByText("Forelesning fredag 11.09.2026 · 0 filer · 0 sider")).toBeVisible();
  });

  test("NFR-12: uten demomodus mangler demosetningen, og dialogen har ingen axe-brudd", async ({ page }) => {
    // The app under test runs in demo mode; the config answer is changed in the browser only.
    await page.route("**/api/config", async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, json: { ...(await response.json()), demo_mode: false } });
    });
    await newLecturePageWithoutTerms(page);
    await chooseWithKeyboard(page, [pdfFile("notater.pdf", ["En"])]);
    const dialog = page.getByRole("dialog", { name: "Før du laster opp" });
    await expect(dialog.getByText("Google kan logge forespørslene en periode for å oppdage misbruk.")).toBeVisible();
    await expect(dialog.getByText("I demomodus sendes ingenting ut.")).toHaveCount(0);
    await expectNoAxeViolations(page);
  });

  test("AR-6: opplasting uten godtatte vilkår avvises av backenden med TERMS_NOT_ACCEPTED", async ({ page }) => {
    const lectureId = await newLecturePageWithoutTerms(page);
    const response = await page.request.post(`/api/lectures/${lectureId}/files`, {
      multipart: { file: pdfFile("a.pdf", ["x"]) },
    });
    expect(response.status()).toBe(403);
    expect((await response.json()).error.code).toBe("TERMS_NOT_ACCEPTED");
  });
});
