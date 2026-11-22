import { useId } from "react";

import { SourceLink, type Source } from "@/components/source-link";

export type MissedItem = {
  id: string;
  // The card's number in the answer grid.
  number: number;
  // The question (the card's front).
  front: string;
  source: Source;
};

// missed-list (DESIGN.md "Resultat", mockup 08): the h3 «Kortene du ikke
// kunne» with «N kort» in muted text, and one white card with a row per card
// in the answer grid's order: the number in the grid, the question and the
// source. The page shows it only when at least one card was «Kunne ikke».
export function MissedList({ items }: { items: readonly MissedItem[] }) {
  const titleId = useId();
  return (
    <section data-slot="missed-list" aria-labelledby={titleId} className="w-full">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h3 id={titleId} className="text-section-title text-ink">
          Kortene du ikke kunne
        </h3>
        <p className="text-body-sm text-ink-muted">{items.length} kort</p>
      </div>
      <ul className="mt-3 divide-y divide-divider rounded-lg border border-border-card bg-surface shadow-lift">
        {items.map((item) => (
          <li key={item.id} className="flex min-h-[56px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
            <span className="w-6 shrink-0 text-right text-meta-strong text-ink-muted">
              <span className="sr-only">Kort </span>
              {item.number}
              <span className="sr-only">:</span>
            </span>
            <p className="min-w-0 flex-1 text-body-sm font-medium break-words text-ink">{item.front}</p>
            <SourceLink source={item.source} className="ml-10 sm:ml-0" />
          </li>
        ))}
      </ul>
    </section>
  );
}
