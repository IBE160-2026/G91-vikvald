import { describe, expect, it } from "vitest";

import { monthLabels, thinLabels, timelineLayout, type TimelineSubjectInput } from "./timeline";

// Tuesday 10.11.2026 at noon, local time, as in mockup 02.
const TODAY = new Date(2026, 10, 10, 12);

// Days in the span 01.09-31.12.2026 (30 + 31 + 30 + 31).
const SEP_DEC = 122;

function at(daysFromSpanStart: number, total = SEP_DEC): number {
  return daysFromSpanStart / total;
}

const MARKETING: TimelineSubjectInput = {
  id: "a",
  exam_date: "2026-12-04",
  lectures: [
    { id: "l1", date: "2026-09-11", practiced: true },
    { id: "l2", date: "2026-09-18", practiced: false },
  ],
};

describe("semesterlinja: spennet og månedene", () => {
  it("E4: spennet går fra første dag i måneden med første forelesning til siste dag i eksamensmåneden", () => {
    const layout = timelineLayout([MARKETING], TODAY);
    expect(layout.months.map((month) => month.long)).toEqual(["SEP", "OKT", "NOV", "DES"]);
    expect(layout.months.map((month) => month.short)).toEqual(["S", "O", "N", "D"]);
    expect(layout.months[0].start).toBe(0);
    expect(layout.months[1].start).toBeCloseTo(at(30));
    expect(layout.months[3].end).toBe(1);
    // 10.11 is day 30 + 31 + 9 = 70 after 01.09.
    expect(layout.todayX).toBeCloseTo(at(70));
  });

  it("E4: på forsiden går spennet over alle emner og årsskiftet (AUG–JAN)", () => {
    const layout = timelineLayout(
      [
        { id: "a", exam_date: "2026-12-04", lectures: [{ id: "l1", date: "2026-08-21", practiced: false }] },
        { id: "b", exam_date: "2027-01-14", lectures: [] },
      ],
      TODAY,
    );
    expect(layout.months.map((month) => month.long)).toEqual(["AUG", "SEP", "OKT", "NOV", "DES", "JAN"]);
    expect(layout.rows.map((row) => row.subjectId)).toEqual(["a", "b"]);
    // 01.08.2026-31.01.2027 is 184 days; 14.01.2027 is day 166.
    expect(layout.rows[1].examX).toBeCloseTo(166 / 184);
  });

  it("E4: i dag er alltid med i spennet, også før første forelesning", () => {
    const layout = timelineLayout(
      [{ id: "a", exam_date: "2027-02-10", lectures: [{ id: "l1", date: "2027-01-12", practiced: false }] }],
      TODAY,
    );
    expect(layout.months.map((month) => month.long)).toEqual(["NOV", "DES", "JAN", "FEB"]);
    expect(layout.todayX).toBeGreaterThan(0);
    // The line is dashed from the first lecture, not from today.
    const row = layout.rows[0];
    expect(row.solid).toBeNull();
    expect(row.dashed?.[0]).toBeCloseTo(row.stations[0].x);
    expect(row.dashed?.[1]).toBeCloseTo(row.examX);
  });
});

describe("semesterlinja: linja og stasjonene", () => {
  it("FR-57: heltrukket fra første forelesning til i dag, stiplet fra i dag til eksamen", () => {
    const [row] = timelineLayout([MARKETING], TODAY).rows;
    expect(row.solid?.[0]).toBeCloseTo(at(10));
    expect(row.solid?.[1]).toBeCloseTo(at(70));
    expect(row.dashed?.[0]).toBeCloseTo(at(70));
    // 04.12 is day 30 + 31 + 30 + 3 = 94.
    expect(row.dashed?.[1]).toBeCloseTo(at(94));
    expect(row.examX).toBeCloseTo(at(94));
  });

  it("FR-57: stasjoner fylt etter øvd fra oversikten, med ukenummer og dato, i datorekkefølge", () => {
    const [row] = timelineLayout(
      [{ ...MARKETING, lectures: [MARKETING.lectures[1], MARKETING.lectures[0]] }],
      TODAY,
    ).rows;
    expect(row.stations.map((station) => [station.lectureId, station.practiced, station.week, station.dayMonth])).toEqual([
      ["l1", true, 37, "11.09"],
      ["l2", false, 38, "18.09"],
    ]);
    expect(row.stations[0].x).toBeCloseTo(at(10));
    expect(row.stations[1].x).toBeCloseTo(at(17));
  });

  it("E6: uten forelesninger er det ingen stasjoner, bare stiplet fra i dag til eksamen", () => {
    const layout = timelineLayout([{ id: "a", exam_date: "2026-12-04", lectures: [] }], TODAY);
    const [row] = layout.rows;
    expect(row.stations).toEqual([]);
    expect(row.solid).toBeNull();
    expect(row.dashed?.[0]).toBeCloseTo(layout.todayX);
    expect(row.dashed?.[1]).toBeCloseTo(row.examX);
    // The span is today's month to the exam's month.
    expect(layout.months.map((month) => month.long)).toEqual(["NOV", "DES"]);
  });

  it("FR-57: eksamen i dag gir ingen stiplet del", () => {
    const layout = timelineLayout([{ ...MARKETING, exam_date: "2026-11-10" }], TODAY);
    const [row] = layout.rows;
    expect(row.dashed).toBeNull();
    expect(row.solid?.[1]).toBeCloseTo(layout.todayX);
    expect(row.examX).toBeCloseTo(layout.todayX);
  });

  it("FR-57: passert eksamen gir heltrukket linje hele veien til eksamen", () => {
    const [row] = timelineLayout([MARKETING], new Date(2026, 11, 10, 12)).rows;
    expect(row.dashed).toBeNull();
    expect(row.solid?.[0]).toBeCloseTo(at(10));
    expect(row.solid?.[1]).toBeCloseTo(row.examX);
  });

  it("E4: datoene er kalenderdager, uavhengig av klokkeslettet i dag", () => {
    const early = timelineLayout([MARKETING], new Date(2026, 10, 10, 0, 1));
    const late = timelineLayout([MARKETING], new Date(2026, 10, 10, 23, 59));
    expect(early.todayX).toBe(late.todayX);
  });
});

describe("semesterlinja: etiketter som ville overlappe", () => {
  it("UX-DR11: uten målt bredde vises alle etikettene", () => {
    expect(thinLabels([0.1, 0.11, 0.12], undefined, 40, [0.13])).toEqual([true, true, true]);
    expect(monthLabels(timelineLayout([MARKETING], TODAY).months, undefined)).toEqual(["SEP", "OKT", "NOV", "DES"]);
  });

  it("UX-DR11: stasjoner sju dager fra hverandre på et spor på 500 px tynnes ut, og eksamensetiketten står", () => {
    // Weekly lectures from 04.09 to 27.11, exam 04.12: 7 days are about 29 px on 500 px.
    const xs = Array.from({ length: 13 }, (_, index) => at(3 + index * 7));
    const examX = at(94);
    const shown = thinLabels(xs, 500, 40, [examX]);
    const shownPx = xs.filter((_, index) => shown[index]).map((x) => x * 500);
    expect(shown[0]).toBe(true);
    expect(shown.filter(Boolean).length).toBeLessThan(xs.length);
    for (let i = 1; i < shownPx.length; i += 1) expect(shownPx[i] - shownPx[i - 1]).toBeGreaterThanOrEqual(40);
    for (const px of shownPx) expect(Math.abs(px - examX * 500)).toBeGreaterThanOrEqual(40);
  });

  it("UX-DR11: en måned smalere enn 36 px forkortes til første bokstav", () => {
    const months = timelineLayout([MARKETING], TODAY).months;
    // About 30 days of 122 on 120 px is about 30 px per month.
    expect(monthLabels(months, 120)).toEqual(["S", "O", "N", "D"]);
    expect(monthLabels(months, 800)).toEqual(["SEP", "OKT", "NOV", "DES"]);
  });
});
