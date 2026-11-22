// Types for the generation module, mirroring backend/app/modules/generation/schemas.py
// and backend/app/modules/content/schemas.py.

export type JobKind = "flashcards" | "quiz";
export type JobStatus = "running" | "done" | "failed";

export type Job = {
  id: string;
  lecture_id: string;
  kind: JobKind;
  // The choices the job was started with, so «Prøv igjen» can use them again.
  // difficulty only for quiz.
  params: JobParams;
  status: JobStatus;
  requested: number;
  // Empty until the job is done.
  created: number | null;
  discarded: number | null;
  // An error code when the job failed: GENERATION_FAILED, GENERATION_TIMEOUT or JOB_INTERRUPTED.
  error_code: string | null;
  // ISO date-times in UTC.
  started_at: string;
  finished_at: string | null;
};

// A job as the job watcher sees it (GET /api/jobs/active and /api/jobs/{id}).
export type TrackedJob = Job & { lecture_name: string };

// The scopes «Rask», «Vanlig» (the default) and «Dyp».
export type Requested = 10 | 20 | 30;

// The quiz difficulties «Lett», «Middels» (the default) and «Vanskelig».
export type Difficulty = "easy" | "medium" | "hard";

export type JobParams = {
  requested: number;
  difficulty?: Difficulty;
};

export type ContentCounts = {
  // Flashcards (qa and concept) made from the lecture's files.
  flashcards: number;
  // Quiz questions made from the lecture's files.
  quiz_questions: number;
};
