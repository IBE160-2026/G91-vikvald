"use client";

import { useId } from "react";

import { RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export type ChoiceOptionProps = {
  value: string;
  // «Vanlig»
  title: string;
  // «Inntil 20 kort»
  description: string;
  // card (the default): title over the explanation, for cards side by side
  // (scope). row: a full-width row with the explanation after the title
  // (difficulty in «Lag quiz»).
  layout?: "card" | "row";
  className?: string;
};

// choice-option (DESIGN.md "Forms and dialogs", mockup 06): a white card with a
// radio button, a title and an explanation, used inside a RadioGroup. White
// with rounded.option corners and a 1 px border-control edge; the chosen card
// has brand-tint, a 1.5 px brand edge and the filled brand radio button. The
// whole card is a label, so a click anywhere chooses it; the radio button
// itself gets the focus ring, its name from the title and its description
// from the explanation. layout="row" gives a full-width row with the title
// and explanation on one line (wrapping when narrow), for the difficulty rows.
export function ChoiceOption({ value, title, description, layout = "card", className }: ChoiceOptionProps) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <label
      data-slot="choice-option"
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-option border border-border-control bg-surface p-3 " +
          "has-[[data-state=checked]]:border-[1.5px] has-[[data-state=checked]]:border-brand has-[[data-state=checked]]:bg-brand-tint",
        className,
      )}
    >
      <RadioGroupItem value={value} aria-labelledby={titleId} aria-describedby={descriptionId} className="mt-[3px]" />
      <span
        data-layout={layout}
        className={cn("min-w-0", layout === "row" && "flex flex-wrap items-baseline gap-x-3 gap-y-1")}
      >
        <span id={titleId} className={cn("text-item-title text-ink", layout === "row" ? "min-w-[96px]" : "block")}>
          {title}
        </span>
        <span id={descriptionId} className={cn("text-meta text-ink-muted", layout === "row" ? "" : "mt-1 block")}>
          {description}
        </span>
      </span>
    </label>
  );
}
