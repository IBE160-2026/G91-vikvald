import { FormulaFlag } from "@/components/formula-flag";
import { SourceLink, type Source } from "@/components/source-link";
import { SubjectDot } from "@/modules/subjects/components/subject-dot";

type Props = {
  explanation: string;
  source: Source;
  // Shows formula-flag above the source (FR-41).
  formulaFlag?: boolean;
  // The lecture the question was made from.
  lectureName: string;
  // The subject's colour (undefined while the subject is loading: no dot).
  colorIndex?: number;
};

// explanation-card (DESIGN.md "Øving", mockup 09): a white card (rounded.lg,
// border-card, lift) under the options, shown only after the answer is
// confirmed. «Forklaring», the explanation as plain text, a hairline, and
// below it the source on the left and the subject dot with the lecture's name
// on the right (wrapping under each other when narrow).
export function ExplanationCard({ explanation, source, formulaFlag, lectureName, colorIndex }: Props) {
  return (
    <div data-slot="explanation-card" className="w-full rounded-lg border border-border-card bg-surface shadow-lift">
      <div className="px-5 pt-4 pb-4">
        <p className="text-item-title text-ink">Forklaring</p>
        <p className="mt-2 text-body break-words whitespace-pre-line text-ink">{explanation}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-divider px-5 py-3">
        <FormulaFlag flagged={formulaFlag} className="basis-full" />
        <SourceLink source={source} />
        <p className="flex min-w-0 items-center gap-2 text-caption text-ink-muted">
          {colorIndex === undefined ? null : <SubjectDot colorIndex={colorIndex} />}
          <span className="min-w-0 break-words">{lectureName}</span>
        </p>
      </div>
    </div>
  );
}
