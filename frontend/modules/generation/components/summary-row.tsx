"use client";

import { useRouter } from "next/navigation";

import { GenerationRow, type GenerationRowProps } from "./generation-row";

// The summary's only scope: up to 15 points (FR-53). There is no dialog.
export const SUMMARY_POINTS = 15;

// The page that shows a lecture's summary (story 9.2, mockup 13).
export function summaryPath(lectureId: string) {
  return `/forelesninger/${encodeURIComponent(lectureId)}/sammendrag`;
}

// The Sammendrag row in «Lag og øv» (FR-53, FR-54): «Ikke laget» and the
// outline button «Lag sammendrag», which starts the job directly without a
// dialog, or «7 punkter» and the primary button «Les sammendrag», which opens
// the summary page (story 9.2). A new summary is made from that page. The
// lecture page shows the row only when FEATURE_SUMMARY is on. The logic is in
// GenerationRow.
export function SummaryRow(props: GenerationRowProps) {
  const router = useRouter();
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
      contentAction={{ label: "Les sammendrag", onClick: () => router.push(summaryPath(props.lectureId)) }}
      createLabel="Lag sammendrag"
    />
  );
}
