import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const frontendDir = fileURLToPath(new URL("..", import.meta.url));
const designFile = join(
  frontendDir,
  "..",
  "_bmad-output/planning-artifacts/ux-designs/ux-G91-vikvald-2026-11-10/DESIGN.md",
);
const globalsCss = readFileSync(join(frontendDir, "app/globals.css"), "utf8");

// Reads one top-level block of simple "name: value" pairs from the DESIGN.md frontmatter.
function designBlock(name: string): Record<string, string> {
  const text = readFileSync(designFile, "utf8").replace(/\r\n/g, "\n");
  const frontmatter = text.split("\n---\n")[0];
  const lines = frontmatter.split("\n");
  const start = lines.indexOf(`${name}:`);
  expect(start, `DESIGN.md has no "${name}:" block`).toBeGreaterThanOrEqual(0);
  const values: Record<string, string> = {};
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith(" ")) break;
    const match = line.match(/^ {2}'?([\w-]+)'?:\s*'?([^'\s]+)'?\s*$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

function themeValue(variable: string): string | undefined {
  const escaped = variable.replace(/[-]/g, "\\-");
  return globalsCss.match(new RegExp(`${escaped}:\\s*([^;]+);`))?.[1].trim();
}

// Source files (not tests) in the folders that hold UI code.
function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(path));
    else if (/\.(ts|tsx|css)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) files.push(path);
  }
  return files;
}

const uiSources = ["app", "components", "modules", "lib"].flatMap((dir) =>
  sourceFiles(join(frontendDir, dir)).map((path) => ({ path, text: readFileSync(path, "utf8") })),
);

describe("designtokens", () => {
  const colors = designBlock("colors");

  it("UX-DR1: DESIGN.md har farger å sammenligne med", () => {
    expect(Object.keys(colors).length).toBeGreaterThanOrEqual(25);
  });

  it.each(Object.entries(designBlock("colors")))(
    "UX-DR1: --color-%s i temaet er lik DESIGN.md",
    (name, value) => {
      expect(themeValue(`--color-${name}`)?.toLowerCase()).toBe(value.toLowerCase());
    },
  );

  it.each(Object.entries(designBlock("spacing")))(
    "UX-DR1: --spacing-%s i temaet er lik DESIGN.md",
    (name, value) => {
      expect(themeValue(`--spacing-${name}`)).toBe(value);
    },
  );

  it.each(Object.entries(designBlock("rounded")))(
    "UX-DR1: --radius-%s i temaet er lik DESIGN.md",
    (name, value) => {
      expect(themeValue(`--radius-${name}`)).toBe(value);
    },
  );

  it("UX-DR1: skyggene lift og float og sløret på 42 % finnes", () => {
    expect(themeValue("--shadow-lift")).toBeDefined();
    expect(themeValue("--shadow-float")).toContain(themeValue("--shadow-lift"));
    expect(themeValue("--color-scrim-veil")).toBe("rgb(21 24 31 / 42%)");
  });

  it("UX-DR2: Inter med reserven system-ui, sans-serif og tnum på body", () => {
    expect(themeValue("--font-sans")).toBe('"Inter Variable", system-ui, sans-serif');
    expect(globalsCss).toMatch(/body\s*{[^}]*font-feature-settings:\s*"tnum"/);
  });

  it("UX-DR2: temaet har bare vektene 400, 500 og 600", () => {
    const weights = [...globalsCss.matchAll(/--font-weight-[\w-]+:\s*(\d+);/g)].map((m) => m[1]);
    expect(new Set(weights)).toEqual(new Set(["400", "500", "600"]));
  });

  it("UX-DR4: fokusringen er 2 px focus-ring med 2 px luft", () => {
    expect(globalsCss).toMatch(
      /:focus-visible\s*{[^}]*outline:\s*2px solid var\(--color-focus-ring\);[^}]*outline-offset:\s*2px;/,
    );
  });

  it("UX-DR4: ingen kildefil fjerner fokusringen", () => {
    const offenders = uiSources
      .filter(({ text }) => /outline-none|outline-hidden|outline:\s*(none|0)\b/.test(text))
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });

  it("UX-DR2: ingen kildefil bruker andre vekter enn 400, 500 og 600", () => {
    const forbidden =
      /\bfont-(thin|extralight|light|bold|extrabold|black)\b|font-\[|font-weight:\s*(?!(400|500|600)\b)\d+|fontWeight=["{]?["']?(?!(400|500|600)\b)\d+/;
    const offenders = uiSources.filter(({ text }) => forbidden.test(text)).map(({ path }) => path);
    expect(offenders).toEqual([]);
  });
});
