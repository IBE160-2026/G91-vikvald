// The geometry of the semester line (story 5.5, FR-57, UX-DR11, E4, E6), worked
// out in one pure function so it can be tested without a browser. Every x is a
// fraction of the track (0 = the first day of the first month, 1 = the end of
// the last month); the component turns it into a percentage, so the line
// scales with the width without any measuring.
//
// Dates are calendar days (UTC days from "yyyy-mm-dd"), as in daysUntilExam;
// today is the student's local date. «Øvd» comes from the overview; nothing
// here decides it.

import { formatDayMonth } from "@/lib/dates";

import { isoWeek } from "./format";

export type TimelineLectureInput = { id: string; date: string; practiced: boolean };

export type TimelineSubjectInput = {
  id: string;
  exam_date: string;
  lectures: TimelineLectureInput[];
};

export type TimelineMonth = {
  // Where the month starts and ends on the track (0-1).
  start: number;
  end: number;
  // «SEP», and «S» when the month is too narrow for the long label.
  long: string;
  short: string;
};

export type TimelineStation = {
  lectureId: string;
  x: number;
  practiced: boolean;
  // ISO week number (37) and «11.09», shown under the station on 03.
  week: number;
  dayMonth: string;
};

// A part of the line as [from, to] on the track, or null when there is none.
export type TimelineSegment = [number, number] | null;

export type TimelineRow = {
  subjectId: string;
  stations: TimelineStation[];
  // Solid: from the first lecture up to today (or to the exam once it has passed).
  solid: TimelineSegment;
  // Dashed (time left): from today, or from the first lecture when it lies
  // after today, up to the exam.
  dashed: TimelineSegment;
  examX: number;
};

export type TimelineLayout = {
  months: TimelineMonth[];
  todayX: number;
  rows: TimelineRow[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DES"];

// "2026-09-11" -> the UTC day number.
function isoDay(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

// The student's local date -> the UTC day number of the same calendar date.
function localDay(today: Date): number {
  return Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / DAY_MS;
}

// The month a UTC day lies in, as a year * 12 + month number.
function monthOf(day: number): number {
  const date = new Date(day * DAY_MS);
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

// The UTC day number of the first day in a month (year * 12 + month).
function firstDayOf(month: number): number {
  return Date.UTC(Math.floor(month / 12), month % 12, 1) / DAY_MS;
}

// The span (E4): from the first day of the month with the earliest of all
// lecture dates, exam dates and today, to the last day of the month with the
// latest of them. Each subject's row is laid out on that span.
export function timelineLayout(subjects: TimelineSubjectInput[], today: Date): TimelineLayout {
  const todayDay = localDay(today);
  const days = [todayDay];
  for (const subject of subjects) {
    days.push(isoDay(subject.exam_date));
    for (const lecture of subject.lectures) days.push(isoDay(lecture.date));
  }
  const firstMonth = monthOf(Math.min(...days));
  const lastMonth = monthOf(Math.max(...days));
  const spanStart = firstDayOf(firstMonth);
  // The end is the first day after the last month, so the last day still lies inside.
  const spanEnd = firstDayOf(lastMonth + 1);
  const total = spanEnd - spanStart;
  const x = (day: number) => (day - spanStart) / total;

  const months: TimelineMonth[] = [];
  for (let month = firstMonth; month <= lastMonth; month += 1) {
    const long = MONTHS[month % 12];
    months.push({ start: x(firstDayOf(month)), end: x(firstDayOf(month + 1)), long, short: long[0] });
  }

  const todayX = x(todayDay);
  const rows = subjects.map((subject): TimelineRow => {
    const lectures = [...subject.lectures].sort((a, b) => isoDay(a.date) - isoDay(b.date));
    const stations = lectures.map((lecture) => ({
      lectureId: lecture.id,
      x: x(isoDay(lecture.date)),
      practiced: lecture.practiced,
      week: isoWeek(lecture.date),
      dayMonth: formatDayMonth(lecture.date),
    }));
    const examDay = isoDay(subject.exam_date);
    const examX = x(examDay);
    const firstX = stations.length > 0 ? stations[0].x : null;
    return { subjectId: subject.id, stations, examX, ...segments(firstX, todayX, examX, examDay - todayDay) };
  });

  return { months, todayX, rows };
}

function ordered(a: number, b: number): [number, number] {
  return a <= b ? [a, b] : [b, a];
}

// The solid and dashed parts of a subject's line.
function segments(
  firstX: number | null,
  todayX: number,
  examX: number,
  daysLeft: number,
): { solid: TimelineSegment; dashed: TimelineSegment } {
  if (daysLeft < 0) {
    // The exam has passed: the whole line is solid (no line without lectures).
    return { solid: firstX === null ? null : ordered(firstX, examX), dashed: null };
  }
  if (firstX === null) {
    // No lectures (E6): only the time left, dashed from today to the exam.
    return { solid: null, dashed: daysLeft === 0 ? null : [todayX, examX] };
  }
  if (firstX > todayX) {
    // The first lecture lies after today: dashed from it (nothing on the exam day).
    return { solid: null, dashed: daysLeft === 0 ? null : ordered(firstX, examX) };
  }
  return { solid: [firstX, todayX], dashed: daysLeft === 0 ? null : [todayX, examX] };
}

// Which labels to show (by position on the track, 0-1) so none overlap: a
// label is shown only with at least `minGapPx` to the label shown before it
// and to every reserved position (the exam label). Without a measured width
// (jsdom, the first drawing) every label is shown.
export function thinLabels(
  xs: number[],
  widthPx: number | undefined,
  minGapPx: number,
  reservedXs: number[] = [],
): boolean[] {
  if (!widthPx) return xs.map(() => true);
  let lastShown: number | null = null;
  return xs.map((x) => {
    const px = x * widthPx;
    const clearOfLast = lastShown === null || px - lastShown >= minGapPx;
    const clearOfReserved = reservedXs.every((reserved) => Math.abs(px - reserved * widthPx) >= minGapPx);
    if (clearOfLast && clearOfReserved) {
      lastShown = px;
      return true;
    }
    return false;
  });
}

// The month labels: the short label (first letter) when the month is narrower
// than `minWidthPx`. Without a measured width every label is long.
export function monthLabels(months: TimelineMonth[], widthPx: number | undefined, minWidthPx = 36): string[] {
  return months.map((month) =>
    widthPx && (month.end - month.start) * widthPx < minWidthPx ? month.short : month.long,
  );
}
