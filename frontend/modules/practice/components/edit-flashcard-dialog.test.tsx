// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FALLBACK_MESSAGE } from "@/lib/messages";

import type { Flashcard } from "../types";
import { EditFlashcardDialog } from "./edit-flashcard-dialog";

const CARD: Flashcard = {
  id: "c1",
  kind: "qa",
  front: "Hva er en merkevare?",
  back: "Et navn som skiller et produkt fra andre.",
  source: { file_id: "f1", file_name: "merkevare-notater.pdf", page_no: 4 },
};

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function errorResponse(status: number, code: string): Response {
  return jsonResponse(status, { error: { code, details: {} } });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Harness({ onSaved }: { onSaved: (card: Flashcard) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Rediger
      </button>
      <EditFlashcardDialog open={open} card={CARD} onClose={() => setOpen(false)} onSaved={onSaved} />
    </>
  );
}

function setup() {
  const onSaved = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Harness onSaved={onSaved} />
    </QueryClientProvider>,
  );
  const opener = screen.getByRole("button", { name: "Rediger" });
  opener.focus();
  fireEvent.click(opener);
  const front = screen.getByLabelText("Spørsmål") as HTMLTextAreaElement;
  const back = screen.getByLabelText("Svar") as HTMLTextAreaElement;
  return { onSaved, opener, front, back };
}

function save() {
  fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
}

describe("EditFlashcardDialog", () => {
  it("FR-27: tittel, to tekstområder med synlige etiketter fylt ut med kortet, og fokus i «Spørsmål»", () => {
    const { front, back } = setup();
    expect(screen.getByRole("dialog", { name: "Rediger kortet" })).toBeTruthy();
    expect(front.tagName).toBe("TEXTAREA");
    expect(back.tagName).toBe("TEXTAREA");
    expect(front.value).toBe(CARD.front);
    expect(back.value).toBe(CARD.back);
    expect(document.activeElement).toBe(front);
    const buttons = screen.getAllByRole("button").map((button) => button.textContent);
    expect(buttons.slice(-2)).toEqual(["Avbryt", "Lagre"]);
  });

  it("FR-27: «Lagre» sender PATCH, gir kortet videre, lukker dialogen og gir fokus tilbake til «Rediger»", async () => {
    const saved = { ...CARD, back: "Nytt svar" };
    fetchMock.mockResolvedValue(jsonResponse(200, saved));
    const { onSaved, opener, back } = setup();
    fireEvent.change(back, { target: { value: "Nytt svar " } });
    save();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onSaved).toHaveBeenCalledWith(saved);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/flashcards/c1");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({ front: CARD.front, back: "Nytt svar " });
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("SK-6, UX-DR22: tomt spørsmål sjekkes før kallet: rød kant, feilteksten koblet til feltet og fokus", () => {
    const { front, back } = setup();
    fireEvent.change(front, { target: { value: "   " } });
    fireEvent.change(back, { target: { value: "" } });
    save();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(front.getAttribute("aria-invalid")).toBe("true");
    expect(front.className).toContain("aria-invalid:border-danger");
    const frontError = document.getElementById(front.getAttribute("aria-describedby")!)!;
    expect(frontError.textContent).toBe("Skriv inn spørsmålet.");
    const backError = document.getElementById(back.getAttribute("aria-describedby")!)!;
    expect(backError.textContent).toBe("Skriv inn svaret.");
    // Focus on the first field with an error.
    expect(document.activeElement).toBe(front);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("SK-6: tomt svar alene gir fokus i «Svar»", () => {
    const { front, back } = setup();
    fireEvent.change(back, { target: { value: "\n  " } });
    save();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(front.getAttribute("aria-invalid")).toBeNull();
    expect(back.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(back);
  });

  it("SK-6: koden fra API-et vises på riktig felt", async () => {
    fetchMock.mockResolvedValue(errorResponse(422, "FLASHCARD_BACK_REQUIRED"));
    const { back } = setup();
    save();
    expect(await screen.findByText("Skriv inn svaret.")).toBeTruthy();
    expect(back.getAttribute("aria-invalid")).toBe("true");
    await waitFor(() => expect(document.activeElement).toBe(back));
  });

  it("FR-27: andre feil (også 404) viser reserveteksten i role=alert, og dialogen står", async () => {
    fetchMock.mockResolvedValue(errorResponse(404, "NOT_FOUND"));
    const { onSaved } = setup();
    save();
    expect((await screen.findByRole("alert")).textContent).toBe(FALLBACK_MESSAGE);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("UX-DR27: Esc og «Avbryt» lukker uten endring, og neste åpning starter fra kortet", async () => {
    const { onSaved, opener, front } = setup();
    fireEvent.change(front, { target: { value: "Noe annet" } });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(opener);
    expect((screen.getByLabelText("Spørsmål") as HTMLTextAreaElement).value).toBe(CARD.front);
    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
