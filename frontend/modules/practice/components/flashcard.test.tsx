// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Flashcard as FlashcardData, Mark } from "../types";
import { Flashcard } from "./flashcard";

afterEach(cleanup);

const CARD: FlashcardData = {
  id: "c1",
  kind: "qa",
  front: "Hva er <b>merkevare</b>?",
  back: "Et navn som skiller et produkt fra andre.",
  source: { file_id: "f1", file_name: "merkevare-notater.pdf", page_no: 4 },
};

function Harness({ card = CARD, onMark = vi.fn<(mark: Mark) => void>(), showHints = false }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <Flashcard card={card} flipped={flipped} onFlip={() => setFlipped(true)} onMark={onMark} showHints={showHints} />
  );
}

describe("Flashcard", () => {
  it("FR-24: ikke snudd viser bare spørsmålet, «Snu kortet», og to knapper som ikke er aktive", () => {
    const { container } = render(<Harness />);
    const card = container.querySelector("[data-slot='flashcard']")!;
    expect(card.className).toContain("rounded-xl");
    expect(card.className).toContain("shadow-float");
    expect(card.className).toContain("border-border-card");
    expect(screen.getByText("SPØRSMÅL")).toBeTruthy();
    // Plain text, never HTML.
    expect(screen.getByText("Hva er <b>merkevare</b>?")).toBeTruthy();
    expect(card.querySelector("b")).toBeNull();
    expect(screen.queryByText("SVAR")).toBeNull();
    expect(screen.queryByText(CARD.back)).toBeNull();
    expect(screen.getByRole("button", { name: "Snu kortet" }).dataset.variant).toBe("outline");
    const missed = screen.getByRole("button", { name: "Kunne ikke" }) as HTMLButtonElement;
    const known = screen.getByRole("button", { name: "Kunne" }) as HTMLButtonElement;
    expect(missed.disabled && known.disabled).toBe(true);
    expect(missed.dataset.variant).toBe("outline");
    expect(known.dataset.variant).toBe("primary");
    expect(known.className).toContain("w-[208px]");
    expect(known.dataset.size).toBe("lg");
  });

  it("FR-20: «Snu kortet» viser SVAR, svaret og kilden, og fokus går til «Kunne»", () => {
    const onMark = vi.fn();
    render(<Harness onMark={onMark} />);
    fireEvent.click(screen.getByRole("button", { name: "Snu kortet" }));
    expect(screen.getByText("SVAR")).toBeTruthy();
    expect(screen.getByText(CARD.back)).toBeTruthy();
    expect(screen.getByText("merkevare-notater.pdf, side 4")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button", { name: "Snu kortet" })).toBeNull();
    const known = screen.getByRole("button", { name: "Kunne" }) as HTMLButtonElement;
    expect(known.disabled).toBe(false);
    expect(document.activeElement).toBe(known);
    fireEvent.click(screen.getByRole("button", { name: "Kunne ikke" }));
    expect(onMark).toHaveBeenCalledWith("missed");
    fireEvent.click(known);
    expect(onMark).toHaveBeenLastCalledWith("known");
  });

  it("FR-24: ett klikk på «Snu kortet» snur kortet én gang", () => {
    const onFlip = vi.fn();
    render(<Flashcard card={CARD} flipped={false} onFlip={onFlip} onMark={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Snu kortet" }));
    expect(onFlip).toHaveBeenCalledOnce();
  });

  it("FR-24: et klikk på kortet snur det også", () => {
    const { container } = render(<Harness />);
    fireEvent.click(container.querySelector("[data-slot='flashcard']")!);
    expect(screen.getByText("SVAR")).toBeTruthy();
  });

  it("FR-24: med focusOnMount får «Snu kortet» fokus", () => {
    render(<Flashcard card={CARD} flipped={false} onFlip={vi.fn()} onMark={vi.fn()} focusOnMount />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Snu kortet" }));
  });
  it("UX-DR26: hint-linjen står under knappene bare når den er slått på", () => {
    const { container, unmount } = render(<Harness />);
    expect(container.querySelector("[data-slot='shortcut-hints']")).toBeNull();
    unmount();
    const shown = render(<Harness showHints />);
    const hints = shown.container.querySelector("[data-slot='shortcut-hints']")!;
    const known = screen.getByRole("button", { name: "Kunne" });
    expect(known.compareDocumentPosition(hints) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(hints.textContent).toContain("Mellomrom snu kortet");
  });
});
