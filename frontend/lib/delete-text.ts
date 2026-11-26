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

// The kind the delete preview counts summaries under (story 9.1). A summary
// belongs to the lecture, not to a file, so it is named in its own way and
// always last: «sammendraget av forelesningen» for a file or a lecture, where
// it is clear which lecture, otherwise «sammendraget av 1 forelesning» or
// «sammendragene av 2 forelesninger».
const SUMMARIES = "summaries";

function summariesPart(counts: DeleteCount[], target: DeleteTarget): string | null {
  const count = counts.find((item) => item.kind === SUMMARIES)?.count ?? 0;
  if (!(count > 0)) return null;
  if (count > 1) return `sammendragene av ${count} forelesninger`;
  const known = target === "file" || target === "lecture";
  return known ? "sammendraget av forelesningen" : "sammendraget av 1 forelesning";
}

// «Dette sletter også 8 forelesninger og 11 filer.» Counts over 0 with a known
// name, in the order given, singular for 1 and plural otherwise, joined with
// «, » and «og» before the last. For a file, « laget fra fila» comes after the
// content made from it. The summary comes last, after « laget fra fila»
// («… 18 flashcards laget fra fila og sammendraget av forelesningen.»).
// Nothing left (everything 0 or unknown) gives null: never «0 …».
export function alsoDeletedSentence(counts: DeleteCount[], target: DeleteTarget): string | null {
  const parts = countParts(counts.filter((item) => item.kind !== SUMMARIES));
  const summary = summariesPart(counts, target);
  if (parts.length === 0 && !summary) return null;
  if (target === "file" && parts.length > 0) {
    const fromFile = `${joinNorwegian(parts)} laget fra fila`;
    return `Dette sletter også ${summary ? `${fromFile} og ${summary}` : fromFile}.`;
  }
  return `Dette sletter også ${joinNorwegian(summary ? [...parts, summary] : parts)}.`;
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
