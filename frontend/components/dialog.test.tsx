// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Dialog, type DialogWidth } from "./dialog";

afterEach(cleanup);

// Radix gives focus back to the opener in a setTimeout(0), so the tests wait for it.
async function expectFocusBackOn(opener: HTMLElement) {
  await waitFor(() => expect(document.activeElement).toBe(opener));
}

function Harness({
  onPrimary = () => {},
  width,
  withField = false,
  variant = "danger",
}: {
  onPrimary?: () => void;
  width?: DialogWidth;
  withField?: boolean;
  variant?: "primary" | "danger";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <main>
        <button type="button" onClick={() => setOpen(true)}>
          Åpne
        </button>
      </main>
      <Dialog
        open={open}
        title="Slette fila?"
        width={width}
        onClose={() => setOpen(false)}
        primaryAction={{ label: "Slett fila", variant, onClick: onPrimary }}
      >
        {withField ? <input aria-label="Navn" /> : <p>Fila slettes for godt.</p>}
      </Dialog>
    </>
  );
}

function openDialog(props: Parameters<typeof Harness>[0] = {}) {
  render(<Harness {...props} />);
  const opener = screen.getByRole("button", { name: "Åpne" });
  opener.focus();
  fireEvent.click(opener);
  return { opener, dialog: screen.getByRole("dialog") };
}

describe("Dialog", () => {
  it("UX-DR21: er en modal dialog med navn fra tittelen, over sløret", () => {
    const { dialog } = openDialog();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const title = document.getElementById(dialog.getAttribute("aria-labelledby") ?? "");
    expect(title?.textContent).toBe("Slette fila?");
    expect(dialog.className).toContain("rounded-xl");
    expect(dialog.className).toContain("shadow-float");
    expect(dialog.className).toContain("border-border-card");
    expect(dialog.parentElement?.className).toContain("bg-scrim-veil");
  });

  it("UX-DR21: lukkekrysset heter «Lukk», og knappene står «Avbryt» før hovedhandlingen", () => {
    const { dialog } = openDialog();
    const buttons = [...dialog.querySelectorAll("button")].map(
      (b) => b.getAttribute("aria-label") ?? b.textContent,
    );
    expect(buttons).toEqual(["Lukk", "Avbryt", "Slett fila"]);
  });

  it("UX-DR21: fokus går inn i dialogen når den åpnes", () => {
    openDialog();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Avbryt" }));
    cleanup();
    // Other dialogs (not delete): the first field gets focus.
    openDialog({ withField: true, variant: "primary" });
    expect(document.activeElement).toBe(screen.getByLabelText("Navn"));
  });

  it("UX-DR21: Tab og Shift+Tab holder fokus inne i dialogen", () => {
    const { dialog } = openDialog();
    const close = screen.getByRole("button", { name: "Lukk" });
    const primary = screen.getByRole("button", { name: "Slett fila" });
    primary.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(primary);
  });

  it("UX-DR21: Esc lukker uten å kalle hovedhandlingen, og fokus går tilbake til åpneren", async () => {
    const onPrimary = vi.fn();
    const { opener, dialog } = openDialog({ onPrimary });
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onPrimary).not.toHaveBeenCalled();
    await expectFocusBackOn(opener);
  });

  it("UX-DR21: «Avbryt» og «Lukk» lukker, og hovedhandlingen kalles bare av sin knapp", async () => {
    const onPrimary = vi.fn();
    const { opener } = openDialog({ onPrimary });
    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    await expectFocusBackOn(opener);
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole("button", { name: "Lukk" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    await expectFocusBackOn(opener);
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole("button", { name: "Slett fila" }));
    expect(onPrimary).toHaveBeenCalledTimes(1);
  });

  it("UX-DR41: med fokus på body (etter klikk på sløret) lukker Esc, og Tab går inn i dialogen", async () => {
    const onPrimary = vi.fn();
    const { opener } = openDialog({ onPrimary });
    (document.activeElement as HTMLElement).blur();
    expect(document.activeElement).toBe(document.body);

    fireEvent.keyDown(document.body, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Lukk" }));
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(document.body, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Slett fila" }));

    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onPrimary).not.toHaveBeenCalled();
    await expectFocusBackOn(opener);
  });

  it("#68: resten av siden er inert og skjult for skjermleser mens dialogen er åpen, og ikke etterpå", async () => {
    const { opener, dialog } = openDialog();
    const main = opener.closest("main")!;
    // The page's root element (around <main>) gets the attributes.
    await waitFor(() => expect(main.closest("[inert]")).not.toBeNull());
    expect(main.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(dialog.closest("[inert]")).toBeNull();
    expect(dialog.closest("[aria-hidden]")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));
    expect(main.closest("[inert]")).toBeNull();
    await waitFor(() => expect(main.closest("[aria-hidden]")).toBeNull());
    await expectFocusBackOn(opener);
  });

  it("#68: siden bak kan ikke rulles mens dialogen er åpen", () => {
    openDialog();
    expect(document.body.hasAttribute("data-scroll-locked")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));
    expect(document.body.hasAttribute("data-scroll-locked")).toBe(false);
  });

  it("UX-DR21: klikk på sløret lukker ikke dialogen", async () => {
    const { dialog } = openDialog();
    const scrim = dialog.parentElement!;
    // Radix starts listening for clicks outside in a setTimeout(0), after the opening click.
    await new Promise((resolve) => setTimeout(resolve, 0));
    fireEvent.pointerDown(scrim);
    fireEvent.pointerUp(scrim);
    fireEvent.click(scrim);
    expect(screen.queryByRole("dialog")).not.toBeNull();
  });

  it.each([
    [undefined, "w-[560px]"],
    [560, "w-[560px]"],
    [640, "w-[640px]"],
    [720, "w-[720px]"],
  ] as const)("UX-DR21: bredde %s gir %s", (width, expected) => {
    const { dialog } = openDialog({ width });
    expect(dialog.className).toContain(expected);
  });

  it("UX-DR23: hovedknappen kan være deaktivert og ha et ikon, og kalles da ikke", () => {
    const onPrimary = vi.fn();
    function Disabled({ disabled }: { disabled: boolean }) {
      return (
        <Dialog
          open
          title="Før du laster opp"
          onClose={() => {}}
          primaryAction={{
            label: "Godta og last opp",
            onClick: onPrimary,
            disabled,
            icon: <svg data-testid="ikon" aria-hidden="true" />,
          }}
        >
          <p>Tekst</p>
        </Dialog>
      );
    }
    const { rerender } = render(<Disabled disabled />);
    const primary = screen.getByRole("button", { name: "Godta og last opp" }) as HTMLButtonElement;
    expect(primary.disabled).toBe(true);
    expect(primary.querySelector('[data-testid="ikon"]')).not.toBeNull();
    fireEvent.click(primary);
    expect(onPrimary).not.toHaveBeenCalled();
    rerender(<Disabled disabled={false} />);
    expect(primary.disabled).toBe(false);
    fireEvent.click(primary);
    expect(onPrimary).toHaveBeenCalledTimes(1);
  });

  it("UX-DR21: hovedknappen er aktiv og uten ikon når ingenting er satt (de andre dialogene)", () => {
    openDialog();
    const primary = screen.getByRole("button", { name: "Slett fila" }) as HTMLButtonElement;
    expect(primary.disabled).toBe(false);
    expect(primary.querySelector("svg")).toBeNull();
  });
  it("UX-DR21: en slettedialog starter alltid på «Avbryt», også med en knapp i innholdet", () => {
    render(
      <Dialog
        open
        title="Slette fila?"
        onClose={() => {}}
        primaryAction={{ label: "Slett fila", variant: "danger", onClick: () => {} }}
      >
        <button type="button">Noe i innholdet</button>
      </Dialog>,
    );
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Avbryt" }));
  });

  it("#75: returnFocus bestemmer hvor fokus går når den gir et element, ellers åpneren", async () => {
    function WithReturn({ target }: { target: "heading" | "none" }) {
      const [open, setOpen] = useState(false);
      return (
        <>
          <h2 id="maal" tabIndex={-1}>
            Filer
          </h2>
          <button type="button" onClick={() => setOpen(true)}>
            Åpne
          </button>
          <Dialog
            open={open}
            title="Slette fila?"
            onClose={() => setOpen(false)}
            returnFocus={() => (target === "heading" ? document.getElementById("maal") : null)}
            primaryAction={{ label: "Slett fila", variant: "danger", onClick: () => {} }}
          >
            <p>Tekst</p>
          </Dialog>
        </>
      );
    }
    const { rerender } = render(<WithReturn target="heading" />);
    const opener = screen.getByRole("button", { name: "Åpne" });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Filer" })));

    rerender(<WithReturn target="none" />);
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));
    await expectFocusBackOn(opener);
  });

  it("UX-DR21: mens «Avbryt» er av, er krysset også av; etterpå får «Avbryt» fokus hvis fokus falt ut", () => {
    function Busy({ busy }: { busy: boolean }) {
      return (
        <Dialog
          open
          title="Slette fila?"
          onClose={() => {}}
          cancelDisabled={busy}
          primaryAction={{ label: "Slett fila", variant: "danger", disabled: busy, onClick: () => {} }}
        >
          <p>Tekst</p>
        </Dialog>
      );
    }
    const { rerender } = render(<Busy busy={false} />);
    rerender(<Busy busy />);
    expect((screen.getByRole("button", { name: "Lukk" }) as HTMLButtonElement).disabled).toBe(true);
    // In a browser, the focused danger button lost focus to body when it was
    // disabled. jsdom keeps focus on it (and Radix pulls a blur back), so body
    // is simulated here.
    const cancel = screen.getByRole("button", { name: "Avbryt" });
    const focusCancel = vi.spyOn(cancel, "focus");
    Object.defineProperty(document, "activeElement", { configurable: true, get: () => document.body });
    try {
      rerender(<Busy busy={false} />);
    } finally {
      delete (document as unknown as { activeElement?: unknown }).activeElement;
    }
    expect((screen.getByRole("button", { name: "Lukk" }) as HTMLButtonElement).disabled).toBe(false);
    expect(focusCancel).toHaveBeenCalled();
  });

  it("UX-DR21: «Avbryt» kan være deaktivert", () => {
    const onClose = vi.fn();
    render(
      <Dialog
        open
        title="Slette fila?"
        onClose={onClose}
        cancelDisabled
        primaryAction={{ label: "Slett fila", variant: "danger", onClick: () => {} }}
      >
        <p>Tekst</p>
      </Dialog>,
    );
    const cancel = screen.getByRole("button", { name: "Avbryt" }) as HTMLButtonElement;
    expect(cancel.disabled).toBe(true);
    fireEvent.click(cancel);
    expect(onClose).not.toHaveBeenCalled();
  });

  describe("uten hovedhandling", () => {
    function ShowOnly() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Les vilkårene
          </button>
          <Dialog open={open} title="Vilkår og personvern" width={640} onClose={() => setOpen(false)}>
            <p>Vilkårsteksten.</p>
          </Dialog>
        </>
      );
    }

    function openShowOnly() {
      render(<ShowOnly />);
      const opener = screen.getByRole("button", { name: "Les vilkårene" });
      opener.focus();
      fireEvent.click(opener);
      const dialog = screen.getByRole("dialog");
      const buttons = [...dialog.querySelectorAll("button")];
      return { opener, dialog, cross: buttons[0], footer: buttons[1] };
    }

    it("UX-DR39: foten har bare én omrissknapp «Lukk», og den har startfokus", () => {
      const { dialog, footer } = openShowOnly();
      const labels = [...dialog.querySelectorAll("button")].map((b) => b.getAttribute("aria-label") ?? b.textContent);
      expect(labels).toEqual(["Lukk", "Lukk"]);
      expect(screen.queryByRole("button", { name: "Avbryt" })).toBeNull();
      expect(footer.getAttribute("data-variant") ?? footer.className).toMatch(/outline/);
      expect(document.activeElement).toBe(footer);
      expect(dialog.className).toContain("w-[640px]");
    });

    it("UX-DR39: «Lukk», krysset og Esc lukker, og fokus går tilbake til åpneren", async () => {
      const first = openShowOnly();
      fireEvent.click(first.footer);
      expect(screen.queryByRole("dialog")).toBeNull();
      await expectFocusBackOn(first.opener);

      fireEvent.click(first.opener);
      fireEvent.click(screen.getAllByRole("button", { name: "Lukk" })[0]);
      expect(screen.queryByRole("dialog")).toBeNull();
      await expectFocusBackOn(first.opener);

      fireEvent.click(first.opener);
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
      await expectFocusBackOn(first.opener);
    });
  });
});
