import { FileText } from "lucide-react";

import { iconProps } from "@/components/icon";
import { pageCountLabel } from "@/modules/subjects/format";

import { formatUploadedDayMonth } from "../format";
import type { UploadedFile } from "../types";

// file-row (DESIGN.md "Forelesning", mockup 04): 80 px high, the file icon on a
// brand-tint tile, the filename (15 px / 600, cut off with «…»; the whole name
// stays in the DOM for screen readers and in the tooltip), and «12 sider ·
// lastet opp 11.09» in muted grey. «Slett» and «Erstatt» come in stories 2.5 and 2.6.
export function FileRow({ file }: { file: UploadedFile }) {
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
    </li>
  );
}
