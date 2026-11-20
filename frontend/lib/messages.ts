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
  // Frontend-only: the request never reached the server.
  NETWORK_ERROR: FALLBACK_MESSAGE,
} as const satisfies Record<string, string>;

export type MessageCode = keyof typeof messages;

export function messageFor(code: string | null | undefined): string {
  if (code && Object.prototype.hasOwnProperty.call(messages, code)) {
    return messages[code as MessageCode];
  }
  return FALLBACK_MESSAGE;
}
