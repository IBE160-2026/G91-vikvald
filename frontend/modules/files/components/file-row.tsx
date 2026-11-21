import { CircleAlert, FileText, RotateCw, Trash2 } from "lucide-react";
import { useRef } from "react";

import { iconProps } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { pageCountLabel } from "@/modules/subjects/format";

import { formatUploadedDayMonth } from "../format";
import type { UploadedFile } from "../types";

type Props = {
  file: UploadedFile;
  onDelete: (file: UploadedFile) => void;
  // A new version was picked for this file.
  onReplace: (file: UploadedFile, replacement: File) => void;
  // «<new filename>: <message>» after a rejected replacement, or null.
  rejection?: string | null;
};

// file-row (DESIGN.md "Forelesning", mockup 04): at least 80 px high, the file icon on a
// brand-tint tile, the filename (15 px / 600, cut off with «…»; the whole name
// stays in the DOM for screen readers and in the tooltip), «12 sider · lastet
// opp 11.09» in muted grey, then the text buttons «Erstatt» (ultramarine,
// circle arrow) and «Slett» (red, bin). Their accessible names are «Erstatt
// <filename>» and «Slett <filename>», so each row's buttons can be told apart.
//
// «Erstatt» opens a hidden file input (one file, no accept filter, so a file
// that is not a PDF gets its own message). A cancelled picker does nothing
// (E18). Under the row is a live region, always there, that shows the message
// for a rejected replacement (E17).
export function FileRow({ file, onDelete, onReplace, rejection = null }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <li className="px-4">
      <div className="flex min-h-file-row items-center gap-3 py-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-tint text-brand">
          <FileText {...iconProps} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-label text-ink" title={file.original_name}>
            {file.original_name}
          </p>
          <p className="truncate text-meta text-ink-muted">
            {pageCountLabel(file.page_count)} · lastet opp {formatUploadedDayMonth(file.uploaded_at)}
          </p>
        </div>
        <Button variant="text" className="shrink-0" onClick={() => inputRef.current?.click()}>
          <RotateCw {...iconProps} />
          {/* Seen: «Erstatt». Heard: «Erstatt <filename>». */}
          <span aria-hidden="true">Erstatt</span>
          <span className="sr-only">Erstatt {file.original_name}</span>
        </Button>
        <input
          ref={inputRef}
          type="file"
          hidden
          data-testid={`replace-input-${file.id}`}
          onChange={(event) => {
            const replacement = event.target.files?.[0];
            // Empty the input, so choosing the same file again also counts.
            event.target.value = "";
            if (replacement) onReplace(file, replacement);
          }}
        />
        <Button
          variant="text"
          className="shrink-0 text-danger hover:bg-danger-tint"
          onClick={() => onDelete(file)}
        >
          <Trash2 {...iconProps} />
          {/* Seen: «Slett». Heard: «Slett <filename>» (one text, so the space is kept). */}
          <span aria-hidden="true">Slett</span>
          <span className="sr-only">Slett {file.original_name}</span>
        </Button>
      </div>
      <div aria-live="polite" className="not-empty:pb-4">
        {rejection ? (
          <p className="flex items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger">
            <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
            <span className="min-w-0 break-words">{rejection}</span>
          </p>
        ) : null}
      </div>
    </li>
  );
}
