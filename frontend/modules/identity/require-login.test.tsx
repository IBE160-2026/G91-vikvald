// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeQueryClient } from "@/lib/query-client";
import { handleSessionLost, markSignedIn, takeSessionExpired } from "@/lib/session";

import { initialOf } from "./components/account-links";
import { RequireLogin } from "./components/require-login";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));

const fetchMock = vi.fn<typeof fetch>();
const EMAIL = "klara@eksempel.no";

function jsonResponse(status: number, body?: unknown): Response {
  if (status === 204) return new Response(null, { status });
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const UNAUTHENTICATED = { error: { code: "UNAUTHENTICATED", details: {} } };

// The same wiring as lib/providers.tsx, with retries off so errors show at once.
function renderApp() {
  const client = makeQueryClient(() => handleSessionLost(client, { replace }));
  client.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } });
  render(
    <QueryClientProvider client={client}>
      <RequireLogin>
        <h1>Dine emner</h1>
      </RequireLogin>
    </QueryClientProvider>,
  );
  return client;
}

function respond(handlers: Record<string, () => Response | Promise<Response>>) {
  fetchMock.mockImplementation(async (input) => {
    const handler = handlers[String(input)];
    if (!handler) throw new Error(`unexpected call ${String(input)}`);
    return handler();
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  fetchMock.mockReset();
  push.mockReset();
  replace.mockReset();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe("RequireLogin (vakten)", () => {
  it("FR-3: viser ikke noe før /me har svart", () => {
    fetchMock.mockReturnValue(new Promise<Response>(() => {}));
    const { container } = render(
      <QueryClientProvider client={makeQueryClient()}>
        <RequireLogin>
          <h1>Dine emner</h1>
        </RequireLogin>
      </QueryClientProvider>,
    );
    expect(container.innerHTML).toBe("");
    expect(fetchMock).toHaveBeenCalledWith("/api/identity/me", expect.anything());
  });

  it("FR-3: innlogget gir toppfelt med logo-lenke, «K» + «Konto» og «Logg ut», og siden i main", async () => {
    respond({ "/api/identity/me": () => jsonResponse(200, { id: "1", email: EMAIL }) });
    renderApp();
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Dine emner");

    const header = screen.getByRole("banner");
    expect(screen.getByRole("main").contains(screen.getByRole("heading", { level: 1 }))).toBe(true);
    const links = [...header.querySelectorAll("a, button")];
    expect(links.map((el) => el.textContent)).toEqual(["Studiekamerat", "KKonto", "Logg ut"]);
    expect(screen.getByRole("link", { name: "Studiekamerat" }).getAttribute("href")).toBe("/");
    const account = screen.getByRole("link", { name: "Konto" });
    expect(account.getAttribute("href")).toBe("/konto");
    const circle = account.querySelector("span[aria-hidden='true']");
    expect(circle?.textContent).toBe("K");
    expect(circle?.className).toContain("bg-brand-tint");
    expect(circle?.className).toContain("text-brand");
    const logout = screen.getByRole("button", { name: "Logg ut" });
    expect(logout.className).toContain("text-ink-muted");
    expect(logout.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(header.innerHTML).not.toContain("underline");
  });

  it("UX-DR40: /me 200 setter flagget i sessionStorage", async () => {
    respond({ "/api/identity/me": () => jsonResponse(200, { id: "1", email: EMAIL }) });
    renderApp();
    await screen.findByRole("heading", { level: 1 });
    await waitFor(() => expect(window.sessionStorage.getItem("sk_signed_in")).toBe("1"));
  });

  it("FR-3: /me 401 uten flagg går til /logg-inn uten melding og viser ingenting", async () => {
    respond({ "/api/identity/me": () => jsonResponse(401, UNAUTHENTICATED) });
    renderApp();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/logg-inn"));
    expect(screen.queryByRole("banner")).toBeNull();
    expect(screen.queryByRole("main")).toBeNull();
    expect(takeSessionExpired()).toBe(false);
    // Emptying the cache makes the guard ask once more, but never in a loop.
    await new Promise((r) => setTimeout(r, 100));
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(2);
    expect(replace.mock.calls.length).toBeLessThanOrEqual(3);
    expect(replace.mock.calls.every(([href]) => href === "/logg-inn")).toBe(true);
  });

  it("FR-3: en ny 401 etter en som alt er håndtert sender likevel til /logg-inn (f.eks. Tilbake)", async () => {
    respond({ "/api/identity/me": () => jsonResponse(401, UNAUTHENTICATED) });
    const client = renderApp();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/logg-inn"));
    cleanup();
    replace.mockReset();

    // Back to an app page with the same client: the shared handler stays quiet,
    // so the guard itself must redirect, and it does not touch the flags.
    markSignedIn();
    render(
      <QueryClientProvider client={client}>
        <RequireLogin>
          <h1>Dine emner</h1>
        </RequireLogin>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/logg-inn"));
    expect(screen.queryByRole("main")).toBeNull();
    expect(window.sessionStorage.getItem("sk_signed_in")).toBe("1");
    expect(window.sessionStorage.getItem("sk_session_expired")).toBeNull();
  });

  it("UX-DR40: /me 401 med flagget husker «Du er logget ut»", async () => {
    markSignedIn();
    respond({ "/api/identity/me": () => jsonResponse(401, UNAUTHENTICATED) });
    renderApp();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/logg-inn"));
    expect(takeSessionExpired()).toBe(true);
  });

  it.each([
    ["500", () => jsonResponse(500, { error: { code: "INTERNAL_ERROR", details: {} } })],
    ["nettverksfeil", () => Promise.reject(new TypeError("Failed to fetch"))],
  ])("FR-1: /me %s gir «Noe gikk galt. Prøv igjen.» uten omdirigering", async (_name, handler) => {
    respond({ "/api/identity/me": handler });
    renderApp();
    expect((await screen.findByRole("alert")).textContent).toBe("Noe gikk galt. Prøv igjen.");
    expect(screen.getByRole("main").contains(screen.getByRole("alert"))).toBe(true);
    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });
});

describe("«Logg ut»", () => {
  it("FR-3: kaller logout, fjerner flagget, tømmer bufferen og går til /logg-inn uten melding", async () => {
    respond({
      "/api/identity/me": () => jsonResponse(200, { id: "1", email: EMAIL }),
      "/api/identity/logout": () => jsonResponse(204),
    });
    const client = renderApp();
    fireEvent.click(await screen.findByRole("button", { name: "Logg ut" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/logg-inn"));

    const logoutCall = fetchMock.mock.calls.find(([url]) => url === "/api/identity/logout");
    expect(logoutCall?.[1]?.method).toBe("POST");
    expect(window.sessionStorage.getItem("sk_signed_in")).toBeNull();
    expect(takeSessionExpired()).toBe(false);
    expect(client.getQueryData(["me"])).toBeUndefined();
    expect(screen.queryByRole("alert")).toBeNull();
    // Emptying the cache does not start a loop of new /me calls.
    await new Promise((r) => setTimeout(r, 100));
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/identity/me").length).toBeLessThanOrEqual(2);
  });

  it("FR-3: dobbeltklikk gir bare ett kall", async () => {
    let resolve: (response: Response) => void = () => {};
    respond({
      "/api/identity/me": () => jsonResponse(200, { id: "1", email: EMAIL }),
      "/api/identity/logout": () => new Promise<Response>((r) => (resolve = r)),
    });
    renderApp();
    const button = await screen.findByRole("button", { name: "Logg ut" });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() =>
      expect(fetchMock.mock.calls.filter(([url]) => url === "/api/identity/logout")).toHaveLength(1),
    );
    resolve(jsonResponse(204));
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
  });

  it("FR-3: feiler kallet, blir hun innlogget og ser «Noe gikk galt. Prøv igjen.» under toppfeltet", async () => {
    let logoutCalls = 0;
    respond({
      "/api/identity/me": () => jsonResponse(200, { id: "1", email: EMAIL }),
      "/api/identity/logout": () => {
        logoutCalls += 1;
        return logoutCalls === 1
          ? jsonResponse(500, { error: { code: "INTERNAL_ERROR", details: {} } })
          : jsonResponse(204);
      },
    });
    renderApp();
    fireEvent.click(await screen.findByRole("button", { name: "Logg ut" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Noe gikk galt. Prøv igjen.");
    const header = screen.getByRole("banner");
    expect(header.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Dine emner");
    expect(push).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem("sk_signed_in")).toBe("1");

    // She can try again.
    fireEvent.click(screen.getByRole("button", { name: "Logg ut" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/logg-inn"));
  });
});

describe("initialOf", () => {
  it("UX-DR6: første tegn i e-posten med stor bokstav", () => {
    expect(initialOf("klara@eksempel.no")).toBe("K");
    expect(initialOf("øyvind@eksempel.no")).toBe("Ø");
    expect(initialOf("1klara@eksempel.no")).toBe("1");
    // A letter outside the BMP (a surrogate pair) is kept whole.
    expect(initialOf("\u{10428}@eksempel.no")).toBe("\u{10400}");
    expect(initialOf("")).toBe("");
  });
});
