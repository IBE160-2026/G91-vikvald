import { describe, expect, it } from "vitest";

import { formatDate, formatWeekdayDate, lectureCountLabel, semesterLabel } from "./format";

describe("datoer og antall", () => {
  it("UX-DR25: ISO-dato vises som dd.mm.åååå", () => {
    expect(formatDate("2026-12-04")).toBe("04.12.2026");
    expect(formatDate("2027-01-09")).toBe("09.01.2027");
  });

  it("UX-DR25: med ukedag: «fredag 04.12.2026»", () => {
    expect(formatWeekdayDate("2026-12-04")).toBe("fredag 04.12.2026");
    expect(formatWeekdayDate("2026-11-21")).toBe("lørdag 21.11.2026");
    expect(formatWeekdayDate("2026-11-22")).toBe("søndag 22.11.2026");
  });

  it("FR-6: undertittelen er «Høstsemesteret 2026 · lørdag 21. november»", () => {
    expect(semesterLabel(new Date(2026, 10, 21))).toBe("Høstsemesteret 2026 · lørdag 21. november");
  });

  it.each([
    [new Date(2027, 0, 1), "Vårsemesteret 2027 · fredag 1. januar"],
    [new Date(2027, 5, 30), "Vårsemesteret 2027 · onsdag 30. juni"],
    [new Date(2027, 6, 1), "Høstsemesteret 2027 · torsdag 1. juli"],
    [new Date(2026, 11, 31), "Høstsemesteret 2026 · torsdag 31. desember"],
  ])("FR-6: jan–jun er vårsemesteret, jul–des høstsemesteret (%s)", (date, expected) => {
    expect(semesterLabel(date)).toBe(expected);
  });

  it.each([
    [0, "0 forelesninger"],
    [1, "1 forelesning"],
    [2, "2 forelesninger"],
    [11, "11 forelesninger"],
  ])("UX-DR25: %s gir «%s»", (count, expected) => {
    expect(lectureCountLabel(count)).toBe(expected);
  });
});
