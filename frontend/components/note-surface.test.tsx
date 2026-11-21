// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { Info } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";

import { NoteSurface } from "./note-surface";

afterEach(cleanup);

describe("NoteSurface", () => {
  it("UX-DR20: låsikonet er standard, og teksten står på merknadsflaten", () => {
    const { container } = render(<NoteSurface>I demomodus sendes ingenting ut.</NoteSurface>);
    const surface = container.querySelector('[data-slot="note-surface"]')!;
    expect(surface.className).toContain("bg-surface-note");
    expect(surface.className).toContain("rounded-option");
    expect(surface.querySelector("svg")!.getAttribute("class")).toContain("lucide-lock");
    expect(screen.getByText("I demomodus sendes ingenting ut.")).toBeTruthy();
  });

  it("UX-DR20: icon gir et annet ikon, som er pynt", () => {
    const { container } = render(<NoteSurface icon={Info}>Det ble laget færre.</NoteSurface>);
    const icon = container.querySelector("svg")!;
    expect(icon.getAttribute("class")).toContain("lucide-info");
    expect(icon.getAttribute("aria-hidden")).toBe("true");
  });
});
