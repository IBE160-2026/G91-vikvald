// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PasswordField } from "./password-field";

afterEach(cleanup);

describe("PasswordField", () => {
  it("UX-DR5: passordet er skjult, og «Vis» er ikke trykket", () => {
    render(<PasswordField label="Passord" />);
    expect(screen.getByLabelText("Passord").getAttribute("type")).toBe("password");
    expect(screen.getByRole("button", { name: "Vis" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("UX-DR5: «Vis» viser passordet og setter aria-pressed, og skjuler det igjen", () => {
    render(<PasswordField label="Passord" />);
    const toggle = screen.getByRole("button", { name: "Vis" });

    fireEvent.click(toggle);
    expect(screen.getByLabelText("Passord").getAttribute("type")).toBe("text");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(toggle);
    expect(screen.getByLabelText("Passord").getAttribute("type")).toBe("password");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
  });

  it("UX-DR5: «Vis» sender ikke skjemaet og kommer etter feltet i tabrekkefølgen", () => {
    render(
      <form>
        <PasswordField label="Passord" />
      </form>,
    );
    const toggle = screen.getByRole("button", { name: "Vis" });
    expect(toggle.getAttribute("type")).toBe("button");
    const input = screen.getByLabelText("Passord");
    expect(input.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("UX-DR5: «Vis» er en tekstknapp med meta-strong", () => {
    render(<PasswordField label="Passord" />);
    const classes = screen.getByRole("button", { name: "Vis" }).classList;
    for (const name of ["text-meta-strong", "gap-1", "text-brand", "h-button-height"]) {
      expect(classes).toContain(name);
    }
    expect(classes).not.toContain("text-label");
    expect(classes).not.toContain("gap-2");
  });

  it("NFR-11: feilmeldingen vises under passordfeltet", () => {
    render(<PasswordField label="Passord" error="Passordet må ha minst 8 tegn." />);
    const input = screen.getByLabelText("Passord");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(input.getAttribute("aria-describedby")!)?.textContent).toBe(
      "Passordet må ha minst 8 tegn.",
    );
  });
});
