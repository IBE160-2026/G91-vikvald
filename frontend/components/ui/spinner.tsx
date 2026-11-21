import type * as React from "react";

import { cn } from "@/lib/utils";

// shadcn/ui spinner, adapted to DESIGN.md "job-status": a ring in
// progress-track with an arc in brand on top. It turns only when the student
// has not asked for less motion (motion-safe). It is decoration: the text next
// to it says what is going on, so screen readers skip it.
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      data-slot="spinner"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("size-6 shrink-0 motion-safe:animate-spin", className)}
      {...props}
    >
      <circle cx="12" cy="12" r="9" stroke="var(--color-progress-track)" strokeWidth="3" />
      <path d="M12 3a9 9 0 0 1 9 9" stroke="var(--color-brand)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export { Spinner };
