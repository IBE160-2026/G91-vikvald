// The one message file: error code from the backend (or the transport) -> Norwegian text.
// Every code in backend/app/core/errors.py must have a key here (a backend test checks it).
// Only texts approved in EXPERIENCE.md are used. Codes without an approved text
// point to the fallback text instead of a made-up one.

export const FALLBACK_MESSAGE = "Noe gikk galt. Prøv igjen.";

export const messages = {
  NOT_FOUND: "Fant ikke siden.",
  METHOD_NOT_ALLOWED: FALLBACK_MESSAGE,
  BAD_REQUEST: FALLBACK_MESSAGE,
  VALIDATION_ERROR: FALLBACK_MESSAGE,
  FEATURE_DISABLED: FALLBACK_MESSAGE,
  INTERNAL_ERROR: FALLBACK_MESSAGE,
  DATABASE_UNAVAILABLE: FALLBACK_MESSAGE,
  EMAIL_ALREADY_REGISTERED:
    "Det finnes allerede en konto med denne e-postadressen. Logg inn i stedet.",
  INVALID_EMAIL: "Skriv inn en gyldig e-postadresse, for eksempel klara@eksempel.no.",
  PASSWORD_TOO_SHORT: "Passordet må ha minst 8 tegn.",
  PASSWORD_TOO_LONG: "Passordet er for langt. Bruk færre tegn.",
  INVALID_CREDENTIALS: "Feil e-post eller passord. Sjekk at Caps Lock er av.",
  UNAUTHENTICATED: "Du er logget ut. Logg inn igjen.",
  NAME_REQUIRED: "Skriv inn et navn.",
  // Frontend-only: the request never reached the server.
  NETWORK_ERROR: FALLBACK_MESSAGE,
  // Frontend-only: the exam date field does not hold a real date as dd.mm.åååå.
  INVALID_EXAM_DATE: "Skriv inn eksamensdatoen, for eksempel 04.12.2026.",
  // Frontend-only: the lecture date field does not hold a real date as dd.mm.åååå.
  INVALID_DATE: "Skriv inn datoen, for eksempel 11.09.2026.",
} as const satisfies Record<string, string>;

export type MessageCode = keyof typeof messages;

export function messageFor(code: string | null | undefined): string {
  if (code && Object.prototype.hasOwnProperty.call(messages, code)) {
    return messages[code as MessageCode];
  }
  return FALLBACK_MESSAGE;
}
