import { describe, expect, it } from "vitest";

import { daysUntilExam, examCountdownText, examLine, practicedText, weeksUntilExam } from "./exam";

// Tuesday 10.11.2026 at noon, local time (vitest runs in Europe/Oslo), as in mockup 02.
const TODAY = new Date(2026, 10, 10, 12);

function lectures(practiced: number, total: number): { practiced: boolean }[] {
  return Array.from({ length: total }, (_, index) => ({ practiced: index < practiced }));
}

describe("tid til eksamen", () => {
  it("SK-22: uker til eksamen rundes av til nærmeste hele uke", () => {
    expect(daysUntilExam("2026-12-04", TODAY)).toBe(24);
    expect(weeksUntilExam("2026-12-04", TODAY)).toBe(3);
    expect(weeksUntilExam("2026-12-14", TODAY)).toBe(5);
    expect(weeksUntilExam("2026-12-01", TODAY)).toBe(3);
    expect(weeksUntilExam("2026-11-20", TODAY)).toBe(1);
    expect(weeksUntilExam("2026-11-21", TODAY)).toBe(2);
  });

  it("SK-22: uker til eksamen i skisse 02: «Eksamen 04.12, om 3 uker · 4 av 8 forelesninger øvd»", () => {
    expect(examLine("2026-12-04", TODAY, lectures(4, 8))).toBe("Eksamen 04.12, om 3 uker · 4 av 8 forelesninger øvd");
  });

  it("SK-22: uker til eksamen etter 34 og 21 dager", () => {
    expect(examCountdownText("2026-12-14", TODAY)).toBe("Eksamen 14.12, om 5 uker");
    expect(examCountdownText("2026-12-01", TODAY)).toBe("Eksamen 01.12, om 3 uker");
  });

  it("FR-57: 7–10 dager står som «om 1 uke» i entall", () => {
    expect(examLine("2026-11-17", TODAY, lectures(4, 8))).toBe("Eksamen 17.11, om 1 uke · 4 av 8 forelesninger øvd");
    expect(examCountdownText("2026-11-20", TODAY)).toBe("Eksamen 20.11, om 1 uke");
  });

  it("FR-57: under sju dager står dagene, og én dag er «i morgen»", () => {
    expect(examLine("2026-11-13", TODAY, lectures(4, 8))).toBe("Eksamen 13.11, om 3 dager · 4 av 8 forelesninger øvd");
    expect(examCountdownText("2026-11-12", TODAY)).toBe("Eksamen 12.11, om 2 dager");
    expect(examCountdownText("2026-11-16", TODAY)).toBe("Eksamen 16.11, om 6 dager");
    expect(examLine("2026-11-11", TODAY, lectures(4, 8))).toBe("Eksamen 11.11, i morgen · 4 av 8 forelesninger øvd");
  });

  it("FR-57: eksamen i dag gir «Eksamen i dag · …»", () => {
    expect(examLine("2026-11-10", TODAY, lectures(4, 8))).toBe("Eksamen i dag · 4 av 8 forelesninger øvd");
    expect(examCountdownText("2026-11-10", new Date(2026, 10, 10, 0, 0))).toBe("Eksamen i dag");
    expect(examCountdownText("2026-11-10", new Date(2026, 10, 10, 23, 59))).toBe("Eksamen i dag");
  });

  it("FR-57: passert eksamen gir «Eksamen var dd.mm · …»", () => {
    expect(examLine("2026-11-09", TODAY, lectures(4, 8))).toBe("Eksamen var 09.11 · 4 av 8 forelesninger øvd");
    expect(examCountdownText("2025-12-04", TODAY)).toBe("Eksamen var 04.12");
  });

  it("SK-22: uker til eksamen over midnatt og årsskiftet: 31.12 kl. 23.59 til 01.01 er «i morgen»", () => {
    const newYearsEve = new Date(2026, 11, 31, 23, 59);
    expect(daysUntilExam("2027-01-01", newYearsEve)).toBe(1);
    expect(examCountdownText("2027-01-01", newYearsEve)).toBe("Eksamen 01.01, i morgen");
  });

  it("SK-22: uker til eksamen over slutten på sommertid (25.10): 24.10 til 31.10 er «om 1 uke»", () => {
    for (const hour of [0, 12, 23]) {
      const today = new Date(2026, 9, 24, hour);
      expect(daysUntilExam("2026-10-31", today)).toBe(7);
      expect(examCountdownText("2026-10-31", today)).toBe("Eksamen 31.10, om 1 uke");
    }
  });
});

describe("antall øvde forelesninger", () => {
  it("SK-22: antall øvd teller forelesningene som er øvd, av alle i emnet", () => {
    expect(practicedText(lectures(4, 8))).toBe("4 av 8 forelesninger øvd");
    expect(practicedText(lectures(0, 2))).toBe("0 av 2 forelesninger øvd");
    expect(practicedText(lectures(2, 2))).toBe("2 av 2 forelesninger øvd");
  });

  it("SK-22: antall øvd med én forelesning står i entall: «0 av 1 forelesning øvd»", () => {
    expect(examLine("2026-12-04", TODAY, lectures(0, 1))).toBe("Eksamen 04.12, om 3 uker · 0 av 1 forelesning øvd");
  });

  it("SK-22: antall øvd uten forelesninger er «Ingen forelesninger ennå»", () => {
    expect(examLine("2026-12-04", TODAY, [])).toBe("Eksamen 04.12, om 3 uker · Ingen forelesninger ennå");
  });

  it("FR-57: uten oversikten (ikke lastet eller feilet) står bare eksamensdelen", () => {
    expect(examLine("2026-12-04", TODAY, undefined)).toBe("Eksamen 04.12, om 3 uker");
  });
});
