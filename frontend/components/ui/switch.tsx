"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// shadcn/ui switch (Radix), adapted to DESIGN.md: off is white with a
// border-control edge (3.2:1, WCAG 1.4.11) and a border-control knob; on is
// filled brand with a white knob. The global focus ring is kept. Radix renders
// a button with role="switch" and aria-checked, toggled with Space and Enter.
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-[24px] w-[40px] shrink-0 cursor-pointer items-center rounded-full border border-border-control bg-surface p-[2px] " +
          "disabled:cursor-not-allowed disabled:opacity-60 " +
          "data-[state=checked]:border-brand data-[state=checked]:bg-brand",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={
          "pointer-events-none block size-[18px] rounded-full bg-border-control transition-transform motion-reduce:transition-none " +
          "data-[state=checked]:translate-x-[16px] data-[state=checked]:bg-on-brand data-[state=unchecked]:translate-x-0"
        }
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
