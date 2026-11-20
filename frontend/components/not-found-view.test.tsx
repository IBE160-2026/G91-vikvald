// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { NotFoundView } from "./not-found-view";

afterEach(cleanup);

describe("NotFoundView", () => {
  it("UX-DR21: én h1 «Fant ikke siden» og lenken «Gå til forsiden» til /", () => {
    render(<NotFoundView />);
    const headings = screen.getAllByRole("heading");
    expect(headings).toHaveLength(1);
    expect(headings[0].tagName).toBe("H1");
    expect(headings[0].textContent).toBe("Fant ikke siden");
    const link = screen.getByRole("link", { name: "Gå til forsiden" });
    expect(link.getAttribute("href")).toBe("/");
    expect(link.className).not.toContain("underline");
  });
});
