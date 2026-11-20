// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RequireLogin } from "@/modules/identity/components/require-login";

import { Providers } from "./providers";
import { markSignedIn, takeSessionExpired } from "./session";

const replace = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));

const fetchMock = vi.fn<typeof fetch>();

function renderApp() {
  render(
    <Providers>
      <RequireLogin>
        <h1>Dine emner</h1>
      </RequireLogin>
    </Providers>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(
    async () =>
      new Response(JSON.stringify({ error: { code: "UNAUTHENTICATED", details: {} } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
  );
});

afterEach(() => {
  cleanup();
  fetchMock.mockReset();
  replace.mockReset();
  push.mockReset();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe("Providers kobler 401 til handleSessionLost", () => {
  it("UX-DR40: 401 fra /me går til /logg-inn uten melding", async () => {
    renderApp();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/logg-inn"));
    expect(fetchMock).toHaveBeenCalledWith("/api/identity/me", expect.anything());
    expect(takeSessionExpired()).toBe(false);
  });

  it("UX-DR40: 401 fra /me i en innlogget fane husker «Du er logget ut»", async () => {
    markSignedIn();
    renderApp();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/logg-inn"));
    expect(takeSessionExpired()).toBe(true);
  });
});
