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

// A new, logged-in student who has accepted the terms, with one subject and one lecture.
async function newLecture(page: Page): Promise<{ subjectId: string; lectureId: string }> {
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
  return { subjectId, lectureId: (await lecture.json()).id };
}

// Three cards from the mock model (one per definition sentence), made through the API.
async function lectureWithThreeCards(page: Page): Promise<{ subjectId: string; lectureId: string }> {
  const ids = await newLecture(page);
  const pages = ["Merkevare er et navn som skiller et produkt fra andre. Pris er det kunden betaler.", "Segment er en gruppe kunder."];
  const upload = await page.request.post(`/api/lectures/${ids.lectureId}/files`, {
    multipart: { file: { name: "definisjoner.pdf", mimeType: "application/pdf", buffer: makePdf({ pages }) } },
  });
  expect(upload.status()).toBe(201);
  const start = await page.request.post(`/api/lectures/${ids.lectureId}/jobs`, {
    data: { kind: "flashcards", params: { requested: 10 } },
  });
  expect(start.status()).toBe(202);
  await expect
    .poll(async () => (await (await page.request.get(`/api/lectures/${ids.lectureId}/content-counts`)).json()).flashcards, {
      timeout: 10_000,
    })
    .toBe(3);
  return ids;
}

function card(page: Page): Locator {
  return page.locator('[data-slot="flashcard"]');
}

function front(page: Page): Locator {
  return card(page).locator("p").nth(1);
}

function knownButton(page: Page): Locator {
  return page.getByRole("button", { name: "Kunne", exact: true });
}

async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

test.describe("Hurtigtaster i økten (story 3.4)", () => {
  test("NFR-8, UX-DR27, UX-DR31: hele økten går med Mellomrom, 1 og 2, og kortet markert med 1 kommer igjen", async ({ page }) => {
    const { lectureId } = await lectureWithThreeCards(page);
    await page.goto(`/forelesninger/${lectureId}/flashcards`);
    await expect(page.getByText("/ 3")).toBeVisible();

    const hints = page.getByRole("list", { name: "Hurtigtaster" });
    await expect(hints).toBeVisible();
    await expect(hints.getByRole("listitem")).toHaveText(["1 Kunne ikke", "2 Kunne", "Mellomrom snu kortet", "Esc avslutt"]);

    // 1 and 2 do nothing before the card is flipped.
    const firstFront = await front(page).textContent();
    await page.keyboard.press("1");
    await page.keyboard.press("2");
    await expect(page.getByText("Kunne 0 · Kunne ikke 0")).toBeVisible();

    await page.keyboard.press(" ");
    await expect(page.getByText("SVAR", { exact: true })).toBeVisible();
    await expect(knownButton(page)).toBeFocused();
    await page.keyboard.press("1");
    await expect(page.getByRole("button", { name: "Snu kortet" })).toBeFocused();

    for (let i = 0; i < 2; i += 1) {
      await page.keyboard.press(" ");
      await expect(knownButton(page)).toBeFocused();
      await page.keyboard.press("2");
    }
    await expect(page.getByText("Repeterer: 1 kort igjen")).toBeVisible();
    await expect(front(page)).toHaveText(firstFront!);
    await page.keyboard.press(" ");
    await page.keyboard.press("2");
    await expect(page.getByRole("heading", { level: 2, name: "Økten er ferdig" })).toBeFocused();
    await expect(page.getByText("Kunne 2 · Kunne ikke 1")).toBeVisible();
  });

  test("UX-DR33: Esc avslutter økten som «Avslutt økt»", async ({ page }) => {
    const { lectureId } = await lectureWithThreeCards(page);
    await page.goto(`/forelesninger/${lectureId}/flashcards`);
    await expect(page.getByText("/ 3")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(`/forelesninger/${lectureId}`);
  });

  test("UX-DR32: Mellomrom på «Avslutt økt» avslutter, uten å snu kortet", async ({ page }) => {
    const { lectureId } = await lectureWithThreeCards(page);
    await page.goto(`/forelesninger/${lectureId}/flashcards`);
    await tabTo(page, page.getByRole("button", { name: "Avslutt økt" }));
    await page.keyboard.press(" ");
    await expect(page).toHaveURL(`/forelesninger/${lectureId}`);
  });

  test("UX-DR26, UX-DR32: ? åpner hurtigtastdialogen, Esc lukker bare den med fokus tilbake, og axe finner ingen brudd", async ({ page }) => {
    const { lectureId } = await lectureWithThreeCards(page);
    await page.goto(`/forelesninger/${lectureId}/flashcards`);
    await expect(page.getByText("/ 3")).toBeVisible();
    const flip = page.getByRole("button", { name: "Snu kortet" });
    await tabTo(page, flip);
    await page.keyboard.press("?");
    const dialog = page.getByRole("dialog", { name: "Hurtigtaster" });
    await expect(dialog).toBeVisible();
    const toggle = dialog.getByRole("switch", { name: "Bruk hurtigtaster" });
    await expect(toggle).toBeChecked();
    await expect(toggle).toBeFocused();
    await expect(dialog.getByRole("cell", { name: "Snu kortet" })).toBeVisible();
    await expectNoAxeViolations(page);

    // Single keys do nothing while the dialog is open.
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(`/forelesninger/${lectureId}/flashcards`);
    await expect(page.getByText("SVAR", { exact: true })).toHaveCount(0);
    // Focus is back where it was before «?».
    await expect(flip).toBeFocused();
    await page.keyboard.press(" ");
    await expect(page.getByText("SVAR", { exact: true })).toBeVisible();
  });

  test("UX-DR26: bryteren av skrur av enkelttastene og hint-linjen, valget huskes, og Esc virker fortsatt", async ({
    page,
  }) => {
    const { lectureId } = await lectureWithThreeCards(page);
    await page.goto(`/forelesninger/${lectureId}/flashcards`);
    await expect(page.getByText("/ 3")).toBeVisible();
    await page.keyboard.press("?");
    const toggle = page.getByRole("dialog", { name: "Hurtigtaster" }).getByRole("switch", { name: "Bruk hurtigtaster" });
    await page.keyboard.press(" ");
    await expect(toggle).not.toBeChecked();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("list", { name: "Hurtigtaster" })).toHaveCount(0);

    await page.reload();
    await expect(page.getByText("/ 3")).toBeVisible();
    await expect(page.getByRole("list", { name: "Hurtigtaster" })).toHaveCount(0);
    for (const key of [" ", "1", "2", "?"]) await page.keyboard.press(key);
    await expect(page.getByText("SVAR", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // The buttons still work.
    await page.getByRole("button", { name: "Snu kortet" }).click();
    await expect(page.getByText("SVAR", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(`/forelesninger/${lectureId}`);
  });

  test("UX-DR26: «? Hurtigtaster» i sidemenyen åpner dialogen med tastene og bryteren på, uten axe-brudd", async ({
    page,
  }) => {
    const { subjectId } = await newLecture(page);
    await page.goto(`/emner/${subjectId}`);
    const nav = page.getByRole("navigation", { name: "Emner" });
    const opener = nav.getByRole("button", { name: "? Hurtigtaster" });
    await tabTo(page, opener);
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Hurtigtaster" });
    await expect(dialog.getByRole("columnheader")).toHaveText(["Tast", "Handling"]);
    await expect(dialog.getByRole("switch", { name: "Bruk hurtigtaster" })).toBeChecked();
    await expectNoAxeViolations(page);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  });
});

test.describe("Smal skjerm (story 3.4)", () => {
  test("UX-DR10, NFR-14: på 768 px er øktpanelet bak «Meny», og Esc lukker bare panelet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    const { lectureId } = await lectureWithThreeCards(page);
    await page.goto(`/forelesninger/${lectureId}/flashcards`);
    await expect(page.getByText("SPØRSMÅL")).toBeVisible();
    await expect(page.getByRole("region", { name: "Flashcards" })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "Flashcards" })).toBeAttached();
    // A CSS locator: while the panel is open, the top bar is hidden from the
    // accessibility tree (aria-hidden and inert), so a role locator finds nothing.
    const menu = page.locator('header button[aria-label="Meny"]');
    await expect(page.getByRole("banner").getByRole("button", { name: "Meny" })).toBeVisible();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expectNoHorizontalScroll(page);
    await expectNoAxeViolations(page);

    await tabTo(page, menu);
    await page.keyboard.press("Enter");
    const sheet = page.getByRole("dialog", { name: "Flashcards" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("heading", { level: 2, name: "Flashcards" })).toBeVisible();
    await expect(sheet.getByText("/ 3")).toBeVisible();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await expectNoHorizontalScroll(page);
    await expectNoAxeViolations(page);

    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(page).toHaveURL(`/forelesninger/${lectureId}/flashcards`);
    await expect(menu).toBeFocused();

    // A click on the scrim, right of the panel, closes it too.
    await menu.click();
    await expect(sheet).toBeVisible();
    await page.mouse.click(600, 450);
    await expect(sheet).toHaveCount(0);
    await expect(page.getByText("SVAR", { exact: true })).toHaveCount(0);

    // «Avslutt økt» is in the panel.
    await menu.click();
    await sheet.getByRole("button", { name: "Avslutt økt" }).click();
    await expect(page).toHaveURL(`/forelesninger/${lectureId}`);
  });

  test("UX-DR10, UX-DR26: «? Hurtigtaster» fra panelet lukker panelet først, og fokus går til «Meny» etterpå", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    const { subjectId } = await newLecture(page);
    await page.goto(`/emner/${subjectId}`);
    const menu = page.getByRole("button", { name: "Meny" });
    await menu.click();
    const sheet = page.getByRole("dialog", { name: "Emner" });
    await sheet.getByRole("button", { name: "? Hurtigtaster" }).click();
    await expect(sheet).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(page.getByRole("dialog", { name: "Hurtigtaster" })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(menu).toBeFocused();
  });

  for (const width of [768, 640]) {
    test(`UX-DR10, NFR-14: epic 2-sidene på ${width} px har sidemenyen bak «Meny» og ingen vannrett rulling`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const { subjectId, lectureId } = await lectureWithThreeCards(page);

      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("button", { name: "Meny" })).toHaveCount(0);
      await expectNoHorizontalScroll(page);
      await expectNoAxeViolations(page);

      for (const [path, title] of [
        [`/emner/${subjectId}`, "Markedsføring"],
        [`/forelesninger/${lectureId}`, "Uke 37: Merkevare"],
        ["/konto", "Konto"],
      ]) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
        await expect(page.getByRole("navigation", { name: "Emner" })).toHaveCount(0);
        await expectNoHorizontalScroll(page);
        await expectNoAxeViolations(page);

        const menu = page.getByRole("button", { name: "Meny" });
        await menu.click();
        const sheet = page.getByRole("dialog", { name: "Emner" });
        await expect(sheet.getByRole("navigation", { name: "Emner" })).toBeVisible();
        await expectNoHorizontalScroll(page);
        await expectNoAxeViolations(page);
        await page.keyboard.press("Escape");
        await expect(sheet).toHaveCount(0);
        await expect(menu).toBeFocused();
      }

      // Following a link in the panel closes it.
      await page.getByRole("button", { name: "Meny" }).click();
      await page.getByRole("dialog", { name: "Emner" }).getByRole("link", { name: "Markedsføring" }).click();
      await expect(page).toHaveURL(`/emner/${subjectId}`);
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });
  }

  test("UX-DR10: på 1280 px står sidemenyen i siden og det er ingen menyknapp", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const { subjectId } = await newLecture(page);
    await page.goto(`/emner/${subjectId}`);
    await expect(page.getByRole("navigation", { name: "Emner" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Meny" })).toHaveCount(0);
  });
});
