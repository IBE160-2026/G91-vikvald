// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SideMenuProvider } from "@/components/side-menu";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { SHORTCUTS_KEY } from "@/lib/practice-shortcuts";
import type { Lecture, Subject } from "@/modules/subjects/types";

import { freetextCountsText } from "../adapter";
import { lectureFreetextQuestionsQueryKey, subjectFreetextQuestionsQueryKey } from "../api";
import { hasAnswer, wordCount } from "../components/freetext-question";
import type { FreetextQuestion } from "../types";
import { FreetextSessionPage } from "./freetext-session-page";

const notFound = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  notFound: () => notFound(),
  usePathname: () => "/forelesninger/l1/fritekst",
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

function question(id: string, term: string, page = 1, formula = false): FreetextQuestion {
  return {
    id,
    kind: "short",
    question: `Forklar ${term}.`,
    model_answer: `${term} er et begrep i faget.`,
    formula_flag: formula,
    source: { file_id: "f1", file_name: "merkevare-notater.pdf", page_no: page },
    lecture: { id: "l1", name: "Uke 37: Merkevare" },
  };
}

let questions: FreetextQuestion[] = [];
// GET /api/subjects/s1/freetext-questions: questions from two lectures (story 8.3).
let subjectQuestions: FreetextQuestion[] = [];
let lectureStatus = 200;
// 200, 404 (FEATURE_DISABLED) or 500.
let questionsStatus = 200;
let saveStatus = 204;
// The answer to DELETE /api/freetext-questions/{id} (story 8.3).
let deleteStatus = 204;
let client: QueryClient;

beforeEach(() => {
  questions = [question("a", "Merkevare"), question("b", "Pris", 2, true), question("c", "Segment", 3)];
  subjectQuestions = [
    question("a", "Merkevare"),
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
    if (path.startsWith("/api/freetext-questions/") && init?.method === "DELETE") {
      if (deleteStatus === 204) {
        // The server no longer has the question.
        const id = path.slice("/api/freetext-questions/".length);
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
    if (path === "/api/subjects/s1/freetext-questions") {
      if (questionsStatus === 404) return jsonResponse(404, { error: { code: "FEATURE_DISABLED", details: {} } });
      if (questionsStatus !== 200) return jsonResponse(questionsStatus, { error: { code: "INTERNAL_ERROR", details: {} } });
      return jsonResponse(200, subjectQuestions);
    }
    if (path === "/api/lectures/l1/freetext-questions") {
      if (questionsStatus === 404) return jsonResponse(404, { error: { code: "FEATURE_DISABLED", details: {} } });
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
        <FreetextSessionPage {...props} />
      </SideMenuProvider>
    </QueryClientProvider>,
  );
}

function press(key: string) {
  fireEvent.keyDown(document.activeElement ?? document.body, { key });
}

function button(name: string): HTMLButtonElement {
  return screen.getByRole("button", { name }) as HTMLButtonElement;
}

function field(): HTMLTextAreaElement {
  return screen.getByRole("textbox", { name: "Ditt svar" }) as HTMLTextAreaElement;
}

function heading(): string {
  return screen.getByRole("heading", { level: 2 }).textContent!;
}

function saved(): Record<string, unknown>[] {
  return fetchMock.mock.calls
    .filter(([url]) => String(url) === "/api/practice-sessions")
    .map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>);
}

function write(text: string) {
  fireEvent.change(field(), { target: { value: text } });
}

// Write an answer, show the model answer and assess it with the button.
function answerAndAssess(name: "Feil" | "Delvis riktig" | "Riktig") {
  write("Mitt svar");
  fireEvent.click(button("Vis modellsvar"));
  fireEvent.click(button(name));
}

async function started() {
  expect(await screen.findByText("/ 3")).toBeTruthy();
}

describe("rene hjelpere", () => {
  it("E28: bare mellomrom og linjeskift er ikke et svar", () => {
    expect(hasAnswer("")).toBe(false);
    expect(hasAnswer("   ")).toBe(false);
    expect(hasAnswer("\n\n")).toBe(false);
    expect(hasAnswer(" a ")).toBe(true);
  });

  it("FR-51: ordtellingen teller ord skilt med mellomrom og linjeskift", () => {
    expect(wordCount("  To  ord\nher ")).toBe(3);
    expect(wordCount("")).toBe(0);
  });

  it("FR-51: tellelinja viser bare tallene som ikke er null, i rekkefølgen riktig, delvis riktig, feil", () => {
    expect(freetextCountsText({ correct: 0, partial: 0, wrong: 0 })).toBe("Ingen vurdert ennå");
    expect(freetextCountsText({ correct: 0, partial: 1, wrong: 0 })).toBe("1 delvis riktig");
    expect(freetextCountsText({ correct: 2, partial: 1, wrong: 3 })).toBe("2 riktig · 1 delvis riktig · 3 feil");
  });
});

describe("FreetextSessionPage", () => {
  it("FR-50, UX-DR8: panelet viser «Fritekst», forelesningen, «1 / 3», «Ingen vurdert ennå» og forklaringen; fokus i «Ditt svar»", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { level: 1, name: "Fritekst" })).toBeTruthy();
    await started();
    await waitFor(() => expect(document.title).toBe("Fritekst – Uke 37: Merkevare – Studiekamerat"));
    const panel = screen.getByRole("region", { name: "Fritekst" });
    expect(within(panel).getByText("Uke 37: Merkevare")).toBeTruthy();
    expect(within(panel).getByText("Ingen vurdert ennå")).toBeTruthy();
    for (const text of ["Riktig", "Delvis riktig", "Feil", "Ikke besvart ennå"]) {
      expect(within(panel).getByText(text)).toBeTruthy();
    }
    expect(within(panel).getByRole("button", { name: "Avslutt økt" })).toBeTruthy();
    expect(screen.getByText("SPØRSMÅL 1 AV 3")).toBeTruthy();
    expect(heading()).toBe("Forklar Merkevare.");
    expect(document.activeElement).toBe(field());
    expect(screen.queryByText("Modellsvar")).toBeNull();
    expect(screen.queryByText("Merkevare er et begrep i faget.")).toBeNull();
  });

  it("E28: «Vis modellsvar» er ikke aktiv med tomt felt, bare mellomrom eller bare linjeskift", async () => {
    renderPage();
    await started();
    expect(button("Vis modellsvar").disabled).toBe(true);
    write("   ");
    expect(button("Vis modellsvar").disabled).toBe(true);
    write("\n\n");
    expect(button("Vis modellsvar").disabled).toBe(true);
    write("Et svar");
    expect(button("Vis modellsvar").disabled).toBe(false);
  });

  it("FR-49, FR-51, A8: «Vis modellsvar» låser feltet, viser «Levert · 3 ord», modellsvaret med kilde og fokus på «Modellsvar», og selvvurderingen uten forhåndsvalg", async () => {
    renderPage();
    await started();
    write("  To  ord\nher ");
    fireEvent.click(button("Vis modellsvar"));
    expect(field().readOnly).toBe(true);
    const delivered = screen.getByText("Levert · 3 ord");
    expect(field().getAttribute("aria-describedby")).toBe(delivered.id);
    expect(screen.getByRole("region", { name: "Modellsvar" })).toBeTruthy();
    const title = screen.getByRole("heading", { level: 3, name: "Modellsvar" });
    expect(title.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(title);
    const card = title.closest("[data-slot='model-answer']")!;
    expect(within(card as HTMLElement).getByText("Merkevare er et begrep i faget.")).toBeTruthy();
    expect(within(card as HTMLElement).getByText("merkevare-notater.pdf, side 1")).toBeTruthy();
    expect(within(card as HTMLElement).getByText("Uke 37: Merkevare")).toBeTruthy();
    expect(card.querySelector("[data-slot='formula-flag']")).toBeNull();

    expect(screen.getByRole("heading", { level: 3, name: "Hvordan gikk det?" })).toBeTruthy();
    expect(screen.getByText("Vurder selv mot modellsvaret.")).toBeTruthy();
    const buttons = ["Feil", "Delvis riktig", "Riktig"].map(button);
    for (const item of buttons) {
      expect(item.dataset.variant).toBe("outline");
      expect(item.getAttribute("aria-pressed")).toBeNull();
    }
    expect(screen.queryByRole("button", { name: "Vis modellsvar" })).toBeNull();
  });

  it("FR-41, FR-51: modellsvaret viser formelmerket når spørsmålet har det", async () => {
    questions = [question("b", "Pris", 2, true)];
    renderPage();
    expect(await screen.findByText("/ 1")).toBeTruthy();
    write("Svar");
    fireEvent.click(button("Vis modellsvar"));
    const card = document.querySelector("[data-slot='model-answer']")!;
    expect(card.querySelector("[data-slot='formula-flag']")).toBeTruthy();
  });

  it("FR-51: «Delvis riktig» gir ◐ i ruta, «1 delvis riktig», neste spørsmål med tomt felt og fokus i «Ditt svar»", async () => {
    renderPage();
    await started();
    answerAndAssess("Delvis riktig");
    expect(screen.getByText("Spørsmål 1: delvis riktig")).toBeTruthy();
    expect(screen.getByText("1 delvis riktig")).toBeTruthy();
    expect(screen.getByText("SPØRSMÅL 2 AV 3")).toBeTruthy();
    expect(heading()).toBe("Forklar Pris.");
    expect(field().value).toBe("");
    expect(field().readOnly).toBe(false);
    expect(document.activeElement).toBe(field());
    expect(screen.queryByText("Modellsvar")).toBeNull();
  });

  it("FR-50, FR-51, FR-56: hele økten sendes én gang med kind=freetext og riktige tall, og resultatet har tre felt og lista", async () => {
    renderPage();
    await started();
    answerAndAssess("Riktig");
    answerAndAssess("Delvis riktig");
    answerAndAssess("Feil");

    const title = screen.getByRole("heading", { level: 2, name: "Du har gått gjennom alle 3 spørsmålene" });
    await waitFor(() => expect(document.activeElement).toBe(title));
    expect(screen.getByText("ØKT FERDIG")).toBeTruthy();
    const fields = Array.from(document.querySelectorAll("[data-slot='result-field']")).map((item) => item.textContent);
    expect(fields).toEqual(["Riktig1", "Delvis riktig1", "Feil1"]);
    const list = screen.getByRole("region", { name: "Feil og delvis riktig" });
    expect(within(list).getByText("2 spørsmål")).toBeTruthy();
    expect(within(list).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Spørsmål 2:Delvis riktigForklar Pris.Pris er et begrep i faget.Inneholder formel – sjekk mot kildenmerkevare-notater.pdf, side 2",
      "Spørsmål 3:FeilForklar Segment.Segment er et begrep i faget.merkevare-notater.pdf, side 3",
    ]);
    // Her answers are never shown or sent.
    expect(document.body.textContent).not.toContain("Mitt svar");
    expect(screen.getByRole("link", { name: "Tilbake til forelesningen" }).getAttribute("href")).toBe("/forelesninger/l1");
    expect(button("Øv igjen")).toBeTruthy();

    const panel = screen.getByRole("region", { name: "Fritekst" });
    expect(await within(panel).findByText("Økten er ferdig og lagret")).toBeTruthy();
    await waitFor(() =>
      expect(screen.getAllByRole("status").some((region) => region.textContent === "Økten er ferdig og lagret")).toBe(true),
    );
    expect(saved()).toEqual([
      expect.objectContaining({
        kind: "freetext",
        lecture_id: "l1",
        subject_id: "s1",
        aborted: false,
        shown: 3,
        answered: 3,
        correct: 1,
        partial: 1,
        wrong: 1,
      }),
    ]);
    expect(JSON.stringify(saved())).not.toContain("Mitt svar");
    cleanup();
    expect(saved()).toHaveLength(1);
  });

  it("FR-51: ett spørsmål gir «Du har gått gjennom 1 spørsmål», og uten Feil og Delvis riktig er det ingen liste", async () => {
    questions = [question("a", "Merkevare")];
    renderPage();
    expect(await screen.findByText("/ 1")).toBeTruthy();
    answerAndAssess("Riktig");
    expect(screen.getByRole("heading", { level: 2, name: "Du har gått gjennom 1 spørsmål" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Feil og delvis riktig" })).toBeNull();
  });

  it("FR-56: lagring som feiler gir reserveteksten i role=alert", async () => {
    saveStatus = 500;
    renderPage();
    await started();
    answerAndAssess("Riktig");
    answerAndAssess("Delvis riktig");
    answerAndAssess("Feil");
    expect((await screen.findByRole("alert")).textContent).toBe(FALLBACK_MESSAGE);
  });

  it("FR-56, UX-DR33: «Avslutt økt» etter én vurdering lagrer som avbrutt og viser «Avbrutt etter 1 av 3»", async () => {
    renderPage();
    await started();
    answerAndAssess("Feil");
    fireEvent.click(button("Avslutt økt"));
    expect(screen.getByRole("heading", { level: 2, name: "Avbrutt etter 1 av 3" })).toBeTruthy();
    await waitFor(() =>
      expect(saved()).toEqual([
        expect.objectContaining({ kind: "freetext", aborted: true, answered: 1, correct: 0, partial: 0, wrong: 1 }),
      ]),
    );
    const panel = screen.getByRole("region", { name: "Fritekst" });
    expect(within(panel).queryByRole("button", { name: "Avslutt økt" })).toBeNull();
  });

  it("FR-56: «Avslutt økt» før første vurdering går rett tilbake og lagrer ingenting, også med modellsvaret vist", async () => {
    renderPage();
    await started();
    write("Svar");
    fireEvent.click(button("Vis modellsvar"));
    fireEvent.click(button("Avslutt økt"));
    expect(push).toHaveBeenCalledWith("/forelesninger/l1");
    cleanup();
    expect(saved()).toEqual([]);
  });

  it("FR-56: å forlate økten etter en vurdering lagrer den som avbrutt", async () => {
    renderPage();
    await started();
    answerAndAssess("Riktig");
    expect(saved()).toHaveLength(0);
    cleanup();
    expect(saved()).toEqual([expect.objectContaining({ kind: "freetext", aborted: true, answered: 1, correct: 1 })]);
  });

  it("FR-50: «Øv igjen» starter en ny økt med samme spørsmål, ny session_id og fokus i feltet", async () => {
    renderPage();
    await started();
    answerAndAssess("Riktig");
    answerAndAssess("Riktig");
    answerAndAssess("Riktig");
    fireEvent.click(button("Øv igjen"));
    expect(await screen.findByText("SPØRSMÅL 1 AV 3")).toBeTruthy();
    expect(field().value).toBe("");
    await waitFor(() => expect(document.activeElement).toBe(field()));
    answerAndAssess("Feil");
    fireEvent.click(button("Avslutt økt"));
    await waitFor(() => expect(saved()).toHaveLength(2));
    const [first, second] = saved();
    expect(second.session_id).not.toBe(first.session_id);
    expect(second).toEqual(expect.objectContaining({ aborted: true, answered: 1, wrong: 1 }));
  });

  it("FR-50: feiler hentingen ved «Øv igjen», starter den nye økten med spørsmålene fra forrige økt", async () => {
    renderPage();
    await started();
    answerAndAssess("Riktig");
    answerAndAssess("Riktig");
    answerAndAssess("Riktig");
    questionsStatus = 500;
    fireEvent.click(button("Øv igjen"));
    expect(await screen.findByText("SPØRSMÅL 1 AV 3")).toBeTruthy();
    expect(field().value).toBe("");
    await waitFor(() => expect(document.activeElement).toBe(field()));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("FR-50: kommer hentingen ved «Øv igjen» tom tilbake, brukes spørsmålene fra forrige økt", async () => {
    renderPage();
    await started();
    answerAndAssess("Riktig");
    answerAndAssess("Riktig");
    answerAndAssess("Riktig");
    questions = [];
    fireEvent.click(button("Øv igjen"));
    expect(await screen.findByText("SPØRSMÅL 1 AV 3")).toBeTruthy();
    expect(screen.queryByText("Det finnes ingen fritekstspørsmål her ennå.")).toBeNull();
  });

  it("FR-50: spørsmålene stokkes, så økten starter ikke nødvendigvis med det første fra API-et", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    renderPage();
    await started();
    expect(heading()).not.toBe("Forklar Merkevare.");
  });

  it("A15: uten spørsmål vises «Det finnes ingen fritekstspørsmål her ennå.» og ingen panel", async () => {
    questions = [];
    renderPage();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Det finnes ingen fritekstspørsmål her ennå." }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Tilbake til forelesningen" }).getAttribute("href")).toBe("/forelesninger/l1");
    expect(screen.queryByText("Avslutt økt")).toBeNull();
  });

  it("FR-4: andres eller ukjent forelesning gir «Fant ikke siden»", async () => {
    lectureStatus = 404;
    renderPage();
    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });

  it("AR-11: med FEATURE_FREETEXT av (404 FEATURE_DISABLED) gir siden «Fant ikke siden»", async () => {
    questionsStatus = 404;
    renderPage();
    await waitFor(() => expect(notFound).toHaveBeenCalled());
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("FR-50: andre feil gir reserveteksten i role=alert", async () => {
    questionsStatus = 500;
    renderPage();
    expect((await screen.findByRole("alert")).textContent).toBe(FALLBACK_MESSAGE);
  });

  describe("hurtigtaster", () => {
    it("E27: 1/2/3 gjør ingenting før modellsvaret eller i feltet", async () => {
      renderPage();
      await started();
      // In the field (focus is there): the shared rule ignores the key.
      press("2");
      (document.activeElement as HTMLElement | null)?.blur();
      // Outside the field, but before «Vis modellsvar».
      press("1");
      press("3");
      expect(screen.getByText("Ingen vurdert ennå")).toBeTruthy();
      expect(screen.getByText("SPØRSMÅL 1 AV 3")).toBeTruthy();
      expect(screen.queryByRole("list", { name: "Hurtigtaster" })).toBeNull();
    });

    it("NFR-8, FR-51: 2 etter modellsvaret gir ◐ og neste spørsmål, og hint-linja står til høyre under knappene", async () => {
      renderPage();
      await started();
      write("Svar");
      fireEvent.click(button("Vis modellsvar"));
      const hints = screen.getByRole("list", { name: "Hurtigtaster" });
      expect(within(hints).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
        "1 Feil",
        "2 Delvis riktig",
        "3 Riktig",
        "Esc avslutt",
      ]);
      expect(hints.className).toContain("justify-end");
      press("2");
      expect(screen.getByText("Spørsmål 1: delvis riktig")).toBeTruthy();
      expect(document.activeElement).toBe(field());
      write("Svar");
      fireEvent.click(button("Vis modellsvar"));
      press("1");
      write("Svar");
      fireEvent.click(button("Vis modellsvar"));
      press("3");
      expect(screen.getByRole("heading", { level: 2, name: "Du har gått gjennom alle 3 spørsmålene" })).toBeTruthy();
      await waitFor(() =>
        expect(saved()).toEqual([expect.objectContaining({ correct: 1, partial: 1, wrong: 1, aborted: false })]),
      );
    });

    it("FR-56: Esc avslutter, men ikke mens fokus står i feltet", async () => {
      renderPage();
      await started();
      answerAndAssess("Riktig");
      // Focus is in the next «Ditt svar».
      press("Escape");
      expect(screen.getByText("SPØRSMÅL 2 AV 3")).toBeTruthy();
      (document.activeElement as HTMLElement | null)?.blur();
      press("Escape");
      expect(screen.getByRole("heading", { level: 2, name: "Avbrutt etter 1 av 3" })).toBeTruthy();
    });

    it("FR-50: på resultatet starter Enter en ny økt og Esc går til forelesningen", async () => {
      renderPage();
      await started();
      answerAndAssess("Riktig");
      fireEvent.click(button("Avslutt økt"));
      const title = screen.getByRole("heading", { level: 2, name: "Avbrutt etter 1 av 3" });
      await waitFor(() => expect(document.activeElement).toBe(title));
      press("Escape");
      expect(push).toHaveBeenCalledWith("/forelesninger/l1");
      press("Enter");
      expect(await screen.findByText("SPØRSMÅL 1 AV 3")).toBeTruthy();
    });

    it("UX-DR26: med bryteren av virker ikke 1/2/3 og hint-linja er borte, men Esc virker", async () => {
      window.localStorage.setItem(SHORTCUTS_KEY, "off");
      renderPage();
      await started();
      write("Svar");
      fireEvent.click(button("Vis modellsvar"));
      expect(screen.queryByRole("list", { name: "Hurtigtaster" })).toBeNull();
      press("2");
      expect(screen.getByText("SPØRSMÅL 1 AV 3")).toBeTruthy();
      fireEvent.click(button("Riktig"));
      (document.activeElement as HTMLElement | null)?.blur();
      press("Escape");
      expect(screen.getByRole("heading", { level: 2, name: "Avbrutt etter 1 av 3" })).toBeTruthy();
    });

    it("UX-DR10: på smal skjerm er panelet bak «Meny», og innholdet har en skjult h1 «Fritekst»", async () => {
      vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }));
      renderPage();
      const h1 = await screen.findByRole("heading", { level: 1, name: "Fritekst" });
      expect(h1.className).toContain("sr-only");
      expect(screen.getByText("SPØRSMÅL 1 AV 3")).toBeTruthy();
    });
  });

  describe("hele emnet (story 8.3)", () => {
    function renderSubject(subjectId = "s1") {
      renderPage({ subjectId });
    }

    async function subjectStarted() {
      expect(await screen.findByText("/ 2")).toBeTruthy();
    }

    it("FR-50: panelet viser «Fritekst» og «Markedsføring, hele emnet», og økten har spørsmålene fra alle forelesningene", async () => {
      renderSubject();
      await subjectStarted();
      await waitFor(() => expect(document.title).toBe("Fritekst – Markedsføring – Studiekamerat"));
      const panel = screen.getByRole("region", { name: "Fritekst" });
      expect(within(panel).getByText("Markedsføring, hele emnet")).toBeTruthy();
      expect(screen.getByText("SPØRSMÅL 1 AV 2")).toBeTruthy();
      expect(heading()).toBe("Forklar Merkevare.");
      expect(document.activeElement).toBe(field());
      expect(fetchMock.mock.calls.some(([url]) => String(url) === "/api/subjects/s1/freetext-questions")).toBe(true);
      expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith("/api/lectures"))).toBe(false);
    });

    it("FR-50: modellsvaret viser forelesningen til hvert spørsmål", async () => {
      renderSubject();
      await subjectStarted();
      write("Svar");
      fireEvent.click(button("Vis modellsvar"));
      const card = document.querySelector("[data-slot='model-answer']") as HTMLElement;
      expect(within(card).getByText("Uke 37: Merkevare")).toBeTruthy();
      fireEvent.click(button("Riktig"));
      write("Svar");
      fireEvent.click(button("Vis modellsvar"));
      const next = document.querySelector("[data-slot='model-answer']") as HTMLElement;
      expect(within(next).getByText("Uke 38: Pris")).toBeTruthy();
    });

    it("FR-50, FR-56: resultatet har «Markedsføring, hele emnet», forelesningen i lista, «Tilbake til emnet» og lagres med lecture_id null", async () => {
      renderSubject();
      await subjectStarted();
      answerAndAssess("Feil");
      answerAndAssess("Delvis riktig");
      expect(screen.getByRole("heading", { level: 2, name: "Du har gått gjennom alle 2 spørsmålene" })).toBeTruthy();
      expect(screen.getAllByText("Markedsføring, hele emnet").length).toBeGreaterThan(0);
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
          expect.objectContaining({
            kind: "freetext",
            subject_id: "s1",
            lecture_id: null,
            aborted: false,
            answered: 2,
            correct: 0,
            partial: 1,
            wrong: 1,
          }),
        ]),
      );
      press("Escape");
      expect(push).toHaveBeenCalledWith("/emner/s1");
    });

    it("FR-56: avbrutt etter én vurdering lagres med lecture_id null og aborted", async () => {
      renderSubject();
      await subjectStarted();
      answerAndAssess("Riktig");
      fireEvent.click(button("Avslutt økt"));
      expect(screen.getByRole("heading", { level: 2, name: "Avbrutt etter 1 av 2" })).toBeTruthy();
      await waitFor(() =>
        expect(saved()).toEqual([
          expect.objectContaining({ kind: "freetext", subject_id: "s1", lecture_id: null, aborted: true, answered: 1 }),
        ]),
      );
      expect(push).not.toHaveBeenCalled();
    });

    it("FR-56: «Avslutt økt» uten vurdering går rett til emnesiden uten POST", async () => {
      renderSubject();
      await subjectStarted();
      fireEvent.click(button("Avslutt økt"));
      expect(push).toHaveBeenCalledWith("/emner/s1");
      cleanup();
      expect(saved()).toHaveLength(0);
    });

    it("FR-50: «Øv igjen» henter emnets spørsmål på nytt", async () => {
      renderSubject();
      await subjectStarted();
      answerAndAssess("Riktig");
      fireEvent.click(button("Avslutt økt"));
      const before = fetchMock.mock.calls.filter(([url]) => String(url) === "/api/subjects/s1/freetext-questions").length;
      subjectQuestions = [...subjectQuestions, question("d", "Kanal", 2)];
      fireEvent.click(button("Øv igjen"));
      expect(await screen.findByText("SPØRSMÅL 1 AV 3")).toBeTruthy();
      expect(
        fetchMock.mock.calls.filter(([url]) => String(url) === "/api/subjects/s1/freetext-questions").length,
      ).toBe(before + 1);
    });

    it("A15: uten spørsmål vises tomtilstanden med «Tilbake til emnet»", async () => {
      subjectQuestions = [];
      renderSubject();
      expect(
        await screen.findByRole("heading", { level: 1, name: "Det finnes ingen fritekstspørsmål her ennå." }),
      ).toBeTruthy();
      expect(screen.getByRole("link", { name: "Tilbake til emnet" }).getAttribute("href")).toBe("/emner/s1");
    });

    it("FR-4: andres eller ukjent emne gir «Fant ikke siden»", async () => {
      renderSubject("s9");
      await waitFor(() => expect(notFound).toHaveBeenCalled());
    });

    it("AR-11: bryteren av gir «Fant ikke siden» også for emneøkten", async () => {
      questionsStatus = 404;
      renderSubject();
      await waitFor(() => expect(notFound).toHaveBeenCalled());
    });
  });

  describe("slett et spørsmål (story 8.3)", () => {
    // The DELETE requests to /api/freetext-questions/{id}.
    function deleteCalls(): string[] {
      return fetchMock.mock.calls
        .filter(([url, init]) => String(url).startsWith("/api/freetext-questions/") && init?.method === "DELETE")
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

    it("FR-52: «Slett» står før modellsvaret (ved «Vis modellsvar») og etter (i modellsvarets bunnfelt), og det finnes ingen «Rediger»", async () => {
      renderPage();
      await started();
      const before = button("Slett");
      expect(before.dataset.variant).toBe("text");
      expect(before.className).toContain("text-danger");
      // To the left of «Vis modellsvar», in the same footer.
      expect(before.nextElementSibling).toBe(button("Vis modellsvar"));
      expect(screen.queryByRole("button", { name: "Rediger" })).toBeNull();
      write("Svar");
      fireEvent.click(button("Vis modellsvar"));
      const card = document.querySelector("[data-slot='model-answer']") as HTMLElement;
      expect(within(card).getByRole("button", { name: "Slett" }).dataset.variant).toBe("text");
      expect(screen.getAllByRole("button", { name: "Slett" })).toHaveLength(1);
      expect(screen.queryByRole("button", { name: "Rediger" })).toBeNull();
    });

    it("FR-52, UX-DR22, E22: slett før modellsvaret gir bekreftelsen, «SPØRSMÅL 1 AV 2», tomt felt med fokus og ingenting vurdert", async () => {
      renderPage();
      await started();
      write("Et halvt svar");
      const dialog = await openDelete();
      expect(within(dialog).getByText("Forklar Merkevare.")).toBeTruthy();
      expect(dialog.textContent).not.toContain("Dette sletter også");
      expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Avbryt" }));
      expect(within(dialog).getByRole("button", { name: "Slett spørsmålet" }).dataset.variant).toBe("danger");

      await confirmDelete(dialog);
      expect(deleteCalls()).toEqual(["/api/freetext-questions/a"]);
      expect(screen.getByText("/ 2")).toBeTruthy();
      expect(screen.getByText("SPØRSMÅL 1 AV 2")).toBeTruthy();
      expect(screen.getByText("Ingen vurdert ennå")).toBeTruthy();
      expect(heading()).toBe("Forklar Pris.");
      expect(field().value).toBe("");
      await waitFor(() => expect(document.activeElement).toBe(field()));
    });

    it("FR-52: slett etter modellsvaret tar bort selvvurderingen og viser neste spørsmål", async () => {
      renderPage();
      await started();
      answerAndAssess("Riktig");
      write("Svar");
      fireEvent.click(button("Vis modellsvar"));
      await confirmDelete(await openDelete());
      expect(deleteCalls()).toEqual(["/api/freetext-questions/b"]);
      expect(screen.queryByRole("heading", { name: "Hvordan gikk det?" })).toBeNull();
      expect(screen.getByText("/ 2")).toBeTruthy();
      expect(screen.getByText("SPØRSMÅL 2 AV 2")).toBeTruthy();
      expect(screen.getByText("1 riktig")).toBeTruthy();
      expect(heading()).toBe("Forklar Segment.");
      expect(field().value).toBe("");
      // 3 does nothing now: the self-assessment is gone.
      (document.activeElement as HTMLElement | null)?.blur();
      press("3");
      expect(screen.getByText("SPØRSMÅL 2 AV 2")).toBeTruthy();
    });

    it("FR-52: sletting fjerner spørsmålet fra cachen og oppfrisker forelesningen og alle emners øvingslister", async () => {
      renderPage();
      await started();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      await confirmDelete(await openDelete());
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["lectures", "l1"] });
      const predicate = (invalidate.mock.calls.find(([filters]) => filters && "predicate" in filters)![0] as {
        predicate: (query: { queryKey: readonly unknown[] }) => boolean;
      }).predicate;
      expect(predicate({ queryKey: subjectFreetextQuestionsQueryKey("s9") })).toBe(true);
      expect(predicate({ queryKey: ["subjects", "s9", "quiz-questions"] })).toBe(true);
      expect(predicate({ queryKey: ["subjects", "s9"] })).toBe(false);
      expect(
        client.getQueryData<FreetextQuestion[]>(lectureFreetextQuestionsQueryKey("l1"))!.map((other) => other.id),
      ).toEqual(["b", "c"]);
    });

    it("FR-52, E22: siste spørsmål slettet etter en vurdering: økten er ferdig, lagres som ikke avbrutt og viser resultatet", async () => {
      questions = [question("a", "Merkevare"), question("b", "Pris", 2)];
      renderPage();
      expect(await screen.findByText("/ 2")).toBeTruthy();
      answerAndAssess("Riktig");
      await confirmDelete(await openDelete());
      const title = await screen.findByRole("heading", { level: 2, name: "Du har gått gjennom 1 spørsmål" });
      await waitFor(() => expect(document.activeElement).toBe(title));
      await waitFor(() =>
        expect(saved()).toEqual([
          expect.objectContaining({ kind: "freetext", aborted: false, answered: 1, correct: 1 }),
        ]),
      );
      expect(push).not.toHaveBeenCalled();
    });

    it("FR-52, E22: eneste spørsmål slettet går tilbake til forelesningen uten lagring", async () => {
      questions = [question("a", "Merkevare")];
      renderPage();
      expect(await screen.findByText("/ 1")).toBeTruthy();
      await confirmDelete(await openDelete());
      await waitFor(() => expect(push).toHaveBeenCalledWith("/forelesninger/l1"));
      expect(saved()).toEqual([]);
    });

    it("FR-52, E22: eneste spørsmål slettet i en emneøkt går tilbake til emnet", async () => {
      subjectQuestions = [question("a", "Merkevare")];
      renderPage({ subjectId: "s1" });
      expect(await screen.findByText("/ 1")).toBeTruthy();
      await confirmDelete(await openDelete());
      await waitFor(() => expect(push).toHaveBeenCalledWith("/emner/s1"));
      expect(saved()).toEqual([]);
    });

    it("FR-52: avbryt og Esc sletter ingenting, hurtigtastene er av i dialogen, og fokus går tilbake til «Slett»", async () => {
      renderPage();
      await started();
      write("Svar");
      fireEvent.click(button("Vis modellsvar"));
      let dialog = await openDelete();
      // The session's keys are off while the dialog is open: no assessment.
      press("3");
      fireEvent.click(within(dialog).getByRole("button", { name: "Avbryt" }));
      expect(screen.queryByRole("dialog")).toBeNull();
      await waitFor(() => expect(document.activeElement).toBe(button("Slett")));
      expect(screen.getByText("Ingen vurdert ennå")).toBeTruthy();

      dialog = await openDelete();
      fireEvent.keyDown(dialog, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
      await waitFor(() => expect(document.activeElement).toBe(button("Slett")));
      expect(deleteCalls()).toEqual([]);
      expect(heading()).toBe("Forklar Merkevare.");
      expect(screen.getByText("/ 3")).toBeTruthy();
      expect(screen.getByRole("heading", { name: "Hvordan gikk det?" })).toBeTruthy();
      expect(push).not.toHaveBeenCalled();
    });

    it("FR-52, E22: 404 ved sletting (allerede borte) tar også spørsmålet ut", async () => {
      deleteStatus = 404;
      renderPage();
      await started();
      await confirmDelete(await openDelete());
      expect(screen.getByText("/ 2")).toBeTruthy();
    });

    it("FR-52: en annen feil ved sletting viser reserveteksten i dialogen, og spørsmålet står", async () => {
      deleteStatus = 500;
      renderPage();
      await started();
      const dialog = await openDelete();
      fireEvent.click(within(dialog).getByRole("button", { name: "Slett spørsmålet" }));
      expect((await within(dialog).findByRole("alert")).textContent).toBe(FALLBACK_MESSAGE);
      expect(screen.getByText("/ 3")).toBeTruthy();
      expect(document.querySelector("[data-question-title]")!.textContent).toBe("Forklar Merkevare.");
    });

    it("FR-52: i en emneøkt oppdateres spørsmålets egen forelesning og emnets liste i cachen", async () => {
      subjectQuestions = [
        { ...question("p", "Rabatt", 2), lecture: { id: "l2", name: "Uke 38: Pris" } },
        question("a", "Merkevare"),
      ];
      renderPage({ subjectId: "s1" });
      expect(await screen.findByText("/ 2")).toBeTruthy();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      await confirmDelete(await openDelete());
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["lectures", "l2"] });
      expect(
        client.getQueryData<FreetextQuestion[]>(subjectFreetextQuestionsQueryKey("s1"))!.map((other) => other.id),
      ).toEqual(["a"]);
      expect(screen.getByText("/ 1")).toBeTruthy();
    });
  });
});
