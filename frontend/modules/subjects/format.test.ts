import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDayMonth,
  formatWeekdayDate,
  isoWeek,
  lectureCountLabel,
  semesterLabel,
  todayNorwegian,
} from "./format";

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

  it("UX-DR25: datokolonnen i tabellen er dd.mm", () => {
    expect(formatDayMonth("2026-09-11")).toBe("11.09");
    expect(formatDayMonth("2027-01-04")).toBe("04.01");
  });

  it("FR-7: dagens dato fylles inn som dd.mm.åååå", () => {
    expect(todayNorwegian(new Date(2026, 10, 21))).toBe("21.11.2026");
    expect(todayNorwegian(new Date(2027, 0, 4))).toBe("04.01.2027");
  });

  it.each([
    ["2026-09-11", 37],
    ["2026-09-07", 37],
    ["2026-09-13", 37],
    ["2026-09-14", 38],
    ["2026-01-01", 1],
    ["2026-12-28", 53],
    ["2027-01-01", 53],
    ["2027-01-04", 1],
    ["2025-12-29", 1],
    ["2026-03-30", 14],
    ["2026-10-26", 44],
  ])("UX-DR7: ISO-ukenummeret for %s er %s", (iso, week) => {
    expect(isoWeek(iso)).toBe(week);
  });
});
