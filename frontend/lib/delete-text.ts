import { countNouns } from "./messages";

// The text in the delete confirmation (UX-DR22, E16): one function builds the
// sentence «Dette sletter også …» from the counts the delete preview gives.

export type DeleteCount = { kind: string; count: number };
export type DeleteTarget = "file" | "lecture" | "subject";

export const UNDOABLE = "Det kan ikke angres.";

function joinNorwegian(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} og ${parts[parts.length - 1]}`;
}

// «Dette sletter også 8 forelesninger og 11 filer.» Counts over 0 with a known
// name, in the order given, singular for 1 and plural otherwise, joined with
// «, » and «og» before the last. For a file, « laget fra fila» comes before the
// full stop. Nothing left (everything 0 or unknown) gives null: never «0 …».
export function alsoDeletedSentence(counts: DeleteCount[], target: DeleteTarget): string | null {
  const parts: string[] = [];
  for (const { kind, count } of counts) {
    if (!(count > 0) || !Object.prototype.hasOwnProperty.call(countNouns, kind)) continue;
    const noun = countNouns[kind];
    parts.push(`${count} ${count === 1 ? noun.one : noun.other}`);
  }
  if (parts.length === 0) return null;
  const suffix = target === "file" ? " laget fra fila" : "";
  return `Dette sletter også ${joinNorwegian(parts)}${suffix}.`;
}
