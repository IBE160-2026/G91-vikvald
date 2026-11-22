import { apiFetch } from "@/lib/api";

import type { ContentCounts, Difficulty, Job, JobKind, Requested, TrackedJob } from "./types";

// Query keys. They start with the lecture's own key (["lectures", id]), so
// invalidating a lecture also refreshes its jobs and counts.
export function latestJobsQueryKey(lectureId: string) {
  return ["lectures", lectureId, "jobs", "latest"] as const;
}
export function contentCountsQueryKey(lectureId: string) {
  return ["lectures", lectureId, "content-counts"] as const;
}
export const ACTIVE_JOBS_QUERY_KEY = ["jobs", "active"] as const;

// GET /api/lectures/{id}/jobs/latest: the newest job of each kind.
export function fetchLatestJobs(lectureId: string): Promise<Job[]> {
  return apiFetch<Job[]>(`/api/lectures/${encodeURIComponent(lectureId)}/jobs/latest`);
}

// GET /api/lectures/{id}/content-counts
export function fetchContentCounts(lectureId: string): Promise<ContentCounts> {
  return apiFetch<ContentCounts>(`/api/lectures/${encodeURIComponent(lectureId)}/content-counts`);
}

// POST /api/lectures/{id}/jobs: 202 with the running job. The scope is always
// sent: 10, 20 or 30 items at most. The difficulty only for quiz (the backend
// rejects it for flashcards).
export function startJob(
  lectureId: string,
  kind: JobKind,
  requested: Requested,
  difficulty?: Difficulty,
): Promise<Job> {
  const params = difficulty ? { requested, difficulty } : { requested };
  return apiFetch<Job>(`/api/lectures/${encodeURIComponent(lectureId)}/jobs`, {
    method: "POST",
    body: JSON.stringify({ kind, params }),
  });
}

// GET /api/jobs/active: the student's running jobs, oldest first.
export function fetchActiveJobs(): Promise<TrackedJob[]> {
  return apiFetch<TrackedJob[]>("/api/jobs/active");
}

// GET /api/jobs/{id}: one of her jobs (also when it has ended).
export function fetchJob(jobId: string): Promise<TrackedJob> {
  return apiFetch<TrackedJob>(`/api/jobs/${encodeURIComponent(jobId)}`);
}
