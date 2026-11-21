import { apiFetch } from "@/lib/api";

import type {
  Lecture,
  LectureCreateInput,
  LectureUpdateInput,
  Subject,
  SubjectCreateInput,
  SubjectUpdateInput,
} from "./types";

// Query keys: the list, one subject, and the lectures in one subject.
// Invalidating SUBJECTS_QUERY_KEY (without exact) also refreshes every single
// subject and every lecture list (same prefix). One lecture has its own key.
export const SUBJECTS_QUERY_KEY = ["subjects"] as const;
export function subjectQueryKey(id: string) {
  return ["subjects", id] as const;
}
export function lecturesQueryKey(subjectId: string) {
  return ["subjects", subjectId, "lectures"] as const;
}
export function lectureQueryKey(id: string) {
  return ["lectures", id] as const;
}

// GET /api/subjects: her own subjects in the order they were created.
export function fetchSubjects(): Promise<Subject[]> {
  return apiFetch<Subject[]>("/api/subjects");
}

// GET /api/subjects/{id}: 404 NOT_FOUND for someone else's or a missing subject.
export function fetchSubject(id: string): Promise<Subject> {
  return apiFetch<Subject>(`/api/subjects/${encodeURIComponent(id)}`);
}

// POST /api/subjects: 201 with the new subject (the backend picks the colour).
export function createSubject(input: SubjectCreateInput): Promise<Subject> {
  return apiFetch<Subject>("/api/subjects", { method: "POST", body: JSON.stringify(input) });
}

// PATCH /api/subjects/{id}: change the name and/or the exam date.
export function updateSubject(id: string, input: SubjectUpdateInput): Promise<Subject> {
  return apiFetch<Subject>(`/api/subjects/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// GET /api/subjects/{id}/lectures: sorted by date, then by when they were created.
// The order comes from the backend and is never changed here.
export function fetchLectures(subjectId: string): Promise<Lecture[]> {
  return apiFetch<Lecture[]>(`/api/subjects/${encodeURIComponent(subjectId)}/lectures`);
}

// POST /api/subjects/{id}/lectures: 201 with the new lecture.
export function createLecture(subjectId: string, input: LectureCreateInput): Promise<Lecture> {
  return apiFetch<Lecture>(`/api/subjects/${encodeURIComponent(subjectId)}/lectures`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// GET /api/lectures/{id}: 404 NOT_FOUND for someone else's or a missing lecture.
export function fetchLecture(id: string): Promise<Lecture> {
  return apiFetch<Lecture>(`/api/lectures/${encodeURIComponent(id)}`);
}

// PATCH /api/lectures/{id}: change the name and/or the date.
export function updateLecture(id: string, input: LectureUpdateInput): Promise<Lecture> {
  return apiFetch<Lecture>(`/api/lectures/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
