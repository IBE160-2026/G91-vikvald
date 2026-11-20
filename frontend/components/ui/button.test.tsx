// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { Button } from "./button";

afterEach(cleanup);

describe("Button", () => {
  it.each([
    ["primary", ["bg-brand", "text-on-brand"]],
    ["outline", ["bg-surface", "text-ink", "border-border-control"]],
    ["text", ["text-brand", "hover:bg-brand-tint"]],
    ["danger", ["bg-danger", "text-on-danger"]],
  ] as const)("UX-DR5: varianten %s har fargene fra DESIGN.md", (variant, classes) => {
    render(<Button variant={variant}>Lagre</Button>);
    const button = screen.getByRole("button", { name: "Lagre" });
    for (const name of classes) expect(button.classList).toContain(name);
  });

  it("UX-DR5: border-card brukes aldri på en knapp", () => {
    for (const variant of ["primary", "outline", "text", "danger"] as const) {
      render(<Button variant={variant}>{variant}</Button>);
      expect(screen.getByRole("button", { name: variant }).className).not.toContain("border-card");
    }
  });

  it("UX-DR5: standard er primary, 40 px og type=button", () => {
    render(<Button>Lagre</Button>);
    const button = screen.getByRole("button", { name: "Lagre" });
    expect(button.classList).toContain("bg-brand");
    expect(button.classList).toContain("h-button-height");
    expect(button.getAttribute("type")).toBe("button");
  });

  it("UX-DR5: stor knapp er 48 px", () => {
    render(<Button size="lg">Lagre</Button>);
    expect(screen.getByRole("button", { name: "Lagre" }).classList).toContain("h-button-height-lg");
  });

  it("UX-DR5: type og ref sendes videre", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button ref={ref} type="submit">
        Send
      </Button>,
    );
    expect(ref.current).toBe(screen.getByRole("button", { name: "Send" }));
    expect(ref.current?.getAttribute("type")).toBe("submit");
  });
});
