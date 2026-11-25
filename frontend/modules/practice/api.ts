import type { QueryKey } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";

import type { Flashcard, Overview, QuizQuestion, SubjectFlashcard } from "./types";

// The overview of all her subjects (story 5.1). Invalidated when a session is
// saved (useSessionSaver), so the views show the new status without a reload.
export const OVERVIEW_QUERY_KEY = ["overview"] as const;

// GET /api/overview: her subjects with their lectures, whether each lecture is
// practised («øvd», worked out by the server) and each subject's last session.
export function fetchOverview(): Promise<Overview> {
  return apiFetch<Overview>("/api/overview");
}

// Starts with the lecture's own key (["lectures", id]), so invalidating the
// lecture (as the job watcher does) also refetches the cards. A running session
// keeps its own copy, so this never changes a session in progress.
export function lectureFlashcardsQueryKey(lectureId: string) {
  return ["lectures", lectureId, "flashcards"] as const;
}

// GET /api/lectures/{id}/flashcards: the lecture's cards (qa, concept and model) with
// their source, ordered by file and page. 404 NOT_FOUND for someone else's or a
// missing lecture.
export function fetchLectureFlashcards(lectureId: string): Promise<Flashcard[]> {
  return apiFetch<Flashcard[]>(`/api/lectures/${encodeURIComponent(lectureId)}/flashcards`);
}

// The lecture's quiz questions: under the lecture's key (["lectures", id]), so
// the job watcher refetches them when a quiz job ends. A running quiz keeps
// its own copy.
export function lectureQuizQuestionsQueryKey(lectureId: string) {
  return ["lectures", lectureId, "quiz-questions"] as const;
}

// GET /api/lectures/{id}/quiz-questions: the lecture's questions with the
// answer key, explanation, source and lecture, ordered by file and page. 404
// NOT_FOUND for someone else's or a missing lecture.
export function fetchLectureQuizQuestions(lectureId: string): Promise<QuizQuestion[]> {
  return apiFetch<QuizQuestion[]>(`/api/lectures/${encodeURIComponent(lectureId)}/quiz-questions`);
}

// The subject's cards: under the subject's key (["subjects", id]), so the
// subject page's queries and this one share a prefix.
export function subjectFlashcardsQueryKey(subjectId: string) {
  return ["subjects", subjectId, "flashcards"] as const;
}

// True for ["subjects", <any id>, "flashcards"]: the job watcher refetches all
// of them when a job ends, since it does not know the lecture's subject.
export function isSubjectFlashcardsQueryKey(key: QueryKey): boolean {
  return key.length === 3 && key[0] === "subjects" && key[2] === "flashcards";
}

// GET /api/subjects/{id}/flashcards: the cards (qa, concept and model) from all the
// subject's lectures with their source and lecture, ordered by lecture date,
// then file and page. 404 NOT_FOUND for someone else's or a missing subject.
export function fetchSubjectFlashcards(subjectId: string): Promise<SubjectFlashcard[]> {
  return apiFetch<SubjectFlashcard[]>(`/api/subjects/${encodeURIComponent(subjectId)}/flashcards`);
}

// The subject's quiz questions: under the subject's key (["subjects", id]),
// like the subject's cards. A running quiz keeps its own copy.
export function subjectQuizQuestionsQueryKey(subjectId: string) {
  return ["subjects", subjectId, "quiz-questions"] as const;
}

// True for ["subjects", <any id>, "flashcards"] and ["subjects", <any id>,
// "quiz-questions"]: the job watcher refetches all of them when a job ends,
// since it does not know the lecture's subject.
export function isSubjectPracticeQueryKey(key: QueryKey): boolean {
  return (
    key.length === 3 && key[0] === "subjects" && (key[2] === "flashcards" || key[2] === "quiz-questions")
  );
}

// GET /api/subjects/{id}/quiz-questions: the questions from all the subject's
// lectures with the answer key, explanation, source and lecture, ordered by
// lecture date, then file and page. 404 NOT_FOUND for someone else's or a
// missing subject.
export function fetchSubjectQuizQuestions(subjectId: string): Promise<QuizQuestion[]> {
  return apiFetch<QuizQuestion[]>(`/api/subjects/${encodeURIComponent(subjectId)}/quiz-questions`);
}

// What the student may change on a card: the question (front), and the answer
// (back) on a qa or concept card or the points and the mnemonic on a model card
// (story 7.2). A field left out is not changed. A mnemonic is refused with 404
// FEATURE_DISABLED when the switch is off.
export type FlashcardUpdateInput = { front?: string; back?: string; points?: string[]; mnemonic?: string };

// PATCH /api/flashcards/{id}: 200 with the saved card (the text trimmed at both
// ends). 422 FLASHCARD_FRONT_REQUIRED / FLASHCARD_BACK_REQUIRED for an empty
// field (nothing is saved); 404 NOT_FOUND for someone else's or a missing card.
export function updateFlashcard(id: string, input: FlashcardUpdateInput): Promise<Flashcard> {
  return apiFetch<Flashcard>(`/api/flashcards/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// DELETE /api/flashcards/{id}: 204, the card is gone. 404 NOT_FOUND when it is
// already gone (or not hers).
export function deleteFlashcard(id: string): Promise<void> {
  return apiFetch<void>(`/api/flashcards/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// DELETE /api/quiz-questions/{id} (story 4.5): 204, the question is gone. 404
// NOT_FOUND when it is already gone (or not hers). Quiz questions cannot be edited.
export function deleteQuizQuestion(id: string): Promise<void> {
  return apiFetch<void>(`/api/quiz-questions/${encodeURIComponent(id)}`, { method: "DELETE" });
}
