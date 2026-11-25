// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { ModelCard } from "../types";
import { ModelCardBack, pointLetter, pointParts } from "./model-card-back";

afterEach(cleanup);

const CARD: ModelCard = {
  id: "m1",
  kind: "model",
  front: "Forklar AIDA-modellen.",
  back: null,
  points: ["Attention (oppmerksomhet)", "Interest (interesse)", "Desire (ønske)", "Action (handling)"],
  mnemonic: "AIDA. Kunden går fra oppmerksomhet til handling, i denne rekkefølgen.",
  formula_flag: false,
  source: { file_id: "f1", file_name: "merkevare-notater.pdf", page_no: 9 },
};

describe("pointParts", () => {
  it("UX-DR28: «term (oversettelse)» gir termen i 600 og parentesen dempet", () => {
    expect(pointParts("Attention (oppmerksomhet)")).toEqual({ term: "Attention", muted: "(oppmerksomhet)", rest: "" });
  });

  it("UX-DR28: «term: forklaring» gir termen i 600 og resten vanlig", () => {
    expect(pointParts("Produkt: varen eller tjenesten (kjernen)")).toEqual({
      term: "Produkt",
      muted: "",
      rest: ": varen eller tjenesten (kjernen)",
    });
  });

  it("UX-DR28: et punkt uten parentes og kolon er vanlig tekst, også med parentes først", () => {
    expect(pointParts("Pris")).toEqual({ term: "", muted: "", rest: "Pris" });
    expect(pointParts("(Plass)")).toEqual({ term: "", muted: "", rest: "(Plass)" });
    expect(pointParts("Plass (uten slutt")).toEqual({ term: "", muted: "", rest: "Plass (uten slutt" });
  });
});

describe("pointLetter", () => {
  it("UX-DR28: første bokstav, stor, også æ/ø/å og etter tegn", () => {
    expect(pointLetter("attention")).toBe("A");
    expect(pointLetter("ønske")).toBe("Ø");
    expect(pointLetter("1. «Åpen»")).toBe("Å");
    expect(pointLetter("123")).toBe("");
  });
});

describe("ModelCardBack", () => {
  it("UX-DR45: punktene er en <ol>, og bokstavboksene og linja er skjult for skjermleser", () => {
    const { container } = render(<ModelCardBack card={CARD} />);
    const list = container.querySelector("ol")!;
    const items = list.querySelectorAll(":scope > li");
    expect(items).toHaveLength(4);
    const boxes = [...container.querySelectorAll("[data-slot='letter-box']")];
    expect(boxes.map((box) => box.textContent)).toEqual(["A", "I", "D", "A"]);
    expect(boxes.every((box) => box.getAttribute("aria-hidden") === "true")).toBe(true);
    expect(container.querySelector("[data-slot='model-card-line']")!.getAttribute("aria-hidden")).toBe("true");
    // Each point is read once: the text without the letter box.
    expect(items[0].querySelector("[data-slot='point-text']")!.textContent).toBe("Attention (oppmerksomhet)");
  });

  it("UX-DR28: termen står i 600 og oversettelsen dempet", () => {
    render(<ModelCardBack card={CARD} />);
    expect(screen.getByText("Attention").className).toContain("font-semibold");
    expect(screen.getByText("(oppmerksomhet)").className).toContain("text-ink-muted");
  });

  it("FR-42, UX-DR28: huskeregelen står på merknadsflaten med «Huskeregel:»", () => {
    const { container } = render(<ModelCardBack card={CARD} />);
    const note = container.querySelector("[data-slot='note-surface']")!;
    expect(note.className).toContain("bg-surface-note");
    expect(note.textContent).toBe(`Huskeregel: ${CARD.mnemonic}`);
    expect(note.querySelector("svg.lucide-info")).not.toBeNull();
  });

  it("FR-44: uten huskeregel vises bare punktene", () => {
    const { container } = render(<ModelCardBack card={{ ...CARD, mnemonic: null }} />);
    expect(container.querySelector("[data-slot='note-surface']")).toBeNull();
    expect(container.querySelectorAll("ol > li")).toHaveLength(4);
  });

  it("UX-DR28: teksten vises som tekst, aldri som HTML", () => {
    const { container } = render(<ModelCardBack card={{ ...CARD, points: ["<b>Fet</b>"], mnemonic: "<i>x</i>" }} />);
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("i")).toBeNull();
  });
});
