// Time to the exam and the exam text line (story 5.3, FR-57, SK-22):
// «Eksamen 04.12, om 3 uker · 4 av 8 forelesninger øvd». One rule, shared by the
// front page, the subject page and later the subject cards (5.4) and the
// semester line (5.5). Today is an argument, so the tests choose the day.

import { formatDayMonth } from "./dates";

const DAY_MS = 24 * 60 * 60 * 1000;

// Whole calendar days from `today` (the student's local date) to `examDate`
// ("2026-12-04"). Counted on the calendar dates (as UTC days), not on the
// milliseconds between two local times, so daylight saving time and the new
// year never move the answer. Negative when the exam has passed.
export function daysUntilExam(examDate: string, today: Date): number {
  const [year, month, day] = examDate.split("-").map(Number);
  const exam = Date.UTC(year, month - 1, day);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((exam - now) / DAY_MS);
}

// The days to the exam divided by 7, rounded to the nearest whole week
// (24 days -> 3, 34 -> 5, 21 -> 3, 10 -> 1, 11 -> 2).
export function weeksUntilExam(examDate: string, today: Date): number {
  return Math.round(daysUntilExam(examDate, today) / 7);
}

// The exam part: «Eksamen 04.12, om 3 uker» (seven days or more), «om 3 dager»
// (2–6 days), «i morgen», «Eksamen i dag», or «Eksamen var 04.12» once passed.
export function examCountdownText(examDate: string, today: Date): string {
  const days = daysUntilExam(examDate, today);
  const date = formatDayMonth(examDate);
  if (days < 0) return `Eksamen var ${date}`;
  if (days === 0) return "Eksamen i dag";
  if (days === 1) return `Eksamen ${date}, i morgen`;
  if (days < 7) return `Eksamen ${date}, om ${days} dager`;
  const weeks = weeksUntilExam(examDate, today);
  return `Eksamen ${date}, om ${weeks} ${weeks === 1 ? "uke" : "uker"}`;
}

// The count part: «4 av 8 forelesninger øvd» («0 av 1 forelesning øvd» in the
// singular), or «Ingen forelesninger ennå». M is every lecture in the subject,
// also those without files; N those the server marks as practised. The
// frontend only counts and never decides «øvd» itself.
export function practicedText(lectures: { practiced: boolean }[]): string {
  const total = lectures.length;
  if (total === 0) return "Ingen forelesninger ennå";
  const practiced = lectures.filter((lecture) => lecture.practiced).length;
  return `${practiced} av ${total} ${total === 1 ? "forelesning" : "forelesninger"} øvd`;
}

// The whole line. Without the lectures (the overview is not loaded yet, or it
// failed) only the exam part is shown, never a guessed number.
export function examLine(
  examDate: string,
  today: Date,
  lectures: { practiced: boolean }[] | undefined,
): string {
  const exam = examCountdownText(examDate, today);
  return lectures ? `${exam} · ${practicedText(lectures)}` : exam;
}
