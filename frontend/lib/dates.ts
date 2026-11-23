// Shared date helpers (epic 5): one formatter for «dd.mm», used by the lecture
// table, SISTE ØKT and the views that come later. Written out by hand instead
// of Intl, so the text is the same in every browser and in the tests.

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// "2026-09-11" -> "11.09" (a date, no time zone shift), and an ISO 8601 time
// such as "2026-11-09T18:30:00Z" -> "09.11" in the student's local time.
export function formatDayMonth(iso: string): string {
  let date: Date;
  if (DATE_ONLY.test(iso)) {
    const [year, month, day] = iso.split("-").map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(iso);
  }
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;
}

// The Norwegian weekday names, Sunday first (as Date.getDay()). Shared by the
// subject pages («fredag 04.12.2026») and the semester line («Eksamen fredag 04.12»).
export const WEEKDAYS = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"] as const;

// "2026-12-04" -> "fredag" (the calendar date, no time zone shift).
export function weekdayName(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return WEEKDAYS[new Date(year, month - 1, day).getDay()];
}
