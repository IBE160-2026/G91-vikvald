import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { makePdf } from "./pdf";

const PASSWORD = "hemmelig1";
const NOTHING_MADE = "Notatene ga ikke grunnlag for flashcards. Ingenting er lagret.";

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

async function uploadDefinitions(page: Page, lectureId: string) {
  // Three definition sentences (the mock model makes one card per sentence).
  const pages = ["Merkevare er et navn som skiller et produkt fra andre. Pris er det kunden betaler.", "Segment er en gruppe kunder."];
  const response = await page.request.post(`/api/lectures/${lectureId}/files`, {
    multipart: { file: { name: "definisjoner.pdf", mimeType: "application/pdf", buffer: makePdf({ pages }) } },
  });
  expect(response.status()).toBe(201);
}

function createSection(page: Page): Locator {
  return page.getByRole("region", { name: "Lag og øv" });
}

test.describe("Flashcards (story 3.1)", () => {
  test("FR-38: «Lag flashcards» med tastaturet gir «Lager flashcards …», så «3 kort» og «Øv nå» uten omlasting", async ({
    page,
  }) => {
    const lectureId = await newLecture(page);
    await uploadDefinitions(page, lectureId);
    await page.goto(`/forelesninger/${lectureId}`);
    const section = createSection(page);
    await expect(section.getByRole("heading", { level: 2, name: "Lag og øv" })).toBeVisible();
    await expect(section.getByText("Ingen ennå")).toBeVisible();
    const create = section.getByRole("button", { name: "Lag flashcards" });
    await expect(create).toBeEnabled();
    await expectNoAxeViolations(page);

    await tabTo(page, create);
    await page.keyboard.press("Enter");
    await expect(section.getByText("Lager flashcards …")).toBeVisible();
    await expect(section.getByText("3 kort", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(section.getByRole("button", { name: "Øv nå" })).toBeVisible();
    await expect(section.getByRole("status")).toHaveText("Flashcardene er ferdige: 3 kort i Uke 37: Merkevare.");
    await expectNoAxeViolations(page);

    // «Lag flere» with the same file makes nothing new.
    await section.getByRole("button", { name: "Lag flere" }).click();
    await expect(section.getByText(NOTHING_MADE, { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await expect(section.getByRole("status")).toHaveText(NOTHING_MADE);
    await expect(section.getByText("3 kort", { exact: true })).toBeVisible();
  });

  test("UX-DR18: uten filer er «Lag flashcards» ikke aktiv, og «Last opp notater først.» står under", async ({ page }) => {
    const lectureId = await newLecture(page);
    await page.goto(`/forelesninger/${lectureId}`);
    const section = createSection(page);
    await expect(section.getByText("Last opp notater først.")).toBeVisible();
    await expect(section.getByRole("button", { name: "Lag flashcards" })).toBeDisabled();
    await expectNoAxeViolations(page);
  });

  test("UX-DR19: mens jobben pågår, står job-status i raden, og axe finner ingen brudd", async ({ page }) => {
    const lectureId = await newLecture(page);
    await uploadDefinitions(page, lectureId);
    // The latest job is held as running, so the state can be checked.
    await page.route("**/api/lectures/*/jobs/latest", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "00000000-0000-0000-0000-000000000001",
            lecture_id: lectureId,
            kind: "flashcards",
            status: "running",
            requested: 20,
            created: null,
            discarded: null,
            error_code: null,
            started_at: "2026-11-21T10:00:00Z",
            finished_at: null,
          },
        ]),
      }),
    );
    await page.goto(`/forelesninger/${lectureId}`);
    const section = createSection(page);
    await expect(section.getByText("Lager flashcards …")).toBeVisible();
    await expect(section.getByText("Du kan bruke resten av appen imens.")).toBeVisible();
    await expect(section.getByRole("button")).toHaveCount(0);
    await expectNoAxeViolations(page);
  });
});
