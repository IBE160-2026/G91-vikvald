// What the session panel says, per practice type. The panel and the answer
// grid are shared; quiz and free text (epics 4 and 8) get their own adapter.

import type { Mark } from "./types";

// A legend row: the cell it shows (a mark, or an empty cell) and its text.
export type LegendItem = { cell: Mark | "unseen"; text: string };

export type PracticeAdapter = {
  // The panel's h1: «Flashcards».
  kindLabel: string;
  // The line under the progress bar: «Kunne 5 · Kunne ikke 1».
  countsText: (counts: { correct: number; wrong: number }) => string;
  // The legend while practising, when finished, and when ended early (story 3.5).
  legend: { inProgress: LegendItem[]; finished: LegendItem[]; aborted: LegendItem[] };
  // The hidden text per cell after «Kort 4: »: «kunne», «kunne ikke», «ikke vist ennå».
  cellText: (cell: Mark | "unseen") => string;
};

const CELL_TEXT: Record<Mark | "unseen", string> = {
  known: "kunne",
  missed: "kunne ikke",
  unseen: "ikke vist ennå",
};

export const flashcardAdapter: PracticeAdapter = {
  kindLabel: "Flashcards",
  countsText: ({ correct, wrong }) => `Kunne ${correct} · Kunne ikke ${wrong}`,
  legend: {
    inProgress: [
      { cell: "known", text: "Kunne" },
      { cell: "missed", text: "Kunne ikke, kommer igjen" },
      { cell: "unseen", text: "Ikke vist ennå" },
    ],
    finished: [
      { cell: "known", text: "Kunne" },
      { cell: "missed", text: "Kunne ikke, repetert" },
    ],
    aborted: [
      { cell: "known", text: "Kunne" },
      { cell: "missed", text: "Kunne ikke" },
      { cell: "unseen", text: "Ikke vist ennå" },
    ],
  },
  cellText: (cell) => CELL_TEXT[cell],
};
