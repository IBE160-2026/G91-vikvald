import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// A new address per test, so the tests can run again against the same database.
function uniqueEmail(): string {
  return `klara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@eksempel.no`;
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

test.describe("Opprett konto (story 1.4)", () => {
  test("UX-DR45: /registrer har toppfelt med bare logoen, kortet, semesterlinja og setningen, uten axe-brudd", async ({
    page,
  }) => {
    await page.goto("/registrer");

    const header = page.locator("header");
    await expect(header).toHaveCount(1);
    await expect(header).toHaveText("Studiekamerat");
    await expect(header.locator("a, button")).toHaveCount(0);

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main h1")).toHaveText("Opprett konto");
    await expect(page.getByText("Fra forelesningsnotat til eksamen.")).toBeVisible();
    await expect(page.getByLabel("E-post")).toBeVisible();
    await expect(page.getByLabel("Passord")).toHaveAttribute("type", "password");
    await expect(page.getByRole("button", { name: "Vis" })).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("button", { name: "Opprett konto" })).toBeVisible();
    await expect(page.locator('main svg[aria-hidden="true"]').last()).toBeVisible();
    await expect(
      page.getByText("Studiekamerat lager øvingsstoff fra dine egne forelesningsnotater, med kilde på alt."),
    ).toBeVisible();
    await expect(page.getByText("Logg inn", { exact: false })).toHaveCount(0);

    await expectNoAxeViolations(page);
  });

  test("NFR-12: axe finner ingen brudd med feilmeldinger, og fokus går til første feil", async ({ page }) => {
    await page.goto("/registrer");
    await page.getByRole("button", { name: "Opprett konto" }).click();

    await expect(page.getByLabel("E-post")).toBeFocused();
    await expect(page.getByLabel("E-post")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Skriv inn en gyldig e-postadresse, for eksempel klara@eksempel.no.")).toBeVisible();
    await expect(page.getByText("Passordet må ha minst 8 tegn.")).toBeVisible();

    await expectNoAxeViolations(page);
  });

  test("NFR-12: tastaturet går E-post → Passord → Vis → Opprett konto med synlig fokusring", async ({ page }) => {
    await page.goto("/registrer");
    const order = [
      page.getByLabel("E-post"),
      page.getByLabel("Passord"),
      page.getByRole("button", { name: "Vis" }),
      page.getByRole("button", { name: "Opprett konto" }),
    ];
    for (const element of order) {
      await page.keyboard.press("Tab");
      await expect(element).toBeFocused();
      const ring = await element.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          style: style.outlineStyle,
          width: style.outlineWidth,
          offset: style.outlineOffset,
          color: style.outlineColor,
        };
      });
      expect(ring).toEqual({ style: "solid", width: "2px", offset: "2px", color: "rgb(21, 24, 31)" });
    }
  });

  test("NFR-12: Enter i et felt sender skjemaet", async ({ page }) => {
    await page.goto("/registrer");
    await page.getByLabel("E-post").fill("klara");
    await page.getByLabel("E-post").press("Enter");
    await expect(page.getByText("Skriv inn en gyldig e-postadresse, for eksempel klara@eksempel.no.")).toBeVisible();
  });

  test("NFR-11: «Vis» viser passordet", async ({ page }) => {
    await page.goto("/registrer");
    await page.getByLabel("Passord").fill("hemmelig1");
    await page.getByRole("button", { name: "Vis" }).click();
    await expect(page.getByLabel("Passord")).toHaveAttribute("type", "text");
    await expect(page.getByRole("button", { name: "Vis" })).toHaveAttribute("aria-pressed", "true");
  });

  test("FR-3: adresse som finnes fra før gir meldingen under e-postfeltet", async ({ page }) => {
    const email = uniqueEmail();
    const first = await page.request.post("/api/identity/register", {
      data: { email, password: "hemmelig1" },
    });
    expect(first.status()).toBe(201);

    await page.context().clearCookies();
    await page.goto("/registrer");
    await page.getByLabel("E-post").fill(email.toUpperCase());
    await page.getByLabel("Passord").fill("hemmelig1");
    await page.getByLabel("Passord").press("Enter");

    await expect(
      page.getByText("Det finnes allerede en konto med denne e-postadressen. Logg inn i stedet."),
    ).toBeVisible();
    await expect(page.getByLabel("E-post")).toBeFocused();
    await expect(page).toHaveURL(/\/registrer$/);
    await expectNoAxeViolations(page);
  });

  test("FR-3: vellykket konto lander på / med HttpOnly-cookien sk_session", async ({ page }) => {
    await page.goto("/registrer");
    await page.getByLabel("E-post").fill(uniqueEmail());
    await page.getByLabel("Passord").fill("hemmelig1");
    await page.getByRole("button", { name: "Opprett konto" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("main h1")).toHaveText("Studiekamerat");

    const cookie = (await page.context().cookies()).find((c) => c.name === "sk_session");
    expect(cookie).toBeDefined();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("Lax");
    expect(cookie?.path).toBe("/");
    expect(await page.evaluate(() => document.cookie)).not.toContain("sk_session");
  });

  test("NFR-2: ingen forespørsler utenfor localhost, og body bruker Inter Variable med tnum", async ({ page }) => {
    const hosts = new Set<string>();
    const fonts: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      hosts.add(url.hostname);
      if (request.resourceType() === "font") fonts.push(url.pathname);
    });

    for (const path of ["/registrer", "/"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const body = await page.evaluate(() => {
        const style = getComputedStyle(document.body);
        return { family: style.fontFamily, features: style.fontFeatureSettings };
      });
      expect(body.family.startsWith('"Inter Variable"')).toBe(true);
      expect(body.features).toContain("tnum");
    }

    expect([...hosts]).toEqual(["localhost"]);
    expect(fonts.length).toBeGreaterThan(0);
  });
});
