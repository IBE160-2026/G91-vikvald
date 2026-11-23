// Time to the exam and the count of practised lectures (FR-57, SK-22), shared
// by the subject cards (5.4) and the semester line (5.5): «Eksamen 04.12 · om 3
// uker» on the line, and «Markedsføring: 4 av 8 forelesninger øvd. Eksamen
// fredag 04.12, om 3 uker.» in its text version. One rule for weeks and days.
// Today is an argument, so the tests choose the day.

import { formatDayMonth, weekdayName } from "./dates";

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
// The semester line (story 5.5) uses the same rule with other options:
// `separator` between the date and the time left (« · » on the line, «, » by
// default), and `weekday` to put the weekday before the date («Eksamen fredag
// 04.12, om 3 uker», «Eksamen var fredag 04.12») for the screen reader text.
export type ExamCountdownOptions = { separator?: string; weekday?: boolean };

export function examCountdownText(examDate: string, today: Date, options: ExamCountdownOptions = {}): string {
  const { separator = ", ", weekday = false } = options;
  const days = daysUntilExam(examDate, today);
  const date = weekday ? `${weekdayName(examDate)} ${formatDayMonth(examDate)}` : formatDayMonth(examDate);
  if (days < 0) return `Eksamen var ${date}`;
  if (days === 0) return "Eksamen i dag";
  if (days === 1) return `Eksamen ${date}${separator}i morgen`;
  if (days < 7) return `Eksamen ${date}${separator}om ${days} dager`;
  const weeks = weeksUntilExam(examDate, today);
  return `Eksamen ${date}${separator}om ${weeks} ${weeks === 1 ? "uke" : "uker"}`;
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
