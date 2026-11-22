// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FALLBACK_MESSAGE } from "@/lib/messages";

import { PracticeAllCard, type PracticeAllRow } from "./practice-all-card";

afterEach(cleanup);

const FLASHCARDS: PracticeAllRow = {
  id: "flashcards",
  title: "Flashcards",
  scope: "120 kort fra 6 forelesninger",
  action: <a href="/emner/s1/flashcards">Øv på flashcards</a>,
};
const QUIZ: PracticeAllRow = { id: "quiz", title: "Quiz", scope: "48 spørsmål", action: <button>Start</button> };

describe("PracticeAllCard", () => {
  it("UX-DR14: h2 «Øv på hele emnet» over et hvitt kort med tittel, omfang og handling per rad", () => {
    render(<PracticeAllCard rows={[FLASHCARDS]} />);
    const section = screen.getByRole("region", { name: "Øv på hele emnet" });
    const heading = within(section).getByRole("heading", { level: 2, name: "Øv på hele emnet" });
    expect(heading.className).toContain("text-section-title");
    const card = section.querySelector("[data-slot='practice-all-card']")!;
    for (const token of ["bg-surface", "border-border-card", "rounded-lg", "shadow-lift", "p-4", "@container"]) {
      expect(card.className).toContain(token);
    }
    const title = within(section).getByRole("heading", { level: 3, name: "Flashcards" });
    expect(title.className).toContain("text-item-title");
    const scope = within(section).getByText("120 kort fra 6 forelesninger");
    expect(scope.className).toContain("text-body-sm");
    expect(scope.className).toContain("text-ink-muted");
    expect(within(section).getByRole("link", { name: "Øv på flashcards" }).getAttribute("href")).toBe("/emner/s1/flashcards");
    // Under the text in a narrow card, to the right in a wide one.
    const row = card.querySelector("[data-slot='practice-all-row']")!;
    expect(row.className).toContain("flex-col");
    expect(row.className).toContain("@md:flex-row");
  });

  it("UX-DR14: flere rader står i rekkefølge, delt av hårlinje", () => {
    render(<PracticeAllCard rows={[FLASHCARDS, QUIZ]} />);
    const titles = screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
    expect(titles).toEqual(["Flashcards", "Quiz"]);
    const card = document.querySelector("[data-slot='practice-all-card']")!;
    expect(card.querySelectorAll("hr")).toHaveLength(1);
    expect(card.querySelector("hr")!.className).toContain("border-divider");
  });

  it("UX-DR14: uten rader vises verken overskrift eller kort", () => {
    const { container } = render(<PracticeAllCard rows={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("FR-23: feil gir reserveteksten i role=alert i seksjonen", () => {
    render(<PracticeAllCard rows={[]} error />);
    const section = screen.getByRole("region", { name: "Øv på hele emnet" });
    expect(within(section).getByRole("alert").textContent).toBe(FALLBACK_MESSAGE);
    expect(section.querySelector("[data-slot='practice-all-card']")).toBeNull();
  });
});
