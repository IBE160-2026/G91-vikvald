import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { makePdf } from "./pdf";

// Story 5.5: the semester line on the front page (02), the subject page (03)
// and the lecture page (04), FR-57, SK-22, UX-DR11, E4 and E6. It replaces the
// exam text lines from story 5.3. The browser's clock and time zone are set, so
// the expected text never depends on when the test runs.

const PASSWORD = "hemmelig1";
const SAVE_PATH = "/api/practice-sessions";

// Tuesday 10.11.2026 at noon in Oslo, as in mockup 02: 24 days to 04.12.
const TODAY = new Date("2026-11-10T12:00:00+01:00");

test.use({ timezoneId: "Europe/Oslo" });

function uniqueEmail(): string {
  return `klara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@eksempel.no`;
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

type Setup = { marketing: string; economics: string; first: string; second: string };

// A new, logged-in student with two subjects: Markedsføring (exam 04.12) with
// Uke 37 (three cards from the mock model) and Uke 38 (no files), and
// Samfunnsøkonomi (exam 11.12) without lectures.
async function twoSubjects(page: Page): Promise<Setup> {
  const register = await page.request.post("/api/identity/register", {
    data: { email: uniqueEmail(), password: PASSWORD },
  });
  expect(register.status()).toBe(201);
  expect((await page.request.post("/api/identity/terms")).status()).toBe(200);
  const subject = async (name: string, examDate: string) =>
    (await (await page.request.post("/api/subjects", { data: { name, exam_date: examDate } })).json()).id as string;
  const marketing = await subject("Markedsføring", "2026-12-04");
  const economics = await subject("Samfunnsøkonomi", "2026-12-11");
  const lecture = async (name: string, date: string) =>
    (await (await page.request.post(`/api/subjects/${marketing}/lectures`, { data: { name, date } })).json())
      .id as string;
  const first = await lecture("Uke 37: Merkevare", "2026-09-11");
  const second = await lecture("Uke 38: Pris", "2026-09-18");
  const pages = ["Merkevare er et navn som skiller et produkt fra andre. Pris er det kunden betaler.", "Segment er en gruppe kunder."];
  const upload = await page.request.post(`/api/lectures/${first}/files`, {
    multipart: { file: { name: "definisjoner.pdf", mimeType: "application/pdf", buffer: makePdf({ pages }) } },
  });
  expect(upload.status()).toBe(201);
  const start = await page.request.post(`/api/lectures/${first}/jobs`, {
    data: { kind: "flashcards", params: { requested: 10 } },
  });
  expect(start.status()).toBe(202);
  await expect
    .poll(async () => (await (await page.request.get(`/api/lectures/${first}/content-counts`)).json()).flashcards, {
      timeout: 10_000,
    })
    .toBe(3);
  return { marketing, economics, first, second };
}

const MARKETING_SR = (practised: number) =>
  `Markedsføring: ${practised} av 2 forelesninger øvd. Eksamen fredag 04.12, om 3 uker.`;
const ECONOMICS_SR = "Samfunnsøkonomi: Ingen forelesninger ennå. Eksamen fredag 11.12, om 4 uker.";

// The card «Semesterlinje» on the page.
function timeline(page: Page): Locator {
  return page.getByRole("region", { name: "Semesterlinje" });
}

// The hidden graphic inside the card.
function graphic(page: Page): Locator {
  return timeline(page).locator('[aria-hidden="true"]');
}

function station(page: Page, lectureId: string): Locator {
  return graphic(page).locator(`[data-station="${lectureId}"]`);
}

// No horizontal scrolling on the page or in its main area.
async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const main = document.querySelector("main");
    return {
      root: root.scrollWidth - root.clientWidth,
      main: main ? main.scrollWidth - main.clientWidth : 0,
    };
  });
  expect(overflow.root).toBeLessThanOrEqual(0);
  expect(overflow.main).toBeLessThanOrEqual(0);
}

// «I dag» and the `count` exam markers (one per subject) lie inside the window.
async function expectTodayAndExamVisible(page: Page, width: number, count: number) {
  const today = graphic(page).getByText("I dag 10.11", { exact: true });
  await expect(today).toBeVisible();
  const exams = graphic(page).locator('[data-part="exam"]');
  await expect(exams).toHaveCount(count);
  for (let i = 0; i < count; i += 1) {
    await expect(exams.nth(i)).toBeVisible();
    const box = await exams.nth(i).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  }
  const pill = await today.boundingBox();
  expect(pill!.x).toBeGreaterThanOrEqual(0);
  expect(pill!.x + pill!.width).toBeLessThanOrEqual(width);
}

test.describe("Semesterlinja (story 5.5)", () => {
  test("FR-57, SK-22, UX-DR11: 02 viser linja for begge emner, og etter en økt er stasjonen fylt på 03 og 02 uten omlasting", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const { marketing, first, second } = await twoSubjects(page);
    await page.clock.setSystemTime(TODAY);

    await page.goto("/");
    // Set once; a reload would remove it.
    await page.evaluate(() => {
      (window as unknown as { notReloaded: boolean }).notReloaded = true;
    });
    await expect(timeline(page).getByRole("listitem")).toHaveText([MARKETING_SR(0), ECONOMICS_SR]);
    await expect(graphic(page).getByText("Eksamen 04.12 · om 3 uker", { exact: true })).toBeVisible();
    await expect(graphic(page).getByText("2 forelesninger", { exact: true })).toBeVisible();
    await expect(graphic(page).getByText("Eksamen 11.12 · om 4 uker", { exact: true })).toBeVisible();
    await expect(graphic(page).getByText("Ingen forelesninger ennå", { exact: true })).toBeVisible();
    await expect(station(page, first)).toHaveAttribute("data-practiced", "false");
    await expect(station(page, second)).toHaveAttribute("data-practiced", "false");
    // The months from 01.09 (first lecture) to 31.12 (exams).
    for (const month of ["SEP", "OKT", "NOV", "DES"]) await expect(graphic(page).getByText(month, { exact: true })).toBeVisible();
    // The line stands between the subtitle and the subject cards, and the 5.3 text lines are gone.
    await expect(page.getByText(/^Eksamen \d\d\.\d\d, om/)).toHaveCount(0);
    const cardsTop = (await page.locator("main ul:not(.sr-only)").boundingBox())!.y;
    const lineBox = (await timeline(page).boundingBox())!;
    expect(lineBox.y + lineBox.height).toBeLessThanOrEqual(cardsTop);

    await page.getByRole("link", { name: "Åpne Markedsføring" }).click();
    await expect(page).toHaveURL(`/emner/${marketing}`);
    await expect(timeline(page).getByRole("listitem")).toHaveText([MARKETING_SR(0)]);

    // A flashcard session over the whole subject: it counts for Uke 37 (cards), not Uke 38 (no files).
    await page.getByRole("link", { name: "Øv på flashcards" }).click();
    await expect(page).toHaveURL(`/emner/${marketing}/flashcards`);
    const saved = page.waitForResponse((response) => new URL(response.url()).pathname === SAVE_PATH);
    for (let i = 0; i < 3; i += 1) {
      await page.getByRole("button", { name: "Snu kortet" }).click();
      await page.getByRole("button", { name: "Kunne", exact: true }).click();
    }
    expect((await saved).status()).toBe(204);

    await page.getByRole("link", { name: "Tilbake til emnet" }).click();
    await expect(page).toHaveURL(`/emner/${marketing}`);
    await expect(timeline(page).getByRole("listitem")).toHaveText([MARKETING_SR(1)]);
    await expect(station(page, first)).toHaveAttribute("data-practiced", "true");
    await expect(station(page, second)).toHaveAttribute("data-practiced", "false");

    await page.getByRole("link", { name: "Studiekamerat" }).click();
    await expect(page).toHaveURL("/");
    await expect(timeline(page).getByRole("listitem")).toHaveText([MARKETING_SR(1), ECONOMICS_SR]);
    await expect(station(page, first)).toHaveAttribute("data-practiced", "true");

    expect(await page.evaluate(() => (window as unknown as { notReloaded?: boolean }).notReloaded)).toBe(true);
  });

  test("UX-DR11: 03 viser bare emnet, med ukenummer og dato under stasjonene og «Eksamen» under firkanten", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const { marketing, economics } = await twoSubjects(page);
    await page.clock.setSystemTime(TODAY);
    await page.goto(`/emner/${marketing}`);
    await expect(timeline(page).getByRole("listitem")).toHaveText([MARKETING_SR(0)]);
    // The labels under the stations and the exam square (SVG text).
    const labels = graphic(page).locator("svg text");
    for (const label of ["37", "11.09", "Eksamen", "04.12"]) {
      await expect(labels.getByText(label, { exact: true })).toBeVisible();
    }
    // Uke 38 lies 7 days (about 34 px on this track) after Uke 37: its labels are
    // thinned out so they do not overlap, but the station stands.
    await expect(labels.getByText("38", { exact: true })).toHaveCount(0);
    await expect(labels.getByText("18.09", { exact: true })).toHaveCount(0);
    await expect(graphic(page).locator("[data-station]")).toHaveCount(2);
    await expect(graphic(page).getByText("Samfunnsøkonomi", { exact: true })).toHaveCount(0);

    // E6: without lectures, no stations and «Ingen forelesninger ennå».
    await page.goto(`/emner/${economics}`);
    await expect(timeline(page).getByRole("listitem")).toHaveText([ECONOMICS_SR]);
    await expect(graphic(page).locator("[data-station]")).toHaveCount(0);
    await expect(graphic(page).locator('[data-part="dashed"]')).toHaveCount(1);
  });

  test("UX-DR11: 04 viser emnet med «Du er her» ved forelesningen som er åpen", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const { first, second } = await twoSubjects(page);
    await page.clock.setSystemTime(TODAY);
    await page.goto(`/forelesninger/${second}`);
    await expect(timeline(page).getByRole("listitem")).toHaveText([MARKETING_SR(0)]);
    await expect(graphic(page).getByText("Du er her", { exact: true })).toBeVisible();
    await expect(graphic(page).locator('[data-part="current"]')).toHaveCount(1);
    await expect(station(page, second).locator('[data-part="current"]')).toHaveCount(1);
    await expect(station(page, first).locator('[data-part="current"]')).toHaveCount(0);
    await expect(graphic(page).getByText("I dag 10.11", { exact: true })).toBeVisible();
  });

  for (const width of [1280, 768]) {
    test(`UX-DR11: ingen vannrett rulling, «I dag» og eksamen synes, Tab går forbi linja, og ingen axe-brudd på 02, 03 og 04, ${width} px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const { marketing, first } = await twoSubjects(page);
      await page.clock.setSystemTime(TODAY);

      await page.goto("/");
      await expect(timeline(page).getByRole("listitem")).toHaveText([MARKETING_SR(0), ECONOMICS_SR]);
      await expectNoHorizontalScroll(page);
      await expectTodayAndExamVisible(page, width, 2);
      await expectNoAxeViolations(page);
      // From «Nytt emne» (before the line) Tab goes straight to the first subject card.
      await page.getByRole("button", { name: "Nytt emne" }).focus();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: "Åpne Markedsføring" })).toBeFocused();

      await page.goto(`/emner/${marketing}`);
      await expect(timeline(page).getByRole("listitem")).toHaveText([MARKETING_SR(0)]);
      await expectNoHorizontalScroll(page);
      await expectTodayAndExamVisible(page, width, 1);
      await expectNoAxeViolations(page);
      // From «Slett emnet» (before the line) Tab goes straight to the first lecture in the table.
      await page.getByRole("button", { name: "Slett emnet" }).focus();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("table").getByRole("link", { name: "Uke 37: Merkevare" })).toBeFocused();
      expect(await timeline(page).evaluate((element) => element.contains(document.activeElement))).toBe(false);
      await expect(page.locator(":focus")).toHaveCount(1);

      await page.goto(`/forelesninger/${first}`);
      await expect(graphic(page).getByText("Du er her", { exact: true })).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectTodayAndExamVisible(page, width, 1);
      await expectNoAxeViolations(page);
      // From «Slett forelesningen» (before the line) Tab goes straight to «Erstatt» on the first file.
      await page.getByRole("button", { name: "Slett forelesningen" }).focus();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Erstatt definisjoner.pdf" })).toBeFocused();
      expect(await timeline(page).evaluate((element) => element.contains(document.activeElement))).toBe(false);
      await expect(page.locator(":focus")).toHaveCount(1);
    });
  }

  // 200 % zoom of a 1280 px window gives 640 CSS px (NFR-14: 200 % text).
  test("UX-DR11: ved 200 % zoom (640 px) er det ingen vannrett rulling, og «I dag» og eksamen synes på 02, 03 og 04", async ({
    page,
  }) => {
    const width = 640;
    await page.setViewportSize({ width, height: 900 });
    const { marketing, first } = await twoSubjects(page);
    await page.clock.setSystemTime(TODAY);

    await page.goto("/");
    await expect(timeline(page).getByRole("listitem")).toHaveText([MARKETING_SR(0), ECONOMICS_SR]);
    await expectNoHorizontalScroll(page);
    await expectTodayAndExamVisible(page, width, 2);

    await page.goto(`/emner/${marketing}`);
    await expect(timeline(page).getByRole("listitem")).toHaveText([MARKETING_SR(0)]);
    await expectNoHorizontalScroll(page);
    await expectTodayAndExamVisible(page, width, 1);

    await page.goto(`/forelesninger/${first}`);
    await expect(graphic(page).getByText("Du er her", { exact: true })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectTodayAndExamVisible(page, width, 1);
  });
});
