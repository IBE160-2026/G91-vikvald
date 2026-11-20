import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { PASSWORD, expectNoAxeViolations, expectOnHomePage, expectOnLoginPage, uniqueEmail } from "./felles";

// Flow 1 in EXPERIENCE.md («Brukerreiser (Key Flows)»), UJ-1 in the PRD.
// Only the steps that are built are tested; the rest are listed as
// «ikke bygd ennå» in docs/testing/brukerreiser.md.
// The steps share one browser context and run in order, like one visit by Klara.
test.describe("UJ-1 / flyt 1: Klara etter en forelesning", () => {
  test.describe.configure({ mode: "serial" });

  const email = uniqueEmail();
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("Forutsetning for steg 1 – FR-3, UX-DR40: Klara oppretter konto første gang", async () => {
    await page.goto("/logg-inn");
    await page.getByRole("link", { name: "Opprett konto" }).click();
    await expect(page).toHaveURL(/\/registrer$/);
    await expect(page.locator("main h1")).toHaveText("Opprett konto");
    await expectNoAxeViolations(page);

    await page.getByLabel("E-post").fill(email);
    await page.getByLabel("Passord").fill(PASSWORD);
    await page.getByRole("button", { name: "Opprett konto" }).click();
    await expectOnHomePage(page);

    // Klara closes the app. The next step opens it again in a new tab.
    await page.close();
    await context.clearCookies();
    page = await context.newPage();
  });

  test("Steg 1 – FR-3, UX-DR40: Klara åpner Studiekamerat og logger inn (01)", async () => {
    await page.goto("/");
    // Without a login, the app opens on 01, and a new tab gets no «Du er logget ut».
    await expectOnLoginPage(page);
    await expectNoAxeViolations(page);

    await page.getByLabel("E-post").fill(email);
    await page.getByLabel("Passord").fill(PASSWORD);
    await page.getByRole("button", { name: "Logg inn" }).click();
    await expectOnHomePage(page);
  });

  test("Steg 2 (forsiden) – FR-3, UX-DR6, UX-DR45: forsiden «Dine emner» (02) med toppfelt", async () => {
    await expectOnHomePage(page);
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "Studiekamerat" })).toHaveAttribute("href", "/");
    await expect(header.getByRole("link", { name: "Konto" })).toHaveAttribute("href", "/konto");
    await expect(header.getByRole("button", { name: "Logg ut" })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("Steg 5 (logg ut) – FR-3, UX-DR6, UX-DR40: Klara logger ut uten bekreftelse og kommer til innloggingen (01)", async () => {
    await page.getByRole("button", { name: "Logg ut" }).click();
    await expectOnLoginPage(page);
    expect((await context.cookies()).find((c) => c.name === "sk_session")).toBeUndefined();
    await expectNoAxeViolations(page);

    // Logged out for real: the front page sends her back to 01.
    await page.goto("/");
    await expectOnLoginPage(page);
  });
});
