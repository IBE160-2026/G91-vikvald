import * as React from "react";

import { cn } from "@/lib/utils";

// shadcn/ui textarea, adapted to DESIGN.md "text-field" like ui/input.tsx:
// white, rounded.md, a 1 px border-control edge, body text in ink. At least
// as tall as a field (48 px) and growing with the text. With aria-invalid the
// edge is 1.5 px danger. The global focus ring is kept (nothing removes the
// outline).
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content min-h-24 w-full min-w-0 rounded-md border border-border-control bg-surface px-3 py-3 text-body text-ink",
        "placeholder:text-ink-muted disabled:cursor-not-allowed disabled:opacity-60",
        "aria-invalid:border-[1.5px] aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
