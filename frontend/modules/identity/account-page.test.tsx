// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeQueryClient } from "@/lib/query-client";
import { handleSessionLost, markSignedIn } from "@/lib/session";

import { AccountPage, formatLocalDate } from "./pages/account-page";
import type { AccountDeletePreview, User } from "./types";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));

const fetchMock = vi.fn<typeof fetch>();
const EMAIL = "klara@eksempel.no";

function jsonResponse(status: number, body?: unknown): Response {
  if (status === 204) return new Response(null, { status });
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const SERVER_ERROR = { error: { code: "INTERNAL_ERROR", details: {} } };

const USER: User = { id: "u1", email: EMAIL, terms_accepted_at: "2026-09-11T10:00:00Z" };
const FULL: AccountDeletePreview = {
  counts: [
    { kind: "subjects", count: 3 },
    { kind: "lectures", count: 15 },
    { kind: "files", count: 18 },
  ],
  content_kinds: [],
};

type Options = {
  user?: User;
  preview?: AccountDeletePreview;
  demo?: boolean;
  deleteStatus?: number;
  logoutStatus?: number;
};

// A small fake backend. Records every request as "METHOD path".
function respond({ user = USER, preview = FULL, demo = true, deleteStatus = 204, logoutStatus = 204 }: Options = {}) {
  const calls: string[] = [];
  fetchMock.mockImplementation(async (input, init) => {
    const path = String(input);
    const method = init?.method ?? "GET";
    calls.push(`${method} ${path}`);
    if (method === "GET" && path === "/api/identity/me") return jsonResponse(200, user);
    if (method === "GET" && path === "/api/identity/me/delete-preview") return jsonResponse(200, preview);
    if (method === "GET" && path === "/api/subjects") return jsonResponse(200, []);
    if (method === "GET" && path === "/api/config") {
      return jsonResponse(200, {
        demo_mode: demo,
        feature_mnemonics: true,
        feature_freetext: true,
        feature_summary: true,
      });
    }
    if (method === "DELETE" && path === "/api/identity/me") {
      return deleteStatus === 204 ? jsonResponse(204) : jsonResponse(deleteStatus, SERVER_ERROR);
    }
    if (method === "POST" && path === "/api/identity/logout") {
      return logoutStatus === 204 ? jsonResponse(204) : jsonResponse(logoutStatus, SERVER_ERROR);
    }
    throw new Error(`unexpected call ${method} ${path}`);
  });
  return calls;
}

function renderPage() {
  const client = makeQueryClient(() => handleSessionLost(client, { replace }));
  client.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } });
  render(
    <QueryClientProvider client={client}>
      <AccountPage />
    </QueryClientProvider>,
  );
  return client;
}

async function heading() {
  return screen.findByRole("heading", { level: 1, name: "Konto" });
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

describe("AccountPage", () => {
  it("FR-5: viser h1, demomerket, e-posten, tellingene og «Slett kontoen …»", async () => {
    respond();
    renderPage();
    await heading();
    expect(screen.getByText("Innlogging, vilkår og sletting av kontoen")).toBeTruthy();
    expect(await screen.findByText("Demomodus: innholdet lages av en testmodell")).toBeTruthy();
    expect(screen.getByText(EMAIL)).toBeTruthy();
    expect(screen.getByText("Lagret kryptert, aldri i klartekst")).toBeTruthy();
    expect(await screen.findByText("Du har nå 3 emner, 15 forelesninger og 18 filer.")).toBeTruthy();
    expect(
      screen.getByText("Alle emner, filer og alt generert innhold slettes for godt. Det kan ikke angres."),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Slett kontoen …" })).toBeTruthy();
    expect(screen.getByText("Testmodell i demomodus (ellers Google, i EU)")).toBeTruthy();
    expect(document.title).toBe("Konto – Studiekamerat");
  });

  it("UX-DR39: tre seksjoner med h2 og hvitt kort", async () => {
    respond();
    renderPage();
    await heading();
    const titles = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual(["Innlogging", "Vilkår og personvern", "Slett kontoen"]);
    expect(document.querySelectorAll('[data-slot="account-card"]')).toHaveLength(3);
  });

  it("FR-5: uten demomodus står ikke demomerket, og språkmodellen er «Google, i EU»", async () => {
    respond({ demo: false });
    renderPage();
    await heading();
    expect(await screen.findByText("Google, i EU")).toBeTruthy();
    expect(screen.queryByText("Demomodus: innholdet lages av en testmodell")).toBeNull();
  });

  it("FR-5: godtatt dato som dd.mm.åååå, eller «Ikke godtatt ennå»", async () => {
    respond();
    renderPage();
    await heading();
    expect(screen.getByText(`Godtatt ${formatLocalDate(USER.terms_accepted_at!)}, før første opplasting`)).toBeTruthy();
    expect(formatLocalDate("2026-09-11T10:00:00Z")).toMatch(/^\d{2}\.\d{2}\.2026$/);
    cleanup();

    respond({ user: { ...USER, terms_accepted_at: null } });
    renderPage();
    await heading();
    expect(screen.getByText("Ikke godtatt ennå. Du får se dem før første opplasting.")).toBeTruthy();
  });

  it("E16: tom konto viser ikke «Du har nå …»", async () => {
    const calls = respond({ preview: { counts: [], content_kinds: [] } });
    renderPage();
    await heading();
    await waitFor(() => expect(calls).toContain("GET /api/identity/me/delete-preview"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText(/Du har nå/)).toBeNull();
  });

  it("FR-5: registrerte innholdstyper nevnes i teksten", async () => {
    respond({ preview: { ...FULL, content_kinds: ["flashcards", "quiz_questions"] } });
    renderPage();
    await heading();
    expect(
      await screen.findByText(
        "Alle emner, filer og alt generert innhold slettes for godt: flashcards og quizspørsmål. Det kan ikke angres.",
      ),
    ).toBeTruthy();
  });

  it("UX-DR39: «Les vilkårene» viser vilkårene uten avkrysning, og «Lukk» gir fokus tilbake", async () => {
    respond();
    renderPage();
    await heading();
    await screen.findByText("Demomodus: innholdet lages av en testmodell");
    const opener = screen.getByRole("button", { name: "Les vilkårene" });
    opener.focus();
    fireEvent.click(opener);

    const dialog = screen.getByRole("dialog", { name: "Vilkår og personvern" });
    expect(within(dialog).getByText("DITT ANSVAR")).toBeTruthy();
    expect(within(dialog).getByText("I demomodus sendes ingenting ut.")).toBeTruthy();
    expect(within(dialog).queryByRole("checkbox")).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "Avbryt" })).toBeNull();
    const buttons = within(dialog).getAllByRole("button", { name: "Lukk" });
    expect(buttons).toHaveLength(2);
    expect(document.activeElement).toBe(buttons[1]);

    fireEvent.click(buttons[1]);
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("FR-5: bekreftelsen viser e-posten og tellingene, starter på «Avbryt», og sletting går til innloggingen", async () => {
    const calls = respond();
    const client = renderPage();
    const clear = vi.spyOn(client, "clear");
    markSignedIn();
    await heading();
    fireEvent.click(screen.getByRole("button", { name: "Slett kontoen …" }));

    const dialog = screen.getByRole("dialog", { name: "Slette kontoen?" });
    expect(within(dialog).getByText(EMAIL)).toBeTruthy();
    expect(await within(dialog).findByText("Dette sletter også 3 emner, 15 forelesninger og 18 filer.")).toBeTruthy();
    expect(within(dialog).getByText("Alle emner, filer og alt generert innhold slettes for godt.")).toBeTruthy();
    expect(within(dialog).getByText("Det kan ikke angres.")).toBeTruthy();
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Avbryt" }));

    const confirm = within(dialog).getByRole("button", { name: "Slett kontoen" }) as HTMLButtonElement;
    await waitFor(() => expect(confirm.disabled).toBe(false));
    fireEvent.click(confirm);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/logg-inn"));
    expect(calls.filter((call) => call === "DELETE /api/identity/me")).toHaveLength(1);
    // She deleted it herself: the flag is gone, so no «Du er logget ut».
    expect(window.sessionStorage.getItem("sk_signed_in")).toBeNull();
    expect(clear).toHaveBeenCalled();
  });

  it("FR-5: «Avbryt», Esc og krysset sender ingen DELETE", async () => {
    const calls = respond();
    renderPage();
    await heading();
    const opener = screen.getByRole("button", { name: "Slett kontoen …" });

    fireEvent.click(opener);
    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));
    fireEvent.click(opener);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole("button", { name: "Lukk" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(calls.some((call) => call.startsWith("DELETE"))).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });

  it("FR-5: en serverfeil på DELETE lar dialogen stå med reserveteksten", async () => {
    respond({ deleteStatus: 500 });
    renderPage();
    await heading();
    fireEvent.click(screen.getByRole("button", { name: "Slett kontoen …" }));
    const dialog = screen.getByRole("dialog", { name: "Slette kontoen?" });
    const confirm = within(dialog).getByRole("button", { name: "Slett kontoen" }) as HTMLButtonElement;
    await waitFor(() => expect(confirm.disabled).toBe(false));
    fireEvent.click(confirm);

    expect(await within(dialog).findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("dialog", { name: "Slette kontoen?" })).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  it("UX-DR39: «Logg ut» i kortet logger ut og går til innloggingen uten melding", async () => {
    const calls = respond();
    renderPage();
    markSignedIn();
    await heading();
    const card = screen.getByRole("region", { name: "Innlogging" });
    fireEvent.click(within(card).getByRole("button", { name: "Logg ut" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/logg-inn"));
    expect(calls.filter((call) => call === "POST /api/identity/logout")).toHaveLength(1);
    expect(window.sessionStorage.getItem("sk_signed_in")).toBeNull();
  });

  it("UX-DR39: feiler utloggingen, står reserveteksten i kortet", async () => {
    respond({ logoutStatus: 500 });
    renderPage();
    await heading();
    const card = screen.getByRole("region", { name: "Innlogging" });
    fireEvent.click(within(card).getByRole("button", { name: "Logg ut" }));

    expect(await within(card).findByRole("alert")).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });
});
