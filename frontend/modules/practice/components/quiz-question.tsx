"use client";

import { ArrowRight } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";

import { iconProps } from "@/components/icon";
import { Button } from "@/components/ui/button";

import type { QuizQuestion as QuizQuestionData } from "../types";
import { ExplanationCard } from "./explanation-card";
import { QuizOption } from "./quiz-option";
import { ShortcutHints, quizHints } from "./shortcut-hints";

export const LETTERS = "ABCD";

// The status text after confirmation (UX-DR44): what is seen, and what only a
// screen reader hears after it.
export function confirmedStatus(selected: number, correctIndex: number): { seen: string; hidden: string } {
  return {
    seen: `Du svarte ${LETTERS[selected]}. Svaret er bekreftet.`,
    hidden: selected === correctIndex ? " Riktig." : ` Feil. Riktig svar er ${LETTERS[correctIndex]}.`,
  };
}

type Props = {
  question: QuizQuestionData;
  // The question's number in the session («SPØRSMÅL 4 AV 15») and the total.
  number: number;
  total: number;
  // The chosen option (0–3), or null.
  selected: number | null;
  confirmed: boolean;
  // The last question: «Se resultatet» instead of «Neste spørsmål».
  last: boolean;
  onSelect: (index: number) => void;
  onConfirm: () => void;
  onNext: () => void;
  // Put focus on the question (h2) when it appears. Not on the first question.
  focusOnMount?: boolean;
  // The hint line (the switch «Bruk hurtigtaster» is on).
  showHints?: boolean;
  colorIndex?: number;
};

// The question in the quiz (story 4.2, mockup 09), in the 832 px quiz column:
// the overline «SPØRSMÅL 4 AV 15», the question in quiz-question (an h2 that
// can take focus), and a radio group named by the question with four
// quiz-option rows. The choice can be changed freely until it is confirmed;
// before that nothing in the DOM says which option is correct, and there is
// no explanation (SK-5).
//
// «Bekreft svar» (primary, 48 px) is not active before a choice. Confirmed:
// the group is locked (disabled), the options show «✓ Riktig svar» and
// «✗ Ditt svar», the status region says «Du svarte C. Svaret er bekreftet.»
// (and, hidden, « Riktig.» or « Feil. Riktig svar er B.»), the explanation card
// is shown, and the button becomes «Neste spørsmål» (with an arrow; on the
// last question «Se resultatet») and gets focus (UX-DR31).
//
// Enter inside the radio group confirms (Radix stops Enter on the radios, so
// the group handles it itself), never a held Enter (repeat). The next button
// ignores a held Enter as well, so a held key never confirms and moves on in
// one press (E26). The status region is mounted from the start and empty
// before confirmation; focus is never moved by it.
export function QuizQuestion({
  question,
  number,
  total,
  selected,
  confirmed,
  last,
  onSelect,
  onConfirm,
  onNext,
  focusOnMount = false,
  showHints = false,
  colorIndex,
}: Props) {
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Only when this question appears (the page gives each question its own key).
    if (focusOnMount) titleRef.current?.focus();
  }, [focusOnMount]);

  useEffect(() => {
    if (confirmed) buttonRef.current?.focus();
  }, [confirmed]);

  function groupKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" || event.repeat || confirmed || selected === null) return;
    event.preventDefault();
    onConfirm();
  }

  function nextKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    // A held Enter (from confirming) must not move on as well.
    if (event.key === "Enter" && event.repeat) event.preventDefault();
  }

  const status = confirmed && selected !== null ? confirmedStatus(selected, question.correct_index) : null;
  const hintStep = !confirmed ? "confirm" : last ? "result" : "next";

  return (
    <div data-slot="quiz-question" className="flex w-full max-w-quiz-column flex-col">
      <p className="text-overline text-ink-muted">
        SPØRSMÅL {number} AV {total}
      </p>
      <h2
        ref={titleRef}
        id={titleId}
        tabIndex={-1}
        className="mt-2 text-quiz-question break-words whitespace-pre-line text-ink"
      >
        {question.question}
      </h2>
      <RadioGroupPrimitive.Root
        aria-labelledby={titleId}
        value={selected === null ? "" : String(selected)}
        onValueChange={(value) => onSelect(Number(value))}
        disabled={confirmed}
        onKeyDown={groupKeyDown}
        className="mt-5 flex flex-col gap-3"
      >
        {question.options.map((option, index) => (
          <QuizOption
            key={index}
            value={String(index)}
            letter={LETTERS[index]}
            text={option}
            result={
              !confirmed
                ? null
                : index === question.correct_index
                  ? "correct"
                  : index === selected
                    ? "wrong"
                    : null
            }
          />
        ))}
      </RadioGroupPrimitive.Root>
      <p role="status" className="mt-3 min-h-[21px] text-meta text-ink-muted">
        {status ? (
          <>
            {status.seen}
            <span className="sr-only">{status.hidden}</span>
          </>
        ) : null}
      </p>
      {confirmed ? (
        <div className="mt-3">
          <ExplanationCard
            explanation={question.explanation}
            source={question.source}
            lectureName={question.lecture.name}
            colorIndex={colorIndex}
          />
        </div>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">{showHints ? <ShortcutHints hints={quizHints(hintStep)} align="start" /> : null}</div>
        {confirmed ? (
          <Button ref={buttonRef} size="lg" className="ml-auto" onClick={onNext} onKeyDown={nextKeyDown}>
            {last ? (
              "Se resultatet"
            ) : (
              <>
                Neste spørsmål
                <ArrowRight {...iconProps} />
              </>
            )}
          </Button>
        ) : (
          <Button size="lg" className="ml-auto" disabled={selected === null} onClick={onConfirm}>
            Bekreft svar
          </Button>
        )}
      </div>
    </div>
  );
}
