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
