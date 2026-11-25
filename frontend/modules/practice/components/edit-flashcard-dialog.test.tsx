// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FALLBACK_MESSAGE } from "@/lib/messages";

import type { Flashcard, ModelCard } from "../types";
import { EditFlashcardDialog, POINTS_REQUIRED } from "./edit-flashcard-dialog";

const CARD: Flashcard = {
  id: "c1",
  kind: "qa",
  front: "Hva er en merkevare?",
  back: "Et navn som skiller et produkt fra andre.",
  formula_flag: false,
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

const MODEL: ModelCard = {
  id: "m1",
  kind: "model",
  front: "Forklar AIDA-modellen.",
  back: null,
  points: ["Attention", "Interest", "Desire", "Action"],
  mnemonic: "AIDA",
  formula_flag: false,
  source: { file_id: "f1", file_name: "merkevare-notater.pdf", page_no: 9 },
};

function Harness({ onSaved, card = CARD }: { onSaved: (card: Flashcard) => void; card?: Flashcard }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Rediger
      </button>
      <EditFlashcardDialog open={open} card={card} onClose={() => setOpen(false)} onSaved={onSaved} />
    </>
  );
}

function setup(card: Flashcard = CARD) {
  const onSaved = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Harness onSaved={onSaved} card={card} />
    </QueryClientProvider>,
  );
  const opener = screen.getByRole("button", { name: "Rediger" });
  opener.focus();
  fireEvent.click(opener);
  const front = screen.getByLabelText("Spørsmål") as HTMLTextAreaElement;
  const back = screen.getByLabelText(card.kind === "model" ? "Punkter" : "Svar") as HTMLTextAreaElement;
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

  it("SK-6: feilen på et felt forsvinner når hun skriver i det, men ikke på det andre", () => {
    const { front, back } = setup();
    fireEvent.change(front, { target: { value: "" } });
    fireEvent.change(back, { target: { value: "" } });
    save();
    fireEvent.change(front, { target: { value: "N" } });
    expect(front.getAttribute("aria-invalid")).toBeNull();
    expect(front.getAttribute("aria-describedby")).toBeNull();
    expect(screen.queryByText("Skriv inn spørsmålet.")).toBeNull();
    expect(back.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Skriv inn svaret.")).toBeTruthy();
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

  describe("modellkort (story 7.2)", () => {
    it("FR-42, FR-27: «Punkter» har ett punkt per linje, og «Lagre» sender front og punktene", async () => {
      const saved = { ...MODEL, points: ["Attention", "Interest"] };
      fetchMock.mockResolvedValue(jsonResponse(200, saved));
      const { onSaved, back } = setup(MODEL);
      expect(screen.queryByLabelText("Svar")).toBeNull();
      expect(back.value).toBe("Attention\nInterest\nDesire\nAction");
      fireEvent.change(back, { target: { value: "Attention\n\n Interest " } });
      save();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
        front: MODEL.front,
        points: ["Attention", "", " Interest "],
      });
      expect(onSaved).toHaveBeenCalledWith(saved);
    });

    it("FR-42: uten punkter lagres ingenting, og feltet sier «Skriv inn minst ett punkt.»", async () => {
      const { back } = setup(MODEL);
      fireEvent.change(back, { target: { value: " \n \n" } });
      save();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(back.getAttribute("aria-invalid")).toBe("true");
      expect(screen.getByText(POINTS_REQUIRED)).toBeTruthy();
      expect(document.activeElement).toBe(back);
    });

    it("FR-42: FLASHCARD_BACK_REQUIRED fra API-et vises på «Punkter»", async () => {
      fetchMock.mockResolvedValue(errorResponse(422, "FLASHCARD_BACK_REQUIRED"));
      const { back } = setup(MODEL);
      save();
      expect(await screen.findByText(POINTS_REQUIRED)).toBeTruthy();
      expect(back.getAttribute("aria-invalid")).toBe("true");
    });
  });
});
