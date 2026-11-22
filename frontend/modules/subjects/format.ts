// Dates and counts as the student reads them (UX-DR25): dd.mm.åååå, Norwegian
// weekday and month names, singular and plural. Written out by hand instead of
// Intl, so the text is the same in every browser and in the tests.

const WEEKDAYS = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];
const MONTHS = [
  "januar",
  "februar",
  "mars",
  "april",
  "mai",
  "juni",
  "juli",
  "august",
  "september",
  "oktober",
  "november",
  "desember",
];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// "2026-12-04" as a local date (no time zone shift).
function fromIso(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// "2026-12-04" -> "04.12.2026".
export function formatDate(iso: string): string {
  const date = fromIso(iso);
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

// "2026-09-11" -> "11.09" (the date column in the lecture table). Shared with
// the rest of the app, so it lives in lib/dates.ts.
export { formatDayMonth } from "@/lib/dates";

// Today's date as the student types it, "21.11.2026" (the default in «Ny forelesning»).
export function todayNorwegian(now: Date = new Date()): string {
  return `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
}

// The ISO 8601 week number: weeks start on Monday, and week 1 is the week with
// the year's first Thursday. "2026-09-11" -> 37, "2027-01-01" -> 53.
export function isoWeek(iso: string): number {
  const date = fromIso(iso);
  // Move to the Thursday in the same week; its year owns the week.
  const weekday = (date.getDay() + 6) % 7; // Monday 0 ... Sunday 6
  const thursday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - weekday + 3);
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  const firstWeekday = (firstThursday.getDay() + 6) % 7;
  const firstWeekThursday = new Date(firstThursday.getFullYear(), 0, 4 - firstWeekday + 3);
  // Whole days between the two Thursdays (rounded, so a daylight saving change does not matter).
  const days = Math.round((thursday.getTime() - firstWeekThursday.getTime()) / 86_400_000);
  return 1 + days / 7;
}

// "2026-12-04" -> "fredag 04.12.2026".
export function formatWeekdayDate(iso: string): string {
  return `${WEEKDAYS[fromIso(iso).getDay()]} ${formatDate(iso)}`;
}

// The line under «Dine emner»: "Høstsemesteret 2026 · lørdag 21. november".
// January-June is the spring semester, July-December the autumn semester.
export function semesterLabel(today: Date): string {
  const month = today.getMonth();
  const semester = month < 6 ? "Vårsemesteret" : "Høstsemesteret";
  return `${semester} ${today.getFullYear()} · ${WEEKDAYS[today.getDay()]} ${today.getDate()}. ${MONTHS[month]}`;
}

// 1 -> "1 forelesning", anything else -> "0 forelesninger", "2 forelesninger".
export function lectureCountLabel(count: number): string {
  return `${count} ${count === 1 ? "forelesning" : "forelesninger"}`;
}

// 1 -> "1 fil", anything else -> "0 filer", "2 filer".
export function fileCountLabel(count: number): string {
  return `${count} ${count === 1 ? "fil" : "filer"}`;
}

// 1 -> "1 side", anything else -> "0 sider", "18 sider".
export function pageCountLabel(count: number): string {
  return `${count} ${count === 1 ? "side" : "sider"}`;
}
