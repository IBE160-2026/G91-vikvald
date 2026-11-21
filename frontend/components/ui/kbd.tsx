import * as React from "react";

import { cn } from "@/lib/utils";

// shadcn/ui kbd, adapted to DESIGN.md "kbd": a small white key with a thin
// border-card edge, rounded.kbd and the kbd type (12 px / 500) in ink. Used in
// the shortcut hints under the card and in the shortcut dialog.
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-[20px] w-fit min-w-[20px] items-center justify-center rounded-kbd border border-border-card bg-surface px-1 font-sans text-kbd text-ink select-none",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
