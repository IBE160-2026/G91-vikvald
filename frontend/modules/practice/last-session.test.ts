import { describe, expect, it } from "vitest";

import { lastSessionLines, lastSessionResult } from "./last-session";
import type { LastSession } from "./types";

// Noon UTC, so the local date is 09.11 in every time zone near Norway's.
const SESSION: LastSession = {
  kind: "quiz",
  lecture_id: "l1",
  started_at: "2026-11-09T12:00:00Z",
  aborted: false,
  shown: 15,
  answered: 15,
  correct: 12,
  partial: 0,
  wrong: 3,
};

const names = (id: string) => (id === "l1" ? "Uke 37: Merkevare" : undefined);

describe("lastSessionLines", () => {
  it("UX-DR14: quiz på en forelesning gir type · forelesning og dato · C av A riktige", () => {
    expect(lastSessionLines(SESSION, names)).toEqual({
      title: "Quiz · Uke 37: Merkevare",
      detail: "09.11 · 12 av 15 riktige",
    });
  });

  it("UX-DR14: emneøkt gir «Hele emnet»", () => {
    expect(lastSessionLines({ ...SESSION, lecture_id: null }, names).title).toBe("Quiz · Hele emnet");
  });

  it("UX-DR14: flashcards gir «Kunne C av A»", () => {
    const session = { ...SESSION, kind: "flashcards" as const, answered: 24, correct: 19, wrong: 5 };
    expect(lastSessionLines(session, names)).toEqual({
      title: "Flashcards · Uke 37: Merkevare",
      detail: "09.11 · Kunne 19 av 24",
    });
  });

  it("UX-DR14: fritekst heter «Fritekstspørsmål» og gir C av A riktige", () => {
    const session = { ...SESSION, kind: "freetext" as const, answered: 4, correct: 2, partial: 1, wrong: 1 };
    expect(lastSessionLines(session, names)).toEqual({
      title: "Fritekstspørsmål · Uke 37: Merkevare",
      detail: "09.11 · 2 av 4 riktige",
    });
  });

  it("UX-DR14: avbrutt økt får «Avbrutt · » foran resultatet", () => {
    const session = { ...SESSION, aborted: true, answered: 2, correct: 1, wrong: 1 };
    expect(lastSessionResult(session)).toBe("Avbrutt · 1 av 2 riktige");
    expect(lastSessionLines(session, names).detail).toBe("09.11 · Avbrutt · 1 av 2 riktige");
  });

  it("UX-DR14: ukjent forelesning gir bare typen", () => {
    expect(lastSessionLines({ ...SESSION, lecture_id: "borte" }, names).title).toBe("Quiz");
  });
});
