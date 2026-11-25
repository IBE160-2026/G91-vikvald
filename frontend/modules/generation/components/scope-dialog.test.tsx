// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ScopedJobKind } from "../types";
import { ScopeDialog } from "./scope-dialog";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ demo_mode: true, feature_mnemonics: true, feature_freetext: true, feature_summary: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderDialog(onStart = vi.fn(), onClose = vi.fn(), open = true, kind: ScopedJobKind = "flashcards", contentCount = 0) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = (isOpen: boolean) => (
    <QueryClientProvider client={client}>
      <ScopeDialog
        kind={kind}
        open={isOpen}
        onClose={onClose}
        onStart={onStart}
        lectureName="Uke 37: Merkevare"
        fileCount={1}
        pageCount={1}
        contentCount={contentCount}
      />
    </QueryClientProvider>
  );
  const result = render(view(open));
  return { onStart, onClose, reopen: (isOpen: boolean) => result.rerender(view(isOpen)) };
}

describe("ScopeDialog", () => {
  it("UX-DR24: entall for én fil og én side, og ingen linje om kort fra før", () => {
    renderDialog();
    const dialog = screen.getByRole("dialog", { name: "Lag flashcards" });
    expect(within(dialog).getByText("Uke 37: Merkevare · 1 fil, 1 side")).toBeTruthy();
    expect(within(dialog).queryByText(/fra før/)).toBeNull();
  });

  it("UX-DR24: piltastene flytter valget, og «Lag flashcards» starter med det valgte omfanget", async () => {
    const { onStart } = renderDialog();
    const dialog = screen.getByRole("dialog", { name: "Lag flashcards" });
    const usual = within(dialog).getByRole("radio", { name: "Vanlig" });
    await waitFor(() => expect(document.activeElement).toBe(usual));
    fireEvent.keyDown(usual, { key: "ArrowRight" });
    const deep = within(dialog).getByRole("radio", { name: "Dyp" });
    await waitFor(() => expect(deep.getAttribute("aria-checked")).toBe("true"));
    expect(document.activeElement).toBe(deep);
    fireEvent.click(within(dialog).getByRole("button", { name: "Lag flashcards" }));
    expect(onStart).toHaveBeenCalledWith(30);
  });

  it("FR-17: «Vanlig» er valgt igjen neste gang dialogen åpnes", async () => {
    const { onStart, reopen } = renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "Rask" }));
    reopen(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    reopen(true);
    const dialog = await screen.findByRole("dialog", { name: "Lag flashcards" });
    expect(within(dialog).getByRole("radio", { name: "Vanlig" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(within(dialog).getByRole("button", { name: "Lag flashcards" }));
    expect(onStart).toHaveBeenCalledWith(20);
  });

  it("UX-DR21: «Avbryt» lukker uten å starte", () => {
    const { onStart, onClose } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onStart).not.toHaveBeenCalled();
  });

  it("FR-17: «Lag flashcards» har ingen vanskelighetsgrad og starter uten den", () => {
    const { onStart } = renderDialog();
    const dialog = screen.getByRole("dialog", { name: "Lag flashcards" });
    expect(within(dialog).queryByRole("radiogroup", { name: "Vanskelighetsgrad" })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Lag flashcards" }));
    expect(onStart).toHaveBeenCalledWith(20);
    expect(onStart.mock.calls[0]).toHaveLength(1);
  });
});

describe("ScopeDialog for quiz", () => {
  it("FR-29, UX-DR24: «Lag quiz» har omfang i spørsmål og tre vanskelighetsrader, med «Vanlig» og «Middels» valgt", () => {
    renderDialog(vi.fn(), vi.fn(), true, "quiz", 15);
    const dialog = screen.getByRole("dialog", { name: "Lag quiz" });
    expect(within(dialog).getByText("Nye spørsmål legges til de 15 du har fra før.")).toBeTruthy();
    for (const scope of [10, 20, 30]) expect(within(dialog).getByText(`Inntil ${scope} spørsmål`)).toBeTruthy();
    const scope = within(dialog).getByRole("radiogroup", { name: "Omfang" });
    expect(within(scope).getByRole("radio", { name: "Vanlig" }).getAttribute("aria-checked")).toBe("true");
    const difficulty = within(dialog).getByRole("radiogroup", { name: "Vanskelighetsgrad" });
    const rows = within(difficulty).getAllByRole("radio");
    expect(rows.map((radio) => document.getElementById(radio.getAttribute("aria-labelledby")!)!.textContent)).toEqual([
      "Lett",
      "Middels",
      "Vanskelig",
    ]);
    expect(rows.map((radio) => document.getElementById(radio.getAttribute("aria-describedby")!)!.textContent)).toEqual([
      "Kjenne igjen en definisjon",
      "Forstå sammenhenger",
      "Bruke stoffet på et eksempel",
    ]);
    expect(within(difficulty).getByRole("radio", { name: "Middels" }).getAttribute("aria-checked")).toBe("true");
    expect(difficulty.className).toContain("grid-cols-1");
    expect(difficulty.className).not.toContain("grid-cols-3");
    const buttons = within(dialog).getAllByRole("button").map((button) => button.textContent);
    expect(buttons.slice(-2)).toEqual(["Avbryt", "Lag quiz"]);
  });

  it("FR-29: piltastene flytter bare innen gruppen, og «Lag quiz» starter med omfang og vanskelighetsgrad", async () => {
    const { onStart } = renderDialog(vi.fn(), vi.fn(), true, "quiz");
    const dialog = screen.getByRole("dialog", { name: "Lag quiz" });
    const medium = within(dialog).getByRole("radio", { name: "Middels" });
    medium.focus();
    fireEvent.keyDown(medium, { key: "ArrowDown" });
    const hard = within(dialog).getByRole("radio", { name: "Vanskelig" });
    await waitFor(() => expect(hard.getAttribute("aria-checked")).toBe("true"));
    expect(document.activeElement).toBe(hard);
    // The scope did not change.
    expect(within(dialog).getByRole("radio", { name: "Vanlig" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(within(dialog).getByRole("button", { name: "Lag quiz" }));
    expect(onStart).toHaveBeenCalledWith(20, "hard");
  });

  it("FR-29: «Middels» er valgt igjen neste gang dialogen åpnes", async () => {
    const onStart = vi.fn();
    const { reopen } = renderDialog(onStart, vi.fn(), true, "quiz");
    fireEvent.click(screen.getByRole("radio", { name: "Lett" }));
    fireEvent.click(screen.getByRole("radio", { name: "Dyp" }));
    reopen(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    reopen(true);
    const dialog = await screen.findByRole("dialog", { name: "Lag quiz" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Lag quiz" }));
    expect(onStart).toHaveBeenCalledWith(20, "medium");
  });
});
