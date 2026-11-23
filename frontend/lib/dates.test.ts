import { describe, expect, it } from "vitest";

import { formatDayMonth, weekdayName } from "./dates";
import { formatDayMonth as fromSubjects } from "@/modules/subjects/format";

describe("formatDayMonth", () => {
  it("UX-DR14: «åååå-mm-dd» blir «dd.mm» uten tidssoneforskyvning", () => {
    expect(formatDayMonth("2026-09-11")).toBe("11.09");
    expect(formatDayMonth("2026-01-01")).toBe("01.01");
    expect(formatDayMonth("2026-12-31")).toBe("31.12");
  });

  it("UX-DR14: et ISO-tidspunkt blir datoen i lokal tid", () => {
    const moment = new Date(2026, 10, 9, 23, 30);
    expect(formatDayMonth(moment.toISOString())).toBe("09.11");
    const early = new Date(2026, 10, 10, 0, 15);
    expect(formatDayMonth(early.toISOString())).toBe("10.11");
  });

  it("emnemodulen bruker den samme funksjonen", () => {
    expect(fromSubjects).toBe(formatDayMonth);
  });
});

describe("weekdayName", () => {
  it("UX-DR11: ukedagen til en dato, uten tidssoneforskyvning", () => {
    expect(weekdayName("2026-12-04")).toBe("fredag");
    expect(weekdayName("2026-11-10")).toBe("tirsdag");
    expect(weekdayName("2027-01-03")).toBe("søndag");
  });
});
