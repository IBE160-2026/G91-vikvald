// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SideMenuProvider } from "@/components/side-menu";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { SHORTCUTS_KEY } from "@/lib/practice-shortcuts";
import type { Lecture, Subject } from "@/modules/subjects/types";

import { lectureFlashcardsQueryKey, subjectFlashcardsQueryKey } from "../api";
import type { Flashcard, SubjectFlashcard } from "../types";
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
    formula_flag: false,
    source: { file_id: "f1", file_name: "definisjoner.pdf", page_no: page },
  };
}

// A card in the subject «Markedsføring», from one of its two lectures.
function subjectCard(id: string, front: string, lecture: "l1" | "l2", page = 1): SubjectFlashcard {
  const name = lecture === "l1" ? "Uke 37: Merkevare" : "Uke 38: Pris";
  return { ...card(id, front, page), lecture: { id: lecture, name } };
}

let cards: Flashcard[] = [];
let subjectCards: SubjectFlashcard[] = [];
let lectureStatus = 200;
let flashcardsStatus = 200;
let saveStatus = 204;
// The answer to DELETE /api/flashcards/{id} (story 3.7).
let deleteStatus = 204;
let client: QueryClient;

beforeEach(() => {
  cards = [card("a", "Merkevare"), card("b", "Pris"), card("c", "Segment", 2)];
  subjectCards = [subjectCard("a", "Merkevare", "l1"), subjectCard("d", "Rabatt", "l2", 3)];
  lectureStatus = 200;
  flashcardsStatus = 200;
  saveStatus = 204;
  deleteStatus = 204;
  notFound.mockReset();
  push.mockReset();
  // Just below 1: the shuffle keeps the order, so the test knows it.
  vi.spyOn(Math, "random").mockReturnValue(0.999);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url, init) => {
    const path = String(url);
    if (path.startsWith("/api/flashcards/")) {
      if (init?.method === "DELETE") {
        if (deleteStatus === 204) return new Response(null, { status: 204 });
        return jsonResponse(deleteStatus, { error: { code: deleteStatus === 404 ? "NOT_FOUND" : "INTERNAL_ERROR", details: {} } });
      }
      // PATCH: the card as saved (trimmed), with its source.
      const id = path.slice("/api/flashcards/".length);
      const body = JSON.parse(String(init?.body)) as { front: string; back: string };
      const old = [...cards, ...subjectCards].find((other) => other.id === id)!;
      return jsonResponse(200, { id, kind: old.kind, source: old.source, front: body.front.trim(), back: body.back.trim() });
    }
    if (path === "/api/practice-sessions") {
      if (saveStatus === 204) return new Response(null, { status: 204 });
      return jsonResponse(saveStatus, { error: { code: "INTERNAL_ERROR", details: {} } });
    }
    if (path === "/api/lectures/l1") {
      if (lectureStatus === 404) return jsonResponse(404, { error: { code: "NOT_FOUND", details: {} } });
      if (lectureStatus !== 200) return jsonResponse(lectureStatus, { error: { code: "INTERNAL_ERROR", details: {} } });
      return jsonResponse(200, LECTURE);
    }
    if (path === "/api/subjects/s1") return jsonResponse(200, SUBJECT);
    if (path === "/api/subjects/s1/flashcards") return jsonResponse(200, subjectCards);
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

function renderPage(cached?: Flashcard[], { frame = false, subjectId }: { frame?: boolean; subjectId?: string } = {}) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (cached) client.setQueryData(lectureFlashcardsQueryKey("l1"), cached);
  const page = subjectId ? <FlashcardSessionPage subjectId={subjectId} /> : <FlashcardSessionPage lectureId="l1" />;
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

// The bodies sent to POST /api/practice-sessions.
function saved(): Record<string, unknown>[] {
  return fetchMock.mock.calls
    .filter(([url]) => String(url) === "/api/practice-sessions")
    .map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>);
}

// Flip and mark the card shown, with the buttons.
function markWithButtons(value: "Kunne" | "Kunne ikke") {
  fireEvent.click(button("Snu kortet"));
  fireEvent.click(button(value));
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
    const title = screen.getByRole("heading", { level: 2, name: "Du har gått gjennom alle 3 kortene" });
    expect(document.activeElement).toBe(title);
    expect(screen.getByRole("status").textContent).toBe("Økten er ferdig");
    expect(screen.getByText("Kunne 2 · Kunne ikke 1")).toBeTruthy();
    expect(screen.getByText("Kunne ikke, repetert")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Avslutt økt" })).toBeNull();
    expect(screen.getByRole("link", { name: "Tilbake til forelesningen" }).getAttribute("href")).toBe("/forelesninger/l1");
  });

  it("FR-26, FR-56, UX-DR8, UX-DR34: ferdig økt lagres én gang og viser resultatsiden og «Økten er ferdig og lagret»", async () => {
    renderPage();
    expect(await screen.findByText("/ 3")).toBeTruthy();
    markWithButtons("Kunne ikke");
    markWithButtons("Kunne");
    markWithButtons("Kunne");
    markWithButtons("Kunne");

    expect(await screen.findByText("Økten er ferdig og lagret")).toBeTruthy();
    expect(saved()).toEqual([
      expect.objectContaining({
        subject_id: "s1",
        lecture_id: "l1",
        kind: "flashcards",
        aborted: false,
        shown: 3,
        answered: 3,
        correct: 2,
        partial: 0,
        wrong: 1,
      }),
    ]);
    expect(screen.getByText("ØKT FERDIG")).toBeTruthy();
    expect(screen.getByText("Uke 37: Merkevare · kortene du ikke kunne, ble repetert til slutt i økten")).toBeTruthy();
    expect(screen.getByText("67 % av kortene")).toBeTruthy();
    expect(screen.getByText("Repetert til slutt i økten")).toBeTruthy();
    const missed = screen.getByRole("region", { name: "Kortene du ikke kunne" });
    expect(missed.textContent).toContain("1 kort");
    expect(missed.textContent).toContain("Kort 1:Merkevare");
    expect(missed.textContent).toContain("definisjoner.pdf, side 1");
    expect(button("Øv igjen").dataset.variant).toBe("primary");
    expect(screen.getByRole("link", { name: "Tilbake til forelesningen" }).dataset.variant).toBe("outline");
    expect(screen.queryByRole("alert")).toBeNull();

    // Leaving the result page sends nothing more.
    cleanup();
    expect(saved()).toHaveLength(1);
  });

  it("FR-26: uten «Kunne ikke» vises ingen liste, og ett kort står i entall", async () => {
    cards = [card("a", "Merkevare")];
    renderPage();
    expect(await screen.findByText("/ 1")).toBeTruthy();
    markWithButtons("Kunne");
    expect(screen.getByRole("heading", { level: 2, name: "Du har gått gjennom 1 kort" })).toBeTruthy();
    expect(screen.getByText("Uke 37: Merkevare", { selector: "[data-slot='result-summary'] p" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Kortene du ikke kunne" })).toBeNull();
  });

  it("FR-56: lagring som feiler gir reserveteksten på resultatsiden, og panelet sier ikke «lagret»", async () => {
    saveStatus = 500;
    cards = [card("a", "Merkevare")];
    renderPage();
    expect(await screen.findByText("/ 1")).toBeTruthy();
    markWithButtons("Kunne");
    expect((await screen.findByRole("alert")).textContent).toBe(FALLBACK_MESSAGE);
    expect(screen.queryByText("Økten er ferdig og lagret")).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Du har gått gjennom 1 kort" })).toBeTruthy();
  });

  it("UX-DR33, FR-56: «Avslutt økt» etter en markering lagrer økten som avbrutt og viser «Avbrutt etter 1 av 3»", async () => {
    renderPage();
    expect(await screen.findByText("/ 3")).toBeTruthy();
    markWithButtons("Kunne ikke");
    fireEvent.click(button("Avslutt økt"));

    const title = screen.getByRole("heading", { level: 2, name: "Avbrutt etter 1 av 3" });
    expect(document.activeElement).toBe(title);
    expect(push).not.toHaveBeenCalled();
    await waitFor(() => expect(saved()).toEqual([expect.objectContaining({ aborted: true, shown: 2, answered: 1, wrong: 1 })]));
    expect(screen.queryByRole("button", { name: "Avslutt økt" })).toBeNull();
    expect(screen.queryByText("Økten er ferdig og lagret")).toBeNull();
    expect(screen.queryByText(/[Rr]epeter/)).toBeNull();
    expect(screen.getByText("Kunne ikke", { selector: "li" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("");
    expect(screen.getByRole("region", { name: "Kortene du ikke kunne" })).toBeTruthy();
    cleanup();
    expect(saved()).toHaveLength(1);
  });

  it("FR-56: å forlate økten i appen etter en markering lagrer den som avbrutt", async () => {
    renderPage();
    expect(await screen.findByText("/ 3")).toBeTruthy();
    markWithButtons("Kunne");
    expect(saved()).toHaveLength(0);
    cleanup();
    expect(saved()).toEqual([expect.objectContaining({ aborted: true, answered: 1, correct: 1 })]);
  });

  it("FR-56: å forlate økten uten markeringer sender ingenting", async () => {
    renderPage();
    expect(await screen.findByText("/ 3")).toBeTruthy();
    window.dispatchEvent(new Event("pagehide"));
    cleanup();
    expect(saved()).toHaveLength(0);
  });

  it("UX-DR35, SK-20: «Øv igjen» starter en ny blanding med kortene forelesningen har nå og en ny session_id", async () => {
    renderPage();
    expect(await screen.findByText("/ 3")).toBeTruthy();
    markWithButtons("Kunne");
    fireEvent.click(button("Avslutt økt"));
    await waitFor(() => expect(saved()).toHaveLength(1));

    cards = [...cards, card("d", "Lojalitet")];
    await act(() => client.invalidateQueries({ queryKey: lectureFlashcardsQueryKey("l1") }));
    await waitFor(() => expect(client.getQueryData<Flashcard[]>(lectureFlashcardsQueryKey("l1"))).toHaveLength(4));

    fireEvent.click(button("Øv igjen"));
    expect(screen.getByText("/ 4")).toBeTruthy();
    expect(counter()).toBe("1");
    expect(document.activeElement).toBe(button("Snu kortet"));
    expect(button("Avslutt økt")).toBeTruthy();
    markWithButtons("Kunne");
    fireEvent.click(button("Avslutt økt"));
    await waitFor(() => expect(saved()).toHaveLength(2));
    const [first, second] = saved();
    expect(first.session_id).not.toBe(second.session_id);
    expect(second).toMatchObject({ aborted: true, answered: 1 });
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

  it("UX-DR33: «Avslutt økt» uten markerte kort går rett tilbake til forelesningen og sender ingenting", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Snu kortet" }));
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
    it("NFR-8, UX-DR31: hele økten går med Mellomrom, 1 og 2, fokus til neste handling, og kortet markert med 1 kommer igjen", async () => {
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
      expect(screen.getByRole("heading", { level: 2, name: "Du har gått gjennom alle 3 kortene" })).toBeTruthy();
      expect(screen.getByText("Kunne 2 · Kunne ikke 1")).toBeTruthy();
    });

    it("UX-DR32: 1 og 2 gjør ingenting før kortet er snudd", async () => {
      renderPage(undefined, { frame: true });
      expect(await screen.findByText("/ 3")).toBeTruthy();
      press("1");
      press("2");
      expect(front()).toBe("Merkevare");
      expect(screen.getByText("Kunne 0 · Kunne ikke 0")).toBeTruthy();
    });

    it("UX-DR32: Mellomrom på en knapp i fokus snur ikke kortet", async () => {
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

    it("UX-DR27: hint-linjen står under knappene", async () => {
      renderPage(undefined, { frame: true });
      expect(await screen.findByText("/ 3")).toBeTruthy();
      expect(screen.getByRole("list", { name: "Hurtigtaster" }).textContent).toContain("Esc avslutt");
    });

    it("UX-DR26: med bryteren av virker ingen enkelttaster, hint-linjen er skjult, og Esc virker", async () => {
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

    it("UX-DR26, UX-DR32: ? åpner hurtigtastdialogen; imens virker ingen taster i økten, og Esc lukker bare dialogen", async () => {
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

    it("UX-DR32: ingenting i økten når fokus står i et tekstfelt", async () => {
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

    it("UX-DR35: på resultatsiden er Enter «Øv igjen», Esc tilbake og ? dialogen; øktens taster virker ikke", async () => {
      cards = [card("a", "Merkevare")];
      renderPage(undefined, { frame: true });
      expect(await screen.findByText("/ 1")).toBeTruthy();
      press(" ");
      press("2");
      expect(screen.getByRole("heading", { level: 2, name: "Du har gått gjennom 1 kort" })).toBeTruthy();
      expect(screen.getByRole("list", { name: "Hurtigtaster" }).textContent).toBe(
        "Enter øv igjenEsc tilbake til forelesningen",
      );
      press(" ");
      expect(screen.queryByRole("button", { name: "Snu kortet" })).toBeNull();
      press("?");
      const dialog = screen.getByRole("dialog", { name: "Hurtigtaster" });
      fireEvent.keyDown(dialog, { key: "Escape" });
      expect(push).not.toHaveBeenCalled();
      press("Escape");
      expect(push).toHaveBeenCalledWith("/forelesninger/l1");
    });

    it("UX-DR35: Enter starter en ny økt og flytter fokus til «Snu kortet»", async () => {
      cards = [card("a", "Merkevare")];
      renderPage(undefined, { frame: true });
      expect(await screen.findByText("/ 1")).toBeTruthy();
      press(" ");
      press("2");
      expect(screen.getByRole("heading", { level: 2, name: "Du har gått gjennom 1 kort" })).toBeTruthy();
      press("Enter");
      expect(document.activeElement).toBe(button("Snu kortet"));
      expect(counter()).toBe("1");
    });

    it("UX-DR35: Enter på en knapp eller lenke i fokus gjør knappens egen handling, ikke «Øv igjen»", async () => {
      cards = [card("a", "Merkevare")];
      renderPage(undefined, { frame: true });
      expect(await screen.findByText("/ 1")).toBeTruthy();
      press(" ");
      press("2");
      screen.getByRole("link", { name: "Tilbake til forelesningen" }).focus();
      press("Enter");
      expect(screen.queryByRole("button", { name: "Snu kortet" })).toBeNull();
    });

    it("UX-DR26, UX-DR35: med bryteren av virker Enter og Esc på resultatsiden, og hint-linjen er skjult", async () => {
      window.localStorage.setItem(SHORTCUTS_KEY, "off");
      cards = [card("a", "Merkevare")];
      renderPage(undefined, { frame: true });
      expect(await screen.findByText("/ 1")).toBeTruthy();
      markWithButtons("Kunne");
      (document.activeElement as HTMLElement).blur();
      expect(screen.queryByRole("list", { name: "Hurtigtaster" })).toBeNull();
      press("Enter");
      expect(screen.getByRole("button", { name: "Snu kortet" })).toBeTruthy();
      markWithButtons("Kunne");
      (document.activeElement as HTMLElement).blur();
      press("Escape");
      expect(push).toHaveBeenCalledWith("/forelesninger/l1");
    });

    it("UX-DR33: Esc etter en markering viser resultatsiden for en avbrutt økt", async () => {
      renderPage(undefined, { frame: true });
      expect(await screen.findByText("/ 3")).toBeTruthy();
      press(" ");
      press("2");
      press("Escape");
      expect(screen.getByRole("heading", { level: 2, name: "Avbrutt etter 1 av 3" })).toBeTruthy();
      expect(push).not.toHaveBeenCalled();
      await waitFor(() => expect(saved()).toEqual([expect.objectContaining({ aborted: true })]));
    });

    it("UX-DR10: på smal skjerm er panelet bak «Meny», panelets tittel er h2, og innholdet har en skjult h1", async () => {
      vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }));
      renderPage(undefined, { frame: true });
      const heading = await screen.findByRole("heading", { level: 1, name: "Flashcards" });
      expect(heading.className).toContain("sr-only");
      expect(screen.queryByRole("region", { name: "Flashcards" })).toBeNull();
      expect(screen.getByRole("button", { name: "Snu kortet" })).toBeTruthy();
    });
  });

  describe("hele emnet (story 3.6)", () => {
    it("FR-23, UX-DR14: kortene fra alle forelesningene, panelet viser «<emne> · hele emnet» med emneprikken, og kilden er fil og side", async () => {
      renderPage(undefined, { subjectId: "s1" });
      expect(await screen.findByText("/ 2")).toBeTruthy();
      await waitFor(() => expect(document.title).toBe("Flashcards – Markedsføring – Studiekamerat"));
      const scope = screen.getByText("Markedsføring · hele emnet");
      await waitFor(() => expect(scope.parentElement!.querySelector("[data-color-index='0']")).toBeTruthy());
      expect(front()).toBe("Merkevare");
      fireEvent.click(button("Snu kortet"));
      expect(screen.getByText("definisjoner.pdf, side 1")).toBeTruthy();
      fireEvent.click(button("Kunne"));
      expect(front()).toBe("Rabatt");
      fireEvent.click(button("Snu kortet"));
      expect(screen.getByText("definisjoner.pdf, side 3")).toBeTruthy();
    });

    it("FR-56, UX-DR34: en ferdig emneøkt lagres med lecture_id null og subject_id satt, og resultatet sier «hele emnet»", async () => {
      renderPage(undefined, { subjectId: "s1" });
      expect(await screen.findByText("/ 2")).toBeTruthy();
      markWithButtons("Kunne");
      markWithButtons("Kunne ikke");
      markWithButtons("Kunne");
      expect(await screen.findByText("Økten er ferdig og lagret")).toBeTruthy();
      expect(saved()).toEqual([
        expect.objectContaining({ subject_id: "s1", lecture_id: null, kind: "flashcards", aborted: false, answered: 2 }),
      ]);
      expect(
        screen.getByText("Markedsføring · hele emnet · kortene du ikke kunne, ble repetert til slutt i økten"),
      ).toBeTruthy();
      const back = screen.getByRole("link", { name: "Tilbake til emnet" });
      expect(back.getAttribute("href")).toBe("/emner/s1");
    });

    it("UX-DR35: på resultatsiden etter en emneøkt står «Esc tilbake til emnet», og Esc går til emnesiden", async () => {
      renderPage(undefined, { frame: true, subjectId: "s1" });
      expect(await screen.findByText("/ 2")).toBeTruthy();
      for (let index = 0; index < 2; index++) {
        (document.activeElement as HTMLElement | null)?.blur();
        press(" ");
        press("2");
      }
      expect(screen.getByRole("heading", { level: 2, name: "Du har gått gjennom alle 2 kortene" })).toBeTruthy();
      expect(screen.getByRole("list", { name: "Hurtigtaster" }).textContent).toBe("Enter øv igjenEsc tilbake til emnet");
      press("Escape");
      expect(push).toHaveBeenCalledWith("/emner/s1");
    });

    it("UX-DR33: Esc og «Avslutt økt» uten markerte kort går rett til emnesiden og sender ingenting", async () => {
      renderPage(undefined, { frame: true, subjectId: "s1" });
      expect(await screen.findByText("/ 2")).toBeTruthy();
      fetchMock.mockClear();
      press("Escape");
      expect(push).toHaveBeenCalledWith("/emner/s1");
      fireEvent.click(button("Avslutt økt"));
      expect(push).toHaveBeenLastCalledWith("/emner/s1");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("FR-23: «Øv igjen» bruker kortene emnet har nå", async () => {
      renderPage(undefined, { subjectId: "s1" });
      expect(await screen.findByText("/ 2")).toBeTruthy();
      markWithButtons("Kunne");
      markWithButtons("Kunne");
      expect(await screen.findByText("Økten er ferdig og lagret")).toBeTruthy();
      subjectCards = [...subjectCards, subjectCard("e", "Segment", "l2", 4)];
      await act(() => client.invalidateQueries({ queryKey: subjectFlashcardsQueryKey("s1") }));
      await waitFor(() => expect(client.getQueryData<SubjectFlashcard[]>(subjectFlashcardsQueryKey("s1"))).toHaveLength(3));
      fireEvent.click(button("Øv igjen"));
      expect(await screen.findByText("/ 3")).toBeTruthy();
    });

    it("A15/E1: emne uten kort gir «Det finnes ingen flashcards her ennå.» og «Tilbake til emnet»", async () => {
      subjectCards = [];
      renderPage(undefined, { subjectId: "s1" });
      expect(await screen.findByRole("heading", { level: 1, name: "Det finnes ingen flashcards her ennå." })).toBeTruthy();
      expect(screen.getByRole("link", { name: "Tilbake til emnet" }).getAttribute("href")).toBe("/emner/s1");
    });

    it("FR-4: andres eller ukjent emne gir «Fant ikke siden»", async () => {
      renderPage(undefined, { subjectId: "s9" });
      await waitFor(() => expect(notFound).toHaveBeenCalled());
    });
  });

  describe("rett og slett kort (story 3.7)", () => {
    // The requests to /api/flashcards/{id} with this method.
    function cardCalls(method: string): string[] {
      return fetchMock.mock.calls
        .filter(([url, init]) => String(url).startsWith("/api/flashcards/") && init?.method === method)
        .map(([url]) => String(url));
    }

    async function openDelete() {
      fireEvent.click(button("Snu kortet"));
      fireEvent.click(button("Slett"));
      const dialog = await screen.findByRole("dialog", { name: "Slette kortet?" });
      await within(dialog).findByText("Det kan ikke angres.");
      return dialog;
    }

    it("FR-27: «Rediger», nytt svar og «Lagre» lagrer med PATCH, og kortet viser det nye svaret med en gang", async () => {
      renderPage();
      expect(await screen.findByText("/ 3")).toBeTruthy();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      fireEvent.click(button("Snu kortet"));
      const edit = button("Rediger");
      edit.focus();
      fireEvent.click(edit);
      const answer = screen.getByLabelText("Svar") as HTMLTextAreaElement;
      expect(answer.value).toBe("Merkevare er et begrep i faget.");
      fireEvent.change(answer, { target: { value: "  Et navn som skiller produkter.  " } });
      fireEvent.click(button("Lagre"));

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(cardCalls("PATCH")).toEqual(["/api/flashcards/a"]);
      expect(screen.getByText("Et navn som skiller produkter.")).toBeTruthy();
      // Still the same card, still flipped, and focus back on «Rediger».
      expect(front()).toBe("Merkevare");
      expect(counter()).toBe("1");
      await waitFor(() => expect(document.activeElement).toBe(button("Rediger")));
      // The lecture's queries and every subject's card list are refetched.
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["lectures", "l1"] });
      expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ predicate: expect.any(Function) }));
    });

    it("UX-DR22, E22: sletting av et umarkert kort viser bekreftelsen og tar ruten ut: «1 / 2»", async () => {
      renderPage();
      expect(await screen.findByText("/ 3")).toBeTruthy();
      const dialog = await openDelete();
      expect(within(dialog).getByText("Merkevare")).toBeTruthy();
      expect(dialog.textContent).not.toContain("Dette sletter også");
      expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Avbryt" }));
      expect(within(dialog).getByRole("button", { name: "Slett kortet" }).dataset.variant).toBe("danger");

      fireEvent.click(within(dialog).getByRole("button", { name: "Slett kortet" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(cardCalls("DELETE")).toEqual(["/api/flashcards/a"]);
      expect(screen.getByText("/ 2")).toBeTruthy();
      expect(counter()).toBe("1");
      expect(front()).toBe("Pris");
      expect(screen.queryByText("SVAR")).toBeNull();
      await waitFor(() => expect(document.activeElement).toBe(button("Snu kortet")));
    });

    it("FR-27: sletting oppfrisker forelesningen og alle emners kortlister, og «Øv igjen» får ikke kortet tilbake", async () => {
      renderPage();
      expect(await screen.findByText("/ 3")).toBeTruthy();
      // The refetch fails, so only the cache change keeps the card out.
      flashcardsStatus = 500;
      const dialog = await openDelete();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      fireEvent.click(within(dialog).getByRole("button", { name: "Slett kortet" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["lectures", "l1"] });
      expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ predicate: expect.any(Function) }));
      expect(client.getQueryData<Flashcard[]>(lectureFlashcardsQueryKey("l1"))!.map((other) => other.id)).toEqual(["b", "c"]);

      markWithButtons("Kunne");
      fireEvent.click(button("Avslutt økt"));
      fireEvent.click(button("Øv igjen"));
      expect(screen.getByText("/ 2")).toBeTruthy();
    });

    it("FR-27: siste kort slettet uten markeringer oppfrisker også forelesningen og emnelistene", async () => {
      cards = [card("a", "Merkevare")];
      renderPage();
      expect(await screen.findByText("/ 1")).toBeTruthy();
      const dialog = await openDelete();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      fireEvent.click(within(dialog).getByRole("button", { name: "Slett kortet" }));
      await waitFor(() => expect(push).toHaveBeenCalledWith("/forelesninger/l1"));
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["lectures", "l1"] });
      expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ predicate: expect.any(Function) }));
    });

    it("FR-27: etter lagring har «Øv igjen» den nye teksten", async () => {
      cards = [card("a", "Merkevare")];
      renderPage();
      expect(await screen.findByText("/ 1")).toBeTruthy();
      flashcardsStatus = 500;
      fireEvent.click(button("Snu kortet"));
      fireEvent.click(button("Rediger"));
      fireEvent.change(screen.getByLabelText("Spørsmål"), { target: { value: "Hva er en merkevare?" } });
      fireEvent.click(button("Lagre"));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      fireEvent.click(button("Kunne"));
      fireEvent.click(await screen.findByRole("button", { name: "Øv igjen" }));
      expect(front()).toBe("Hva er en merkevare?");
    });

    it("UX-DR27: «Avbryt» og Esc lar kortet stå i økten og sletter ingenting", async () => {
      renderPage(undefined, { frame: true });
      expect(await screen.findByText("/ 3")).toBeTruthy();
      let dialog = await openDelete();
      // The session's keys are off while the dialog is open.
      press("2");
      expect(screen.getByText("Kunne 0 · Kunne ikke 0")).toBeTruthy();
      fireEvent.click(within(dialog).getByRole("button", { name: "Avbryt" }));
      expect(screen.queryByRole("dialog")).toBeNull();
      fireEvent.click(button("Slett"));
      dialog = await screen.findByRole("dialog", { name: "Slette kortet?" });
      fireEvent.keyDown(dialog, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(cardCalls("DELETE")).toEqual([]);
      expect(front()).toBe("Merkevare");
      expect(screen.getByText("/ 3")).toBeTruthy();
      expect(push).not.toHaveBeenCalled();
    });

    it("FR-27: et markert kort som kommer igjen, beholder ruten med ✗ og kommer ikke igjen etter sletting", async () => {
      renderPage();
      expect(await screen.findByText("/ 3")).toBeTruthy();
      markWithButtons("Kunne ikke");
      markWithButtons("Kunne ikke");
      markWithButtons("Kunne");
      // Merkevare comes back; it is deleted.
      expect(front()).toBe("Merkevare");
      const dialog = await openDelete();
      fireEvent.click(within(dialog).getByRole("button", { name: "Slett kortet" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(screen.getByText("/ 3")).toBeTruthy();
      expect(screen.getByText("Kort 1: kunne ikke")).toBeTruthy();
      expect(front()).toBe("Pris");
      markWithButtons("Kunne");
      expect(await screen.findByText("Økten er ferdig og lagret")).toBeTruthy();
      expect(saved()).toEqual([expect.objectContaining({ aborted: false, shown: 3, answered: 3, correct: 1, wrong: 2 })]);
    });

    it("FR-27: siste kort slettet når noe er markert: økten er ferdig, lagres og viser resultatet", async () => {
      renderPage();
      expect(await screen.findByText("/ 3")).toBeTruthy();
      markWithButtons("Kunne");
      markWithButtons("Kunne");
      const dialog = await openDelete();
      fireEvent.click(within(dialog).getByRole("button", { name: "Slett kortet" }));
      expect(await screen.findByRole("heading", { level: 2, name: "Du har gått gjennom alle 2 kortene" })).toBeTruthy();
      await waitFor(() => expect(saved()).toEqual([expect.objectContaining({ aborted: false, shown: 2, answered: 2 })]));
      expect(push).not.toHaveBeenCalled();
    });

    it("FR-27: siste kort slettet uten markeringer går tilbake til forelesningen uten lagring", async () => {
      cards = [card("a", "Merkevare")];
      renderPage();
      expect(await screen.findByText("/ 1")).toBeTruthy();
      const dialog = await openDelete();
      fireEvent.click(within(dialog).getByRole("button", { name: "Slett kortet" }));
      await waitFor(() => expect(push).toHaveBeenCalledWith("/forelesninger/l1"));
      expect(saved()).toEqual([]);
    });

    it("E22: 404 ved sletting (allerede borte) tar også kortet ut", async () => {
      deleteStatus = 404;
      renderPage();
      expect(await screen.findByText("/ 3")).toBeTruthy();
      const dialog = await openDelete();
      fireEvent.click(within(dialog).getByRole("button", { name: "Slett kortet" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(screen.getByText("/ 2")).toBeTruthy();
    });

    it("FR-27: en annen feil ved sletting viser reserveteksten, og kortet står", async () => {
      deleteStatus = 500;
      renderPage();
      expect(await screen.findByText("/ 3")).toBeTruthy();
      const dialog = await openDelete();
      fireEvent.click(within(dialog).getByRole("button", { name: "Slett kortet" }));
      expect((await within(dialog).findByRole("alert")).textContent).toBe(FALLBACK_MESSAGE);
      expect(screen.getByText("/ 3")).toBeTruthy();
    });

    it("FR-27: i en emneøkt oppdateres kortets egen forelesning, og siste kort tilbake går til emnet", async () => {
      subjectCards = [subjectCard("d", "Rabatt", "l2", 3)];
      renderPage(undefined, { subjectId: "s1" });
      expect(await screen.findByText("/ 1")).toBeTruthy();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      fireEvent.click(button("Snu kortet"));
      fireEvent.click(button("Rediger"));
      fireEvent.change(screen.getByLabelText("Spørsmål"), { target: { value: "Hva er rabatt?" } });
      fireEvent.click(button("Lagre"));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(front()).toBe("Hva er rabatt?");
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["lectures", "l2"] });
      const predicate = (invalidate.mock.calls.find(([filters]) => filters && "predicate" in filters)![0] as {
        predicate: (query: { queryKey: readonly unknown[] }) => boolean;
      }).predicate;
      expect(predicate({ queryKey: subjectFlashcardsQueryKey("s9") })).toBe(true);
      expect(predicate({ queryKey: ["subjects", "s9"] })).toBe(false);

      const dialog = await (async () => {
        fireEvent.click(button("Slett"));
        return screen.findByRole("dialog", { name: "Slette kortet?" });
      })();
      expect(within(dialog).getByText("Hva er rabatt?")).toBeTruthy();
      await within(dialog).findByText("Det kan ikke angres.");
      fireEvent.click(within(dialog).getByRole("button", { name: "Slett kortet" }));
      await waitFor(() => expect(push).toHaveBeenCalledWith("/emner/s1"));
    });
  });
});
