import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

// shadcn/ui button, adapted to DESIGN.md "Buttons": the four styles primary,
// outline, text and danger, 40 px high (48 px for the large size), rounded.md.
// Only the colours from DESIGN.md, and the global focus ring is kept (no
// rule that removes the outline).
const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-label " +
    "disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 " +
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // button-primary: brand colour, white text. At most one per row or section.
        primary: "bg-brand text-on-brand hover:bg-brand/90",
        // button-outline: white with a border-control edge and ink text.
        outline: "border border-border-control bg-surface text-ink shadow-lift hover:bg-row-hover",
        // button-text: brand-coloured text, brand-tint behind it on hover. No underline.
        text: "bg-transparent px-2 text-brand hover:bg-brand-tint",
        // button-danger: only in delete confirmations.
        danger: "bg-danger text-on-danger hover:bg-danger/90",
      },
      size: {
        md: "h-button-height",
        lg: "h-button-height-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant = "primary",
  size = "md",
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      // A plain button never submits a form by accident (type="submit" must be asked for).
      type={asChild ? type : (type ?? "button")}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
