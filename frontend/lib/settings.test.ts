import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const frontendDir = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = join(frontendDir, "..");

function read(path: string): string {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

// All source and config files in frontend/, except dependencies and build output.
function frontendFiles(dir: string = frontendDir): string[] {
  const skip = new Set(["node_modules", ".next", "test-results", "playwright-report"]);
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...frontendFiles(path));
    else if (/\.(ts|tsx|js|mjs|cjs|json)$|^\.env|^Dockerfile$/.test(entry.name)) files.push(path);
  }
  return files;
}

function envExampleNames(): string[] {
  return [...read(join(repoRoot, ".env.example")).matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]);
}

function readmeSettingNames(): string[] {
  const readme = read(join(repoRoot, "README.md"));
  const section = readme.slice(readme.indexOf("## Innstillinger"));
  const end = section.indexOf("\n## ", 1);
  const table = end === -1 ? section : section.slice(0, end);
  return [...table.matchAll(/^\| `([A-Z][A-Z0-9_]*)` \|/gm)].map((m) => m[1]);
}

// Built at runtime so this file does not contain the forbidden prefix itself.
const forbiddenPrefix = ["NEXT", "PUBLIC", ""].join("_");

describe("innstillinger", () => {
  it("NFR-4: .env.example har ingen variabler som sendes til nettleseren", () => {
    expect(read(join(repoRoot, ".env.example"))).not.toContain(forbiddenPrefix);
  });

  it("NFR-4: frontendkoden bruker ingen variabler som sendes til nettleseren", () => {
    const offenders = frontendFiles().filter((file) => read(file).includes(forbiddenPrefix));
    expect(offenders).toEqual([]);
  });

  it("NFR-4: README-tabellen og .env.example har de samme innstillingene", () => {
    const readme = readmeSettingNames();
    expect(readme.length).toBeGreaterThan(0);
    expect([...readme].sort()).toEqual([...envExampleNames()].sort());
  });
});
