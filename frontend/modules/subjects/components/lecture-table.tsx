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
      {/* Fixed layout, so a long name is cut off with «…» instead of pushing the arrow out. */}
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[96px] pl-4">Dato</TableHead>
            <TableHead>Forelesning</TableHead>
            <TableHead className="w-[72px] text-right">Filer</TableHead>
            <TableHead className="w-[208px] pl-6">Status</TableHead>
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
                <TableCell className="pr-4 pl-6">
                  <div className="flex items-center gap-3">
                    <span className="flex min-w-0 flex-1 items-center gap-2 text-ink-muted" data-column="status">
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
