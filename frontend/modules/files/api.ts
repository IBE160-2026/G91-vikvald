import type { QueryKey } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { DeleteCount } from "@/lib/delete-text";

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
// True for ["subjects", <any id>, "file-counts"]: the job watcher refetches
// them when a job ends, since they hold the lecture table's Kort and Quiz.
export function isSubjectFileCountsQueryKey(key: QueryKey): boolean {
  return key.length === 3 && key[0] === "subjects" && key[2] === "file-counts";
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

// GET /api/files/{id}/delete-preview: what else goes with the file (only
// content types from the registry; none in epic 2).
export async function fetchFileDeletePreview(fileId: string): Promise<DeleteCount[]> {
  const body = await apiFetch<{ counts: DeleteCount[] }>(`/api/files/${encodeURIComponent(fileId)}/delete-preview`);
  return body.counts;
}

// DELETE /api/files/{id}: 204. The PDF is removed from the disk too.
export function deleteFile(fileId: string): Promise<void> {
  return apiFetch<void>(`/api/files/${encodeURIComponent(fileId)}`, { method: "DELETE" });
}

// POST /api/files/{id}/replace: the new version in the multipart field «file»
// (FR-13). 201 with the new file (a new id, same lecture). The new file passes
// every upload check before the old one is deleted, so a rejection leaves the
// old file as it was.
export function replaceFile(fileId: string, file: File): Promise<UploadedFile> {
  const body = new FormData();
  body.append("file", file, file.name);
  return apiFetch<UploadedFile>(`/api/files/${encodeURIComponent(fileId)}/replace`, {
    method: "POST",
    body,
  });
}
