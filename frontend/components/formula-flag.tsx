import { Info } from "lucide-react";

import { NoteSurface } from "@/components/note-surface";
import { cn } from "@/lib/utils";

// The exact text (UX-DR37, FR-41).
export const FORMULA_FLAG_TEXT = "Inneholder formel – sjekk mot kilden";

// formula-flag (DESIGN.md, UX-DR37): content made from a page with a formula
// the text may lack, or where the model reported something missing. The note
// surface with the info icon, never orange or red, placed directly above the
// source link. Plain text, so screen readers read it with the content. Shared
// by the flashcard, the quiz explanation and both missed lists. Shows nothing
// when the content is not flagged.
export function FormulaFlag({ flagged, className }: { flagged: boolean | undefined; className?: string }) {
  if (!flagged) return null;
  return (
    <div data-slot="formula-flag" className={cn("min-w-0", className)}>
      <NoteSurface icon={Info} className="py-2">
        {FORMULA_FLAG_TEXT}
      </NoteSurface>
    </div>
  );
}
