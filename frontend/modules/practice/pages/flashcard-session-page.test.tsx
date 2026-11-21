// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SideMenuProvider } from "@/components/side-menu";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { SHORTCUTS_KEY } from "@/lib/practice-shortcuts";
import type { Lecture, Subject } from "@/modules/subjects/types";

import { lectureFlashcardsQueryKey } from "../api";
import type { Flashcard } from "../types";
import { FlashcardSessionPage } from "./flashcard-session-page";

const notFound = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  notFound: () => notFound(),
  usePathname: () => "/forelesninger/l1/flashcards",
}));

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const SUBJECT: Subject = {
  id: "s1",
  name: "Markedsføring",
  exam_date: "2026-12-04",
  color_index: 0,
  lecture_count: 1,
  created_at: "2026-11-21T10:00:00Z",
};
const LECTURE: Lecture = { id: "l1", subject_id: "s1", name: "Uke 37: Merkevare", date: "2026-09-11", created_at: "1" };

function card(id: string, front: string, page = 1): Flashcard {
  return {
    id,
    kind: "concept",
    front,
    back: `${front} er et begrep i faget.`,
    source: { file_id: "f1", file_name: "definisjoner.pdf", page_no: page },
  };
}

let cards: Flashcard[] = [];
let lectureStatus = 200;
let flashcardsStatus = 200;
let client: QueryClient;

beforeEach(() => {
  cards = [card("a", "Merkevare"), card("b", "Pris"), card("c", "Segment", 2)];
  lectureStatus = 200;
  flashcardsStatus = 200;
  notFound.mockReset();
  push.mockReset();
  // Just below 1: the shuffle keeps the order, so the test knows it.
  vi.spyOn(Math, "random").mockReturnValue(0.999);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async (url) => {
    const path = String(url);
    if (path === "/api/lectures/l1") {
      if (lectureStatus === 404) return jsonResponse(404, { error: { code: "NOT_FOUND", details: {} } });
      if (lectureStatus !== 200) return jsonResponse(lectureStatus, { error: { code: "INTERNAL_ERROR", details: {} } });
      return jsonResponse(200, LECTURE);
    }
    if (path === "/api/subjects/s1") return jsonResponse(200, SUBJECT);
    if (path === "/api/lectures/l1/flashcards") {
      if (flashcardsStatus !== 200) return jsonResponse(flashcardsStatus, { error: { code: "INTERNAL_ERROR", details: {} } });
      return jsonResponse(200, cards);
    }
    return jsonResponse(404, { error: { code: "NOT_FOUND", details: {} } });
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  document.title = "";
});

function renderPage(cached?: Flashcard[], { frame = false } = {}) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (cached) client.setQueryData(lectureFlashcardsQueryKey("l1"), cached);
  const page = <FlashcardSessionPage lectureId="l1" />;
  render(
    <QueryClientProvider client={client}>{frame ? <SideMenuProvider>{page}</SideMenuProvider> : page}</QueryClientProvider>,
  );
}

// A key pressed where focus is (the body when nothing has focus).
function press(key: string) {
  fireEvent.keyDown(document.activeElement ?? document.body, { key });
}

function front(): string {
  return document.querySelector("[data-slot='flashcard'] p:nth-of-type(2)")!.textContent!;
}

function button(name: string): HTMLButtonElement {
  return screen.getByRole("button", { name }) as HTMLButtonElement;
}

function counter(): string {
  return document.querySelector(".text-session-counter")!.textContent!;
}

describe("FlashcardSessionPage", () => {
  it("FR-24, FR-25: hel økt med «Kunne ikke» bakerst, fokus etter snuing og markering, og ferdig økt", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { level: 1, name: "Flashcards" })).toBeTruthy();
    await waitFor(() => expect(document.title).toBe("Flashcards – Uke 37: Merkevare – Studiekamerat"));
    expect(screen.getByText("Uke 37: Merkevare")).toBeTruthy();
    expect(await screen.findByText("/ 3")).toBeTruthy();
    expect(counter()).toBe("1");
    expect(screen.getByText("Merkevare")).toBeTruthy();
    expect(button("Kunne").disabled).toBe(true);

    fireEvent.click(button("Snu kortet"));
    expect(document.activeElement).toBe(button("Kunne"));
    fireEvent.click(button("Kunne ikke"));
    expect(screen.getByText("Pris")).toBeTruthy();
    expect(document.activeElement).toBe(button("Snu kortet"));
    expect(counter()).toBe("2");

    for (const front of ["Pris", "Segment"]) {
      expect(screen.getByText(front)).toBeTruthy();
      fireEvent.click(button("Snu kortet"));
      fireEvent.click(button("Kunne"));
    }
    expect(screen.getByText("Merkevare")).toBeTruthy();
    expect(counter()).toBe("3");
    expect(screen.getByText("Repeterer: 1 kort igjen")).toBeTruthy();
    expect(screen.getByText("Kunne 2 · Kunne ikke 1")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("");

    fireEvent.click(button("Snu kortet"));
    fireEvent.click(button("Kunne"));
    const finished = screen.getByRole("heading", { level: 2, name: "Økten er ferdig" });
    expect(document.activeElement).toBe(finished);
    expect(screen.getByRole("status").textContent).toBe("Økten er ferdig");
    expect(screen.getByText("Kunne 2 · Kunne ikke 1")).toBeTruthy();
    expect(screen.getByText("Kunne ikke, repetert")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Avslutt økt" })).toBeNull();
    expect(screen.getByRole("link", { name: "Tilbake til forelesningen" }).getAttribute("href")).toBe("/forelesninger/l1");
  });

  it("FR-23: kortene blandes når økten starter", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    renderPage();
    // random() = 0 moves the first card last: b, c, a.
    expect(await screen.findByText("Pris")).toBeTruthy();
  });

  it("FR-20: et snudd kort viser kilden som tekst", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Snu kortet" }));
    expect(screen.getByText("definisjoner.pdf, side 1")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /definisjoner/ })).toBeNull();
  });

  it("E41: nye kort under økten endrer ikke økten", async () => {
    renderPage();
    expect(await screen.findByText("/ 3")).toBeTruthy();
    cards = [...cards, card("d", "Lojalitet")];
    await act(() => client.invalidateQueries({ queryKey: ["lectures", "l1"] }));
    await waitFor(() => expect(client.getQueryData<Flashcard[]>(lectureFlashcardsQueryKey("l1"))).toHaveLength(4));
    expect(screen.getByText("/ 3")).toBeTruthy();
  });

  it("E41: en ny økt bruker kortene hentet nå, ikke en gammel liste fra hurtigbufferen", async () => {
    const old = [card("a", "Merkevare")];
    renderPage(old);
    expect(await screen.findByText("/ 3")).toBeTruthy();
  });

  it("E41: en omhenting som feiler midt i økten erstatter ikke økten", async () => {
    renderPage();
    expect(await screen.findByText("/ 3")).toBeTruthy();
    lectureStatus = 500;
    flashcardsStatus = 500;
    await act(() => client.invalidateQueries({ queryKey: ["lectures", "l1"] }));
    await waitFor(() => expect(client.getQueryState(lectureFlashcardsQueryKey("l1"))?.status).toBe("error"));
    expect(screen.getByText("/ 3")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Snu kortet" })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(notFound).not.toHaveBeenCalled();
  });

  it("FR-24: feil når kortene hentes gir reserveteksten i role=alert", async () => {
    flashcardsStatus = 500;
    renderPage();
    expect((await screen.findByRole("alert")).textContent).toBe(FALLBACK_MESSAGE);
  });

  it("UX-DR33: «Avslutt økt» går rett tilbake til forelesningen og sender ingenting", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Snu kortet" }));
    fireEvent.click(button("Kunne"));
    fetchMock.mockClear();
    fireEvent.click(button("Avslutt økt"));
    expect(push).toHaveBeenCalledWith("/forelesninger/l1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("A15/E1: uten kort vises «Det finnes ingen flashcards her ennå.» og ingen panel", async () => {
    cards = [];
    renderPage();
    expect(await screen.findByRole("heading", { level: 1, name: "Det finnes ingen flashcards her ennå." })).toBeTruthy();
    const back = screen.getByRole("link", { name: "Tilbake til forelesningen" });
    expect(back.getAttribute("href")).toBe("/forelesninger/l1");
    expect(back.dataset.variant).toBe("outline");
    expect(screen.queryByRole("heading", { name: "Flashcards" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Avslutt økt" })).toBeNull();
  });

  it("FR-4: andres eller ukjent forelesning gir «Fant ikke siden»", async () => {
    lectureStatus = 404;
    renderPage();
    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });

  it("FR-24: andre feil gir reserveteksten i role=alert", async () => {
    lectureStatus = 500;
    renderPage();
    expect((await screen.findByRole("alert")).textContent).toBe(FALLBACK_MESSAGE);
  });

  describe("hurtigtaster (story 3.4)", () => {
    it("NFR-8: hele økten går med Mellomrom, 1 og 2, og kortet markert med 1 kommer igjen", async () => {
      renderPage(undefined, { frame: true });
      expect(await screen.findByText("/ 3")).toBeTruthy();
      expect(front()).toBe("Merkevare");
      press(" ");
      expect(document.activeElement).toBe(button("Kunne"));
      press("1");
      expect(front()).toBe("Pris");
      expect(document.activeElement).toBe(button("Snu kortet"));
      for (const expected of ["Pris", "Segment", "Merkevare"]) {
        expect(front()).toBe(expected);
        // Space on the focused «Snu kortet» is the button's own action; from
        // the page (nothing focused) it is the shortcut.
        (document.activeElement as HTMLElement).blur();
        press(" ");
        press("2");
      }
      expect(screen.getByRole("heading", { level: 2, name: "Økten er ferdig" })).toBeTruthy();
      expect(screen.getByText("Kunne 2 · Kunne ikke 1")).toBeTruthy();
    });

    it("UX-DR27: 1 og 2 gjør ingenting før kortet er snudd", async () => {
      renderPage(undefined, { frame: true });
      expect(await screen.findByText("/ 3")).toBeTruthy();
      press("1");
      press("2");
      expect(front()).toBe("Merkevare");
      expect(screen.getByText("Kunne 0 · Kunne ikke 0")).toBeTruthy();
    });

    it("UX-DR27: Mellomrom på en knapp i fokus snur ikke kortet", async () => {
      renderPage(undefined, { frame: true });
      expect(await screen.findByText("/ 3")).toBeTruthy();
      button("Avslutt økt").focus();
      press(" ");
      expect(screen.queryByText("SVAR")).toBeNull();
    });

    it("UX-DR33: Esc gjør det samme som «Avslutt økt»", async () => {
      renderPage(undefined, { frame: true });
      expect(await screen.findByText("/ 3")).toBeTruthy();
      press("Escape");
      expect(push).toHaveBeenCalledWith("/forelesninger/l1");
    });

    it("UX-DR26: hint-linjen står under knappene", async () => {
      renderPage(undefined, { frame: true });
      expect(await screen.findByText("/ 3")).toBeTruthy();
      expect(screen.getByRole("list", { name: "Hurtigtaster" }).textContent).toContain("Esc avslutt");
    });

    it("UX-DR31: med bryteren av virker ingen enkelttaster, hint-linjen er skjult, og Esc virker", async () => {
      window.localStorage.setItem(SHORTCUTS_KEY, "off");
      renderPage(undefined, { frame: true });
      expect(await screen.findByText("/ 3")).toBeTruthy();
      expect(screen.queryByRole("list", { name: "Hurtigtaster" })).toBeNull();
      press(" ");
      press("?");
      expect(screen.queryByText("SVAR")).toBeNull();
      expect(screen.queryByRole("dialog")).toBeNull();
      fireEvent.click(button("Snu kortet"));
      button("Kunne").blur();
      press("2");
      expect(front()).toBe("Merkevare");
      press("Escape");
      expect(push).toHaveBeenCalledWith("/forelesninger/l1");
    });

    it("UX-DR31: ? åpner hurtigtastdialogen; imens virker ingen taster i økten, og Esc lukker bare dialogen", async () => {
      renderPage(undefined, { frame: true });
      expect(await screen.findByText("/ 3")).toBeTruthy();
      press("?");
      const dialog = screen.getByRole("dialog", { name: "Hurtigtaster" });
      press(" ");
      expect(screen.queryByText("SVAR")).toBeNull();
      fireEvent.keyDown(dialog, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(push).not.toHaveBeenCalled();
      expect(front()).toBe("Merkevare");
    });

    it("UX-DR27: ingenting i økten når fokus står i et tekstfelt", async () => {
      renderPage(undefined, { frame: true });
      expect(await screen.findByText("/ 3")).toBeTruthy();
      const field = document.createElement("input");
      document.body.append(field);
      field.focus();
      press(" ");
      press("Escape");
      expect(screen.queryByText("SVAR")).toBeNull();
      expect(push).not.toHaveBeenCalled();
      field.remove();
    });

    it("UX-DR27: når økten er ferdig, virker bare ?", async () => {
      cards = [card("a", "Merkevare")];
      renderPage(undefined, { frame: true });
      expect(await screen.findByText("/ 1")).toBeTruthy();
      press(" ");
      press("2");
      expect(screen.getByRole("heading", { level: 2, name: "Økten er ferdig" })).toBeTruthy();
      press("Escape");
      expect(push).not.toHaveBeenCalled();
      press("?");
      expect(screen.getByRole("dialog", { name: "Hurtigtaster" })).toBeTruthy();
    });

    it("UX-DR32: på smal skjerm er panelet bak «Meny», panelets tittel er h2, og innholdet har en skjult h1", async () => {
      vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }));
      renderPage(undefined, { frame: true });
      const heading = await screen.findByRole("heading", { level: 1, name: "Flashcards" });
      expect(heading.className).toContain("sr-only");
      expect(screen.queryByRole("region", { name: "Flashcards" })).toBeNull();
      expect(screen.getByRole("button", { name: "Snu kortet" })).toBeTruthy();
    });
  });
});
