import type { UploadedFile } from "../types";
import { FileRow } from "./file-row";

// The lecture's files in a white card, one file-row each, in the order the
// backend gives (upload time). Nothing is shown when there are no files.
// «Slett» on a row calls onDelete with that file; a new version picked with
// «Erstatt» calls onReplace. `rejections` holds the message for a rejected
// replacement, by file id.
export function FileList({
  files,
  onDelete,
  onReplace,
  rejections = {},
}: {
  files: UploadedFile[];
  onDelete: (file: UploadedFile) => void;
  onReplace: (file: UploadedFile, replacement: File) => void;
  rejections?: Record<string, string>;
}) {
  if (files.length === 0) return null;
  return (
    <ul
      aria-label="Filer"
      className="divide-y divide-divider rounded-lg border border-border-card bg-surface shadow-lift"
    >
      {files.map((file) => (
        <FileRow
          key={file.id}
          file={file}
          onDelete={onDelete}
          onReplace={onReplace}
          rejection={rejections[file.id] ?? null}
        />
      ))}
    </ul>
  );
}
