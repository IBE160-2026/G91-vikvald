import * as React from "react";

import { cn } from "@/lib/utils";

// shadcn/ui input, adapted to DESIGN.md "text-field": white, 48 px, rounded.md,
// a 1 px border-control edge. With aria-invalid the edge is 1.5 px danger.
// The global focus ring is kept (nothing removes the outline).
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-field-height w-full min-w-0 rounded-md border border-border-control bg-surface px-3 text-body text-ink",
        "placeholder:text-ink-muted disabled:cursor-not-allowed disabled:opacity-60",
        "aria-invalid:border-[1.5px] aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
