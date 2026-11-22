import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page, type Request } from "@playwright/test";

import { makePdf } from "./pdf";

// Story 3.5: the session is saved exactly once, and the result page (mockup 08).

const PASSWORD = "hemmelig1";
const SAVE_PATH = "/api/practice-sessions";

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

// A new, logged-in student with a lecture of three cards from the mock model.
async function lectureWithThreeCards(page: Page): Promise<{ subjectId: string; lectureId: string }> {
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
  const lectureId = (await lecture.json()).id;
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
  return { subjectId, lectureId };
}

// Every POST /api/practice-sessions the page sends.
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

async function mark(page: Page, value: "Kunne" | "Kunne ikke") {
  await page.getByRole("button", { name: "Snu kortet" }).click();
  await page.getByRole("button", { name: value, exact: true }).click();
}

// The first card «Kunne ikke», the others «Kunne», and the first again «Kunne».
async function finishWithOneMissed(page: Page): Promise<string> {
  const missed = (await front(page).textContent())!;
  await mark(page, "Kunne ikke");
  for (let i = 0; i < 3; i += 1) await mark(page, "Kunne");
  return missed;
}

test.describe("Lagre økten og se resultatet (story 3.5)", () => {
  test("FR-26, FR-56, UX-DR8, UX-DR34: ferdig økt lagres én gang og viser resultatsiden uten axe-brudd på 1280 og 768 px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const { subjectId, lectureId } = await lectureWithThreeCards(page);
    const saves = captureSaves(page);
    await page.goto(`/forelesninger/${lectureId}/flashcards`);
    await expect(panel(page).getByText("/ 3")).toBeVisible();

    const saved = page.waitForResponse((response) => new URL(response.url()).pathname === SAVE_PATH);
    const missed = await finishWithOneMissed(page);
    expect((await saved).status()).toBe(204);

    const title = page.getByRole("heading", { level: 2, name: "Du har gått gjennom alle 3 kortene" });
    await expect(title).toBeFocused();
    await expect(page.getByText("ØKT FERDIG")).toBeVisible();
    await expect(page.getByText("Uke 37: Merkevare · kortene du ikke kunne, ble repetert til slutt i økten")).toBeVisible();
    const fields = page.locator('[data-slot="result-field"]');
    await expect(fields.nth(0)).toContainText("Kunne");
    await expect(fields.nth(0)).toContainText("67 % av kortene");
    await expect(fields.nth(0)).toContainText("2");
    await expect(fields.nth(1)).toContainText("Kunne ikke");
    await expect(fields.nth(1)).toContainText("Repetert til slutt i økten");
    await expect(fields.nth(1)).toContainText("1");
    const missedList = page.getByRole("region", { name: "Kortene du ikke kunne" });
    await expect(missedList.getByText("1 kort")).toBeVisible();
    await expect(missedList.getByRole("listitem")).toHaveCount(1);
    await expect(missedList.getByRole("listitem")).toContainText(missed);
    await expect(missedList.locator('[data-slot="source-link"]')).toHaveText(/^definisjoner\.pdf, side [12]$/);
    await expect(panel(page).getByText("Økten er ferdig og lagret")).toBeVisible();
    await expect(panel(page).getByRole("button", { name: "Avslutt økt" })).toHaveCount(0);
    await expect(page.getByRole("list", { name: "Hurtigtaster" })).toContainText("Enter øv igjen");
    await expect(page.getByRole("button", { name: "Øv igjen" })).toBeVisible();
    await expectNoAxeViolations(page);

    expect(saves).toHaveLength(1);
    expect(saves[0].postDataJSON()).toMatchObject({
      subject_id: subjectId,
      lecture_id: lectureId,
      kind: "flashcards",
      aborted: false,
      shown: 3,
      answered: 3,
      correct: 2,
      wrong: 1,
    });
    expect(saves[0].postDataJSON()).not.toHaveProperty("started_at");

    await page.setViewportSize({ width: 768, height: 900 });
    await expect(title).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoAxeViolations(page);

    // Leaving the result page sends nothing more.
    await page.getByRole("link", { name: "Tilbake til forelesningen" }).click();
    await expect(page).toHaveURL(`/forelesninger/${lectureId}`);
    expect(saves).toHaveLength(1);
  });

  test("UX-DR33, FR-56: «Avslutt økt» etter en markering lagrer som avbrutt og viser «Avbrutt etter 1 av 3»", async ({ page }) => {
    const { lectureId } = await lectureWithThreeCards(page);
    const saves = captureSaves(page);
    await page.goto(`/forelesninger/${lectureId}/flashcards`);
    await mark(page, "Kunne");
    const saved = page.waitForResponse((response) => new URL(response.url()).pathname === SAVE_PATH);
    await panel(page).getByRole("button", { name: "Avslutt økt" }).click();
    expect((await saved).status()).toBe(204);

    await expect(page.getByRole("heading", { level: 2, name: "Avbrutt etter 1 av 3" })).toBeFocused();
    await expect(page).toHaveURL(`/forelesninger/${lectureId}/flashcards`);
    await expect(panel(page).getByText(/Repeterer/)).toHaveCount(0);
    await expect(panel(page).getByRole("button", { name: "Avslutt økt" })).toHaveCount(0);
    await expect(panel(page).getByRole("listitem").filter({ hasText: /^Kunne ikke$/ })).toHaveCount(1);
    await expect(page.getByRole("region", { name: "Kortene du ikke kunne" })).toHaveCount(0);
    await expectNoAxeViolations(page);
    expect(saves.map((request) => request.postDataJSON())).toEqual([
      expect.objectContaining({ aborted: true, answered: 1, correct: 1, wrong: 0 }),
    ]);

    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(`/forelesninger/${lectureId}`);
    expect(saves).toHaveLength(1);
  });

  test("UX-DR10, UX-DR33: på 768 px lukkes panelet når «Avslutt økt» trykkes i det, og fokus går til resultatet", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    const { lectureId } = await lectureWithThreeCards(page);
    await page.goto(`/forelesninger/${lectureId}/flashcards`);
    await mark(page, "Kunne");
    await page.getByRole("button", { name: "Meny" }).click();
    const sheet = page.getByRole("dialog", { name: "Flashcards" });
    await sheet.getByRole("button", { name: "Avslutt økt" }).click();

    await expect(sheet).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 2, name: "Avbrutt etter 1 av 3" })).toBeFocused();
    await expectNoHorizontalScroll(page);
    await expectNoAxeViolations(page);
  });

  test("UX-DR33: «Avslutt økt» og Esc uten markerte kort går rett tilbake og lagrer ingenting", async ({ page }) => {
    const { lectureId } = await lectureWithThreeCards(page);
    const saves = captureSaves(page);
    await page.goto(`/forelesninger/${lectureId}/flashcards`);
    await page.getByRole("button", { name: "Snu kortet" }).click();
    await panel(page).getByRole("button", { name: "Avslutt økt" }).click();
    await expect(page).toHaveURL(`/forelesninger/${lectureId}`);

    await page.goto(`/forelesninger/${lectureId}/flashcards`);
    await expect(panel(page).getByText("/ 3")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(`/forelesninger/${lectureId}`);
    expect(saves).toHaveLength(0);
  });

  test("FR-56: å gå til en annen side i appen etter en markering lagrer økten som avbrutt", async ({ page }) => {
    const { lectureId } = await lectureWithThreeCards(page);
    const saves = captureSaves(page);
    await page.goto(`/forelesninger/${lectureId}/flashcards`);
    await mark(page, "Kunne ikke");
    const saved = page.waitForRequest((request) => new URL(request.url()).pathname === SAVE_PATH);
    await page.locator('header a[href="/"]').click();
    await expect(page).toHaveURL("/");
    expect((await saved).postDataJSON()).toMatchObject({ aborted: true, answered: 1, wrong: 1 });
    expect(saves).toHaveLength(1);
  });

  test("UX-DR35, SK-20: Enter på resultatsiden starter en ny økt med ny session_id", async ({ page }) => {
    const { lectureId } = await lectureWithThreeCards(page);
    const saves = captureSaves(page);
    await page.goto(`/forelesninger/${lectureId}/flashcards`);
    await finishWithOneMissed(page);
    await expect(page.getByRole("heading", { level: 2, name: "Du har gått gjennom alle 3 kortene" })).toBeFocused();
    await expect.poll(() => saves.length).toBe(1);

    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Snu kortet" })).toBeFocused();
    await expect(panel(page).getByText("Kunne 0 · Kunne ikke 0")).toBeVisible();
    await expect(panel(page).getByRole("button", { name: "Avslutt økt" })).toBeVisible();

    await mark(page, "Kunne");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { level: 2, name: "Avbrutt etter 1 av 3" })).toBeVisible();
    await expect.poll(() => saves.length).toBe(2);
    const [first, second] = saves.map((request) => request.postDataJSON());
    expect(second.session_id).not.toBe(first.session_id);
    expect(second).toMatchObject({ aborted: true, answered: 1 });
  });

  test("FR-56: «Logg ut» venter til økten er lagret før utloggingen", async ({ page }) => {
    const { lectureId } = await lectureWithThreeCards(page);
    const order: string[] = [];
    // A slow save: logging out must wait for it.
    await page.route(`**${SAVE_PATH}`, async (route) => {
      order.push("lagring startet");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
      order.push("lagring ferdig");
    });
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/identity/logout") order.push("logg ut");
    });
    await page.goto(`/forelesninger/${lectureId}/flashcards`);
    await mark(page, "Kunne");
    await page.getByRole("button", { name: "Logg ut" }).click();
    await expect(page).toHaveURL("/logg-inn");
    expect(order).toEqual(["lagring startet", "lagring ferdig", "logg ut"]);
  });

  test("SK-20: samme session_id sendt to ganger gir 204 begge ganger (ON CONFLICT DO NOTHING på Postgres)", async ({ page }) => {
    const { subjectId, lectureId } = await lectureWithThreeCards(page);
    const body = {
      session_id: crypto.randomUUID(),
      subject_id: subjectId,
      lecture_id: lectureId,
      kind: "flashcards",
      aborted: false,
      shown: 3,
      answered: 3,
      correct: 2,
      partial: 0,
      wrong: 1,
      duration_seconds: 60,
    };
    const first = await page.request.post(SAVE_PATH, { data: body });
    expect(first.status()).toBe(204);
    // The beacon's way: the same body as text/plain.
    const second = await page.request.post(SAVE_PATH, {
      data: JSON.stringify({ ...body, aborted: true }),
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
    });
    expect(second.status()).toBe(204);
  });
});
