// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { registerBeforeLogout } from "@/lib/before-logout";

import { useLogout } from "./use-logout";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const fetchMock = vi.fn<typeof fetch>();
const cleanups: (() => void)[] = [];

beforeEach(() => {
  push.mockReset();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  cleanups.splice(0).forEach((remove) => remove());
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function LogoutButton() {
  const logout = useLogout();
  return (
    <button type="button" onClick={logout}>
      Logg ut
    </button>
  );
}

function renderButton() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LogoutButton />
    </QueryClientProvider>,
  );
}

function logoutCalls(): number {
  return fetchMock.mock.calls.filter(([url]) => String(url) === "/api/identity/logout").length;
}

describe("useLogout", () => {
  it("FR-56: venter på det som er meldt inn før utlogging, og logger så ut", async () => {
    let finishSaving: () => void = () => {};
    const order: string[] = [];
    cleanups.push(
      registerBeforeLogout(
        () =>
          new Promise<void>((resolve) => {
            finishSaving = () => {
              order.push("lagret");
              resolve();
            };
          }),
      ),
    );
    fetchMock.mockImplementation(async (url) => {
      order.push(String(url));
      return new Response(null, { status: 204 });
    });
    renderButton();

    fireEvent.click(screen.getByRole("button", { name: "Logg ut" }));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(logoutCalls()).toBe(0);

    finishSaving();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/logg-inn"));
    expect(order).toEqual(["lagret", "/api/identity/logout"]);
  });

  it("FR-56: en treg lagring holder utloggingen igjen i høyst 3 sekunder", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    cleanups.push(registerBeforeLogout(() => new Promise(() => {})));
    renderButton();

    fireEvent.click(screen.getByRole("button", { name: "Logg ut" }));
    await vi.advanceTimersByTimeAsync(2900);
    expect(logoutCalls()).toBe(0);
    await vi.advanceTimersByTimeAsync(200);
    await waitFor(() => expect(logoutCalls()).toBe(1));
  });

  it("FR-3: uten noe meldt inn logges hun ut med en gang", async () => {
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Logg ut" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/logg-inn"));
    expect(logoutCalls()).toBe(1);
  });
});
