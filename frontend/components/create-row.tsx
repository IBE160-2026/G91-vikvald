import { CircleAlert, Info, Plus } from "lucide-react";
import { useId } from "react";

import { iconProps } from "@/components/icon";
import { JobStatus } from "@/components/job-status";
import { NoteSurface } from "@/components/note-surface";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// idle: the buttons work. running: job-status instead of the buttons.
// waiting: another row's job is running. disabled: something is missing (no files).
// In waiting and disabled the buttons are not active and `reason` says why.
export type CreateRowState = "idle" | "running" | "waiting" | "disabled";

export type CreateRowProps = {
  // «Flashcards»
  title: string;
  // «24 kort» or «Ingen ennå»
  countText: string;
  hasContent: boolean;
  // Whether «Lag flere» and «Øv nå» are shown with content (default true).
  // False: with content the row shows only its count and no buttons (the
  // summary row in story 9.1, before «Les sammendrag» in story 9.2).
  contentActions?: boolean;
  state: CreateRowState;
  // Shown under the count in waiting and disabled, e.g. «Last opp notater først.».
  reason?: string;
  // The outline button without content, e.g. «Lag flashcards».
  createLabel: string;
  onCreate: () => void;
  // The text button with content: «Lag flere».
  onCreateMore: () => void;
  // An optional extra text button, shown with and without content, before the
  // other buttons (e.g. «Lag modellkort» on the Flashcards row, story 7.1).
  // Not active in waiting and disabled, like the other «Lag …» buttons.
  extraAction?: { label: string; onClick: () => void };
  // «Øv nå»: opens the session (the Flashcards row gives it from story 3.3).
  // Without it the button is shown but not active (for types without practice yet).
  onPractice?: () => void;
  // The job-status text, e.g. «Lager flashcards …».
  jobText: string;
  // Read out by the live region (start and end of a job).
  announcement: string;
  // A calm message under the row on the note surface (e.g. «fewer than
  // chosen»). Never an error.
  message?: string | null;
  // An error under the row (role="alert").
  error?: string | null;
  // With an error: the outline button «Prøv igjen» under it.
  onRetry?: () => void;
};

// create-row (DESIGN.md "Forelesning", mockup 04): one row in «Lag og øv»,
// at least 96 px high. Title and count on the left, with a filled dot when the
// type has content and a hollow one when it has none. Actions on the right:
// with content the primary «Øv nå» and the text button «Lag flere» with a plus;
// without, the outline button «Lag …». While a job runs, job-status stands in
// place of the buttons. An always-mounted live region reads `announcement`.
// Under the row: `message` on the note surface with the info icon, and
// `error` in red (role="alert"), with «Prøv igjen» when `onRetry` is given.
export function CreateRow({
  title,
  countText,
  hasContent,
  contentActions = true,
  state,
  reason,
  createLabel,
  onCreate,
  onCreateMore,
  extraAction,
  onPractice,
  jobText,
  announcement,
  message,
  error,
  onRetry,
}: CreateRowProps) {
  const reasonId = useId();
  const blocked = state === "waiting" || state === "disabled";
  const showReason = blocked && reason;
  const describedBy = showReason ? reasonId : undefined;

  return (
    <div data-slot="create-row" className="px-4">
      <div className="flex min-h-create-row flex-wrap items-center gap-x-4 gap-y-2 py-3">
        <div className="shrink-0 whitespace-nowrap">
          <h3 className="text-item-title text-ink">{title}</h3>
          <p className="mt-1 flex items-center gap-2 text-meta text-ink-muted">
            <span
              aria-hidden="true"
              data-testid="content-dot"
              className={cn(
                "inline-block size-2 shrink-0 rounded-full border border-ink-muted",
                hasContent ? "bg-ink-muted" : "bg-transparent",
              )}
            />
            <span>{countText}</span>
          </p>
          {showReason ? (
            <p id={reasonId} className="mt-1 whitespace-normal text-meta text-ink-muted">
              {reason}
            </p>
          ) : null}
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {state !== "running" && extraAction ? (
            <Button variant="text" onClick={extraAction.onClick} disabled={blocked} aria-describedby={describedBy}>
              {extraAction.label}
            </Button>
          ) : null}
          {state === "running" ? (
            <JobStatus text={jobText} />
          ) : hasContent && !contentActions ? null : hasContent ? (
            <>
              <Button variant="text" onClick={onCreateMore} disabled={blocked} aria-describedby={describedBy}>
                <Plus {...iconProps} />
                Lag flere
              </Button>
              {/* Practising needs no job: while another row's job runs
                  («waiting»), «Øv nå» stays active (EXPERIENCE.md flow 1,
                  step 7: she practises flashcards while the quiz is made). */}
              <Button
                className="min-w-[184px]"
                onClick={onPractice}
                disabled={state === "disabled" || !onPractice}
                aria-describedby={state === "disabled" ? describedBy : undefined}
              >
                Øv nå
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="min-w-[184px]"
              onClick={onCreate}
              disabled={blocked}
              aria-describedby={describedBy}
            >
              {createLabel}
            </Button>
          )}
        </div>
      </div>
      <div role="status" className="sr-only">
        {announcement}
      </div>
      {message ? (
        <NoteSurface icon={Info} className="mb-4">
          <p>{message}</p>
        </NoteSurface>
      ) : null}
      {error ? (
        <div className="mb-4 flex flex-col items-start gap-2">
          <p role="alert" className="flex w-full items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger">
            <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
            <span>{error}</span>
          </p>
          {onRetry ? (
            <Button variant="outline" onClick={onRetry}>
              Prøv igjen
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
