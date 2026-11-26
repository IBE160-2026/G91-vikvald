import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

// Story 6.4: the seeded test user and the sample subject «Markedsføring».
//
// The backend only seeds an empty database. Against a database that already
// had accounts (an old local "pgdata" volume), the test user does not exist,
// and these tests skip themselves with that explanation. They run green
// against a new Compose project, e.g. `docker compose -p sk-seedtest up --build`.
// With E2E_REQUIRE_SEED set (e.g. `E2E_REQUIRE_SEED=1 npx playwright test`), a
// missing test user fails the test instead, so a broken seed is not hidden.

const EMAIL = "test@studiekamerat.no";
const PASSWORD = "studiekamerat";
const LECTURES = ["Markedsmiksen", "Segmentering og målgrupper", "AIDA-modellen"];
// Five definition sentences per note give five cards and five quiz questions per lecture.
const CARDS = 15;
const QUESTIONS = 15;
// One model card per lecture (story 7.1, FEATURE_MNEMONICS on by default):
// AIDA, the four segmentation bases and the four P's. The subject card counts
// them as «kort», and so do «Øv på hele emnet» and the session from story 7.2 (FR-56).
const MODEL_CARDS = 3;

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

function card(page: Page, name: string): Locator {
  return page.locator("main li:has(h2)").filter({ has: page.getByRole("heading", { level: 2, name, exact: true }) });
}

test.describe("Testbruker og eksempelemne (story 6.4)", () => {
  test.beforeEach(async ({ page }) => {
    const login = await page.request.post("/api/identity/login", { data: { email: EMAIL, password: PASSWORD } });
    if (process.env.E2E_REQUIRE_SEED) {
      expect(login.status(), "E2E_REQUIRE_SEED er satt, men testbrukeren kan ikke logge inn").toBe(200);
    }
    test.skip(
      login.status() !== 200,
      "Testbrukeren finnes ikke: seed kjører bare på tom database. Start et nytt Compose-prosjekt, f.eks. `docker compose -p sk-seedtest up --build`.",
    );
    // Logged out again, so the test logs in through the page.
    await page.context().clearCookies();
  });

  test("NFR-3, AR-14: sensor logger inn som testbrukeren, åpner «Markedsføring» og starter en flashcardøkt, uten axe-brudd", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/logg-inn");
    await expectNoAxeViolations(page);
    await page.getByLabel("E-post").fill(EMAIL);
    await page.getByLabel("Passord").fill(PASSWORD);
    await page.getByRole("button", { name: "Logg inn" }).click();
    await expect(page).toHaveURL("/");

    // The front page: the subject with its content, one of three lectures practised.
    const marketing = card(page, "Markedsføring");
    await expect(
      marketing.getByText(`${CARDS + MODEL_CARDS} kort · ${QUESTIONS} quizspørsmål`, { exact: true }),
    ).toBeVisible();
    await expect(marketing.getByText("1 av 3 forelesninger øvd", { exact: true })).toBeVisible();
    await expectNoAxeViolations(page);

    // The subject page: three lectures, files and cards, ready to practise.
    await marketing.getByRole("link", { name: "Åpne Markedsføring" }).click();
    await expect(page).toHaveURL(/\/emner\/[0-9a-f-]{36}$/);
    await expect(page.locator("main h1")).toHaveText("Markedsføring");
    const table = page.getByRole("table");
    for (const name of LECTURES) {
      await expect(table.getByText(name, { exact: true })).toBeVisible();
    }
    const practiceAll = page.getByRole("region", { name: "Øv på hele emnet" });
    await expect(practiceAll.getByText(`${CARDS + MODEL_CARDS} kort fra 3 forelesninger`)).toBeVisible();
    await expectNoAxeViolations(page);

    // The flashcard session over the whole subject.
    await practiceAll.getByRole("link", { name: "Øv på flashcards" }).click();
    await expect(page).toHaveURL(/\/emner\/[0-9a-f-]{36}\/flashcards$/);
    const panel = page.getByRole("region", { name: "Flashcards" });
    await expect(panel.getByText(`/ ${CARDS + MODEL_CARDS}`)).toBeVisible();
    await page.getByRole("button", { name: "Snu kortet" }).click();
    await expect(page.locator('[data-slot="flashcard"] [data-slot="source-link"]')).toHaveText(
      /^(markedsmiksen|segmentering|aida)\.pdf, side \d+$/,
    );
    await expectNoAxeViolations(page);
  });
});
