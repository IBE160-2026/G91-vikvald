import { CircleAlert } from "lucide-react";
import { Fragment, type ReactNode } from "react";

import { iconProps } from "@/components/icon";
import { FALLBACK_MESSAGE } from "@/lib/messages";

// One practice type in the card: «Flashcards», «120 kort fra 6 forelesninger»
// and its button. Quiz and free-text rows are added the same way later.
export type PracticeAllRow = {
  // Stable and unique within the card (e.g. "flashcards").
  id: string;
  title: string;
  scope: string;
  action: ReactNode;
};

type Props = {
  rows: readonly PracticeAllRow[];
  // A query behind the rows failed: the fallback text in role="alert".
  error?: boolean;
};

// practice-all-card (DESIGN.md "Oversikt", mockup 03): the h2 «Øv på hele
// emnet» (like «Forelesninger») over a white card with one row per practice
// type, split by hairlines. A row has the title (item-title), the scope under
// it in muted grey, and the action: under them in a narrow card (stretched to
// the card's width, as in the mockup), to the right in a wide one (container
// query on the card). No rows and no error: nothing at all, neither heading
// nor card.
export function PracticeAllCard({ rows, error = false }: Props) {
  if (rows.length === 0 && !error) return null;
  return (
    <section aria-labelledby="practice-all-heading">
      <h2 id="practice-all-heading" className="text-section-title">
        Øv på hele emnet
      </h2>
      <div className="mt-3">
        {error ? (
          <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger">
            <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
            <span>{FALLBACK_MESSAGE}</span>
          </p>
        ) : null}
        {rows.length > 0 ? (
          <div
            data-slot="practice-all-card"
            className="@container rounded-lg border border-border-card bg-surface p-6 shadow-lift"
          >
            {rows.map((row, index) => (
              <Fragment key={row.id}>
                {index > 0 ? <hr className="my-5 border-divider" /> : null}
                <div
                  data-slot="practice-all-row"
                  className="flex flex-col gap-4 @md:flex-row @md:items-center @md:justify-between"
                >
                  <div className="min-w-0">
                    <h3 className="text-item-title">{row.title}</h3>
                    <p className="mt-1 text-body-sm text-ink-muted">{row.scope}</p>
                  </div>
                  <div className="flex shrink-0 flex-col">{row.action}</div>
                </div>
              </Fragment>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
