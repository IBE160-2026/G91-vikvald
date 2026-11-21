// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LecturePage } from "./pages/lecture-page";
import type { Lecture, Subject } from "./types";

// The real notFound() throws to show app/(app)/not-found.tsx; here it only records the call.
const notFound = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), notFound: () => notFound() }));

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const MARKETING: Subject = {
  id: "a",
  name: "Markedsføring",
  exam_date: "2026-12-04",
  color_index: 0,
  lecture_count: 2,
  created_at: "2026-11-21T10:00:00Z",
};
const ECONOMICS: Subject = { ...MARKETING, id: "b", name: "Samfunnsøkonomi", color_index: 1, lecture_count: 0 };

// A small fake backend that sorts the lectures by date like the real one.
function respond() {
  const lectures: Lecture[] = [
    { id: "l1", subject_id: "a", name: "Uke 37: Merkevare", date: "2026-09-11", created_at: "1" },
    { id: "l2", subject_id: "a", name: "Uke 38: Prising", date: "2026-09-18", created_at: "2" },
  ];
  fetchMock.mockImplementation(async (url, init) => {
    const path = String(url);
    if (path === "/api/subjects") return jsonResponse(200, [MARKETING, ECONOMICS]);
    if (path === "/api/subjects/a/lectures") {
      const sorted = [...lectures].sort((x, y) => x.date.localeCompare(y.date) || x.created_at.localeCompare(y.created_at));
      return jsonResponse(200, sorted);
    }
    if (path === "/api/subjects/b/lectures") return jsonResponse(200, []);
    const found = lectures.find((lecture) => path === `/api/lectures/${lecture.id}`);
    if (!found) return jsonResponse(404, { error: { code: "NOT_FOUND", details: {} } });
    if (init?.method === "PATCH") Object.assign(found, JSON.parse(String(init.body)));
    return jsonResponse(200, found);
  });
}

function renderPage(id = "l2") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LecturePage lectureId={id} />
    </QueryClientProvider>,
  );
}

function lectureHrefs(nav: HTMLElement): (string | null)[] {
  return within(nav)
    .getAllByRole("link")
    .map((link) => link.getAttribute("href"))
    .filter((href) => href?.startsWith("/forelesninger/"));
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  respond();
});

afterEach(() => {
  cleanup();
  fetchMock.mockReset();
  notFound.mockClear();
  vi.unstubAllGlobals();
});

describe("forelesningssiden", () => {
  it("FR-7: h1 navnet, «Forelesning fredag 18.09.2026», knappene og tittelen", async () => {
    renderPage();
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Uke 38: Prising");
    expect(screen.getByText("Forelesning fredag 18.09.2026")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nytt navn" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Endre dato" })).toBeTruthy();
    await waitFor(() => expect(document.title).toBe("Uke 38: Prising – Studiekamerat"));
  });

  it("UX-DR7: sidemenyen har emnet åpent og forelesningen valgt, emnelenken er ikke valgt", async () => {
    renderPage();
    const nav = await screen.findByRole("navigation", { name: "Emner" });
    const current = await within(nav).findByRole("link", { name: "Uke 38: Prising" });
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(current.className).toContain("bg-brand-tint");
    expect(within(nav).getByRole("link", { name: "Uke 37: Merkevare" }).hasAttribute("aria-current")).toBe(false);
    expect(within(nav).getByRole("link", { name: "Markedsføring" }).hasAttribute("aria-current")).toBe(false);
    expect(within(nav).getByRole("button", { name: "Markedsføring" }).getAttribute("aria-expanded")).toBe("true");
    expect(within(nav).getByRole("button", { name: "Samfunnsøkonomi" }).getAttribute("aria-expanded")).toBe("false");
  });

  it("FR-15: «Endre dato» viser dagens dato, lagrer og flytter raden i sidemenyen uten omlasting", async () => {
    renderPage();
    const nav = await screen.findByRole("navigation", { name: "Emner" });
    await within(nav).findByRole("link", { name: "Uke 38: Prising" });
    expect(lectureHrefs(nav)).toEqual(["/forelesninger/l1", "/forelesninger/l2"]);

    fireEvent.click(screen.getByRole("button", { name: "Endre dato" }));
    const dialog = screen.getByRole("dialog", { name: "Endre dato" });
    const date = within(dialog).getByLabelText("Dato") as HTMLInputElement;
    expect(date.value).toBe("18.09.2026");
    expect(within(dialog).queryByLabelText("Navn")).toBeNull();
    fireEvent.change(date, { target: { value: "21.08.2026" } });
    fireEvent.keyDown(date, { key: "Enter" });

    expect(await screen.findByText("Forelesning fredag 21.08.2026")).toBeTruthy();
    await waitFor(() => expect(lectureHrefs(nav)).toEqual(["/forelesninger/l2", "/forelesninger/l1"]));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("FR-7: «Nytt navn» viser dagens navn og oppdaterer h1 og sidemenyen", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Nytt navn" }));
    const dialog = screen.getByRole("dialog", { name: "Nytt navn" });
    const name = within(dialog).getByLabelText("Navn") as HTMLInputElement;
    expect(name.value).toBe("Uke 38: Prising");
    fireEvent.change(name, { target: { value: " Uke 38: Pris " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Lagre" }));
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Uke 38: Pris"));
    const nav = screen.getByRole("navigation", { name: "Emner" });
    expect(await within(nav).findByRole("link", { name: "Uke 38: Pris" })).toBeTruthy();
  });

  it("FR-7: ugyldig dato gir «Skriv inn datoen, for eksempel 11.09.2026.» og ingen PATCH", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Endre dato" }));
    const date = screen.getByLabelText("Dato");
    fireEvent.change(date, { target: { value: "31.02.2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => expect(date.getAttribute("aria-invalid")).toBe("true"));
    expect(document.getElementById(date.getAttribute("aria-describedby")!)?.textContent).toBe(
      "Skriv inn datoen, for eksempel 11.09.2026.",
    );
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH")).toHaveLength(0);
  });

  it("FR-4: ukjent eller andres forelesning gir «Fant ikke siden»", async () => {
    renderPage("finnes-ikke");
    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });
});
