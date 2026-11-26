"use client";

import { GenerationRow, type GenerationRowProps } from "./generation-row";

// The summary's only scope: up to 15 points (FR-53). There is no dialog.
const SUMMARY_POINTS = 15;

// The Sammendrag row in «Lag og øv» (story 9.1, FR-53): «Ikke laget» and
// the outline button «Lag sammendrag», which starts the job directly without
// a dialog, or «7 punkter» without any button once the summary exists (the
// link «Les sammendrag» comes in story 9.2). The lecture page shows the row
// only when FEATURE_SUMMARY is on. The logic is in GenerationRow.
export function SummaryRow(props: GenerationRowProps) {
  return (
    <GenerationRow
      {...props}
      kind="summary"
      direct={SUMMARY_POINTS}
      title="Sammendrag"
      testId="summary-row"
      countOf={(counts) => counts.summary_points ?? 0}
      countText={(count) => `${count} ${count === 1 ? "punkt" : "punkter"}`}
      emptyText="Ikke laget"
      contentActions={false}
      createLabel="Lag sammendrag"
    />
  );
}
