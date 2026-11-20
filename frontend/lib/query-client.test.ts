import { describe, expect, it, vi } from "vitest";

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

describe("401 UNAUTHENTICATED", () => {
  function failing(error: unknown) {
    return () => Promise.reject(error);
  }

  it("UX-DR40: 401 fra en spørring går til onUnauthenticated", async () => {
    const onUnauthenticated = vi.fn();
    const client = makeQueryClient(onUnauthenticated);
    await client
      .fetchQuery({ queryKey: ["me"], queryFn: failing(new ApiError(401, "UNAUTHENTICATED")) })
      .catch(() => undefined);
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
  });

  it("UX-DR40: 401 fra en mutasjon går til onUnauthenticated", async () => {
    const onUnauthenticated = vi.fn();
    const client = makeQueryClient(onUnauthenticated);
    const mutation = client
      .getMutationCache()
      .build(client, { mutationFn: failing(new ApiError(401, "UNAUTHENTICATED")) });
    await mutation.execute(undefined).catch(() => undefined);
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["INVALID_CREDENTIALS", new ApiError(401, "INVALID_CREDENTIALS")],
    ["NOT_FOUND", new ApiError(404, "NOT_FOUND")],
  ])("UX-DR40: %s går ikke til onUnauthenticated", async (_name, error) => {
    const onUnauthenticated = vi.fn();
    const client = makeQueryClient(onUnauthenticated);
    await client.fetchQuery({ queryKey: ["x"], queryFn: failing(error) }).catch(() => undefined);
    const mutation = client.getMutationCache().build(client, { mutationFn: failing(error) });
    await mutation.execute(undefined).catch(() => undefined);
    expect(onUnauthenticated).not.toHaveBeenCalled();
  });
});

describe("401 håndteres én gang per tapt innlogging", () => {
  it("UX-DR40: neste 401 ignoreres til en spørring lykkes igjen", async () => {
    const onUnauthenticated = vi.fn();
    const client = makeQueryClient(onUnauthenticated);
    const unauthenticated = () => Promise.reject(new ApiError(401, "UNAUTHENTICATED"));
    await client.fetchQuery({ queryKey: ["a"], queryFn: unauthenticated }).catch(() => undefined);
    await client.fetchQuery({ queryKey: ["b"], queryFn: unauthenticated }).catch(() => undefined);
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);

    await client.fetchQuery({ queryKey: ["me"], queryFn: () => Promise.resolve({ id: "1" }) });
    await client.fetchQuery({ queryKey: ["c"], queryFn: unauthenticated }).catch(() => undefined);
    expect(onUnauthenticated).toHaveBeenCalledTimes(2);
  });

  it("UX-DR40: en annen spørring som lykkes (f.eks. config) nullstiller ikke", async () => {
    const onUnauthenticated = vi.fn();
    const client = makeQueryClient(onUnauthenticated);
    const unauthenticated = () => Promise.reject(new ApiError(401, "UNAUTHENTICATED"));
    await client.fetchQuery({ queryKey: ["me"], queryFn: unauthenticated }).catch(() => undefined);
    await client.fetchQuery({ queryKey: ["config"], queryFn: () => Promise.resolve({ demo_mode: true }) });
    await client.fetchQuery({ queryKey: ["me", "x"], queryFn: () => Promise.resolve({}) });
    await client.fetchQuery({ queryKey: ["me"], queryFn: unauthenticated, staleTime: 0 }).catch(() => undefined);
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
  });
});
