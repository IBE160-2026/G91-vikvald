import { afterEach, describe, expect, it, vi } from "vitest";

import { configQueryOptions, fetchConfig } from "./config";

describe("config", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("AR-11: henter /api/config gjennom transporten", async () => {
    const config = {
      demo_mode: true,
      feature_mnemonics: true,
      feature_freetext: false,
      feature_summary: true,
    };
    const mock = vi.fn(async (_input: RequestInfo | URL) => Response.json(config));
    vi.stubGlobal("fetch", mock);
    await expect(fetchConfig()).resolves.toEqual(config);
    expect(mock.mock.calls[0][0]).toBe("/api/config");
  });

  it("AR-11: config-spørringen har én fast nøkkel og blir aldri foreldet", () => {
    expect(configQueryOptions.queryKey).toEqual(["config"]);
    expect(configQueryOptions.staleTime).toBe(Infinity);
  });
});
