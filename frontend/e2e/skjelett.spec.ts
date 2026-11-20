import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Skjelettet (story 1.1)", () => {
  test("UX-DR45: startsiden har lang=nb og én h1 «Studiekamerat», uten axe-brudd", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "nb");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main h1")).toHaveText("Studiekamerat");

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("NFR-1: /api/health svarer ok gjennom rewrites", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
