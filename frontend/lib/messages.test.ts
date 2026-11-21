import { describe, expect, it } from "vitest";

import { FALLBACK_MESSAGE, countNouns, messageFor, messageWithDetails, messages } from "./messages";

describe("meldingsfila", () => {
  it("FR-1: reserveteksten er «Noe gikk galt. Prøv igjen.»", () => {
    expect(FALLBACK_MESSAGE).toBe("Noe gikk galt. Prøv igjen.");
  });

  it.each(["UKJENT_KODE", "INTERNAL_ERROR", "VALIDATION_ERROR", "", undefined, null, "toString"])(
    "FR-1: «%s» gir reserveteksten",
    (code) => {
      expect(messageFor(code)).toBe("Noe gikk galt. Prøv igjen.");
    },
  );

  it("FR-1: NOT_FOUND gir «Fant ikke siden.»", () => {
    expect(messageFor("NOT_FOUND")).toBe("Fant ikke siden.");
  });

  it("FR-3: INVALID_CREDENTIALS og UNAUTHENTICATED har de godkjente tekstene", () => {
    expect(messageFor("INVALID_CREDENTIALS")).toBe("Feil e-post eller passord. Sjekk at Caps Lock er av.");
    expect(messageFor("UNAUTHENTICATED")).toBe("Du er logget ut. Logg inn igjen.");
  });

  it("FR-1: transportens egen kode NETWORK_ERROR har en tekst", () => {
    expect(messages).toHaveProperty("NETWORK_ERROR");
  });

  it("E35: NAME_REQUIRED og datofeilen har de godkjente tekstene", () => {
    expect(messageFor("NAME_REQUIRED")).toBe("Skriv inn et navn.");
    expect(messageFor("INVALID_EXAM_DATE")).toBe("Skriv inn eksamensdatoen, for eksempel 04.12.2026.");
  });

  it("FR-7: datofeilen for forelesninger har den godkjente teksten", () => {
    expect(messageFor("INVALID_DATE")).toBe("Skriv inn datoen, for eksempel 11.09.2026.");
  });

  it("FR-11: TERMS_NOT_ACCEPTED har ingen godkjent tekst og gir reserveteksten", () => {
    expect(messages.TERMS_NOT_ACCEPTED).toBe(FALLBACK_MESSAGE);
    expect(messageFor("TERMS_NOT_ACCEPTED")).toBe("Noe gikk galt. Prøv igjen.");
  });

  it("FR-1: alle tekstene er ikke-tomme", () => {
    for (const text of Object.values(messages)) {
      expect(text.trim()).not.toBe("");
    }
  });

  it("FR-9: NOT_PDF har den ordrette teksten", () => {
    expect(messageFor("NOT_PDF")).toBe(
      "Bare PDF-filer kan lastes opp. Lagre Word-dokumentet som PDF (Fil → Lagre som → PDF) og prøv igjen.",
    );
  });

  it("FR-10: NO_READABLE_TEXT og PDF_UNREADABLE har de ordrette tekstene", () => {
    expect(messageFor("NO_READABLE_TEXT")).toBe(
      "Vi fant ingen tekst i denne PDF-en. Den kan være skannet. Last opp en PDF der teksten kan merkes.",
    );
    expect(messageFor("PDF_UNREADABLE")).toBe(
      "Vi klarte ikke å åpne denne PDF-en. Den kan være låst med passord eller skadet. Lagre den på nytt som PDF uten passord og prøv igjen.",
    );
  });

  it("NFR-16: TOO_MANY_PAGES og FILE_TOO_LARGE fylles inn fra details", () => {
    expect(messageWithDetails("TOO_MANY_PAGES", { page_count: 63 })).toBe(
      "Fila har 63 sider. Grensen er 50 sider. Del den opp og last opp delene hver for seg.",
    );
    expect(messageWithDetails("FILE_TOO_LARGE", { size_mb: 34, limit_mb: 20 })).toBe(
      "Fila er på 34 MB. Grensen er 20 MB. Lagre den på nytt med mindre bilder, eller del den opp.",
    );
  });

  it.each([
    ["TOO_MANY_PAGES", {}],
    ["TOO_MANY_PAGES", { page_count: null }],
    ["TOO_MANY_PAGES", { page_count: "" }],
    ["FILE_TOO_LARGE", { size_mb: 34 }],
  ])("NFR-16: %s uten verdien %j gir reserveteksten", (code, details) => {
    expect(messageWithDetails(code, details)).toBe(FALLBACK_MESSAGE);
  });

  it("NFR-16: messageFor viser aldri en uutfylt mal", () => {
    expect(messageFor("TOO_MANY_PAGES")).toBe(FALLBACK_MESSAGE);
    expect(messageFor("FILE_TOO_LARGE")).toBe(FALLBACK_MESSAGE);
    for (const code of Object.keys(messages)) {
      expect(messageFor(code)).not.toMatch(/[{}]/);
    }
  });

  it.each(["GENERATION_FAILED", "GENERATION_TIMEOUT", "JOB_INTERRUPTED"])(
    "FR-21: %s gir «Vi klarte ikke å lage flashcardene. …» med innholdet fylt inn",
    (code) => {
      expect(messageWithDetails(code, { content: "flashcardene" })).toBe(
        "Vi klarte ikke å lage flashcardene. Ingenting er lagret. Prøv igjen.",
      );
      // Without what was being made, never an unfilled template.
      expect(messageFor(code)).toBe(FALLBACK_MESSAGE);
    },
  );

  it("FR-1: messageWithDetails gir vanlige tekster uendret og reserveteksten for ukjente koder", () => {
    expect(messageWithDetails("NOT_FOUND", { x: 1 })).toBe("Fant ikke siden.");
    expect(messageWithDetails("UKJENT", {})).toBe(FALLBACK_MESSAGE);
  });
});

describe("countNouns", () => {
  it("UX-DR22: navnene på det som slettes, i entall og flertall", () => {
    expect(countNouns).toEqual({
      subjects: { one: "emne", other: "emner" },
      lectures: { one: "forelesning", other: "forelesninger" },
      files: { one: "fil", other: "filer" },
      flashcards: { one: "flashcard", other: "flashcards" },
      quiz_questions: { one: "quizspørsmål", other: "quizspørsmål" },
      model_cards: { one: "modellkort", other: "modellkort" },
    });
  });
});
