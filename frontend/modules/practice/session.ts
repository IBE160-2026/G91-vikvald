// The practice session as pure functions (story 3.3): shuffling, the queue
// where «Kunne ikke» sends a card to the back, and everything the panel shows.
//
// The state holds only four things; the counter, the repeat line, the answer
// grid and «finished» are all derived from them, so they cannot get out of
// step. Story 3.5 reads the counts for saving straight from sessionCounts().

import type { Mark } from "./types";

export type SessionState = {
  // Every card id in the shuffled order, locked for the whole session.
  order: readonly string[];
  // The cards still to be marked «Kunne». The current card is queue[0].
  queue: readonly string[];
  // The first mark of each card; later marks never change it.
  firstMarks: Readonly<Record<string, Mark>>;
  // The different cards shown so far, in the order they were first shown.
  shown: readonly string[];
};

// Fisher-Yates: a new list in random order (the input is left as it is).
// `random` returns a number in [0, 1), like Math.random.
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// A new session over the cards in this order (shuffle them first). The first
// card is shown at once.
export function startSession(ids: readonly string[]): SessionState {
  return { order: [...ids], queue: [...ids], firstMarks: {}, shown: ids.length > 0 ? [ids[0]] : [] };
}

// Marks the current card. «Kunne» takes it out of the queue; «Kunne ikke» puts
// it last, so it comes back after the others, until it is marked «Kunne».
// Only the first mark of a card counts. A finished session is left as it is.
export function markCurrent(state: SessionState, mark: Mark): SessionState {
  const [current, ...rest] = state.queue;
  if (current === undefined) return state;
  const firstMarks = Object.hasOwn(state.firstMarks, current) ? state.firstMarks : { ...state.firstMarks, [current]: mark };
  const queue = mark === "missed" ? [...rest, current] : rest;
  const next = queue[0];
  const shown = next === undefined || state.shown.includes(next) ? state.shown : [...state.shown, next];
  return { order: state.order, queue, firstMarks, shown };
}

// Quiz (story 4.2): sets the mark of the current question when the answer is
// confirmed, without moving the queue, so the question stays on screen with
// its explanation. Only the first mark counts (an answer is locked). A
// finished session is left as it is.
export function answerCurrent(state: SessionState, mark: Mark): SessionState {
  const current = state.queue[0];
  if (current === undefined || Object.hasOwn(state.firstMarks, current)) return state;
  return { ...state, firstMarks: { ...state.firstMarks, [current]: mark } };
}

// Quiz (story 4.2): «Neste spørsmål». Takes the current question out of the
// queue (a quiz question never comes back, FR-34) and shows the next one.
// After the last one the queue is empty and the session is finished.
export function advance(state: SessionState): SessionState {
  const [current, ...queue] = state.queue;
  if (current === undefined) return state;
  const next = queue[0];
  const shown = next === undefined || state.shown.includes(next) ? state.shown : [...state.shown, next];
  return { order: state.order, queue, firstMarks: state.firstMarks, shown };
}

// Takes a deleted card out of the session (story 3.7, E22). A card never
// marked leaves the session completely: out of the order, the queue and the
// shown cards, so the grid loses its cell and the total goes down by one. A
// marked card keeps its first mark (its cell and the counts stay) and only
// leaves the queue, so it never comes back. If another card becomes the
// current one, it counts as shown. An unknown id leaves the state as it is.
export function removeCard(state: SessionState, id: string): SessionState {
  if (!state.order.includes(id)) return state;
  const marked = Object.hasOwn(state.firstMarks, id);
  const queue = state.queue.filter((other) => other !== id);
  const order = marked ? state.order : state.order.filter((other) => other !== id);
  const kept = marked ? state.shown : state.shown.filter((other) => other !== id);
  const next = queue[0];
  const shown = next === undefined || kept.includes(next) ? kept : [...kept, next];
  return { order, queue, firstMarks: state.firstMarks, shown };
}

// The id of the card being shown, or undefined when the session is finished.
export function currentCard(state: SessionState): string | undefined {
  return state.queue[0];
}

// Finished when every card has been marked «Kunne» (the queue is empty).
export function isFinished(state: SessionState): boolean {
  return state.queue.length === 0;
}

// The counter: the number of different cards shown, never above the total.
export function shownCount(state: SessionState): number {
  return state.shown.length;
}

export function totalCount(state: SessionState): number {
  return state.order.length;
}

// While repeating: «Repeterer: N kort igjen», with N the cards left in the
// queue. Repeating starts once every card has been shown and marked once and
// some still wait to be marked «Kunne»; otherwise null.
export function repeatingLeft(state: SessionState): number | null {
  const allMarked = state.order.every((id) => Object.hasOwn(state.firstMarks, id));
  return allMarked && state.queue.length > 0 ? state.queue.length : null;
}

// The first marks counted, for «Kunne 5 · Kunne ikke 1» and (3.5) saving:
// shown = different cards shown, answered = cards marked at least once,
// correct = first mark «Kunne», wrong = first mark «Kunne ikke».
export function sessionCounts(state: SessionState): { shown: number; answered: number; correct: number; wrong: number } {
  const marks = Object.values(state.firstMarks);
  const correct = marks.filter((mark) => mark === "known").length;
  return { shown: state.shown.length, answered: marks.length, correct, wrong: marks.length - correct };
}

// One cell of the answer grid, in the locked order. `mark` is the first mark
// (✓ or ✗); `current` is the card being shown (a repeated card keeps its ✗).
export type GridCell = { id: string; number: number; mark: Mark | null; current: boolean };

export function gridCells(state: SessionState): GridCell[] {
  const current = currentCard(state);
  return state.order.map((id, index) => ({
    id,
    number: index + 1,
    mark: state.firstMarks[id] ?? null,
    current: id === current,
  }));
}
