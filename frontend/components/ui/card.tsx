import * as React from "react";

import { cn } from "@/lib/utils";

// shadcn/ui card (added with the CLI), adapted to DESIGN.md "card": a white
// surface, a 1 px border-card edge, rounded.lg and the `lift` shadow. Only the
// card itself is kept; the content inside is laid out by each component. The
// CLI also added the npm package «cn» and imported from it; that was removed
// (the app's own cn in lib/utils is used, no new package).
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("flex flex-col rounded-lg border border-border-card bg-surface p-4 text-ink shadow-lift", className)}
      {...props}
    />
  );
}

export { Card };
