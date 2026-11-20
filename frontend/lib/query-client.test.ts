import { describe, expect, it } from "vitest";

import { ApiError } from "./api";
import { makeQueryClient, shouldRetry } from "./query-client";

describe("shouldRetry", () => {
  it.each([400, 401, 404, 409, 422, 499])("AR-12: prøver ikke 4xx (%i) på nytt", (status) => {
    expect(shouldRetry(0, new ApiError(status, "NOT_FOUND"))).toBe(false);
  });

  it.each([
    ["500", new ApiError(500, "INTERNAL_ERROR")],
    ["503", new ApiError(503, "DATABASE_UNAVAILABLE")],
    ["nettverksfeil", new ApiError(0, "NETWORK_ERROR")],
    ["annen feil", new TypeError("boom")],
  ])("AR-12: prøver %s på nytt inntil 3 ganger", (_name, error) => {
    expect(shouldRetry(0, error)).toBe(true);
    expect(shouldRetry(2, error)).toBe(true);
    expect(shouldRetry(3, error)).toBe(false);
  });

  it("AR-12: QueryClient bruker regelen", () => {
    expect(makeQueryClient().getDefaultOptions().queries?.retry).toBe(shouldRetry);
  });
});
