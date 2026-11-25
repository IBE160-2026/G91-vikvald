// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FALLBACK_MESSAGE } from "@/lib/messages";

import type { Flashcard, ModelCard } from "../types";
import { MNEMONIC_REQUIRED, MnemonicDialog } from "./mnemonic-dialog";

const CARD: ModelCard = {
  id: "m1",
  kind: "model",
  front: "Forklar AIDA-modellen.",
  back: null,
  points: ["Attention", "Interest", "Desire", "Action"],
  mnemonic: "AIDA",
  formula_flag: false,
  source: { file_id: "f1", file_name: "merkevare-notater.pdf", page_no: 9 },
};

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Harness({ card, onSaved }: { card: ModelCard; onSaved: (card: Flashcard) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Åpne
      </button>
      <MnemonicDialog open={open} card={card} onClose={() => setOpen(false)} onSaved={onSaved} />
    </>
  );
}

function setup(card: ModelCard = CARD) {
  const onSaved = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Harness card={card} onSaved={onSaved} />
    </QueryClientProvider>,
  );
  const opener = screen.getByRole("button", { name: "Åpne" });
  opener.focus();
  fireEvent.click(opener);
  const dialog = screen.getByRole("dialog");
  const field = within(dialog).getByLabelText("Huskeregel") as HTMLInputElement;
  return { onSaved, opener, dialog, field };
}

describe("MnemonicDialog", () => {
  it("UX-DR21, FR-46: «Endre huskeregel» med feltet «Huskeregel» fylt ut, fokus i feltet, og «Avbryt» før «Lagre»", () => {
    const { dialog, field } = setup();
    expect(dialog.getAttribute("aria-labelledby")).toBeTruthy();
    expect(screen.getByRole("dialog", { name: "Endre huskeregel" })).toBe(dialog);
    expect(field.value).toBe("AIDA");
    expect(document.activeElement).toBe(field);
    const buttons = within(dialog).getAllByRole("button").map((button) => button.textContent);
    expect(buttons.slice(-2)).toEqual(["Avbryt", "Lagre"]);
  });

  it("FR-46: uten huskeregel heter dialogen «Legg til huskeregel», og feltet er tomt", () => {
    const { field } = setup({ ...CARD, mnemonic: null });
    expect(screen.getByRole("dialog", { name: "Legg til huskeregel" })).toBeTruthy();
    expect(field.value).toBe("");
  });

  it("FR-46: «Lagre» sender bare huskeregelen, gir kortet videre og gir fokus tilbake", async () => {
    const saved = { ...CARD, mnemonic: "Alle I Dag Allerede" };
    fetchMock.mockResolvedValue(jsonResponse(200, saved));
    const { onSaved, opener, field } = setup();
    fireEvent.change(field, { target: { value: "Alle I Dag Allerede " } });
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/flashcards/m1");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({ mnemonic: "Alle I Dag Allerede " });
    expect(onSaved).toHaveBeenCalledWith(saved);
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("FR-46: Enter i feltet lagrer, og teksten sjekkes ikke mot forbokstavene (AR-4)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ...CARD, mnemonic: "Helt annet" }));
    const { field } = setup();
    fireEvent.change(field, { target: { value: "Helt annet" } });
    fireEvent.keyDown(field, { key: "Enter" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("E33, UX-DR25: tom huskeregel lagrer ingenting: rød kant, «Skriv inn en huskeregel.» koblet til feltet, fokus i feltet", async () => {
    const { field } = setup();
    fireEvent.change(field, { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(field.className).toContain("border-danger");
    expect(document.getElementById(field.getAttribute("aria-describedby")!)!.textContent).toBe(MNEMONIC_REQUIRED);
    await waitFor(() => expect(document.activeElement).toBe(field));
    // The error goes away when she types.
    fireEvent.change(field, { target: { value: "A" } });
    expect(field.getAttribute("aria-invalid")).toBeNull();
  });

  it("E33: FLASHCARD_BACK_REQUIRED fra API-et gir den samme teksten i feltet", async () => {
    fetchMock.mockResolvedValue(jsonResponse(422, { error: { code: "FLASHCARD_BACK_REQUIRED", details: {} } }));
    const { field } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    expect(await screen.findByText(MNEMONIC_REQUIRED)).toBeTruthy();
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("FR-46: andre feil (også 404 FEATURE_DISABLED) viser reserveteksten i role=alert, og dialogen står", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: { code: "FEATURE_DISABLED", details: {} } }));
    const { onSaved } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    expect((await screen.findByRole("alert")).textContent).toBe(FALLBACK_MESSAGE);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("UX-DR25: Esc og «Avbryt» lukker uten endring, og neste åpning starter fra kortet", () => {
    const { opener, field, dialog } = setup();
    fireEvent.change(field, { target: { value: "Noe annet" } });
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(opener);
    expect((screen.getByLabelText("Huskeregel") as HTMLInputElement).value).toBe("AIDA");
    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
