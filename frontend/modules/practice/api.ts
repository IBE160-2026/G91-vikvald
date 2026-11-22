import type { QueryKey } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";

import type { Flashcard, QuizQuestion, SubjectFlashcard } from "./types";

// Starts with the lecture's own key (["lectures", id]), so invalidating the
// lecture (as the job watcher does) also refetches the cards. A running session
// keeps its own copy, so this never changes a session in progress.
export function lectureFlashcardsQueryKey(lectureId: string) {
  return ["lectures", lectureId, "flashcards"] as const;
}

// GET /api/lectures/{id}/flashcards: the lecture's cards (qa and concept) with
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

// GET /api/subjects/{id}/flashcards: the cards (qa and concept) from all the
// subject's lectures with their source and lecture, ordered by lecture date,
// then file and page. 404 NOT_FOUND for someone else's or a missing subject.
export function fetchSubjectFlashcards(subjectId: string): Promise<SubjectFlashcard[]> {
  return apiFetch<SubjectFlashcard[]>(`/api/subjects/${encodeURIComponent(subjectId)}/flashcards`);
}

// What the student may change on a card: the question (front) and the answer
// (back). A field left out is not changed.
export type FlashcardUpdateInput = { front?: string; back?: string };

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
