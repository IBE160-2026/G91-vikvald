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
}: {
  onPrimary?: () => void;
  width?: DialogWidth;
  withField?: boolean;
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
        primaryAction={{ label: "Slett fila", variant: "danger", onClick: onPrimary }}
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
    openDialog({ withField: true });
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
});
