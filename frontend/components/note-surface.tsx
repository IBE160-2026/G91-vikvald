import { Lock, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { iconProps } from "@/components/icon";
import { cn } from "@/lib/utils";

// note-surface (DESIGN.md "Forelesning"): calm information on surface-note with
// rounded.option corners, a lock or info icon and muted text. Shared by the
// lecture page (privacy note, «fewer than chosen») and later the model card and
// the summary. Never used for errors: those have their own red style.
export function NoteSurface({
  children,
  className,
  icon: Icon = Lock,
}: {
  children: ReactNode;
  className?: string;
  // The lock (default) for privacy, Info for a message about a result.
  icon?: LucideIcon;
}) {
  return (
    <div
      data-slot="note-surface"
      className={cn("flex items-start gap-3 rounded-option bg-surface-note px-3 py-3 text-meta text-ink-muted", className)}
    >
      <Icon {...iconProps} className="mt-[3px] shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
