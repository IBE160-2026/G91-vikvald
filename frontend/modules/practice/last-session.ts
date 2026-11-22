// The text in SISTE ØKT at the bottom of «Øv på hele emnet» (UX-DR14, mockup 03):
// «Quiz · Uke 37: Merkevare» and «09.11 · 12 av 15 riktige».

import { formatDayMonth } from "@/lib/dates";

import type { PracticeKind } from "./save";
import type { LastSession } from "./types";

export const PRACTICE_KIND_LABELS: Record<PracticeKind, string> = {
  flashcards: "Flashcards",
  quiz: "Quiz",
  freetext: "Fritekstspørsmål",
};

export type LastSessionLines = {
  // «<Type> · <forelesning>» or «<Type> · Hele emnet».
  title: string;
  // «dd.mm · <resultat>», with «Avbrutt · » before the result when aborted.
  detail: string;
};

// The result: «Kunne C av A» for flashcards, «C av A riktige» for quiz and
// free text (C = correct, A = answered).
export function lastSessionResult(session: LastSession): string {
  const result =
    session.kind === "flashcards"
      ? `Kunne ${session.correct} av ${session.answered}`
      : `${session.correct} av ${session.answered} riktige`;
  return session.aborted ? `Avbrutt · ${result}` : result;
}

// lectureName gives the name of a lecture in the subject (from the overview).
export function lastSessionLines(
  session: LastSession,
  lectureName: (lectureId: string) => string | undefined,
): LastSessionLines {
  const kind = PRACTICE_KIND_LABELS[session.kind];
  const scope = session.lecture_id === null ? "Hele emnet" : lectureName(session.lecture_id);
  return {
    title: scope ? `${kind} · ${scope}` : kind,
    detail: `${formatDayMonth(session.started_at)} · ${lastSessionResult(session)}`,
  };
}
