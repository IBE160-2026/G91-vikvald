// Types for the generation module, mirroring backend/app/modules/generation/schemas.py
// and backend/app/modules/content/schemas.py.

// models: model cards (epic 7, behind FEATURE_MNEMONICS), followed by the Flashcards row.
// freetext: free-text questions (epic 8, behind FEATURE_FREETEXT), with a row of its own.
// summary: the lecture's summary (epic 9, behind FEATURE_SUMMARY), with a row of its own.
export type JobKind = "flashcards" | "quiz" | "models" | "freetext" | "summary";
// The kinds the student starts from the scope dialog («Lag flashcards», «Lag quiz»,
// «Lag fritekstspørsmål»).
// Model cards and the summary start directly, without a dialog.
export type ScopedJobKind = Exclude<JobKind, "models" | "summary">;
export type JobStatus = "running" | "done" | "failed";

export type Job = {
  id: string;
  lecture_id: string;
  kind: JobKind;
  // The choices the job was started with, so «Prøv igjen» can use them again.
  // difficulty only for quiz, question_kind only for free text.
  params: JobParams;
  status: JobStatus;
  requested: number;
  // Empty until the job is done.
  created: number | null;
  discarded: number | null;
  // An error code when the job failed: GENERATION_FAILED, GENERATION_TIMEOUT or
  // JOB_INTERRUPTED, and for a summary TOO_FEW_SUMMARY_POINTS.
  error_code: string | null;
  // ISO date-times in UTC.
  started_at: string;
  finished_at: string | null;
};

// A job as the job watcher sees it (GET /api/jobs/active and /api/jobs/{id}).
export type TrackedJob = Job & { lecture_name: string };

// The scopes «Rask», «Vanlig» (the default) and «Dyp»: 10/20/30 for
// flashcards, quiz and model cards, 5/10/15 for free text.
export type Requested = 5 | 10 | 15 | 20 | 30;

// The quiz difficulties «Lett», «Middels» (the default) and «Vanskelig».
export type Difficulty = "easy" | "medium" | "hard";

// The free-text question types «Kortsvar» (the default) and «Langsvar».
export type QuestionKind = "short" | "long";

export type JobParams = {
  requested: number;
  difficulty?: Difficulty;
  question_kind?: QuestionKind;
};

export type ContentCounts = {
  // Flashcards (qa and concept) made from the lecture's files.
  flashcards: number;
  // Quiz questions made from the lecture's files.
  quiz_questions: number;
  // Model cards (epic 7) made from the lecture's files; the Flashcards row adds them to its count.
  model_cards: number;
  // Free-text questions (epic 8, short and long) made from the lecture's files.
  freetext_questions: number;
  // The points in the lecture's summary (epic 9); 0 without a summary.
  summary_points: number;
};
