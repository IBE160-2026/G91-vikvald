import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { iconProps } from "@/components/icon";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SubjectFileCounts } from "@/modules/files/types";

import { formatDayMonth } from "../format";
import type { Lecture } from "../types";

type Props = {
  lectures: Lecture[];
  // From GET /api/subjects/{id}/file-counts. Until it has loaded, the Filer and
  // Status cells stay empty (instead of briefly showing «Ingen filer ennå»).
  fileCounts?: SubjectFileCounts;
};

// lecture-table (DESIGN.md "Oversikt", mockup 03) in a white card: the columns
// Dato (dd.mm), Forelesning, Filer (right-aligned, «–» for none) and Status
// (a hollow dot and «Ikke øvd ennå» when the lecture has files, otherwise
// «Ingen filer ennå»), and the arrow (›) in icon-faint at the far right (it
// turns dark on hover). Kort and Quiz come in later epics. The lectures stand
// in the order the backend gives (by date).
//
// The whole row is clickable: the one link per row sits on the name and its
// ::after covers the row (the row is `relative`), so the table keeps its table
// semantics. The arrow is decoration and lies in the last cell, so the table
// has no column without a header.
export function LectureTable({ lectures, fileCounts }: Props) {
  const filesByLecture = new Map(
    (fileCounts?.lectures ?? []).map((count) => [count.lecture_id, count.file_count]),
  );

  return (
    <div className="rounded-lg border border-border-card bg-surface shadow-lift">
      {/* Fixed layout, so a long name is cut off with «…» instead of pushing the arrow out.
          Below 1024 px the columns are narrower and the status text is only read by
          screen readers (the Filer column already shows «–»), so the name keeps room at 768 px. */}
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[72px] pl-4 lg:w-[96px]">Dato</TableHead>
            <TableHead>Forelesning</TableHead>
            <TableHead className="w-[56px] text-right lg:w-[72px]">Filer</TableHead>
            <TableHead className="w-[48px] pl-3 lg:w-[224px] lg:pl-6">
              <span className="sr-only lg:not-sr-only">Status</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lectures.map((lecture) => {
            const files = fileCounts ? (filesByLecture.get(lecture.id) ?? 0) : undefined;
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
                <TableCell className="text-right tabular-nums" data-column="files">
                  {files === undefined ? null : files === 0 ? "–" : files}
                </TableCell>
                <TableCell className="pr-4 pl-3 lg:pl-6">
                  <div className="flex items-center gap-3">
                    <span className="sr-only lg:not-sr-only lg:flex lg:min-w-0 lg:flex-1 lg:items-center lg:gap-2 lg:text-meta lg:text-ink-muted" data-column="status">
                      {files === undefined ? null : files > 0 ? (
                        <>
                          <span
                            aria-hidden="true"
                            data-status="not-practised"
                            className="size-[8px] shrink-0 rounded-full border-[1.5px] border-ink-muted"
                          />
                          <span className="truncate">Ikke øvd ennå</span>
                        </>
                      ) : (
                        <span className="truncate">Ingen filer ennå</span>
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
