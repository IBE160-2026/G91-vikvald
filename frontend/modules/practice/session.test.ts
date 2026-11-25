import { describe, expect, it } from "vitest";

import {
  advance,
  answerCurrent,
  assessCurrent,
  currentCard,
  gridCells,
  isFinished,
  markCurrent,
  removeCard,
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
    expect(sessionCounts(state)).toEqual({ shown: 3, answered: 3, correct: 2, partial: 0, wrong: 1 });
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

describe("removeCard", () => {
  it("FR-27: et umarkert kort som vises, tas ut av rutenettet og totalen, og neste kort vises", () => {
    const state = removeCard(startSession(["A", "B", "C"]), "A");
    expect(state.order).toEqual(["B", "C"]);
    expect(currentCard(state)).toBe("B");
    expect(shownCount(state)).toBe(1);
    expect(totalCount(state)).toBe(2);
    expect(gridCells(state).map((cell) => cell.id)).toEqual(["B", "C"]);
  });

  it("FR-27: et umarkert kort som ikke er vist ennå, tas ut uten å endre gjeldende kort", () => {
    const state = removeCard(run(["A", "B", "C"], ["known"]), "C");
    expect(state.order).toEqual(["A", "B"]);
    expect(state.queue).toEqual(["B"]);
    expect(state.shown).toEqual(["A", "B"]);
    expect(sessionCounts(state)).toEqual({ shown: 2, answered: 1, correct: 1, partial: 0, wrong: 0 });
  });

  it("FR-27: et markert kort beholder ruten og første markering, men kommer ikke igjen", () => {
    // A missed, B known: A is back as the current card.
    const before = run(["A", "B", "C"], ["missed", "known"]);
    expect(before.queue).toEqual(["C", "A"]);
    const state = removeCard(before, "A");
    expect(state.order).toEqual(["A", "B", "C"]);
    expect(state.queue).toEqual(["C"]);
    expect(state.firstMarks).toEqual({ A: "missed", B: "known" });
    expect(gridCells(state)[0]).toMatchObject({ id: "A", mark: "missed", current: false });
    expect(sessionCounts(state)).toEqual({ shown: 3, answered: 2, correct: 1, partial: 0, wrong: 1 });
  });

  it("FR-27: blir et nytt kort gjeldende, regnes det som vist", () => {
    // A missed: B is shown. B is deleted: C becomes current and is shown.
    const state = removeCard(run(["A", "B", "C"], ["missed"]), "B");
    expect(state.order).toEqual(["A", "C"]);
    expect(state.queue).toEqual(["C", "A"]);
    expect(state.shown).toEqual(["A", "C"]);
  });

  it("FR-27: siste kort slettet når noe er markert, gir en ferdig økt", () => {
    const state = removeCard(run(["A", "B"], ["known"]), "B");
    expect(isFinished(state)).toBe(true);
    expect(totalCount(state)).toBe(1);
    expect(sessionCounts(state)).toEqual({ shown: 1, answered: 1, correct: 1, partial: 0, wrong: 0 });
  });

  it("FR-27: siste kort slettet uten markeringer gir en tom økt", () => {
    const state = removeCard(startSession(["A"]), "A");
    expect(state).toEqual({ order: [], queue: [], firstMarks: {}, shown: [] });
  });

  it("FR-27: ukjent id endrer ingenting", () => {
    const before = startSession(["A", "B"]);
    expect(removeCard(before, "X")).toBe(before);
  });
});

describe("quiz: answerCurrent og advance", () => {
  it("FR-35: bekreftelse setter merket uten å flytte køen, og første svar gjelder", () => {
    const start = startSession(["A", "B", "C"]);
    const answered = answerCurrent(start, "missed");
    expect(currentCard(answered)).toBe("A");
    expect(answered.queue).toEqual(["A", "B", "C"]);
    expect(sessionCounts(answered)).toEqual({ shown: 1, answered: 1, correct: 0, partial: 0, wrong: 1 });
    expect(gridCells(answered)[0]).toMatchObject({ mark: "missed", current: true });
    expect(answerCurrent(answered, "known")).toBe(answered);
  });

  it("FR-34: advance tar spørsmålet ut av køen for godt og viser neste", () => {
    let state = startSession(["A", "B"]);
    state = advance(answerCurrent(state, "missed"));
    expect(currentCard(state)).toBe("B");
    expect(shownCount(state)).toBe(2);
    expect(repeatingLeft(state)).toBeNull();
    state = advance(answerCurrent(state, "known"));
    expect(isFinished(state)).toBe(true);
    expect(currentCard(state)).toBeUndefined();
    expect(sessionCounts(state)).toEqual({ shown: 2, answered: 2, correct: 1, partial: 0, wrong: 1 });
    expect(gridCells(state).map((cell) => cell.mark)).toEqual(["missed", "known"]);
  });

  it("FR-37, E22: et bekreftet spørsmål som slettes før «Neste», beholder svaret og ruten, og neste vises", () => {
    const before = answerCurrent(startSession(["A", "B", "C"]), "known");
    const state = removeCard(before, "A");
    expect(totalCount(state)).toBe(3);
    expect(currentCard(state)).toBe("B");
    expect(shownCount(state)).toBe(2);
    expect(sessionCounts(state)).toEqual({ shown: 2, answered: 1, correct: 1, partial: 0, wrong: 0 });
    expect(gridCells(state).map((cell) => [cell.id, cell.mark, cell.current])).toEqual([
      ["A", "known", false],
      ["B", null, true],
      ["C", null, false],
    ]);
  });

  it("FR-37, E22: et ubekreftet spørsmål som slettes, forsvinner fra ruten og totalen", () => {
    const before = advance(answerCurrent(startSession(["A", "B", "C"]), "missed"));
    const state = removeCard(before, "B");
    expect(totalCount(state)).toBe(2);
    expect(currentCard(state)).toBe("C");
    expect(shownCount(state)).toBe(2);
    expect(gridCells(state).map((cell) => cell.id)).toEqual(["A", "C"]);
    expect(sessionCounts(state)).toEqual({ shown: 2, answered: 1, correct: 0, partial: 0, wrong: 1 });
  });

  it("FR-37, E22: siste bekreftede spørsmål slettet gir en ferdig quiz; eneste ubekreftede gir en tom", () => {
    const last = answerCurrent(advance(answerCurrent(startSession(["A", "B"]), "known")), "missed");
    const finished = removeCard(last, "B");
    expect(isFinished(finished)).toBe(true);
    expect(sessionCounts(finished)).toEqual({ shown: 2, answered: 2, correct: 1, partial: 0, wrong: 1 });
    expect(removeCard(startSession(["A"]), "A").order).toEqual([]);
  });

  it("FR-34: en ferdig økt endres ikke", () => {
    const done = advance(startSession(["A"]));
    expect(advance(done)).toBe(done);
    expect(answerCurrent(done, "known")).toBe(done);
  });
});

describe("fritekst: assessCurrent (story 8.2)", () => {
  it("FR-51: en vurdering setter merket og går rett videre til neste spørsmål", () => {
    const state = assessCurrent(startSession(["A", "B", "C"]), "partial");
    expect(currentCard(state)).toBe("B");
    expect(shownCount(state)).toBe(2);
    expect(gridCells(state).map((cell) => [cell.id, cell.mark, cell.current])).toEqual([
      ["A", "partial", false],
      ["B", null, true],
      ["C", null, false],
    ]);
    expect(sessionCounts(state)).toEqual({ shown: 2, answered: 1, correct: 0, partial: 1, wrong: 0 });
  });

  it("FR-50, FR-56: hvert spørsmål vises én gang, og tallene teller riktig, delvis og feil hver for seg", () => {
    let state = startSession(["A", "B", "C"]);
    state = assessCurrent(state, "known");
    state = assessCurrent(state, "partial");
    state = assessCurrent(state, "missed");
    expect(isFinished(state)).toBe(true);
    expect(sessionCounts(state)).toEqual({ shown: 3, answered: 3, correct: 1, partial: 1, wrong: 1 });
  });

  it("FR-51: en ferdig økt endres ikke", () => {
    const done = assessCurrent(startSession(["A"]), "known");
    expect(assessCurrent(done, "missed")).toBe(done);
  });

  it("FR-56: flashcards og quiz har alltid partial 0, og wrong er antall «Kunne ikke»", () => {
    const state = markCurrent(markCurrent(startSession(["A", "B"]), "known"), "missed");
    expect(sessionCounts(state)).toMatchObject({ correct: 1, partial: 0, wrong: 1 });
  });
});
