// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChoiceOption } from "./choice-option";
import { RadioGroup } from "./ui/radio-group";

afterEach(cleanup);

function renderGroup(onValueChange = vi.fn()) {
  render(
    <RadioGroup aria-label="Omfang" defaultValue="20" onValueChange={onValueChange}>
      <ChoiceOption value="10" title="Rask" description="Inntil 10 kort" />
      <ChoiceOption value="20" title="Vanlig" description="Inntil 20 kort" />
    </RadioGroup>,
  );
  return onValueChange;
}

describe("ChoiceOption", () => {
  it("UX-DR24: hvert valgkort er en radioknapp med tittelen som navn og forklaringen som beskrivelse", () => {
    renderGroup();
    const fast = screen.getByRole("radio", { name: "Rask" });
    expect(fast.getAttribute("aria-checked")).toBe("false");
    expect(document.getElementById(fast.getAttribute("aria-describedby")!)!.textContent).toBe("Inntil 10 kort");
    expect(screen.getByRole("radio", { name: "Vanlig" }).getAttribute("aria-checked")).toBe("true");
  });

  it("UX-DR24: valgt kort har merketone og 1,5 px ultramarin kant; de andre er hvite med kontrollkant", () => {
    renderGroup();
    const card = screen.getByRole("radio", { name: "Vanlig" }).closest("label")!;
    expect(card.className).toContain("rounded-option");
    expect(card.className).toContain("border-border-control");
    expect(card.className).toContain("bg-surface");
    expect(card.className).toContain("has-[[data-state=checked]]:bg-brand-tint");
    expect(card.className).toContain("has-[[data-state=checked]]:border-[1.5px]");
    expect(card.className).toContain("has-[[data-state=checked]]:border-brand");
  });

  it("UX-DR24: et klikk på teksten i kortet velger det", () => {
    const onValueChange = renderGroup();
    fireEvent.click(screen.getByText("Inntil 10 kort"));
    expect(onValueChange).toHaveBeenCalledWith("10");
    expect(screen.getByRole("radio", { name: "Rask" }).getAttribute("aria-checked")).toBe("true");
  });
});
