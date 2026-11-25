// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Flashcard as FlashcardData, Mark, ModelCard } from "../types";
import { Flashcard } from "./flashcard";

afterEach(cleanup);

const CARD: FlashcardData = {
  id: "c1",
  kind: "qa",
  front: "Hva er <b>merkevare</b>?",
  back: "Et navn som skiller et produkt fra andre.",
  formula_flag: false,
  source: { file_id: "f1", file_name: "merkevare-notater.pdf", page_no: 4 },
};

function Harness({ card = CARD, onMark = vi.fn<(mark: Mark) => void>(), showHints = false }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <Flashcard card={card} flipped={flipped} onFlip={() => setFlipped(true)} onMark={onMark} showHints={showHints} />
  );
}

function expectFlagRightAboveSource(root: ParentNode) {
  const flag = root.querySelector("[data-slot='formula-flag']");
  expect(flag).not.toBeNull();
  expect(flag!.textContent).toBe("Inneholder formel – sjekk mot kilden");
  expect(flag!.nextElementSibling?.getAttribute("data-slot")).toBe("source-link");
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
  it("UX-DR27: hint-linjen står under knappene bare når den er slått på", () => {
    const { container, unmount } = render(<Harness />);
    expect(container.querySelector("[data-slot='shortcut-hints']")).toBeNull();
    unmount();
    const shown = render(<Harness showHints />);
    const hints = shown.container.querySelector("[data-slot='shortcut-hints']")!;
    const known = screen.getByRole("button", { name: "Kunne" });
    expect(known.compareDocumentPosition(hints) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(hints.textContent).toContain("Mellomrom snu kortet");
  });

  it("FR-27: et snudd kort har kilden til venstre og «Rediger» og «Slett» som tekstknapper til høyre", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onFlip = vi.fn();
    const { container } = render(
      <Flashcard card={CARD} flipped onFlip={onFlip} onMark={vi.fn()} onEdit={onEdit} onDelete={onDelete} />,
    );
    const footer = container.querySelector("[data-slot='flashcard-footer']")!;
    expect(footer.className).toContain("justify-between");
    expect(footer.className).toContain("flex-wrap");
    const edit = screen.getByRole("button", { name: "Rediger" });
    const remove = screen.getByRole("button", { name: "Slett" });
    expect(edit.dataset.variant).toBe("text");
    expect(remove.dataset.variant).toBe("text");
    expect(remove.className).toContain("text-danger");
    const source = footer.querySelector("[data-slot='source-link']")!;
    expect(source.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(edit);
    fireEvent.click(remove);
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onFlip).not.toHaveBeenCalled();
  });

  it("FR-27: et kort som ikke er snudd, har ikke «Rediger» og «Slett»", () => {
    render(<Flashcard card={CARD} flipped={false} onFlip={vi.fn()} onMark={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Rediger" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Slett" })).toBeNull();
  });

  it("FR-41: et merket kort viser formelmerket rett over kilden når det er snudd", () => {
    const { container } = render(<Harness card={{ ...CARD, formula_flag: true }} />);
    expect(container.querySelector("[data-slot='formula-flag']")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Snu kortet" }));
    expectFlagRightAboveSource(container);
  });

  it("FR-41: et kort uten merke viser ikke formelmerket", () => {
    const { container } = render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Snu kortet" }));
    expect(container.querySelector("[data-slot='formula-flag']")).toBeNull();
  });

  describe("modellkort (story 7.2)", () => {
    const MODEL: ModelCard = {
      id: "m1",
      kind: "model",
      front: "Forklar AIDA-modellen.",
      back: null,
      points: ["Attention (oppmerksomhet)", "Interest (interesse)", "Desire (ønske)", "Action (handling)"],
      mnemonic: "AIDA. Kunden går fra oppmerksomhet til handling.",
      formula_flag: true,
      source: { file_id: "f1", file_name: "merkevare-notater.pdf", page_no: 9 },
    };

    it("UX-DR28, FR-42: ikke snudd viser bare SPØRSMÅL og «Snu kortet»; snudd viser punktene, huskeregelen, formelmerket og kilden", () => {
      const { container } = render(<Harness card={MODEL} />);
      expect(container.querySelector("ol")).toBeNull();
      expect(screen.queryByText("Huskeregel:")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Snu kortet" }));
      expect(screen.getByText("SVAR")).toBeTruthy();
      expect(container.querySelectorAll("ol > li")).toHaveLength(4);
      expect(screen.getByText("Huskeregel:")).toBeTruthy();
      expectFlagRightAboveSource(container);
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Kunne" }));
    });

    it("FR-46, UX-DR20: bunnfeltet har «Endre huskeregel» før «Rediger» og «Slett»", () => {
      const onEditMnemonic = vi.fn();
      const onFlip = vi.fn();
      render(
        <Flashcard
          card={MODEL}
          flipped
          onFlip={onFlip}
          onMark={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditMnemonic={onEditMnemonic}
        />,
      );
      const footer = document.querySelector("[data-slot='flashcard-footer']")!;
      const names = [...footer.querySelectorAll("button")].map((button) => button.textContent);
      expect(names).toEqual(["Endre huskeregel", "Rediger", "Slett"]);
      const change = screen.getByRole("button", { name: "Endre huskeregel" });
      expect(change.dataset.variant).toBe("text");
      fireEvent.click(change);
      expect(onEditMnemonic).toHaveBeenCalledOnce();
      expect(onFlip).not.toHaveBeenCalled();
    });

    it("FR-46: uten huskeregel heter knappen «Legg til huskeregel»", () => {
      render(
        <Flashcard card={{ ...MODEL, mnemonic: null }} flipped onFlip={vi.fn()} onMark={vi.fn()} onEditMnemonic={vi.fn()} />,
      );
      expect(screen.getByRole("button", { name: "Legg til huskeregel" })).toBeTruthy();
      expect(screen.queryByText("Huskeregel:")).toBeNull();
    });

    it("AR-11: uten onEditMnemonic (bryteren av) står huskeregelen, men knappen mangler", () => {
      render(<Flashcard card={MODEL} flipped onFlip={vi.fn()} onMark={vi.fn()} onEdit={vi.fn()} />);
      expect(screen.getByText("Huskeregel:")).toBeTruthy();
      expect(screen.queryByRole("button", { name: /huskeregel/ })).toBeNull();
    });

    it("FR-27: et vanlig kort får aldri huskeregelknappen", () => {
      render(<Flashcard card={CARD} flipped onFlip={vi.fn()} onMark={vi.fn()} onEditMnemonic={vi.fn()} />);
      expect(screen.queryByRole("button", { name: /huskeregel/ })).toBeNull();
    });
  });
});
