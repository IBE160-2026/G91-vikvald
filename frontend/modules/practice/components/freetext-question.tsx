"use client";

import { Check, Trash2, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { iconProps } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import type { FreetextQuestion as FreetextQuestionData, Mark } from "../types";
import { PartialIcon } from "./answer-grid";
import { ModelAnswer } from "./model-answer";
import { ShortcutHints, freetextHints } from "./shortcut-hints";

// True when the answer has something other than spaces and line breaks (E28):
// only then can she see the model answer.
export function hasAnswer(text: string): boolean {
  return text.trim().length > 0;
}

// The words in her answer: the parts between spaces and line breaks.
// «  To  ord\nher » has 3.
export function wordCount(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

// The three self-assessment buttons, in the mockup's order (1, 2, 3).
export const ASSESSMENTS: readonly { mark: Mark; label: string }[] = [
  { mark: "missed", label: "Feil" },
  { mark: "partial", label: "Delvis riktig" },
  { mark: "known", label: "Riktig" },
];

function AssessmentIcon({ mark }: { mark: Mark }) {
  if (mark === "partial") return <PartialIcon />;
  const Icon = mark === "known" ? Check : X;
  return (
    <Icon
      size={16}
      strokeWidth={1.5}
      absoluteStrokeWidth
      aria-hidden="true"
      focusable={false}
      className={mark === "known" ? "text-success" : "text-danger"}
    />
  );
}

type Props = {
  question: FreetextQuestionData;
  // The question's number in the session («SPØRSMÅL 2 AV 10») and the total.
  number: number;
  total: number;
  // «Vis modellsvar» has been pressed for this question.
  revealed: boolean;
  onReveal: () => void;
  // Her self-assessment: «Feil» (missed), «Delvis riktig» (partial) or «Riktig» (known).
  onAssess: (mark: Mark) => void;
  // The hint line under the self-assessment (the switch «Bruk hurtigtaster» is on).
  showHints?: boolean;
  colorIndex?: number;
  // «Slett» (story 8.3): opens the delete confirmation. Left out: no button.
  onDelete?: () => void;
};

// The question in the free-text session (story 8.2, mockup 12), in the 832 px
// quiz column: the overline «SPØRSMÅL 2 AV 10», the question in quiz-question
// (an h2), and the answer field with the visible label «Ditt svar». Focus is
// in the field when the question appears (the page gives each question its
// own key, so her text never follows her to the next question). Her answer
// lives only in this component's state: it is never sent or saved.
//
// «Vis modellsvar» (primary, 48 px) is not active before the field has a
// character that is not a space or a line break (E28). Pressed: the field is
// locked (readOnly), «Levert · N ord» stands to the right of the label, the
// model-answer card is shown and its h3 «Modellsvar» gets focus (A8), and the
// self-assessment follows: the h3 «Hvordan gikk det?», «Vurder selv mot
// modellsvaret.» and three equal outline buttons «Feil», «Delvis riktig» and
// «Riktig» (✗, ◐, ✓ as decoration), none chosen beforehand. A press calls
// onAssess; the page moves on at once. The hint line «1 Feil · 2 Delvis
// riktig · 3 Riktig · Esc avslutt» stands under the buttons, to the right.
//
// With onDelete (story 8.3): «Slett», a red text button with a trash can,
// stands to the left of «Vis modellsvar» before the model answer is shown,
// and in the model-answer footer by the source afterwards. It has no key.
export function FreetextQuestion({
  question,
  number,
  total,
  revealed,
  onReveal,
  onAssess,
  showHints = false,
  colorIndex,
  onDelete,
}: Props) {
  const [answer, setAnswer] = useState("");
  const fieldId = useId();
  const deliveredId = useId();
  const assessTitleId = useId();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const modelTitleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Only when this question appears (the page gives each question its own key).
    fieldRef.current?.focus();
  }, []);

  useEffect(() => {
    if (revealed) modelTitleRef.current?.focus();
  }, [revealed]);

  const canReveal = hasAnswer(answer);

  return (
    <div data-slot="freetext-question" className="flex w-full max-w-quiz-column flex-col">
      <p className="text-overline text-ink-muted">
        SPØRSMÅL {number} AV {total}
      </p>
      <h2
        tabIndex={-1}
        data-question-title
        className="mt-2 text-quiz-question break-words whitespace-pre-line text-ink"
      >
        {question.question}
      </h2>
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <label htmlFor={fieldId} className="text-label text-ink">
          Ditt svar
        </label>
        {revealed ? (
          <p id={deliveredId} className="text-meta text-ink-muted">
            Levert · {wordCount(answer)} ord
          </p>
        ) : null}
      </div>
      <Textarea
        ref={fieldRef}
        id={fieldId}
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        readOnly={revealed}
        aria-describedby={revealed ? deliveredId : undefined}
        data-answer-field
        className="mt-2 min-h-[112px]"
      />
      {revealed ? (
        <>
          <div className="mt-6">
            <ModelAnswer
              modelAnswer={question.model_answer}
              source={question.source}
              formulaFlag={question.formula_flag}
              lectureName={question.lecture.name}
              colorIndex={colorIndex}
              titleRef={modelTitleRef}
              onDelete={onDelete}
            />
          </div>
          <section
            data-slot="self-assessment"
            aria-labelledby={assessTitleId}
            className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3"
          >
            <div className="min-w-0">
              <h3 id={assessTitleId} className="text-item-title text-ink">
                Hvordan gikk det?
              </h3>
              <p className="mt-1 text-body-sm text-ink-muted">Vurder selv mot modellsvaret.</p>
            </div>
            <div className="ml-auto flex flex-wrap gap-3">
              {ASSESSMENTS.map((item) => (
                <Button
                  key={item.mark}
                  variant="outline"
                  size="lg"
                  className="min-w-[167px]"
                  data-mark={item.mark}
                  onClick={() => onAssess(item.mark)}
                >
                  <AssessmentIcon mark={item.mark} />
                  {item.label}
                </Button>
              ))}
            </div>
          </section>
          {showHints ? (
            <div className="mt-4">
              <ShortcutHints hints={freetextHints} align="end" />
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          {onDelete ? (
            <Button variant="text" className="text-danger hover:bg-danger-tint" onClick={onDelete}>
              <Trash2 {...iconProps} />
              Slett
            </Button>
          ) : null}
          <Button size="lg" disabled={!canReveal} onClick={onReveal}>
            Vis modellsvar
          </Button>
        </div>
      )}
    </div>
  );
}
