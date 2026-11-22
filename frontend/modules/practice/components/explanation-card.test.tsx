// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ExplanationCard } from "./explanation-card";

afterEach(cleanup);

describe("ExplanationCard", () => {
  it("FR-35, UX-DR8: hvitt kort med «Forklaring», forklaringen, kilden og forelesningen med emneprikk", () => {
    const { container } = render(
      <ExplanationCard
        explanation="Merkevare er et navn."
        source={{ file_name: "merkevare-notater.pdf", page_no: 7 }}
        lectureName="Uke 37: Merkevare"
        colorIndex={1}
      />,
    );
    const card = container.querySelector("[data-slot='explanation-card']")!;
    for (const name of ["rounded-lg", "border-border-card", "bg-surface", "shadow-lift"]) {
      expect(card.className).toContain(name);
    }
    expect(screen.getByText("Forklaring")).toBeTruthy();
    expect(screen.getByText("Merkevare er et navn.")).toBeTruthy();
    expect(screen.getByText("merkevare-notater.pdf, side 7")).toBeTruthy();
    const lecture = screen.getByText("Uke 37: Merkevare");
    expect(lecture.parentElement!.querySelector("[data-color-index='1']")).toBeTruthy();
    expect(card.querySelector(".border-t.border-divider")).toBeTruthy();
  });
});
