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
  className?: string;
};

// choice-option (DESIGN.md "Forms and dialogs", mockup 06): a white card with a
// radio button, a title and an explanation, used inside a RadioGroup. White
// with rounded.option corners and a 1 px border-control edge; the chosen card
// has brand-tint, a 1.5 px brand edge and the filled brand radio button. The
// whole card is a label, so a click anywhere chooses it; the radio button
// itself gets the focus ring, its name from the title and its description
// from the explanation.
export function ChoiceOption({ value, title, description, className }: ChoiceOptionProps) {
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
      <span className="min-w-0">
        <span id={titleId} className="block text-item-title text-ink">
          {title}
        </span>
        <span id={descriptionId} className="mt-1 block text-meta text-ink-muted">
          {description}
        </span>
      </span>
    </label>
  );
}
