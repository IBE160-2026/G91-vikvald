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
  // Upload rejections (FR-9, FR-10, NFR-16). Words in {braces} are filled in
  // from the error's details by messageWithDetails().
  NOT_PDF:
    "Bare PDF-filer kan lastes opp. Lagre Word-dokumentet som PDF (Fil → Lagre som → PDF) og prøv igjen.",
  NO_READABLE_TEXT:
    "Vi fant ingen tekst i denne PDF-en. Den kan være skannet. Last opp en PDF der teksten kan merkes.",
  TOO_MANY_PAGES:
    "Fila har {page_count} sider. Grensen er 50 sider. Del den opp og last opp delene hver for seg.",
  FILE_TOO_LARGE:
    "Fila er på {size_mb} MB. Grensen er {limit_mb} MB. Lagre den på nytt med mindre bilder, eller del den opp.",
  PDF_UNREADABLE:
    "Vi klarte ikke å åpne denne PDF-en. Den kan være låst med passord eller skadet. Lagre den på nytt som PDF uten passord og prøv igjen.",
  // No approved text: the frontend asks for the terms before the first upload,
  // so this only shows if the cache and the database disagree.
  TERMS_NOT_ACCEPTED: FALLBACK_MESSAGE,
  // Frontend-only: the request never reached the server.
  NETWORK_ERROR: FALLBACK_MESSAGE,
  // Frontend-only: the exam date field does not hold a real date as dd.mm.åååå.
  INVALID_EXAM_DATE: "Skriv inn eksamensdatoen, for eksempel 04.12.2026.",
  // Frontend-only: the lecture date field does not hold a real date as dd.mm.åååå.
  INVALID_DATE: "Skriv inn datoen, for eksempel 11.09.2026.",
} as const satisfies Record<string, string>;

export type MessageCode = keyof typeof messages;

// The names of what a delete takes with it (UX-DR22), by the `kind` the
// delete preview gives: «lectures» and «files», then the content types that
// later epics register. Singular for 1, plural otherwise. Written in lower
// case, so the backend test that reads the error codes (upper case) skips them.
export const countNouns: Record<string, { one: string; other: string }> = {
  subjects: { one: "emne", other: "emner" },
  lectures: { one: "forelesning", other: "forelesninger" },
  files: { one: "fil", other: "filer" },
  flashcards: { one: "flashcard", other: "flashcards" },
  quiz_questions: { one: "quizspørsmål", other: "quizspørsmål" },
  model_cards: { one: "modellkort", other: "modellkort" },
};

const PLACEHOLDER = /\{([a-z_]+)\}/g;

function templateFor(code: string | null | undefined): string {
  if (code && Object.prototype.hasOwnProperty.call(messages, code)) {
    return messages[code as MessageCode];
  }
  return FALLBACK_MESSAGE;
}

// The text for a code. A text with {placeholders} needs the error's details,
// so without them it gives the fallback text, never an unfilled template.
export function messageFor(code: string | null | undefined): string {
  const template = templateFor(code);
  return template.includes("{") ? FALLBACK_MESSAGE : template;
}

// The text for a code with each {name} filled in from details (a number or a
// non-empty string). If any value is missing, the fallback text is used.
export function messageWithDetails(
  code: string | null | undefined,
  details: Record<string, unknown> = {},
): string {
  let missing = false;
  const text = templateFor(code).replace(PLACEHOLDER, (_match, name: string) => {
    const value = Object.prototype.hasOwnProperty.call(details, name) ? details[name] : undefined;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "string" && value.trim() !== "") return value;
    missing = true;
    return "";
  });
  return missing ? FALLBACK_MESSAGE : text;
}
