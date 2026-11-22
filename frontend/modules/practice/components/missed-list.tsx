import { useId } from "react";

import { SourceLink, type Source } from "@/components/source-link";

export type MissedItem = {
  id: string;
  // The card's (or question's) number in the answer grid.
  number: number;
  // The question (the card's front, or the quiz question).
  front: string;
  source: Source;
};

// A wrong quiz answer: the question, what she chose, the correct answer and
// the explanation. In a whole-subject quiz also the lecture's name.
export type MissedQuizItem = MissedItem & {
  chosen: string;
  correct: string;
  explanation: string;
  lecture?: string;
};

type Props =
  | { kind?: "flashcards"; items: readonly MissedItem[] }
  | { kind: "quiz"; items: readonly MissedQuizItem[] };

// missed-list (DESIGN.md "Resultat", mockup 08): the h3 «Kortene du ikke
// kunne» with «N kort» in muted text, and one white card with a row per card
// in the answer grid's order: the number in the grid, the question and the
// source. The page shows it only when at least one card was «Kunne ikke».
//
// kind="quiz" (mockup 10, story 4.3): no heading (the subtitle over it says
// what the list is), one white card with a row per wrong answer in the grid's
// order: the number in a 31 px box with a border (read as «Spørsmål 4:»), the
// question and the source on the right, then «✗ Ditt svar» with the chosen
// text, «✓ Riktig svar» with the correct text, and the explanation in muted
// text. The symbols are aria-hidden; the words carry the meaning. An item with
// a lecture (a whole-subject quiz, story 4.4) shows the lecture's name under
// the source in muted caption.
export function MissedList(props: Props) {
  if (props.kind === "quiz") return <QuizMissedList items={props.items} />;
  return <FlashcardMissedList items={props.items} />;
}

function FlashcardMissedList({ items }: { items: readonly MissedItem[] }) {
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

function QuizMissedList({ items }: { items: readonly MissedQuizItem[] }) {
  return (
    <div data-slot="missed-list" className="w-full">
      <ul className="divide-y divide-divider rounded-lg border border-border-card bg-surface shadow-lift">
        {items.map((item) => (
          <li key={item.id} className="flex gap-x-4 px-4 py-4">
            <span className="flex size-[31px] shrink-0 items-center justify-center rounded-sm border border-border-card text-meta font-semibold text-ink">
              <span className="sr-only">Spørsmål </span>
              {item.number}
              <span className="sr-only">:</span>
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-[4px]">
                <p className="min-w-0 flex-1 text-item-title break-words text-ink">{item.front}</p>
                {item.lecture === undefined ? (
                  <SourceLink source={item.source} />
                ) : (
                  <div className="flex min-w-0 flex-col gap-1">
                    <SourceLink source={item.source} />
                    <p data-slot="missed-lecture" className="text-caption break-words text-ink-muted">
                      {item.lecture}
                    </p>
                  </div>
                )}
              </div>
              <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
                <dt className="text-meta font-semibold text-danger">
                  <span aria-hidden="true">✗ </span>Ditt svar
                </dt>
                <dd className="text-body-sm break-words text-ink">{item.chosen}</dd>
                <dt className="text-meta font-semibold text-success">
                  <span aria-hidden="true">✓ </span>Riktig svar
                </dt>
                <dd className="text-body-sm font-semibold break-words text-ink">{item.correct}</dd>
                <dd className="col-start-2 text-meta break-words text-ink-muted">{item.explanation}</dd>
              </dl>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
