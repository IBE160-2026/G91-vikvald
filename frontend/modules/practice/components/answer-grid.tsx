import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";

import type { PracticeAdapter } from "../adapter";
import type { GridCell } from "../session";
import type { Mark } from "../types";

// Above this many cards the grid (and its legend) is not shown; the counter,
// the progress bar and the counts line are enough.
export const GRID_MAX_CARDS = 120;

// «Delvis riktig» has no colour of its own (DESIGN.md): ink on surface-partial,
// told apart from ✓ and ✗ by its shape.
export const MARK_CLASSES: Record<Mark, string> = {
  known: "bg-success-tint text-success",
  partial: "bg-surface-partial text-ink",
  missed: "bg-danger-tint text-danger",
};

// The half-filled circle (◐) for «Delvis riktig», drawn as in mockup 12: a
// ring with its left half filled, in the current colour.
export function PartialIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden="true"
      focusable={false}
      data-icon="partial"
    >
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 2.5a5.5 5.5 0 0 0 0 11z" fill="currentColor" stroke="none" />
    </svg>
  );
}

// The ✓, ◐ or ✗ in a cell or a legend box (2 px line, as in mockup 07).
export function MarkIcon({ mark }: { mark: Mark }) {
  if (mark === "partial") return <PartialIcon />;
  const Icon = mark === "known" ? Check : X;
  return <Icon size={16} strokeWidth={2} absoluteStrokeWidth aria-hidden="true" focusable={false} />;
}

// answer-grid (DESIGN.md "Øktpanel", mockup 07): six cells per row, 35 px with
// 6 px between, rounded.sm. Not buttons. The first mark gives ✓ on
// success-tint or ✗ on danger-tint; the current card is white with a 1.5 px
// brand border and its number (aria-current="step"); a card not shown yet is
// empty with a border-card edge and its number. A free-text question
// assessed as «Delvis riktig» gets ◐ in ink on surface-partial. A repeated current card keeps
// its ✗ and gets the brand border. Each cell is read as hidden text («Kort 4:
// kunne ikke», for quiz «Spørsmål 4: feil»); what is seen is aria-hidden.
export function AnswerGrid({ cells, adapter }: { cells: GridCell[]; adapter: PracticeAdapter }) {
  return (
    <ol data-slot="answer-grid" className="grid grid-cols-[repeat(6,var(--spacing-grid-cell))] gap-grid-gap">
      {cells.map((cell) => {
        const text = cell.mark
          ? `${adapter.itemLabel} ${cell.number}: ${adapter.cellText(cell.mark)}`
          : cell.current
            ? `${adapter.itemLabel} ${cell.number}`
            : `${adapter.itemLabel} ${cell.number}: ${adapter.cellText("unseen")}`;
        return (
          <li
            key={cell.id}
            data-mark={cell.mark ?? undefined}
            aria-current={cell.current ? "step" : undefined}
            className={cn(
              "flex size-grid-cell items-center justify-center rounded-sm",
              cell.mark
                ? MARK_CLASSES[cell.mark]
                : cell.current
                  ? "bg-surface text-caption font-semibold text-brand"
                  : "border border-border-card text-kbd font-normal text-ink-muted",
              cell.current && "border-[1.5px] border-brand",
            )}
          >
            <span className="sr-only">{text}</span>
            <span aria-hidden="true" className="flex">
              {cell.mark ? <MarkIcon mark={cell.mark} /> : cell.number}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
