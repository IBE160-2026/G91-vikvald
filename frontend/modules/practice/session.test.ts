import { describe, expect, it } from "vitest";

import {
  currentCard,
  gridCells,
  isFinished,
  markCurrent,
  repeatingLeft,
  sessionCounts,
  shownCount,
  shuffle,
  startSession,
  totalCount,
  type SessionState,
} from "./session";
import type { Mark } from "./types";

function run(ids: string[], marks: Mark[]): SessionState {
  return marks.reduce(markCurrent, startSession(ids));
}

describe("shuffle", () => {
  it("FR-23: Fisher–Yates gir en ny liste med de samme elementene og endrer ikke inndata", () => {
    const items = ["A", "B", "C", "D"];
    const shuffled = shuffle(items);
    expect(shuffled).not.toBe(items);
    expect([...shuffled].sort()).toEqual(items);
    expect(items).toEqual(["A", "B", "C", "D"]);
  });

  it("FR-23: rekkefølgen følger tilfeldighetskilden", () => {
    // random() = 0 always swaps with the first position.
    expect(shuffle(["A", "B", "C", "D"], () => 0)).toEqual(["B", "C", "D", "A"]);
    // Just below 1 always keeps each element in place.
    expect(shuffle(["A", "B", "C", "D"], () => 0.999)).toEqual(["A", "B", "C", "D"]);
  });

  it("FR-23: tom og ett element", () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle(["A"])).toEqual(["A"]);
  });
});

describe("økten", () => {
  it("UX-DR8: start viser første kort, teller 1 av 3", () => {
    const state = startSession(["A", "B", "C"]);
    expect(currentCard(state)).toBe("A");
    expect(shownCount(state)).toBe(1);
    expect(totalCount(state)).toBe(3);
    expect(isFinished(state)).toBe(false);
    expect(repeatingLeft(state)).toBeNull();
  });

  it("FR-25: «Kunne ikke» legger kortet bakerst, telleren går 1→2→3 og aldri til 4", () => {
    let state = startSession(["A", "B", "C"]);
    state = markCurrent(state, "missed");
    expect(state.queue).toEqual(["B", "C", "A"]);
    expect(shownCount(state)).toBe(2);
    expect(repeatingLeft(state)).toBeNull();
    state = markCurrent(state, "known");
    expect(currentCard(state)).toBe("C");
    expect(shownCount(state)).toBe(3);
    // C is shown for the first time: not repeating yet.
    expect(repeatingLeft(state)).toBeNull();
    state = markCurrent(state, "known");
    expect(currentCard(state)).toBe("A");
    expect(shownCount(state)).toBe(3);
    expect(repeatingLeft(state)).toBe(1);
    state = markCurrent(state, "known");
    expect(isFinished(state)).toBe(true);
    expect(shownCount(state)).toBe(3);
    expect(repeatingLeft(state)).toBeNull();
  });

  it("FR-25: kortet kommer igjen til det markeres «Kunne»", () => {
    let state = run(["A", "B"], ["missed", "known", "missed"]);
    expect(currentCard(state)).toBe("A");
    expect(repeatingLeft(state)).toBe(1);
    state = markCurrent(state, "missed");
    expect(currentCard(state)).toBe("A");
    state = markCurrent(state, "known");
    expect(isFinished(state)).toBe(true);
  });

  it("FR-25: bare første markering teller", () => {
    const state = run(["A", "B", "C"], ["missed", "known", "known", "known"]);
    expect(isFinished(state)).toBe(true);
    expect(state.firstMarks).toEqual({ A: "missed", B: "known", C: "known" });
    expect(sessionCounts(state)).toEqual({ shown: 3, answered: 3, correct: 2, wrong: 1 });
  });

  it("FR-25: «Repeterer: N kort igjen» teller køen", () => {
    const state = run(["A", "B", "C"], ["missed", "missed", "known"]);
    expect(currentCard(state)).toBe("A");
    expect(repeatingLeft(state)).toBe(2);
  });

  it("UX-DR9: rutenettet følger den låste rekkefølgen med første markering og gjeldende kort", () => {
    const state = run(["A", "B", "C"], ["missed"]);
    expect(gridCells(state)).toEqual([
      { id: "A", number: 1, mark: "missed", current: false },
      { id: "B", number: 2, mark: null, current: true },
      { id: "C", number: 3, mark: null, current: false },
    ]);
    const repeating = run(["A", "B", "C"], ["missed", "known", "known"]);
    expect(gridCells(repeating)[0]).toEqual({ id: "A", number: 1, mark: "missed", current: true });
  });

  it("FR-25: markering etter ferdig økt endrer ingenting, og en tom økt er ferdig", () => {
    const finished = run(["A"], ["known"]);
    expect(markCurrent(finished, "missed")).toBe(finished);
    const empty = startSession([]);
    expect(isFinished(empty)).toBe(true);
    expect(shownCount(empty)).toBe(0);
  });

  it("FR-25: tilstanden endres ikke på stedet", () => {
    const state = startSession(["A", "B"]);
    markCurrent(state, "missed");
    expect(state.queue).toEqual(["A", "B"]);
    expect(state.firstMarks).toEqual({});
  });
});
