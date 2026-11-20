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

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  // Counted in characters (code points), as the backend does, not UTF-16 units.
  .refine((value) => characterCount(value) <= EMAIL_MAX_LENGTH, { error: "INVALID_EMAIL" })
  .regex(EMAIL_PATTERN, { error: "INVALID_EMAIL" });

export const registerSchema = z.object({
  email: emailSchema,
  // The password is never trimmed.
  password: z
    .string()
    .refine((value) => characterCount(value) >= PASSWORD_MIN_LENGTH, { error: "PASSWORD_TOO_SHORT" })
    .refine((value) => byteCount(value) <= PASSWORD_MAX_BYTES, { error: "PASSWORD_TOO_LONG" }),
});

// Login only checks the e-mail format before the call. The password has no rules
// here: a wrong, empty or too long one gets INVALID_CREDENTIALS from the backend.
export const loginSchema = z.object({
  email: emailSchema,
  // The password is never trimmed.
  password: z.string(),
});

export type RegisterField = "email" | "password";
export type FieldErrorCodes = Partial<Record<RegisterField, string>>;

type Credentials = { email: string; password: string };

function firstErrorPerField(schema: typeof registerSchema | typeof loginSchema, input: Credentials) {
  const result = schema.safeParse(input);
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

// The first error code per field, or null when the input is valid.
export function registerErrorCodes(input: Credentials): FieldErrorCodes | null {
  return firstErrorPerField(registerSchema, input);
}

// The same for the login form (only INVALID_EMAIL is possible).
export function loginErrorCodes(input: Credentials): FieldErrorCodes | null {
  return firstErrorPerField(loginSchema, input);
}

// Which field an error code from the API belongs to; null means a general error.
export function fieldForErrorCode(code: string): RegisterField | null {
  switch (code) {
    case "INVALID_EMAIL":
    case "EMAIL_ALREADY_REGISTERED":
      return "email";
    case "PASSWORD_TOO_SHORT":
    case "PASSWORD_TOO_LONG":
    // Wrong e-mail or password: shown under the password (mockup 01). The e-mail
    // field is not marked, so the message does not say which of the two is wrong.
    case "INVALID_CREDENTIALS":
      return "password";
    default:
      return null;
  }
}
