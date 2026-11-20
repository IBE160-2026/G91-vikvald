import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// Shared helpers for the user-journey tests (EXPERIENCE.md, «Brukerreiser»).

export const PASSWORD = "hemmelig1";

// A new address per run, so the journeys can run again against the same database.
export function uniqueEmail(): string {
  return `klara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@eksempel.no`;
}

// Every page a journey visits is checked with axe (NFR-13, AR-17).
export async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// The login page (01). Its status area is empty unless the login ran out in this tab.
export async function expectOnLoginPage(page: Page, message = "") {
  await expect(page).toHaveURL(/\/logg-inn$/);
  await expect(page).toHaveTitle("Logg inn – Studiekamerat");
  await expect(page.locator("main h1")).toHaveText("Logg inn");
  await expect(page.locator("main").getByRole("status")).toHaveText(message);
}

// The front page «Dine emner» (02) with the full top bar.
export async function expectOnHomePage(page: Page) {
  await expect(page).toHaveURL(/\/$/);
  await expect(page).toHaveTitle("Dine emner – Studiekamerat");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("main h1")).toHaveText("Dine emner");
}
