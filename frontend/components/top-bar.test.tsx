// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SemesterLine } from "./semester-line";
import { TopBar } from "./top-bar";

afterEach(cleanup);

describe("TopBar og SemesterLine", () => {
  it("UX-DR45: toppfeltet er ett header med bare logoen", () => {
    render(<TopBar />);
    const header = screen.getByRole("banner");
    expect(header.textContent).toBe("Studiekamerat");
    expect(header.querySelectorAll("a, button")).toHaveLength(0);
    expect(header.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("UX-DR4: med logoHref er logoen en lenke til forsiden", () => {
    render(<TopBar logoHref="/" />);
    const link = screen.getByRole("link", { name: "Studiekamerat" });
    expect(link.getAttribute("href")).toBe("/");
    expect(screen.getByRole("banner").contains(link)).toBe(true);
  });

  it("NFR-12: semesterlinja er skjult for skjermleser", () => {
    const { container } = render(<SemesterLine />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("focusable")).toBe("false");
  });

  it("UX-DR1: semesterlinja er grå: bare border-control, gridline, ink-muted og paper", () => {
    const { container } = render(<SemesterLine />);
    const colours = new Set(
      [...container.querySelectorAll("[class]")].flatMap((el) =>
        (el.getAttribute("class") ?? "").split(" ").filter((c) => /^(fill|stroke)-/.test(c)),
      ),
    );
    expect([...colours].sort()).toEqual(
      ["fill-border-control", "fill-ink-muted", "fill-paper", "stroke-border-control", "stroke-gridline"],
    );
  });
});
