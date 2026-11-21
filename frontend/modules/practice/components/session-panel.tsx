"use client";

import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SubjectDot } from "@/modules/subjects/components/subject-dot";

import type { PracticeAdapter } from "../adapter";
import { gridCells, isFinished, repeatingLeft, sessionCounts, shownCount, totalCount, type SessionState } from "../session";
import { AnswerGrid, GRID_MAX_CARDS, MarkIcon } from "./answer-grid";

type Props = {
  adapter: PracticeAdapter;
  state: SessionState;
  // The scope under the title: the lecture's name, with the subject's dot.
  scopeName: string;
  // The subject's colour (undefined while the subject is loading: no dot).
  colorIndex?: number;
  // «Avslutt økt».
  onEnd: () => void;
};

// session-panel (DESIGN.md "Øktpanel", mockups 07 and 08): stands where the
// sidebar is, 288 px on paper with a hairline on the right. The overline ØKT
// (hidden from screen readers), the h1 with the type («Flashcards»), the
// subject dot and the scope, the counter of different cards shown («7» and
// «/ 24», never above the total), «Repeterer: N kort igjen» while repeating,
// the progress bar (named by the counter), the counts line, the answer grid
// with its legend (both left out above 120 cards), and the outline button
// «Avslutt økt» at the bottom. Finished: every cell filled, the finished
// legend, and no «Avslutt økt».
export function SessionPanel({ adapter, state, scopeName, colorIndex, onEnd }: Props) {
  const titleId = useId();
  const counterId = useId();
  const finished = isFinished(state);
  const shown = shownCount(state);
  const total = totalCount(state);
  const repeating = repeatingLeft(state);
  const counts = sessionCounts(state);
  const showGrid = total <= GRID_MAX_CARDS;
  const legend = finished ? adapter.legend.finished : adapter.legend.inProgress;

  return (
    <section
      aria-labelledby={titleId}
      data-slot="session-panel"
      className="flex w-sidebar-width shrink-0 flex-col border-r border-divider bg-paper px-4 pt-5 pb-4"
    >
      <p aria-hidden="true" className="text-overline text-ink-muted">
        ØKT
      </p>
      <h1 id={titleId} className="mt-2 text-card-question text-ink">
        {adapter.kindLabel}
      </h1>
      <p className="mt-1 flex items-center gap-2 text-meta text-ink-muted">
        {colorIndex === undefined ? null : <SubjectDot colorIndex={colorIndex} />}
        <span className="min-w-0 break-words">{scopeName}</span>
      </p>

      <p id={counterId} className="mt-5 flex items-baseline gap-2">
        <span className="text-session-counter text-ink">{shown}</span>
        <span className="text-[20px] font-normal text-ink-muted">/ {total}</span>
      </p>
      {repeating === null ? null : (
        <p className="mt-1 text-meta text-ink-muted">Repeterer: {repeating} kort igjen</p>
      )}
      <Progress
        className="mt-3"
        value={total === 0 ? 0 : (shown / total) * 100}
        aria-labelledby={counterId}
      />
      <p className="mt-3 text-caption font-normal text-ink-muted">{adapter.countsText(counts)}</p>

      {showGrid ? (
        <>
          <div className="mt-4">
            <AnswerGrid cells={gridCells(state)} adapter={adapter} />
          </div>
          <ul className="mt-4 flex flex-col gap-3">
            {legend.map((item) => (
              <li key={item.cell} className="flex items-center gap-3 text-meta text-ink">
                {item.cell === "unseen" ? (
                  <span aria-hidden="true" className="size-[20px] shrink-0 rounded-[4px] border border-border-card" />
                ) : (
                  <span
                    aria-hidden="true"
                    className={
                      item.cell === "known"
                        ? "flex size-[20px] shrink-0 items-center justify-center rounded-[4px] bg-success-tint text-success"
                        : "flex size-[20px] shrink-0 items-center justify-center rounded-[4px] bg-danger-tint text-danger"
                    }
                  >
                    <MarkIcon mark={item.cell} />
                  </span>
                )}
                {item.text}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {finished ? null : (
        <div className="mt-auto pt-6">
          <Button variant="outline" className="w-full" onClick={onEnd}>
            Avslutt økt
          </Button>
        </div>
      )}
    </section>
  );
}
