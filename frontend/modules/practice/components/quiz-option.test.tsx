// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { afterEach, describe, expect, it } from "vitest";

import { QuizOption, type QuizOptionResult } from "./quiz-option";

afterEach(cleanup);

function renderOptions(value: string, results: QuizOptionResult[], disabled = false) {
  render(
    <RadioGroupPrimitive.Root aria-label="Hva er Merkevare?" value={value} disabled={disabled}>
      {["Et navn", "En pris", "En kanal", "Et segment"].map((text, index) => (
        <QuizOption key={text} value={String(index)} letter={"ABCD"[index]} text={text} result={results[index]} />
      ))}
    </RadioGroupPrimitive.Root>,
  );
  return screen.getAllByRole("radio");
}

describe("QuizOption", () => {
  it("UX-DR8: 62 px rad med bokstavboks og tekst; valgt men ikke bekreftet har merketone og 1,5 px brand-kant", () => {
    const options = renderOptions("2", [null, null, null, null]);
    expect(options.map((option) => option.textContent)).toEqual(["A Et navn ", "B En pris ", "C En kanal ", "D Et segment "]);
    for (const option of options) {
      expect(option.className).toContain("min-h-[62px]");
      expect(option.className).toContain("rounded-option");
      expect(option.className).toContain("border-border-control");
      expect(option.className).toContain("data-[state=checked]:bg-brand-tint");
      expect(option.className).toContain("data-[state=checked]:border-brand");
    }
    expect(options[2].getAttribute("aria-checked")).toBe("true");
  });

  it("SK-5: før bekreftelse finnes ingen riktig/feil-farge eller markering i DOM-en", () => {
    const options = renderOptions("1", [null, null, null, null]);
    for (const option of options) {
      expect(option.getAttribute("data-result")).toBeNull();
      expect(option.className).not.toContain("success");
      expect(option.className).not.toContain("danger");
    }
    expect(screen.queryByText(/Riktig svar|Ditt svar/)).toBeNull();
  });

  it("FR-35, NFR-10: etter bekreftelse har riktig «✓ Riktig svar» og feil valgt «✗ Ditt svar», med symbolene skjult", () => {
    const options = renderOptions("2", ["correct", null, "wrong", null], true);
    expect(options[0].className).toContain("bg-success-tint");
    expect(options[0].querySelector(".font-semibold")!.textContent).toBe("Et navn");
    expect(options[0].className).toContain("border-success");
    expect(options[0].className).toContain("border-[1.5px]");
    expect(options[2].className).toContain("bg-danger-tint");
    expect(options[2].className).toContain("border-danger");
    expect(options[1].className).not.toMatch(/success|danger/);
    expect(options[1].getAttribute("aria-checked")).toBe("false");
    expect(options[0].textContent).toContain("✓ Riktig svar");
    expect(options[2].textContent).toContain("✗ Ditt svar");
    expect(options[0].querySelector("[aria-hidden='true']")!.textContent).toBe("✓ ");
    expect(options[2].querySelector("[aria-hidden='true']")!.textContent).toBe("✗ ");
    for (const option of options) expect((option as HTMLButtonElement).disabled).toBe(true);
  });
});
