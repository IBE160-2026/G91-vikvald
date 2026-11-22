// What the subject card (story 5.4, FR-58, UX-DR12) shows: the counts line
// «120 kort · 64 quizspørsmål» and «Neste å øve på» / NESTE STEG. Pure
// functions, so every case is tested without a page.
//
// «Øvd» (`practiced`, `last_practiced_at`) comes only from GET /api/overview;
// these functions never decide it themselves (SK-20). The counts come from GET
// /api/subjects/{id}/file-counts, the same content registry as the lecture
// table (story 5.2).

import { formatDayMonth } from "@/lib/dates";
import type { LectureFileCount, SubjectFileCounts } from "@/modules/files/types";
import type { OverviewLecture } from "@/modules/practice/types";

// The practice types in the order «Øv nå» tries them (flashcards -> quiz). The
// first type a lecture has content of is the one started, and the reason names
// it. Free text (epic 8) is added to this list when it exists.
const PRACTICE_KINDS = [
  { kind: "flashcards", path: "flashcards", text: (count: number) => `${count} kort` },
  { kind: "quiz_questions", path: "quiz", text: (count: number) => `${count} quizspørsmål` },
] as const;

export type ContentCounts = { flashcards: number; quiz_questions: number };

function count(lecture: LectureFileCount | undefined, kind: string): number {
  return (lecture?.content_counts ?? [])
    .filter((item) => item.kind === kind)
    .reduce((total, item) => total + item.count, 0);
}

// The subject's cards and quiz questions: the sum over its lectures.
export function subjectContentCounts(fileCounts: SubjectFileCounts): ContentCounts {
  return {
    flashcards: fileCounts.lectures.reduce((total, lecture) => total + count(lecture, "flashcards"), 0),
    quiz_questions: fileCounts.lectures.reduce((total, lecture) => total + count(lecture, "quiz_questions"), 0),
  };
}

// «120 kort · 64 quizspørsmål»; a type with 0 is left out («16 kort»,
// «12 quizspørsmål»); both 0 gives «Ingen øvingsinnhold ennå».
export function contentCountText(counts: ContentCounts): string {
  const parts = PRACTICE_KINDS.filter(({ kind }) => counts[kind] > 0).map(({ kind, text }) => text(counts[kind]));
  return parts.length > 0 ? parts.join(" · ") : "Ingen øvingsinnhold ennå";
}

export type NextStep = {
  // "practice": NESTE Å ØVE PÅ with the primary button «Øv nå».
  // "setup": NESTE STEG with an outline button.
  kind: "practice" | "setup";
  // The lecture's name, or null when the subject has no lectures.
  lecture: string | null;
  reason: string;
  action: { label: string; href: string };
};

// The first practice type the lecture has content of, or null.
function firstKind(counts: LectureFileCount | undefined) {
  for (const item of PRACTICE_KINDS) {
    const value = count(counts, item.kind);
    if (value > 0) return { ...item, value };
  }
  return null;
}

function practiceStep(lecture: OverviewLecture, counts: LectureFileCount | undefined, when: string): NextStep {
  const kind = firstKind(counts)!;
  return {
    kind: "practice",
    lecture: lecture.name,
    reason: `${kind.text(kind.value)}, ${when}`,
    action: { label: "Øv nå", href: `/forelesninger/${lecture.id}/${kind.path}` },
  };
}

function lectureHref(lecture: OverviewLecture): string {
  return `/forelesninger/${lecture.id}`;
}

// «Neste å øve på» for a subject, from its lectures in the overview's order
// (date, then created) and its file counts:
//  1. A lecture «has content» when one of the practice types has a count > 0.
//  2. The first lecture with content that is not practised: «16 kort, ikke øvd ennå».
//  3. Otherwise (all with content practised) the one practised longest ago
//     (the first in the order on a tie): «16 kort, sist øvd 03.11».
//  4. Otherwise the first lecture with files: NESTE STEG, «2 filer lastet opp,
//     klare til bruk», «Lag flashcards».
//  5. Otherwise the first lecture: NESTE STEG, «Ingen filer ennå», «Last opp PDF».
//  6. Otherwise NESTE STEG «Ingen forelesninger ennå», «Ny forelesning».
export function nextStep(subjectId: string, lectures: OverviewLecture[], fileCounts: SubjectFileCounts): NextStep {
  const countsById = new Map(fileCounts.lectures.map((item) => [item.lecture_id, item]));
  const withContent = lectures.filter((lecture) => firstKind(countsById.get(lecture.id)) !== null);

  const notPracticed = withContent.find((lecture) => !lecture.practiced);
  if (notPracticed) return practiceStep(notPracticed, countsById.get(notPracticed.id), "ikke øvd ennå");

  if (withContent.length > 0) {
    // The oldest last_practiced_at; a missing time (never expected for a
    // practised lecture) counts as the oldest. Strictly older wins, so a tie
    // keeps the first in the order.
    const time = (lecture: OverviewLecture) =>
      lecture.last_practiced_at === null ? -Infinity : Date.parse(lecture.last_practiced_at);
    const oldest = withContent.reduce((best, lecture) => (time(lecture) < time(best) ? lecture : best));
    const when = oldest.last_practiced_at === null ? "øvd" : `sist øvd ${formatDayMonth(oldest.last_practiced_at)}`;
    return practiceStep(oldest, countsById.get(oldest.id), when);
  }

  const withFiles = lectures.find((lecture) => (countsById.get(lecture.id)?.file_count ?? 0) > 0);
  if (withFiles) {
    const files = countsById.get(withFiles.id)!.file_count;
    return {
      kind: "setup",
      lecture: withFiles.name,
      reason: files === 1 ? "1 fil lastet opp, klar til bruk" : `${files} filer lastet opp, klare til bruk`,
      action: { label: "Lag flashcards", href: lectureHref(withFiles) },
    };
  }

  if (lectures.length > 0) {
    return {
      kind: "setup",
      lecture: lectures[0].name,
      reason: "Ingen filer ennå",
      action: { label: "Last opp PDF", href: lectureHref(lectures[0]) },
    };
  }

  return {
    kind: "setup",
    lecture: null,
    reason: "Ingen forelesninger ennå",
    action: { label: "Ny forelesning", href: `/emner/${subjectId}` },
  };
}
