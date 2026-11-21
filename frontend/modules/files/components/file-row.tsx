import { FileText, Trash2 } from "lucide-react";

import { iconProps } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { pageCountLabel } from "@/modules/subjects/format";

import { formatUploadedDayMonth } from "../format";
import type { UploadedFile } from "../types";

// file-row (DESIGN.md "Forelesning", mockup 04): 80 px high, the file icon on a
// brand-tint tile, the filename (15 px / 600, cut off with «…»; the whole name
// stays in the DOM for screen readers and in the tooltip), «12 sider · lastet
// opp 11.09» in muted grey, and the red text button «Slett» with a bin. Its
// accessible name is «Slett <filename>», so each row's button can be told
// apart. «Erstatt» comes in story 2.6.
export function FileRow({ file, onDelete }: { file: UploadedFile; onDelete: (file: UploadedFile) => void }) {
  return (
    <li className="flex h-file-row items-center gap-3 px-4">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-tint text-brand">
        <FileText {...iconProps} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-label text-ink" title={file.original_name}>
          {file.original_name}
        </p>
        <p className="text-meta text-ink-muted">
          {pageCountLabel(file.page_count)} · lastet opp {formatUploadedDayMonth(file.uploaded_at)}
        </p>
      </div>
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
    </li>
  );
}
