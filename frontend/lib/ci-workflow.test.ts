import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Read the workflow as plain text; a YAML parser would be a new dependency for one test.
const workflow = readFileSync(
  fileURLToPath(new URL("../../.github/workflows/ci.yml", import.meta.url)),
  "utf8",
).replace(/\r\n/g, "\n");

// Splits the steps list into one text block per step ("- name: ...").
function steps(): string[] {
  const body = workflow.slice(workflow.indexOf("steps:"));
  return body.split(/\n(?=\s*- name:)/).slice(1);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stepRunning(command: string): string {
  const pattern = new RegExp(`^\\s*run: ${escapeRegExp(command)}\\s*$`, "m");
  const step = steps().find((s) => pattern.test(s));
  expect(step, `no step runs "${command}"`).toBeDefined();
  return step!;
}

describe("CI workflow", () => {
  it("AR-20: utløses av pull request mot main", () => {
    expect(workflow).toMatch(/^on:\n\s+pull_request:\n\s+branches: \[main\]$/m);
  });

  it.each([
    ["uv sync --locked", "backend"],
    ["uv run pytest", "backend"],
    ["npm ci", "frontend"],
    ["npm run test", "frontend"],
  ])("AR-20: kjører «%s» i %s/", (command, folder) => {
    expect(stepRunning(command)).toMatch(new RegExp(`^\\s*working-directory: ${folder}\\s*$`, "m"));
  });

  it("AR-20: bruker ingen hemmeligheter, databasetjeneste eller Playwright", () => {
    expect(workflow).not.toMatch(/secrets\s*[.[]/);
    expect(workflow.toLowerCase()).not.toContain("playwright");
    expect(workflow).not.toMatch(/^\s*services:/m);
  });

  it("AR-20: setter LLM_PROVIDER til mock", () => {
    expect(workflow).toMatch(/^env:\n(?:\s+#.*\n)*\s+LLM_PROVIDER: mock$/m);
  });
});
