import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch } from "./api";

function stubFetch(impl: (...args: Parameters<typeof fetch>) => Promise<Response>) {
  const mock = vi.fn(impl);
  vi.stubGlobal("fetch", mock);
  return mock;
}

async function caught(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
  throw new Error("expected an ApiError");
}

describe("apiFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("AR-12: gir data fra et 200-svar og sender cookies bare til samme opphav", async () => {
    const mock = stubFetch(async () => Response.json({ status: "ok" }));
    await expect(apiFetch("/api/health")).resolves.toEqual({ status: "ok" });
    const init = mock.mock.calls[0][1]!;
    expect(init.credentials).toBe("same-origin");
  });

  it("AR-12: gir undefined for 204", async () => {
    stubFetch(async () => new Response(null, { status: 204 }));
    await expect(apiFetch("/api/identity/logout", { method: "POST" })).resolves.toBeUndefined();
  });

  it("AR-12: setter Content-Type for JSON-tekst", async () => {
    const mock = stubFetch(async () => Response.json({}));
    await apiFetch("/api/x", { method: "POST", body: JSON.stringify({ a: 1 }) });
    const headers = new Headers(mock.mock.calls[0][1]!.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("AR-12: gjør feilformatet om til ApiError med status, code og details", async () => {
    stubFetch(async () =>
      Response.json(
        { error: { code: "EMAIL_ALREADY_REGISTERED", details: { field: "email" } } },
        { status: 409 },
      ),
    );
    const error = await caught(apiFetch("/api/identity/register"));
    expect(error.status).toBe(409);
    expect(error.code).toBe("EMAIL_ALREADY_REGISTERED");
    expect(error.details).toEqual({ field: "email" });
  });

  it("AR-12: et rart feilsvar (HTML) gir INTERNAL_ERROR", async () => {
    stubFetch(async () => new Response("<html>Bad Gateway</html>", { status: 502 }));
    const error = await caught(apiFetch("/api/health"));
    expect(error.status).toBe(502);
    expect(error.code).toBe("INTERNAL_ERROR");
    expect(error.details).toEqual({});
  });

  it("AR-12: JSON uten feilformatet gir INTERNAL_ERROR", async () => {
    stubFetch(async () => Response.json({ detail: "Not Found" }, { status: 404 }));
    const error = await caught(apiFetch("/api/x"));
    expect(error.code).toBe("INTERNAL_ERROR");
  });

  it("AR-12: nettverksfeil gir NETWORK_ERROR med status 0", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    const error = await caught(apiFetch("/api/health"));
    expect(error.status).toBe(0);
    expect(error.code).toBe("NETWORK_ERROR");
  });
});
