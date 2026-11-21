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

// Three cards from the mock model (one per definition sentence), made through the API.
async function lectureWithThreeCards(page: Page): Promise<string> {
  const lectureId = await newLecture(page);
  const pages = ["Merkevare er et navn som skiller et produkt fra andre. Pris er det kunden betaler.", "Segment er en gruppe kunder."];
  const upload = await page.request.post(`/api/lectures/${lectureId}/files`, {
    multipart: { file: { name: "definisjoner.pdf", mimeType: "application/pdf", buffer: makePdf({ pages }) } },
  });
  expect(upload.status()).toBe(201);
  const start = await page.request.post(`/api/lectures/${lectureId}/jobs`, {
    data: { kind: "flashcards", params: { requested: 10 } },
  });
  expect(start.status()).toBe(202);
  await expect
    .poll(async () => (await (await page.request.get(`/api/lectures/${lectureId}/content-counts`)).json()).flashcards, {
      timeout: 10_000,
    })
    .toBe(3);
  return lectureId;
}

function panel(page: Page): Locator {
  return page.getByRole("region", { name: "Flashcards" });
}

test.describe("Flashcard-økten (story 3.3)", () => {
  test("FR-23, FR-24, FR-25, UX-DR9: «Øv nå» åpner økten, og hele økten går med Tab og Enter", async ({ page }) => {
    const lectureId = await lectureWithThreeCards(page);
    await page.goto(`/forelesninger/${lectureId}`);
    const practice = page.getByRole("region", { name: "Lag og øv" }).getByRole("button", { name: "Øv nå" });
    await expect(practice).toBeEnabled();
    await tabTo(page, practice);
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(`/forelesninger/${lectureId}/flashcards`);
    await expect(page).toHaveTitle("Flashcards – Uke 37: Merkevare – Studiekamerat");
    await expect(panel(page).getByRole("heading", { level: 1, name: "Flashcards" })).toBeVisible();
    await expect(panel(page).getByText("Uke 37: Merkevare")).toBeVisible();
    await expect(panel(page).getByText("/ 3")).toBeVisible();
    // The panel stands where the sidebar is: no sidebar during the session.
    await expect(page.getByRole("navigation", { name: "Emner" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Kunne", exact: true })).toBeDisabled();
    await expectNoAxeViolations(page);

    // The card is centred in the area to the right of the panel.
    const card = page.locator('[data-slot="flashcard"]');
    const panelBox = (await panel(page).boundingBox())!;
    const cardBox = (await card.boundingBox())!;
    const viewport = page.viewportSize()!;
    const areaCentre = panelBox.x + panelBox.width + (viewport.width - panelBox.x - panelBox.width) / 2;
    expect(Math.abs(cardBox.x + cardBox.width / 2 - areaCentre)).toBeLessThan(2);

    // First card: flip and mark «Kunne ikke», so it comes back last.
    const flip = page.getByRole("button", { name: "Snu kortet" });
    await tabTo(page, flip);
    await page.keyboard.press("Enter");
    await expect(page.getByText("SVAR", { exact: true })).toBeVisible();
    await expect(page.locator('[data-slot="source-link"]')).toHaveText(/^definisjoner\.pdf, side [12]$/);
    await expect(page.locator('[data-slot="source-link"] a')).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Kunne", exact: true })).toBeFocused();
    await expectNoAxeViolations(page);
    const missedFront = await card.locator("p").nth(1).textContent();
    await page.keyboard.press("Shift+Tab");
    await expect(page.getByRole("button", { name: "Kunne ikke" })).toBeFocused();
    await page.keyboard.press("Enter");

    // The next two: «Kunne», with focus on «Snu kortet» after each mark.
    for (let i = 0; i < 2; i += 1) {
      await expect(flip).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("button", { name: "Kunne", exact: true })).toBeFocused();
      await page.keyboard.press("Enter");
    }

    // The missed card comes back while repeating; the counter stays at 3.
    await expect(panel(page).getByText("Repeterer: 1 kort igjen")).toBeVisible();
    await expect(panel(page).getByText("Kunne 2 · Kunne ikke 1")).toBeVisible();
    await expect(card.locator("p").nth(1)).toHaveText(missedFront!);
    await expect(flip).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");

    const finished = page.getByRole("heading", { level: 2, name: "Økten er ferdig" });
    await expect(finished).toBeFocused();
    await expect(page.locator('[role="status"]').filter({ hasText: "Økten er ferdig" })).toHaveCount(1);
    await expect(panel(page).getByText("Kunne ikke, repetert")).toBeVisible();
    await expect(panel(page).getByRole("button", { name: "Avslutt økt" })).toHaveCount(0);
    await expect(panel(page).getByText("Kort 1: kunne ikke")).toBeAttached();
    await expectNoAxeViolations(page);

    await tabTo(page, page.getByRole("link", { name: "Tilbake til forelesningen" }));
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`/forelesninger/${lectureId}`);
  });

  test("UX-DR33: «Avslutt økt» går rett tilbake til forelesningen", async ({ page }) => {
    const lectureId = await lectureWithThreeCards(page);
    await page.goto(`/forelesninger/${lectureId}/flashcards`);
    await page.getByRole("button", { name: "Snu kortet" }).click();
    await page.getByRole("button", { name: "Kunne", exact: true }).click();
    await panel(page).getByRole("button", { name: "Avslutt økt" }).click();
    await expect(page).toHaveURL(`/forelesninger/${lectureId}`);
    await expect(page.getByRole("heading", { level: 1, name: "Uke 37: Merkevare" })).toBeVisible();
  });

  test("A15/E1: en øktadresse uten kort viser «Det finnes ingen flashcards her ennå.»", async ({ page }) => {
    const lectureId = await newLecture(page);
    await page.goto(`/forelesninger/${lectureId}/flashcards`);
    await expect(page.getByRole("heading", { level: 1, name: "Det finnes ingen flashcards her ennå." })).toBeVisible();
    await expect(page.getByRole("region", { name: "Flashcards" })).toHaveCount(0);
    await expectNoAxeViolations(page);
    await page.getByRole("link", { name: "Tilbake til forelesningen" }).click();
    await expect(page).toHaveURL(`/forelesninger/${lectureId}`);
  });

  test("FR-4: en ukjent forelesning gir «Fant ikke siden»", async ({ page }) => {
    await newLecture(page);
    await page.goto("/forelesninger/00000000-0000-0000-0000-000000000000/flashcards");
    await expect(page.getByRole("heading", { level: 1, name: "Fant ikke siden" })).toBeVisible();
  });
});
