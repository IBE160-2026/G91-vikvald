import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Skjelettet (story 1.1)", () => {
  test("UX-DR45: startsiden har lang=nb og én h1 «Dine emner», uten axe-brudd", async ({ page }) => {
    // The front page needs a login (story 1.6): create an account through the API,
    // which sets the cookie in the browser too.
    const email = `klara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@eksempel.no`;
    const response = await page.request.post("/api/identity/register", {
      data: { email, password: "hemmelig1" },
    });
    expect(response.status()).toBe(201);

    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "nb");
    await expect(page.locator("main h1")).toHaveText("Dine emner");
    await expect(page.locator("h1")).toHaveCount(1);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("NFR-1: /api/health svarer ok gjennom rewrites", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
