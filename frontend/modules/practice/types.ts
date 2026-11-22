// Types for the practice module, mirroring backend/app/modules/content/schemas.py.

import type { Source } from "@/components/source-link";

import type { PracticeKind } from "./save";

export type FlashcardSource = Source & {
  file_id: string;
};

export type Flashcard = {
  id: string;
  // "qa" (question/answer) or "concept" (term/explanation); both are shown the same way.
  kind: "qa" | "concept";
  front: string;
  back: string;
  source: FlashcardSource;
};

// A card in a whole-subject session: also the lecture it was made from.
export type SubjectFlashcard = Flashcard & {
  lecture: { id: string; name: string };
};

// How a card was marked: «Kunne» or «Kunne ikke». A quiz question uses the
// same marks: "known" is a correct answer, "missed" a wrong one.
export type Mark = "known" | "missed";

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
