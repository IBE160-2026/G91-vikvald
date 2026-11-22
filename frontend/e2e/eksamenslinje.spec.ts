import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { makePdf } from "./pdf";

// Story 5.3: the exam line «Eksamen 04.12, om 3 uker · 4 av 8 forelesninger øvd»
// per subject on the front page (02) and under the heading on the subject page
// (03), FR-57 and SK-22. The browser's clock and time zone are set, so the
// expected text never depends on when the test runs.

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

type Setup = { marketing: string; economics: string };

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
  await lecture("Uke 38: Pris", "2026-09-18");
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
  return { marketing, economics };
}

// The exam line on 02: the list item (role="listitem") with the subject's name.
function homeLine(page: Page, name: string) {
  return page.getByRole("listitem").filter({ has: page.getByText(name, { exact: true }) }).filter({ hasText: "Eksamen " });
}

test.describe("Eksamenslinja (story 5.3)", () => {
  test("SK-22, FR-57: 02 og 03 viser «Eksamen 04.12, om 3 uker · 0 av 2 forelesninger øvd», og etter en økt «1 av 2» uten omlasting", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const { marketing } = await twoSubjects(page);
    await page.clock.setSystemTime(TODAY);

    await page.goto("/");
    // Set once; a reload would remove it.
    await page.evaluate(() => {
      (window as unknown as { notReloaded: boolean }).notReloaded = true;
    });
    await expect(
      homeLine(page, "Markedsføring").getByText("Eksamen 04.12, om 3 uker · 0 av 2 forelesninger øvd", { exact: true }),
    ).toBeVisible();
    await expect(
      homeLine(page, "Samfunnsøkonomi").getByText("Eksamen 11.12, om 4 uker · Ingen forelesninger ennå", { exact: true }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Markedsføring" }).click();
    await expect(page).toHaveURL(`/emner/${marketing}`);
    await expect(page.getByText("Eksamen 04.12, om 3 uker · 0 av 2 forelesninger øvd", { exact: true })).toBeVisible();
    await expect(page.getByText("2 forelesninger · 1 fil · eksamen fredag 04.12.2026", { exact: true })).toBeVisible();

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
    await expect(page.getByText("Eksamen 04.12, om 3 uker · 1 av 2 forelesninger øvd", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Studiekamerat" }).click();
    await expect(page).toHaveURL("/");
    await expect(
      homeLine(page, "Markedsføring").getByText("Eksamen 04.12, om 3 uker · 1 av 2 forelesninger øvd", { exact: true }),
    ).toBeVisible();

    expect(await page.evaluate(() => (window as unknown as { notReloaded?: boolean }).notReloaded)).toBe(true);
  });

  test("FR-57: emne uten forelesninger viser «Ingen forelesninger ennå» på 03", async ({ page }) => {
    const { economics } = await twoSubjects(page);
    await page.clock.setSystemTime(TODAY);
    await page.goto(`/emner/${economics}`);
    await expect(page.getByText("Eksamen 11.12, om 4 uker · Ingen forelesninger ennå", { exact: true })).toBeVisible();
  });

  for (const width of [1280, 768]) {
    test(`FR-57, SK-22: ingen axe-brudd på 02 og 03 med eksamenslinja, ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const { marketing } = await twoSubjects(page);
      await page.clock.setSystemTime(TODAY);

      await page.goto("/");
      await expect(page.getByText("Eksamen 04.12, om 3 uker · 0 av 2 forelesninger øvd", { exact: true })).toBeVisible();
      await expectNoAxeViolations(page);

      await page.goto(`/emner/${marketing}`);
      await expect(page.getByText("Eksamen 04.12, om 3 uker · 0 av 2 forelesninger øvd", { exact: true })).toBeVisible();
      await expectNoAxeViolations(page);
    });
  }
});
