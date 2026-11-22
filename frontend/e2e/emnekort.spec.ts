import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { makePdf } from "./pdf";

// Story 5.4: one subject card per subject on the front page (02), with the
// counts, «Neste å øve på» / NESTE STEG and the progress (FR-58, SK-20,
// UX-DR12). The browser's clock and time zone are set, as in
// eksamenslinje.spec.ts, so the exam line over the cards never depends on when
// the test runs.

const PASSWORD = "hemmelig1";
const SAVE_PATH = "/api/practice-sessions";

// Tuesday 10.11.2026 at noon in Oslo, as in mockup 02.
const TODAY = new Date("2026-11-10T12:00:00+01:00");

test.use({ timezoneId: "Europe/Oslo" });

// Five definition sentences: the mock model makes a card and a quiz question
// from each (the quiz needs at least four).
const PAGES = [
  "Merkevare er et navn som skiller et produkt fra andre.",
  "Pris er det kunden betaler for varen.",
  "Segment er en gruppe kunder med like behov.",
  "Kanal er veien varen tar fram til kunden.",
  "Posisjon er plassen produktet har hos kunden.",
];

function uniqueEmail(): string {
  return `klara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@eksempel.no`;
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

type Setup = {
  // Uke 37 with cards and quiz, Uke 38 with cards.
  marketing: { id: string; first: string; second: string; cards: number; quiz: number };
  // Uke 37 with only quiz questions.
  economics: { id: string; lecture: string; quiz: number };
  // Uke 44 without files, Uke 45 with two files and no content.
  organisation: { id: string; withFiles: string };
  // No lectures.
  statistics: { id: string };
};

async function contentCounts(page: Page, lectureId: string): Promise<{ flashcards: number; quiz_questions: number }> {
  return (await page.request.get(`/api/lectures/${lectureId}/content-counts`)).json();
}

// Runs a job of `kind` on the lecture and waits until the mock model's content is there.
async function makeContent(page: Page, lectureId: string, kind: "flashcards" | "quiz"): Promise<number> {
  const params = kind === "quiz" ? { requested: 10, difficulty: "medium" } : { requested: 10 };
  const start = await page.request.post(`/api/lectures/${lectureId}/jobs`, { data: { kind, params } });
  expect(start.status()).toBe(202);
  const jobId = (await start.json()).id as string;
  // Wait until the job is done, so the next job on the same lecture may start.
  await expect
    .poll(async () => (await (await page.request.get(`/api/jobs/${jobId}`)).json()).status, { timeout: 10_000 })
    .toBe("done");
  const count = (await contentCounts(page, lectureId))[kind === "quiz" ? "quiz_questions" : "flashcards"];
  expect(count).toBeGreaterThan(0);
  return count;
}

async function upload(page: Page, lectureId: string, name: string) {
  const response = await page.request.post(`/api/lectures/${lectureId}/files`, {
    multipart: { file: { name, mimeType: "application/pdf", buffer: makePdf({ pages: PAGES }) } },
  });
  expect(response.status()).toBe(201);
}

// A new, logged-in student with four subjects, one per kind of card.
async function fourSubjects(page: Page): Promise<Setup> {
  const register = await page.request.post("/api/identity/register", {
    data: { email: uniqueEmail(), password: PASSWORD },
  });
  expect(register.status()).toBe(201);
  expect((await page.request.post("/api/identity/terms")).status()).toBe(200);
  const subject = async (name: string, examDate: string) =>
    (await (await page.request.post("/api/subjects", { data: { name, exam_date: examDate } })).json()).id as string;
  const lecture = async (subjectId: string, name: string, date: string) =>
    (await (await page.request.post(`/api/subjects/${subjectId}/lectures`, { data: { name, date } })).json())
      .id as string;

  const marketing = await subject("Markedsføring", "2026-12-04");
  const first = await lecture(marketing, "Uke 37: Merkevare", "2026-09-11");
  const second = await lecture(marketing, "Uke 38: Pris", "2026-09-18");
  await upload(page, first, "merkevare.pdf");
  await upload(page, second, "pris.pdf");
  const firstCards = await makeContent(page, first, "flashcards");
  const quiz = await makeContent(page, first, "quiz");
  const secondCards = await makeContent(page, second, "flashcards");

  const economics = await subject("Samfunnsøkonomi", "2026-12-11");
  const quizOnly = await lecture(economics, "Uke 37: Tilbud", "2026-09-11");
  await upload(page, quizOnly, "tilbud.pdf");
  const economicsQuiz = await makeContent(page, quizOnly, "quiz");

  const organisation = await subject("Organisasjon", "2026-12-14");
  await lecture(organisation, "Uke 44: Ledelse", "2026-10-30");
  const withFiles = await lecture(organisation, "Uke 45: Kultur", "2026-11-06");
  await upload(page, withFiles, "kultur-1.pdf");
  await upload(page, withFiles, "kultur-2.pdf");

  const statistics = await subject("Statistikk", "2026-12-18");

  return {
    marketing: { id: marketing, first, second, cards: firstCards + secondCards, quiz },
    economics: { id: economics, lecture: quizOnly, quiz: economicsQuiz },
    organisation: { id: organisation, withFiles },
    statistics: { id: statistics },
  };
}

// The subject card (an `li` in main) with the subject's name as its heading.
function card(page: Page, name: string): Locator {
  return page.locator("main li").filter({ has: page.getByRole("heading", { level: 2, name, exact: true }) });
}

test.describe("Emnekort med «Neste å øve på» (story 5.4)", () => {
  test("FR-58, UX-DR12: kortene viser tellinger, neste forelesning eller neste steg og fremdriften, under eksamenslinjene", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const setup = await fourSubjects(page);
    await page.clock.setSystemTime(TODAY);
    await page.goto("/");

    await expect(page.locator("main li")).toHaveCount(4);
    // The exam lines stand over the cards, and the cards carry no exam date (#244).
    await expect(page.getByText("Eksamen 04.12, om 3 uker · 0 av 2 forelesninger øvd", { exact: true })).toBeVisible();
    await expect(page.locator("main li").filter({ hasText: "Eksamen" })).toHaveCount(0);

    const marketing = card(page, "Markedsføring");
    await expect(marketing.getByRole("link", { name: "Åpne Markedsføring" })).toHaveAttribute(
      "href",
      `/emner/${setup.marketing.id}`,
    );
    await expect(marketing.getByText(`${setup.marketing.cards} kort · ${setup.marketing.quiz} quizspørsmål`, { exact: true })).toBeVisible();
    await expect(marketing.getByRole("heading", { level: 3, name: "Neste å øve på" })).toBeAttached();
    await expect(marketing.getByText("NESTE Å ØVE PÅ", { exact: true })).toBeVisible();
    await expect(marketing.getByText("Uke 37: Merkevare", { exact: true })).toBeVisible();
    await expect(marketing.getByText(/^\d+ kort, ikke øvd ennå$/)).toBeVisible();
    await expect(marketing.getByRole("link", { name: "Øv nå" })).toHaveAttribute(
      "href",
      `/forelesninger/${setup.marketing.first}/flashcards`,
    );
    await expect(marketing.getByText("0 av 2 forelesninger øvd", { exact: true })).toBeVisible();
    await expect(marketing.locator('[data-slot="progress"] [aria-hidden="true"] > span')).toHaveCount(2);

    const economics = card(page, "Samfunnsøkonomi");
    await expect(economics.getByText(`${setup.economics.quiz} quizspørsmål`, { exact: true })).toBeVisible();
    await expect(economics.getByText(`${setup.economics.quiz} quizspørsmål, ikke øvd ennå`, { exact: true })).toBeVisible();

    const organisation = card(page, "Organisasjon");
    await expect(organisation.getByText("Ingen øvingsinnhold ennå", { exact: true })).toBeVisible();
    await expect(organisation.getByText("NESTE STEG", { exact: true })).toBeVisible();
    await expect(organisation.getByText("Uke 45: Kultur", { exact: true })).toBeVisible();
    await expect(organisation.getByText("2 filer lastet opp, klare til bruk", { exact: true })).toBeVisible();
    await expect(organisation.getByRole("link", { name: "Lag flashcards" })).toHaveAttribute(
      "href",
      `/forelesninger/${setup.organisation.withFiles}`,
    );
    await expect(organisation.getByText("0 av 2 forelesninger øvd", { exact: true })).toBeVisible();

    const statistics = card(page, "Statistikk");
    await expect(statistics.getByText("Ingen forelesninger ennå", { exact: true })).toBeVisible();
    await expect(statistics.getByRole("link", { name: "Ny forelesning" })).toHaveAttribute(
      "href",
      `/emner/${setup.statistics.id}`,
    );
    await expect(statistics.locator('[data-slot="progress"]')).toHaveCount(0);

    // Three columns at 1280 px: the first three cards stand on one row.
    const tops = await Promise.all([0, 1, 2, 3].map(async (i) => (await page.locator("main li").nth(i).boundingBox())!.y));
    expect(tops[1]).toBe(tops[0]);
    expect(tops[2]).toBe(tops[0]);
    expect(tops[3]).toBeGreaterThan(tops[0]);

    // «Lag flashcards» opens the lecture (04).
    await organisation.getByRole("link", { name: "Lag flashcards" }).click();
    await expect(page).toHaveURL(`/forelesninger/${setup.organisation.withFiles}`);
  });

  test("SK-20: «Øv nå» på en forelesning med bare quiz starter quizen, aldri en tom økt", async ({ page }) => {
    const setup = await fourSubjects(page);
    await page.clock.setSystemTime(TODAY);
    await page.goto("/");
    const economics = card(page, "Samfunnsøkonomi");
    await economics.getByRole("link", { name: "Øv nå" }).click();
    await expect(page).toHaveURL(`/forelesninger/${setup.economics.lecture}/quiz`);
    await expect(page.locator('[data-slot="quiz-question"]')).toBeVisible();
  });

  test("FR-58: etter en økt viser kortet neste forelesning og ny fremdrift uten omlasting", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const setup = await fourSubjects(page);
    await page.clock.setSystemTime(TODAY);
    await page.goto("/");
    // Set once; a reload would remove it.
    await page.evaluate(() => {
      (window as unknown as { notReloaded: boolean }).notReloaded = true;
    });

    const marketing = card(page, "Markedsføring");
    await marketing.getByRole("link", { name: "Øv nå" }).click();
    await expect(page).toHaveURL(`/forelesninger/${setup.marketing.first}/flashcards`);
    const cards = (await contentCounts(page, setup.marketing.first)).flashcards;
    const saved = page.waitForResponse((response) => new URL(response.url()).pathname === SAVE_PATH);
    for (let i = 0; i < cards; i += 1) {
      await page.getByRole("button", { name: "Snu kortet" }).click();
      await page.getByRole("button", { name: "Kunne", exact: true }).click();
    }
    expect((await saved).status()).toBe(204);

    await page.getByRole("link", { name: "Tilbake til forelesningen" }).click();
    await expect(page).toHaveURL(`/forelesninger/${setup.marketing.first}`);
    await page.getByRole("link", { name: "Studiekamerat" }).click();
    await expect(page).toHaveURL("/");

    await expect(marketing.getByText("Uke 38: Pris", { exact: true })).toBeVisible();
    await expect(marketing.getByRole("link", { name: "Øv nå" })).toHaveAttribute(
      "href",
      `/forelesninger/${setup.marketing.second}/flashcards`,
    );
    await expect(marketing.getByText("1 av 2 forelesninger øvd", { exact: true })).toBeVisible();
    await expect(marketing.locator('[data-slot="progress"] [aria-hidden="true"] > span').first()).toHaveAttribute(
      "data-practiced",
      "true",
    );

    expect(await page.evaluate(() => (window as unknown as { notReloaded?: boolean }).notReloaded)).toBe(true);
  });

  test("UX-DR12: Tab-rekkefølgen følger leserekkefølgen, «Åpne ›» og så knappen i NESTE-delen, kort for kort", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await fourSubjects(page);
    await page.clock.setSystemTime(TODAY);
    await page.goto("/");
    const expected = [
      ["Markedsføring", "Åpne Markedsføring"],
      ["Markedsføring", "Øv nå"],
      ["Samfunnsøkonomi", "Åpne Samfunnsøkonomi"],
      ["Samfunnsøkonomi", "Øv nå"],
      ["Organisasjon", "Åpne Organisasjon"],
      ["Organisasjon", "Lag flashcards"],
      ["Statistikk", "Åpne Statistikk"],
      ["Statistikk", "Ny forelesning"],
    ] as const;
    // Wait until every card has its button (the counts are loaded).
    for (const [subject, name] of expected.filter((_, index) => index % 2 === 1)) {
      await expect(card(page, subject).getByRole("link", { name, exact: true })).toBeVisible();
    }
    await card(page, "Markedsføring").getByRole("link", { name: "Åpne Markedsføring" }).focus();
    for (const [index, [subject, name]] of expected.entries()) {
      if (index > 0) await page.keyboard.press("Tab");
      await expect(card(page, subject).getByRole("link", { name, exact: true })).toBeFocused();
    }
  });

  for (const width of [1280, 768]) {
    test(`UX-DR12: ingen axe-brudd på 02 med emnekortene, ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await fourSubjects(page);
      await page.clock.setSystemTime(TODAY);
      await page.goto("/");
      await expect(card(page, "Organisasjon").getByText("2 filer lastet opp, klare til bruk")).toBeVisible();
      await expect(card(page, "Markedsføring").getByRole("link", { name: "Øv nå" })).toBeVisible();
      await expectNoAxeViolations(page);
      if (width === 768) {
        // Two columns at 768 px (608 px of content).
        const first = (await page.locator("main li").nth(0).boundingBox())!;
        const second = (await page.locator("main li").nth(1).boundingBox())!;
        const third = (await page.locator("main li").nth(2).boundingBox())!;
        expect(second.y).toBe(first.y);
        expect(third.y).toBeGreaterThan(first.y);
      }
    });
  }
});
