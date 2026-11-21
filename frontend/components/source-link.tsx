import { FileText } from "lucide-react";

import { iconProps } from "@/components/icon";
import { cn } from "@/lib/utils";

export type Source = {
  file_name: string;
  // The PDF's own page number, starting at 1.
  page_no: number;
};

// source-link (DESIGN.md "Skjema og dialoger"): the file icon and
// «merkevare-notater.pdf, side 4» in caption, ink. In the MVP the source is
// plain text, not a link, so it has no underline and cannot take focus.
// Shared by the flashcard and later the quiz explanation and model answers.
export function SourceLink({ source, className }: { source: Source; className?: string }) {
  return (
    <p data-slot="source-link" className={cn("flex items-start gap-2 text-caption text-ink", className)}>
      <FileText {...iconProps} className="mt-[2px] shrink-0" />
      <span className="min-w-0 break-words">
        {source.file_name}, side {source.page_no}
      </span>
    </p>
  );
}
