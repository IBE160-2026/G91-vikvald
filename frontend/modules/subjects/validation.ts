// The same rules as the backend (modules/subjects/service.py and schemas.py),
// for both subjects and lectures,
// checked here first so the student gets the message without a round trip. The
// backend always decides. The values are error codes; lib/messages.ts has the text.

// The longest name the backend accepts (NAME_MAX_LENGTH in modules/subjects/models.py).
export const NAME_MAX_LENGTH = 200;

// The two fields in the name/date dialogs. "date" is the exam date for a
// subject and the date for a lecture.
export type FormField = "name" | "date";
export type FormFieldErrors = Partial<Record<FormField, string>>;

const NORWEGIAN_DATE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;

// "04.12.2026" or "4.12.2026" -> "2026-12-04". null when it is not a date that
// exists in the calendar (31.02.2026 is rejected).
export function parseNorwegianDate(text: string): string | null {
  const match = NORWEGIAN_DATE.exec(text.trim());
  if (!match) return null;
  const [day, month, year] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// The error code for the name, or null when it is fine. Too long names are left
// to the backend (no approved text for that yet).
export function nameErrorCode(name: string): string | null {
  return name.trim() === "" ? "NAME_REQUIRED" : null;
}


// Which field an API error belongs to; null means a general error. The backend
// names the date exam_date (subjects) or date (lectures).
export function fieldForApiError(code: string, details: Record<string, unknown> = {}): FormField | null {
  if (code === "NAME_REQUIRED") return "name";
  if (code === "VALIDATION_ERROR") {
    const fields = details.fields;
    if (typeof fields === "object" && fields !== null && ("exam_date" in fields || "date" in fields)) return "date";
  }
  return null;
}
