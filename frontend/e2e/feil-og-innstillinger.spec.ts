import { expect, test } from "@playwright/test";

test.describe("Feilformat og innstillinger (story 1.3)", () => {
  test("AR-11: /api/config svarer gjennom rewrites med demo_mode og bryterne", async ({ request }) => {
    const response = await request.get("/api/config");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual([
      "demo_mode",
      "feature_freetext",
      "feature_mnemonics",
      "feature_summary",
    ]);
    expect(body.demo_mode).toBe(true);
  });

  test("AR-12: ukjent /api/* gir 404 NOT_FOUND i feilformatet", async ({ request }) => {
    const response = await request.get("/api/finnes-ikke");
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "NOT_FOUND", details: {} } });
  });
});
