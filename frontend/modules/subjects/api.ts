import { apiFetch } from "@/lib/api";

import type { Subject, SubjectCreateInput, SubjectUpdateInput } from "./types";

// Query keys: the list, and one subject. Invalidating SUBJECTS_QUERY_KEY also
// refreshes every single subject (same prefix).
export const SUBJECTS_QUERY_KEY = ["subjects"] as const;
export function subjectQueryKey(id: string) {
  return ["subjects", id] as const;
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
