"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// After confirmation: the correct option, the wrong one she chose, or neither.
export type QuizOptionResult = "correct" | "wrong" | null;

type Props = {
  // The option's place (0–3) as a string, the radio group's value.
  value: string;
  // «A»–«D».
  letter: string;
  text: string;
  // null before confirmation: then nothing in the DOM says which is correct (SK-5).
  result: QuizOptionResult;
};

// quiz-option (DESIGN.md "Øving", mockup 09): a 62 px row with a letter box
// (A–D) and the text, a radio in the quiz's radio group (Radix, used directly
// with its own look). White with a 1 px border-control edge and rounded.option.
// Chosen but not confirmed: brand-tint with a 1.5 px brand edge, as
// choice-option. After confirmation (the group is disabled): the correct
// option gets success-tint, a 1.5 px success edge and «✓ Riktig svar» on the
// right; the wrong one she chose gets danger-tint, a 1.5 px danger edge and
// «✗ Ditt svar». The others stay as they are. The symbols are aria-hidden;
// the text is read as part of the option's name.
export function QuizOption({ value, letter, text, result }: Props) {
  return (
    <RadioGroupPrimitive.Item
      value={value}
      data-slot="quiz-option"
      data-result={result ?? undefined}
      className={cn(
        "flex min-h-[62px] w-full cursor-pointer items-center gap-3 rounded-option border border-border-control bg-surface px-4 py-3 text-left shadow-lift",
        "disabled:cursor-default",
        result === null &&
          "data-[state=checked]:border-[1.5px] data-[state=checked]:border-brand data-[state=checked]:bg-brand-tint",
        result === "correct" && "border-[1.5px] border-success bg-success-tint",
        result === "wrong" && "border-[1.5px] border-danger bg-danger-tint",
      )}
    >
      <span
        data-slot="quiz-option-letter"
        className="flex size-[32px] shrink-0 items-center justify-center rounded-md border border-border-control bg-surface text-label text-ink"
      >
        {letter}
      </span>{" "}
      <span className={cn("min-w-0 flex-1 text-body break-words text-ink", result === "correct" && "font-semibold")}>
        {text}
      </span>{" "}
      {result === "correct" ? (
        <span className="shrink-0 text-meta-strong text-success">
          <span aria-hidden="true">✓ </span>Riktig svar
        </span>
      ) : result === "wrong" ? (
        <span className="shrink-0 text-meta-strong text-danger">
          <span aria-hidden="true">✗ </span>Ditt svar
        </span>
      ) : null}
    </RadioGroupPrimitive.Item>
  );
}
