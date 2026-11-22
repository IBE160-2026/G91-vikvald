import type { Ref } from "react";

import { cn } from "@/lib/utils";

import type { Mark } from "../types";
import { MARK_CLASSES, MarkIcon } from "./answer-grid";

type Props = {
  // The number of cards in the session.
  total: number;
  counts: { answered: number; correct: number; wrong: number };
  // Ended with «Avslutt økt» or Esc before every card was marked «Kunne».
  aborted: boolean;
  // The lecture's name (the scope of the session).
  scopeName: string;
  // The title gets focus when the result is shown.
  titleRef?: Ref<HTMLHeadingElement>;
};

// The title over the result: all cards gone through, or where she stopped.
// A is the number of cards marked at least once.
export function resultTitle({ total, answered, aborted }: { total: number; answered: number; aborted: boolean }): string {
  if (aborted) return `Avbrutt etter ${answered} av ${total}`;
  return total === 1 ? "Du har gått gjennom 1 kort" : `Du har gått gjennom alle ${total} kortene`;
}

// result-summary (DESIGN.md "Resultat", mockup 08): the overline ØKT FERDIG,
// the title (an h2 in page-title that gets focus), the lecture's name (and,
// when the finished session had «Kunne ikke» cards, that they were repeated),
// and a white card with two fields split by a hairline: «Kunne» with the share
// of the cards, and «Kunne ikke» («Repetert til slutt i økten» when finished),
// each with a tinted 32 px icon box and the number in result-title on the
// right. No celebration: the numbers stand as they are.
export function ResultSummary({ total, counts, aborted, scopeName, titleRef }: Props) {
  const percent = counts.answered === 0 ? 0 : Math.round((counts.correct / counts.answered) * 100);
  const repeated = !aborted && counts.wrong > 0;

  return (
    <div data-slot="result-summary" className="w-full">
      <p className="text-overline text-ink-muted">ØKT FERDIG</p>
      <h2 ref={titleRef} tabIndex={-1} className="mt-2 text-page-title text-ink">
        {resultTitle({ total, answered: counts.answered, aborted })}
      </h2>
      <p className="mt-2 text-body-sm break-words text-ink-muted">
        {scopeName}
        {repeated ? " · kortene du ikke kunne, ble repetert til slutt i økten" : null}
      </p>
      <div className="mt-5 grid grid-cols-1 divide-y divide-divider rounded-lg border border-border-card bg-surface shadow-lift sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <Field mark="known" label="Kunne" detail={`${percent} % av kortene`} value={counts.correct} />
        <Field
          mark="missed"
          label="Kunne ikke"
          detail={aborted ? null : "Repetert til slutt i økten"}
          value={counts.wrong}
        />
      </div>
    </div>
  );
}

function Field({ mark, label, detail, value }: { mark: Mark; label: string; detail: string | null; value: number }) {
  return (
    <div data-slot="result-field" className="flex min-h-[112px] items-center gap-3 px-5 py-4">
      <span
        aria-hidden="true"
        className={cn("flex size-[32px] shrink-0 items-center justify-center rounded-md", MARK_CLASSES[mark])}
      >
        <MarkIcon mark={mark} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-item-title text-ink">{label}</p>
        {detail === null ? null : <p className="mt-1 text-meta text-ink-muted">{detail}</p>}
      </div>
      <p className="text-result-title text-ink">{value}</p>
    </div>
  );
}
