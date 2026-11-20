import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { cn, themeTokens } from "./utils";

const globalsCss = readFileSync(fileURLToPath(new URL("../app/globals.css", import.meta.url)), "utf8");

// Token names in globals.css for one namespace, e.g. "text" gives page-title, body ...
function cssTokens(namespace: string): string[] {
  const names = [...globalsCss.matchAll(new RegExp(`--${namespace}-([a-z][\\w-]*?):`, "g"))]
    .map((m) => m[1])
    .filter((name) => name !== "*" && !name.includes("--"));
  return [...new Set(names)];
}

describe("cn", () => {
  it("UX-DR1: kjenner alle tekst-, avstands-, hjørne- og skyggetokenene i globals.css", () => {
    const tshirt = /^(xs|sm|md|lg|xl|full)$/;
    expect([...themeTokens.text].sort()).toEqual(cssTokens("text").sort());
    expect([...themeTokens.spacing].sort()).toEqual(cssTokens("spacing").sort());
    expect([...themeTokens.radius].sort()).toEqual(cssTokens("radius").filter((n) => !tshirt.test(n)).sort());
    expect([...themeTokens.shadow].sort()).toEqual(cssTokens("shadow").sort());
  });

  it("UX-DR2: en teksttoken og en farge står side om side", () => {
    expect(cn("text-label text-ink")).toBe("text-label text-ink");
    expect(cn("text-meta-strong", "text-brand")).toBe("text-meta-strong text-brand");
  });

  it("UX-DR1: en senere token av samme slag vinner", () => {
    expect(cn("text-body", "text-label")).toBe("text-label");
    expect(cn("h-button-height", "h-button-height-lg")).toBe("h-button-height-lg");
    expect(cn("rounded-md", "rounded-option")).toBe("rounded-option");
    expect(cn("shadow-lift", "shadow-float")).toBe("shadow-float");
    expect(cn("border border-border-control", "border-[1.5px] border-danger")).toBe(
      "border-[1.5px] border-danger",
    );
  });

  it("UX-DR1: en skygge og en kantfarge slår ikke hverandre ut", () => {
    expect(cn("shadow-lift border-border-control")).toBe("shadow-lift border-border-control");
  });
});
