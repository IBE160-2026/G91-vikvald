// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SubjectPage } from "./pages/subject-page";
import type { Subject } from "./types";

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
  lecture_count: 0,
  created_at: "2026-11-21T10:00:00Z",
};
const ECONOMICS: Subject = { ...MARKETING, id: "b", name: "Samfunnsøkonomi og et veldig langt navn", color_index: 1 };

// A small fake backend for the two subjects.
function respond() {
  const store = new Map([MARKETING, ECONOMICS].map((s) => [s.id, { ...s }]));
  fetchMock.mockImplementation(async (url, init) => {
    const path = String(url);
    if (path === "/api/subjects") return jsonResponse(200, [...store.values()]);
    const id = path.split("/").pop()!;
    const found = store.get(id);
    if (!found) return jsonResponse(404, { error: { code: "NOT_FOUND", details: {} } });
    if (init?.method === "PATCH") {
      const body = JSON.parse(String(init.body));
      if (typeof body.name === "string" && body.name.trim() === "") {
        return jsonResponse(422, { error: { code: "NAME_REQUIRED", details: {} } });
      }
      Object.assign(found, body);
    }
    return jsonResponse(200, found);
  });
}

function renderPage(id = "a") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SubjectPage subjectId={id} />
    </QueryClientProvider>,
  );
}

function patchCalls() {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH");
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

describe("emnesiden", () => {
  it("FR-6: h1 navnet, «Eksamen fredag 04.12.2026», knappene og tittelen", async () => {
    renderPage();
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Markedsføring");
    expect(screen.getByText("Eksamen fredag 04.12.2026")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nytt navn" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Endre eksamensdato" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Ny forelesning" }) as HTMLButtonElement).disabled).toBe(true);
    await waitFor(() => expect(document.title).toBe("Markedsføring – Studiekamerat"));
  });

  it("UX-DR7: sidemenyen heter «Emner», har én lenke per emne og aria-current på det åpne", async () => {
    renderPage();
    const nav = await screen.findByRole("navigation", { name: "Emner" });
    expect(within(nav).getByText("EMNER")).toBeTruthy();
    const links = await within(nav).findAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/emner/a", "/emner/b"]);
    expect(links[0].getAttribute("aria-current")).toBe("page");
    expect(links[0].className).toContain("bg-brand-tint");
    expect(links[0].className).toContain("before:bg-brand");
    expect(links[1].hasAttribute("aria-current")).toBe(false);
    expect(nav.className).toContain("w-sidebar-width");
    expect(nav.className).toContain("border-divider");
  });

  it("UX-DR7: lenkens tilgjengelige navn er hele emnenavnet, navnet kortes av med CSS, antallet står til høyre", async () => {
    renderPage();
    const nav = await screen.findByRole("navigation", { name: "Emner" });
    const link = await within(nav).findByRole("link", { name: ECONOMICS.name });
    expect(within(link).getByText(ECONOMICS.name).className).toContain("truncate");
    expect(within(link).getByText("0").getAttribute("aria-hidden")).toBe("true");
    const description = document.getElementById(link.getAttribute("aria-describedby") ?? "");
    expect(description?.textContent).toBe("0 forelesninger");
    expect(link.querySelector("[data-color-index]")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("FR-6: «Nytt navn» viser dagens navn, lagrer med PATCH og oppdaterer h1 og sidemenyen", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Nytt navn" }));
    const dialog = screen.getByRole("dialog", { name: "Nytt navn" });
    const name = within(dialog).getByLabelText("Navn") as HTMLInputElement;
    expect(name.value).toBe("Markedsføring");
    expect(within(dialog).queryByLabelText("Eksamensdato")).toBeNull();
    fireEvent.change(name, { target: { value: "  Markedsføring 2 " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Lagre" }));

    await waitFor(() => expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Markedsføring 2"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(JSON.parse(String(patchCalls()[0][1]?.body))).toEqual({ name: "Markedsføring 2" });
    const nav = screen.getByRole("navigation", { name: "Emner" });
    expect(within(nav).getByRole("link", { name: "Markedsføring 2" })).toBeTruthy();
  });

  it("FR-6: «Endre eksamensdato» viser dagens dato og oppdaterer linja", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Endre eksamensdato" }));
    const dialog = screen.getByRole("dialog", { name: "Endre eksamensdato" });
    const date = within(dialog).getByLabelText("Eksamensdato") as HTMLInputElement;
    expect(date.value).toBe("04.12.2026");
    expect(within(dialog).queryByLabelText("Navn")).toBeNull();
    fireEvent.change(date, { target: { value: "11.12.2026" } });
    fireEvent.keyDown(date, { key: "Enter" });
    expect(await screen.findByText("Eksamen fredag 11.12.2026")).toBeTruthy();
    expect(JSON.parse(String(patchCalls()[0][1]?.body))).toEqual({ exam_date: "2026-12-11" });
  });

  it("E35: tomt navn stopper kallet og viser «Skriv inn et navn.»", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Nytt navn" }));
    const name = screen.getByLabelText("Navn");
    fireEvent.change(name, { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => expect(name.getAttribute("aria-invalid")).toBe("true"));
    expect(document.getElementById(name.getAttribute("aria-describedby")!)?.textContent).toBe("Skriv inn et navn.");
    expect(patchCalls()).toHaveLength(0);
  });

  it("FR-1: annen feil enn 404 når emnet hentes gir reserveteksten, ikke «Fant ikke siden»", async () => {
    fetchMock.mockImplementation(async (url) =>
      String(url) === "/api/subjects"
        ? jsonResponse(200, [MARKETING])
        : jsonResponse(500, { error: { code: "INTERNAL_ERROR", details: {} } }),
    );
    renderPage();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Noe gikk galt. Prøv igjen.");
    expect(notFound).not.toHaveBeenCalled();
  });

  it.each(["Nytt navn", "Endre eksamensdato"])(
    "FR-1: feil fra PATCH i «%s» gir reserveteksten i dialogen, som blir stående åpen",
    async (opener) => {
      fetchMock.mockImplementation(async (url, init) => {
        if (init?.method === "PATCH") return jsonResponse(500, { error: { code: "INTERNAL_ERROR", details: {} } });
        return jsonResponse(200, String(url) === "/api/subjects" ? [MARKETING] : MARKETING);
      });
      renderPage();
      fireEvent.click(await screen.findByRole("button", { name: opener }));
      const dialog = screen.getByRole("dialog", { name: opener });
      fireEvent.click(within(dialog).getByRole("button", { name: "Lagre" }));
      const alert = await within(dialog).findByRole("alert");
      expect(alert.textContent).toBe("Noe gikk galt. Prøv igjen.");
      expect(screen.getByRole("dialog", { name: opener })).toBeTruthy();
    },
  );

  it("FR-4: ukjent eller andres emne gir «Fant ikke siden»", async () => {
    renderPage("finnes-ikke");
    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });
});
