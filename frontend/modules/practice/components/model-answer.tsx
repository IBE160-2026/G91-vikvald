import { Trash2 } from "lucide-react";
import { useId, type Ref } from "react";

import { FormulaFlag } from "@/components/formula-flag";
import { iconProps } from "@/components/icon";
import { SourceLink, type Source } from "@/components/source-link";
import { Button } from "@/components/ui/button";
import { SubjectDot } from "@/modules/subjects/components/subject-dot";

type Props = {
  modelAnswer: string;
  source: Source;
  // Shows formula-flag above the source (FR-41).
  formulaFlag?: boolean;
  // The lecture the question was made from.
  lectureName: string;
  // The subject's colour (undefined while the subject is loading: no dot).
  colorIndex?: number;
  // The h3 «Modellsvar»: it can take focus (tabindex -1) and gets it when
  // the model answer is shown (A8).
  titleRef?: Ref<HTMLHeadingElement>;
  // «Slett» (story 8.3): a red text button with a trash can next to the
  // source; it opens the delete confirmation. Left out: no button.
  onDelete?: () => void;
};

// model-answer (DESIGN.md "Øving", mockup 12): a white card (rounded.lg,
// border-card, lift) under the answer field, shown only after «Vis
// modellsvar». The h3 «Modellsvar», the model answer as plain text, a
// hairline, and below it the formula flag (when the question has it), the
// source on the left and the subject dot with the lecture's name on the right
// (wrapping under each other when narrow). Built like explanation-card. With
// onDelete, «Slett» stands right after the source (story 8.3).
export function ModelAnswer({ modelAnswer, source, formulaFlag, lectureName, colorIndex, titleRef, onDelete }: Props) {
  const titleId = useId();
  return (
    <section data-slot="model-answer" aria-labelledby={titleId} className="w-full rounded-lg border border-border-card bg-surface shadow-lift">
      <div className="px-5 pt-4 pb-4">
        <h3 id={titleId} ref={titleRef} tabIndex={-1} className="text-item-title text-ink">
          Modellsvar
        </h3>
        <p className="mt-2 text-body break-words whitespace-pre-line text-ink">{modelAnswer}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-divider px-5 py-3">
        <FormulaFlag flagged={formulaFlag} className="basis-full" />
        {onDelete ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <SourceLink source={source} />
            <Button variant="text" className="text-danger hover:bg-danger-tint" onClick={onDelete}>
              <Trash2 {...iconProps} />
              Slett
            </Button>
          </div>
        ) : (
          <SourceLink source={source} />
        )}
        <p className="flex min-w-0 items-center gap-2 text-caption text-ink-muted">
          {colorIndex === undefined ? null : <SubjectDot colorIndex={colorIndex} />}
          <span className="min-w-0 break-words">{lectureName}</span>
        </p>
      </div>
    </section>
  );
}
