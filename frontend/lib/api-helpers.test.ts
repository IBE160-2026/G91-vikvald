import { afterEach, describe, expect, it, vi } from "vitest";

const notFound = vi.fn();
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));

import { ApiError, isUnauthenticated, notFoundOnMissing } from "./api";

afterEach(() => {
  notFound.mockReset();
});

describe("notFoundOnMissing", () => {
  it("FR-4: NOT_FOUND fra API-et viser «Fant ikke siden»", () => {
    notFoundOnMissing(new ApiError(404, "NOT_FOUND"));
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["FEATURE_DISABLED", new ApiError(404, "FEATURE_DISABLED")],
    ["INTERNAL_ERROR", new ApiError(500, "INTERNAL_ERROR")],
    ["UNAUTHENTICATED", new ApiError(401, "UNAUTHENTICATED")],
    ["annen feil", new TypeError("boom")],
    ["ingen feil", null],
  ])("FR-4: %s gir ikke «Fant ikke siden»", (_name, error) => {
    notFoundOnMissing(error);
    expect(notFound).not.toHaveBeenCalled();
  });
});

describe("isUnauthenticated", () => {
  it("UX-DR40: bare 401 UNAUTHENTICATED er utløpt innlogging", () => {
    expect(isUnauthenticated(new ApiError(401, "UNAUTHENTICATED"))).toBe(true);
    expect(isUnauthenticated(new ApiError(401, "INVALID_CREDENTIALS"))).toBe(false);
    expect(isUnauthenticated(new ApiError(500, "INTERNAL_ERROR"))).toBe(false);
    expect(isUnauthenticated(new Error("UNAUTHENTICATED"))).toBe(false);
  });
});
