"use client";

import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// shadcn/ui radio group (Radix), adapted to DESIGN.md "Forms and dialogs": the
// radio button is 18 px with a 1 px border-control edge on white; checked it is
// filled brand with a white dot. The global focus ring is kept (no rule that
// removes the outline). Radix gives role="radiogroup" and role="radio" with
// aria-checked; the arrow keys move both focus and the choice, and Tab enters
// the group on the checked item.
function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root data-slot="radio-group" className={cn("grid gap-3", className)} {...props} />;
}

function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "inline-flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-border-control bg-surface " +
          "disabled:cursor-not-allowed disabled:opacity-60 " +
          "data-[state=checked]:border-brand data-[state=checked]:bg-brand",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator data-slot="radio-group-indicator" className="flex items-center justify-center">
        <span aria-hidden="true" className="block size-[6px] rounded-full bg-on-brand" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
