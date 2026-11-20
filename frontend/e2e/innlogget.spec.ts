import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const LOGGED_OUT = "Du er logget ut. Logg inn igjen.";

function uniqueEmail(): string {
  return `klara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@eksempel.no`;
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

async function expectFocusRing(element: Locator) {
  const ring = await element.evaluate((el) => {
    const style = getComputedStyle(el);
    return { style: style.outlineStyle, width: style.outlineWidth, offset: style.outlineOffset, color: style.outlineColor };
  });
  expect(ring).toEqual({ style: "solid", width: "2px", offset: "2px", color: "rgb(21, 24, 31)" });
}

// The login page has an always-present status area; it is empty unless the
// login ran out in this tab.
async function expectOnLoginPage(page: Page, message: string) {
  await expect(page).toHaveURL(/\/logg-inn$/);
  await expect(page.locator("main h1")).toHaveText("Logg inn");
  await expect(page.locator("main").getByRole("status")).toHaveText(message);
}

async function logIn(page: Page, email: string) {
  await page.getByLabel("E-post").fill(email);
  await page.getByLabel("Passord").fill("hemmelig1");
  await page.getByRole("button", { name: "Logg inn" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("main h1")).toHaveText("Dine emner");
}

test.describe("Innlogget, logg ut og «Fant ikke siden» (story 1.6)", () => {
  test("FR-3: forsiden har toppfelt med logo-lenke, «K» + «Konto» og «Logg ut», én h1 «Dine emner», uten axe-brudd", async ({
    page,
  }) => {
    const response = await page.request.post("/api/identity/register", {
      data: { email: uniqueEmail(), password: "hemmelig1" },
    });
    expect(response.status()).toBe(201);

    await page.goto("/");
    await expect(page).toHaveTitle("Dine emner – Studiekamerat");
    await expect(page.locator("main h1")).toHaveText("Dine emner");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("header")).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);

    const header = page.locator("header");
    const logo = header.getByRole("link", { name: "Studiekamerat" });
    const account = header.getByRole("link", { name: "Konto" });
    const logout = header.getByRole("button", { name: "Logg ut" });
    await expect(logo).toHaveAttribute("href", "/");
    await expect(account).toHaveAttribute("href", "/konto");
    await expect(account).toHaveText("KKonto");
    await expect(logout).toBeVisible();

    // h1 at the 80 px home margin.
    const h1Box = await page.locator("main h1").boundingBox();
    expect(h1Box?.x).toBe(80);

    for (const element of [logo, account, logout]) {
      await page.keyboard.press("Tab");
      await expect(element).toBeFocused();
      await expectFocusRing(element);
    }

    await expectNoAxeViolations(page);
  });

  test("UX-DR40: logg ut, gå tilbake, åpne /, logg inn og slett cookien: alltid /logg-inn, meldingen bare til slutt", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await page.goto("/registrer");
    await page.getByLabel("E-post").fill(email);
    await page.getByLabel("Passord").fill("hemmelig1");
    await page.getByRole("button", { name: "Opprett konto" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("main h1")).toHaveText("Dine emner");

    // 1. Logg ut: no confirmation and no message, and the cookie is gone.
    await page.getByRole("button", { name: "Logg ut" }).click();
    await expectOnLoginPage(page, "");
    expect((await page.context().cookies()).find((c) => c.name === "sk_session")).toBeUndefined();

    // 2. Back to the front page.
    await page.goBack();
    await expectOnLoginPage(page, "");

    // 3. Open / directly.
    await page.goto("/");
    await expectOnLoginPage(page, "");

    // 4. Log in, then the cookie disappears (as when the login runs out) and / is loaded.
    await logIn(page, email);
    await page.context().clearCookies();
    await page.goto("/");
    await expectOnLoginPage(page, LOGGED_OUT);
    await expectNoAxeViolations(page);

    // The message is shown once: a reload does not show it again.
    await page.reload();
    await expectOnLoginPage(page, "");
  });

  test("UX-DR40: en ny fane etter utløpt innlogging får ingen melding", async ({ page, context }) => {
    const email = uniqueEmail();
    await page.request.post("/api/identity/register", { data: { email, password: "hemmelig1" } });
    await page.goto("/");
    await expect(page.locator("main h1")).toHaveText("Dine emner");

    await context.clearCookies();
    const other = await context.newPage();
    await other.goto("/");
    await expectOnLoginPage(other, "");
  });

  test("UX-DR21: ukjent adresse gir 404, h1 «Fant ikke siden» og «Gå til forsiden» med Tab, uten axe-brudd", async ({
    page,
  }) => {
    const response = await page.goto("/finnes-ikke");
    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle("Fant ikke siden – Studiekamerat");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main h1")).toHaveText("Fant ikke siden");
    // Only the logo in the top bar, and it is not a link.
    await expect(page.locator("header")).toHaveText("Studiekamerat");
    await expect(page.locator("header a, header button")).toHaveCount(0);

    const home = page.getByRole("link", { name: "Gå til forsiden" });
    await expect(home).toHaveAttribute("href", "/");
    await page.keyboard.press("Tab");
    await expect(home).toBeFocused();
    await expectFocusRing(home);

    await expectNoAxeViolations(page);
  });
});
