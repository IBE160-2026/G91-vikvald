import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { iconProps } from "@/components/icon";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { LectureFileCount, SubjectFileCounts } from "@/modules/files/types";
import type { OverviewLecture } from "@/modules/practice/types";

import { formatDayMonth } from "../format";
import type { Lecture } from "../types";

// Which kinds from the content registry (GET /api/subjects/{id}/file-counts,
// `content_counts`) each count column adds up. Model cards (epic 7) are counted
// as cards once the backend registers them. `model_cards` is the kind name the
// delete texts already use for model cards (frontend/lib/messages.ts), so epic 7
// must register its counter under that name.
export const COUNT_COLUMN_KINDS = {
  cards: ["flashcards", "model_cards"],
  quiz: ["quiz_questions"],
} as const;

type Props = {
  lectures: Lecture[];
  // From GET /api/subjects/{id}/file-counts. Until it has loaded, the Filer,
  // Kort, Quiz and Status cells stay empty (instead of briefly showing «–» or
  // «Ingen filer ennå»).
  fileCounts?: SubjectFileCounts;
  // The subject's lectures from GET /api/overview («øvd» is worked out by the
  // server; this table only shows it).
  overviewLectures?: OverviewLecture[];
  // True once the overview has loaded or has failed. Until then Status stays
  // empty; when it has failed, every lecture is shown as not practised (like
  // the sidebar's dots).
  overviewSettled: boolean;
};

function sumKinds(counts: LectureFileCount | undefined, kinds: readonly string[]): number {
  return (counts?.content_counts ?? [])
    .filter((count) => kinds.includes(count.kind))
    .reduce((total, count) => total + count.count, 0);
}

// A right-aligned number cell: empty until the counts have loaded, «–» in muted
// grey for 0, otherwise the number in ink.
function CountCell({ value, column }: { value: number | undefined; column: string }) {
  return (
    <TableCell
      className={cn("px-2 text-right tabular-nums lg:px-3", value === 0 ? "text-ink-muted" : "text-ink")}
      data-column={column}
    >
      {value === undefined ? null : value === 0 ? "–" : value}
    </TableCell>
  );
}

// lecture-table (DESIGN.md "Oversikt", mockup 03, UX-DR13) in a white card: the
// columns Dato (dd.mm), Forelesning, Filer, Kort and Quiz (right-aligned, «–»
// for none) and Status, and the arrow (›) in icon-faint at the far right (it
// turns dark on hover). Status: a filled dot and «Øvd dd.mm» when the overview
// says the lecture is practised, a hollow dot and «Ikke øvd ennå» when it has
// files, otherwise «Ingen filer ennå». The lectures stand in the order the
// backend gives (by date).
//
// The whole row is clickable: the one link per row sits on the name and its
// ::after covers the row (the row is `relative`), so the table keeps its table
// semantics. The arrow is decoration and lies in the last cell, so the table
// has no column without a header.
export function LectureTable({ lectures, fileCounts, overviewLectures, overviewSettled }: Props) {
  const countsByLecture = new Map((fileCounts?.lectures ?? []).map((count) => [count.lecture_id, count]));
  const overviewById = new Map((overviewLectures ?? []).map((lecture) => [lecture.id, lecture]));
  const statusReady = fileCounts !== undefined && overviewSettled;

  return (
    <div className="rounded-lg border border-border-card bg-surface shadow-lift">
      {/* Fixed layout, so a long name is cut off with «…» instead of pushing the arrow out.
          Below 1024 px the columns are narrower and the status text is only read by
          screen readers (the dot is still shown), so the name keeps room at 768 px. */}
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[72px] pl-4 lg:w-[96px]">Dato</TableHead>
            <TableHead>Forelesning</TableHead>
            <TableHead className="w-[48px] px-2 text-right lg:w-[64px] lg:px-3">Filer</TableHead>
            <TableHead className="w-[48px] px-2 text-right lg:w-[64px] lg:px-3">Kort</TableHead>
            <TableHead className="w-[48px] px-2 text-right lg:w-[64px] lg:px-3">Quiz</TableHead>
            <TableHead className="w-[60px] pl-2 lg:w-[208px] lg:pl-6">
              <span className="sr-only lg:not-sr-only">Status</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lectures.map((lecture) => {
            const counts = countsByLecture.get(lecture.id);
            const loaded = fileCounts !== undefined;
            const files = loaded ? (counts?.file_count ?? 0) : undefined;
            const cards = loaded ? sumKinds(counts, COUNT_COLUMN_KINDS.cards) : undefined;
            const quiz = loaded ? sumKinds(counts, COUNT_COLUMN_KINDS.quiz) : undefined;
            const practised = overviewById.get(lecture.id);
            return (
              <TableRow key={lecture.id} className="group relative hover:bg-row-hover">
                <TableCell className="pl-4 text-ink-muted">{formatDayMonth(lecture.date)}</TableCell>
                <TableCell>
                  <Link
                    href={`/forelesninger/${lecture.id}`}
                    className="block truncate rounded-sm text-ink after:absolute after:inset-0"
                  >
                    {lecture.name}
                  </Link>
                </TableCell>
                <CountCell value={files} column="files" />
                <CountCell value={cards} column="cards" />
                <CountCell value={quiz} column="quiz" />
                <TableCell className="pr-4 pl-2 lg:pl-6">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex min-w-0 flex-1 items-center gap-2 text-meta text-ink-muted"
                      data-column="status"
                    >
                      {!statusReady || files === undefined ? null : practised?.practiced ? (
                        <>
                          <span
                            aria-hidden="true"
                            data-status="practised"
                            className="size-[8px] shrink-0 rounded-full bg-ink-muted"
                          />
                          <span className="sr-only lg:not-sr-only lg:truncate">
                            {practised.last_practiced_at
                              ? `Øvd ${formatDayMonth(practised.last_practiced_at)}`
                              : "Øvd"}
                          </span>
                        </>
                      ) : files > 0 ? (
                        <>
                          <span
                            aria-hidden="true"
                            data-status="not-practised"
                            className="size-[8px] shrink-0 rounded-full border-[1.5px] border-ink-muted"
                          />
                          <span className="sr-only lg:not-sr-only lg:truncate">Ikke øvd ennå</span>
                        </>
                      ) : (
                        <span className="sr-only lg:not-sr-only lg:truncate">Ingen filer ennå</span>
                      )}
                    </span>
                    <ChevronRight
                      {...iconProps}
                      className="shrink-0 text-icon-faint group-hover:text-ink"
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
