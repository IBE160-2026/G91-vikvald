// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Checkbox } from "./checkbox";

afterEach(cleanup);

describe("avkrysningsboksen", () => {
  it("UX-DR23: 20 px, rounded.kbd, kant border-control og fylt merkefarge når den er krysset av", () => {
    render(
      <>
        <Checkbox id="boks" />
        <label htmlFor="boks">Jeg har lest dette</label>
      </>,
    );
    const box = screen.getByRole("checkbox", { name: "Jeg har lest dette" });
    for (const name of ["size-[20px]", "rounded-kbd", "border-border-control", "bg-surface", "data-[state=checked]:bg-brand"]) {
      expect(box.className).toContain(name);
    }
    expect(box.className).not.toContain("outline-none");
    expect(box.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(screen.getByText("Jeg har lest dette"));
    expect(box.getAttribute("aria-checked")).toBe("true");
    expect(box.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});
