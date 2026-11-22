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

  it("FR-36, UX-DR35: quizvarianten har ingen overskrift og én rad med nummer, spørsmål, kilde, ditt svar, riktig svar og forklaring", () => {
    const { container } = render(
      <MissedList
        kind="quiz"
        items={[
          {
            id: "a",
            number: 4,
            front: "Hvilken av disse beskriver best posisjonering?",
            source: { file_name: "merkevare-notater.pdf", page_no: 7 },
            chosen: "Å velge segmenter",
            correct: "Å skape et tydelig bilde av merket",
            explanation: "Å velge segmenter er målgruppevalg.",
          },
        ]}
      />,
    );
    const list = container.querySelector("[data-slot='missed-list']") as HTMLElement;
    expect(within(list).queryByRole("heading")).toBeNull();
    expect(screen.queryByRole("region")).toBeNull();
    const card = list.querySelector("ul")!;
    for (const name of ["bg-surface", "border-border-card", "rounded-lg", "shadow-lift"]) {
      expect(card.className).toContain(name);
    }
    const rows = within(list).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      "Spørsmål 4:Hvilken av disse beskriver best posisjonering?merkevare-notater.pdf, side 7✗ Ditt svarÅ velge segmenter✓ Riktig svarÅ skape et tydelig bilde av merketÅ velge segmenter er målgruppevalg.",
    ]);
    const number = rows[0].firstElementChild!;
    expect(number.className).toContain("size-[31px]");
    expect(number.className).toContain("border");
    expect(screen.getByText("Hvilken av disse beskriver best posisjonering?").className).toContain("text-item-title");
    expect(screen.getByText("Ditt svar").className).toContain("text-danger");
    expect(screen.getByText("Riktig svar").className).toContain("text-success");
    expect(screen.getByText("Å skape et tydelig bilde av merket").className).toContain("font-semibold");
    const explanation = screen.getByText("Å velge segmenter er målgruppevalg.");
    expect(explanation.className).toContain("text-meta");
    expect(explanation.className).toContain("text-ink-muted");
    for (const symbol of ["✗", "✓"]) {
      expect(within(list).getByText(symbol, { exact: false, selector: "span" }).getAttribute("aria-hidden")).toBe("true");
    }
    expect(list.querySelectorAll("[data-slot='source-link']")).toHaveLength(1);
    expect(list.querySelector("[data-slot='missed-lecture']")).toBeNull();
  });

  it("FR-34: i en quiz på hele emnet står forelesningen under kilden på hver rad", () => {
    const item = {
      source: { file_name: "merkevare-notater.pdf", page_no: 7 },
      chosen: "B",
      correct: "A",
      explanation: "A er riktig.",
    };
    const { container } = render(
      <MissedList
        kind="quiz"
        items={[
          { ...item, id: "a", number: 1, front: "Hva er A?", lecture: "Uke 37: Merkevare" },
          { ...item, id: "b", number: 3, front: "Hva er C?", lecture: "Uke 38: Pris" },
        ]}
      />,
    );
    const rows = within(container.querySelector("[data-slot='missed-list']") as HTMLElement).getAllByRole("listitem");
    expect(rows.map((row) => row.querySelector("[data-slot='missed-lecture']")!.textContent)).toEqual([
      "Uke 37: Merkevare",
      "Uke 38: Pris",
    ]);
    const lecture = rows[0].querySelector("[data-slot='missed-lecture']")!;
    expect(lecture.className).toContain("text-caption");
    expect(lecture.className).toContain("text-ink-muted");
    // Right under the source.
    expect(lecture.previousElementSibling!.getAttribute("data-slot")).toBe("source-link");
    expect(rows[0].textContent).toContain("merkevare-notater.pdf, side 7Uke 37: Merkevare");
  });
});
