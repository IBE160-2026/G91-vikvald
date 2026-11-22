import type { QueryKey } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";

import type { Flashcard, SubjectFlashcard } from "./types";

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
