// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SideMenuProvider } from "@/components/side-menu";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { SHORTCUTS_KEY } from "@/lib/practice-shortcuts";
import type { Lecture, Subject } from "@/modules/subjects/types";

import type { QuizQuestion } from "../types";
import { QuizSessionPage, quizResultTitle } from "./quiz-session-page";

const notFound = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  notFound: () => notFound(),
  usePathname: () => "/forelesninger/l1/quiz",
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

// A question whose correct answer is option `correct` (0–3).
function question(id: string, term: string, correct: number, page = 1): QuizQuestion {
  const options = ["Svar A", "Svar B", "Svar C", "Svar D"].map((text) => `${text} om ${term}`);
  return {
    id,
    question: `Hva er ${term}?`,
    options,
    correct_index: correct,
    explanation: `${term} er et begrep i faget.`,
    source: { file_id: "f1", file_name: "merkevare-notater.pdf", page_no: page },
    lecture: { id: "l1", name: "Uke 37: Merkevare" },
  };
}

let questions: QuizQuestion[] = [];
let lectureStatus = 200;
let questionsStatus = 200;
let saveStatus = 204;

beforeEach(() => {
  questions = [question("a", "Merkevare", 1), question("b", "Pris", 0), question("c", "Segment", 3, 2)];
  lectureStatus = 200;
  questionsStatus = 200;
  saveStatus = 204;
  notFound.mockReset();
  push.mockReset();
  // Just below 1: the shuffle keeps the order, so the test knows it.
  vi.spyOn(Math, "random").mockReturnValue(0.999);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url) => {
    const path = String(url);
    if (path === "/api/practice-sessions") {
      if (saveStatus === 204) return new Response(null, { status: 204 });
      return jsonResponse(saveStatus, { error: { code: "INTERNAL_ERROR", details: {} } });
    }
    if (path === "/api/lectures/l1") {
      if (lectureStatus === 404) return jsonResponse(404, { error: { code: "NOT_FOUND", details: {} } });
      return jsonResponse(200, LECTURE);
    }
    if (path === "/api/subjects/s1") return jsonResponse(200, SUBJECT);
    if (path === "/api/lectures/l1/quiz-questions") {
      if (questionsStatus !== 200) return jsonResponse(questionsStatus, { error: { code: "INTERNAL_ERROR", details: {} } });
      return jsonResponse(200, questions);
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

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SideMenuProvider>
        <QuizSessionPage lectureId="l1" />
      </SideMenuProvider>
    </QueryClientProvider>,
  );
}

function press(key: string, extra: { repeat?: boolean } = {}) {
  fireEvent.keyDown(document.activeElement ?? document.body, { key, ...extra });
}

function button(name: string): HTMLButtonElement {
  return screen.getByRole("button", { name }) as HTMLButtonElement;
}

function heading(): string {
  return screen.getByRole("heading", { level: 2 }).textContent!;
}

function saved(): Record<string, unknown>[] {
  return fetchMock.mock.calls
    .filter(([url]) => String(url) === "/api/practice-sessions")
    .map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>);
}

// Choose the option with this letter and confirm, with the mouse.
function answer(letter: "A" | "B" | "C" | "D") {
  const index = "ABCD".indexOf(letter);
  fireEvent.click(screen.getAllByRole("radio")[index]);
  fireEvent.click(button("Bekreft svar"));
}

async function started() {
  expect(await screen.findByText("/ 3")).toBeTruthy();
}

describe("quizResultTitle", () => {
  it("FR-36: «11 av 15 riktige», og avbrutt «Avbrutt etter 12 av 20»", () => {
    expect(quizResultTitle({ total: 15, answered: 15, correct: 11, aborted: false })).toBe("11 av 15 riktige");
    expect(quizResultTitle({ total: 20, answered: 12, correct: 3, aborted: true })).toBe("Avbrutt etter 12 av 20");
  });
});

describe("QuizSessionPage", () => {
  it("FR-32, UX-DR8: panelet viser «Quiz», forelesningen, «1 / 3», «0 riktige · 0 feil» og rutenettet; spørsmålet uten forklaring", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { level: 1, name: "Quiz" })).toBeTruthy();
    await started();
    await waitFor(() => expect(document.title).toBe("Quiz – Uke 37: Merkevare – Studiekamerat"));
    expect(document.querySelector(".text-session-counter")!.textContent).toBe("1");
    expect(screen.getByText("0 riktige · 0 feil")).toBeTruthy();
    expect(screen.getByText("Spørsmål 2: ikke besvart ennå")).toBeTruthy();
    expect(screen.getByText("SPØRSMÅL 1 AV 3")).toBeTruthy();
    expect(heading()).toBe("Hva er Merkevare?");
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.queryByText("Forklaring")).toBeNull();
    expect(button("Bekreft svar").disabled).toBe(true);
    // The first question does not take focus.
    expect(document.activeElement).toBe(document.body);
  });

  it("FR-35, UX-DR31, UX-DR44: bekreftet feil svar gir merkene, status, forklaring, fokus og «Spørsmål 1: feil»", async () => {
    renderPage();
    await started();
    answer("C");
    expect(screen.getByRole("radio", { name: /Svar B om Merkevare/ }).textContent).toContain("Riktig svar");
    expect(screen.getByRole("radio", { name: /Svar C om Merkevare/ }).textContent).toContain("Ditt svar");
    expect(screen.getAllByRole("status")[0].textContent).toBe("Du svarte C. Svaret er bekreftet. Feil. Riktig svar er B.");
    expect(screen.getByText("merkevare-notater.pdf, side 1")).toBeTruthy();
    expect(document.activeElement).toBe(button("Neste spørsmål"));
    expect(screen.getByText("Spørsmål 1: feil")).toBeTruthy();
    expect(screen.getByText("0 riktige · 1 feil")).toBeTruthy();
    expect(screen.queryByText(/Repeterer/)).toBeNull();

    fireEvent.click(button("Neste spørsmål"));
    expect(heading()).toBe("Hva er Pris?");
    expect(screen.getByText("SPØRSMÅL 2 AV 3")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2 }));
    expect(screen.getAllByRole("status")[0].textContent).toBe("");
  });

  it("FR-34, FR-56, FR-36: hele quizen sendes én gang med kind=quiz og viser «QUIZ FERDIG» og «2 av 3 riktige»", async () => {
    renderPage();
    await started();
    answer("B");
    fireEvent.click(button("Neste spørsmål"));
    answer("B");
    fireEvent.click(button("Neste spørsmål"));
    answer("D");
    expect(document.activeElement).toBe(button("Se resultatet"));
    fireEvent.click(button("Se resultatet"));

    const title = screen.getByRole("heading", { level: 2, name: "2 av 3 riktige" });
    expect(document.activeElement).toBe(title);
    expect(screen.getByText("QUIZ FERDIG")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Tilbake til forelesningen" }).getAttribute("href")).toBe("/forelesninger/l1");
    expect(await screen.findByText("Økten er ferdig og lagret")).toBeTruthy();
    expect(saved()).toEqual([
      expect.objectContaining({
        kind: "quiz",
        lecture_id: "l1",
        subject_id: "s1",
        aborted: false,
        shown: 3,
        answered: 3,
        correct: 2,
        wrong: 1,
        partial: 0,
      }),
    ]);
    expect(screen.queryByText("Ta quizen igjen")).toBeNull();
    cleanup();
    expect(saved()).toHaveLength(1);
  });

  it("FR-56, UX-DR33: «Avslutt økt» etter ett bekreftet svar lagrer som avbrutt og viser «Avbrutt etter 1 av 3»", async () => {
    renderPage();
    await started();
    answer("B");
    fireEvent.click(button("Avslutt økt"));
    const title = screen.getByRole("heading", { level: 2, name: "Avbrutt etter 1 av 3" });
    expect(document.activeElement).toBe(title);
    await waitFor(() =>
      expect(saved()).toEqual([expect.objectContaining({ kind: "quiz", aborted: true, answered: 1, correct: 1 })]),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("FR-56: et valgt men ikke bekreftet svar teller ikke; Avslutt går rett tilbake uten POST", async () => {
    renderPage();
    await started();
    fireEvent.click(screen.getAllByRole("radio")[0]);
    fireEvent.click(button("Avslutt økt"));
    expect(push).toHaveBeenCalledWith("/forelesninger/l1");
    cleanup();
    expect(saved()).toHaveLength(0);
  });

  it("FR-56: lagring som feiler gir reserveteksten på resultatet", async () => {
    saveStatus = 500;
    renderPage();
    await started();
    answer("A");
    fireEvent.click(button("Avslutt økt"));
    expect((await screen.findByRole("alert")).textContent).toBe(FALLBACK_MESSAGE);
  });

  it("FR-56: å forlate økten etter et bekreftet svar lagrer den som avbrutt", async () => {
    renderPage();
    await started();
    answer("A");
    expect(saved()).toHaveLength(0);
    cleanup();
    expect(saved()).toEqual([expect.objectContaining({ kind: "quiz", aborted: true, answered: 1 })]);
  });

  it("A15: uten spørsmål vises «Det finnes ingen quizspørsmål her ennå.» og ingen panel", async () => {
    questions = [];
    renderPage();
    expect(await screen.findByRole("heading", { level: 1, name: "Det finnes ingen quizspørsmål her ennå." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Tilbake til forelesningen" }).getAttribute("href")).toBe("/forelesninger/l1");
    expect(screen.queryByText("Avslutt økt")).toBeNull();
  });

  it("FR-4: andres eller ukjent forelesning gir «Fant ikke siden»", async () => {
    lectureStatus = 404;
    renderPage();
    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });

  it("FR-32: andre feil gir reserveteksten i role=alert", async () => {
    questionsStatus = 500;
    renderPage();
    expect((await screen.findByRole("alert")).textContent).toBe(FALLBACK_MESSAGE);
  });

  describe("hurtigtaster", () => {
    it("NFR-8, FR-35: A–D velger, Enter bekrefter og går videre, og Enter uten valg gjør ingenting", async () => {
      renderPage();
      await started();
      press("Enter");
      expect(screen.getAllByRole("status")[0].textContent).toBe("");
      press("c");
      expect(screen.getAllByRole("radio")[2].getAttribute("aria-checked")).toBe("true");
      press("B");
      expect(screen.getAllByRole("radio")[1].getAttribute("aria-checked")).toBe("true");
      press("Enter");
      expect(screen.getAllByRole("status")[0].textContent).toBe("Du svarte B. Svaret er bekreftet. Riktig.");
      // After confirmation the letters do nothing.
      press("a");
      expect(screen.getAllByRole("radio")[1].getAttribute("aria-checked")).toBe("true");
      // Focus is on «Neste spørsmål»: a held Enter does not move on.
      press("Enter", { repeat: true });
      expect(heading()).toBe("Hva er Merkevare?");
      // From the page (focus on the question), Enter goes to the next.
      (document.activeElement as HTMLElement).blur();
      press("Enter");
      expect(heading()).toBe("Hva er Pris?");
      press("Escape");
      expect(screen.getByRole("heading", { level: 2, name: "Avbrutt etter 1 av 3" })).toBeTruthy();
      press("Escape");
      expect(push).toHaveBeenCalledWith("/forelesninger/l1");
    });

    it("UX-DR31: hint-linja står til venstre i bunnlinja, og ? åpner dialogen med Quiz-gruppen", async () => {
      renderPage();
      await started();
      expect(screen.getByRole("list", { name: "Hurtigtaster" }).textContent).toBe(
        "A–D velg svarEnter bekreft svarEsc avslutt",
      );
      press("?");
      const dialog = await screen.findByRole("dialog", { name: "Hurtigtaster" });
      expect(within(dialog).getByText("Bekreft svar, deretter neste spørsmål")).toBeTruthy();
    });

    it("UX-DR26: med bryteren av virker ikke A–D, hint-linja er borte, men Enter og Esc virker", async () => {
      window.localStorage.setItem(SHORTCUTS_KEY, "off");
      renderPage();
      await started();
      expect(screen.queryByRole("list", { name: "Hurtigtaster" })).toBeNull();
      press("a");
      expect(screen.getAllByRole("radio")[0].getAttribute("aria-checked")).toBe("false");
      fireEvent.click(screen.getAllByRole("radio")[0]);
      (document.activeElement as HTMLElement | null)?.blur();
      press("Enter");
      expect(screen.getAllByRole("status")[0].textContent).toContain("Du svarte A.");
      press("Escape");
      expect(screen.getByRole("heading", { level: 2, name: "Avbrutt etter 1 av 3" })).toBeTruthy();
    });

    it("UX-DR10: på smal skjerm er panelet bak «Meny», og innholdet har en skjult h1 «Quiz»", async () => {
      vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }));
      renderPage();
      const h1 = await screen.findByRole("heading", { level: 1, name: "Quiz" });
      expect(h1.className).toContain("sr-only");
      expect(screen.queryByRole("region", { name: "Quiz" })).toBeNull();
      expect(screen.getByText("SPØRSMÅL 1 AV 3")).toBeTruthy();
    });
  });
});
