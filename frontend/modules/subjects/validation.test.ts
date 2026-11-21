import { describe, expect, it } from "vitest";

import {
  examDateErrorCode,
  fieldForApiError,
  lectureDateErrorCode,
  nameErrorCode,
  parseNorwegianDate,
} from "./validation";

describe("emnereglene (samme som backenden)", () => {
  it.each([
    ["04.12.2026", "2026-12-04"],
    ["4.12.2026", "2026-12-04"],
    ["4.1.2027", "2027-01-04"],
    [" 29.02.2028 ", "2028-02-29"],
    ["01.01.2020", "2020-01-01"],
  ])("FR-6: «%s» tolkes som %s", (text, iso) => {
    expect(parseNorwegianDate(text)).toBe(iso);
  });

  it.each(["31.02.2026", "29.02.2027", "32.12.2026", "04.13.2026", "00.12.2026", "2026-12-04", "04/12/2026", "04.12.26", "", "i morgen"])(
    "FR-6: «%s» er ikke en dato",
    (text) => {
      expect(parseNorwegianDate(text)).toBeNull();
      expect(examDateErrorCode(text)).toBe("INVALID_EXAM_DATE");
      expect(lectureDateErrorCode(text)).toBe("INVALID_DATE");
    },
  );

  it("FR-6: gyldig dato gir ingen feil", () => {
    expect(examDateErrorCode("04.12.2026")).toBeNull();
    expect(lectureDateErrorCode("11.09.2026")).toBeNull();
  });

  it.each(["", "   ", "\t"])("E35: navnet «%s» gir NAME_REQUIRED", (name) => {
    expect(nameErrorCode(name)).toBe("NAME_REQUIRED");
  });

  it("FR-6: et navn med tegn gir ingen feil", () => {
    expect(nameErrorCode(" Markedsføring ")).toBeNull();
  });

  it.each([
    ["NAME_REQUIRED", {}, "name"],
    ["VALIDATION_ERROR", { fields: { exam_date: "value_error" } }, "date"],
    ["VALIDATION_ERROR", { fields: { date: "value_error" } }, "date"],
    ["VALIDATION_ERROR", { fields: { name: "string_too_long" } }, null],
    ["VALIDATION_ERROR", {}, null],
    ["INTERNAL_ERROR", {}, null],
    ["NOT_FOUND", {}, null],
  ] as const)("NFR-11: feilkoden %s (%o) hører til feltet %s", (code, details, field) => {
    expect(fieldForApiError(code, details)).toBe(field);
  });
});
