// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { SHORTCUTS_KEY } from "@/lib/practice-shortcuts";

import { ShortcutsDialog } from "./shortcuts-dialog";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <main>
        <button type="button" onClick={() => setOpen(true)}>
          Åpne
        </button>
      </main>
      <ShortcutsDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function openDialog() {
  render(<Harness />);
  const opener = screen.getByRole("button", { name: "Åpne" });
  opener.focus();
  fireEvent.click(opener);
  return { opener, dialog: screen.getByRole("dialog", { name: "Hurtigtaster" }) };
}

describe("ShortcutsDialog", () => {
  it("UX-DR26, UX-DR35, FR-35: tabellen med Tast og Handling viser tastene for øving, quiz, fritekst, resultat og dialoger (FR-51)", () => {
    const { dialog } = openDialog();
    const table = within(dialog).getByRole("table");
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["Tast", "Handling"]);
    const rows = within(table)
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.textContent);
    expect(rows).toEqual([
      "Øving",
      "?Åpner hurtigtastdialogen",
      "MellomromSnu kortet",
      "1Kunne ikke",
      "2Kunne",
      "EscAvslutt økten",
      "Quiz",
      "A–DVelg svar",
      "EnterBekreft svar, deretter neste spørsmål",
      "EscAvslutt økten",
      "Fritekst",
      "1Feil",
      "2Delvis riktig",
      "3Riktig",
      "EscAvslutt økten",
      "Resultat",
      "EnterØv igjen / Ta quizen igjen",
      "EscTilbake",
      "Dialoger",
      "EscLukk uten endring",
    ]);
    expect(dialog.querySelectorAll("kbd")).toHaveLength(15);
    // No main action: only «Lukk».
    expect(within(dialog).queryByRole("button", { name: "Avbryt" })).toBeNull();
    expect(within(dialog).getAllByRole("button", { name: "Lukk" })).toHaveLength(2);
  });

  it("UX-DR26: bryteren «Bruk hurtigtaster» er på som standard, får fokus først, og valget lagres", () => {
    const { dialog } = openDialog();
    const toggle = within(dialog).getByRole("switch", { name: "Bruk hurtigtaster" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(toggle);
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(window.localStorage.getItem(SHORTCUTS_KEY)).toBe("off");
    fireEvent.click(toggle);
    expect(window.localStorage.getItem(SHORTCUTS_KEY)).toBeNull();
  });

  it("UX-DR26: bryteren står av når den er skrudd av fra før", () => {
    window.localStorage.setItem(SHORTCUTS_KEY, "off");
    const { dialog } = openDialog();
    expect(within(dialog).getByRole("switch", { name: "Bruk hurtigtaster" }).getAttribute("aria-checked")).toBe("false");
  });

  it("UX-DR26: Esc lukker, og fokus går tilbake dit det var", async () => {
    const { opener, dialog } = openDialog();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });
});
