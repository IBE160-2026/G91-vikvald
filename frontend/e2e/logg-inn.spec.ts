import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WRONG = "Feil e-post eller passord. Sjekk at Caps Lock er av.";

// A new address per test, so the tests can run again against the same database.
function uniqueEmail(): string {
  return `klara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@eksempel.no`;
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// Creates an account through the API and removes the cookie it set, so the
// browser is logged out again.
async function createAccount(page: Page, email: string, password = "hemmelig1") {
  const response = await page.request.post("/api/identity/register", { data: { email, password } });
  expect(response.status()).toBe(201);
  await page.context().clearCookies();
}

test.describe("Logg inn (story 1.5)", () => {
  test("FR-3: /logg-inn har toppfelt med bare logoen, kortet, «Ny her?», semesterlinja og setningen, uten axe-brudd", async ({
    page,
  }) => {
    await page.goto("/logg-inn");
    await expect(page).toHaveTitle("Logg inn – Studiekamerat");

    const header = page.locator("header");
    await expect(header).toHaveCount(1);
    await expect(header).toHaveText("Studiekamerat");
    await expect(header.locator("a, button")).toHaveCount(0);

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main h1")).toHaveText("Logg inn");
    await expect(page.getByText("Fra forelesningsnotat til eksamen.")).toBeVisible();
    await expect(page.getByLabel("E-post")).toBeVisible();
    await expect(page.getByLabel("Passord")).toHaveAttribute("type", "password");
    await expect(page.getByLabel("Passord")).toHaveAttribute("autocomplete", "current-password");
    await expect(page.getByRole("button", { name: "Vis" })).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("button", { name: "Logg inn" })).toBeVisible();
    await expect(page.getByText("Ny her?")).toBeVisible();
    await expect(page.getByRole("link", { name: "Opprett konto" })).toHaveAttribute("href", "/registrer");
    await expect(page.locator('main svg[aria-hidden="true"]').last()).toBeVisible();
    await expect(
      page.getByText("Studiekamerat lager øvingsstoff fra dine egne forelesningsnotater, med kilde på alt."),
    ).toBeVisible();
    // No «Du er logget ut» here (story 1.6).
    await expect(page.getByText("Du er logget ut", { exact: false })).toHaveCount(0);

    await expectNoAxeViolations(page);
  });

  test("NFR-12: tastaturet går E-post → Passord → Vis → Logg inn → Opprett konto med synlig fokusring", async ({
    page,
  }) => {
    await page.goto("/logg-inn");
    const order = [
      page.getByLabel("E-post"),
      page.getByLabel("Passord"),
      page.getByRole("button", { name: "Vis" }),
      page.getByRole("button", { name: "Logg inn" }),
      page.getByRole("link", { name: "Opprett konto" }),
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

  test("NFR-12: Enter i e-postfeltet sender skjemaet, og zod stopper ugyldig e-post", async ({ page }) => {
    const calls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/identity/login")) calls.push(request.url());
    });
    await page.goto("/logg-inn");
    await page.getByLabel("E-post").fill("klara");
    await page.getByLabel("E-post").press("Enter");

    await expect(page.getByText("Skriv inn en gyldig e-postadresse, for eksempel klara@eksempel.no.")).toBeVisible();
    await expect(page.getByLabel("E-post")).toBeFocused();
    await expect(page.getByLabel("E-post")).toHaveAttribute("aria-invalid", "true");
    expect(calls).toEqual([]);
  });

  test("FR-3: feil passord gir meldingen under passordfeltet med fokus dit, uten axe-brudd", async ({ page }) => {
    const email = uniqueEmail();
    await createAccount(page, email);

    await page.goto("/logg-inn");
    await page.getByLabel("E-post").fill(email);
    await page.getByLabel("Passord").fill("feilpassord");
    await page.getByLabel("Passord").press("Enter");

    await expect(page.getByText(WRONG)).toBeVisible();
    const password = page.getByLabel("Passord");
    await expect(password).toBeFocused();
    await expect(password).toHaveAttribute("aria-invalid", "true");
    const describedBy = await password.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`[id="${describedBy}"]`)).toHaveText(WRONG);
    await expect(page.getByLabel("E-post")).not.toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/logg-inn$/);

    await expectNoAxeViolations(page);
  });

  test("FR-3: ukjent e-post gir samme melding", async ({ page }) => {
    await page.goto("/logg-inn");
    await page.getByLabel("E-post").fill(uniqueEmail());
    await page.getByLabel("Passord").fill("hemmelig1");
    await page.getByRole("button", { name: "Logg inn" }).click();
    await expect(page.getByText(WRONG)).toBeVisible();
    await expect(page.getByLabel("Passord")).toBeFocused();
  });

  test("UX-DR25: «Opprett konto» fører til /registrer, og «Logg inn» der fører tilbake", async ({ page }) => {
    await page.goto("/logg-inn");
    await page.getByRole("link", { name: "Opprett konto" }).click();
    await expect(page).toHaveURL(/\/registrer$/);
    await expect(page.locator("main h1")).toHaveText("Opprett konto");

    await page.getByRole("link", { name: "Logg inn" }).click();
    await expect(page).toHaveURL(/\/logg-inn$/);
    await expect(page.locator("main h1")).toHaveText("Logg inn");
  });

  test("FR-3: opprett konto, slett cookien og logg inn igjen: / med HttpOnly-cookie, og /me svarer 200", async ({
    page,
  }) => {
    const hosts = new Set<string>();
    const apiCalls: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      hosts.add(url.host);
      if (url.pathname.startsWith("/api/")) apiCalls.push(url.origin);
    });

    const email = uniqueEmail();
    await page.goto("/registrer");
    await page.getByLabel("E-post").fill(email);
    await page.getByLabel("Passord").fill("hemmelig1");
    await page.getByRole("button", { name: "Opprett konto" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.context().clearCookies();
    expect((await page.request.get("/api/identity/me")).status()).toBe(401);

    await page.goto("/logg-inn");
    await page.getByLabel("E-post").fill(email.toUpperCase());
    await page.getByLabel("Passord").fill("hemmelig1");
    await page.getByRole("button", { name: "Logg inn" }).click();
    await expect(page).toHaveURL(/\/$/);

    const cookie = (await page.context().cookies()).find((c) => c.name === "sk_session");
    expect(cookie).toBeDefined();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("Lax");
    expect(cookie?.path).toBe("/");
    expect(await page.evaluate(() => document.cookie)).not.toContain("sk_session");

    const me = await page.request.get("/api/identity/me");
    expect(me.status()).toBe(200);
    expect(await me.json()).toEqual({ id: expect.any(String), email, terms_accepted_at: null });

    expect(apiCalls.length).toBeGreaterThanOrEqual(2);
    expect(new Set(apiCalls)).toEqual(new Set(["http://localhost:3000"]));
    expect([...hosts]).toEqual(["localhost:3000"]);
  });
});
