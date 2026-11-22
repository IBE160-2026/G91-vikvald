// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ResultSummary, resultTitle } from "./result-summary";

afterEach(cleanup);

function fields(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("[data-slot='result-field']")).map((field) => field.textContent ?? "");
}

describe("ResultSummary", () => {
  it("FR-26, UX-DR34: ferdig økt med overlinje, tittel, undertekst og to felt med tall og prosent", () => {
    const { container } = render(
      <ResultSummary
        total={3}
        counts={{ answered: 3, correct: 2, wrong: 1 }}
        aborted={false}
        scopeName="Uke 37: Merkevare"
      />,
    );
    expect(screen.getByText("ØKT FERDIG").className).toContain("text-overline");
    const title = screen.getByRole("heading", { level: 2, name: "Du har gått gjennom alle 3 kortene" });
    expect(title.className).toContain("text-page-title");
    expect(title.getAttribute("tabindex")).toBe("-1");
    expect(screen.getByText("Uke 37: Merkevare · kortene du ikke kunne, ble repetert til slutt i økten")).toBeTruthy();
    expect(fields(container)).toEqual(["Kunne67 % av kortene2", "Kunne ikkeRepetert til slutt i økten1"]);

    const card = container.querySelector("[data-slot='result-summary'] > div")!;
    for (const name of ["bg-surface", "border-border-card", "rounded-lg", "shadow-lift"]) {
      expect(card.className).toContain(name);
    }
    expect(screen.getByText("2").className).toContain("text-result-title");
    const icons = container.querySelectorAll("[data-slot='result-field'] > span[aria-hidden='true']");
    expect(icons[0].className).toContain("bg-success-tint");
    expect(icons[1].className).toContain("bg-danger-tint");
    expect(icons[0].className).toContain("size-[32px]");
    // No celebration.
    expect(container.textContent).not.toMatch(/!|Gratulerer|Bra jobba/);
  });

  it("FR-26: uten «Kunne ikke»-kort står bare forelesningsnavnet i underteksten", () => {
    render(<ResultSummary total={2} counts={{ answered: 2, correct: 2, wrong: 0 }} aborted={false} scopeName="Uke 37" />);
    expect(screen.getByText("Uke 37")).toBeTruthy();
    expect(screen.getByText("100 % av kortene")).toBeTruthy();
  });

  it("UX-DR33: avbrutt økt har «Avbrutt etter A av N» og ingen tekst om repetisjon", () => {
    const { container } = render(
      <ResultSummary total={3} counts={{ answered: 1, correct: 0, wrong: 1 }} aborted scopeName="Uke 37" />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Avbrutt etter 1 av 3" })).toBeTruthy();
    expect(container.textContent).not.toMatch(/[Rr]epetert/);
    expect(fields(container)).toEqual(["Kunne0 % av kortene0", "Kunne ikke1"]);
  });

  it("FR-26: entallsform for ett kort", () => {
    expect(resultTitle({ total: 1, answered: 1, aborted: false })).toBe("Du har gått gjennom 1 kort");
    expect(resultTitle({ total: 24, answered: 24, aborted: false })).toBe("Du har gått gjennom alle 24 kortene");
    expect(resultTitle({ total: 20, answered: 12, aborted: true })).toBe("Avbrutt etter 12 av 20");
  });
});
