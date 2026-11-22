// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { QuizQuestion as QuizQuestionData } from "../types";
import { QuizQuestion, confirmedStatus } from "./quiz-question";

afterEach(cleanup);

const QUESTION: QuizQuestionData = {
  id: "q1",
  question: "Hva er Merkevare?",
  options: ["En pris", "Et navn eller symbol", "En kanal", "Et segment"],
  correct_index: 1,
  explanation: "Merkevare er et navn eller symbol.",
  source: { file_id: "f1", file_name: "merkevare-notater.pdf", page_no: 7 },
  lecture: { id: "l1", name: "Uke 37: Merkevare" },
};

// The page's part: the choice and the confirmation, so the component can be
// tested as the student uses it.
function Harness({ onNext = vi.fn(), last = false, showHints = true }: { onNext?: () => void; last?: boolean; showHints?: boolean }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  return (
    <QuizQuestion
      question={QUESTION}
      number={4}
      total={15}
      selected={selected}
      confirmed={confirmed}
      last={last}
      onSelect={setSelected}
      onConfirm={() => setConfirmed(true)}
      onNext={onNext}
      showHints={showHints}
      colorIndex={0}
    />
  );
}

function button(name: string): HTMLButtonElement {
  return screen.getByRole("button", { name }) as HTMLButtonElement;
}

describe("confirmedStatus", () => {
  it("UX-DR44: synlig «Du svarte C. Svaret er bekreftet.» og skjult riktig/feil", () => {
    expect(confirmedStatus(2, 1)).toEqual({ seen: "Du svarte C. Svaret er bekreftet.", hidden: " Feil. Riktig svar er B." });
    expect(confirmedStatus(1, 1)).toEqual({ seen: "Du svarte B. Svaret er bekreftet.", hidden: " Riktig." });
  });
});

describe("QuizQuestion", () => {
  it("FR-32, SK-5: overlinje, spørsmål som h2, radiogruppe navngitt av spørsmålet, og ingen fasit før bekreftelse", () => {
    const { container } = render(<Harness />);
    expect(screen.getByText("SPØRSMÅL 4 AV 15")).toBeTruthy();
    const heading = screen.getByRole("heading", { level: 2, name: "Hva er Merkevare?" });
    expect(heading.getAttribute("tabindex")).toBe("-1");
    expect(heading.className).toContain("text-quiz-question");
    const group = screen.getByRole("radiogroup", { name: "Hva er Merkevare?" });
    expect(within(group).getAllByRole("radio")).toHaveLength(4);
    expect(container.querySelector("[data-slot='quiz-question']")!.className).toContain("max-w-quiz-column");
    expect(container.querySelector("[data-result]")).toBeNull();
    expect(container.querySelector("[data-slot='explanation-card']")).toBeNull();
    expect(container.textContent).not.toContain("Merkevare er et navn eller symbol.");
    expect(screen.getByRole("status").textContent).toBe("");
    expect(button("Bekreft svar").disabled).toBe(true);
    expect(button("Bekreft svar").dataset.size).toBe("lg");
  });

  it("FR-35: valget kan byttes fritt før bekreftelse", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("radio", { name: /En kanal/ }));
    fireEvent.click(screen.getByRole("radio", { name: /En pris/ }));
    expect(screen.getByRole("radio", { name: /En pris/ }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: /En kanal/ }).getAttribute("aria-checked")).toBe("false");
    expect(button("Bekreft svar").disabled).toBe(false);
  });

  it("FR-35, UX-DR31, UX-DR44: bekreftet feil svar låser gruppen, viser merkene, statusen, forklaringen og gir fokus til «Neste spørsmål»", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("radio", { name: /En kanal/ }));
    fireEvent.click(button("Bekreft svar"));

    for (const radio of screen.getAllByRole("radio")) expect((radio as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("radio", { name: /Et navn eller symbol/ }).textContent).toContain("Riktig svar");
    expect(screen.getByRole("radio", { name: /En kanal/ }).textContent).toContain("Ditt svar");
    expect(screen.getByRole("radio", { name: /En pris/ }).getAttribute("data-result")).toBeNull();
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("Du svarte C. Svaret er bekreftet. Feil. Riktig svar er B.");
    expect(status.querySelector(".sr-only")!.textContent).toBe(" Feil. Riktig svar er B.");
    expect(screen.getByText("Merkevare er et navn eller symbol.")).toBeTruthy();
    expect(screen.getByText("merkevare-notater.pdf, side 7")).toBeTruthy();
    expect(screen.getByText("Uke 37: Merkevare")).toBeTruthy();
    expect(document.activeElement).toBe(button("Neste spørsmål"));
    expect(screen.queryByRole("button", { name: "Bekreft svar" })).toBeNull();
  });

  it("FR-35: Enter i radiogruppen bekrefter, men ikke en holdt Enter og ikke uten valg", () => {
    render(<Harness />);
    const first = screen.getAllByRole("radio")[0];
    fireEvent.keyDown(first, { key: "Enter" });
    expect(screen.getByRole("status").textContent).toBe("");
    fireEvent.click(screen.getByRole("radio", { name: /Et navn eller symbol/ }));
    fireEvent.keyDown(screen.getByRole("radio", { name: /Et navn eller symbol/ }), { key: "Enter", repeat: true });
    expect(screen.getByRole("status").textContent).toBe("");
    fireEvent.keyDown(screen.getByRole("radio", { name: /Et navn eller symbol/ }), { key: "Enter" });
    expect(screen.getByRole("status").textContent).toBe("Du svarte B. Svaret er bekreftet. Riktig.");
  });

  it("E26: «Neste spørsmål» ignorerer en gjentatt Enter", () => {
    const onNext = vi.fn();
    render(<Harness onNext={onNext} />);
    fireEvent.click(screen.getByRole("radio", { name: /En pris/ }));
    fireEvent.click(button("Bekreft svar"));
    const next = button("Neste spørsmål");
    const held = fireEvent.keyDown(next, { key: "Enter", repeat: true });
    expect(held).toBe(false);
    const fresh = fireEvent.keyDown(next, { key: "Enter" });
    expect(fresh).toBe(true);
    fireEvent.click(next);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("UX-DR31: hint-linja følger steget, og siste spørsmål har «Se resultatet»", () => {
    render(<Harness last />);
    const hints = () => screen.getByRole("list", { name: "Hurtigtaster" }).textContent;
    expect(hints()).toBe("A–D velg svarEnter bekreft svarEsc avslutt");
    fireEvent.click(screen.getByRole("radio", { name: /En pris/ }));
    fireEvent.click(button("Bekreft svar"));
    expect(hints()).toBe("A–D velg svarEnter se resultatetEsc avslutt");
    expect(document.activeElement).toBe(button("Se resultatet"));
  });

  it("UX-DR26: uten hurtigtaster er hint-linja borte", () => {
    render(<Harness showHints={false} />);
    expect(screen.queryByRole("list", { name: "Hurtigtaster" })).toBeNull();
  });
});
