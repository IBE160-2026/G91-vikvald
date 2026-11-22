import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { formatDayMonth } from "../lib/dates";
import { makePdf } from "./pdf";

// Story 5.1: «øvd» worked out by the server, shown as status dots in the
// sidebar (UX-DR7) and as SISTE ØKT in «Øv på hele emnet» (UX-DR14).

const PASSWORD = "hemmelig1";
const SAVE_PATH = "/api/practice-sessions";

function uniqueEmail(): string {
  return `klara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@eksempel.no`;
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

type Setup = { subjectId: string; first: string; second: string };

// A new, logged-in student with two lectures: Uke 37 with three cards from the
// mock model, Uke 38 without files.
async function subjectWithCards(page: Page): Promise<Setup> {
  const register = await page.request.post("/api/identity/register", {
    data: { email: uniqueEmail(), password: PASSWORD },
  });
  expect(register.status()).toBe(201);
  expect((await page.request.post("/api/identity/terms")).status()).toBe(200);
  const subject = await page.request.post("/api/subjects", { data: { name: "Markedsføring", exam_date: "2026-12-04" } });
  const subjectId = (await subject.json()).id;
  const lecture = async (name: string, date: string) =>
    (await (await page.request.post(`/api/subjects/${subjectId}/lectures`, { data: { name, date } })).json()).id as string;
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
  return { subjectId, first, second };
}

function nav(page: Page): Locator {
  return page.getByRole("navigation", { name: "Emner" });
}

function lectureLink(page: Page, lectureId: string): Locator {
  return nav(page).locator(`a[href="/forelesninger/${lectureId}"]`);
}

function practiceCard(page: Page): Locator {
  return page.getByRole("region", { name: "Øv på hele emnet" });
}

async function mark(page: Page, value: "Kunne" | "Kunne ikke") {
  await page.getByRole("button", { name: "Snu kortet" }).click();
  await page.getByRole("button", { name: value, exact: true }).click();
}

test.describe("«Øvd» i sidemenyen og SISTE ØKT (story 5.1)", () => {
  test("FR-56, UX-DR7, UX-DR14: etter en økt viser sidemenyen «Øvd» og emnesiden SISTE ØKT uten omlasting", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const { subjectId, first, second } = await subjectWithCards(page);
    await page.goto(`/forelesninger/${first}/flashcards`);
    // Set once; a reload would remove it.
    await page.evaluate(() => {
      (window as unknown as { notReloaded: boolean }).notReloaded = true;
    });

    const saved = page.waitForResponse((response) => new URL(response.url()).pathname === SAVE_PATH);
    // The first card «Kunne ikke», the others «Kunne», the first again «Kunne».
    await mark(page, "Kunne ikke");
    for (let i = 0; i < 3; i += 1) await mark(page, "Kunne");
    expect((await saved).status()).toBe(204);
    const today = formatDayMonth(new Date().toISOString());

    await page.getByRole("link", { name: "Tilbake til forelesningen" }).click();
    await expect(page).toHaveURL(`/forelesninger/${first}`);
    await expect(lectureLink(page, first)).toHaveAccessibleName("Uke 37: Merkevare Øvd");

    await nav(page).getByRole("link", { name: "Markedsføring" }).click();
    await expect(page).toHaveURL(`/emner/${subjectId}`);

    const practised = lectureLink(page, first);
    await expect(practised).toHaveAccessibleName("Uke 37: Merkevare Øvd");
    await expect(practised.getByRole("img", { name: "Øvd" })).toHaveAttribute("data-status", "practised");
    const open = lectureLink(page, second);
    await expect(open).toHaveAccessibleName("Uke 38: Pris Ikke øvd ennå");
    await expect(open.getByRole("img", { name: "Ikke øvd ennå" })).toHaveAttribute("data-status", "not-practised");

    const card = practiceCard(page);
    await expect(card.getByRole("heading", { level: 3, name: "Siste økt" })).toBeAttached();
    await expect(card.getByText("SISTE ØKT", { exact: true })).toBeVisible();
    await expect(card.getByText("Flashcards · Uke 37: Merkevare")).toBeVisible();
    await expect(card.getByText(`${today} · Kunne 2 av 3`)).toBeVisible();

    expect(await page.evaluate(() => (window as unknown as { notReloaded?: boolean }).notReloaded)).toBe(true);
  });

  test("FR-56, UX-DR14: en emneøkt gir «Hele emnet» i SISTE ØKT", async ({ page }) => {
    const { subjectId, first } = await subjectWithCards(page);
    const body = {
      session_id: crypto.randomUUID(),
      subject_id: subjectId,
      lecture_id: null,
      kind: "quiz",
      aborted: true,
      shown: 3,
      answered: 2,
      correct: 1,
      partial: 0,
      wrong: 1,
      duration_seconds: 0,
    };
    expect((await page.request.post(SAVE_PATH, { data: body })).status()).toBe(204);

    await page.goto(`/emner/${subjectId}`);
    const card = practiceCard(page);
    await expect(card.getByText("Quiz · Hele emnet")).toBeVisible();
    await expect(card.getByText(`${formatDayMonth(new Date().toISOString())} · Avbrutt · 1 av 2 riktige`)).toBeVisible();
    // A quiz over the whole subject counts only for lectures with quiz
    // questions; Uke 37 has only cards.
    await expect(lectureLink(page, first)).toHaveAccessibleName("Uke 37: Merkevare Ikke øvd ennå");
  });

  test("FR-56, UX-DR14: uten økter finnes ingen SISTE ØKT, og alle prikker heter «Ikke øvd ennå»", async ({ page }) => {
    const { subjectId } = await subjectWithCards(page);
    const overview = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/overview");
    await page.goto(`/emner/${subjectId}`);
    expect((await overview).status()).toBe(200);
    await expect(practiceCard(page).getByRole("heading", { level: 3, name: "Flashcards" })).toBeVisible();
    await expect(nav(page).getByRole("img")).toHaveCount(2);
    await expect(nav(page).getByRole("img", { name: "Ikke øvd ennå", exact: true })).toHaveCount(2);
    await expect(practiceCard(page).getByRole("heading", { name: "Siste økt" })).toHaveCount(0);
    await expect(practiceCard(page).getByText("SISTE ØKT", { exact: true })).toHaveCount(0);
  });

  for (const width of [1280, 768]) {
    test(`UX-DR7, UX-DR14: ingen axe-brudd på 03, 04 og 15 med prikkene, ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const { subjectId, first } = await subjectWithCards(page);
      const body = {
        session_id: crypto.randomUUID(),
        subject_id: subjectId,
        lecture_id: first,
        kind: "flashcards",
        aborted: false,
        shown: 3,
        answered: 3,
        correct: 2,
        partial: 0,
        wrong: 1,
        duration_seconds: 60,
      };
      expect((await page.request.post(SAVE_PATH, { data: body })).status()).toBe(204);

      // On a narrow screen the sidebar is behind «Meny»; open it so axe sees the dots.
      async function openMenu() {
        if (width < 1024) {
          await page.getByRole("button", { name: "Meny" }).click();
        }
        await expect(lectureLink(page, first).getByRole("img", { name: "Øvd" })).toBeVisible();
      }

      await page.goto(`/emner/${subjectId}`);
      await expect(practiceCard(page).getByText("Flashcards · Uke 37: Merkevare")).toBeVisible();
      await expectNoAxeViolations(page);
      await openMenu();
      await expectNoAxeViolations(page);

      await page.goto(`/forelesninger/${first}`);
      await expect(page.locator("main h1")).toHaveText("Uke 37: Merkevare");
      await openMenu();
      await expectNoAxeViolations(page);

      await page.goto("/konto");
      await expect(page.getByRole("heading", { level: 1, name: "Konto" })).toBeVisible();
      // The account page's sidebar has every subject closed; open Markedsføring.
      if (width < 1024) await page.getByRole("button", { name: "Meny" }).click();
      await nav(page).getByRole("button", { name: "Markedsføring" }).click();
      await expect(lectureLink(page, first).getByRole("img", { name: "Øvd" })).toBeVisible();
      await expectNoAxeViolations(page);
    });
  }
});
