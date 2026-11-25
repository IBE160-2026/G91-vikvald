import { countNouns } from "./messages";

// The text in the delete confirmation (UX-DR22, E16): one function builds the
// sentence «Dette sletter også …» from the counts the delete preview gives.

export type DeleteCount = { kind: string; count: number };
// "flashcard": one card in the session (story 3.7), and "quiz-question": one
// question in the quiz (story 4.5), and "freetext-question": one free-text
// question (story 8.3); they take nothing with them.
export type DeleteTarget =
  | "file"
  | "lecture"
  | "subject"
  | "account"
  | "flashcard"
  | "quiz-question"
  | "freetext-question";

export const UNDOABLE = "Det kan ikke angres.";

function joinNorwegian(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} og ${parts[parts.length - 1]}`;
}

function hasNoun(kind: string): boolean {
  return Object.prototype.hasOwnProperty.call(countNouns, kind);
}

// "8 forelesninger", "1 fil": counts over 0 with a known name, in the order given.
function countParts(counts: DeleteCount[]): string[] {
  const parts: string[] = [];
  for (const { kind, count } of counts) {
    if (!(count > 0) || !hasNoun(kind)) continue;
    const noun = countNouns[kind];
    parts.push(`${count} ${count === 1 ? noun.one : noun.other}`);
  }
  return parts;
}

// «Dette sletter også 8 forelesninger og 11 filer.» Counts over 0 with a known
// name, in the order given, singular for 1 and plural otherwise, joined with
// «, » and «og» before the last. For a file, « laget fra fila» comes before the
// full stop. Nothing left (everything 0 or unknown) gives null: never «0 …».
export function alsoDeletedSentence(counts: DeleteCount[], target: DeleteTarget): string | null {
  const parts = countParts(counts);
  if (parts.length === 0) return null;
  const suffix = target === "file" ? " laget fra fila" : "";
  return `Dette sletter også ${joinNorwegian(parts)}${suffix}.`;
}

// The account page (mockup 15): «Du har nå 3 emner, 15 forelesninger og 18
// filer.» from the counts of subjects, lectures and files (other kinds are left
// out), with the same singular/plural, commas and «og». Everything 0 gives
// null: the line is left out, never «0 …».
export function accountCountsSentence(counts: DeleteCount[]): string | null {
  const parts = countParts(
    ["subjects", "lectures", "files"].flatMap((kind) => counts.filter((count) => count.kind === kind)),
  );
  if (parts.length === 0) return null;
  return `Du har nå ${joinNorwegian(parts)}.`;
}

// What goes with the account: «Alle emner, filer og alt generert innhold slettes
// for godt.», and when content types are registered, their plural names after a
// colon: «… slettes for godt: flashcards og quizspørsmål.». Kinds without a name
// in countNouns are skipped.
export function accountDeletedText(kinds: string[]): string {
  const base = "Alle emner, filer og alt generert innhold slettes for godt";
  const names = kinds.filter(hasNoun).map((kind) => countNouns[kind].other);
  if (names.length === 0) return `${base}.`;
  return `${base}: ${joinNorwegian(names)}.`;
}
