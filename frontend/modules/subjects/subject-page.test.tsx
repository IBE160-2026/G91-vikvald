// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { focusHeadingAfterNavigation, headingFocusPending, resetHeadingFocus } from "@/lib/focus-heading";

import { SubjectPage } from "./pages/subject-page";
import type { SubjectFileCounts } from "@/modules/files/types";
import type { SubjectFlashcard } from "@/modules/practice/types";
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

// Two files in Uke 37, none in Uke 38.
const FILE_COUNTS: SubjectFileCounts = {
  file_count: 2,
  lectures: [{ lecture_id: "l1", file_count: 2, page_count: 18 }],
};

// The cards GET /api/subjects/a/flashcards answers with (none by default).
let subjectFlashcards: SubjectFlashcard[] = [];

function flashcard(id: string, lectureId: string): SubjectFlashcard {
  return {
    id,
    kind: "concept",
    front: id,
    back: `${id} er et begrep i faget.`,
    source: { file_id: "f1", file_name: "notater.pdf", page_no: 1 },
    lecture: { id: lectureId, name: lectureId },
  };
}

// A small fake backend for the two subjects, their lectures and file counts.
function respond(lectures: Lecture[] = LECTURES, fileCounts: SubjectFileCounts = FILE_COUNTS) {
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
    const counts = path.match(/^\/api\/subjects\/([^/]+)\/file-counts$/);
    if (counts) {
      if (!store.has(counts[1])) return jsonResponse(404, { error: { code: "NOT_FOUND", details: {} } });
      return jsonResponse(200, counts[1] === "a" ? fileCounts : { file_count: 0, lectures: [] });
    }
    const cards = path.match(/^\/api\/subjects\/([^/]+)\/flashcards$/);
    if (cards) {
      if (!store.has(cards[1])) return jsonResponse(404, { error: { code: "NOT_FOUND", details: {} } });
      return jsonResponse(200, cards[1] === "a" ? subjectFlashcards : []);
    }
    const preview = path.match(/^\/api\/subjects\/([^/]+)\/delete-preview$/);
    if (preview) {
      const own = lectureStore.filter((lecture) => lecture.subject_id === preview[1]);
      const counts = [
        { kind: "lectures", count: own.length },
        { kind: "files", count: preview[1] === "a" ? fileCounts.file_count : 0 },
      ].filter((count) => count.count > 0);
      return jsonResponse(200, { counts });
    }
    const id = path.split("/").pop()!;
    const found = store.get(id);
    if (found && init?.method === "DELETE") {
      store.delete(id);
      return new Response(null, { status: 204 });
    }
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
  return client;
}

function patchCalls() {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH");
}

function postCalls() {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");
}

beforeEach(() => {
  subjectFlashcards = [];
  vi.stubGlobal("fetch", fetchMock);
  respond();
});

afterEach(() => {
  resetHeadingFocus();
  cleanup();
  fetchMock.mockReset();
  notFound.mockClear();
  push.mockClear();
  vi.unstubAllGlobals();
});

describe("emnesiden", () => {
  it("UX-DR13: h1 navnet, «2 forelesninger · 2 filer · eksamen fredag 04.12.2026», knappene og tittelen", async () => {
    renderPage();
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Markedsføring");
    expect(await screen.findByText("2 forelesninger · 2 filer · eksamen fredag 04.12.2026")).toBeTruthy();
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

  it("UX-DR26: nederst i sidemenyen står knappen «? Hurtigtaster» med tasten i kbd og teksten i dempet grå", async () => {
    renderPage();
    const nav = await screen.findByRole("navigation", { name: "Emner" });
    const shortcuts = within(nav).getByRole("button", { name: "? Hurtigtaster" });
    expect(shortcuts.querySelector("kbd")?.textContent).toBe("?");
    expect(shortcuts.className).toContain("text-ink-muted");
    expect(shortcuts.parentElement?.className).toContain("mt-auto");
    expect(nav.lastElementChild?.contains(shortcuts)).toBe(true);
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
    expect(await screen.findByText("2 forelesninger · 2 filer · eksamen fredag 11.12.2026")).toBeTruthy();
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
        if (String(url).endsWith("/flashcards")) return jsonResponse(200, []);
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
    expect(headers).toEqual(["Dato", "Forelesning", "Filer", "Status"]);
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

  it("UX-DR13: Filer og Status: tallet og «Ikke øvd ennå» med hul prikk, ellers «–» og «Ingen filer ennå»", async () => {
    renderPage();
    const table = await screen.findByRole("table");
    await waitFor(() => expect(within(table).getAllByText("Ingen filer ennå")).toHaveLength(1));
    const rows = within(table).getAllByRole("row").slice(1);
    const cells = rows.map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent));
    expect(cells).toEqual([
      ["11.09", "Uke 37: Merkevare", "2", "Ikke øvd ennå"],
      ["18.09", "Uke 38: Prising og et veldig langt navn som kortes av", "–", "Ingen filer ennå"],
    ]);
    const filesCell = within(rows[0]).getAllByRole("cell")[2];
    expect(filesCell.className).toContain("text-right");
    const dot = rows[0].querySelector('[data-status="not-practised"]');
    expect(dot?.getAttribute("aria-hidden")).toBe("true");
    expect(rows[1].querySelector("[data-status]")).toBeNull();
    // The arrow is still at the far right, and the whole row is still the link.
    const lastCell = within(rows[0]).getAllByRole("cell")[3];
    expect(lastCell.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(within(rows[0]).getByRole("link").className).toContain("after:inset-0");
  });

  it("UX-DR13: entall «1 forelesning · 1 fil» og «0 filer» uten filer", async () => {
    respond([LECTURES[0]], { file_count: 1, lectures: [{ lecture_id: "l1", file_count: 1, page_count: 3 }] });
    renderPage();
    expect(await screen.findByText("1 forelesning · 1 fil · eksamen fredag 04.12.2026")).toBeTruthy();
    cleanup();
    respond([], { file_count: 0, lectures: [] });
    renderPage();
    expect(await screen.findByText("0 forelesninger · 0 filer · eksamen fredag 04.12.2026")).toBeTruthy();
  });

  it("FR-1: feil når filtellingene hentes gir reserveteksten ved tabellen", async () => {
    respond();
    const fake = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, init) =>
      String(url).endsWith("/file-counts")
        ? jsonResponse(500, { error: { code: "INTERNAL_ERROR", details: {} } })
        : fake(url, init),
    );
    renderPage();
    const section = (await screen.findByRole("heading", { level: 2, name: "Forelesninger etter dato" })).closest(
      "section",
    )!;
    const alert = await within(section).findByRole("alert");
    expect(alert.textContent).toBe("Noe gikk galt. Prøv igjen.");
    expect(screen.getByText("2 forelesninger · eksamen fredag 04.12.2026")).toBeTruthy();
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
  it("FR-6: «Slett emnet» viser forelesningene og filene som går med, og tar henne til forsiden", async () => {
    renderPage();
    await screen.findByText("2 forelesninger · 2 filer · eksamen fredag 04.12.2026");
    const buttons = within(screen.getByRole("button", { name: "Nytt navn" }).parentElement!)
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(buttons).toEqual(["Nytt navn", "Endre eksamensdato", "Slett emnet"]);
    const button = screen.getByRole("button", { name: "Slett emnet" });
    expect(button.getAttribute("data-variant")).toBe("outline");
    expect(button.className).toContain("text-danger");
    button.focus();
    fireEvent.click(button);

    const dialog = screen.getByRole("dialog", { name: "Slette emnet?" });
    expect(within(dialog).getByText("Markedsføring")).toBeTruthy();
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Avbryt" }));
    expect(await within(dialog).findByText("Dette sletter også 2 forelesninger og 2 filer.")).toBeTruthy();
    expect(within(dialog).getByText("Det kan ikke angres.")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Slett emnet" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(headingFocusPending()).toBe(true);
    expect(notFound).not.toHaveBeenCalled();
    const deletes = fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE");
    expect(deletes.map(([url]) => String(url))).toEqual(["/api/subjects/a"]);
  });

  it("UX-DR21: Esc på «Slette emnet?» sletter ingenting, og fokus går tilbake til knappen", async () => {
    renderPage();
    const button = await screen.findByRole("button", { name: "Slett emnet" });
    button.focus();
    fireEvent.click(button);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(button));
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);
  });

  it("#75: etter at en forelesning er slettet, får h1 fokus når emnesiden er lastet", async () => {
    focusHeadingAfterNavigation();
    renderPage();
    const heading = await screen.findByRole("heading", { level: 1, name: "Markedsføring" });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(heading.getAttribute("tabindex")).toBe("-1");
    expect(headingFocusPending()).toBe(false);
  });

  describe("Øv på hele emnet (story 3.6)", () => {
    function practiceSection() {
      return screen.getByRole("region", { name: "Øv på hele emnet" });
    }

    it("FR-23, UX-DR14: raden Flashcards med «5 kort fra 2 forelesninger» og lenken «Øv på flashcards»", async () => {
      subjectFlashcards = ["a", "b", "c"].map((id) => flashcard(id, "l1")).concat(["d", "e"].map((id) => flashcard(id, "l2")));
      renderPage();
      expect(await screen.findByText("5 kort fra 2 forelesninger")).toBeTruthy();
      const section = practiceSection();
      expect(within(section).getByRole("heading", { level: 2, name: "Øv på hele emnet" })).toBeTruthy();
      expect(within(section).getByRole("heading", { level: 3, name: "Flashcards" })).toBeTruthy();
      const link = within(section).getByRole("link", { name: "Øv på flashcards" });
      expect(link.getAttribute("href")).toBe("/emner/a/flashcards");
      expect(link.dataset.variant).toBe("primary");
      // Next to the table when there is room (container query), otherwise under it.
      const column = section.parentElement!;
      expect(column.className).toContain("@min-[1008px]:w-[344px]");
      expect(column.parentElement!.className).toContain("@min-[1008px]:flex-row");
      expect(column.previousElementSibling!.querySelector("h2")!.textContent).toBe("Forelesninger etter dato");
    });

    it("FR-23: ett kort står i entall: «1 kort fra 1 forelesning»", async () => {
      subjectFlashcards = [flashcard("a", "l1")];
      renderPage();
      expect(await screen.findByText("1 kort fra 1 forelesning")).toBeTruthy();
    });

    it("UX-DR14: uten kort vises ingen seksjon «Øv på hele emnet»", async () => {
      const client = renderPage();
      expect(await screen.findByRole("table")).toBeTruthy();
      // Wait until the empty card list has arrived, not only been asked for.
      await waitFor(() => expect(client.getQueryState(["subjects", "a", "flashcards"])?.status).toBe("success"));
      expect(screen.queryByRole("region", { name: "Øv på hele emnet" })).toBeNull();
      expect(screen.queryByText("Øv på hele emnet")).toBeNull();
    });

    it("FR-23: feil når kortene hentes gir reserveteksten i seksjonen", async () => {
      respond();
      const fake = fetchMock.getMockImplementation()!;
      fetchMock.mockImplementation(async (url, init) =>
        String(url).endsWith("/flashcards")
          ? jsonResponse(500, { error: { code: "INTERNAL_ERROR", details: {} } })
          : fake(url, init),
      );
      renderPage();
      const alert = await within(await screen.findByRole("region", { name: "Øv på hele emnet" })).findByRole("alert");
      expect(alert.textContent).toBe("Noe gikk galt. Prøv igjen.");
    });
  });
});
