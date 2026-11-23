// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FormulaFlag } from "./formula-flag";

afterEach(cleanup);

describe("FormulaFlag", () => {
  it("FR-41: viser «Inneholder formel – sjekk mot kilden» som tekst på merknadsflaten med infoikon", () => {
    const { container } = render(<FormulaFlag flagged />);
    expect(screen.getByText("Inneholder formel – sjekk mot kilden")).toBeTruthy();
    const surface = container.querySelector('[data-slot="formula-flag"] [data-slot="note-surface"]')!;
    expect(surface.className).toContain("bg-surface-note");
    const icon = surface.querySelector("svg")!;
    expect(icon.getAttribute("class")).toContain("lucide-info");
    expect(icon.getAttribute("aria-hidden")).toBe("true");
  });

  it("FR-41: merket er aldri oransje eller rødt", () => {
    const { container } = render(<FormulaFlag flagged />);
    const classes = Array.from(container.querySelectorAll("*"))
      .map((element) => element.getAttribute("class") ?? "")
      .join(" ");
    expect(classes).not.toMatch(/\b(?:text|bg|border)-(?:danger|warning|orange|red)\b/);
  });

  it("FR-41: viser ingenting når innholdet ikke er merket", () => {
    const { container } = render(<FormulaFlag flagged={false} />);
    expect(container.innerHTML).toBe("");
    render(<FormulaFlag flagged={undefined} />);
    expect(screen.queryByText("Inneholder formel – sjekk mot kilden")).toBeNull();
  });
});
