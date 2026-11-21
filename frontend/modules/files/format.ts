// "2026-09-11T08:15:00Z" -> "11.09", the day and month in the student's own time zone.
export function formatUploadedDayMonth(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;
}
