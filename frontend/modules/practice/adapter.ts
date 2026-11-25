// What the session panel says, per practice type. The panel and the answer
// grid are shared; quiz (story 4.2) and free text (epic 8) get their own adapter.

import type { Mark } from "./types";

// A legend row: the cell it shows (a mark, or an empty cell) and its text.
export type LegendItem = { cell: Mark | "unseen"; text: string };

export type PracticeAdapter = {
  // The panel's h1: «Flashcards».
  kindLabel: string;
  // The item in the grid's hidden text: «Kort» («Kort 4: kunne») or «Spørsmål».
  itemLabel: string;
  // Missed items come back at the end (flashcards): the panel then shows
  // «Repeterer: N kort igjen». False for quiz, where each question is asked once.
  repeats: boolean;
  // The line under the progress bar: «Kunne 5 · Kunne ikke 1». partial is
  // always 0 for flashcards and quiz.
  countsText: (counts: { correct: number; partial: number; wrong: number }) => string;
  // The legend while practising, when finished, and when ended early (story 3.5).
  legend: { inProgress: LegendItem[]; finished: LegendItem[]; aborted: LegendItem[] };
  // The hidden text per cell after «Kort 4: »: «kunne», «kunne ikke», «ikke vist ennå».
  cellText: (cell: Mark | "unseen") => string;
};

// "partial" is never used by flashcards or quiz, but every mark needs a text.
const CELL_TEXT: Record<Mark | "unseen", string> = {
  known: "kunne",
  partial: "delvis",
  missed: "kunne ikke",
  unseen: "ikke vist ennå",
};

export const flashcardAdapter: PracticeAdapter = {
  kindLabel: "Flashcards",
  itemLabel: "Kort",
  repeats: true,
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

const QUIZ_CELL_TEXT: Record<Mark | "unseen", string> = {
  known: "riktig",
  partial: "delvis riktig",
  missed: "feil",
  unseen: "ikke besvart ennå",
};

// Quiz (story 4.2, mockup 09): «Quiz», «3 riktige · 1 feil», and the cells read
// as «Spørsmål 4: feil». Each question is asked once, so nothing repeats.
export const quizAdapter: PracticeAdapter = {
  kindLabel: "Quiz",
  itemLabel: "Spørsmål",
  repeats: false,
  countsText: ({ correct, wrong }) => `${correct} riktige · ${wrong} feil`,
  legend: {
    inProgress: [
      { cell: "known", text: "Riktig" },
      { cell: "missed", text: "Feil" },
      { cell: "unseen", text: "Ikke besvart ennå" },
    ],
    finished: [
      { cell: "known", text: "Riktig" },
      { cell: "missed", text: "Feil" },
    ],
    aborted: [
      { cell: "known", text: "Riktig" },
      { cell: "missed", text: "Feil" },
      { cell: "unseen", text: "Ikke besvart ennå" },
    ],
  },
  cellText: (cell) => QUIZ_CELL_TEXT[cell],
};

// Free text (story 8.2, mockup 12): only the numbers that are not zero, in
// the order riktig, delvis riktig, feil («1 riktig · 1 delvis riktig»), or
// «Ingen vurdert ennå» before the first assessment.
export function freetextCountsText({ correct, partial, wrong }: { correct: number; partial: number; wrong: number }): string {
  const parts = [
    correct > 0 ? `${correct} riktig` : null,
    partial > 0 ? `${partial} delvis riktig` : null,
    wrong > 0 ? `${wrong} feil` : null,
  ].filter((part): part is string => part !== null);
  return parts.length === 0 ? "Ingen vurdert ennå" : parts.join(" · ");
}

// Free text (story 8.2, mockup 12): «Fritekst», the counts line above, and
// three marks in the grid, read as «Spørsmål 2: delvis riktig». Each question
// is shown once, so nothing repeats.
export const freetextAdapter: PracticeAdapter = {
  kindLabel: "Fritekst",
  itemLabel: "Spørsmål",
  repeats: false,
  countsText: freetextCountsText,
  legend: {
    inProgress: [
      { cell: "known", text: "Riktig" },
      { cell: "partial", text: "Delvis riktig" },
      { cell: "missed", text: "Feil" },
      { cell: "unseen", text: "Ikke besvart ennå" },
    ],
    finished: [
      { cell: "known", text: "Riktig" },
      { cell: "partial", text: "Delvis riktig" },
      { cell: "missed", text: "Feil" },
    ],
    aborted: [
      { cell: "known", text: "Riktig" },
      { cell: "partial", text: "Delvis riktig" },
      { cell: "missed", text: "Feil" },
      { cell: "unseen", text: "Ikke besvart ennå" },
    ],
  },
  cellText: (cell) => QUIZ_CELL_TEXT[cell],
};
