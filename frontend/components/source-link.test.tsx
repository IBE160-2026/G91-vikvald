// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SourceLink } from "./source-link";

afterEach(cleanup);

describe("SourceLink", () => {
  it("FR-20: viser «<filnavn>, side N» som tekst, ikke lenke", () => {
    const { container } = render(<SourceLink source={{ file_name: "merkevare-notater.pdf", page_no: 4 }} />);
    expect(screen.getByText("merkevare-notater.pdf, side 4")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    const root = container.querySelector("[data-slot='source-link']")!;
    expect(root.className).toContain("text-caption");
    expect(root.className).toContain("text-ink");
    expect(root.className).not.toContain("underline");
    expect(root.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});
