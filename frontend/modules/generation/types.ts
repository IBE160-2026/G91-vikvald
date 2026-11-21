// Types for the generation module, mirroring backend/app/modules/generation/schemas.py
// and backend/app/modules/content/schemas.py.

export type JobKind = "flashcards";
export type JobStatus = "running" | "done" | "failed";

export type Job = {
  id: string;
  lecture_id: string;
  kind: JobKind;
  status: JobStatus;
  requested: number;
  // Empty until the job is done.
  created: number | null;
  discarded: number | null;
  // An error code when the job failed, e.g. GENERATION_FAILED.
  error_code: string | null;
  // ISO date-times in UTC.
  started_at: string;
  finished_at: string | null;
};

export type ContentCounts = {
  // Flashcards (qa and concept) made from the lecture's files.
  flashcards: number;
};
