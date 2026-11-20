import { z } from "zod";

// The same rules as the backend (modules/identity/service.py). They are checked
// here first so the student gets the message without a round trip, but the
// backend always decides. The messages are error codes; lib/messages.ts has the text.

export const EMAIL_MAX_LENGTH = 254;
export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

// Characters (code points), as Python's len(): "æ" is one character but two bytes.
function characterCount(value: string): number {
  return [...value].length;
}

function byteCount(value: string): number {
  return new TextEncoder().encode(value).length;
}

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    // Counted in characters (code points), as the backend does, not UTF-16 units.
    .refine((value) => characterCount(value) <= EMAIL_MAX_LENGTH, { error: "INVALID_EMAIL" })
    .regex(EMAIL_PATTERN, { error: "INVALID_EMAIL" }),
  // The password is never trimmed.
  password: z
    .string()
    .refine((value) => characterCount(value) >= PASSWORD_MIN_LENGTH, { error: "PASSWORD_TOO_SHORT" })
    .refine((value) => byteCount(value) <= PASSWORD_MAX_BYTES, { error: "PASSWORD_TOO_LONG" }),
});

export type RegisterField = "email" | "password";
export type FieldErrorCodes = Partial<Record<RegisterField, string>>;

// The first error code per field, or null when the input is valid.
export function registerErrorCodes(input: { email: string; password: string }): FieldErrorCodes | null {
  const result = registerSchema.safeParse(input);
  if (result.success) return null;
  const codes: FieldErrorCodes = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if ((field === "email" || field === "password") && !codes[field]) {
      codes[field] = issue.message;
    }
  }
  return codes;
}

// Which field an error code from the API belongs to; null means a general error.
export function fieldForErrorCode(code: string): RegisterField | null {
  switch (code) {
    case "INVALID_EMAIL":
    case "EMAIL_ALREADY_REGISTERED":
      return "email";
    case "PASSWORD_TOO_SHORT":
    case "PASSWORD_TOO_LONG":
      return "password";
    default:
      return null;
  }
}
