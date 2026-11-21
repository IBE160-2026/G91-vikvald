import { apiFetch } from "@/lib/api";

import type { ContentCounts, Job, JobKind } from "./types";

// Query keys. They start with the lecture's own key (["lectures", id]), so
// invalidating a lecture also refreshes its jobs and counts.
export function latestJobsQueryKey(lectureId: string) {
  return ["lectures", lectureId, "jobs", "latest"] as const;
}
export function contentCountsQueryKey(lectureId: string) {
  return ["lectures", lectureId, "content-counts"] as const;
}

// GET /api/lectures/{id}/jobs/latest: the newest job of each kind.
export function fetchLatestJobs(lectureId: string): Promise<Job[]> {
  return apiFetch<Job[]>(`/api/lectures/${encodeURIComponent(lectureId)}/jobs/latest`);
}

// GET /api/lectures/{id}/content-counts
export function fetchContentCounts(lectureId: string): Promise<ContentCounts> {
  return apiFetch<ContentCounts>(`/api/lectures/${encodeURIComponent(lectureId)}/content-counts`);
}

// POST /api/lectures/{id}/jobs: 202 with the running job. Without params the
// backend asks for its default (up to 20 cards); story 3.2 adds the choice.
export function startJob(lectureId: string, kind: JobKind): Promise<Job> {
  return apiFetch<Job>(`/api/lectures/${encodeURIComponent(lectureId)}/jobs`, {
    method: "POST",
    body: JSON.stringify({ kind }),
  });
}
