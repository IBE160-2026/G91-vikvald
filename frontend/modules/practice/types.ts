// Types for the practice module, mirroring backend/app/modules/content/schemas.py.

import type { Source } from "@/components/source-link";

import type { PracticeKind } from "./save";

export type FlashcardSource = Source & {
  file_id: string;
};

type CardBase = {
  id: string;
  front: string;
  // Made from a page with a formula, or the model reported something missing
  // (FR-41): shown as formula-flag above the source.
  formula_flag: boolean;
  source: FlashcardSource;
};

// A question/answer card ("qa") or a term/explanation card ("concept"); both
// are shown the same way. The API sends points and mnemonic as null.
export type PlainFlashcard = CardBase & {
  kind: "qa" | "concept";
  back: string;
  points?: null;
  mnemonic?: null;
};

// A model card (story 7.1, FR-42): no back, but the points in the notes'
// order and the mnemonic, or null when the card has none (FR-44). Practised
// with the other flashcards (story 7.2, FR-56).
export type ModelCard = CardBase & {
  kind: "model";
  back: null;
  points: string[];
  mnemonic: string | null;
};

export type Flashcard = PlainFlashcard | ModelCard;

// A card in a whole-subject session: also the lecture it was made from.
export type SubjectFlashcard = Flashcard & {
  lecture: { id: string; name: string };
};

// How a card was marked: «Kunne» or «Kunne ikke». A quiz question uses the
// same marks: "known" is a correct answer, "missed" a wrong one. A free-text
// question (story 8.2) also has "partial": she assessed herself as «Delvis
// riktig». Flashcards and quiz never use it.
export type Mark = "known" | "partial" | "missed";

// A quiz question (story 4.2), from GET /api/lectures/{id}/quiz-questions. The
// answer key is sent with it (AR-15); the page shows it only after the student
// has confirmed her answer (SK-5).
export type QuizQuestion = {
  id: string;
  question: string;
  // Four texts in stored order, shown as A–D.
  options: string[];
  // The correct option's place in `options` (0–3).
  correct_index: number;
  explanation: string;
  // As for Flashcard (FR-41).
  formula_flag: boolean;
  source: FlashcardSource;
  lecture: { id: string; name: string };
};

// A free-text question (story 8.2), from GET /api/lectures/{id}/freetext-questions.
// The model answer is sent with it (AR-15); the page shows it only after the
// student has written an answer and asked to see it.
export type FreetextQuestion = {
  id: string;
  // «Kortsvar» or «Langsvar», as chosen when the questions were made.
  kind: "short" | "long";
  question: string;
  model_answer: string;
  // As for Flashcard (FR-41).
  formula_flag: boolean;
  source: FlashcardSource;
  lecture: { id: string; name: string };
};

// GET /api/overview (story 5.1), mirroring backend/app/modules/practice/schemas.py.
// «Øvd» is worked out by the server; the frontend only shows it.
export type OverviewLecture = {
  id: string;
  name: string;
  // "2026-09-11".
  date: string;
  practiced: boolean;
  // ISO 8601 (UTC), or null when not practised.
  last_practiced_at: string | null;
};

// The subject's newest session.
export type LastSession = {
  kind: PracticeKind;
  // null for a session over the whole subject.
  lecture_id: string | null;
  // ISO 8601 (UTC).
  started_at: string;
  aborted: boolean;
  shown: number;
  answered: number;
  correct: number;
  partial: number;
  wrong: number;
};

export type OverviewSubject = {
  id: string;
  name: string;
  color_index: number;
  exam_date: string;
  lectures: OverviewLecture[];
  last_session: LastSession | null;
};

export type Overview = { subjects: OverviewSubject[] };
