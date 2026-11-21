// Types for the subjects module (subjects and lectures), mirroring
// backend/app/modules/subjects/schemas.py.

export type Subject = {
  id: string;
  name: string;
  // ISO date, "2026-12-04".
  exam_date: string;
  // 0-5, see lib/subject-colors.ts.
  color_index: number;
  lecture_count: number;
  created_at: string;
};

export type SubjectCreateInput = {
  name: string;
  exam_date: string;
};

// Only the name and the exam date can be changed.
export type SubjectUpdateInput = Partial<SubjectCreateInput>;

export type Lecture = {
  id: string;
  subject_id: string;
  name: string;
  // ISO date, "2026-09-11".
  date: string;
  created_at: string;
};

export type LectureCreateInput = {
  name: string;
  date: string;
};

// Only the name and the date can be changed.
export type LectureUpdateInput = Partial<LectureCreateInput>;
