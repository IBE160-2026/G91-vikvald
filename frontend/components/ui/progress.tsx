"use client";

import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// shadcn/ui progress, adapted to DESIGN.md: a 4 px bar with rounded.xs, brand
// on progress-track (session-panel). No transition, so nothing moves on its own.
// Give it a name with aria-label or aria-labelledby.
function Progress({ className, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn("relative h-1 w-full overflow-hidden rounded-xs bg-progress-track", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full rounded-xs bg-brand"
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
