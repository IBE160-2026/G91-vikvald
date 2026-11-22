import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page, type Request } from "@playwright/test";

import { makePdf } from "./pdf";

// Story 3.6: «Øv på hele emnet» on the subject page (mockup 03) and the
// flashcard session over all the subject's lectures.

const PASSWORD = "hemmelig1";
const SAVE_PATH = "/api/practice-sessions";

// The mock model makes one card per definition sentence («X er …»), with the
// words before «er» on the front.
const FIRST_FRONTS = ["Merkevare", "Pris", "Segment"];
const SECOND_FRONTS = ["Rabatt", "Kampanje"];

function uniqueEmail(): string {
  return `klara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@eksempel.no`;
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

// A new, logged-in student with the subject «Markedsføring».
async function newSubject(page: Page): Promise<string> {
  const register = await page.request.post("/api/identity/register", {
    data: { email: uniqueEmail(), password: PASSWORD },
  });
  expect(register.status()).toBe(201);
  expect((await page.request.post("/api/identity/terms")).status()).toBe(200);
  const subject = await page.request.post("/api/subjects", { data: { name: "Markedsføring", exam_date: "2026-12-04" } });
  return (await subject.json()).id;
}

async function newLecture(page: Page, subjectId: string, name: string, date: string): Promise<string> {
  const lecture = await page.request.post(`/api/subjects/${subjectId}/lectures`, { data: { name, date } });
  return (await lecture.json()).id;
}

// Uploads the pages and makes flashcards from them with the mock model.
async function addCards(page: Page, lectureId: string, fileName: string, pages: string[], expected: number) {
  const upload = await page.request.post(`/api/lectures/${lectureId}/files`, {
    multipart: { file: { name: fileName, mimeType: "application/pdf", buffer: makePdf({ pages }) } },
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
    .toBe(expected);
}

// A subject with two lectures: three cards in «Uke 37: Merkevare» and two in «Uke 38: Pris».
async function subjectWithTwoLectures(page: Page): Promise<string> {
  const subjectId = await newSubject(page);
  const first = await newLecture(page, subjectId, "Uke 37: Merkevare", "2026-09-11");
  const second = await newLecture(page, subjectId, "Uke 38: Pris", "2026-09-18");
  await addCards(
    page,
    first,
    "definisjoner.pdf",
    ["Merkevare er et navn som skiller et produkt fra andre. Pris er det kunden betaler.", "Segment er en gruppe kunder."],
    3,
  );
  await addCards(page, second, "pris.pdf", ["Rabatt er et avslag i prisen.", "Kampanje er et tilbud i en kort periode."], 2);
  return subjectId;
}

function captureSaves(page: Page): Request[] {
  const saves: Request[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === SAVE_PATH) saves.push(request);
  });
  return saves;
}

function panel(page: Page): Locator {
  return page.getByRole("region", { name: "Flashcards" });
}

function front(page: Page): Locator {
  return page.locator('[data-slot="flashcard"]').locator("p").nth(1);
}

function practiceSection(page: Page): Locator {
  return page.getByRole("region", { name: "Øv på hele emnet" });
}

test.describe("Øv på flashcards fra hele emnet (story 3.6)", () => {
  test("FR-23, UX-DR14: emnesiden viser «5 kort fra 2 forelesninger» og «Øv på flashcards» uten axe-brudd på 1280 og 768 px", async ({
    page,
  }) => {
    const subjectId = await subjectWithTwoLectures(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/emner/${subjectId}`);
    const section = practiceSection(page);
    await expect(section.getByRole("heading", { level: 3, name: "Flashcards" })).toBeVisible();
    await expect(section.getByText("5 kort fra 2 forelesninger")).toBeVisible();
    const start = section.getByRole("link", { name: "Øv på flashcards" });
    await expect(start).toHaveAttribute("href", `/emner/${subjectId}/flashcards`);
    // Not room side by side at 1280: the card stands under the table.
    const table = page.getByRole("table");
    expect((await section.boundingBox())!.y).toBeGreaterThan((await table.boundingBox())!.y);
    await expectNoHorizontalScroll(page);
    await expectNoAxeViolations(page);

    await page.setViewportSize({ width: 768, height: 900 });
    await expect(start).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoAxeViolations(page);

    // At 1440 (the mockup) the card (344 px) stands to the right of the table.
    await page.setViewportSize({ width: 1440, height: 900 });
    const card = section.locator('[data-slot="practice-all-card"]');
    await expect.poll(async () => (await card.boundingBox())!.width).toBe(344);
    expect((await card.boundingBox())!.x).toBeGreaterThan((await table.boundingBox())!.x + (await table.boundingBox())!.width);

    await start.click();
    await expect(page).toHaveURL(`/emner/${subjectId}/flashcards`);
    await expect(panel(page).getByText("/ 5")).toBeVisible();
  });

  test("UX-DR14: et emne uten kort har ingen seksjon «Øv på hele emnet»", async ({ page }) => {
    const subjectId = await newSubject(page);
    await newLecture(page, subjectId, "Uke 37: Merkevare", "2026-09-11");
    await page.goto(`/emner/${subjectId}`);
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("Øv på hele emnet")).toHaveCount(0);
    await expectNoAxeViolations(page);
  });

  test("FR-23, FR-56, UX-DR34: økten blander kortene fra begge forelesningene, lagres med lecture_id null og går tilbake til emnet", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const subjectId = await subjectWithTwoLectures(page);
    const saves = captureSaves(page);
    await page.goto(`/emner/${subjectId}/flashcards`);
    await expect(page).toHaveTitle("Flashcards – Markedsføring – Studiekamerat");
    await expect(panel(page).getByText("Markedsføring · hele emnet")).toBeVisible();
    await expect(panel(page).getByText("/ 5")).toBeVisible();
    await expectNoAxeViolations(page);

    const seen: string[] = [];
    const saved = page.waitForResponse((response) => new URL(response.url()).pathname === SAVE_PATH);
    for (let i = 0; i < 5; i += 1) {
      seen.push((await front(page).textContent())!);
      await page.getByRole("button", { name: "Snu kortet" }).click();
      await expect(page.locator('[data-slot="flashcard"] [data-slot="source-link"]')).toHaveText(
        /^(definisjoner|pris)\.pdf, side [12]$/,
      );
      await page.getByRole("button", { name: "Kunne", exact: true }).click();
    }
    expect((await saved).status()).toBe(204);
    expect([...seen].sort()).toEqual([...FIRST_FRONTS, ...SECOND_FRONTS].sort());

    await expect(page.getByRole("heading", { level: 2, name: "Du har gått gjennom alle 5 kortene" })).toBeFocused();
    // All «Kunne»: the line under the title is only the scope.
    await expect(page.locator('[data-slot="result-summary"]').getByText("Markedsføring · hele emnet", { exact: true })).toBeVisible();
    await expect(page.getByRole("list", { name: "Hurtigtaster" })).toContainText("Esc tilbake til emnet");
    expect(saves).toHaveLength(1);
    expect(saves[0].postDataJSON()).toMatchObject({
      subject_id: subjectId,
      lecture_id: null,
      kind: "flashcards",
      aborted: false,
      shown: 5,
      answered: 5,
      correct: 5,
      wrong: 0,
    });
    await expectNoAxeViolations(page);

    await page.setViewportSize({ width: 768, height: 900 });
    await expectNoHorizontalScroll(page);
    await expectNoAxeViolations(page);

    await page.getByRole("link", { name: "Tilbake til emnet" }).click();
    await expect(page).toHaveURL(`/emner/${subjectId}`);
    expect(saves).toHaveLength(1);
  });

  test("UX-DR33: Esc på resultatsiden og uten markerte kort går til emnesiden", async ({ page }) => {
    const subjectId = await subjectWithTwoLectures(page);
    const saves = captureSaves(page);
    await page.goto(`/emner/${subjectId}/flashcards`);
    await expect(panel(page).getByText("/ 5")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(`/emner/${subjectId}`);
    expect(saves).toHaveLength(0);

    await page.goto(`/emner/${subjectId}/flashcards`);
    await page.getByRole("button", { name: "Snu kortet" }).click();
    await page.getByRole("button", { name: "Kunne", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { level: 2, name: "Avbrutt etter 1 av 5" })).toBeFocused();
    await expect.poll(() => saves.length).toBe(1);
    expect(saves[0].postDataJSON()).toMatchObject({ lecture_id: null, aborted: true, answered: 1 });
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(`/emner/${subjectId}`);
  });

  test("FR-4: andres emne gir «Fant ikke siden» både i API-et og på siden", async ({ page }) => {
    const subjectId = await newSubject(page);
    // Another student.
    await page.request.post("/api/identity/logout");
    await newSubject(page);
    const response = await page.request.get(`/api/subjects/${subjectId}/flashcards`);
    expect(response.status()).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_FOUND");
    await page.goto(`/emner/${subjectId}/flashcards`);
    await expect(page.locator("main h1")).toHaveText("Fant ikke siden");
  });

  test("AR-9: med nettleserens klokke 5 minutter foran sender økten varighet, ikke klokkeslett, og serveren svarer 204", async ({
    page,
  }) => {
    const subjectId = await subjectWithTwoLectures(page);
    await page.clock.setSystemTime(new Date(Date.now() + 5 * 60_000));
    const saves = captureSaves(page);
    await page.goto(`/emner/${subjectId}/flashcards`);
    await expect(panel(page).getByText("/ 5")).toBeVisible();
    await page.getByRole("button", { name: "Snu kortet" }).click();
    await page.getByRole("button", { name: "Kunne", exact: true }).click();
    const saved = page.waitForResponse((response) => new URL(response.url()).pathname === SAVE_PATH);
    await panel(page).getByRole("button", { name: "Avslutt økt" }).click();
    expect((await saved).status()).toBe(204);
    const body = saves[0].postDataJSON();
    expect(body).not.toHaveProperty("started_at");
    expect(body.duration_seconds).toBeGreaterThanOrEqual(0);
    expect(body.duration_seconds).toBeLessThan(120);
  });
});
