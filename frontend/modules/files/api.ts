import { apiFetch } from "@/lib/api";

import type { SubjectFileCounts, UploadedFile } from "./types";

// Query keys. They start with the lecture's and the subject's own keys
// (["lectures", id] and ["subjects", id]), so invalidating a subject also
// refreshes its file counts.
export function filesQueryKey(lectureId: string) {
  return ["lectures", lectureId, "files"] as const;
}
export function fileCountsQueryKey(subjectId: string) {
  return ["subjects", subjectId, "file-counts"] as const;
}

// GET /api/lectures/{id}/files: sorted by upload time. The frontend never sorts again.
export function fetchFiles(lectureId: string): Promise<UploadedFile[]> {
  return apiFetch<UploadedFile[]>(`/api/lectures/${encodeURIComponent(lectureId)}/files`);
}

// POST /api/lectures/{id}/files: one file per call, in the multipart field «file».
// The browser sets the multipart Content-Type (with its boundary) itself.
export function uploadFile(lectureId: string, file: File): Promise<UploadedFile> {
  const body = new FormData();
  body.append("file", file, file.name);
  return apiFetch<UploadedFile>(`/api/lectures/${encodeURIComponent(lectureId)}/files`, {
    method: "POST",
    body,
  });
}

// GET /api/subjects/{id}/file-counts: the number of files in the subject, and
// files and pages per lecture (only lectures that have files).
export function fetchFileCounts(subjectId: string): Promise<SubjectFileCounts> {
  return apiFetch<SubjectFileCounts>(`/api/subjects/${encodeURIComponent(subjectId)}/file-counts`);
}
