// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { flashcardAdapter, freetextAdapter, quizAdapter } from "../adapter";
import { advance, answerCurrent, assessCurrent, gridCells, markCurrent, startSession } from "../session";
import { AnswerGrid } from "./answer-grid";

afterEach(cleanup);

describe("AnswerGrid", () => {
  it("UX-DR9: ✓, ✗, gjeldende og ikke vist ennå, lest som skjult tekst, ikke knapper", () => {
    let state = startSession(["A", "B", "C", "D"]);
    state = markCurrent(state, "known");
    state = markCurrent(state, "missed");
    const { container } = render(<AnswerGrid cells={gridCells(state)} adapter={flashcardAdapter} />);

    const list = container.querySelector("ol")!;
    expect(list.className).toContain("grid-cols-[repeat(6,var(--spacing-grid-cell))]");
    expect(list.className).toContain("gap-grid-gap");
    expect(screen.queryAllByRole("button")).toEqual([]);

    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.querySelector(".sr-only")!.textContent)).toEqual([
      "Kort 1: kunne",
      "Kort 2: kunne ikke",
      "Kort 3",
      "Kort 4: ikke vist ennå",
    ]);
    expect(items[0].className).toContain("bg-success-tint");
    expect(items[1].className).toContain("bg-danger-tint");
    expect(items[2].getAttribute("aria-current")).toBe("step");
    expect(items[2].className).toContain("border-brand");
    expect(items[2].className).toContain("bg-surface");
    expect(items[3].className).toContain("border-border-card");
    expect(items[3].getAttribute("aria-current")).toBeNull();
    for (const item of items) {
      expect(item.className).toContain("size-grid-cell");
      expect(item.className).toContain("rounded-sm");
      expect(item.querySelector("[aria-hidden='true']")).toBeTruthy();
    }
    expect(items[2].textContent).toContain("3");
  });

  it("UX-DR9: et gjentatt kort beholder ✗ og får gjeldende-kanten", () => {
    let state = startSession(["A", "B"]);
    state = markCurrent(state, "missed");
    state = markCurrent(state, "known");
    render(<AnswerGrid cells={gridCells(state)} adapter={flashcardAdapter} />);
    const [first] = screen.getAllByRole("listitem");
    expect(first.getAttribute("aria-current")).toBe("step");
    expect(first.className).toContain("bg-danger-tint");
    expect(first.querySelector(".sr-only")!.textContent).toBe("Kort 1: kunne ikke");
  });

  it("UX-DR9: i quizen leses rutene «Spørsmål 4: feil», og et bekreftet spørsmål beholder brand-kanten", () => {
    let state = startSession(["A", "B", "C", "D"]);
    state = advance(answerCurrent(state, "known"));
    state = advance(answerCurrent(state, "known"));
    state = advance(answerCurrent(state, "known"));
    state = answerCurrent(state, "missed");
    render(<AnswerGrid cells={gridCells(state)} adapter={quizAdapter} />);
    const items = screen.getAllByRole("listitem");
    expect(items[3].querySelector(".sr-only")!.textContent).toBe("Spørsmål 4: feil");
    expect(items[3].className).toContain("border-brand");
    expect(items[3].getAttribute("aria-current")).toBe("step");
    expect(items[0].querySelector(".sr-only")!.textContent).toBe("Spørsmål 1: riktig");
  });

  it("UX-DR9: et quizspørsmål som ikke er besvart, leses «ikke besvart ennå»", () => {
    render(<AnswerGrid cells={gridCells(startSession(["A", "B"]))} adapter={quizAdapter} />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.querySelector(".sr-only")!.textContent)).toEqual([
      "Spørsmål 1",
      "Spørsmål 2: ikke besvart ennå",
    ]);
  });

  it("FR-51, UX-DR9: fritekst gir ✓, ◐ og ✗, lest som «Spørsmål 2: delvis riktig», og ◐ står i blekk på surface-partial", () => {
    let state = startSession(["A", "B", "C", "D"]);
    state = assessCurrent(state, "known");
    state = assessCurrent(state, "partial");
    state = assessCurrent(state, "missed");
    render(<AnswerGrid cells={gridCells(state)} adapter={freetextAdapter} />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.querySelector(".sr-only")!.textContent)).toEqual([
      "Spørsmål 1: riktig",
      "Spørsmål 2: delvis riktig",
      "Spørsmål 3: feil",
      "Spørsmål 4",
    ]);
    expect(items[1].dataset.mark).toBe("partial");
    expect(items[1].className).toContain("bg-surface-partial");
    expect(items[1].className).toContain("text-ink");
    expect(items[1].className).not.toMatch(/subject|success|danger/);
    expect(items[1].querySelector("svg[data-icon='partial']")).toBeTruthy();
    expect(items[1].querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
  });
});
