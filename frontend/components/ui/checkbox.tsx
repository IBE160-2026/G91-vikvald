"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// shadcn/ui checkbox (Radix), adapted to DESIGN.md "Forms and dialogs":
// 20 px, rounded.kbd. Empty: white with a 1 px border-control edge. Checked:
// filled brand with a white tick. The global focus ring is kept (no rule that
// removes the outline). Radix renders a real button with role="checkbox" and
// aria-checked, toggled with Space.
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-[20px] shrink-0 cursor-pointer rounded-kbd border border-border-control bg-surface " +
          "disabled:cursor-not-allowed disabled:opacity-60 " +
          "data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-on-brand",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="grid place-content-center text-current">
        <CheckIcon size={14} strokeWidth={2} aria-hidden focusable={false} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
