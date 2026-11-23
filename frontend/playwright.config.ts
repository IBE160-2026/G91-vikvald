import { defineConfig, devices, type Project } from "@playwright/test";

// Runs against the app started with `docker compose up --build` on port 3000.
//
// The core flow (e2e/kjerneflyt.spec.ts, NFR-15) can also run in the installed
// browsers, but only when E2E_BROWSERS names them, e.g.
// `E2E_BROWSERS=chrome npx playwright test --project=chrome` or
// `E2E_BROWSERS=chrome,msedge`. Without the variable, only Playwright's own
// Chromium runs, as before. `webkit` needs `npx playwright install webkit`.
const EXTRA_BROWSERS: Record<string, Project> = {
  chrome: { name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
  msedge: { name: "msedge", use: { ...devices["Desktop Edge"], channel: "msedge" } },
  webkit: { name: "webkit", use: { ...devices["Desktop Safari"] } },
};

const named = new Set(
  (process.env.E2E_BROWSERS || "")
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter((name) => name !== ""),
);
const unknown = [...named].filter((name) => !(name in EXTRA_BROWSERS));
if (unknown.length > 0) {
  console.warn(`E2E_BROWSERS: ukjent nettleser ${unknown.join(", ")} (kjente: ${Object.keys(EXTRA_BROWSERS).join(", ")})`);
}
const wanted = [...named].filter((name) => name in EXTRA_BROWSERS);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ...wanted.map((name) => ({ ...EXTRA_BROWSERS[name], testMatch: "kjerneflyt.spec.ts" })),
  ],
});
