import { describe, expect, it } from "vitest";

import { FALLBACK_MESSAGE, messageFor, messages } from "./messages";

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

  it("FR-1: transportens egen kode NETWORK_ERROR har en tekst", () => {
    expect(messages).toHaveProperty("NETWORK_ERROR");
  });

  it("FR-1: alle tekstene er ikke-tomme", () => {
    for (const text of Object.values(messages)) {
      expect(text.trim()).not.toBe("");
    }
  });
});
