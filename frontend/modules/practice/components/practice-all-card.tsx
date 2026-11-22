import { CircleAlert } from "lucide-react";
import { Fragment, type ReactNode } from "react";

import { iconProps } from "@/components/icon";
import { FALLBACK_MESSAGE } from "@/lib/messages";

import type { LastSessionLines } from "../last-session";

// One practice type in the card: «Flashcards», «120 kort fra 6 forelesninger»
// and its button. Quiz is added the same way, free text later.
export type PracticeAllRow = {
  // Stable and unique within the card (e.g. "flashcards").
  id: string;
  title: string;
  scope: string;
  action: ReactNode;
  // Always on one line, with the action to the right, also in a narrow card
  // (a short text button like «Start ›», mockup 03).
  inline?: boolean;
};

type Props = {
  rows: readonly PracticeAllRow[];
  // A query behind the rows failed: the fallback text in role="alert".
  error?: boolean;
  // SISTE ØKT at the bottom (story 5.1), already as text (last-session.ts).
  // Left out when the subject has no sessions.
  lastSession?: LastSessionLines | null;
};

// practice-all-card (DESIGN.md "Oversikt", mockup 03): the h2 «Øv på hele
// emnet» (like «Forelesninger») over a white card with one row per practice
// type, split by hairlines. A row has the title (item-title), the scope under
// it in muted grey, and the action: under them in a narrow card (stretched to
// the card's width, as in the mockup), to the right in a wide one (container
// query on the card). An inline row keeps its action to the right at every
// width. No rows and no error: nothing at all, neither heading
// nor card.
//
// SISTE ØKT (UX-DR14, mockup 03) stands at the bottom of the card, under a
// hairline: the overline SISTE ØKT (an h3 «Siste økt» for screen readers), the
// type and scope («Quiz · Uke 37: Merkevare») and the date and result
// («09.11 · 12 av 15 riktige»). It is shown only inside the card, so only when
// the card has at least one row.
export function PracticeAllCard({ rows, error = false, lastSession = null }: Props) {
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
            className="@container rounded-lg border border-border-card bg-surface p-4 shadow-lift"
          >
            {rows.map((row, index) => (
              <Fragment key={row.id}>
                {index > 0 ? <hr className="my-4 border-divider" /> : null}
                <div
                  data-slot="practice-all-row"
                  className={
                    row.inline
                      ? "flex flex-row items-center justify-between gap-3"
                      : "flex flex-col gap-3 @md:flex-row @md:items-center @md:justify-between"
                  }
                >
                  <div className="min-w-0">
                    <h3 className="text-item-title">{row.title}</h3>
                    <p className="mt-1 text-body-sm text-ink-muted">{row.scope}</p>
                  </div>
                  <div className="flex shrink-0 flex-col">{row.action}</div>
                </div>
              </Fragment>
            ))}
            {lastSession ? (
              <>
                <hr className="my-4 border-divider" />
                <div data-slot="last-session">
                  <h3 className="sr-only">Siste økt</h3>
                  <p aria-hidden="true" className="text-overline text-ink-muted">
                    SISTE ØKT
                  </p>
                  <p className="mt-2 text-label font-medium text-ink">{lastSession.title}</p>
                  <p className="mt-1 text-body-sm text-ink-muted">{lastSession.detail}</p>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
