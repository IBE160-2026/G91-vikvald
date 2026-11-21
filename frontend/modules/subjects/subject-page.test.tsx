// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SubjectPage } from "./pages/subject-page";
import type { Lecture, Subject } from "./types";

// The real notFound() throws to show app/(app)/not-found.tsx; here it only records the call.
const notFound = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), notFound: () => notFound() }));

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

// Two lectures in Markedsføring, in the order the backend gives (by date).
const LECTURES: Lecture[] = [
  { id: "l1", subject_id: "a", name: "Uke 37: Merkevare", date: "2026-09-11", created_at: "2026-11-21T10:00:00Z" },
  {
    id: "l2",
    subject_id: "a",
    name: "Uke 38: Prising og et veldig langt navn som kortes av",
    date: "2026-09-18",
    created_at: "2026-11-21T10:01:00Z",
  },
];

// A small fake backend for the two subjects and their lectures.
function respond(lectures: Lecture[] = LECTURES) {
  const store = new Map([MARKETING, ECONOMICS].map((s) => [s.id, { ...s }]));
  const lectureStore = [...lectures];
  fetchMock.mockImplementation(async (url, init) => {
    const path = String(url);
    const counted = (subject: Subject) => ({
      ...subject,
      lecture_count: lectureStore.filter((lecture) => lecture.subject_id === subject.id).length,
    });
    if (path === "/api/subjects") return jsonResponse(200, [...store.values()].map(counted));
    const lectureList = path.match(/^\/api\/subjects\/([^/]+)\/lectures$/);
    if (lectureList) {
      const subjectId = lectureList[1];
      if (!store.has(subjectId)) return jsonResponse(404, { error: { code: "NOT_FOUND", details: {} } });
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        const created: Lecture = { id: `l${lectureStore.length + 1}`, subject_id: subjectId, ...body, created_at: "" };
        lectureStore.push(created);
        return jsonResponse(201, created);
      }
      return jsonResponse(
        200,
        lectureStore.filter((lecture) => lecture.subject_id === subjectId),
      );
    }
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
    return jsonResponse(200, counted(found));
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

function postCalls() {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  respond();
});

afterEach(() => {
  cleanup();
  fetchMock.mockReset();
  notFound.mockClear();
  push.mockClear();
  vi.unstubAllGlobals();
});

describe("emnesiden", () => {
  it("FR-6: h1 navnet, «Eksamen fredag 04.12.2026», knappene og tittelen", async () => {
    renderPage();
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Markedsføring");
    expect(screen.getByText("Eksamen fredag 04.12.2026")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nytt navn" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Endre eksamensdato" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Ny forelesning" }) as HTMLButtonElement).disabled).toBe(false);
    await waitFor(() => expect(document.title).toBe("Markedsføring – Studiekamerat"));
  });

  it("UX-DR7: sidemenyen heter «Emner», har én lenke per emne og aria-current på det åpne", async () => {
    respond([]);
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
    const marketing = within(nav).getByRole("link", { name: "Markedsføring" });
    expect(document.getElementById(marketing.getAttribute("aria-describedby") ?? "")?.textContent).toBe(
      "2 forelesninger",
    );
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
    // The page's own message (the sidebar may show one more for its lectures).
    const alerts = await screen.findAllByRole("alert");
    const pageAlert = alerts.find((alert) => !alert.closest("nav"));
    expect(pageAlert?.textContent).toBe("Noe gikk galt. Prøv igjen.");
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

  it("FR-15: tabellen viser forelesningene i API-rekkefølgen med dd.mm, lenke på navnet og pil", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { level: 2, name: "Forelesninger etter dato" })).toBeTruthy();
    const table = await screen.findByRole("table");
    const headers = within(table).getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual(["Dato", "Forelesning"]);
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual(["11.09", "18.09"]);
    const links = rows.map((row) => within(row).getByRole("link"));
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/forelesninger/l1", "/forelesninger/l2"]);
    expect(links[0].textContent).toBe("Uke 37: Merkevare");
    // The link covers the whole row.
    expect(rows[0].className).toContain("relative");
    expect(rows[0].className).toContain("hover:bg-row-hover");
    expect(links[0].className).toContain("after:inset-0");
    expect(rows[0].querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByText("Ingen forelesninger ennå.")).toBeNull();
  });

  it("UX-DR7: det åpne emnet viser forelesningene i samme rekkefølge med uke, hel tilgjengelig tittel og hul prikk", async () => {
    renderPage();
    const nav = await screen.findByRole("navigation", { name: "Emner" });
    const toggle = await within(nav).findByRole("button", { name: "Markedsføring" });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(within(nav).getByRole("button", { name: ECONOMICS.name }).getAttribute("aria-expanded")).toBe("false");
    const lectureLink = await within(nav).findByRole("link", { name: LECTURES[1].name });
    const links = within(nav)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("/forelesninger/"));
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/forelesninger/l1", "/forelesninger/l2"]);
    expect(within(lectureLink).getByText(LECTURES[1].name).className).toContain("truncate");
    expect(within(lectureLink).getByText("38").getAttribute("aria-hidden")).toBe("true");
    expect(document.getElementById(lectureLink.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Uke 38");
    const dot = lectureLink.querySelector("[data-status]");
    expect(dot?.getAttribute("aria-hidden")).toBe("true");
    expect(dot?.className).toContain("border");
    expect(lectureLink.hasAttribute("aria-current")).toBe(false);
  });

  it("UX-DR7: pilknappen lukker og åpner emnet, og aria-expanded følger med", async () => {
    renderPage();
    const nav = await screen.findByRole("navigation", { name: "Emner" });
    await within(nav).findByRole("link", { name: LECTURES[0].name });
    const toggle = within(nav).getByRole("button", { name: "Markedsføring" });
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(within(nav).queryByRole("link", { name: LECTURES[0].name })).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(await within(nav).findByRole("link", { name: LECTURES[0].name })).toBeTruthy();
  });

  it("FR-7: uten forelesninger står «Ingen forelesninger ennå.», ingen tabell og ingen rader i sidemenyen", async () => {
    respond([]);
    renderPage();
    expect(await screen.findByText("Ingen forelesninger ennå.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    const nav = screen.getByRole("navigation", { name: "Emner" });
    expect(within(nav).getByRole("button", { name: "Markedsføring" }).getAttribute("aria-expanded")).toBe("true");
    expect(within(nav).queryAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/emner/a",
      "/emner/b",
    ]);
  });

  it("FR-7: «Ny forelesning» har dagens dato, oppretter med POST og går til forelesningssiden", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 11, 12));
    try {
      renderPage();
      fireEvent.click(await screen.findByRole("button", { name: "Ny forelesning" }));
      const dialog = screen.getByRole("dialog", { name: "Ny forelesning" });
      expect((within(dialog).getByLabelText("Dato") as HTMLInputElement).value).toBe("11.09.2026");
      expect((within(dialog).getByLabelText("Navn") as HTMLInputElement).value).toBe("");
      fireEvent.change(within(dialog).getByLabelText("Navn"), { target: { value: " Uke 37: Merkevare " } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Opprett forelesning" }));
      await waitFor(() => expect(push).toHaveBeenCalledWith("/forelesninger/l3"));
      expect(String(postCalls()[0][0])).toBe("/api/subjects/a/lectures");
      expect(JSON.parse(String(postCalls()[0][1]?.body))).toEqual({ name: "Uke 37: Merkevare", date: "2026-09-11" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("FR-7: tomt navn og ugyldig dato i «Ny forelesning» gir begge meldingene og ingen POST", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Ny forelesning" }));
    const dialog = screen.getByRole("dialog", { name: "Ny forelesning" });
    const name = within(dialog).getByLabelText("Navn");
    const date = within(dialog).getByLabelText("Dato");
    fireEvent.change(date, { target: { value: "31.02.2026" } });
    fireEvent.keyDown(date, { key: "Enter" });
    await waitFor(() => expect(document.activeElement).toBe(name));
    expect(document.getElementById(name.getAttribute("aria-describedby")!)?.textContent).toBe("Skriv inn et navn.");
    expect(document.getElementById(date.getAttribute("aria-describedby")!)?.textContent).toBe(
      "Skriv inn datoen, for eksempel 11.09.2026.",
    );
    expect(postCalls()).toHaveLength(0);
  });

  it("FR-4: ukjent eller andres emne gir «Fant ikke siden»", async () => {
    renderPage("finnes-ikke");
    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });

  it("FR-15: tabellen og sidemenyen sorterer ikke på nytt, men viser API-rekkefølgen", async () => {
    // The fake backend gives the later date first; the frontend must keep that order.
    respond([LECTURES[1], LECTURES[0]]);
    renderPage();
    const table = await screen.findByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual(["18.09", "11.09"]);
    const nav = screen.getByRole("navigation", { name: "Emner" });
    await within(nav).findByRole("link", { name: LECTURES[0].name });
    const hrefs = within(nav)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href) => href?.startsWith("/forelesninger/"));
    expect(hrefs).toEqual(["/forelesninger/l2", "/forelesninger/l1"]);
  });

  it("FR-1: feil når forelesningene hentes gir reserveteksten i sidemenyen, ikke et tomt emne", async () => {
    fetchMock.mockImplementation(async (url) => {
      const path = String(url);
      if (path === "/api/subjects") return jsonResponse(200, [MARKETING]);
      if (path === "/api/subjects/a") return jsonResponse(200, MARKETING);
      return jsonResponse(500, { error: { code: "INTERNAL_ERROR", details: {} } });
    });
    renderPage();
    const nav = await screen.findByRole("navigation", { name: "Emner" });
    expect((await within(nav).findByRole("alert")).textContent).toBe("Noe gikk galt. Prøv igjen.");
  });
});
