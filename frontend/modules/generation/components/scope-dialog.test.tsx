// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

function renderDialog(onStart = vi.fn(), onClose = vi.fn(), open = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = (isOpen: boolean) => (
    <QueryClientProvider client={client}>
      <ScopeDialog
        open={isOpen}
        onClose={onClose}
        onStart={onStart}
        lectureName="Uke 37: Merkevare"
        fileCount={1}
        pageCount={1}
        cardCount={0}
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
});
