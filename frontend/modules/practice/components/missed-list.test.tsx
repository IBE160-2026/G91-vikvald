// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MissedList } from "./missed-list";

afterEach(cleanup);

describe("MissedList", () => {
  it("FR-26, UX-DR34: h3, antall og én rad per kort med nummer, spørsmål og kilde", () => {
    render(
      <MissedList
        items={[
          { id: "a", number: 3, front: "Hva skiller en merkevare fra et produkt?", source: { file_name: "merkevare-notater.pdf", page_no: 2 } },
          { id: "b", number: 9, front: "Hva er merkevareassosiasjoner?", source: { file_name: "merkevare-notater.pdf", page_no: 5 } },
        ]}
      />,
    );
    const section = screen.getByRole("region", { name: "Kortene du ikke kunne" });
    expect(within(section).getByRole("heading", { level: 3, name: "Kortene du ikke kunne" })).toBeTruthy();
    expect(within(section).getByText("2 kort").className).toContain("text-ink-muted");
    const rows = within(section).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      "Kort 3:Hva skiller en merkevare fra et produkt?merkevare-notater.pdf, side 2",
      "Kort 9:Hva er merkevareassosiasjoner?merkevare-notater.pdf, side 5",
    ]);
    expect(rows[0].className).toContain("min-h-[56px]");
    expect(section.querySelectorAll("[data-slot='source-link']")).toHaveLength(2);
    expect(section.querySelectorAll("a, button")).toHaveLength(0);
  });
});
