// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SideMenuProvider } from "@/components/side-menu";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { SHORTCUTS_KEY } from "@/lib/practice-shortcuts";
import type { Lecture, Subject } from "@/modules/subjects/types";

import { lectureQuizQuestionsQueryKey, subjectQuizQuestionsQueryKey } from "../api";
import type { QuizQuestion } from "../types";
import { QuizSessionPage } from "./quiz-session-page";

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
    formula_flag: false,
    source: { file_id: "f1", file_name: "merkevare-notater.pdf", page_no: page },
    lecture: { id: "l1", name: "Uke 37: Merkevare" },
  };
}

let questions: QuizQuestion[] = [];
// GET /api/subjects/s1/quiz-questions: questions from two lectures.
let subjectQuestions: QuizQuestion[] = [];
let lectureStatus = 200;
let questionsStatus = 200;
let saveStatus = 204;
// The answer to DELETE /api/quiz-questions/{id} (story 4.5).
let deleteStatus = 204;
let client: QueryClient;

beforeEach(() => {
  questions = [question("a", "Merkevare", 1), question("b", "Pris", 0), question("c", "Segment", 3, 2)];
  subjectQuestions = [
    question("a", "Merkevare", 1),
    { ...question("p", "Rabatt", 2), lecture: { id: "l2", name: "Uke 38: Pris" } },
  ];
  lectureStatus = 200;
  questionsStatus = 200;
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
    if (path.startsWith("/api/quiz-questions/") && init?.method === "DELETE") {
      if (deleteStatus === 204) {
        // The server no longer has the question.
        const id = path.slice("/api/quiz-questions/".length);
        questions = questions.filter((other) => other.id !== id);
        subjectQuestions = subjectQuestions.filter((other) => other.id !== id);
        return new Response(null, { status: 204 });
      }
      return jsonResponse(deleteStatus, { error: { code: deleteStatus === 404 ? "NOT_FOUND" : "INTERNAL_ERROR", details: {} } });
    }
    if (path === "/api/practice-sessions") {
      if (saveStatus === 204) return new Response(null, { status: 204 });
      return jsonResponse(saveStatus, { error: { code: "INTERNAL_ERROR", details: {} } });
    }
    if (path === "/api/lectures/l1") {
      if (lectureStatus === 404) return jsonResponse(404, { error: { code: "NOT_FOUND", details: {} } });
      return jsonResponse(200, LECTURE);
    }
    if (path === "/api/subjects/s1") return jsonResponse(200, SUBJECT);
    if (path === "/api/subjects/s1/quiz-questions") {
      if (questionsStatus !== 200) return jsonResponse(questionsStatus, { error: { code: "INTERNAL_ERROR", details: {} } });
      return jsonResponse(200, subjectQuestions);
    }
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

function renderPage(props: { lectureId: string } | { subjectId: string } = { lectureId: "l1" }) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SideMenuProvider>
        <QuizSessionPage {...props} />
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

  it("FR-34, FR-56: hele quizen sendes én gang med kind=quiz og viser «QUIZ FERDIG» og «2 av 3 riktige»", async () => {
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
    const panel = screen.getByRole("region", { name: "Quiz" });
    expect(await within(panel).findByText("Økten er ferdig og lagret")).toBeTruthy();
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
    cleanup();
    expect(saved()).toHaveLength(1);
  });

  // The order is kept (Math.random is mocked): a (correct B), b (correct A),
  // c (correct D).
  async function finishQuiz(letters: ("A" | "B" | "C" | "D")[]) {
    renderPage();
    await started();
    letters.forEach((letter, index) => {
      answer(letter);
      fireEvent.click(button(index === letters.length - 1 ? "Se resultatet" : "Neste spørsmål"));
    });
  }

  it("FR-36, UX-DR34, UX-DR35: ferdig quiz med ett feilsvar viser undertittel og lista med ditt svar, riktig svar, forklaring og kilde", async () => {
    await finishQuiz(["B", "B", "D"]);
    expect(screen.getByRole("heading", { level: 2, name: "2 av 3 riktige" }).className).toContain("text-result-title");
    expect(
      screen.getByText("Uke 37: Merkevare · her er den ene du svarte feil på, med riktig svar og kilde"),
    ).toBeTruthy();
    const list = document.querySelector("[data-slot='missed-list']") as HTMLElement;
    const rows = within(list).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      "Spørsmål 2:Hva er Pris?merkevare-notater.pdf, side 1✗ Ditt svarSvar B om Pris✓ Riktig svarSvar A om PrisPris er et begrep i faget.",
    ]);
    expect(list.querySelectorAll("[data-slot='source-link']")).toHaveLength(1);
    // No fields with «Kunne» or a percentage for the quiz.
    expect(document.querySelector("[data-slot='result-field']")).toBeNull();
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("FR-36: alle riktige gir bare omfanget i undertittelen og ingen liste", async () => {
    await finishQuiz(["B", "A", "D"]);
    expect(screen.getByRole("heading", { level: 2, name: "3 av 3 riktige" })).toBeTruthy();
    const summary = document.querySelector("[data-slot='result-summary']") as HTMLElement;
    expect(within(summary).getByText("Uke 37: Merkevare")).toBeTruthy();
    expect(document.querySelector("[data-slot='missed-list']")).toBeNull();
  });

  it("FR-36: avbrutt etter to svar viser poengsummen for de besvarte og feilsvaret", async () => {
    renderPage();
    await started();
    answer("C");
    fireEvent.click(button("Neste spørsmål"));
    answer("A");
    fireEvent.click(button("Avslutt økt"));
    expect(screen.getByText("QUIZ FERDIG")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Avbrutt etter 2 av 3" })).toBeTruthy();
    expect(
      screen.getByText("Uke 37: Merkevare · 1 av 2 riktige · her er den ene du svarte feil på, med riktig svar og kilde"),
    ).toBeTruthy();
    const rows = within(document.querySelector("[data-slot='missed-list']") as HTMLElement).getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("Svar C om Merkevare");
    expect(rows[0].textContent).toContain("Svar B om Merkevare");
  });

  it("FR-36: det levende området sier «Økten er ferdig og lagret» når økten er lagret", async () => {
    await finishQuiz(["B", "A", "D"]);
    const live = screen.getAllByRole("status").at(-1)!;
    await waitFor(() => expect(live.textContent).toBe("Økten er ferdig og lagret"));
  });

  it("FR-36: «Ta quizen igjen» henter spørsmålene på nytt og starter en ny økt med ny session_id", async () => {
    await finishQuiz(["B", "B", "D"]);
    await waitFor(() => expect(saved()).toHaveLength(1));
    const fetchesBefore = fetchMock.mock.calls.filter(([url]) => String(url) === "/api/lectures/l1/quiz-questions").length;
    fireEvent.click(button("Ta quizen igjen"));
    // A second press while the fetch runs starts nothing more.
    fireEvent.click(button("Ta quizen igjen"));
    expect(await screen.findByText("SPØRSMÅL 1 AV 3")).toBeTruthy();
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url) === "/api/lectures/l1/quiz-questions").length,
    ).toBe(fetchesBefore + 1);
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2, name: "Hva er Merkevare?" }));
    expect(screen.getByText("0 riktige · 0 feil")).toBeTruthy();
    expect(screen.queryByText("Økten er ferdig og lagret")).toBeNull();
    for (const radio of screen.getAllByRole("radio")) expect(radio.getAttribute("aria-checked")).toBe("false");

    answer("A");
    fireEvent.click(button("Avslutt økt"));
    expect(screen.getByRole("heading", { level: 2, name: "Avbrutt etter 1 av 3" })).toBeTruthy();
    // The new session's list has only its own wrong answer.
    const rows = within(document.querySelector("[data-slot='missed-list']") as HTMLElement).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent?.slice(0, 11))).toEqual(["Spørsmål 1:"]);
    await waitFor(() => expect(saved()).toHaveLength(2));
    expect(saved()[1]).toEqual(expect.objectContaining({ aborted: true, answered: 1, correct: 0 }));
    expect(saved()[1].session_id).not.toBe(saved()[0].session_id);
  });

  it("FR-36: feiler hentingen, starter den nye økten med spørsmålene fra forrige økt", async () => {
    await finishQuiz(["B", "A", "D"]);
    questionsStatus = 500;
    fireEvent.click(button("Ta quizen igjen"));
    expect(await screen.findByText("SPØRSMÅL 1 AV 3")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("FR-36: har forelesningen ingen spørsmål lenger, vises tomtilstanden", async () => {
    await finishQuiz(["B", "A", "D"]);
    questions = [];
    fireEvent.click(button("Ta quizen igjen"));
    expect(await screen.findByRole("heading", { level: 1, name: "Det finnes ingen quizspørsmål her ennå." })).toBeTruthy();
  });

  it("FR-36: nye spørsmål fra hentingen kommer med i den nye økten", async () => {
    await finishQuiz(["B", "A", "D"]);
    questions = [...questions, question("d", "Kanal", 2)];
    fireEvent.click(button("Ta quizen igjen"));
    expect(await screen.findByText("SPØRSMÅL 1 AV 4")).toBeTruthy();
  });

  it("FR-34: neste spørsmål starter uten valg, med «Bekreft svar» inaktiv, og Enter gjør ingenting", async () => {
    renderPage();
    await started();
    answer("B");
    fireEvent.click(button("Neste spørsmål"));
    expect(heading()).toBe("Hva er Pris?");
    for (const radio of screen.getAllByRole("radio")) expect(radio.getAttribute("aria-checked")).toBe("false");
    expect(button("Bekreft svar").disabled).toBe(true);
    press("Enter");
    expect(screen.getAllByRole("status")[0].textContent).toBe("");
  });

  it("FR-56: Esc etter at siste spørsmål er bekreftet fullfører quizen i stedet for å avbryte den", async () => {
    renderPage();
    await started();
    answer("B");
    fireEvent.click(button("Neste spørsmål"));
    answer("B");
    fireEvent.click(button("Neste spørsmål"));
    answer("D");
    press("Escape");
    expect(screen.getByRole("heading", { level: 2, name: "2 av 3 riktige" })).toBeTruthy();
    await waitFor(() =>
      expect(saved()).toEqual([expect.objectContaining({ kind: "quiz", aborted: false, answered: 3, correct: 2 })]),
    );
    expect(push).not.toHaveBeenCalled();
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

    it("FR-36, UX-DR33: på resultatet tar Enter quizen igjen, men ikke en holdt Enter eller Enter på lenken", async () => {
      renderPage();
      await started();
      answer("A");
      fireEvent.click(button("Avslutt økt"));
      expect(screen.getByRole("list", { name: "Hurtigtaster" }).textContent).toBe(
        "Enter ta quizen igjenEsc tilbake til forelesningen",
      );
      press("Enter", { repeat: true });
      fireEvent.keyDown(screen.getByRole("link", { name: "Tilbake til forelesningen" }), { key: "Enter" });
      expect(screen.getByRole("heading", { level: 2, name: "Avbrutt etter 1 av 3" })).toBeTruthy();
      press("Enter");
      expect(await screen.findByText("SPØRSMÅL 1 AV 3")).toBeTruthy();
    });

    it("FR-36: ? på resultatet viser «Øv igjen / Ta quizen igjen» i hurtigtastdialogen", async () => {
      renderPage();
      await started();
      answer("A");
      fireEvent.click(button("Avslutt økt"));
      press("?");
      const dialog = await screen.findByRole("dialog", { name: "Hurtigtaster" });
      expect(within(dialog).getByText("Øv igjen / Ta quizen igjen")).toBeTruthy();
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
  describe("hele emnet (story 4.4)", () => {
    function renderSubject(subjectId = "s1") {
      renderPage({ subjectId });
    }

    async function subjectStarted() {
      expect(await screen.findByText("/ 2")).toBeTruthy();
    }

    it("FR-34: panelet viser «Quiz» og «Markedsføring, hele emnet», og økten har spørsmålene fra alle forelesningene", async () => {
      renderSubject();
      await subjectStarted();
      await waitFor(() => expect(document.title).toBe("Quiz – Markedsføring – Studiekamerat"));
      const panel = screen.getByRole("region", { name: "Quiz" });
      expect(within(panel).getByText("Markedsføring, hele emnet")).toBeTruthy();
      expect(screen.getByText("SPØRSMÅL 1 AV 2")).toBeTruthy();
      expect(heading()).toBe("Hva er Merkevare?");
      expect(fetchMock.mock.calls.some(([url]) => String(url) === "/api/subjects/s1/quiz-questions")).toBe(true);
      expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith("/api/lectures"))).toBe(false);
    });

    it("FR-34: forklaringskortet viser forelesningen til hvert spørsmål", async () => {
      renderSubject();
      await subjectStarted();
      answer("B");
      const card = document.querySelector("[data-slot='explanation-card']") as HTMLElement;
      expect(within(card).getByText("Uke 37: Merkevare")).toBeTruthy();
      fireEvent.click(button("Neste spørsmål"));
      answer("C");
      const next = document.querySelector("[data-slot='explanation-card']") as HTMLElement;
      expect(within(next).getByText("Uke 38: Pris")).toBeTruthy();
    });

    it("FR-34, FR-36: resultatet har «Markedsføring, hele emnet», forelesningen ved kilden i lista og «Tilbake til emnet»", async () => {
      renderSubject();
      await subjectStarted();
      answer("A");
      fireEvent.click(button("Neste spørsmål"));
      answer("A");
      fireEvent.click(button("Se resultatet"));
      expect(screen.getByRole("heading", { level: 2, name: "0 av 2 riktige" })).toBeTruthy();
      expect(
        screen.getByText("Markedsføring, hele emnet · her er de 2 du svarte feil på, med riktig svar og kilde"),
      ).toBeTruthy();
      const rows = within(document.querySelector("[data-slot='missed-list']") as HTMLElement).getAllByRole("listitem");
      expect(rows.map((row) => row.querySelector("[data-slot='missed-lecture']")!.textContent)).toEqual([
        "Forelesning: Uke 37: Merkevare",
        "Forelesning: Uke 38: Pris",
      ]);
      expect(screen.getByRole("link", { name: "Tilbake til emnet" }).getAttribute("href")).toBe("/emner/s1");
      expect(screen.queryByRole("link", { name: "Tilbake til forelesningen" })).toBeNull();
      expect(screen.getByText("tilbake til emnet")).toBeTruthy();
      await waitFor(() =>
        expect(saved()).toEqual([
          expect.objectContaining({ kind: "quiz", subject_id: "s1", lecture_id: null, aborted: false, answered: 2 }),
        ]),
      );
      press("Escape");
      expect(push).toHaveBeenCalledWith("/emner/s1");
    });

    it("FR-56: avsluttet etter ett bekreftet svar lagres med lecture_id null og aborted, og Esc går til emnesiden", async () => {
      renderSubject();
      await subjectStarted();
      answer("B");
      press("Escape");
      expect(screen.getByRole("heading", { level: 2, name: "Avbrutt etter 1 av 2" })).toBeTruthy();
      await waitFor(() =>
        expect(saved()).toEqual([
          expect.objectContaining({ kind: "quiz", subject_id: "s1", lecture_id: null, aborted: true, answered: 1 }),
        ]),
      );
      expect(push).not.toHaveBeenCalled();
      press("Escape");
      expect(push).toHaveBeenCalledWith("/emner/s1");
    });

    it("FR-56: «Avslutt økt» uten bekreftet svar går rett til emnesiden uten POST", async () => {
      renderSubject();
      await subjectStarted();
      fireEvent.click(button("Avslutt økt"));
      expect(push).toHaveBeenCalledWith("/emner/s1");
      cleanup();
      expect(saved()).toHaveLength(0);
    });

    it("FR-36: «Ta quizen igjen» henter emnets spørsmål på nytt", async () => {
      renderSubject();
      await subjectStarted();
      answer("B");
      fireEvent.click(button("Avslutt økt"));
      const before = fetchMock.mock.calls.filter(([url]) => String(url) === "/api/subjects/s1/quiz-questions").length;
      subjectQuestions = [...subjectQuestions, question("d", "Kanal", 2)];
      fireEvent.click(button("Ta quizen igjen"));
      expect(await screen.findByText("SPØRSMÅL 1 AV 3")).toBeTruthy();
      expect(fetchMock.mock.calls.filter(([url]) => String(url) === "/api/subjects/s1/quiz-questions").length).toBe(
        before + 1,
      );
    });

    it("A15: uten spørsmål vises tomtilstanden med «Tilbake til emnet»", async () => {
      subjectQuestions = [];
      renderSubject();
      expect(await screen.findByRole("heading", { level: 1, name: "Det finnes ingen quizspørsmål her ennå." })).toBeTruthy();
      expect(screen.getByRole("link", { name: "Tilbake til emnet" }).getAttribute("href")).toBe("/emner/s1");
    });

    it("FR-4: andres eller ukjent emne gir «Fant ikke siden»", async () => {
      renderSubject("s9");
      await waitFor(() => expect(notFound).toHaveBeenCalled());
    });
  });
  describe("slett et spørsmål (story 4.5)", () => {
    // The DELETE requests to /api/quiz-questions/{id}.
    function deleteCalls(): string[] {
      return fetchMock.mock.calls
        .filter(([url, init]) => String(url).startsWith("/api/quiz-questions/") && init?.method === "DELETE")
        .map(([url]) => String(url));
    }

    // «Slett» gets focus first (as with a click in the browser), so focus can go back to it.
    async function openDelete() {
      const remove = button("Slett");
      remove.focus();
      fireEvent.click(remove);
      const dialog = await screen.findByRole("dialog", { name: "Slette spørsmålet?" });
      await within(dialog).findByText("Det kan ikke angres.");
      return dialog;
    }

    async function confirmDelete(dialog: HTMLElement) {
      fireEvent.click(within(dialog).getByRole("button", { name: "Slett spørsmålet" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    }

    function counter(): string {
      return document.querySelector(".text-session-counter")!.textContent!;
    }

    it("FR-37, UX-DR29: «Slett» står i bunnfeltet før og etter bekreftelse, og det finnes ingen «Rediger»", async () => {
      renderPage();
      await started();
      expect(button("Slett").dataset.variant).toBe("text");
      expect(screen.queryByRole("button", { name: "Rediger" })).toBeNull();
      answer("B");
      expect(button("Slett").dataset.variant).toBe("text");
      expect(screen.queryByRole("button", { name: "Rediger" })).toBeNull();
    });

    it("FR-37, UX-DR22, E22: slett ubekreftet gir bekreftelsen, «1 / 2», ruten borte og nytt spørsmål uten valg", async () => {
      renderPage();
      await started();
      fireEvent.click(screen.getAllByRole("radio")[1]);
      const dialog = await openDelete();
      expect(within(dialog).getByText("Hva er Merkevare?")).toBeTruthy();
      expect(dialog.textContent).not.toContain("Dette sletter også");
      expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Avbryt" }));
      expect(within(dialog).getByRole("button", { name: "Slett spørsmålet" }).dataset.variant).toBe("danger");

      await confirmDelete(dialog);
      expect(deleteCalls()).toEqual(["/api/quiz-questions/a"]);
      expect(screen.getByText("/ 2")).toBeTruthy();
      expect(counter()).toBe("1");
      expect(screen.getByText("SPØRSMÅL 1 AV 2")).toBeTruthy();
      expect(screen.queryByText("Spørsmål 3: ikke besvart ennå")).toBeNull();
      expect(heading()).toBe("Hva er Pris?");
      expect(screen.getAllByRole("radio").every((radio) => radio.getAttribute("aria-checked") === "false")).toBe(true);
      expect(button("Bekreft svar").disabled).toBe(true);
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2 })));
    });

    it("FR-37: sletting fjerner spørsmålet fra cachen og oppfrisker forelesningen og alle emners øvingslister", async () => {
      renderPage();
      await started();
      // The refetch fails; the deleted (unconfirmed) question is out of the
      // session's order, and the cache has lost it too.
      questionsStatus = 500;
      const dialog = await openDelete();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      await confirmDelete(dialog);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["lectures", "l1"] });
      const predicate = (invalidate.mock.calls.find(([filters]) => filters && "predicate" in filters)![0] as {
        predicate: (query: { queryKey: readonly unknown[] }) => boolean;
      }).predicate;
      expect(predicate({ queryKey: subjectQuizQuestionsQueryKey("s9") })).toBe(true);
      expect(predicate({ queryKey: ["subjects", "s9", "flashcards"] })).toBe(true);
      expect(predicate({ queryKey: ["subjects", "s9"] })).toBe(false);
      expect(client.getQueryData<QuizQuestion[]>(lectureQuizQuestionsQueryKey("l1"))!.map((other) => other.id)).toEqual([
        "b",
        "c",
      ]);

      answer("A");
      fireEvent.click(button("Avslutt økt"));
      fireEvent.click(button("Ta quizen igjen"));
      expect(await screen.findByText("SPØRSMÅL 1 AV 2")).toBeTruthy();
    });

    it("FR-37, E22: slett bekreftet riktig: «2 / 3», ruten ✓ står og «1 riktige · 0 feil»", async () => {
      renderPage();
      await started();
      answer("B");
      await confirmDelete(await openDelete());
      expect(screen.getByText("/ 3")).toBeTruthy();
      expect(counter()).toBe("2");
      expect(screen.getByText("Spørsmål 1: riktig")).toBeTruthy();
      expect(screen.getByText("1 riktige · 0 feil")).toBeTruthy();
      expect(heading()).toBe("Hva er Pris?");
      expect(button("Bekreft svar").disabled).toBe(true);
    });

    it("FR-37: et bekreftet spørsmål som er slettet, kommer ikke tilbake i «Ta quizen igjen» når hentingen feiler", async () => {
      renderPage();
      await started();
      answer("B");
      await confirmDelete(await openDelete());
      answer("A");
      fireEvent.click(button("Neste spørsmål"));
      answer("D");
      fireEvent.click(button("Se resultatet"));
      expect(screen.getByRole("heading", { level: 2, name: "3 av 3 riktige" })).toBeTruthy();
      // The refetch fails, so only the cache change keeps the question out.
      questionsStatus = 500;
      fireEvent.click(button("Ta quizen igjen"));
      expect(await screen.findByText("SPØRSMÅL 1 AV 2")).toBeTruthy();
      expect(screen.getByText("/ 2")).toBeTruthy();
      expect(document.querySelector("[data-question-title]")!.textContent).not.toBe("Hva er Merkevare?");
      expect(screen.queryByText("Hva er Merkevare?")).toBeNull();
    });

    it("FR-37, E22: slett bekreftet feil: resultatet teller feilen og lista viser spørsmålet", async () => {
      renderPage();
      await started();
      answer("C");
      await confirmDelete(await openDelete());
      answer("A");
      fireEvent.click(button("Neste spørsmål"));
      answer("D");
      fireEvent.click(button("Se resultatet"));
      expect(screen.getByRole("heading", { level: 2, name: "2 av 3 riktige" })).toBeTruthy();
      expect(screen.getByText("Hva er Merkevare?")).toBeTruthy();
      await waitFor(() =>
        expect(saved()).toEqual([expect.objectContaining({ aborted: false, answered: 3, correct: 2, wrong: 1 })]),
      );
    });

    it("FR-37, E22: siste spørsmål slettet når noe er besvart: økten er ferdig, lagres og viser resultatet", async () => {
      renderPage();
      await started();
      answer("B");
      fireEvent.click(button("Neste spørsmål"));
      answer("A");
      fireEvent.click(button("Neste spørsmål"));
      await confirmDelete(await openDelete());
      const title = await screen.findByRole("heading", { level: 2, name: "2 av 2 riktige" });
      await waitFor(() => expect(document.activeElement).toBe(title));
      await waitFor(() =>
        expect(saved()).toEqual([expect.objectContaining({ kind: "quiz", aborted: false, answered: 2, correct: 2 })]),
      );
      expect(push).not.toHaveBeenCalled();
    });

    it("FR-37, E22: eneste spørsmål slettet går tilbake til forelesningen uten lagring", async () => {
      questions = [question("a", "Merkevare", 1)];
      renderPage();
      expect(await screen.findByText("/ 1")).toBeTruthy();
      await confirmDelete(await openDelete());
      await waitFor(() => expect(push).toHaveBeenCalledWith("/forelesninger/l1"));
      expect(saved()).toEqual([]);
    });

    it("FR-37: avbryt sletter ingenting, Esc heller ikke, valget står og fokus går tilbake til «Slett»", async () => {
      renderPage();
      await started();
      fireEvent.click(screen.getAllByRole("radio")[1]);
      let dialog = await openDelete();
      // The session's keys are off while the dialog is open: no new choice, no confirmation.
      press("c");
      press("Enter");
      fireEvent.click(within(dialog).getByRole("button", { name: "Avbryt" }));
      expect(screen.queryByRole("dialog")).toBeNull();
      await waitFor(() => expect(document.activeElement).toBe(button("Slett")));
      expect(screen.getAllByRole("radio")[1].getAttribute("aria-checked")).toBe("true");
      expect(screen.getAllByRole("radio")[2].getAttribute("aria-checked")).toBe("false");
      expect(button("Bekreft svar").disabled).toBe(false);

      dialog = await openDelete();
      fireEvent.keyDown(dialog, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
      await waitFor(() => expect(document.activeElement).toBe(button("Slett")));
      expect(deleteCalls()).toEqual([]);
      expect(heading()).toBe("Hva er Merkevare?");
      expect(screen.getByText("/ 3")).toBeTruthy();
      expect(screen.getByText("0 riktige · 0 feil")).toBeTruthy();
      expect(push).not.toHaveBeenCalled();
    });

    it("FR-37, E22: 404 ved sletting (allerede borte) tar også spørsmålet ut", async () => {
      deleteStatus = 404;
      renderPage();
      await started();
      await confirmDelete(await openDelete());
      expect(screen.getByText("/ 2")).toBeTruthy();
    });

    it("FR-37: en annen feil ved sletting viser reserveteksten, og spørsmålet står", async () => {
      deleteStatus = 500;
      renderPage();
      await started();
      const dialog = await openDelete();
      fireEvent.click(within(dialog).getByRole("button", { name: "Slett spørsmålet" }));
      expect((await within(dialog).findByRole("alert")).textContent).toBe(FALLBACK_MESSAGE);
      expect(screen.getByText("/ 3")).toBeTruthy();
      expect(document.querySelector("[data-question-title]")!.textContent).toBe("Hva er Merkevare?");
    });

    it("FR-37: i en emneøkt oppdateres spørsmålets egen forelesning og emnets liste i cachen", async () => {
      subjectQuestions = [{ ...question("p", "Rabatt", 2), lecture: { id: "l2", name: "Uke 38: Pris" } }, question("a", "Merkevare", 1)];
      renderPage({ subjectId: "s1" });
      expect(await screen.findByText("/ 2")).toBeTruthy();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      await confirmDelete(await openDelete());
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["lectures", "l2"] });
      expect(client.getQueryData<QuizQuestion[]>(subjectQuizQuestionsQueryKey("s1"))!.map((other) => other.id)).toEqual([
        "a",
      ]);
      expect(screen.getByText("/ 1")).toBeTruthy();
    });
  });
});
