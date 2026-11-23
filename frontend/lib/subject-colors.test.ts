import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { SUBJECT_COLORS, contrastRatio, subjectColorClass, subjectColorVar } from "./subject-colors";

const globalsCss = readFileSync(fileURLToPath(new URL("../app/globals.css", import.meta.url)), "utf8");
const PAPER = "#F8F7F3";

function themeColor(name: string): string | undefined {
  return globalsCss.match(new RegExp(`--color-${name}:\\s*([^;]+);`))?.[1].trim();
}

describe("emnefargene", () => {
  it("UX-DR3: det er seks farger, og temaet har dem som subject-1 til subject-6", () => {
    expect(SUBJECT_COLORS).toHaveLength(6);
    SUBJECT_COLORS.forEach((hex, index) => {
      expect(themeColor(`subject-${index + 1}`)?.toLowerCase()).toBe(hex.toLowerCase());
    });
  });

  it("UX-DR3: de nye fargene er magenta, oker og blågrønn", () => {
    expect(themeColor("subject-4")).toBe("#A8326E");
    expect(themeColor("subject-5")).toBe("#8A6A00");
    expect(themeColor("subject-6")).toBe("#00766E");
  });

  it.each(SUBJECT_COLORS.map((hex, index) => [index + 1, hex] as const))(
    "UX-DR3: subject-%s (%s) har minst 3:1 mot paper",
    (_number, hex) => {
      expect(contrastRatio(hex, PAPER)).toBeGreaterThanOrEqual(3);
    },
  );

  it("UX-DR3: kontrastregningen stemmer med kjente verdier", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    // DESIGN.md (rounded): ink on paper 16.6:1, subject-1 on paper 5.3:1.
    expect(contrastRatio("#15181F", PAPER)).toBeCloseTo(16.6, 1);
    expect(contrastRatio("#B83E0C", PAPER)).toBeGreaterThan(5.2);
    expect(contrastRatio("#B83E0C", PAPER)).toBeLessThan(5.35);
  });

  it.each([
    [0, "bg-subject-1"],
    [3, "bg-subject-4"],
    [5, "bg-subject-6"],
    [6, "bg-subject-1"],
    [-1, "bg-subject-6"],
  ])("UX-DR3: color_index %s gir klassen %s", (index, expected) => {
    expect(subjectColorClass(index)).toBe(expected);
  });
});

describe("emnefargen som CSS-variabel (story 5.5)", () => {
  it("UX-DR11: subjectColorVar gir var(--color-subject-N) med samme 0–5-normalisering som klassen", () => {
    expect(subjectColorVar(0)).toBe("var(--color-subject-1)");
    expect(subjectColorVar(5)).toBe("var(--color-subject-6)");
    expect(subjectColorVar(6)).toBe("var(--color-subject-1)");
    expect(subjectColorVar(-1)).toBe("var(--color-subject-6)");
    expect(subjectColorVar(Number.NaN)).toBe("var(--color-subject-1)");
    for (const index of [0, 3, 7, -2]) {
      expect(subjectColorVar(index).replace("var(--color-", "bg-").replace(")", "")).toBe(subjectColorClass(index));
    }
  });
});
