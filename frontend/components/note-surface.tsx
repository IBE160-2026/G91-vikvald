import { Lock } from "lucide-react";
import type { ReactNode } from "react";

import { iconProps } from "@/components/icon";
import { cn } from "@/lib/utils";

// note-surface (DESIGN.md "Forelesning"): calm information on surface-note with
// rounded.option corners, a lock icon and muted text. Shared by the lecture
// page (privacy note) and later the model card and the summary. Never used for
// errors: those have their own red style.
export function NoteSurface({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      data-slot="note-surface"
      className={cn("flex items-start gap-3 rounded-option bg-surface-note px-3 py-3 text-meta text-ink-muted", className)}
    >
      <Lock {...iconProps} className="mt-[3px] shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
