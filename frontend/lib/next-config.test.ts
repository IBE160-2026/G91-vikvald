import { afterEach, describe, expect, it, vi } from "vitest";

import nextConfig from "../next.config";

type Rewrite = { source: string; destination: string };

async function apiRewrite(): Promise<Rewrite> {
  const rewrites = (await nextConfig.rewrites!()) as Rewrite[];
  const rewrite = rewrites.find((r) => r.source === "/api/:path*");
  expect(rewrite).toBeDefined();
  return rewrite!;
}

describe("next.config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("AR-1: sender /api/* videre til http://backend:8000 som standard", async () => {
    vi.stubEnv("API_INTERNAL_URL", "");
    expect((await apiRewrite()).destination).toBe("http://backend:8000/api/:path*");
  });

  it("AR-1: bruker API_INTERNAL_URL når den er satt", async () => {
    vi.stubEnv("API_INTERNAL_URL", "http://localhost:8000/");
    expect((await apiRewrite()).destination).toBe("http://localhost:8000/api/:path*");
  });

  it("AR-14: bygger standalone", () => {
    expect(nextConfig.output).toBe("standalone");
  });
});
