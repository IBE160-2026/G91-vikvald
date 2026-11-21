import { apiFetch } from "@/lib/api";

import type { Flashcard } from "./types";

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
