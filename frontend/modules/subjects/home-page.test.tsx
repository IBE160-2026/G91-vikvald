// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { focusHeadingAfterNavigation, headingFocusPending, resetHeadingFocus } from "@/lib/focus-heading";

import type { Overview } from "@/modules/practice/types";

import { HomePage } from "./pages/home-page";
import type { Subject } from "./types";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), notFound: vi.fn() }));

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function subject(overrides: Partial<Subject>): Subject {
  return {
    id: "s1",
    name: "Markedsføring",
    exam_date: "2026-12-04",
    color_index: 0,
    lecture_count: 0,
    created_at: "2026-11-21T10:00:00Z",
    ...overrides,
  };
}

// The overview for `list`: each subject with `total` lectures, the first
// `practiced` of them practised (story 5.3).
function overviewFor(list: Subject[], counts: Record<string, [number, number]> = {}): Overview {
  return {
    subjects: list.map((item) => {
      const [practiced, total] = counts[item.id] ?? [0, 0];
      return {
        id: item.id,
        name: item.name,
        color_index: item.color_index,
        exam_date: item.exam_date,
        lectures: Array.from({ length: total }, (_, index) => ({
          id: `${item.id}-l${index}`,
          name: `Uke ${index}`,
          date: "2026-09-11",
          practiced: index < practiced,
          last_practiced_at: index < practiced ? "2026-11-03T10:00:00Z" : null,
        })),
        last_session: null,
      };
    }),
  };
}

// GET /api/subjects answers with `list`, GET /api/overview with `overview`
// (built from `list` when not given; a function answers itself); POST answers
// with `created` (or `postResponse`).
function respond(
  list: Subject[],
  postResponse?: () => Response,
  overview: Overview | (() => Response | Promise<Response>) = overviewFor(list),
) {
  fetchMock.mockImplementation(async (url, init) => {
    if (init?.method === "POST") return postResponse ? postResponse() : jsonResponse(500, {});
    if (String(url) === "/api/overview") return typeof overview === "function" ? overview() : jsonResponse(200, overview);
    return jsonResponse(200, list);
  });
}

// The subject list from epic 2 (the last list on the page, under the exam lines).
function subjectList(): HTMLElement {
  const lists = screen.getAllByRole("list");
  return lists[lists.length - 1];
}

// The exam lines over the subject list (story 5.3).
function examLines(): HTMLElement {
  return screen.getAllByRole("list")[0];
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <HomePage />
    </QueryClientProvider>,
  );
}

function errorFor(input: HTMLElement): string | null | undefined {
  const id = input.getAttribute("aria-describedby");
  return id ? document.getElementById(id)?.textContent : null;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 21, 12));
});

afterEach(() => {
  resetHeadingFocus();
  cleanup();
  fetchMock.mockReset();
  push.mockReset();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("forsiden «Dine emner»", () => {
  it("FR-6: h1 og undertittel med semester og dagens dato", async () => {
    respond([]);
    renderPage();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Dine emner");
    expect(screen.getByText("Høstsemesteret 2026 · lørdag 21. november")).toBeTruthy();
  });

  it("UX-DR15: uten emner står setningen og «Lag ditt første emne», ingen liste og ingen h2", async () => {
    respond([]);
    renderPage();
    expect(
      await screen.findByText(
        "Studiekamerat lager flashcards og quiz fra forelesningsnotatene dine, så du kan øve fram mot eksamen.",
      ),
    ).toBeTruthy();
    const button = screen.getByRole("button", { name: "Lag ditt første emne" });
    expect(button.getAttribute("data-variant")).toBe("primary");
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Nytt emne" })).toBeNull();
  });

  it("FR-6: med emner er det ett listeelement per emne med prikk, lenke, antall og eksamen", async () => {
    respond([
      subject({ id: "a", name: "Markedsføring", color_index: 0 }),
      subject({ id: "b", name: "Samfunnsøkonomi", color_index: 1, exam_date: "2026-12-11", lecture_count: 1 }),
    ]);
    renderPage();
    await screen.findAllByRole("link");
    const items = within(subjectList()).getAllByRole("listitem");
    expect(items).toHaveLength(2);

    const first = within(items[0]);
    expect(first.getByRole("link").textContent).toBe("Markedsføring");
    expect(first.getByRole("link").getAttribute("href")).toBe("/emner/a");
    expect(first.getByText("0 forelesninger")).toBeTruthy();
    expect(first.getByText("Eksamen 04.12.2026")).toBeTruthy();
    const dot = items[0].querySelector("[data-color-index]");
    expect(dot?.getAttribute("aria-hidden")).toBe("true");
    expect(dot?.className).toContain("bg-subject-1");

    const second = within(items[1]);
    expect(second.getByRole("link").getAttribute("href")).toBe("/emner/b");
    expect(second.getByText("1 forelesning")).toBeTruthy();
    expect(second.getByText("Eksamen 11.12.2026")).toBeTruthy();
    expect(items[1].querySelector("[data-color-index]")?.className).toContain("bg-subject-2");

    const newButton = screen.getByRole("button", { name: "Nytt emne" });
    expect(newButton.getAttribute("data-variant")).toBe("outline");
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("UX-DR21: «Nytt emne» åpner dialogen med fokus i «Navn» og knappen «Opprett emne»", async () => {
    respond([subject({})]);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Nytt emne" }));
    const dialog = screen.getByRole("dialog", { name: "Nytt emne" });
    expect(document.activeElement).toBe(within(dialog).getByLabelText("Navn"));
    expect(within(dialog).getByLabelText("Eksamensdato")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Opprett emne" })).toBeTruthy();
  });

  it("FR-6: navnefeltet tar høyst 200 tegn, som backenden", async () => {
    respond([]);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Lag ditt første emne" }));
    expect(screen.getByLabelText("Navn").getAttribute("maxlength")).toBe("200");
  });

  it("FR-1: feil når emnene hentes gir reserveteksten, ingen liste og ingen «Lag ditt første emne»", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: { code: "INTERNAL_ERROR", details: {} } }));
    renderPage();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Noe gikk galt. Prøv igjen.");
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByRole("button", { name: "Lag ditt første emne" })).toBeNull();
  });

  it("E35: tomt navn og ugyldig dato stopper kallet, viser meldingene og flytter fokus til navnet", async () => {
    respond([]);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Lag ditt første emne" }));
    const name = screen.getByLabelText("Navn");
    const date = screen.getByLabelText("Eksamensdato");
    fireEvent.change(name, { target: { value: "   " } });
    fireEvent.change(date, { target: { value: "31.02.2026" } });
    date.focus();
    fireEvent.click(screen.getByRole("button", { name: "Opprett emne" }));
    await waitFor(() => expect(document.activeElement).toBe(name));
    expect(errorFor(name)).toBe("Skriv inn et navn.");
    expect(errorFor(date)).toBe("Skriv inn eksamensdatoen, for eksempel 04.12.2026.");
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  });

  it("FR-6: bare datofeil flytter fokus til datofeltet", async () => {
    respond([]);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Lag ditt første emne" }));
    fireEvent.change(screen.getByLabelText("Navn"), { target: { value: "Markedsføring" } });
    const date = screen.getByLabelText("Eksamensdato");
    fireEvent.change(date, { target: { value: "2026-12-04" } });
    fireEvent.click(screen.getByRole("button", { name: "Opprett emne" }));
    await waitFor(() => expect(document.activeElement).toBe(date));
    expect(errorFor(date)).toBe("Skriv inn eksamensdatoen, for eksempel 04.12.2026.");
  });

  it("FR-6: Enter i et felt sender trimmet navn og ISO-dato, og går til /emner/{id}", async () => {
    respond([], () => jsonResponse(201, subject({ id: "ny" })));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Lag ditt første emne" }));
    fireEvent.change(screen.getByLabelText("Navn"), { target: { value: " Markedsføring " } });
    const date = screen.getByLabelText("Eksamensdato");
    fireEvent.change(date, { target: { value: "4.12.2026" } });
    fireEvent.keyDown(date, { key: "Enter" });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/emner/ny"));
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(post?.[0]).toBe("/api/subjects");
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ name: "Markedsføring", exam_date: "2026-12-04" });
  });

  it("E35: NAME_REQUIRED fra API-et vises under navnet", async () => {
    respond([], () => jsonResponse(422, { error: { code: "NAME_REQUIRED", details: {} } }));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Lag ditt første emne" }));
    const name = screen.getByLabelText("Navn");
    fireEvent.change(name, { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("Eksamensdato"), { target: { value: "04.12.2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Opprett emne" }));
    await waitFor(() => expect(errorFor(name)).toBe("Skriv inn et navn."));
    expect(document.activeElement).toBe(name);
  });

  it("FR-1: annen feil fra API-et gir reserveteksten i dialogen", async () => {
    respond([], () => jsonResponse(500, { error: { code: "INTERNAL_ERROR", details: {} } }));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Lag ditt første emne" }));
    fireEvent.change(screen.getByLabelText("Navn"), { target: { value: "Markedsføring" } });
    fireEvent.change(screen.getByLabelText("Eksamensdato"), { target: { value: "04.12.2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Opprett emne" }));
    const alert = await within(screen.getByRole("dialog")).findByRole("alert");
    expect(alert.textContent).toBe("Noe gikk galt. Prøv igjen.");
    expect(push).not.toHaveBeenCalled();
  });

  it("UX-DR21: Esc lukker uten å opprette, og dialogen er tom neste gang", async () => {
    respond([]);
    renderPage();
    const opener = await screen.findByRole("button", { name: "Lag ditt første emne" });
    fireEvent.click(opener);
    fireEvent.change(screen.getByLabelText("Navn"), { target: { value: "Halvveis" } });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(opener);
    expect((screen.getByLabelText("Navn") as HTMLInputElement).value).toBe("");
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  });
  it("#75: etter at et emne er slettet, får «Dine emner» fokus når lista er lastet", async () => {
    focusHeadingAfterNavigation();
    respond([subject({})]);
    renderPage();
    const heading = screen.getByRole("heading", { level: 1, name: "Dine emner" });
    expect(heading.getAttribute("tabindex")).toBe("-1");
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(headingFocusPending()).toBe(false);
  });

  it("#75: uten slettet emne får overskriften ikke fokus", async () => {
    respond([subject({})]);
    renderPage();
    await screen.findByRole("link", { name: "Markedsføring" });
    expect(document.activeElement).not.toBe(screen.getByRole("heading", { level: 1 }));
  });

  describe("eksamenslinja (story 5.3)", () => {
    const TWO = [
      subject({ id: "a", name: "Markedsføring", lecture_count: 8 }),
      subject({ id: "b", name: "Samfunnsøkonomi", color_index: 1, exam_date: "2026-12-11", lecture_count: 1 }),
    ];

    it("SK-22: én linje per emne med navnet og «Eksamen dd.mm, om N uker · N av M forelesninger øvd», over emnelista", async () => {
      respond(TWO, undefined, overviewFor(TWO, { a: [4, 8], b: [0, 1] }));
      renderPage();
      expect(await screen.findByText("Eksamen 04.12, om 2 uker · 4 av 8 forelesninger øvd")).toBeTruthy();
      const lines = within(examLines()).getAllByRole("listitem");
      expect(lines).toHaveLength(2);
      expect(within(lines[0]).getByText("Markedsføring").className).toContain("text-item-title");
      const text = within(lines[0]).getByText("Eksamen 04.12, om 2 uker · 4 av 8 forelesninger øvd");
      expect(text.className).toContain("text-meta");
      expect(text.className).toContain("text-ink-muted");
      expect(text.closest("[aria-hidden]")).toBeNull();
      expect(text.closest("[aria-live]")).toBeNull();
      expect(within(lines[1]).getByText("Samfunnsøkonomi")).toBeTruthy();
      expect(within(lines[1]).getByText("Eksamen 11.12, om 3 uker · 0 av 1 forelesning øvd")).toBeTruthy();
      // The lines stand before the subject list, which is as before.
      expect(examLines().compareDocumentPosition(subjectList()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(within(subjectList()).getAllByRole("listitem")).toHaveLength(2);
      expect(within(subjectList()).getByText("Eksamen 04.12.2026")).toBeTruthy();
    });

    it("FR-57: et emne uten forelesninger viser «Ingen forelesninger ennå»", async () => {
      respond([subject({ id: "a" })]);
      renderPage();
      expect(await screen.findByText("Eksamen 04.12, om 2 uker · Ingen forelesninger ennå")).toBeTruthy();
    });

    it("FR-57: før oversikten er lastet står bare eksamensdelen", async () => {
      respond(TWO, undefined, () => new Promise<Response>(() => {}));
      renderPage();
      const lines = await waitFor(() => within(examLines()).getAllByRole("listitem"));
      expect(within(lines[0]).getByText("Eksamen 04.12, om 2 uker")).toBeTruthy();
      expect(within(lines[1]).getByText("Eksamen 11.12, om 3 uker")).toBeTruthy();
    });

    it("FR-57: når oversikten feiler, står bare eksamensdelen uten egen feilmelding", async () => {
      respond(TWO, undefined, () => jsonResponse(500, { error: { code: "INTERNAL_ERROR", details: {} } }));
      renderPage();
      await waitFor(() =>
        expect(fetchMock.mock.calls.some(([url]) => String(url) === "/api/overview")).toBe(true),
      );
      const lines = await waitFor(() => within(examLines()).getAllByRole("listitem"));
      await waitFor(() => expect(within(lines[0]).getByText("Eksamen 04.12, om 2 uker")).toBeTruthy());
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.queryByText(/forelesninger øvd/)).toBeNull();
    });

    it("FR-57: uten emner er det ingen linjer", async () => {
      respond([]);
      renderPage();
      await screen.findByRole("button", { name: "Lag ditt første emne" });
      expect(screen.queryByRole("list")).toBeNull();
      expect(screen.queryByText(/Eksamen/)).toBeNull();
    });
  });
});
