import { apiFetch } from "@/lib/api";

import type { Summary } from "./types";

// Under the lecture's own key (["lectures", id]), so the job watcher's refresh
// of the lecture when a job ends also fetches the new summary.
export function summaryQueryKey(lectureId: string) {
  return ["lectures", lectureId, "summary"] as const;
}

// GET /api/lectures/{id}/summary: 404 NOT_FOUND without a summary or for
// someone else's lecture, 404 FEATURE_DISABLED with FEATURE_SUMMARY off.
export function fetchSummary(lectureId: string): Promise<Summary> {
  return apiFetch<Summary>(`/api/lectures/${encodeURIComponent(lectureId)}/summary`);
}
