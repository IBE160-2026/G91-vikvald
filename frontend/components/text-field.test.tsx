// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { TextField } from "./text-field";

afterEach(cleanup);

describe("TextField", () => {
  it("NFR-12: etiketten er synlig og koblet til feltet", () => {
    render(<TextField label="E-post" />);
    const input = screen.getByLabelText("E-post");
    expect(input.tagName).toBe("INPUT");
    expect(screen.getByText("E-post").tagName).toBe("LABEL");
  });

  it("UX-DR5: feltet er 48 px med kanten border-control", () => {
    render(<TextField label="E-post" />);
    const input = screen.getByLabelText("E-post");
    expect(input.classList).toContain("h-field-height");
    expect(input.classList).toContain("border-border-control");
    expect(input.className).not.toContain("border-card");
  });

  it("NFR-11: uten feil har feltet verken aria-invalid eller aria-describedby", () => {
    render(<TextField label="E-post" />);
    const input = screen.getByLabelText("E-post");
    expect(input.hasAttribute("aria-invalid")).toBe(false);
    expect(input.hasAttribute("aria-describedby")).toBe(false);
  });

  it("NFR-11: feil gir rød kant, ikon og tekst koblet med aria-describedby og aria-invalid", () => {
    render(<TextField label="E-post" error="Skriv inn en gyldig e-postadresse." />);
    const input = screen.getByLabelText("E-post");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.classList).toContain("border-danger");
    expect(input.classList).toContain("border-[1.5px]");

    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const message = document.getElementById(describedBy!);
    expect(message?.textContent).toBe("Skriv inn en gyldig e-postadresse.");
    expect(message?.classList).toContain("text-danger");
    const icon = message?.querySelector("svg");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });

  it("UX-DR6: ikonet har 16 px og 1,5 px strek", () => {
    render(<TextField label="E-post" error="Feil" />);
    const icon = screen.getByText("Feil").parentElement?.querySelector("svg");
    expect(icon?.getAttribute("width")).toBe("16");
    // absoluteStrokeWidth: lucide draws in a 24-unit viewBox, so 1.5 px at 16 px is 2.25 units.
    const viewBoxWidth = Number(icon?.getAttribute("viewBox")?.split(" ")[2]);
    expect((Number(icon?.getAttribute("stroke-width")) * 16) / viewBoxWidth).toBe(1.5);
  });

  it("UX-DR5: ref peker til input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<TextField ref={ref} label="E-post" />);
    expect(ref.current).toBe(screen.getByLabelText("E-post"));
  });

  it("UX-DR5: to felt får hver sin id", () => {
    render(
      <>
        <TextField label="A" error="feil a" />
        <TextField label="B" error="feil b" />
      </>,
    );
    expect(screen.getByLabelText("A").id).not.toBe(screen.getByLabelText("B").id);
  });
});
