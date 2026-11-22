// Types for the files module, mirroring backend/app/modules/files/schemas.py.

export type UploadedFile = {
  id: string;
  lecture_id: string;
  original_name: string;
  page_count: number;
  // ISO date-time in UTC, "2026-09-11T08:15:00Z".
  uploaded_at: string;
};

// One count from the content registry, e.g. { kind: "flashcards", count: 3 }.
export type ContentCount = {
  kind: string;
  count: number;
};

export type LectureFileCount = {
  lecture_id: string;
  file_count: number;
  page_count: number;
  // The registry's counts for the lecture, in registration order, without 0.
  content_counts: ContentCount[];
};

export type SubjectFileCounts = {
  // All files in the subject.
  file_count: number;
  // Only the lectures that have files.
  lectures: LectureFileCount[];
};
